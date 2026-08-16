import { test, expect, type Page } from '@playwright/test';

const ANIMALS = ['Cat', 'Dog', 'Bird', 'Fish', 'Rabbit'] as const;

async function openGuestPage(page: Page, path: string) {
  await page.addInitScript(() => {
    localStorage.setItem('guestMode', 'true');
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('Animals Course overview', () => {
  test('shows the Animals Adventure title', async ({ page }) => {
    await openGuestPage(page, '/courses/animals');

    await expect(page.getByRole('heading', { name: /Animals Adventure/i }).first()).toBeVisible();
  });

  test('renders all five animal lesson cards', async ({ page }) => {
    await openGuestPage(page, '/courses/animals');

    const cards = page.locator('.animals-course__lesson-card');
    await expect(cards).toHaveCount(5);
    for (const animal of ANIMALS) {
      await expect(cards.filter({ hasText: new RegExp(animal, 'i') }).first()).toBeVisible();
    }
  });

  test('shows progress and XP tracking', async ({ page }) => {
    await openGuestPage(page, '/courses/animals');

    await expect(page.locator('.animals-course__progress-bar').first()).toBeVisible();
    await expect(page.locator('.animals-course__stat-value').first()).toBeVisible();
    await expect(page.locator('.animals-course__badge-text').first()).toContainText(/XP/i);
  });

  test('shows a mascot image for every lesson card', async ({ page }) => {
    await openGuestPage(page, '/courses/animals');

    const images = page.locator('.animals-course__lesson-image');
    await expect(images).toHaveCount(5);
    await expect(images.first()).toHaveAttribute('src', /\/assets\/animals\/mascots\/.+\.svg/);
  });

  test('lesson cards navigate to the lesson player', async ({ page }) => {
    await openGuestPage(page, '/courses/animals');
    await page.locator('.animals-course__lesson-card').first().click();
    await expect(page).toHaveURL(/\/courses\/animals\/lessons\/learn-the-(cat|dog|bird|fish|rabbit)/);
  });
});
