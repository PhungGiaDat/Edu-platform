/**
 * Daily Challenge Page E2E Tests
 * 
 * End-to-end tests for the Daily Challenge page including:
 * - Page loads correctly
 * - Loading state displays
 * - Challenge content is visible
 * - Navigation to related pages
 * - Mobile responsive viewport
 */

import { test, expect } from '@playwright/test';

test.describe('Daily Challenge Page', () => {
  
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

  test('Daily Challenge page loads at /daily-challenge', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Check page title is visible
    await expect(page.getByRole('heading', { name: /Daily Challenge/i })).toBeVisible();
  });

  test('shows loading state while fetching data', async ({ page }) => {
    await page.goto('/daily-challenge');
    
    // Check for loading skeleton animation
    const loadingSkeleton = page.locator('.animate-pulse');
    await expect(loadingSkeleton.first()).toBeVisible({ timeout: 3000 });
  });

  test('displays page header with title and description', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Header should be visible
    await expect(page.getByRole('heading', { name: /Daily Challenge/i })).toBeVisible();
    await expect(page.getByText(/Complete the challenge/i)).toBeVisible();
  });

  test('has refresh button', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Refresh button should be present
    const refreshButton = page.getByRole('button', { name: /refresh challenge/i });
    await expect(refreshButton).toBeVisible();
  });

  test('shows navigation links to courses and progress', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Check for navigation links
    await expect(page.getByRole('link', { name: /Go to Courses/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View Progress/i })).toBeVisible();
  });

  test('challenge progress section is visible when data loads', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Look for Your Progress section or challenge card
    const progressSection = page.getByText(/Your Progress/i);
    const challengeCard = page.getByText(/Challenge/i);
    
    // At least one should be visible (depending on API response)
    const isProgressVisible = await progressSection.isVisible().catch(() => false);
    const isChallengeVisible = await challengeCard.isVisible().catch(() => false);
    
    expect(isProgressVisible || isChallengeVisible).toBeTruthy();
  });

  test('reward section displays when challenge exists', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Look for reward section
    const rewardSection = page.getByText(/Reward/i);
    const isRewardVisible = await rewardSection.isVisible().catch(() => false);
    
    // Either reward section or empty state should show
    if (!isRewardVisible) {
      await expect(page.getByText(/No challenge today/i)).toBeVisible();
    }
  });

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Header should still be visible on mobile
    await expect(page.getByRole('heading', { name: /Daily Challenge/i })).toBeVisible();
  });

  test('renders correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByRole('heading', { name: /Daily Challenge/i })).toBeVisible();
  });

  test('Go to Courses link navigates to courses page', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('link', { name: /Go to Courses/i }).click();
    
    await expect(page).toHaveURL(/\/courses/);
  });

  test('View Progress link navigates to progress page', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    await page.getByRole('link', { name: /View Progress/i }).click();
    
    await expect(page).toHaveURL(/\/progress/);
  });

  test('page has proper semantic structure', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Check for proper heading hierarchy
    const h1 = page.locator('h1').first();
    await expect(h1).toContainText(/Daily Challenge/i);
  });

  test('refresh button is keyboard accessible', async ({ page }) => {
    await page.goto('/daily-challenge');
    await page.waitForLoadState('networkidle');
    
    // Tab to refresh button
    await page.keyboard.press('Tab');
    
    // Should be able to focus the button
    const refreshButton = page.getByRole('button', { name: /refresh challenge/i });
    await expect(refreshButton).toBeFocused();
  });

});
