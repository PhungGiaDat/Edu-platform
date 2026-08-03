import { test, expect, type Page } from '@playwright/test';

const ANIMALS = [
  { name: 'Cat', id: 'learn-the-cat' },
  { name: 'Dog', id: 'learn-the-dog' },
  { name: 'Bird', id: 'learn-the-bird' },
  { name: 'Fish', id: 'learn-the-fish' },
  { name: 'Rabbit', id: 'learn-the-rabbit' },
] as const;

async function openGuestPage(page: Page, path: string) {
  await page.addInitScript(() => {
    localStorage.setItem('guestMode', 'true');
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

async function openLesson(page: Page, lessonId: string) {
  await openGuestPage(page, `/courses/animals/lessons/${lessonId}`);
  await expect(page.locator('.animals-lesson-player').first()).toBeVisible();
}

test.describe('Animals lesson player', () => {
  for (const animal of ANIMALS) {
    test(`${animal.name} lesson starts with the warm-up section`, async ({ page }) => {
      await openLesson(page, animal.id);

      await expect(page.getByRole('heading', { name: /Welcome!/i }).first()).toBeVisible();
      await expect(page.getByText(/Let's learn about animals/i).first()).toBeVisible();
      await expect(page.locator('.lesson-section--warmup img').first()).toHaveAttribute(
        'src',
        new RegExp(`/assets/animals/mascots/${animal.name.toLowerCase()}\\.svg`),
      );
    });
  }

  test('tapping a vocabulary card marks its word complete', async ({ page }) => {
    await openLesson(page, 'learn-the-cat');
    await page.locator('.animals-lesson-player__nav-item').filter({ hasText: /Words/i }).first().click();

    const card = page.locator('.vocabulary-card').first();
    await expect(card).toBeVisible();
    await expect(card.getByRole('heading').first()).toContainText(/cat/i);
    await expect(card.locator('.vocabulary-card__translation').first()).toBeVisible();

    await card.click();
    await expect(card.locator('.vocabulary-card__inner')).toHaveClass(/completed/);
  });

  test('advancing from warm-up updates the section stepper and progress', async ({ page }) => {
    await openLesson(page, 'learn-the-cat');

    await expect(page.locator('.progress-bar__percentage-value').first()).toHaveText('0%');
    await page.locator('.lesson-section--warmup .lesson-section__cta').first().click();
    await expect(page.locator('.animals-lesson-player__nav-item--active').first()).toContainText(/Words/i);
    await expect(page.locator('.progress-bar__percentage-value').first()).toHaveText('14%');
  });

  test('Cat quiz accepts an answer selection', async ({ page }) => {
    await openLesson(page, 'learn-the-cat');
    await page.locator('.animals-lesson-player__nav-item').filter({ hasText: /Quiz/i }).first().click();

    await expect(page.getByRole('heading', { name: /Quick Quiz/i }).first()).toBeVisible();
    const firstOption = page.locator('.quiz-question__option').first();
    await firstOption.click();
    await expect(firstOption).toHaveClass(/selected/);
    await expect(page.locator('.quiz-question__option-label').first()).toBeVisible();
  });

  test('shows the reward section after completing every section', async ({ page }) => {
    await openLesson(page, 'learn-the-cat');

    const sectionNav = page.locator('.animals-lesson-player__nav-item');
    const sectionCta = page.locator('.lesson-section__cta--primary').first();

    await sectionNav.nth(0).click();
    await sectionCta.click();

    await sectionNav.nth(1).click();
    await expect(page.locator('.lesson-section--vocabulary').first()).toBeVisible();
    await page.locator('.vocabulary-card').first().click({ force: true });
    await page.locator('.lesson-section__cta--primary').first().click();

    await sectionNav.nth(2).click();
    await expect(page.locator('.lesson-section--listen').first()).toBeVisible();
    await page.locator('.lesson-section__listen-btn').first().click({ force: true });
    await page.locator('.lesson-section__cta--primary').first().click();

    await sectionNav.nth(3).click();
    await page.locator('.lesson-section__cta--primary').first().click();

    await sectionNav.nth(4).click();
    await page.locator('.lesson-section__cta--primary').first().click();

    await sectionNav.nth(5).click();
    await expect(page.locator('.lesson-section--quiz').first()).toBeVisible();
    await page.locator('.quiz-question__option').first().click({ force: true });
    await page.locator('.lesson-section__cta--primary').first().click();

    await expect(page.getByRole('heading', { name: /Amazing!/i }).first()).toBeVisible();
    await expect(page.getByText(/You finished the lesson/i).first()).toBeVisible();
  });
});
