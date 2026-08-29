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
    test(`keeps Lexi visible in a clay FAB at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.addInitScript(() => localStorage.setItem('guestMode', 'true'));
      await page.goto('/courses', { waitUntil: 'networkidle' });

      const fab = page.getByRole('button', { name: 'Talk to Lexi' });
      const metrics = await fab.evaluate((button) => {
        const sprite = button.querySelector('[role="img"]');
        const nav = document.querySelector('nav[aria-label="primaryNavigation"]');
        const buttonBounds = button.getBoundingClientRect();
        const spriteBounds = sprite?.getBoundingClientRect();
        const navBounds = nav?.getBoundingClientRect();
        const styles = getComputedStyle(button);

        return {
          buttonWidth: buttonBounds.width,
          buttonHeight: buttonBounds.height,
          spriteWidth: spriteBounds?.width ?? 0,
          spriteHeight: spriteBounds?.height ?? 0,
          backgroundImage: styles.backgroundImage,
          boxShadow: styles.boxShadow,
          buttonBottom: buttonBounds.bottom,
          navTop: navBounds?.top ?? window.innerHeight,
          right: buttonBounds.right,
          viewportWidth: window.innerWidth,
        };
      });

      expect(metrics.buttonWidth).toBeGreaterThanOrEqual(64);
      expect(metrics.buttonHeight).toBeGreaterThanOrEqual(64);
      expect(metrics.spriteWidth).toBeGreaterThan(30);
      expect(metrics.spriteHeight).toBeGreaterThan(30);
      expect(metrics.backgroundImage).not.toBe('none');
      expect(metrics.boxShadow).not.toBe('none');
      expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth);
      expect(metrics.buttonBottom).toBeLessThanOrEqual(metrics.navTop);
    });
  }

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
