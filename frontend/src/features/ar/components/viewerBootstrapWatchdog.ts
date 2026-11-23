export interface ViewerBootstrapWatchdogOptions {
  timeoutMs: number;
  onTimeout: () => void;
}

/**
 * Provides a final, parent-owned deadline when an iframe never posts a
 * bootstrap result (for example if its inline script is blocked by CSP).
 */
export function armViewerBootstrapWatchdog({
  timeoutMs,
  onTimeout,
}: ViewerBootstrapWatchdogOptions): () => void {
  let active = true;
  const timeoutId = window.setTimeout(() => {
    if (!active) return;
    active = false;
    onTimeout();
  }, timeoutMs);

  return () => {
    if (!active) return;
    active = false;
    window.clearTimeout(timeoutId);
  };
}
