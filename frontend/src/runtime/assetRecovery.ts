const ASSET_RELOAD_KEY = 'edu-platform:last-asset-reload';
const HISTORY_RELOAD_KEY = '__eduPlatformAssetReloadAt';
const DEFAULT_COOLDOWN_MS = 10_000;

interface ReloadMarker {
  get: () => number | null;
  set: (timestamp: number) => void;
}

interface AssetRecoveryOptions {
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  reload: () => void;
  now: () => number;
  cooldownMs: number;
  fallbackMarker: ReloadMarker;
}

function createHistoryReloadMarker(): ReloadMarker {
  return {
    get: () => {
      const state = window.history.state;
      if (!state || typeof state !== 'object') return null;
      const timestamp = (state as Record<string, unknown>)[HISTORY_RELOAD_KEY];
      return typeof timestamp === 'number' ? timestamp : null;
    },
    set: (timestamp) => {
      const currentState = window.history.state;
      const state = currentState && typeof currentState === 'object' ? currentState : {};
      window.history.replaceState({ ...state, [HISTORY_RELOAD_KEY]: timestamp }, '');
    },
  };
}

function isWithinCooldown(
  previousReload: string | number | null,
  currentTime: number,
  cooldownMs: number,
): boolean {
  if (previousReload === null) return false;
  const previousTime = Number(previousReload);
  return Number.isFinite(previousTime) && currentTime - previousTime <= cooldownMs;
}

/** True if current route is an AR route where hard reload must be suppressed. */
function isARRoute(): boolean {
  const path = window.location.pathname;
  return path === '/learn-ar' || path.startsWith('/learn-ar-xr');
}

/**
 * Recover from Vite version skew without creating an infinite reload loop.
 * Vite emits `vite:preloadError` when a lazy chunk from an older deployment
 * is no longer available after production moves to a newer deployment.
 *
 * On AR routes (/learn-ar*), the handler is suppressed — hard reload would
 * destroy an active camera/XR session. AR routes must surface errors in the
 * component state instead.
 */
export function registerAssetRecovery(
  options: Partial<AssetRecoveryOptions> = {},
): () => void {
  const target = options.target ?? window;
  const storage = options.storage ?? window.sessionStorage;
  const reload = options.reload ?? (() => window.location.reload());
  const now = options.now ?? Date.now;
  const cooldownMs = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const fallbackMarker = options.fallbackMarker ?? createHistoryReloadMarker();

  // Instrument: log that asset recovery is registered
  window.ARControlTrace?.('ASSET_RECOVERY_INSTALLED', { cooldownMs, arRoute: isARRoute() });

  const handlePreloadError: EventListener = (event) => {
    // Suppress hard reload on AR routes — let the component handle the error
    if (isARRoute()) {
      window.ARControlTrace?.('VITE_PRELOAD_ERROR_AR_SUPPRESSED', {
        path: window.location.pathname,
      });
      (event as Event).preventDefault();
      return;
    }

    const currentTime = now();
    let shouldReload: boolean;

    try {
      const previousReload = storage.getItem(ASSET_RELOAD_KEY);
      shouldReload = !isWithinCooldown(previousReload, currentTime, cooldownMs);
      if (shouldReload) {
        storage.setItem(ASSET_RELOAD_KEY, String(currentTime));
      }
    } catch {
      try {
        const previousReload = fallbackMarker.get();
        shouldReload = !isWithinCooldown(previousReload, currentTime, cooldownMs);
        if (shouldReload) {
          fallbackMarker.set(currentTime);
        }
      } catch {
        // Without a persistent marker, reloading could create an infinite loop.
        window.ARControlTrace?.('ASSET_RECOVERY_NO_MARKER', {});
        return;
      }
    }

    window.ARControlTrace?.('VITE_PRELOAD_ERROR_RECEIVED', {
      currentTime,
      shouldReload,
      cooldownMs,
    });

    if (shouldReload) {
      window.ARControlTrace?.('HARD_RELOAD_REQUESTED', {
        reason: 'vite:preloadError',
        cooldownMs,
      });
      reload();
    }
  };

  target.addEventListener('vite:preloadError', handlePreloadError);

  return () => target.removeEventListener('vite:preloadError', handlePreloadError);
}
