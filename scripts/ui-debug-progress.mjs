// Hard debug /progress: capture ALL console from the very start
import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, baseURL: BASE });
  const res = await ctx.request.post('https://edu-platform-api-do20.onrender.com/api/v1/auth/login', { form: { username: 'admin@eduplatform.com', password: 'AdminPassword123!' }, timeout: 90000 });
  const { access_token: token } = await res.json();
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  await ctx.addInitScript(([t, u]) => {
    localStorage.setItem('authToken', t);
    localStorage.setItem('authUser', JSON.stringify(u));
    localStorage.setItem('guestMode', 'false');
  }, [token, { id: payload.sub, email: 'admin@eduplatform.com', username: 'admin', role: 'admin', is_superuser: true }]);
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
  page.on('console', (m) => console.log(`[${m.type()}]`, m.text().slice(0, 240)));
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 400)));
  page.on('requestfailed', (r) => console.log('REQFAIL:', r.url().slice(-50), r.failure()?.errorText));
  console.log('=== goto /progress ===');
  await page.goto('/progress', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(5000);
  const html = await page.content();
  console.log('root in html:', html.includes('id="root"'));
  await browser.close();
};
run();
