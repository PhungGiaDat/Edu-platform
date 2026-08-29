import { test, expect, type Page } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 428, height: 926 },
] as const;

async function openLexi(page: Page) {
  await page.addInitScript(() => localStorage.setItem('guestMode', 'true'));
  await page.goto('/courses', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Talk to Lexi' }).click();
  await page.getByRole('dialog', { name: 'Lexi chat' }).waitFor();
  await page.waitForTimeout(400);
}

test.describe('AIChatBuddy responsive layout', () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`fits the chat panel without horizontal overflow at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openLexi(page);

      const metrics = await page.getByRole('dialog', { name: 'Lexi chat' }).evaluate((panel) => {
        const header = panel.firstElementChild;
        const nav = document.querySelector('nav[aria-label="primaryNavigation"]');
        const panelRect = panel.getBoundingClientRect();
        const navRect = nav?.getBoundingClientRect();
        return {
          bodyScrollWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          panelScrollWidth: panel.scrollWidth,
          panelClientWidth: panel.clientWidth,
          headerScrollWidth: header?.scrollWidth ?? 0,
          headerClientWidth: header?.clientWidth ?? 0,
          panelBottom: panelRect.bottom,
          navTop: navRect?.top ?? window.innerHeight,
        };
      });

      expect(metrics.bodyScrollWidth).toBe(metrics.viewportWidth);
      expect(metrics.panelScrollWidth).toBe(metrics.panelClientWidth);
      expect(metrics.headerScrollWidth).toBe(metrics.headerClientWidth);
      expect(metrics.panelBottom).toBeLessThanOrEqual(metrics.navTop);
    });
  }

  test('anchors the desktop chat panel to the right edge', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'The WebKit project emulates a touch device; desktop anchoring is covered by Chromium.');
    await page.setViewportSize({ width: 1280, height: 800 });
    await openLexi(page);

    const panel = page.getByRole('dialog', { name: 'Lexi chat' });
    const bounds = await panel.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
    });

    expect(bounds.right).toBeLessThan(bounds.viewportWidth);
    expect(bounds.left).toBeGreaterThan(bounds.viewportWidth / 2);
  });
});
