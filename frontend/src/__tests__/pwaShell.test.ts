import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
    expect(mainSource).toContain(".register('/sw.js', { scope: '/' })");
    expect(serviceWorkerEntrypoint).toContain("importScripts('/static/js/sw-notifications.js')");
    expect(serviceWorkerSource).toContain("caches.match('/index.html')");
    expect(serviceWorkerSource).not.toContain('module.exports');
  });
});
