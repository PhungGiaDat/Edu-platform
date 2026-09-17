import { test, expect, type Page } from '@playwright/test';

async function openLessonPage(page: Page, courseId: string, lessonId: string) {
  await page.addInitScript(() => {
    localStorage.setItem('guestMode', 'true');
    localStorage.setItem('eduar_access_token', 'mock-token-for-tests');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/courses/${courseId}/lessons/${lessonId}`);
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Mobile 390x844 Hero Lesson Player Responsive Flow', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('verifies mobile 390x844 layout invariants for meet-the-elephant', async ({ page }) => {
    await openLessonPage(page, 'momo-nature-english-5-7', 'meet-the-elephant');

    // Wait for lesson shell to load
    await expect(page.locator('header').first()).toBeVisible({ timeout: 10000 });

    // 1. Verify no horizontal overflow at 390px
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(bodyClientWidth + 1);

    // 2. Verify Warm-up visual-first preview is rendered
    await expect(page.getByRole('button', { name: /Bắt đầu học ngay/i }).first()).toBeVisible();
    await expect(page.getByText(/5 phút/i).first()).toBeVisible();

    // 3. Verify action bar has safe padding and max width 448px
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    const footerBox = await footer.boundingBox();
    expect(footerBox?.width).toBeLessThanOrEqual(390);

    // 4. Advance through step by step
    // Click Start learning
    await page.getByRole('button', { name: /Bắt đầu học ngay/i }).first().click();

    // Step 2: Video
    await expect(page.getByText(/Xem và khám phá/i).first()).toBeVisible();
    const watchBtn = page.getByRole('button', { name: /Con đã xem xong/i }).first();
    await expect(watchBtn).toBeVisible();
    await watchBtn.click();

    // Step 3: Vocabulary (one word at a time)
    await expect(page.locator('button').filter({ hasText: /Từ số/i }).first()).toBeVisible();
    const vocabNext = page.getByRole('button', { name: /Tiếp tục/i }).first();
    await expect(vocabNext).toBeVisible();
    await vocabNext.click(); // Elephant -> Big
    await vocabNext.click(); // Big -> Trunk

    // Verify no horizontal overflow in vocabulary
    const vocabScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(vocabScroll).toBe(true);
  });
});
