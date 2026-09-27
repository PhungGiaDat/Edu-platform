// TEMP production acceptance probe #2 — deleted after run. Creds from env only.
import { webkit, devices } from '@playwright/test';

const BASE = 'https://edu-platform-dev.vercel.app';
const EMAIL = process.env.PW_EMAIL;
const PASS = process.env.PW_PASS;
const LESSON = `${BASE}/courses/momo-nature-english-5-7/lessons/meet-the-elephant`;

const out = {
  login: { attempts: [] },
  ui: {},
  cache: {},
  video: { requests: [], iframes: [] },
  listen: { requests: [], events: [] },
  speak: { runtime: {}, requests: [] },
  cspViolations: [],
  consoleErrors: [],
};

const browser = await webkit.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  baseURL: BASE,
  permissions: ['microphone'],
});
const page = await ctx.newPage();

// ---- session-wide evidence collectors -------------------------------
page.on('console', (m) => {
  const t = m.text();
  if (/content security policy|refused to (frame|load)|blocked by csp/i.test(t)) {
    out.cspViolations.push(t);
  }
  if (m.type() === 'error') out.consoleErrors.push(t.slice(0, 200));
});

page.on('response', async (res) => {
  const u = res.url();
  let ct = '';
  try { ct = res.headers()['content-type'] || ''; } catch {}
  const rec = { url: u.slice(0, 160), status: res.status(), contentType: ct.slice(0, 60) };
  if (/youtube-nocookie\.com|youtube\.com/.test(u)) out.video.requests.push(rec);
  if (/pronunciation\/tts\/stream/.test(u)) out.listen.requests.push(rec);
  if (/pronunciation\/transcribe/.test(u)) out.speak.requests.push(rec);
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/i.test(u) || /learnar-assets|supabase/.test(u)) {
    out.listen.requests.push(rec);
  }
});

// in-page CSP violation reporter
await ctx.addInitScript(() => {
  window.__csp = [];
  document.addEventListener('securitypolicyviolation', (e) => {
    window.__csp.push({
      directive: e.violatedDirective,
      blocked: e.blockedURI && e.blockedURI.slice(0, 120),
      original: e.originalPolicy && e.originalPolicy.slice(0, 80),
    });
  });
  // record real audio element lifecycle
  window.__audio = [];
  const tap = (el) => {
    if (!(el instanceof HTMLAudioElement)) return;
    ['play', 'playing', 'pause', 'ended', 'error'].forEach((ev) => {
      el.addEventListener(ev, () => {
        window.__audio.push({ ev, src: (el.currentSrc || el.src || '').slice(0, 140) });
      });
    });
  };
  const orig = window.Audio;
  window.Audio = function (...a) { const el = new orig(...a); tap(el); return el; };
  window.Audio.prototype = orig.prototype;
  const obs = new MutationObserver((ms) => {
    ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n instanceof HTMLAudioElement) tap(n);
      if (n.querySelectorAll) n.querySelectorAll('audio').forEach(tap);
    }));
  });
  document.addEventListener('DOMContentLoaded', () => {
    obs.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll('audio').forEach(tap);
  });
});

// ---- login ----------------------------------------------------------
async function tryLogin() {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  // wait for a real password input regardless of i18n state
  await page.waitForSelector('input[type="password"]', { timeout: 20000 });
  await page.waitForTimeout(800);

  const emailSel = 'input[type="email"], input[name*="email" i], input[id*="email" i], input[type="text"]';
  const emailLoc = page.locator(emailSel).first();
  await emailLoc.fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASS);

  const btn = page.locator('button[type="submit"], form button').first();
  await btn.click().catch(async () => {
    await page.locator('input[type="password"]').first().press('Enter');
  });

  try {
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), null, { timeout: 20000 });
    return true;
  } catch {
    return false;
  }
}

let loggedIn = await tryLogin();
out.login.attempts.push({ attempt: 1, loggedIn });
if (!loggedIn) {
  // one reload retry — locale bundle may have been mid-load
  await page.waitForTimeout(1500);
  loggedIn = await tryLogin();
  out.login.attempts.push({ attempt: 2, loggedIn });
}
out.login.loggedIn = loggedIn;

if (!loggedIn) {
  out.login.bodySample = await page.evaluate(() => (document.body.innerText || '').slice(0, 300));
} else {
  // ---- lesson UI ----------------------------------------------------
  await page.goto(LESSON, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // 1. Warm-up (Step 0) inspection
  out.ui.warmup = await page.evaluate(() => {
    const txt = document.body.innerText || '';
    return {
      url: location.href,
      hasPhanHoc: /Phần học\s*\d/i.test(txt),
      hasLegacyTabs: /Giới thiệu[\s\S]{0,40}Trò chơi[\s\S]{0,40}Từ mới/.test(txt),
      hasBottomNav: !!document.querySelector('nav[aria-label*="bottom" i], .bottom-nav, [data-testid="lesson-bottom-nav"]'),
      bodySample: txt.replace(/\s+/g, ' ').slice(0, 250),
    };
  });

  out.cache = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const keys = (typeof caches !== 'undefined') ? await caches.keys() : [];
    return {
      registrations: regs.map((r) => ({ scope: r.scope, active: r.active && r.active.scriptURL, waiting: r.waiting && r.waiting.scriptURL })),
      cacheKeys: keys,
    };
  });

  // Step 0 -> Step 1: Click "Bắt đầu học ngay 🚀"
  const startBtn = page.locator('button:has-text("Bắt đầu học ngay"), button:has-text("Start")').first();
  if (await startBtn.count()) {
    await startBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Step 1 (Video) - LessonShell and Video section
  out.ui.step1 = await page.evaluate(() => {
    const txt = document.body.innerText || '';
    const dots = document.querySelectorAll('header span.rounded-full');
    const exitBtn = document.querySelector('header button');
    const footer = document.querySelector('footer');
    return {
      stepIndicators: dots.length,
      hasExitButton: !!exitBtn && (exitBtn.textContent || '').includes('✕'),
      hasFooter: !!footer,
      hasPhanHoc: /Phần học\s*\d/i.test(txt),
      hasLegacyTabs: /Giới thiệu[\s\S]{0,40}Trò chơi[\s\S]{0,40}Từ mới/.test(txt),
      hasBottomNav: !!document.querySelector('nav[aria-label*="bottom" i], .bottom-nav, [data-testid="lesson-bottom-nav"]'),
      lessonShellMounted: dots.length === 9,
      bodySample: txt.replace(/\s+/g, ' ').slice(0, 250),
    };
  });

  // Click poster "▶ Xem video"
  const watchBtn = page.locator('button:has-text("Xem video"), button:has-text("Watch video")').first();
  if (await watchBtn.count()) {
    await watchBtn.click();
    await page.waitForTimeout(3500);
  }

  out.video.iframes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('iframe')).map((f) => {
      const r = f.getBoundingClientRect();
      return {
        src: (f.src || '').slice(0, 140),
        w: Math.round(r.width),
        h: Math.round(r.height),
        visible: r.width > 50 && r.height > 50,
      };
    }),
  );
  out.video.csp = await page.evaluate(() => window.__csp || []);
  await page.screenshot({ path: 'test-artifacts/_prod2-video.png' }).catch(() => {});

  // Step 1 -> Step 2: Click "Con đã xem xong! Tiếp tục →" / "👀 Continue to Vocabulary →"
  const watchedBtn = page.locator('button:has-text("Continue to Vocabulary"), button:has-text("Vocabulary"), button:has-text("đã xem xong"), button:has-text("watched"), button:has-text("Tiếp tục")').first();
  if (await watchedBtn.count()) {
    await watchedBtn.scrollIntoViewIfNeeded().catch(() => {});
    await watchedBtn.click();
    await page.waitForFunction(() => {
      const t = document.body.innerText || '';
      return /elephant|con voi|nghe mẫu|luyện nói|listen|speak/i.test(t);
    }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
  }

  // 3. Step 2 (Vocabulary) - Nghe mẫu & Luyện nói
  out.ui.step2 = await page.evaluate(() => {
    const txt = document.body.innerText || '';
    const dots = document.querySelectorAll('header span.rounded-full');
    return {
      stepIndicators: dots.length,
      isVocabulary: /elephant|con voi|nghe mẫu|luyện nói|listen|speak/i.test(txt),
      bodySample: txt.replace(/\s+/g, ' ').slice(0, 250),
    };
  });

  // NGHE MẪU
  const listenBtn = page.locator('button:has-text("🔊"), button:has-text("Nghe mẫu"), button:has-text("Listen")').first();
  if (await listenBtn.count()) {
    await listenBtn.scrollIntoViewIfNeeded().catch(() => {});
    await listenBtn.click();
    out.listen.clickedNgheMau = true;
  } else {
    out.listen.clickedNgheMau = false;
  }
  await page.waitForTimeout(6000);
  out.listen.events = await page.evaluate(() => window.__audio || []);
  await page.screenshot({ path: 'test-artifacts/_prod2-listen.png' }).catch(() => {});

  // LUYỆN NÓI
  out.speak.runtime = await page.evaluate(() => ({
    isSecureContext: window.isSecureContext,
    hasMediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasSpeechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    hasMediaRecorder: typeof window.MediaRecorder === 'function',
  }));

  const speakBtn = page.locator('button:has-text("🎤"), button:has-text("Luyện nói"), button:has-text("Speak")').first();
  if (await speakBtn.count()) {
    await speakBtn.scrollIntoViewIfNeeded().catch(() => {});
    await speakBtn.click();
    out.speak.clicked = true;
  } else {
    out.speak.clicked = false;
  }
  await page.waitForTimeout(5000);
  out.speak.csp = await page.evaluate(() => window.__csp || []);
  out.speak.bodyAfter = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300));
  await page.screenshot({ path: 'test-artifacts/_prod2-speak.png' }).catch(() => {});
}

console.log('===PROD2_JSON_START===');
console.log(JSON.stringify(out, null, 2));
console.log('===PROD2_JSON_END===');

await browser.close();