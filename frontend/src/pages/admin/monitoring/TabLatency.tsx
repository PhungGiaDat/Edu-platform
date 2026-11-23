// frontend-web/src/pages/admin/monitoring/TabLatency.tsx
/**
 * Tab "Độ trễ & Model" — per-model latency/tok-s, timeline chart,
 * stage p50 breakdown, and the expandable request log.
 * Layout mirrors docs/design/20260913_ops_dashboard_preview_v3.html §lat.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  monitoringApi,
  type ModelStat,
  type TimelineBucket,
  type TraceDetail,
  type TraceListItem,
} from '@/services/monitoringApi';
import {
  MonitorCheckIcon,
  MonitorDashIcon,
  MonitorUndoIcon,
  MonitorXIcon,
} from '@/shared/components/icons/Icons';
import { useMonFetch, REFRESH_INTERVAL_MS } from './useMonFetch';
import {
  fmtBucketHour,
  fmtClock,
  fmtMs,
  fmtNum,
  fmtRate,
  fmtTimeShort,
  fmtTokens,
} from './format';

interface Props {
  live: boolean;
  refreshNonce: number;
}

const WINDOWS = [
  { hours: 6, label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 72, label: '3 ngày' },
  { hours: 168, label: '7 ngày' },
];

const PAGE_SIZE = 25;

type LogFilter = 'all' | 'errors' | 'refusals';

/** provider label from overview.llm default_model mapping (best effort). */
const PROVIDER_LABEL: Record<string, string> = {
  tokenrouter: 'Kilo',
  bai: 'BAI',
};

// ─────────────────────────── timeline chart ───────────────────────────

const LatencyChart: React.FC<{ timeline: TimelineBucket[] }> = ({ timeline }) => {
  const pts = timeline.filter((b) => b.p50_ms !== null || b.p95_ms !== null);
  if (pts.length < 2) {
    return (
      <div className="mon-empty">
        Chưa đủ dữ liệu chuỗi thời gian trong cửa sổ này (cần ≥2 bucket 30p có request).
      </div>
    );
  }
  const W = 560;
  const H = 170;
  const X0 = 40;
  const X1 = 550;
  const Y0 = 20;
  const Y1 = 140;
  const maxMs = Math.max(...pts.map((b) => Math.max(b.p50_ms ?? 0, b.p95_ms ?? 0)));
  // Round axis top up to a friendly second value.
  const topMs = Math.max(10_000, Math.ceil(maxMs / 10_000) * 10_000);
  const x = (i: number) =>
    X0 + ((X1 - X0) * i) / Math.max(pts.length - 1, 1);
  const y = (ms: number) => Y1 - ((Y1 - Y0) * Math.min(ms, topMs)) / topMs;

  const line = (key: 'p50_ms' | 'p95_ms') =>
    pts.map((b, i) => `${x(i)},${y(b[key] ?? 0)}`).join(' ');

  const worstIdx = pts.reduce(
    (best, b, i) => ((b.p95_ms ?? 0) > (pts[best].p95_ms ?? 0) ? i : best),
    0,
  );
  const worst = pts[worstIdx];
  const gridLines = [0, 1, 2, 3].map((k) => ({
    y: Y0 + ((Y1 - Y0) * k) / 3,
    label: `${Math.round((topMs * (3 - k)) / 3 / 1000)}s`,
  }));

  return (
    <>
      <svg className="mon-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ p50 và p95 theo thời gian">
        {gridLines.map((g) => (
          <g key={g.y}>
            <line x1={X0} y1={g.y} x2={X1} y2={g.y} className="mon-gline" />
            <text x={6} y={g.y + 4} className="mon-axis">
              {g.label}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke="#BFCAD6" strokeWidth={2.5} strokeDasharray="6 4" points={line('p95_ms')} />
        <polyline fill="none" stroke="#2563EB" strokeWidth={2.5} points={line('p50_ms')} />
        {worst.p95_ms !== null && (
          <>
            <circle cx={x(worstIdx)} cy={y(worst.p95_ms)} r={4.5} fill="#DC2626" />
            <text x={Math.min(x(worstIdx) - 40, W - 220)} y={Math.max(y(worst.p95_ms) - 12, 12)} className="mon-axis mon-axis-bad">
              {fmtBucketHour(worst.bucket)} p95={fmtMs(worst.p95_ms)} — điểm chậm nhất
            </text>
          </>
        )}
        <text x={X0 - 6} y={162} className="mon-axis">{fmtBucketHour(pts[0].bucket)}</text>
        <text x={X1 - 34} y={162} className="mon-axis">{fmtBucketHour(pts[pts.length - 1].bucket)}</text>
      </svg>
      <div className="mon-legend">
        <span><i style={{ background: '#2563EB' }} />e2e p50</span>
        <span><i style={{ background: '#BFCAD6' }} />e2e p95</span>
        <span className="mon-muted">bucket 30p · chỉ request qua LLM (không cache-hit)</span>
      </div>
    </>
  );
};

// ─────────────────────────── verdict pill ───────────────────────────

const verdictPill = (t: TraceListItem): React.ReactNode => {
  if (t.has_error) {
    return (
      <span className="mon-pill err" title={t.error ?? undefined}>
        <MonitorXIcon className="mon-ic" /> lỗi
      </span>
    );
  }
  if (t.refusal) {
    return (
      <span className="mon-pill teal">
        <MonitorDashIcon className="mon-ic" /> từ chối OOD
      </span>
    );
  }
  if (t.cache_hit) {
    return (
      <span className="mon-pill teal">
        <MonitorDashIcon className="mon-ic" /> cache-hit
      </span>
    );
  }
  const v = t.validator_verdict ?? '';
  if (v.startsWith('rule-pass')) {
    return <span className="mon-pill ok"><MonitorCheckIcon className="mon-ic" /> rule</span>;
  }
  if (v.startsWith('llm-pass')) {
    return <span className="mon-pill ok"><MonitorCheckIcon className="mon-ic" /> llm</span>;
  }
  if (v.startsWith('rule-fix')) {
    return <span className="mon-pill warn">rule-fix</span>;
  }
  if (v.startsWith('rule-escalate') || v === 'llm-fallback') {
    return <span className="mon-pill warn">escalate→{v.endsWith('fallback') ? 'fallback' : 'pass'}</span>;
  }
  if (v === 'skipped') return <span className="mon-pill idle">skipped</span>;
  return <span className="mon-pill idle">{v || '—'}</span>;
};

/** tok/s for one trace: completion tokens ÷ (generator − retrieval), LLM-only. */
const traceTokPerSec = (t: TraceListItem): number | null => {
  const gen = t.stage_generator_ms;
  const ret = t.stage_retrieval_ms ?? 0;
  const c = t.tokens_completion;
  if (gen === null || gen === undefined || c === null || c === undefined) return null;
  const llmMs = Math.max(gen - ret, 1);
  if (c <= 0) return null;
  return Math.round((c / (llmMs / 1000)) * 10) / 10;
};

// ─────────────────────────── detail panel ───────────────────────────

const TraceDetailPanel: React.FC<{ traceId: number }> = ({ traceId }) => {
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    monitoringApi
      .getTrace(traceId)
      .then((d) => !cancelled && setDetail(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [traceId]);

  if (error) return <div className="mon-kv mon-err-text">Không tải được chi tiết: {error}</div>;
  if (!detail) return <div className="mon-kv">Đang tải chi tiết…</div>;

  const stages = [
    { key: 'planner', ms: detail.stage_planner_ms, cls: 's1' },
    { key: 'retrieval', ms: detail.stage_retrieval_ms, cls: 's2' },
    { key: 'generator', ms: detail.stage_generator_ms, cls: 's3' },
    { key: 'validator', ms: detail.stage_validator_ms, cls: 's4' },
  ];
  const total = stages.reduce((s, x) => s + (x.ms ?? 0), 0) || (detail.total_ms ?? 0) || 1;

  return (
    <div className="mon-dgrid">
      <div>
        <div className="mon-wf" style={{ height: 16 }}>
          {stages.map((s) => (
            <i key={s.key} className={s.cls} style={{ width: `${((s.ms ?? 0) / total) * 100}%` }} />
          ))}
        </div>
        <div className="mon-kv mon-mt8">
          {stages.map((s) => (
            <span key={s.key}>
              {s.key} <b>{fmtMs(s.ms)}</b>{' '}
            </span>
          ))}
          · e2e <b>{fmtMs(detail.total_ms)}</b>
        </div>
        {detail.trace_segments && detail.trace_segments.length > 0 && (
          <div className="mon-segs">{detail.trace_segments.join(' → ')}</div>
        )}
        {detail.question && <div className="mon-kv mon-mt8">Câu hỏi: “{detail.question}”</div>}
      </div>
      <div className="mon-kv">
        <div>
          <b>{fmtNum(detail.tokens_prompt)}</b> prompt + <b>{fmtNum(detail.tokens_completion)}</b>{' '}
          completion · {fmtNum(detail.token_calls)} calls
        </div>
        {detail.tokens_by_model && Object.keys(detail.tokens_by_model).length > 0 && (
          <div className="mon-mt6">
            {Object.entries(detail.tokens_by_model).map(([m, tk]) => (
              <div key={m} className="mon-mono mon-f12">
                {m}: {tk.p}p + {tk.c}c
              </div>
            ))}
          </div>
        )}
        <div className="mon-mt6">
          Sources: <b>{fmtNum(detail.sources_count)}</b>
          {detail.source_ids && detail.source_ids.length > 0 && (
            <span className="mon-mono mon-f12"> {detail.source_ids.slice(0, 5).join(', ')}{detail.source_ids.length > 5 ? '…' : ''}</span>
          )}
        </div>
        <div className="mon-mt6 mon-mono mon-f115 mon-muted">
          req {detail.request_id.slice(0, 8)}… · user {detail.user_hash ? `${detail.user_hash.slice(0, 6)}…` : '—'} ·{' '}
          {detail.session_id.length > 18 ? `${detail.session_id.slice(0, 18)}…` : detail.session_id}
        </div>
        {detail.error && <div className="mon-kv mon-mt6 mon-err-text">{detail.error}</div>}
      </div>
    </div>
  );
};

// ─────────────────────────── main tab ───────────────────────────

const TabLatency: React.FC<Props> = ({ live, refreshNonce }) => {
  const [hours, setHours] = useState(24);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [modelFilter, setModelFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);

  const stats = useMonFetch(
    () => monitoringApi.getRagStats(hours),
    [hours, refreshNonce],
    live,
    REFRESH_INTERVAL_MS,
  );

  const traces = useMonFetch(
    () =>
      monitoringApi.listTraces({
        hours,
        limit: PAGE_SIZE,
        offset,
        only_errors: filter === 'errors',
        only_refusals: filter === 'refusals',
        model: modelFilter || undefined,
      }),
    [hours, filter, modelFilter, offset, refreshNonce],
    live,
    REFRESH_INTERVAL_MS,
  );

  // Provider labels for the "Nguồn" column: cheap one-shot overview read
  // (no polling — default-model mapping rarely changes within a session).
  const [providerOf, setProviderOf] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    monitoringApi
      .getOverview()
      .then((ov) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const p of ov.llm) {
          if (p.provider && p.default_model) {
            map[p.default_model] = PROVIDER_LABEL[p.provider] ?? p.provider;
          }
        }
        setProviderOf(map);
      })
      .catch(() => undefined); // cột "Nguồn" hiển thị "—" khi không suy ra được
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => setOffset(0), [hours, filter, modelFilter]);

  const models: ModelStat[] = stats.data?.by_model ?? [];
  const stagesP50 = useMemo(() => {
    const s = stats.data?.stages ?? {};
    const rows = [
      { key: 'planner', p50: s.planner_p50 ?? null, cls: 's1', color: '#1E3A8A' },
      { key: 'retrieval', p50: s.retrieval_p50 ?? null, cls: 's2', color: '#2563EB' },
      { key: 'generator', p50: s.generator_p50 ?? null, cls: 's3', color: '#6EB9FF' },
      { key: 'validator', p50: s.validator_p50 ?? null, cls: 's4', color: '#B4E197' },
    ];
    const sum = rows.reduce((acc, r) => acc + (r.p50 ?? 0), 0);
    return rows.map((r) => ({ ...r, share: sum > 0 && r.p50 !== null ? r.p50 / sum : null }));
  }, [stats.data]);

  const asOfLine = (
    <div className="mon-asof">
      Cửa sổ <b>{WINDOWS.find((w) => w.hours === hours)?.label ?? `${hours}h`}</b> · as of{' '}
      <b className="mon-n">{fmtClock(stats.asOf)}</b>
      {stats.refreshing && <span className="mon-muted"> · đang cập nhật…</span>}
      {traces.refreshing && !stats.refreshing && <span className="mon-muted"> · log đang cập nhật…</span>}
    </div>
  );

  const windowButtons = (
    <div className="mon-filters" role="group" aria-label="Cửa sổ thời gian">
      {WINDOWS.map((w) => (
        <button
          key={w.hours}
          type="button"
          className={`mon-f${hours === w.hours ? ' on' : ''}`}
          onClick={() => setHours(w.hours)}
        >
          {w.label}
        </button>
      ))}
    </div>
  );

  if (stats.loading) return <div className="mon-card mon-empty">Đang tải số liệu RAG…</div>;
  if (stats.error && !stats.data) {
    return (
      <div className="mon-card">
        <h2>Không đọc được số liệu</h2>
        <div className="mon-err-text mon-mono mon-f125">{stats.error}</div>
        <div className="mon-sub" style={{ marginTop: 8 }}>
          Có thể chưa chạy <span className="mon-mono">alembic upgrade head</span> (thiếu bảng{' '}
          <span className="mon-mono">rag_traces</span>) hoặc Postgres đang lỗi — kiểm tra tab Hệ thống.
        </div>
      </div>
    );
  }

  const totals = stats.data?.totals;

  return (
    <section role="tabpanel">
      {asOfLine}
      {windowButtons}

      <div className="mon-card">
        <h2>Tốc độ theo model</h2>
        <div className="mon-sub">
          Suy ra từ <span className="mon-mono">rag_traces</span> · tokens/s = completion tokens ÷ generator
          time (trừ retrieval) · fallback % = model thực ≠ model yêu cầu
        </div>
        {models.length === 0 ? (
          <div className="mon-empty">Chưa có request nào qua LLM trong cửa sổ này.</div>
        ) : (
          <div className="mon-table-wrap">
            <table className="mon-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Nguồn</th>
                  <th className="r">Reqs</th>
                  <th className="r">e2e p50</th>
                  <th className="r">p95</th>
                  <th className="r">Max</th>
                  <th className="r">Gen tokens/s</th>
                  <th className="r">Err</th>
                  <th className="r">Fallback</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.model}>
                    <td className="mon-mono mon-strong">{m.model}</td>
                    <td>
                      {providerOf[m.model] ? (
                        <span className={`mon-tag${providerOf[m.model] === 'Kilo' ? ' kilo' : ''}`}>
                          {providerOf[m.model]}
                        </span>
                      ) : (
                        <span className="mon-muted">—</span>
                      )}
                    </td>
                    <td className="r mon-n">{fmtNum(m.n)}</td>
                    <td className="r mon-big mon-n">{fmtMs(m.p50_ms)}</td>
                    <td className="r mon-mono mon-n">{fmtMs(m.p95_ms)}</td>
                    <td className="r mon-mono mon-n">{fmtMs(m.max_ms)}</td>
                    <td className="r">
                      <div className="mon-bar-cell">
                        <div className="mon-mini">
                          <i style={{ width: `${Math.min(((m.tok_per_sec ?? 0) / 60) * 100, 100)}%` }} />
                        </div>
                        <b className="mon-n mon-mono">{m.tok_per_sec ?? '—'}</b>
                      </div>
                    </td>
                    <td className={`r mon-n ${m.error_rate > 0.15 ? 'mon-bad' : m.error_rate > 0 ? 'mon-meh' : 'mon-good'}`}>
                      {fmtRate(m.error_rate)}
                    </td>
                    <td className="r mon-n">{m.fallback_rate > 0 ? fmtRate(m.fallback_rate, 0) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totals && (
          <div className="mon-sub mon-mt10">
            {fmtNum(totals.total)} yêu cầu · {fmtNum(totals.cache_hits)} cache-hit ·{' '}
            {fmtNum(totals.errors)} lỗi · {fmtNum(totals.refusals)} từ chối · e2e p50{' '}
            <b>{fmtMs(totals.p50_ms)}</b> / p95 <b>{fmtMs(totals.p95_ms)}</b>
          </div>
        )}
      </div>

      <div className="mon-two">
        <div className="mon-card">
          <h2>Độ trễ theo thời gian</h2>
          <div className="mon-sub">bucket 30p · e2e p50 (liền) &amp; p95 (mờ)</div>
          <LatencyChart timeline={stats.data?.timeline ?? []} />
        </div>
        <div className="mon-card">
          <h2>Thời gian dành cho stage nào</h2>
          <div className="mon-sub">p50/request · tỉ lệ so với tổng p50 các stage</div>
          <table className="mon-table">
            <tbody>
              {stagesP50.map((s) => (
                <tr key={s.key}>
                  <td style={{ width: 96 }}>
                    <i className="mon-swatch" style={{ background: s.color }} />
                    {s.key}
                  </td>
                  <td>
                    <div className="mon-wf" style={{ minWidth: 0 }}>
                      <i className={s.cls} style={{ width: `${Math.min((s.share ?? 0) * 100, 100)}%` }} />
                    </div>
                  </td>
                  <td className="r mon-n mon-mono" style={{ width: 64 }}>
                    {fmtMs(s.p50)}
                  </td>
                  <td className="r mon-n mon-muted" style={{ width: 52 }}>
                    {s.share === null ? '—' : `${Math.round(s.share * 100)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mon-sub mon-mt10">
            Kết luận hiển nhiên: tối ưu chatbot = tối ưu <b>generator</b> (model speed + prompt size).
          </div>
        </div>
      </div>

      <div className="mon-card">
        <h2>Yêu cầu gần đây</h2>
        <div className="mon-sub">bấm dòng để mở chi tiết stage + tokens</div>
        <div className="mon-filters">
          {(
            [
              ['all', 'tất cả'],
              ['errors', 'lỗi'],
              ['refusals', 'từ chối OOD'],
            ] as [LogFilter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`mon-f${filter === id ? ' on' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
          <select
            className="mon-select"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            aria-label="Lọc theo model"
          >
            <option value="">model: tất cả</option>
            {models.map((m) => (
              <option key={m.model} value={m.model}>
                {m.model}
              </option>
            ))}
          </select>
        </div>
        {traces.error && !traces.data && (
          <div className="mon-err-text mon-f125 mon-mb10">Lỗi tải log: {traces.error}</div>
        )}
        {traces.loading ? (
          <div className="mon-empty">Đang tải log…</div>
        ) : (traces.data?.items.length ?? 0) === 0 ? (
          <div className="mon-empty">Không có trace nào khớp bộ lọc trong cửa sổ đã chọn.</div>
        ) : (
          <div className="mon-table-wrap">
            <table className="mon-table">
              <thead>
                <tr>
                  <th style={{ width: 74 }}>Giờ</th>
                  <th>Câu hỏi</th>
                  <th style={{ width: 170 }}>Model thực</th>
                  <th className="r" style={{ width: 84 }}>e2e</th>
                  <th className="r" style={{ width: 64 }}>tok/s</th>
                  <th className="r" style={{ width: 66 }}>Tokens</th>
                  <th style={{ width: 130 }}>Verdict</th>
                  <th style={{ width: 24 }} />
                </tr>
              </thead>
              <tbody>
                {traces.data!.items.map((t) => {
                  const tps = traceTokPerSec(t);
                  const isOpen = openId === t.id;
                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        className={`mon-row${t.has_error ? ' bad' : ''}`}
                        onClick={() => setOpenId(isOpen ? null : t.id)}
                      >
                        <td className="mon-n mon-mono mon-timecell">{fmtTimeShort(t.created_at)}</td>
                        <td>{t.question_preview ?? <span className="mon-muted">(không lưu câu hỏi)</span>}</td>
                        <td className="mon-mono mon-f125">
                          {t.model_used ?? '—'}
                          {t.fallback && (
                            <span className="mon-tag mon-ml6" title="model thực ≠ model yêu cầu">
                              <MonitorUndoIcon className="mon-ic" /> fb
                            </span>
                          )}
                        </td>
                        <td className={`r mon-n mon-mono${t.has_error ? ' mon-bad' : ''}`}>{fmtMs(t.total_ms)}</td>
                        <td className="r mon-n mon-mono">{tps ?? '—'}</td>
                        <td className="r mon-n mon-muted">{fmtTokens((t.tokens_prompt ?? 0) + (t.tokens_completion ?? 0))}</td>
                        <td>{verdictPill(t)}</td>
                        <td className="mon-caret">{isOpen ? '▴' : '▾'}</td>
                      </tr>
                      {isOpen && (
                        <tr className="mon-det">
                          <td colSpan={8}>
                            <TraceDetailPanel traceId={t.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mon-pager">
          <button
            type="button"
            className="mon-btn"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            ← Trước
          </button>
          <span className="mon-n mon-f125 mon-muted">
            {fmtNum(traces.data?.offset ?? 0)}–{fmtNum((traces.data?.offset ?? 0) + (traces.data?.items.length ?? 0))} / {fmtNum(traces.data?.total ?? 0)}
          </span>
          <button
            type="button"
            className="mon-btn"
            disabled={(traces.data?.offset ?? 0) + PAGE_SIZE >= (traces.data?.total ?? 0)}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Sau →
          </button>
        </div>
      </div>
    </section>
  );
};

export default TabLatency;
