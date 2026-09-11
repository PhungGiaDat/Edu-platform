// frontend/tests/e2e/admin-activation.spec.ts
/**
 * DEVICE_BROWSER_VERIFIED gate for the 2026-09-09/10 activation work:
 *  - teacher login → role-gated admin entry button on Profile
 *  - app-wide language sliding toggle (VI/EN) + persistence
 *  - admin games surfaces (manager + editor)
 *  - course create → card click lands on EDIT route (regression: was blank)
 * Runs against the REAL backend (local uvicorn ↔ Supabase).
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN_ID = 'admin@eduplatform.com';
const ADMIN_PASSWORD = 'AdminPassword123!';

async function loginAsAdmin(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(ADMIN_ID);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForFunction(
    () => Boolean(localStorage.getItem('authToken')),
    { timeout: 20000 },
  );
}

async function deleteCourseByApi(page: Page, courseId: string) {
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  await page.request.delete(`http://localhost:5173/api/v1/admin/courses/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test.describe('Admin activation — desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('profile: teacher admin button + language sliding toggle (persisted)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });

    // Role-gated entry button (superuser passes)
    const adminButton = page.getByRole('button', { name: /Khu vực quản trị|Teacher admin area/ });
    await expect(adminButton).toBeVisible({ timeout: 20000 });

    // Sliding language toggle — role=switch
    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();
    const initialChecked = await toggle.getAttribute('aria-checked');

    // force: webkit hit-testing can stall behind fixed mobile chrome — the
    // click handler itself is what we're testing
    await toggle.click({ force: true });
    const flipped = initialChecked === 'true' ? 'false' : 'true';
    await expect(toggle).toHaveAttribute('aria-checked', flipped);
    // Copy follows the locale (dict keys) — allow render lag from profile fetch
    if (flipped === 'true') {
      await expect(adminButton).toContainText('Teacher admin area', { timeout: 10000 });
    } else {
      await expect(adminButton).toContainText('Khu vực quản trị', { timeout: 10000 });
    }

    // Persistence across reload — checked state surviving reload proves the
    // stored locale was restored. Webkit auth restore can be slow → 20s.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', flipped, { timeout: 20000 });
    const persistedButton = page.getByRole('button', { name: /Khu vực quản trị|Teacher admin area/ });
    if (flipped === 'true') {
      await expect(persistedButton).toContainText('Teacher admin area', { timeout: 10000 });
    } else {
      await expect(persistedButton).toContainText('Khu vực quản trị', { timeout: 10000 });
    }

    // Restore the pre-test language so other tests start neutral
    await page.getByRole('switch').click({ force: true });
    const restoredChecked = flipped === 'true' ? 'false' : 'true';
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', restoredChecked);
  });

  test('admin games surfaces render (manager + editor)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/games', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Tạo game|Create game/ })).toBeVisible({ timeout: 20000 });

    await page.goto('/admin/games/new', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Loại trò chơi|Game type/)).toBeVisible();
    await expect(page.getByText(/Độ khó|Difficulty/)).toBeVisible();
  });

  test('course create → card click lands on EDIT route (was blank) → cleanup', async ({ page }) => {
    const title = `PW E2E Course ${Date.now()}`;

    await loginAsAdmin(page);
    await page.goto('/admin/courses/new', { waitUntil: 'domcontentloaded' });

    await page.locator('input[placeholder="Example: English at Home"]').fill(title);

    // Session fields live in the Sessions tab
    await page.getByRole('button', { name: /Sessions/ }).first().click();
    const sessionTitle = page.locator('[id^="session-"][id$="-title"]').first();
    await sessionTitle.waitFor({ state: 'visible', timeout: 10000 });
    await sessionTitle.fill('Lesson 1');
    const contentBlock = page.locator('[placeholder^="Write the learning content"]').first();
    await contentBlock.fill('Hello from Playwright');

    await page.getByRole('button', { name: 'Save draft' }).click();

    // Redirect to the manager with the new course card
    await page.waitForURL('**/admin/courses', { timeout: 20000 });
    const cardTitle = page.getByText(title, { exact: true }).first();
    await expect(cardTitle).toBeVisible({ timeout: 15000 });

    // Card click → previously NO route existed (blank page); now lands on /edit.
    // force: webkit hit-testing can stall on the line-clamped title inside the
    // clickable card; the URL assertion below is the actual regression check.
    await cardTitle.click({ force: true });
    await page.waitForURL('**/admin/courses/*/edit', { timeout: 20000 });
    await expect(page.locator('input[placeholder="Example: English at Home"]')).toHaveValue(title, {
      timeout: 15000,
    });

    // Extract course id from URL and clean up via API
    const url = page.url();
    const courseId = url.split('/').filter(Boolean).pop() ?? '';
    await deleteCourseByApi(page, courseId);

    await page.goto('/admin/courses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(title, { exact: true })).toHaveCount(0, { timeout: 15000 });
  });
});

test.describe('Admin activation — mobile responsive gate', () => {
  test('profile admin button + language card visible; games hub renders', async ({ page }) => {
    // Mobile Safari project runs at iPhone 13 viewport; chromium falls back to desktop
    await loginAsAdmin(page);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Khu vực quản trị|Teacher admin area/ })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('switch')).toBeVisible();

    await page.goto('/games', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Chơi cùng Lexi|Play with Lexi/)).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.gsh-daily')).toBeVisible();
  });
});
