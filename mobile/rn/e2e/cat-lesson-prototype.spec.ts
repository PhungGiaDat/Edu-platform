import { expect, test, type Page, type TestInfo } from '@playwright/test';

const screenshotNames = [
  '01-warm-up',
  '02-vocabulary',
  '03-listen-choose',
  '04-match',
  '05-memory',
  '06-quiz',
  '07-reward',
] as const;

async function capture(page: Page, testInfo: TestInfo, name: typeof screenshotNames[number]) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false });
}

test('Cat prototype traverses all seven views at 375x812', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page.getByTestId('cat-prototype-warm-up')).toBeVisible();
  await capture(page, testInfo, '01-warm-up');
  await page.getByText('Bắt đầu học', { exact: true }).click();

  await expect(page.getByTestId('cat-prototype-vocabulary')).toBeVisible();
  await capture(page, testInfo, '02-vocabulary');
  await page.getByText('Tiếp tục', { exact: true }).click();

  await expect(page.getByTestId('cat-prototype-listen')).toBeVisible();
  await page.getByRole('button', { name: 'Chọn Dog' }).click();
  await expect(page.getByText('Not this one. Listen again and find Cat.')).toBeVisible();
  await page.getByRole('button', { name: 'Chọn Cat' }).click();
  await expect(page.getByText('Yes! You found Cat.')).toBeVisible();
  await capture(page, testInfo, '03-listen-choose');
  await page.getByText('Tiếp tục', { exact: true }).click();

  await expect(page.getByTestId('cat-prototype-match')).toBeVisible();
  await page.getByRole('button', { name: 'Chọn hình Cat' }).click();
  await page.getByRole('button', { name: 'Ghép từ Bird' }).click();
  await expect(page.getByText('Those two are different. Try again.')).toBeVisible();
  for (const animal of ['Cat', 'Dog', 'Bird']) {
    await page.getByRole('button', { name: `Chọn hình ${animal}` }).click();
    await page.getByRole('button', { name: `Ghép từ ${animal}` }).click();
  }
  await expect(page.getByText('3 / 3 pairs')).toBeVisible();
  await capture(page, testInfo, '04-match');
  await page.getByText('Hoàn thành Match', { exact: true }).click();

  await expect(page.getByTestId('cat-prototype-memory')).toBeVisible();
  for (const pair of [
    ['cat-word', 'cat-image'],
    ['dog-word', 'dog-image'],
    ['bird-word', 'bird-image'],
  ]) {
    await page.getByTestId(`memory-card-${pair[0]}`).click();
    await page.getByTestId(`memory-card-${pair[1]}`).click();
  }
  await expect(page.getByText('Pairs 3/3')).toBeVisible();
  await capture(page, testInfo, '05-memory');
  await page.getByText('Tiếp tục tới Quiz', { exact: true }).click();

  await expect(page.getByTestId('cat-prototype-quiz')).toBeVisible();
  await page.getByRole('button', { name: 'Đáp án Dog' }).click();
  await expect(page.getByText('Good try. Look or listen once more.')).toBeVisible();
  for (let question = 0; question < 3; question += 1) {
    await page.getByRole('button', { name: 'Đáp án Cat' }).click();
    await expect(page.getByText('Correct! Cat is the answer.')).toBeVisible();
    if (question === 0) await capture(page, testInfo, '06-quiz');
    await page.getByText(question === 2 ? 'Xem phần thưởng' : 'Câu tiếp theo', { exact: true }).click();
  }

  await expect(page.getByTestId('cat-prototype-reward')).toBeVisible();
  await expect(page.getByText('Cat Champion', { exact: true })).toBeVisible();
  await expect(page.getByText('Presentation-only prototype · no reward was saved')).toBeVisible();
  await capture(page, testInfo, '07-reward');
  expect(pageErrors).toEqual([]);
});
