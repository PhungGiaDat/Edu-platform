import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { registerAssetRecovery } from './assetRecovery';

describe('stale Vite asset recovery', () => {
  it('reloads once for a preload failure and prevents reload loops', () => {
    const target = new EventTarget();
    sessionStorage.clear();
    let currentTime = 1_000;
    let reloadCount = 0;
    const unregister = registerAssetRecovery({
      target,
      storage: sessionStorage,
      reload: () => {
        reloadCount += 1;
      },
      now: () => currentTime,
      cooldownMs: 10_000,
    });

    const firstFailure = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(firstFailure);
    expect(firstFailure.defaultPrevented).toBe(true);
    expect(reloadCount).toBe(1);

    target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    expect(reloadCount).toBe(1);

    currentTime += 10_001;
    target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    expect(reloadCount).toBe(2);

    unregister();
    currentTime += 10_001;
    target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    expect(reloadCount).toBe(2);
  });

  it('registers recovery before the React application starts', () => {
    const entrySource = readFileSync(resolve(process.cwd(), 'src', 'main.tsx'), 'utf8');

    expect(entrySource).toContain("import { registerAssetRecovery } from './runtime/assetRecovery'");
    expect(entrySource.indexOf('registerAssetRecovery()')).toBeLessThan(
      entrySource.indexOf('createRoot('),
    );
  });

  it('uses a reload-surviving fallback when session storage is unavailable', () => {
    const target = new EventTarget();
    const unavailableStorage = {
      getItem: () => {
        throw new Error('storage blocked');
      },
      setItem: () => {
        throw new Error('storage blocked');
      },
    };
    let fallbackTimestamp: number | null = null;
    const fallbackMarker = {
      get: () => fallbackTimestamp,
      set: (timestamp: number) => {
        fallbackTimestamp = timestamp;
      },
    };
    let currentTime = 1_000;
    let reloadCount = 0;
    const options = {
      target,
      storage: unavailableStorage,
      fallbackMarker,
      reload: () => {
        reloadCount += 1;
      },
      now: () => currentTime,
      cooldownMs: 10_000,
    };

    const unregisterBeforeReload = registerAssetRecovery(options);
    target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    expect(reloadCount).toBe(1);
    unregisterBeforeReload();

    const unregisterAfterReload = registerAssetRecovery(options);
    const repeatedFailure = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(repeatedFailure);
    expect(repeatedFailure.defaultPrevented).toBe(true);
    expect(reloadCount).toBe(1);

    currentTime += 10_001;
    target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }));
    expect(reloadCount).toBe(2);
    unregisterAfterReload();
  });
});
