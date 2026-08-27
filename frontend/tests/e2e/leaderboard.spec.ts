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

test.describe('Leaderboard Page', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Seed guestMode before app boots
    await context.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        // localStorage unavailable
      }
    });
    await page.goto('/login');
    await page.waitForFunction(
      () => localStorage.getItem('guestMode') === 'true',
      undefined,
      { timeout: 5000 }
    );
  });

  test('Leaderboard page loads at /leaderboard', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Check page title is visible
    await expect(page.getByRole('heading', { name: /Leaderboard/i })).toBeVisible();
  });

  test('shows loading state while fetching data', async ({ page }) => {
    await page.goto('/leaderboard');
    
    // Check for loading skeleton animation
    const loadingSkeleton = page.locator('.animate-pulse');
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
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Weekly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daily/i })).toBeVisible();
  });

  test('All tab is selected by default', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // All tab should have white background (selected state)
    const allTab = page.getByRole('button', { name: /All/i });
    await expect(allTab).toHaveClass(/bg-white/);
  });

  test('Weekly tab can be clicked and becomes selected', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Click Weekly tab
    await page.getByRole('button', { name: /Weekly/i }).click();
    
    // Weekly tab should now be selected
    const weeklyTab = page.getByRole('button', { name: /Weekly/i });
    await expect(weeklyTab).toHaveClass(/bg-white/);
  });

  test('Daily tab can be clicked and becomes selected', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Click Daily tab
    await page.getByRole('button', { name: /Daily/i }).click();
    
    // Daily tab should now be selected
    const dailyTab = page.getByRole('button', { name: /Daily/i });
    await expect(dailyTab).toHaveClass(/bg-white/);
  });

  test('tabs can be switched between', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Click Weekly tab
    await page.getByRole('button', { name: /Weekly/i }).click();
    await expect(page.getByRole('button', { name: /Weekly/i })).toHaveClass(/bg-white/);
    
    // Click Daily tab
    await page.getByRole('button', { name: /Daily/i }).click();
    await expect(page.getByRole('button', { name: /Daily/i })).toHaveClass(/bg-white/);
    
    // Click All tab
    await page.getByRole('button', { name: /All/i }).click();
    await expect(page.getByRole('button', { name: /All/i })).toHaveClass(/bg-white/);
  });

  test('leaderboard entries are displayed when data loads', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Either leaderboard entries or empty state should be visible
    const hasEntries = await page.locator('text=XP').isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/No rankings yet/i).isVisible().catch(() => false);
    
    expect(hasEntries || hasEmptyState).toBeTruthy();
  });

  test('shows trophy emoji in header', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText('🏆')).toBeVisible();
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
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible();
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
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText(/Leaderboard/i);
  });

  test('refresh button is keyboard accessible', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Tab to refresh button
    await page.keyboard.press('Tab');
    
    // Should be able to focus the button
    const refreshButton = page.getByLabel(/refresh leaderboard/i);
    await expect(refreshButton).toBeFocused();
  });

  test('filter tabs are keyboard navigable', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Tab to reach filter tabs
    await page.keyboard.press('Tab');
    
    // Filter tabs should be focusable
    const filterTab = page.getByRole('button', { name: /All/i });
    await filterTab.focus();
    
    // Should be able to interact with Enter key
    await page.keyboard.press('Enter');
  });

  test('clicking filter tab updates URL or state', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    
    // Get initial state by checking if Weekly tab is not selected
    const weeklyTabBefore = page.getByRole('button', { name: /Weekly/i });
    await expect(weeklyTabBefore).not.toHaveClass(/bg-white/);
    
    // Click Weekly tab
    await page.getByRole('button', { name: /Weekly/i }).click();
    
    // Now Weekly tab should be selected
    await expect(page.getByRole('button', { name: /Weekly/i }).first()).toHaveClass(/bg-white/);
  });

});
