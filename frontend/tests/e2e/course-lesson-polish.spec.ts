import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const course = JSON.parse(readFileSync(new URL('../../../backend/seeds/courses/momo_home_family.json', import.meta.url), 'utf8'));
const lesson = course.lessons[0];
const sentence = 'This is my mom.';

test.use({ viewport: { width: 390, height: 844 }, trace: 'retain-on-failure' });

test('catalog lesson selection, sentence practice and authored quiz audio at 390px', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const pronunciationAttempts: Array<Record<string, unknown>> = [];
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (path === '/api/v1/courses') body = [course];
    else if (path === `/api/v1/courses/${course.course_id}`) body = course;
    else if (path === `/api/v1/courses/${course.course_id}/lessons/${lesson.lesson_id}`) body = lesson;
    else if (path.endsWith('/progress') || path.endsWith('/media')) body = [];
    else if (path.endsWith('/pronunciation/feedback')) body = { message: 'Bé nói rất tốt!', emoji: '🌟', stars: 3, category: 'excellent', encouragement: 'Tiếp tục nhé!' };
    else if (path.endsWith('/pronunciation/attempt')) pronunciationAttempts.push(route.request().postDataJSON());
    else if (path.endsWith('/pronunciation/transcription/status')) body = { available: false, model_loaded: false };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(({ sentence }) => {
    localStorage.setItem('guestMode', 'true');
    localStorage.setItem('edu-platform-locale', 'vi');
    localStorage.removeItem('eduar_access_token');
    const browser = window as typeof window & { playedAudio: string[]; SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
    browser.playedAudio = [];
    // Only media/recognition boundaries are simulated; app playback, matching,
    // state transitions and outgoing attempt payloads run through real services.
    HTMLMediaElement.prototype.play = function () {
      browser.playedAudio.push(this.src);
      window.setTimeout(() => this.dispatchEvent(new Event('ended')), 180);
      return Promise.resolve();
    };
    class Recognition {
      onresult?: (event: unknown) => void;
      onend?: () => void;
      start() {
        window.setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: sentence, confidence: 0.99 }]] });
          this.onend?.();
        }, 250);
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    browser.SpeechRecognition = Recognition;
    browser.webkitSpeechRecognition = Recognition;
  }, { sentence });

  await page.goto('/courses');
  await page.getByRole('button', { name: /^Bắt đầu học$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/courses/${course.course_id}$`));
  const journey = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Hành trình 6 bài học', exact: true }) });
  await expect(journey.getByRole('button', { name: /Bắt đầu học|Vào học ngay/ })).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Talk to Lexi', exact: true })).toBeVisible();
  const artifactPrefix = `test-artifacts/polish-${testInfo.project.name.replace(/\s+/g, '-').toLowerCase()}`;
  await page.screenshot({ path: `${artifactPrefix}-course.png`, fullPage: true });
  await journey.getByRole('button', { name: /Bắt đầu học|Vào học ngay/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/lessons/${lesson.lesson_id}$`));
  await expect(page.getByRole('button', { name: 'Talk to Lexi', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Bắt đầu học ngay/ }).click();
  await page.getByRole('button', { name: /Con đã xem xong|Tiếp tục/ }).click();

  await expect(page.getByText('Bé hãy phát âm theo câu sau', { exact: true })).toBeVisible();
  const inlineLexi = page.getByLabel('Lexi cùng bé luyện nói', { exact: true });
  await expect(inlineLexi).toHaveCount(1);
  const slide = page.locator('div.w-full.shrink-0').filter({ has: page.getByRole('heading', { name: 'Mom', exact: true }) });
  const listen = slide.getByRole('button', { name: 'Nghe mẫu', exact: true });
  const microphone = slide.getByRole('button', { name: 'Luyện nói', exact: true });
  await expect(listen.locator('.msr')).toHaveAttribute('aria-hidden', 'true');
  expect(await listen.locator('.msr').evaluate((icon) => getComputedStyle(icon).fontFamily)).toContain('Material Symbols Rounded');
  expect(await page.evaluate(async () => (await document.fonts.load('20px "Material Symbols Rounded"')).length > 0), 'Material icon font must load, otherwise glyph names appear as text').toBe(true);
  await listen.click();
  await expect(page.getByLabel('Lexi đang đọc mẫu', { exact: true })).toBeVisible();
  await expect(microphone).toBeEnabled();
  const sentenceUrl = `/api/v1/pronunciation/tts/stream/${encodeURIComponent(sentence)}?language=en`;
  expect(await page.evaluate(() => (window as unknown as { playedAudio: string[] }).playedAudio)).toEqual(expect.arrayContaining([expect.stringContaining(sentenceUrl)]));
  await microphone.click();
  await expect.poll(() => pronunciationAttempts.length).toBe(1);
  expect(pronunciationAttempts[0]).toMatchObject({ target_text: sentence, spoken_text: sentence, flashcard_qr_id: 'mom', section_id: 'words' });
  await expect(page.getByLabel('Lexi khen bé', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await microphone.scrollIntoViewIfNeeded();
  const lexiBox = await page.getByLabel('Lexi khen bé', { exact: true }).boundingBox();
  const micBox = await microphone.boundingBox();
  const next = page.getByRole('button', { name: /^Tiếp tục$/ });
  const nextBox = await next.boundingBox();
  for (const actionBox of [micBox, nextBox]) {
    expect(lexiBox && actionBox).toBeTruthy();
    if (lexiBox && actionBox) expect(lexiBox.x < actionBox.x + actionBox.width && lexiBox.x + lexiBox.width > actionBox.x && lexiBox.y < actionBox.y + actionBox.height && lexiBox.y + lexiBox.height > actionBox.y).toBe(false);
  }
  await page.screenshot({ path: `${artifactPrefix}-pronunciation.png`, fullPage: false });

  for (let index = 1; index < lesson.vocabulary.length; index++) await next.click();
  await page.getByRole('button', { name: /Hoàn thành từ mới/ }).click();
  await page.locator('footer').getByRole('button', { name: /^Tiếp tục$/ }).click();
  await page.locator('footer').getByRole('button', { name: /^Tiếp tục$/ }).click();
  await page.getByRole('button', { name: /Tiếp tục sang Trò chơi nhỏ/ }).click();
  await page.locator('footer').getByRole('button', { name: /^Tiếp tục$/ }).click();
  const playedBeforeQuiz = await page.evaluate(() => (window as unknown as { playedAudio: string[] }).playedAudio.length);
  await page.getByRole('button', { name: 'Nghe câu hỏi', exact: true }).click();
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { playedAudio: string[] }).playedAudio)).slice(playedBeforeQuiz).some((url) => url.includes(lesson.vocabulary[0].audio.path))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `${artifactPrefix}-quiz.png`, fullPage: false });
});
