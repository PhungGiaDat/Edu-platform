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

const testLearner = {
  id: 'e2e-learner',
  email: 'e2e-learner@example.test',
  username: 'E2E Learner',
  role: 'learner',
  roles: ['learner'],
  is_superuser: false,
};

test.describe('Session Break Reminder', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/me', route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(testLearner),
      }),
    );
    await page.route('**/api/v1/session-lock/end', route =>
      route.fulfill({ status: 204 }),
    );
    await page.addInitScript(user => {
      const payload = btoa(JSON.stringify({
        sub: user.id,
        email: user.email,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      }));
      localStorage.removeItem('guestMode');
      localStorage.setItem('authToken', `e2e.${payload}.signature`);
      localStorage.setItem('authUser', JSON.stringify(user));
    }, testLearner);
  });

  test('timer badge shows elapsed time in sidebar', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('edu_session_state_v1') === null) {
        localStorage.setItem('edu_session_state_v1', JSON.stringify({
          version: 1,
          phase: 'active',
          elapsedSeconds: 5 * 60,
          runningSince: null,
        }));
      }
    });

    await page.goto('/courses/animals', { waitUntil: 'load' });
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // The desktop sidebar is hidden in the iPhone layout, but its timer state remains mounted.
    const badge = page.locator('[title*="remaining"]');
    await expect(badge).toBeAttached({ timeout: 10000 });
    await expect(badge).toHaveAttribute('title', /\d{2}:\d{2} remaining/);
    await expect(badge).toHaveText(/\d{2}:\d{2}/);
  });

  test('tab hidden pauses the clock', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('edu_session_state_v1') === null) {
        localStorage.setItem('edu_session_state_v1', JSON.stringify({
          version: 1,
          phase: 'active',
          elapsedSeconds: 10 * 60,
          runningSince: null,
        }));
      }
    });

    await page.goto('/courses/animals', { waitUntil: 'load' });
    await page.waitForSelector('body', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // The timer state is mounted even though the desktop sidebar is hidden on iPhone.
    const badge = page.locator('[title*="remaining"]');
    await expect(badge).toBeAttached({ timeout: 10000 });
    await expect(badge).toHaveAttribute('title', /\d{2}:\d{2} remaining/);

    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const pausedBadge = page.locator('[title*="paused" i]');
    await expect(pausedBadge).toBeAttached({ timeout: 5000 });
    await expect(pausedBadge).toHaveAttribute('title', /session paused/i);
    await expect(pausedBadge).toContainText('Paused');
  });

  test('lets a child leave the persisted limit overlay and shows cooldown only on learning routes', async ({ page }) => {
    await page.addInitScript(() => {
      if (localStorage.getItem('edu_session_state_v1') === null) {
        localStorage.setItem('edu_session_state_v1', JSON.stringify({
          version: 1,
          phase: 'limit_reached',
        }));
      }
    });

    await page.goto('/courses/animals');
    await expect(page.getByText('Time for a Break!')).toBeVisible();
    await expect(page.getByRole('button', { name: /10 more minutes/i })).toHaveCount(0);
    await page.getByRole('button', { name: /take a break/i }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('Time for a Break!')).toHaveCount(0);
    const onBreakState = await page.evaluate(() => {
      const raw = localStorage.getItem('edu_session_state_v1');
      return raw === null ? null : JSON.parse(raw);
    });
    expect(onBreakState).toMatchObject({ version: 1, phase: 'on_break' });
    expect(onBreakState?.breakUntil).toBeGreaterThan(Date.now());
    await page.reload();
    await expect(page.getByText('Time for a Break!')).toHaveCount(0);
    const reloadedState = await page.evaluate(() => {
      const raw = localStorage.getItem('edu_session_state_v1');
      return raw === null ? null : JSON.parse(raw);
    });
    expect(reloadedState).toMatchObject({ version: 1, phase: 'on_break' });
    expect(reloadedState?.breakUntil).toBeGreaterThan(Date.now());
    await page.goto('/courses/animals');
    await expect(page.getByText('Break time in progress')).toBeVisible();
  });
});
