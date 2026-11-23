// Temporary script to screenshot Leaderboard and Daily Challenge pages
import { chromium } from '@playwright/test';

async function screenshotPages() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // Login first (you may need to adjust credentials)
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');

  // Check if we need to login
  const url = page.url();
  if (url.includes('/login')) {
    console.log('Need to login - checking for login form...');
    // Try to login if form exists
    const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (emailInput && passwordInput) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/courses', { timeout: 10000 }).catch(() => {});
    }
  }

  console.log('Current URL:', page.url());

  // Take screenshot of Leaderboard
  console.log('Taking screenshot of Leaderboard...');
  await page.goto('http://localhost:5173/leaderboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-artifacts/leaderboard-page.png', fullPage: false });
  console.log('Saved: test-artifacts/leaderboard-page.png');

  // Take screenshot of Daily Challenge
  console.log('Taking screenshot of Daily Challenge...');
  await page.goto('http://localhost:5173/daily-challenge', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-artifacts/daily-challenge-page.png', fullPage: false });
  console.log('Saved: test-artifacts/daily-challenge-page.png');

  await browser.close();
  console.log('Done!');
}

screenshotPages().catch(console.error);
