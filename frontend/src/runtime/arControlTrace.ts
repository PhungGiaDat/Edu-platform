/**
 * AR Control Trace — persistent ring buffer that survives React remounts,
 * hard reloads (sessionStorage), and Terser drop_console.
 *
 * Installed as a <script> in index.html before mobile-debug.js.
 * All other AR tracing goes through window.ARControlTrace().
 */

declare global {
  interface Window {
    ARControlTrace?: (label: string, details?: Record<string, unknown>) => void;
    __AR_CONTROL_BUFFER__?: ControlTraceEntry[];
    __AR_BOOT_ID__?: string;
  }
}

export interface ControlTraceEntry {
  bootId: string;
  seq: number;
  time: string;
  perf: number;
  label: string;
  details: Record<string, unknown>;
  path: string;
  visibility: DocumentVisibilityState;
}

const STORAGE_KEY = '__ar_control_trace_v1__';
const MAX_BUFFER = 300;

let seq = 0;

function makeBootId(): string {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

function readBuffer(): ControlTraceEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function persist(entries: ControlTraceEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_BUFFER)));
  } catch {
    // sessionStorage full — silently drop oldest
  }
}

function emit(label: string, details: Record<string, unknown> = {}): void {
  const entries = readBuffer();
  const entry: ControlTraceEntry = {
    bootId: window.__AR_BOOT_ID__ ?? 'unknown',
    seq: ++seq,
    time: new Date().toISOString(),
    perf: Math.round(performance.now()),
    label,
    details,
    path: location.pathname,
    visibility: document.visibilityState,
  };

  entries.push(entry);
  if (entries.length > MAX_BUFFER) entries.shift();
  persist(entries);
  window.__AR_CONTROL_BUFFER__ = entries;

  window.dispatchEvent(
    new CustomEvent('ar:control-trace', { detail: entry }),
  );
}

window.__AR_BOOT_ID__ = makeBootId();
window.__AR_CONTROL_BUFFER__ = readBuffer();
window.ARControlTrace = emit;

// ---- Document lifecycle ----
emit('DOCUMENT_BOOT', {
  navigationType: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type ?? 'unknown',
  href: location.href,
  referrer: document.referrer,
  userAgent: navigator.userAgent,
});

window.addEventListener('pageshow', (e) => {
  emit('PAGE_SHOW', { persisted: (e as PageshowEvent).persisted });
});

window.addEventListener('pagehide', (e) => {
  emit('PAGE_HIDE', {
    persisted: (e as PageHideEvent).persisted,
  });
});

window.addEventListener('beforeunload', () => {
  emit('BEFORE_UNLOAD');
});

window.addEventListener('visibilitychange', () => {
  emit('VISIBILITY_CHANGE', { state: document.visibilityState });
});

// ---- App shell events ----
window.addEventListener('vite:preloadError', (e) => {
  const payload = (e as CustomEvent<{ type?: string }>).detail?.type ?? '';
  emit('VITE_PRELOAD_ERROR', { payload });
  // If assetRecovery decides to reload, HARD_RELOAD_REQUESTED fires from there
});

window.addEventListener('error', (e) => {
  emit('WINDOW_ERROR', {
    message: (e as ErrorEvent).message,
    source: (e as ErrorEvent).filename,
    line: (e as ErrorEvent).lineno,
    column: (e as ErrorEvent).colno,
  });
}, true);

window.addEventListener('unhandledrejection', (e) => {
  emit('UNHANDLED_REJECTION', { reason: String((e as PromiseRejectionEvent).reason) });
});

// ---- Service Worker ----
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    emit('SW_CONTROLLER_CHANGE', {
      controller: navigator.serviceWorker.controller?.scriptURL ?? null,
    });
  });

  emit('SW_STATE_AT_BOOT', {
    controller: navigator.serviceWorker.controller?.scriptURL ?? null,
  });
}
