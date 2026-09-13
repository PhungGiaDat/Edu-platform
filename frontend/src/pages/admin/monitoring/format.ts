// frontend-web/src/pages/admin/monitoring/format.ts
/**
 * Formatting helpers for the Ops Monitoring Dashboard.
 * Honest dev-tool style: explicit units, em-dash for missing data.
 */

export const fmtMs = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const fmtNum = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-US');
};

/** 1204 → "1.2k" (trace-list token column). */
export const fmtTokens = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

/** 0.082 → "8.2%" ; null → "—". */
export const fmtRate = (r: number | null | undefined, digits = 1): string => {
  if (r === null || r === undefined) return '—';
  return `${(r * 100).toFixed(digits)}%`;
};

/** "21:42:05" from an ISO timestamp (browser-local, honest for a dev tool). */
export const fmtClock = (iso: string | Date | null | undefined): string => {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('vi-VN', { hour12: false });
};

/** "20:31" hour:minute for trace rows. */
export const fmtTimeShort = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/** 274250 → "3d 0h" / "4h 12m" / "12m 30s" / "8s". */
export const fmtUptime = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined) return '—';
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

/** Short hash preview: "9f2c8ab1..." → "9f2c…". */
export const shortHash = (value: string | null | undefined, keep = 4): string => {
  if (!value) return '—';
  return value.length <= keep ? value : `${value.slice(0, keep)}…`;
};

/** Bucket ISO ("2026-09-13T14:00:00+00:00") → "14:00" local. */
export const fmtBucketHour = (isoBucket: string): string => {
  const d = new Date(isoBucket);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
};
