// frontend-web/src/pages/admin/monitoring/MonitoringPage.tsx
/**
 * Ops Monitoring Dashboard — dev-facing, teacher-auth (P1).
 *
 * Tabs: Độ trễ & Model · Hệ thống · API (P2 placeholder).
 * Design source of truth: docs/design/20260913_ops_dashboard_preview_v3.html
 * Honest dev-tool aesthetic: no animated numbers, explicit stale/error states,
 * "as of" timestamps, color only for status.
 */
import React, { useState } from 'react';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import {
  MonitorBoltIcon,
  MonitorServerIcon,
  MonitorGlobeIcon,
} from '@/shared/components/icons/Icons';
import TabLatency from './TabLatency';
import TabSystem from './TabSystem';
import TabApi from './TabApi';

type TabId = 'lat' | 'sys' | 'api';

const TABS: { id: TabId; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'lat', label: 'Độ trễ & Model', Icon: MonitorBoltIcon },
  { id: 'sys', label: 'Hệ thống', Icon: MonitorServerIcon },
  { id: 'api', label: 'API', Icon: MonitorGlobeIcon },
];

const MonitoringPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>('lat');
  const [live, setLive] = useState(true);
  // Bumped by the manual refresh button; tabs list it in their fetch deps.
  const [refreshNonce, setRefreshNonce] = useState(0);

  const triggerRefresh = () => setRefreshNonce((n) => n + 1);

  return (
    <AdminLayout>
      <div className="mon-root">
        <header className="mon-header">
          <div>
            <h1 className="mon-title">
              <MonitorBoltIcon className="mon-title-icon" />
              Chatbot Monitor
              <span className="mon-who">DEV ONLY · teacher-auth</span>
            </h1>
            <div className="mon-hint">
              Endpoint <span className="mon-mono">GET /api/v1/admin/monitoring/*</span> ·
              bảng này chỉ phục vụ dev/vận hành, không phải số liệu học viên
            </div>
          </div>
          <div className="mon-header-actions">
            <button
              type="button"
              className={`mon-live${live ? ' on' : ''}`}
              onClick={() => setLive((v) => !v)}
              title={live ? 'Tắt tự động làm tươi (30s)' : 'Bật tự động làm tươi mỗi 30s'}
            >
              <span className="mon-live-dot" aria-hidden="true" />
              {live ? 'Live 30s' : 'Tạm dừng'}
            </button>
            <button type="button" className="mon-btn" onClick={triggerRefresh}>
              Làm tươi ngay
            </button>
          </div>
        </header>

        <nav className="mon-nav" role="tablist" aria-label="Monitoring sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              <Icon className="mon-ic" /> {label}
            </button>
          ))}
        </nav>

        {/* Tabs mount/unmount: chỉ tab đang xem mới poll dữ liệu */}
        {tab === 'lat' && <TabLatency live={live} refreshNonce={refreshNonce} />}
        {tab === 'sys' && <TabSystem live={live} refreshNonce={refreshNonce} />}
        {tab === 'api' && <TabApi />}

        <footer className="mon-footer">
          Dev monitor — mọi số suy ra từ <span className="mon-mono">rag_traces</span> /
          probes trực tiếp · schema: plan 20260912_ops_dashboard
        </footer>
      </div>
    </AdminLayout>
  );
};

export default MonitoringPage;
