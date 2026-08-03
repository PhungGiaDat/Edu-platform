/**
 * Animals Course E2E Tests
 * 
 * Tests for the Animals Adventure course functionality including:
 * - Course listing visibility
 * - Course detail page with lessons
 * - Lesson navigation
 * - Lesson content display
 * - Mobile responsive viewport
 */

import { test, expect } from '@playwright/test';

const COURSE_ID = 'animals-adventure';
const ANIMALS = ['Cat', 'Dog', 'Bird', 'Fish', 'Rabbit'] as const;

test.describe('Animals Adventure Course', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Seed guestMode on the origin BEFORE the app boots so AuthContext
    // picks it up during its initial loadAuthFromStorage() call. Using
    // addInitScript alone is racy here because RequireLearnerAccess renders
    // its <Navigate to="/login"/> on the first render if the auth effect
    // hasn't yet observed the value.
    await context.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        // localStorage unavailable — fail fast in the test, not silently
      }
    });
    // Pre-warm the app so AuthContext runs its initial load and `isGuest`
    // becomes true before the actual test navigates to a protected route.
    await page.goto('/login');
    await page.waitForFunction(
      () => localStorage.getItem('guestMode') === 'true',
      undefined,
      { timeout: 5000 }
    );
  });

  test('Animals Adventure detail page is accessible at /courses/animals-adventure', async ({ page }) => {
    await page.goto('/courses/animals-adventure');
    await page.waitForLoadState('networkidle');
    
    // Check for Animals Adventure course title/heading
    await expect(page.getByText(/Animals Adventure/i).first()).toBeVisible();
  });

  test('Animals Adventure detail shows 5 lessons', async ({ page }) => {
    await page.goto('/courses/animals-adventure');
    await page.waitForLoadState('networkidle');
    
    // Verify all 5 animal lessons are visible
    for (const animal of ANIMALS) {
      await expect(page.getByText(animal, { exact: false }).first()).toBeVisible();
    }
    
    // Verify we have 5 lessons (check for the lessons header)
    await expect(page.getByText(/5 Lessons/i)).toBeVisible();
  });

  test('Clicking Cat lesson navigates to lesson page', async ({ page }) => {
    await page.goto('/courses/animals-adventure');
    await page.waitForLoadState('networkidle');
    
    // Click on the Cat lesson card
    await page.getByText('Cat', { exact: false }).first().click();
    
    // Verify navigation to the lesson page
    await expect(page).toHaveURL(/\/courses\/animals-adventure\/lessons\/learn-the-cat/);
  });

  test('Cat lesson shows vocabulary section', async ({ page }) => {
    await page.goto('/courses/animals-adventure/lessons/learn-the-cat');
    await page.waitForLoadState('networkidle');
    
    // Verify Cat lesson content is visible
    await expect(page.getByText('Cat', { exact: false }).first()).toBeVisible();
    
    // Verify vocabulary section with animal words
    for (const animal of ANIMALS) {
      await expect(page.getByText(animal, { exact: false }).first()).toBeVisible();
    }
  });

  test('Course page renders on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/courses/animals-adventure');
    await page.waitForLoadState('networkidle');

    // Verify viewport is set correctly
    expect(page.viewportSize()).toEqual({ width: 375, height: 812 });

    // Verify content is still visible on mobile
    await expect(page.getByText(/Animals/i).first()).toBeVisible();
  });

});
