import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const frontendRoot = resolve(process.cwd());
const indexHtml = readFileSync(resolve(frontendRoot, 'index.html'), 'utf8');
const mainSource = readFileSync(resolve(frontendRoot, 'src/main.tsx'), 'utf8');
const serviceWorkerSource = readFileSync(
  resolve(frontendRoot, 'public/static/js/sw-notifications.js'),
  'utf8',
);
const serviceWorkerEntrypoint = readFileSync(
  resolve(frontendRoot, 'public/sw.js'),
  'utf8',
);
const manifest = JSON.parse(
  readFileSync(resolve(frontendRoot, 'public/manifest.json'), 'utf8'),
) as { display: string; icons: Array<{ src: string }> };

describe('PWA shell contract', () => {
  it('serves a linked standalone manifest with an existing icon', () => {
    expect(indexHtml).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icons/icon-192x192.png' }),
        expect.objectContaining({ src: '/icons/icon-512x512.png' }),
      ]),
    );
    expect(existsSync(resolve(frontendRoot, 'public/icons/icon-192x192.png'))).toBe(true);
    expect(existsSync(resolve(frontendRoot, 'public/icons/icon-512x512.png'))).toBe(true);
  });

  it('registers the production service worker and keeps an offline app-shell fallback', () => {
    expect(mainSource).toContain(".register('/sw.js', { scope: '/', updateViaCache: 'none' })");
    expect(serviceWorkerEntrypoint).toContain("importScripts('/static/js/sw-notifications.js')");
    expect(serviceWorkerSource).toContain("caches.match('/index.html')");
    expect(serviceWorkerSource).not.toContain('module.exports');
  });

  it('never serves AR runtime assets from the dynamic cache', () => {
    const arRuntimeBypass = serviceWorkerSource.indexOf("url.pathname.startsWith('/static/ar-assets/')");
    const dynamicCacheLookup = serviceWorkerSource.indexOf('caches.match(request)');

    expect(serviceWorkerSource).toContain("const STATIC_CACHE = 'eduar-static-v4';");
    expect(serviceWorkerSource).toContain("const DYNAMIC_CACHE = 'eduar-dynamic-v4';");
    expect(arRuntimeBypass).toBeGreaterThan(-1);
    expect(arRuntimeBypass).toBeLessThan(dynamicCacheLookup);
    expect(serviceWorkerSource.slice(arRuntimeBypass, dynamicCacheLookup)).toContain(
      'event.respondWith(fetch(request));',
    );
  });

  it('fetches current icons online and falls back to cached PWA metadata offline', async () => {
    type FetchEvent = {
      request: { url: string; method: string; mode: string };
      respondWith: (response: Promise<unknown>) => void;
      waitUntil: (work: Promise<unknown>) => void;
    };
    const listeners = new Map<string, (event: FetchEvent) => void>();
    const cached = { source: 'cache' };
    const fresh = { ok: true, clone: () => ({ source: 'network copy' }) };
    const put = vi.fn(async () => undefined);
    const match = vi.fn(async () => cached);
    const fetch = vi.fn().mockResolvedValueOnce(fresh).mockRejectedValueOnce(new Error('offline'));

    runInNewContext(serviceWorkerSource, {
      self: { location: { origin: 'https://example.test' }, addEventListener: (type: string, listener: (event: FetchEvent) => void) => listeners.set(type, listener) },
      caches: { open: async () => ({ put }), match },
      fetch,
      URL,
    });

    const request = (path: string) => ({ url: `https://example.test${path}`, method: 'GET', mode: 'same-origin' });
    const respond = async (path: string) => {
      let response: Promise<unknown> | undefined;
      let work: Promise<unknown> | undefined;
      listeners.get('fetch')?.({ request: request(path), respondWith: (value) => { response = value; }, waitUntil: (value) => { work = value; } });
      const result = await response;
      await work;
      return result;
    };

    expect(await respond('/icons/icon-180x180.png')).toBe(fresh);
    expect(fetch).toHaveBeenCalledWith(request('/icons/icon-180x180.png'), { cache: 'no-store' });
    expect(put).toHaveBeenCalledOnce();
    expect(await respond('/manifest.json')).toBe(cached);
    expect(match).toHaveBeenCalledWith(request('/manifest.json'));
  });
});
