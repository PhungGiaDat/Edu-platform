// frontend-web/src/pages/admin/monitoring/TabSystem.tsx
/**
 * Tab "Hệ thống" — dependency probes, process/host stats, LLM provider health,
 * monitoring flags. Shows ONLY what GET /overview + POST /probe return.
 * (v3 mock's DB-pool / event-loop-lag are NOT in the P1 API → intentionally absent.)
 */
import React, { useRef, useState } from 'react';
import {
  monitoringApi,
  type ComponentStatus,
  type OverviewResponse,
} from '@/services/monitoringApi';
import {
  MonitorCheckIcon,
  MonitorDashIcon,
  MonitorUndoIcon,
  MonitorXIcon,
} from '@/shared/components/icons/Icons';
import { useMonFetch, REFRESH_INTERVAL_MS } from './useMonFetch';
import { fmtClock, fmtMs, fmtNum, fmtUptime } from './format';

interface Props {
  live: boolean;
  refreshNonce: number;
}

/** Display metadata per component — order matters (critical deps first). */
const COMPONENT_META: {
  key: string;
  label: string;
  role: string;
  critical: boolean;
}[] = [
  { key: 'postgres', label: 'PostgreSQL', role: 'persistent · business + traces', critical: true },
  { key: 'qdrant', label: 'Qdrant', role: 'vectors · RAG retrieval', critical: true },
  { key: 'redis', label: 'Redis', role: 'cache · chat sessions', critical: false },
  { key: 'mongodb', label: 'MongoDB', role: 'legacy · đang migrate', critical: false },
];

const UpDot: React.FC<{ up: boolean | null }> = ({ up }) => {
  if (up === true) return <span className="mon-dot ok" title="up" />;
  if (up === false) return <span className="mon-dot err" title="down" />;
  return <span className="mon-dot idle" title="không cấu hình / unknown" />;
};

const LLM_STATUS_LABEL: Record<string, { cls: string; label: string }> = {
  healthy: { cls: 'ok', label: 'healthy' },
  unhealthy: { cls: 'err', label: 'unhealthy' },
  idle: { cls: 'idle', label: 'chưa có dữ liệu' },
  probe_failed: { cls: 'err', label: 'probe thất bại' },
  snapshot_failed: { cls: 'err', label: 'snapshot lỗi' },
};

const llmPillClass = (status?: string): string =>
  (status && LLM_STATUS_LABEL[status]?.cls) || (status ? 'warn' : 'idle');

/** up→check, down→x, unknown→dash. */
const StatusGlyph: React.FC<{ up: boolean | null; className: string }> = ({ up, className }) => {
  if (up === true) return <MonitorCheckIcon className={className} />;
  if (up === false) return <MonitorXIcon className={className} />;
  return <MonitorDashIcon className={className} />;
};

const fmtMb = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${Math.round(v).toLocaleString('en-US')} MB`;

const KV: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="mon-kv">
    {k} <b className="mon-n">{v}</b>
  </div>
);

const TabSystem: React.FC<Props> = ({ live, refreshNonce }) => {
  // "Probe lại" swaps the NEXT fetch to POST /probe (fresh LLM pings),
  // every other refresh stays the cheap GET /overview snapshot.
  const modeRef = useRef<'poll' | 'probe'>('poll');
  const [lastProbeAt, setLastProbeAt] = useState<Date | null>(null);

  const state = useMonFetch<OverviewResponse>(
    () => {
      if (modeRef.current === 'probe') {
        modeRef.current = 'poll';
        setLastProbeAt(new Date());
        return monitoringApi.probe();
      }
      return monitoringApi.getOverview();
    },
    [refreshNonce],
    live,
    REFRESH_INTERVAL_MS,
  );

  const { data, error, loading, refreshing } = state;

  const doProbe = () => {
    modeRef.current = 'probe';
    state.refresh();
  };

  const header = (
    <div className="mon-asof">
      as of <b className="mon-n">{fmtClock(data?.as_of ?? state.asOf)}</b>
      {refreshing && <span className="mon-muted"> · đang cập nhật…</span>}
      {!refreshing && !loading && (
        <span className="mon-muted"> · snapshot cache, chưa ping LLM lại</span>
      )}
      {lastProbeAt && (
        <span className="mon-muted"> · probe gần nhất {fmtClock(lastProbeAt)}</span>
      )}
    </div>
  );

  if (loading) return <div className="mon-card mon-empty">Đang probe hệ thống…</div>;
  if (error && !data) {
    return (
      <section role="tabpanel">
        {header}
        <div className="mon-card">
          <h2>Không đọc được /overview</h2>
          <div className="mon-err-text mon-mono mon-f125">{error}</div>
          <div className="mon-sub mon-mt10">
            Thử bấm <b>Probe lại</b> — nếu vẫn lỗi, kiểm tra backend đang chạy và phiên đăng nhập teacher.
          </div>
          <button type="button" className="mon-btn mon-mt10" onClick={doProbe} disabled={refreshing}>
            <MonitorUndoIcon className="mon-ic" /> Probe lại
          </button>
        </div>
      </section>
    );
  }
  if (!data) return null;

  const overall = data.status;
  const overallCls = overall === 'ok' ? 'ok' : overall === 'degraded' ? 'warn' : 'err';

  return (
    <section role="tabpanel">
      {header}

      <div className={`mon-banner ${overallCls}`}>
        <span className="mon-banner-label">Tổng quan</span>
        <span className={`mon-pill ${overallCls}`}>
          <StatusGlyph up={overall === 'ok'} className="mon-ic" /> {overall}
        </span>
        <div className="mon-banner-note">
          {overall === 'ok' &&
            'Postgres + Qdrant trả lời, Redis không down, không provider LLM nào unhealthy. MongoDB (legacy) không tính vào trạng thái tổng.'}
          {overall === 'degraded' &&
            'Có thành phần phụ lỗi hoặc provider LLM unhealthy — xem chi tiết bên dưới.'}
          {overall === 'error' &&
            'Postgres hoặc Qdrant (thành phần tới hạn cho chat) không trả lời.'}
        </div>
        <button
          type="button"
          className="mon-btn mon-probe-btn"
          onClick={doProbe}
          disabled={refreshing}
          title="POST /probe — ping trực tiếp từng dependency + LLM provider (chậm hơn snapshot)"
        >
          <MonitorUndoIcon className="mon-ic" /> {refreshing ? 'Đang probe…' : 'Probe lại'}
        </button>
      </div>

      {data.rag_24h?.available ? (
        <div className="mon-card">
          <h2>RAG · 24 giờ gần nhất</h2>
          <div className="mon-sub">đọc thẳng từ rag_traces (xem tab Độ trễ & Model để có bản đầy đủ)</div>
          <div className="mon-strip">
            <KV k="Yêu cầu" v={fmtNum(data.rag_24h.total)} />
            <KV k="cache-hit" v={`${fmtNum(data.rag_24h.cache_hits)} (${fmtNum(Math.round((data.rag_24h.cache_hit_rate ?? 0) * 100))}%)`} />
            <KV k="Lỗi" v={fmtNum(data.rag_24h.errors)} />
            <KV k="Từ chối" v={fmtNum(data.rag_24h.refusals)} />
            <KV k="Tokens" v={fmtNum(data.rag_24h.tokens_total)} />
            <KV k="e2e p50" v={fmtMs(data.rag_24h.e2e_p50_ms)} />
            <KV k="e2e p95" v={fmtMs(data.rag_24h.e2e_p95_ms)} />
          </div>
        </div>
      ) : (
        <div className="mon-card">
          <h2>RAG · 24 giờ gần nhất</h2>
          <div className="mon-empty">
            {data.rag_24h?.note ??
              'Chưa đọc được rag_traces — có thể chưa chạy `alembic upgrade head` hoặc MONITORING_ENABLED đang tắt.'}
          </div>
        </div>
      )}

      <div className="mon-two">
        <div className="mon-card">
          <h2>Dependencies</h2>
          <div className="mon-sub">probe song song · timeout 3s/ thành phần</div>
          <table className="mon-table">
            <thead>
              <tr>
                <th>Thành phần</th>
                <th>Trạng thái</th>
                <th className="r">Ping</th>
              </tr>
            </thead>
            <tbody>
              {COMPONENT_META.map((meta) => {
                const c: ComponentStatus | undefined = data.components?.[meta.key];
                return (
                  <tr key={meta.key}>
                    <td>
                      <span className="mon-strong">{meta.label}</span>
                      {meta.critical && <span className="mon-tag mon-ml6">critical</span>}
                      <div className="mon-f115 mon-muted">{meta.role}</div>
                    </td>
                    <td>
                      <span className="mon-status-line">
                        <UpDot up={c?.up ?? null} />
                        {c?.up === true ? 'up' : c?.up === false ? 'down' : 'không cấu hình'}
                        {c?.note && <span className="mon-mono mon-f115 mon-muted"> · {c.note}</span>}
                      </span>
                    </td>
                    <td className="r mon-n mon-mono">{c?.up === true ? fmtMs(c.latency_ms) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2 className="mon-mt16">LLM Providers</h2>
          <div className="mon-sub">
            {data.llm?.[0]?.provider === '*'
              ? data.llm[0].note ?? 'không đọc được registry'
              : 'suy ra từ health registry · probe lại để ping trực tiếp'}
          </div>
          {(data.llm ?? []).filter((p) => p.provider !== '*').length === 0 && !data.llm?.[0]?.note ? (
            <div className="mon-empty">Chưa provider nào được cấu hình key.</div>
          ) : (
            <div className="mon-llm-list">
              {data.llm
                .filter((p) => p.provider !== '*')
                .map((p) => {
                  const mapped = p.status ? LLM_STATUS_LABEL[p.status] : undefined;
                  return (
                    <div key={p.provider} className="mon-llm-row">
                      <span className={`mon-pill ${llmPillClass(p.status)}`}>
                        {mapped?.label ?? p.status ?? '—'}
                      </span>
                      <span className="mon-mono mon-strong">{p.provider}</span>
                      {p.preferred && (
                        <span className="mon-tag kilo" title="đang được prefer theo health registry">
                          preferred
                        </span>
                      )}
                      <span className="mon-n mon-mono mon-f12">
                        {p.latency_ms != null ? fmtMs(p.latency_ms) : '—'}
                      </span>
                      {(p.consecutive_failures ?? 0) > 0 && (
                        <span className="mon-meh mon-f12">
                          {p.consecutive_failures} lỗi liên tiếp
                        </span>
                      )}
                      <span className="mon-mono mon-f115 mon-muted">{p.default_model ?? ''}</span>
                      {p.fresh === false && <span className="mon-f115 mon-muted">(cũ)</span>}
                      {p.note && <span className="mon-f115 mon-muted">· {p.note}</span>}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div>
          <div className="mon-card">
            <h2>Process (API backend)</h2>
            <div className="mon-sub">
              {data.process?.source === 'psutil' ? 'psutil · từ khi tiến trình bật' : 'psutil không khả dụng'}
            </div>
            {data.process?.error ? (
              <div className="mon-err-text mon-f125 mon-mono">{data.process.error}</div>
            ) : (
              <>
                <div className="mon-strip">
                  <KV k="Uptime" v={fmtUptime(data.process?.uptime_s)} />
                  <KV k="RSS" v={fmtMb(data.process?.rss_mb)} />
                  <KV
                    k="CPU"
                    v={
                      data.process?.cpu_pct_since_last_call !== undefined
                        ? `${data.process.cpu_pct_since_last_call.toFixed(1)}%`
                        : '—'
                    }
                  />
                  <KV k="Threads" v={fmtNum(data.process?.threads)} />
                </div>
                {data.process?.cgroup && (
                  <div className="mon-mt10">
                    <div className="mon-sub mon-mb6">
                      cgroup ({data.process.cgroup.runtime_source}) · giới hạn container
                    </div>
                    <div className="mon-wf" style={{ height: 14 }}>
                      <i className="s2" style={{ width: `${Math.min(data.process.cgroup.mem_pct, 100)}%` }} />
                    </div>
                    <div className="mon-kv mon-mt6">
                      {fmtMb(data.process.cgroup.used_mb)} / {fmtMb(data.process.cgroup.limit_mb)} ·{' '}
                      <b className="mon-n">{data.process.cgroup.mem_pct.toFixed(1)}%</b>
                      {data.process.cgroup.mem_pct > 85 && (
                        <span className="mon-bad"> · tiến gần OOM-kill</span>
                      )}
                    </div>
                  </div>
                )}
                <div className="mon-kv mon-mt6 mon-f115 mon-muted">
                  CPU % đo giữa hai lần dashboard gọi (không phải trung bình từ lúc bật)
                </div>
              </>
            )}
          </div>

          <div className="mon-card">
            <h2>Host / container</h2>
            <div className="mon-sub">
              {data.host?.source === 'host'
                ? 'psutil host metrics'
                : data.host?.source === 'unavailable'
                  ? 'host metrics không khả dụng trên môi trường này'
                  : 'nguồn: unknown'}
            </div>
            {data.host?.error ? (
              <div className="mon-err-text mon-f125 mon-mono">{data.host.error}</div>
            ) : (
              <div className="mon-strip">
                <KV
                  k="Mem"
                  v={
                    data.host?.mem_used_mb !== undefined && data.host?.mem_total_mb !== undefined
                      ? `${fmtMb(data.host.mem_used_mb)} / ${fmtMb(data.host.mem_total_mb)}`
                      : '—'
                  }
                />
                <KV
                  k="%"
                  v={data.host?.mem_pct !== undefined ? `${data.host.mem_pct.toFixed(1)}%` : '—'}
                />
                <KV k="Cores" v={fmtNum(data.host?.cpu_count)} />
                <KV
                  k="Load 1m"
                  v={data.host?.load_avg_1m !== undefined ? data.host.load_avg_1m.toFixed(2) : '—'}
                />
              </div>
            )}
          </div>

          <div className="mon-card">
            <h2>Cờ giám sát (backend settings)</h2>
            <div className="mon-strip">
              <KV
                k="MONITORING_ENABLED"
                v={
                  data.monitoring?.enabled ? (
                    <span className="mon-good">bật</span>
                  ) : (
                    <span className="mon-bad">tắt — không ghi trace mới</span>
                  )
                }
              />
              <KV
                k="store_questions"
                v={data.monitoring?.store_questions ? 'có (cắt 500 ký tự)' : 'không lưu nội dung'}
              />
              <KV k="retention" v={`${fmtNum(data.monitoring?.retention_days)} ngày`} />
              <KV k="api_metrics (P2)" v={data.monitoring?.api_metrics ? 'bật' : 'chưa có'} />
            </div>
            <div className="mon-kv mon-mt6 mon-f115 mon-muted">
              app: {data.app?.name ?? '—'} · env {data.app?.environment ?? '—'} · bật lúc{' '}
              {fmtClock(data.app?.started_at)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TabSystem;
