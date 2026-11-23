/**
 * Verify sidebar brand section uses vibrant claymorphism design.
 * Run: cd frontend && npx playwright test tests/e2e/sidebar-brand-flat.spec.ts
 */
import { test, expect } from '@playwright/test';

const FRONTEND_BASE = 'http://localhost:5173';
const COURSES_URL = `${FRONTEND_BASE}/courses`;

test('sidebar brand uses vibrant claymorphism background', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Bypass auth gating for /courses
    await page.addInitScript(() => {
        window.localStorage.setItem('guestMode', 'true');
        window.localStorage.setItem('auth_token', 'mock-token');
        window.localStorage.setItem('user_id', 'mock-user-id');
        window.localStorage.setItem(
            'mock_user',
            JSON.stringify({
                id: 'mock-user-id',
                username: 'TestUser',
                email: 'test@example.com',
                role: 'learner',
            })
        );
    });

    await page.goto(COURSES_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('aside.learner-sidebar--desktop', { timeout: 10000 });

    // Wait for sidebar brand to be visible
    const brand = page.locator('section.learner-sidebar__brand');
    await expect(brand).toBeVisible();

    // Assert vibrant gradient background is present
    const bgImage = await brand.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bgImage).toContain('linear-gradient');

    // Assert brand mark has multi-color gradient
    const brandMark = page.locator('.learner-sidebar__brand-mark');
    await expect(brandMark).toBeVisible();
    const markBg = await brandMark.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(markBg).toContain('linear-gradient');

    // Assert text has gradient applied
    const brandText = page.locator('.clay-text-vibrant');
    await expect(brandText).toBeVisible();
    const textBg = await brandText.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(textBg).toContain('linear-gradient');

    // Assert sparkle SVG is present
    const sparkle = page.locator('.learner-sidebar__brand-sparkle');
    await expect(sparkle).toBeVisible();

    // Assert chunky claymorphic shadow present
    const boxShadow = await brand.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(boxShadow).toContain('rgb'); // not 'none'

    await page.screenshot({
        path: 'test-artifacts/sidebar-brand-vibrant.png',
        fullPage: false,
        clip: { x: 0, y: 60, width: 320, height: 220 },
    });
});
