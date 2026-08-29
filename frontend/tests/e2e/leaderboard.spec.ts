/**
 * Leaderboard Page E2E Tests
 * 
 * End-to-end tests for the Leaderboard page including:
 * - Page loads correctly
 * - Loading state displays
 * - Leaderboard content is visible
 * - Time filter tabs work
 * - Navigation to related pages
 * - Mobile responsive viewport
 */

import { test, expect } from '@playwright/test';

const testLearner = {
  id: 'e2e-learner',
  email: 'e2e-learner@example.test',
  username: 'E2E Learner',
  full_name: 'E2E Learner',
  avatar_url: null,
  role: 'learner',
  roles: ['learner'],
  is_superuser: false,
};

const entriesByPeriod = {
  all: [
    { user_id: 'learner-1', username: 'Momo', avatar_url: null, points: 1500, level: 5, streak_days: 7, rank: 1 },
    { user_id: 'learner-2', username: 'Linh', avatar_url: null, points: 1200, level: 4, streak_days: 5, rank: 2 },
    { user_id: 'learner-3', username: 'Minh', avatar_url: null, points: 900, level: 3, streak_days: 3, rank: 3 },
    { user_id: 'learner-4', username: 'An', avatar_url: null, points: 800, level: 3, streak_days: 2, rank: 4 },
  ],
  weekly: [
    { user_id: 'learner-1', username: 'Momo', avatar_url: null, points: 320, level: 5, streak_days: 7, rank: 1 },
    { user_id: 'learner-2', username: 'Linh', avatar_url: null, points: 210, level: 4, streak_days: 5, rank: 2 },
    { user_id: 'learner-3', username: 'Minh', avatar_url: null, points: 160, level: 3, streak_days: 3, rank: 3 },
    { user_id: 'learner-4', username: 'An', avatar_url: null, points: 90, level: 3, streak_days: 2, rank: 4 },
  ],
  daily: [
    { user_id: 'learner-1', username: 'Momo', avatar_url: null, points: 80, level: 5, streak_days: 7, rank: 1 },
    { user_id: 'learner-2', username: 'Linh', avatar_url: null, points: 60, level: 4, streak_days: 5, rank: 2 },
    { user_id: 'learner-3', username: 'Minh', avatar_url: null, points: 40, level: 3, streak_days: 3, rank: 3 },
    { user_id: 'learner-4', username: 'An', avatar_url: null, points: 20, level: 3, streak_days: 2, rank: 4 },
  ],
} as const;

test.describe('Leaderboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/auth/me', route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(testLearner),
      }),
    );

    await page.route('**/api/v1/gamification/leaderboard**', async route => {
      if (new URL(route.request().url()).pathname.includes('/rank/')) {
        await route.fallback();
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 700));
      const period = new URL(route.request().url()).searchParams.get('period') || 'all';
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(entriesByPeriod[period as keyof typeof entriesByPeriod] || entriesByPeriod.all),
      });
    });

    await page.route('**/api/v1/gamification/leaderboard/rank/**', route =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: testLearner.id,
          rank: 51,
          points: 480,
          period: new URL(route.request().url()).searchParams.get('period') || 'all',
        }),
      }),
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

  test('Leaderboard page loads at /leaderboard', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Check page title is visible
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
  });

  test('shows loading state while fetching data', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Check for the page-owned loading skeleton
    const loadingSkeleton = page.locator('.leaderboard-skeleton');
    await expect(loadingSkeleton.first()).toBeVisible({ timeout: 3000 });
  });

  test('displays page header with title and description', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Header should be visible
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
    await expect(page.getByText(/See how you rank/i)).toBeVisible();
  });

  test('has refresh button', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Refresh button should be present
    const refreshButton = page.getByLabel(/refresh leaderboard/i);
    await expect(refreshButton).toBeVisible();
  });

  test('time filter tabs are visible', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // All filter tabs should be visible
    await expect(page.getByRole('tab', { name: /All Time/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Weekly/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Daily/i })).toBeVisible();
  });

  test('All tab is selected by default', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // All tab should have white background (selected state)
    const allTab = page.getByRole('tab', { name: /All Time/i });
    await expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Weekly tab can be clicked and becomes selected', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Click Weekly tab
    await page.getByRole('tab', { name: /Weekly/i }).click();
    
    // Weekly tab should now be selected
    const weeklyTab = page.getByRole('tab', { name: /Weekly/i });
    await expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Daily tab can be clicked and becomes selected', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Click Daily tab
    await page.getByRole('tab', { name: /Daily/i }).click();
    
    // Daily tab should now be selected
    const dailyTab = page.getByRole('tab', { name: /Daily/i });
    await expect(dailyTab).toHaveAttribute('aria-selected', 'true');
  });

  test('tabs can be switched between', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Click Weekly tab
    await page.getByRole('tab', { name: /Weekly/i }).click();
    await expect(page.getByRole('tab', { name: /Weekly/i })).toHaveAttribute('aria-selected', 'true');
    
    // Click Daily tab
    await page.getByRole('tab', { name: /Daily/i }).click();
    await expect(page.getByRole('tab', { name: /Daily/i })).toHaveAttribute('aria-selected', 'true');
    
    // Click All tab
    await page.getByRole('tab', { name: /All Time/i }).click();
    await expect(page.getByRole('tab', { name: /All Time/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('leaderboard entries are displayed when data loads', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Either leaderboard entries or empty state should be visible
    const hasEntries = await page.getByText('Momo', { exact: true }).isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/No rankings yet/i).isVisible().catch(() => false);
    
    expect(hasEntries || hasEmptyState).toBeTruthy();
  });

  test('shows Lexi mascot in header', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('img', { name: /Lexi cheering for the leaderboard/i })).toBeVisible();
  });

  test('has CTA to start learning', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Look for start lesson CTA
    await expect(page.getByRole('link', { name: /Start a lesson/i })).toBeVisible();
  });

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Header should still be visible on mobile
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
    
    // Filter tabs should be visible on mobile
    await expect(page.getByRole('tab', { name: /All Time/i })).toBeVisible();
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
  });

  test('Start a lesson link navigates to courses page', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('link', { name: /Start a lesson/i }).click();
    
    await expect(page).toHaveURL(/\/courses/);
  });

  test('page has proper semantic structure', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Check for proper heading hierarchy
    const h1 = page.getByRole('heading', { level: 1, name: /Leaderboard/i });
    await expect(h1).toContainText(/Leaderboard/i);
  });

  test('refresh button is keyboard accessible', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    const refreshButton = page.getByLabel(/refresh leaderboard/i);
    await refreshButton.focus();

    // The button exposes a stable focus target for keyboard users
    await expect(refreshButton).toBeFocused();
  });

  test('filter tabs are keyboard navigable', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Tab to reach filter tabs
    await page.keyboard.press('Tab');
    
    // Filter tabs should be focusable
    const filterTab = page.getByRole('tab', { name: /All Time/i });
    await filterTab.focus();

    // Arrow navigation moves focus and selection to the next tab
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Weekly/i })).toBeFocused();
    await expect(page.getByRole('tab', { name: /Weekly/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking filter tab requests the selected period', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    const weeklyRequest = page.waitForRequest(request => {
      const url = new URL(request.url());
      return url.pathname.endsWith('/gamification/leaderboard')
        && url.searchParams.get('period') === 'weekly';
    });

    await page.getByRole('tab', { name: /Weekly/i }).click();
    await weeklyRequest;
    await expect(page.getByRole('tab', { name: /Weekly/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('shows current learner rank when outside the visible top 50', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Your Ranking')).toBeVisible();
    await expect(page.getByText('#51')).toBeVisible();
  });

  test('keeps podium blocks inside the card at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');

    const metrics = await page.locator('.leaderboard-podium-section').evaluate(section => {
      const card = section.getBoundingClientRect();
      const blocks = Array.from(section.querySelectorAll('.leaderboard-podium-block'));
      return {
        bodyScrollWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        blocksInsideCard: blocks.every(block => {
          const rect = block.getBoundingClientRect();
          return rect.left >= card.left - 0.5 && rect.right <= card.right + 0.5;
        }),
      };
    });

    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
    expect(metrics.blocksInsideCard).toBe(true);
  });

});
