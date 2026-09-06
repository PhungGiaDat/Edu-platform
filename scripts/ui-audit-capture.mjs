// UI audit capture — claymorphism scan (CORS-safe via API proxy)
// Usage: node scripts/ui-audit-capture.mjs
// Login happens in Node (no CORS there); token injected into localStorage;
// every browser /api/** call is proxied through Node so CORS never blocks.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const API = 'https://edu-platform-api-do20.onrender.com';
const OUT = 'docs/report/ui-audit';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['courses', '/courses'],
  ['games-hub', '/games'],
  ['games-topic', '/games?topic=animals'],
  ['drag-match', '/games/drag-match?topic=animals'],
  ['memory-pairs', '/games/memory-pairs?topic=animals'],
  ['color-animal', '/games/color-animal?topic=animals'],
  ['notebook', '/notebook'],
  ['dictionary', '/dictionary'],
  ['pets', '/pets'],
  ['stickers', '/stickers'],
  ['progress', '/progress'],
  ['profile', '/profile'],
  ['install', '/install'],
  ['notifications', '/notifications'],
];

async function apiLogin(request) {
  const form = new URLSearchParams();
  form.append('username', 'admin@eduplatform.com');
  form.append('password', 'AdminPassword123!');
  const res = await request.post(`${API}/api/v1/auth/login`, {
    form: { username: 'admin@eduplatform.com', password: 'AdminPassword123!' },
    timeout: 90000,
  });
  if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);
  const data = await res.json();
  return data.access_token || data.token;
}

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, baseURL: BASE });
  const token = await apiLogin(ctx.request);
  console.log('login OK, token len', token.length);

  // Decode JWT payload for a believable user shape (role/is_superuser guard
  // the restore path against the "legacy token-only" clear).
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  const userShape = {
    id: payload.id || payload.sub || 'admin',
    email: payload.email || 'admin@eduplatform.com',
    username: payload.username || 'admin',
    role: payload.role || 'admin',
    is_superuser: true,
  };
  await ctx.addInitScript(([t, u]) => {
    try {
      localStorage.setItem('authToken', t);
      localStorage.setItem('authUser', JSON.stringify(u));
      localStorage.setItem('guestMode', 'false');
    } catch {}
  }, [token, userShape] );

  const page = await ctx.newPage();
  // Proxy browser API calls through Node (bypasses CORS; keeps auth header)
  await page.route('**/api/**', async (route) => {
    try {
      const req = route.request();
      const headers = { ...req.headers() };
      headers.authorization = `Bearer ${token}`;
      delete headers.origin;
      delete headers.referer;
      const resp = await ctx.request.fetch(req.url(), {
        method: req.method(),
        headers,
        data: req.postDataBuffer() ?? undefined,
        maxRedirects: 0,
        timeout: 60000,
      });
      await route.fulfill({ response: resp });
    } catch (e) {
      await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ detail: 'proxy error' }) });
    }
  });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/websocket|Failed to load resource/i.test(m.text())) errors.push(`[console] ${page.url()}: ${m.text().slice(0, 140)}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${page.url()}: ${String(e).slice(0, 140)}`));

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/login-375.png`, fullPage: true });

  for (const [name, path] of PAGES) {
    try {
      await page.goto(path, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1400);
      await page.screenshot({ path: `${OUT}/${name}-375.png`, fullPage: true });
      console.log(`OK  ${name}`);
    } catch (e) {
      console.log(`ERR ${name}: ${String(e).slice(0, 110)}`);
      try { await page.screenshot({ path: `${OUT}/${name}-375-ERR.png`, fullPage: false }); } catch {}
    }
  }

  // Desktop pass
  const desk = await browser.newContext({ viewport: { width: 1280, height: 800 }, baseURL: BASE });
  const payload2 = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  const userShape2 = { id: payload2.id || payload2.sub || 'admin', email: payload2.email || 'admin@eduplatform.com', username: payload2.username || 'admin', role: payload2.role || 'admin', is_superuser: true };
  await desk.addInitScript(([t, u]) => {
    try {
      localStorage.setItem('authToken', t);
      localStorage.setItem('authUser', JSON.stringify(u));
      localStorage.setItem('guestMode', 'false');
    } catch {}
  }, [token, userShape2] );
  const dpage = await desk.newPage();
  await dpage.route('**/api/**', async (route) => {
    try {
      const req = route.request();
      const headers = { ...req.headers() };
      headers.authorization = `Bearer ${token}`;
      delete headers.origin; delete headers.referer;
      const resp = await desk.request.fetch(req.url(), { method: req.method(), headers, data: req.postDataBuffer() ?? undefined, timeout: 60000 });
      await route.fulfill({ response: resp });
    } catch {
      await route.fulfill({ status: 502, contentType: 'application/json', body: '{}' });
    }
  });
  for (const [name, path] of [['landing', '/'], ['courses', '/courses'], ['games-hub', '/games'], ['drag-match', '/games/drag-match?topic=animals']]) {
    try {
      await dpage.goto(path, { waitUntil: 'networkidle', timeout: 45000 });
      await dpage.waitForTimeout(1200);
      await dpage.screenshot({ path: `${OUT}/${name}-1280.png`, fullPage: false });
      console.log(`OK  ${name} (1280)`);
    } catch (e) {
      console.log(`ERR ${name}-1280: ${String(e).slice(0, 110)}`);
    }
  }

  console.log('\n--- app errors (deduped) ---');
  [...new Set(errors)].slice(0, 15).forEach((e) => console.log(e));
  await browser.close();
};

run();
