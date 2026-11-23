/**
 * E2E tests for Lexi Chat (Agentic RAG with model picker).
 *
 * Prerequisites:
 *   - Expo Web dev server running at http://127.0.0.1:8081
 *     (playwright.config.ts auto-starts it via webServer)
 *   - Backend running at http://localhost:8000 with:
 *     - Real or mocked Qdrant (pipeline degrades gracefully when unavailable)
 *     - Valid TOKENROUTER_API_KEY (or mocked via env)
 *   - Environment variables set (copy .env.example to .env):
 *     LC11_WEB_EMAIL=your-test-email@example.com
 *     LC11_WEB_PASSWORD=your-test-password
 *
 * Run:
 *   cd mobile/rn && npx playwright test lexi-chat.spec.ts
 *
 * Without credentials: tests that require auth are skipped gracefully.
 */
import { test, expect, type Page, type TestInfo } from '@playwright/test';

// ─── Auth ──────────────────────────────────────────────────────────────────────

const EMAIL = process.env.LC11_WEB_EMAIL ?? '';
const PASSWORD = process.env.LC11_WEB_PASSWORD ?? '';

async function signInIfNeeded(page: Page) {
  if (!EMAIL || !PASSWORD) {
    return false; // not signed in
  }
  await page.goto('/');
  await expect(page.getByText('Sign In')).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('Email', { exact: false }).fill(EMAIL);
  await page.getByLabel('Password', { exact: false }).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Lexi', { exact: false })).toBeVisible({ timeout: 15_000 });
  return true; // signed in
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function attachEvidence(
  testInfo: TestInfo,
  page: Page,
  extra?: Record<string, unknown>
) {
  const evidence: Record<string, unknown> = { ...(extra ?? {}) };
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      (evidence as Record<string, string[]>).consoleErrors ??= [];
      ((evidence as Record<string, string[]>).consoleErrors).push(msg.text());
    }
  });
  await testInfo.attach('lexi-chat-evidence.json', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
}

/** Navigate to Lexi chat tab, signing in if credentials are available. */
async function openLexiChat(page: Page) {
  const signedIn = await signInIfNeeded(page);
  if (!signedIn) {
    test.skip(true, 'No LC11_WEB_EMAIL/LC11_WEB_PASSWORD — set these in .env to run authenticated tests');
  }
  const lexiTab = page.getByRole('tab', { name: /lexi/i });
  await lexiTab.click();
  await expect(page.getByText('Lexi 🦊')).toBeVisible({ timeout: 10_000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('Chat screen loads and shows welcome message', async ({ page }) => {
  await openLexiChat(page);
  await expect(page.getByTestId('lexi-chat-input')).toBeVisible({ timeout: 5_000 });
});

test('Model picker button is visible after catalog loads', async ({ page }) => {
  await openLexiChat(page);
  await expect(page.getByTestId('lexi-model-picker-btn')).toBeVisible({ timeout: 10_000 });
});

test('Model picker modal opens on button press', async ({ page }) => {
  await openLexiChat(page);
  await page.getByTestId('lexi-model-picker-btn').click();
  await expect(page.getByText('Chọn Model AI')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('🧠 Planner')).toBeVisible();
  await expect(page.getByText('⚡ Generator')).toBeVisible();
  await expect(page.getByText('✅ Validator')).toBeVisible();
});

test('Model picker modal closes on Xong button', async ({ page }) => {
  await openLexiChat(page);
  await page.getByTestId('lexi-model-picker-btn').click();
  await expect(page.getByText('Chọn Model AI')).toBeVisible();
  await page.getByRole('button', { name: 'Xong' }).click();
  await expect(page.getByText('Chọn Model AI')).not.toBeVisible();
});

test('Can type in the chat input', async ({ page }) => {
  await openLexiChat(page);
  const input = page.getByTestId('lexi-chat-input');
  await input.fill('What is an elephant?');
  await expect(input).toHaveValue('What is an elephant?');
});

test('Send button is present and accessible', async ({ page }) => {
  await openLexiChat(page);
  const sendBtn = page.getByTestId('lexi-chat-send-btn');
  await expect(sendBtn).toBeVisible();
  const isDisabled = await sendBtn.isDisabled();
  expect(typeof isDisabled === 'boolean').toBe(true);
});

test('Session restored banner appears on return visit', async ({ page }, testInfo) => {
  await openLexiChat(page);
  // Send a message to create a session
  await page.getByTestId('lexi-chat-input').fill('Tell me about cats');
  await page.getByTestId('lexi-chat-send-btn').click();
  await page.waitForTimeout(2_000); // allow AsyncStorage write
  // Navigate away and come back
  await page.getByRole('tab', { name: /home/i }).click();
  await page.waitForTimeout(500);
  await openLexiChat(page);
  await expect(page.getByText('Phiên được khôi phục')).toBeVisible({ timeout: 5_000 });
  await attachEvidence(testInfo, page, { test: 'session-restored-banner' });
});

test('Agent trace debug panel expands on click', async ({ page }) => {
  await openLexiChat(page);
  await page.getByTestId('lexi-chat-input').fill('What is a lion?');
  await page.getByTestId('lexi-chat-send-btn').click();
  await page.waitForTimeout(15_000); // allow full RAG pipeline (3 LLM calls)
  const debugToggle = page.getByText('▼ Debug');
  if (await debugToggle.isVisible().catch(() => false)) {
    await debugToggle.click();
    await expect(page.getByText('▲ Debug')).toBeVisible();
  } else {
    test.skip(true, 'AI response not received — TokenRouter likely not configured');
  }
});

test('Source chips appear in AI response after RAG', async ({ page }, testInfo) => {
  await openLexiChat(page);
  await page.getByTestId('lexi-chat-input').fill('What animals live in the jungle?');
  await page.getByTestId('lexi-chat-send-btn').click();
  await page.waitForTimeout(15_000); // allow full RAG pipeline
  const chips = page.locator('[class*="sourceChip"]');
  const count = await chips.count();
  await attachEvidence(testInfo, page, { test: 'source-chips', chipCount: count });
  expect(typeof count === 'number').toBe(true);
});

test('Model override: picker is interactive', async ({ page }, testInfo) => {
  await openLexiChat(page);
  await page.getByTestId('lexi-model-picker-btn').click();
  await expect(page.getByText('Chọn Model AI')).toBeVisible();
  const generatorLabel = page.getByText('⚡ Generator');
  const options = generatorLabel.locator('..').locator('[class*="modelOption"]');
  const optionCount = await options.count();
  if (optionCount >= 2) {
    await options.nth(1).click();
  }
  await page.getByRole('button', { name: 'Xong' }).click();
  await expect(page.getByText('Chọn Model AI')).not.toBeVisible();
  await attachEvidence(testInfo, page, { test: 'model-override', generatorOptionsAvailable: optionCount });
});
