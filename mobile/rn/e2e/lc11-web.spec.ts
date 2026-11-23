import { test, expect, type Page, type TestInfo } from '@playwright/test';

const email = process.env.LC11_WEB_EMAIL;
const password = process.env.LC11_WEB_PASSWORD;

type NetworkEvidence = { category: string; status: number; host: string; path: string };
type RequestFailureEvidence = { host: string; path: string; error: string };

function observeRuntime(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const network: NetworkEvidence[] = [];
  const requestFailures: RequestFailureEvidence[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = response.url();
    let parsed: URL;
    try { parsed = new URL(url); } catch { return; }
    const path = parsed.pathname.toLowerCase();
    let category: string | null = null;
    if (path.includes('/api/v1/auth/')) category = 'auth-api';
    else if (path.includes('/api/v1/courses')) category = 'course-api';
    else if (path.includes('/activities/') && path.includes('/vocabulary')) category = 'vocabulary-api';
    else if (path.includes('/activities/') && path.includes('/mini-game')) category = 'memory-match-api';
    else if (path.includes('/activities/') && path.includes('/quiz')) category = 'quiz-api';
    else if (/\.(png|jpg|jpeg|svg|webp)$/i.test(path)) category = 'image';
    else if (/\.(wav|mp3|m4a|ogg)$/i.test(path)) category = 'audio';
    if (category) network.push({ category, status: response.status(), host: parsed.host, path });
  });

  page.on('requestfailed', (request) => {
    try {
      const parsed = new URL(request.url());
      if (parsed.pathname.toLowerCase().includes('/api/v1/auth/')) {
        requestFailures.push({ host: parsed.host, path: parsed.pathname, error: request.failure()?.errorText ?? 'unknown' });
      }
    } catch {
      // Ignore non-URL browser-internal requests.
    }
  });

  return { consoleErrors, pageErrors, network, requestFailures };
}

async function attachEvidence(testInfo: TestInfo, evidence: ReturnType<typeof observeRuntime>) {
  await testInfo.attach('lc11-web-runtime-evidence.json', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
}

async function signIn(page: Page, evidence?: ReturnType<typeof observeRuntime>) {
  test.skip(!email || !password, 'Set LC11_WEB_EMAIL and LC11_WEB_PASSWORD to use the approved learner test account.');
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Password');
  const clearCredentialsFromForm = async () => {
    if (await emailInput.isVisible().catch(() => false)) await emailInput.fill('');
    if (await passwordInput.isVisible().catch(() => false)) await passwordInput.fill('');
  };

  await emailInput.fill(email!);
  await passwordInput.fill(password!);
  const loginResponse = page.waitForResponse((response) => {
    const request = response.request();
    return request.method() === 'POST' && new URL(response.url()).pathname.endsWith('/api/v1/auth/login');
  }, { timeout: 20_000 });
  // ClayButton is exposed as text (not a browser button) by Expo Web. The
  // final exact text node is the primary CTA; the first is the mode switch.
  await page.getByText('Sign In', { exact: true }).last().click();
  let response;
  try {
    response = await loginResponse;
  } catch {
    await clearCredentialsFromForm();
    const failures = evidence?.requestFailures ?? [];
    throw new Error(`Normal AuthScreen login did not receive a backend response within 20 seconds. Auth request failures: ${JSON.stringify(failures)}`);
  }
  if (!response.ok()) {
    await clearCredentialsFromForm();
    throw new Error(`Normal AuthScreen login returned HTTP ${response.status()}.`);
  }
  await expect(page.getByText(/Khóa học hôm nay|Các khóa học/)).toBeVisible({ timeout: 60_000 });
}

async function assertLoadedImage(image: ReturnType<Page['locator']>) {
  await expect(image).toHaveCount(1);
  await expect.poll(async () => image.evaluate((node) => ({
    width: (node as HTMLImageElement).naturalWidth,
    height: (node as HTMLImageElement).naturalHeight,
  }))).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
  const dimensions = await image.evaluate((node) => ({
    width: (node as HTMLImageElement).naturalWidth,
    height: (node as HTMLImageElement).naturalHeight,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
}

test('Expo Web learner shell boots without native-only errors', async ({ page }, testInfo) => {
  const evidence = observeRuntime(page);
  await page.goto('/');
  await expect(page).toHaveTitle('Auth');
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('auth-web.png'), fullPage: true });
  expect(evidence.pageErrors).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
  await attachEvidence(testInfo, evidence);
});

test('LC11 normal AuthScreen reaches the learner application with the approved test account', async ({ page }, testInfo) => {
  const evidence = observeRuntime(page);
  try {
    await page.goto('/');
    await signIn(page, evidence);
  } finally {
    await attachEvidence(testInfo, evidence);
  }
});

test('LC11 Cat production-backed vertical slice reaches CompletionShell', async ({ page }, testInfo) => {
  const evidence = observeRuntime(page);
  await page.goto('/');
  await signIn(page, evidence);

  await expect(page.getByText('Animals Adventure', { exact: true })).toBeVisible();
  const courseCover = page.locator('img').first();
  await assertLoadedImage(courseCover);
  await page.screenshot({ path: testInfo.outputPath('course.png'), fullPage: true });

  await page.getByText('Animals Adventure', { exact: true }).first().click();
  await expect(page.getByText('Animals Adventure', { exact: true })).toBeVisible();
  for (const lesson of ['Cat', 'Dog', 'Bird', 'Fish', 'Rabbit']) {
    await expect(page.getByText(new RegExp(lesson, 'i')).first()).toBeVisible();
  }

  await page.getByText(/learn[- ]the[- ]cat|cat/i).last().click();
  await expect(page.getByText(/Từ 1 \/|Từ 1/)).toBeVisible({ timeout: 60_000 });
  const vocabularyImage = page.locator('img').filter({ visible: true }).last();
  await assertLoadedImage(vocabularyImage);
  await page.screenshot({ path: testInfo.outputPath('learn-vocabulary.png'), fullPage: true });

  await page.getByRole('button', { name: 'Nghe phát âm' }).click();
  await page.waitForTimeout(1_000);
  expect(evidence.network.some((item) => item.category === 'audio' && item.status >= 200 && item.status < 300)).toBeTruthy();

  while (await page.getByRole('button', { name: 'Từ tiếp theo' }).count()) {
    await page.getByRole('button', { name: 'Từ tiếp theo' }).click();
  }
  await page.getByRole('button', { name: 'Hoàn thành từ vựng' }).click();
  await expect(page.getByText('Ghép các thẻ giống nhau')).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: testInfo.outputPath('memory-match.png'), fullPage: true });

  // Solve the small production board through visible UI state only.
  for (let guard = 0; guard < 100 && !(await page.getByText(/Câu 1 \/|ĐÚNG HAY SAI|CHỌN ĐÁP ÁN/).count()); guard += 1) {
    const hiddenCards = page.getByRole('button').filter({ hasText: '?' });
    const count = await hiddenCards.count();
    if (count < 2) break;
    const first = hiddenCards.nth(0);
    for (let index = 1; index < count; index += 1) {
      await first.click();
      await hiddenCards.nth(index).click();
      await page.waitForTimeout(600);
      if (await page.getByText(/Câu 1 \/|ĐÚNG HAY SAI|CHỌN ĐÁP ÁN/).count()) break;
      if (await page.getByRole('button').filter({ hasText: '?' }).count() < count) break;
    }
  }
  await expect(page.getByText(/Câu 1 \/|ĐÚNG HAY SAI|CHỌN ĐÁP ÁN/)).toBeVisible({ timeout: 30_000 });

  await page.screenshot({ path: testInfo.outputPath('quiz.png'), fullPage: true });
  for (let guard = 0; guard < 40 && !(await page.getByText(/Hoàn thành bài học|Hoàn thành|Chúc mừng/).count()); guard += 1) {
    const optionCards = page.locator('button').filter({ hasText: /.+/ });
    const optionCount = await optionCards.count();
    if (!optionCount) break;
    await optionCards.nth(Math.max(0, optionCount - 1)).click();
    const submit = page.getByRole('button', { name: /Kiểm tra đáp án|Câu tiếp theo|Hoàn thành bài kiểm tra/ });
    if (await submit.count()) await submit.last().click();
    await page.waitForTimeout(300);
  }
  await expect(page.getByText(/Hoàn thành bài học|Chúc mừng|Tiếp tục học/)).toBeVisible({ timeout: 30_000 });
  expect(evidence.pageErrors).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
  await attachEvidence(testInfo, evidence);
});

test('LC11 all-five first vocabulary activities render canonical assets', async ({ page }, testInfo) => {
  const evidence = observeRuntime(page);
  await page.goto('/');
  await signIn(page, evidence);
  await page.getByText('Animals Adventure', { exact: true }).first().click();
  for (const lesson of ['Cat', 'Dog', 'Bird', 'Fish', 'Rabbit']) {
    await page.getByText(new RegExp(lesson, 'i')).last().click();
    await expect(page.getByText(/Từ 1 \/|Từ 1/)).toBeVisible({ timeout: 60_000 });
    await assertLoadedImage(page.locator('img').filter({ visible: true }).last());
    await page.goBack();
    await expect(page.getByText('Animals Adventure', { exact: true })).toBeVisible();
  }
  expect(evidence.pageErrors).toEqual([]);
  expect(evidence.consoleErrors).toEqual([]);
  await attachEvidence(testInfo, evidence);
});
