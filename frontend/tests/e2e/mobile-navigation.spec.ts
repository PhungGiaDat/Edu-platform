import { test, expect, type Page } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { width: 375, height: 812 },
  { width: 428, height: 926 },
] as const;
const DESKTOP_VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1536, height: 960 },
] as const;

async function openCoursesAsGuest(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => localStorage.getItem('guestMode') === 'true');
  await page.goto('/courses', { waitUntil: 'networkidle' });
  await page.locator('nav[aria-label="primaryNavigation"]').waitFor({ state: 'attached' });
}

test.describe('Mobile learner navigation', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`raises only the active navigation item at ${viewport.width}px`, async ({ page, context }) => {
      await page.setViewportSize(viewport);
      await context.addInitScript(() => localStorage.setItem('guestMode', 'true'));
      await openCoursesAsGuest(page);

      const navBar = page.locator('.learner-mobile-nav__bar');
      await expect(navBar).toBeVisible();
      await expect.poll(() => navBar.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe('none');
      await expect.poll(() => navBar.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe('3px');
      await expect.poll(() => navBar.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');

      const activeItem = page.locator('nav[aria-label="primaryNavigation"] a[aria-current="page"]');
      await expect(activeItem).toHaveCount(1);
      await expect(activeItem).toHaveAttribute('aria-current', 'page');
      await expect.poll(() => activeItem.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
      await expect.poll(() => activeItem.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');

      const moreButton = page.locator('nav[aria-label="primaryNavigation"] button[aria-controls="mobile-more-sheet"]');
      await expect(moreButton).toBeVisible();
      await expect(moreButton).toHaveAttribute('aria-expanded', 'false');
      await expect.poll(() => moreButton.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
      await expect.poll(() => moreButton.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
      await expect(page.locator('#mobile-more-sheet')).toHaveCount(0);

      await moreButton.click();
      await expect(moreButton).toHaveAttribute('aria-expanded', 'true');
      await expect.poll(() => moreButton.evaluate((element) => getComputedStyle(element).transform)).not.toBe('none');
      await expect(page.locator('#mobile-more-sheet')).toBeVisible();
    });
  }

  for (const viewport of DESKTOP_VIEWPORTS) {
    test(`keeps the mobile navigation hidden at ${viewport.width}px`, async ({ page, context }) => {
      await page.setViewportSize(viewport);
      await context.addInitScript(() => localStorage.setItem('guestMode', 'true'));
      await openCoursesAsGuest(page);

      await expect(page.locator('nav[aria-label="primaryNavigation"]')).toBeHidden();
      await expect(page.locator('aside.learner-sidebar--desktop')).toBeVisible();
    });
  }
});
