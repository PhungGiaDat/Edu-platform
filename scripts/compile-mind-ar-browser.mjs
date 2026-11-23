#!/usr/bin/env node
/**
 * Compile MindAR .mind file using Playwright.
 * Usage: node compile-mind-ar-browser.mjs <output.mind> <image1.png> <image2.png> ...
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node compile-mind-ar-browser.mjs <output.mind> <image1.png> ...');
  process.exit(1);
}

const outputFile = args[0];
const imageFiles = args.slice(1);
console.log(`Compiling ${imageFiles.length} images -> ${outputFile}`);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

page.on('console', msg => {
  if (msg.type() === 'error') console.error('[Browser Error]', msg.text());
});

try {
  console.log('Opening MindAR compiler...');
  await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile/', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  await page.waitForTimeout(3000);

  const fileInput = page.locator('input[type="file"]').first();
  console.log(`Uploading ${imageFiles.length} images...`);
  await fileInput.setInputFiles(imageFiles);
  await page.waitForTimeout(2000);

  const startBtn = page.locator('button').filter({ hasText: /^start$/i }).first();
  if (await startBtn.count() > 0) {
    await startBtn.click();
    console.log('Started compilation...');
  }

  const maxWait = 600000;
  const startTime = Date.now();
  let downloaded = false;

  while (Date.now() - startTime < maxWait && !downloaded) {
    await page.waitForTimeout(5000);

    try {
      const allBtns = await page.locator('button').all();
      for (const btn of allBtns) {
        const text = (await btn.textContent())?.trim().toLowerCase() || '';
        if (text.includes('download')) {
          console.log('\nDownload button found!');
          // Wait for download event first, then click
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30000 }),
            btn.click()
          ]);
          const downloadPath = await download.path();
          const data = await import('fs').then(fs => fs.readFileSync(downloadPath));
          writeFileSync(outputFile, data);
          console.log(`Written to ${outputFile} (${(data.length / 1024).toFixed(1)} KB)`);
          downloaded = true;
          break;
        }
      }
    } catch (e) {
      // Not ready
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    process.stdout.write(`\rWaiting... ${elapsed}s`);
  }

  if (!downloaded) {
    console.error('\nERROR: Download not triggered');
    process.exit(1);
  }

} finally {
  await browser.close();
}
