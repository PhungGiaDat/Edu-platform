// frontend-web/tests/e2e/session-break.spec.ts
/**
 * Playwright E2E tests for the session break reminder feature.
 * Covers the persisted child-safe break flow on desktop and Mobile Safari.
 *
 * Uses guest mode for fast, reliable test execution without requiring auth.
 * Uses /courses/animals page which has Layout with sidebar and GlobalSessionWatcher.
 *
 */

import { test, expect } from '@playwright/test';

test.describe('Session Break Reminder', () => {
  test.beforeEach(async ({ page }) => {
    // Enable guest mode so we can test without real auth
    await page.addInitScript(() => {
      localStorage.setItem('guestMode', 'true');
      localStorage.removeItem('edu_session_started_at');
      localStorage.removeItem('edu_session_paused_seconds');
      localStorage.removeItem('edu_session_state_v1');
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up session storage after each test
    await page.evaluate(() => {
      localStorage.removeItem('edu_session_started_at');
      localStorage.removeItem('edu_session_paused_seconds');
      localStorage.removeItem('edu_session_state_v1');
    });
  });

  test('timer badge shows elapsed time in sidebar', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edu_session_state_v1', JSON.stringify({
        version: 1,
        phase: 'active',
        elapsedSeconds: 5 * 60,
        runningSince: null,
      }));
    });

    await page.goto('/courses/animals', { waitUntil: 'load' });
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Badge should be visible with time showing
    const badge = page.locator('[title*="remaining"]');
    await expect(badge).toBeVisible({ timeout: 10000 });
    const text = await badge.textContent();
    // Should show approximately 25 minutes (30 - 5) remaining
    expect(text).toMatch(/\d{2}:\d{2}/); // Match format like "25:00"
  });

  test('tab hidden pauses the clock', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('edu_session_state_v1', JSON.stringify({
        version: 1,
        phase: 'active',
        elapsedSeconds: 10 * 60,
        runningSince: null,
      }));
    });

    await page.goto('/courses/animals', { waitUntil: 'load' });
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Badge shows normal time
    const badge = page.locator('[title*="remaining"]');
    await expect(badge).toBeVisible({ timeout: 10000 });

    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Badge should show Paused
    await expect(page.locator('[title*="paused" i]')).toBeVisible({ timeout: 5000 });
  });

  test('lets a child leave the persisted limit overlay and shows cooldown only on learning routes', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('guestMode', 'true');
      localStorage.setItem('edu_session_state_v1', JSON.stringify({
        version: 1,
        phase: 'limit_reached',
      }));
    });

    await page.goto('/courses/animals');
    await expect(page.getByText('Time for a Break!')).toBeVisible();
    await expect(page.getByRole('button', { name: /10 more minutes/i })).toHaveCount(0);
    await page.getByRole('button', { name: /take a break/i }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('Time for a Break!')).toHaveCount(0);
    await page.reload();
    await expect(page.getByText('Time for a Break!')).toHaveCount(0);
    await page.goto('/courses/animals');
    await expect(page.getByText('Break time in progress')).toBeVisible();
  });
});
