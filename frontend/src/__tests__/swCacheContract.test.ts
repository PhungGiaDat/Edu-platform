/**
 * Service-worker cache-invalidation contract tests.
 *
 * RED/GREEN: these must fail (RED) before the SW is updated,
 * then pass (GREEN) after bumping cache versions to v4.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const swSource = readFileSync(
  resolve(process.cwd(), 'public/static/js/sw-notifications.js'),
  'utf8',
);

describe('SW cache-invalidation contract', () => {
  // 1. Navigation prefers network over cache
  it('navigation requests use network-first strategy', () => {
    // fetch(request) before caches.match — network-first pattern
    const navBlock = swSource.match(
      /request\.mode\s*===\s*'navigate'[\s\S]*?return;/,
    );
    expect(navBlock).not.toBeNull();
    expect(navBlock![0]).toContain('fetch(request)');
    expect(navBlock![0]).toContain("caches.match('/index.html')");
    // fetch must appear before caches.match (network-first, not cache-first)
    const fetchIdx = navBlock![0].indexOf('fetch(request)');
    const cacheIdx = navBlock![0].indexOf('caches.match');
    expect(fetchIdx).toBeLessThan(cacheIdx);
  });

  // 2. Network failure falls back to cached index
  it('navigation falls back to cached index.html on network failure', () => {
    expect(swSource).toContain(".catch(() => caches.match('/index.html'))");
  });

  // 3. Hashed static assets remain cacheable (dynamic cache population)
  it('non-navigation GET requests are served cache-first with dynamic populate', () => {
    // Pattern: caches.match(request).then(cached => { if (cached) return cached; ...fetch...cache.put }
    expect(swSource).toContain('caches.match(request)');
    expect(swSource).toContain('cache.put(request, responseToCache)');
  });

  // 4. Activate deletes eduar-static-v3
  it('activate handler will delete old eduar-static-v3 cache', () => {
    // Current version must be v4, so v3 is not in the keep-list
    expect(swSource).toContain("const STATIC_CACHE = 'eduar-static-v4';");
    expect(swSource).not.toContain("const STATIC_CACHE = 'eduar-static-v3';");
  });

  // 5. Activate deletes eduar-dynamic-v3
  it('activate handler will delete old eduar-dynamic-v3 cache', () => {
    expect(swSource).toContain("const DYNAMIC_CACHE = 'eduar-dynamic-v4';");
    expect(swSource).not.toContain("const DYNAMIC_CACHE = 'eduar-dynamic-v3';");
  });

  // 6. Current cache version v4 is retained (activate keeps only current names)
  it('activate cleanup retains only current STATIC_CACHE and DYNAMIC_CACHE', () => {
    expect(swSource).toContain('key !== STATIC_CACHE && key !== DYNAMIC_CACHE');
  });

  // 7. skipWaiting used during install
  it('install phase calls skipWaiting for immediate activation', () => {
    expect(swSource).toContain('self.skipWaiting()');
  });

  // 8. clients.claim used during activate
  it('activate phase calls clients.claim to take control immediately', () => {
    expect(swSource).toContain('self.clients.claim()');
  });
});
