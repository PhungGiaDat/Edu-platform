// frontend-web/src/pages/admin/monitoring/TabApi.tsx
/**
 * Tab "API" — P2 placeholder.
 * P1 backend chưa có endpoint API-metrics; tab này liệt kê đúng
 * những gì SẼ có (theo plan §P2), không hiển thị số giả.
 */
import React from 'react';

const TabApi: React.FC = () => (
  <section role="tabpanel">
    <div className="mon-card">
      <h2>API metrics — chưa triển khai (P2)</h2>
      <div className="mon-sub">
        Tab này để trống có chủ đích. P1 chỉ ship backend <span className="mon-mono">/overview</span>,{' '}
        <span className="mon-mono">/probe</span> và nhóm <span className="mon-mono">/rag/*</span>.
      </div>
      <div className="mon-empty" style={{ textAlign: 'left', padding: '16px 18px' }}>
        <div className="mon-strong mon-mb10">Theo kế hoạch P2 (plan 20260912_ops_dashboard §P2):</div>
        <ul className="mon-plan-list">
          <li>
            ASGI middleware đếm request/route/status → bảng <span className="mon-mono">api_metrics_minute</span>{' '}
            (Alembic revision mới)
          </li>
          <li>
            <span className="mon-mono">GET /api/v1/admin/monitoring/api/stats</span> — RPS, % theo status code,
            top routes chậm
          </li>
          <li>
            <span className="mon-mono">GET /metrics</span> (prometheus-client) cho K8s/monitoring chuẩn — không
            dùng cho tab này
          </li>
        </ul>
        <div className="mon-muted mon-f125 mon-mt10">
          Nguyên tắc giữ nguyên: chỉ hiện số API thật trả về · monitoring không làm chậm hay hỏng chat.
        </div>
      </div>
    </div>
  </section>
);

export default TabApi;
