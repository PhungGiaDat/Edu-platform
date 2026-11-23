// Re-capture fixed pages only
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173';
const API = 'https://edu-platform-api-do20.onrender.com';
const OUT = 'docs/report/ui-audit';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ['games-hub', '/games'],
  ['stickers', '/stickers'],
  ['pets', '/pets'],
  ['progress', '/progress'],
  ['notebook', '/notebook'],
];

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, baseURL: BASE });
  const res = await ctx.request.post(`${API}/api/v1/auth/login`, {
    form: { username: 'admin@eduplatform.com', password: 'AdminPassword123!' }, timeout: 90000,
  });
  const { access_token: token } = await res.json();
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  const userShape = { id: payload.sub, email: 'admin@eduplatform.com', username: 'admin', role: 'admin', is_superuser: true };
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('authToken', t);
    localStorage.setItem('authUser', JSON.stringify(u));
    localStorage.setItem('guestMode', 'false');
  }, [token, userShape]);

  const page = await ctx.newPage();
  await page.route('**/api/**', async (route) => {
    try {
      const req = route.request();
      const headers = { ...req.headers() };
      headers.authorization = `Bearer ${token}`;
      delete headers.origin; delete headers.referer;
      const resp = await ctx.request.fetch(req.url(), { method: req.method(), headers, data: req.postDataBuffer() ?? undefined, timeout: 60000 });
      await route.fulfill({ response: resp });
    } catch { await route.fulfill({ status: 502, body: '{}' }); }
  });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 160)));

  for (const [name, path] of PAGES) {
    await page.goto(path, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/${name}-375.png`, fullPage: true });
    console.log(`OK ${name}`);
  }
  await browser.close();
};
run();
