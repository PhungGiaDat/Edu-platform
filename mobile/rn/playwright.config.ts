import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.LC11_WEB_BASE_URL ?? 'http://127.0.0.1:8081';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['iPhone 13'],
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npx.cmd expo start --web --no-dev --minify --offline',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
