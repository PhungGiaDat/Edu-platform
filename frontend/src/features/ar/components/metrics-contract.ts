/**
 * metrics-contract.ts
 *
 * Canonical A/B metrics contract for AR engine comparison.
 * Emitted by both MindAR and XR runtime layers via postMessage.
 *
 * Storage sinks:
 *   - ?metrics=on   → dispatch 'AR_SESSION_METRICS' event for debug overlay
 *   - ?db-metrics=on → INSERT into ar_ab_metrics table (TODO: enable when table exists)
 *
 * Both lanes (MindAR + XR) emit through this single function — no duplicate call sites.
 */

export type EngineType = 'mindar' | 'xr';

export interface ARSessionMetrics {
  engine_type: EngineType;
  session_id: string;
  /** ms from page load / engine init to AR_READY */
  time_to_ar_ready_ms: number | null;
  /** ms from AR_READY to first TARGET_FOUND */
  time_to_first_target_ms: number | null;
  /** ms from AR_READY to second TARGET_FOUND (null if never found) */
  time_to_second_target_ms: number | null;
  fps_avg: number | null;
  fps_min: number | null;
  triggered_fallback: boolean;
  /** filled from navigator.userAgent for device segmenting */
  device_hint: string;
  /** ISO timestamp when this session started */
  session_started_at: string;
}

const SESSION_KEY = 'ar_session_id';
const DB_FLAG = '?db-metrics=on';

function getOrCreateSessionId(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

/**
 * Get device hint from User-Agent (lightweight, no external deps).
 */
function getDeviceHint(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Win/.test(ua)) return 'Windows';
  return 'other';
}

/**
 * Core emit function — call once per significant AR event.
 * All metrics are accumulated in a module-level store and flushed
 * when the session ends or when `flushMetrics()` is called explicitly.
 */
export function emitARMetrics(partial: Partial<ARSessionMetrics>): void {
  const store = getMetricsStore();

  // Merge into store
  Object.assign(store, partial);

  // Always stamp session-level fields on first call
  if (!store._init) {
    store._init = true;
    store.session_id = store.session_id || getOrCreateSessionId();
    store.session_started_at = store.session_started_at || new Date().toISOString();
    store.device_hint = store.device_hint || getDeviceHint();
  }

  // Console output always (zero cost, always available)
  console.debug('[AR Metrics]', { ...store });

  // Debug overlay sink: dispatch event parent can listen to
  if (typeof window !== 'undefined' && window.location.search.includes('metrics=on')) {
    window.dispatchEvent(new CustomEvent('AR_SESSION_METRICS', { detail: store }));
  }

  // Supabase sink: guarded by flag (table TODO — only enable when ar_ab_metrics exists)
  if (typeof window !== 'undefined' && window.location.search.includes(DB_FLAG)) {
    // TODO: replace with real Supabase INSERT once ar_ab_metrics table is created
    // await supabase.from('ar_ab_metrics').insert(store);
    console.info('[AR Metrics] Supabase sink enabled — table not yet created');
  }
}

/** Get a snapshot of the current metrics store. */
export function getCurrentMetrics(): Partial<ARSessionMetrics> {
  return { ...getMetricsStore() };
}

/** Clear the store (call on session end / navigation away). */
export function clearMetrics(): void {
  metricsStore = {};
}

// ---------------------------------------------------------------------------
// Internal module store — survives across postMessage events within a session
// ---------------------------------------------------------------------------
interface MetricsStore extends Partial<ARSessionMetrics> {
  _init?: boolean;
}

let metricsStore: MetricsStore = {};

function getMetricsStore(): MetricsStore {
  return metricsStore;
}
