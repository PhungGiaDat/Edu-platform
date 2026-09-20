import { test, expect, type Page } from '@playwright/test';

async function openLessonPage(page: Page, courseId: string, lessonId: string) {
  await page.addInitScript(() => {
    localStorage.setItem('guestMode', 'true');
    localStorage.setItem('edu-platform-locale', 'vi');
    localStorage.removeItem('eduar_access_token');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/courses/${courseId}/lessons/${lessonId}`);
  await page.waitForLoadState('domcontentloaded');
}

test.describe('Mobile 390x844 Hero Lesson Player Responsive Flow', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('verifies mobile 390x844 layout invariants and full 9-step flow for meet-the-elephant', async ({ page }) => {
    // 1. Open lesson page
    await openLessonPage(page, 'momo-nature-english-5-7', 'meet-the-elephant');

    // Wait for lesson shell to load
    await expect(page.locator('header')).toBeVisible({ timeout: 15000 });

    // Invariant check: No horizontal overflow
    const hasNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(hasNoOverflow).toBe(true);

    // ==========================================
    // STEP 1: Warm-up
    // ==========================================
    const startBtn = page.getByRole('button', { name: /Bắt đầu học ngay/i });
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // ==========================================
    // STEP 2: Video
    // ==========================================
    await expect(page.getByText(/Xem và khám phá/i)).toBeVisible({ timeout: 10000 });

    // Poster-first check: Verify "▶ Xem video" button is visible before iframe mounts
    const playGestureBtn = page.getByRole('button', { name: /Xem video/i });
    await expect(playGestureBtn).toBeVisible();

    // Verify no iframe mounted initially
    const initialIframe = page.locator('iframe');
    await expect(initialIframe).toHaveCount(0);

    // Capture required artifact: video-e2e-390.png
    await page.screenshot({ path: 'test-artifacts/video-e2e-390.png', fullPage: false });

    // Tap "▶ Xem video"
    await playGestureBtn.click();

    // Verify iframe mounts or child-friendly fallback appears
    const mountedIframe = page.locator('iframe');
    const fallbackMessage = page.getByText(/Không thể phát video tại đây|Video bài học chưa sẵn sàng/i);
    await expect(mountedIframe.or(fallbackMessage)).toBeVisible({ timeout: 10000 });

    // Verify continue CTA is present and usable
    const videoContinueBtn = page.getByRole('button', { name: /Con đã xem xong|Tiếp tục/i });
    await expect(videoContinueBtn).toBeVisible();
    await videoContinueBtn.click();

    // ==========================================
    // STEP 3: Vocabulary (Elephant, Big, Trunk)
    // ==========================================
    await expect(page.getByText(/Học từ vựng/i)).toBeVisible({ timeout: 10000 });

    // Target active slide container
    const elephantHeading = page.getByRole('heading', { name: /Elephant/i });
    await expect(elephantHeading).toBeVisible();

    const vocabularyCarousel = page.locator('.overflow-hidden.w-full.rounded-\\[28px\\]');
    const elephantSlide = vocabularyCarousel.locator('div.w-full.shrink-0').filter({
      has: page.getByRole('heading', { name: 'Elephant' }),
    });
    const listenSampleBtn = elephantSlide.getByRole('button', { name: /Nghe mẫu/i });
    await expect(listenSampleBtn).toBeVisible();

    // Capture required artifact: listen-e2e-390.png
    await page.screenshot({ path: 'test-artifacts/listen-e2e-390.png', fullPage: false });

    // Click "Nghe mẫu" and verify state transition or audio invocation
    await listenSampleBtn.click();
    // Allow state or sound dispatch
    await page.waitForTimeout(300);

    const speakBtn = elephantSlide.getByRole('button', { name: /Luyện nói/i });
    await expect(speakBtn).toBeVisible();

    // Capture required artifact: pronunciation-e2e-390.png
    await page.screenshot({ path: 'test-artifacts/pronunciation-e2e-390.png', fullPage: false });

    // Click "Luyện nói" to trigger speech recognition / server fallback flow
    await speakBtn.click();
    // Allow state transition
    await page.waitForTimeout(500);

    // Verify Lexi companion position does not overlap action buttons or bottom CTA
    const lexiBuddy = page.getByRole('button', { name: /Trò chuyện cùng Lexi|Lexi/i }).or(page.locator('[data-testid="ai-chat-buddy"]'));
    if (await lexiBuddy.count() > 0 && await lexiBuddy.isVisible()) {
      const lexiBox = await lexiBuddy.boundingBox();
      const actionBox = await listenSampleBtn.boundingBox();
      if (lexiBox && actionBox) {
        // Assert no collision (Lexi should be lower or higher, or separated horizontally)
        const overlapsVertically = !(lexiBox.y + lexiBox.height <= actionBox.y || lexiBox.y >= actionBox.y + actionBox.height);
        const overlapsHorizontally = !(lexiBox.x + lexiBox.width <= actionBox.x || lexiBox.x >= actionBox.x + actionBox.width);
        expect(overlapsVertically && overlapsHorizontally).toBe(false);
      }
    }

    // Step through vocabulary words: Elephant -> Big -> Trunk -> Complete
    // 1st word: Elephant -> Click "Tiếp tục →"
    const vocabNext1 = page.getByRole('button', { name: /Tiếp tục/i });
    await expect(vocabNext1).toBeVisible();
    await vocabNext1.click();

    // 2nd word: Big -> Click "Tiếp tục →"
    await expect(page.getByRole('heading', { name: /Big/i })).toBeVisible({ timeout: 5000 });
    const vocabNext2 = page.getByRole('button', { name: /Tiếp tục/i });
    await expect(vocabNext2).toBeVisible();
    await vocabNext2.click();

    // 3rd word: Trunk -> Click "Hoàn thành từ mới 🎉"
    await expect(page.getByRole('heading', { name: /Trunk/i })).toBeVisible({ timeout: 5000 });
    const vocabFinish = page.getByRole('button', { name: /Hoàn thành từ mới/i });
    await expect(vocabFinish).toBeVisible();
    await vocabFinish.click();

    // ==========================================
    // STEP 4: Listen & Choose
    // ==========================================
    const listenChooseSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /Lắng nghe & Chọn hình đúng/i }),
    });
    await expect(listenChooseSection).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Không có dữ liệu bài tập nghe/i)).toHaveCount(0);

    for (const [index, word] of ['Elephant', 'Big', 'Trunk'].entries()) {
      const choice = listenChooseSection.getByRole('button', {
        name: new RegExp(`^${word}\\b`, 'i'),
      });
      await expect(choice).toBeVisible();
      await choice.click();

      if (index < 2) {
        const continueBtn = listenChooseSection.getByRole('button', { name: /^Tiếp tục\s*→$/i });
        await expect(continueBtn).toBeVisible();
        await continueBtn.click();
      }
    }
    const listenChooseFooter = page.getByRole('button', { name: /^Tiếp tục\s*→$/i });
    await expect(listenChooseFooter).toBeVisible();
    await listenChooseFooter.click();
    await expect(page.getByText(/Nối từ & Ghép hình/i)).toBeVisible({ timeout: 5000 });

    // ==========================================
    // STEP 5: Match Section
    // ==========================================
    const matchSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /Nối từ & Ghép hình/i }),
    });
    await expect(matchSection).toBeVisible({ timeout: 10000 });

    const wordsZone = matchSection.getByText(/^🔤\s*TỪ VỰNG$/).locator('..');
    const imagesZone = matchSection.getByText(/^🖼️\s*HÌNH ẢNH$/).locator('..');
    for (const word of ['Elephant', 'Big', 'Trunk']) {
      const wordBtn = wordsZone.getByRole('button', { name: new RegExp(`^${word}\\b`, 'i') });
      const visualBtn = imagesZone
        .getByRole('button')
        .filter({ has: page.locator(`img[alt="${word}"]`) });
      await expect(wordBtn).toBeVisible();
      await wordBtn.click();
      await expect(visualBtn).toBeVisible();
      await visualBtn.click();
    }
    const matchFooter = page.getByRole('button', { name: /^Tiếp tục\s*→$/i });
    await expect(matchFooter).toBeVisible();
    await matchFooter.click();
    await expect(page.getByText(/Trải nghiệm Thẻ AR 3D/i)).toBeVisible({ timeout: 5000 });

    // ==========================================
    // STEP 6: AR Flashcard Section
    // ==========================================
    await expect(page.getByText(/Trải nghiệm Thẻ AR 3D/i)).toBeVisible({ timeout: 10000 });
    const arContinueBtn = page.getByRole('button', { name: /Tiếp tục sang Trò chơi nhỏ/i });
    await expect(arContinueBtn).toBeVisible();
    await arContinueBtn.click();

    // ==========================================
    // STEP 7: Mini Game Section
    // ==========================================
    await expect(page.getByText(/Trò chơi rèn luyện trí nhớ/i)).toBeVisible({ timeout: 10000 });

    const miniGameSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /Trò chơi rèn luyện trí nhớ/i }),
    });
    for (const word of ['Elephant', 'Big', 'Trunk']) {
      const choice = miniGameSection.getByRole('button', { name: new RegExp(`^${word}\\b`, 'i') });
      await expect(choice).toBeVisible();
      await choice.click();
      const gameContinueBtn = miniGameSection.getByRole('button', { name: /Tiếp tục|Hoàn thành trò chơi/i });
      await expect(gameContinueBtn).toBeVisible();
      await gameContinueBtn.click();
    }
    const miniGameFooter = page.getByRole('button', { name: /^Tiếp tục\s*→$/i });
    await expect(miniGameFooter).toBeVisible();
    await miniGameFooter.click();
    // ==========================================
    // STEP 8: Quiz Section
    // ==========================================
    const quizSection = page.locator('section').filter({
      has: page.getByText(/Câu \d+ \/ 10/i),
    });
    await expect(quizSection).toBeVisible({ timeout: 10000 });

    for (const [index, label] of [
      'Elephant', 'Trunk', 'Big', 'Elephant', 'Trunk',
      'Con voi', 'Trunk', 'To lớn', 'Elephant', 'Big',
    ].entries()) {
      const quizOption = quizSection.getByRole('button', { name: new RegExp(`^${label}\\b`, 'i') });
      await expect(quizOption).toBeVisible();
      await quizOption.click();
      const quizSubmitBtn = quizSection.getByRole('button', {
        name: index === 9 ? /Nộp bài Quiz/i : /Tiếp tục/i,
      });
      await expect(quizSubmitBtn).toBeVisible();
      await quizSubmitBtn.click();
    }

    // ==========================================
    // STEP 9: Reward Section
    // ==========================================
    await expect(page.getByRole('heading', { name: /Con làm rất tốt!/i })).toBeVisible({ timeout: 15000 });
    const finishRewardBtn = page.getByRole('button', { name: /Lưu tiến độ & Hoàn tất|Về danh sách bài học/i });
    await expect(finishRewardBtn).toBeVisible();

    // Final layout verification at 390px
    const finalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(finalOverflow).toBe(true);
  });
});
