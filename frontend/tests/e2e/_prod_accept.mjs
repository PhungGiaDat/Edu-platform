// TEMP production acceptance probe — deleted after run. Reads creds from env.
import { webkit, devices } from '@playwright/test';

const BASE = 'https://edu-platform-dev.vercel.app';
const EMAIL = process.env.PW_EMAIL;
const PASS = process.env.PW_PASS;
const out = { ui: {}, cache: {}, video: {}, listen: {}, speak: {}, console: [], cspViolations: [] };

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], baseURL: BASE });
const page = await ctx.newPage();

page.on('console', (m) => {
  const t = m.text();
  out.console.push(`[${m.type()}] ${t}`);
  if (/content security policy|csp|refused to (frame|load)/i.test(t)) out.cspViolations.push(t);
});

async function login() {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // Fill email/password by common selectors
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
  const pass = page.locator('input[type="password"], input[name="password"]').first();
  await email.fill(EMAIL, { timeout: 15000 });
  await pass.fill(PASS, { timeout: 15000 });
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.locator('button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")').first().click(),
  ]);
  await page.waitForTimeout(2500);
  out.ui.loggedIn = !/\/login/.test(page.url());
}

await login();

// Navigate to the target lesson
const lessonUrl = `${BASE}/courses/momo-nature-english-5-7/lessons/meet-the-elephant`;
await page.goto(lessonUrl, { waitUntil: 'domcontentloaded' });
// poll for shell mount
for (let i = 0; i < 20; i++) {
  const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
  if (txt && txt.length > 40 && !/\/login/.test(page.url())) break;
  await page.waitForTimeout(1000);
}
out.ui.url = page.url();

// 1. LESSON UI evidence
out.ui.dom = await page.evaluate(() => {
  const body = document.body.innerText || '';
  return {
    hasPhanHoc: /Ph[aầ]n h[oọ]c\s*1/i.test(body),
    hasLegacyTabs: /Gi[ơớ]i thi[eệ]u/.test(body) && /Tr[oò] ch[ơo]i/.test(body) && /T[ừu] m[ơớ]i/.test(body),
    hasBottomNav: !!document.querySelector('nav[class*="bottom" i], [class*="BottomNav" i], [data-testid*="bottom-nav" i]'),
    lessonShell: !!document.querySelector('[class*="LessonShell" i], [data-testid*="lesson-shell" i], [class*="lesson-shell" i]'),
    stepIndicators: document.querySelectorAll('[class*="step" i], [class*="progress-dot" i]').length,
    bodySample: body.slice(0, 400),
  };
});

// 2. SW / CACHE
out.cache = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  const keys = (typeof caches !== 'undefined') ? await caches.keys() : [];
  return {
    registrations: regs.map(r => ({ scope: r.scope, active: r.active?.scriptURL ?? null })),
    cacheKeys: keys,
  };
});

// 3. VIDEO — find a video step control and play
try {
  const videoBtn = page.locator('button:has-text("Video"), [role="tab"]:has-text("Video"), :text("Video")').first();
  if (await videoBtn.count()) { await videoBtn.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1500); }
  const playBtn = page.locator('button:has-text("Play"), button[aria-label*="play" i], [class*="play" i]').first();
  if (await playBtn.count()) { await playBtn.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2500); }
  out.video = await page.evaluate(() => {
    const ifr = Array.from(document.querySelectorAll('iframe'));
    const yt = ifr.find(f => /youtube(-nocookie)?\.com/.test(f.src));
    return {
      iframeCount: ifr.length,
      youtubeSrc: yt?.src ?? null,
      youtubeVisible: yt ? (yt.getBoundingClientRect().width > 50 && yt.getBoundingClientRect().height > 50) : false,
    };
  });
} catch (e) { out.video.error = String(e); }

// 4. NGHE MẪU
try {
  const vocabBtn = page.locator(':text("Từ mới"), :text("Từ vựng"), [role="tab"]:has-text("vựng")').first();
  if (await vocabBtn.count()) { await vocabBtn.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(1200); }
  // hook audio requests
  const audioReqs = [];
  page.on('response', (r) => {
    if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(r.url()) || /pronunciation\/tts/i.test(r.url())) {
      audioReqs.push({ url: r.url(), status: r.status(), ct: r.headers()['content-type'] ?? null });
    }
  });
  await page.evaluate(() => {
    window.__audioEvents = [];
    const orig = window.HTMLAudioElement.prototype.play;
    window.HTMLAudioElement.prototype.play = function () {
      window.__audioEvents.push('play-called:' + this.src);
      this.addEventListener('playing', () => window.__audioEvents.push('playing:' + this.src), { once: true });
      this.addEventListener('error', () => window.__audioEvents.push('error:' + this.src), { once: true });
      return orig.apply(this, arguments);
    };
  });
  const listenBtn = page.locator('button:has-text("Nghe mẫu"), [aria-label*="Nghe" i]').first();
  if (await listenBtn.count()) { await listenBtn.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(3500); }
  out.listen.events = await page.evaluate(() => window.__audioEvents || []);
  out.listen.requests = audioReqs;
} catch (e) { out.listen.error = String(e); }

// 5. LUYỆN NÓI
try {
  out.speak.runtime = await page.evaluate(() => ({
    isSecureContext: window.isSecureContext,
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    hasMediaRecorder: typeof window.MediaRecorder !== 'undefined',
  }));
  const transReqs = [];
  page.on('response', (r) => {
    if (/pronunciation\/(transcribe|assess)/i.test(r.url())) transReqs.push({ url: r.url(), status: r.status() });
  });
  const speakBtn = page.locator('button:has-text("Luyện nói"), [aria-label*="Luyện nói" i]').first();
  if (await speakBtn.count()) { await speakBtn.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(3000); }
  out.speak.transcriptionReqs = transReqs;
  out.speak.bodyAfter = await page.evaluate(() => (document.body.innerText || '').slice(0, 300));
} catch (e) { out.speak.error = String(e); }

console.log('===PROD_ACCEPT_JSON_START===');
console.log(JSON.stringify(out, null, 2));
console.log('===PROD_ACCEPT_JSON_END===');

await browser.close();
