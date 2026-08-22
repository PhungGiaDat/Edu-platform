#!/usr/bin/env node
/**
 * Compile MindAR .mind file using Playwright to automate the web compiler.
 * Usage: node compile-mind-ar-browser.mjs <output.mind> <image1.png> <image2.png> ...
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node compile-mind-ar-browser.mjs <output.mind> <image1.png> <image2.png> ...');
  process.exit(1);
}

const outputFile = args[0];
const imageFiles = args.slice(1);
console.log(`Compiling ${imageFiles.length} images -> ${outputFile}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
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
  await page.waitForTimeout(2000);

  // Find the file input (may be hidden in dropzone)
  const fileInput = page.locator('input[type="file"]').first();
  console.log(`File input found (hidden: ${await fileInput.getAttribute('hidden')})`);

  // Upload all images at once (multiple files)
  console.log(`Uploading ${imageFiles.length} images...`);
  await fileInput.setInputFiles(imageFiles);
  await page.waitForTimeout(2000);

  // Check status
  const itemCount = await page.locator('.image-item, .track-item, [class*="item"]').count();
  console.log(`Uploaded. Image items visible: ${itemCount}`);

  // Click "Start" button
  const startBtn = page.locator('button').filter({ hasText: /^start$/i }).first();
  const startExists = await startBtn.count() > 0;
  if (!startExists) {
    // Try different selectors
    const allBtns = await page.locator('button').all();
    console.log('Available buttons:');
    for (const btn of allBtns) {
      const t = (await btn.textContent())?.trim();
      console.log(`  - "${t}"`);
    }
    // Try clicking any button that looks like Start
    for (const btn of allBtns) {
      const t = (await btn.textContent())?.trim().toLowerCase();
      if (t === 'start' || t.includes('run') || t.includes('compile')) {
        console.log(`Clicking: "${t}"`);
        await btn.click();
        break;
      }
    }
  } else {
    console.log('Clicking Start...');
    await startBtn.click();
  }

  // Wait for compilation - monitor progress
  console.log('Compiling... (this may take a few minutes)');
  const maxWait = 300000; // 5 minutes max
  const startTime = Date.now();
  let lastProgress = -1;

  while (Date.now() - startTime < maxWait) {
    await page.waitForTimeout(5000);

    // Check for download button
    const downloadBtn = page.locator('button').filter({ hasText: /download/i }).first();
    if (await downloadBtn.count() > 0) {
      console.log('\nCompilation done! Downloading...');

      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 30000 }),
        downloadBtn.click()
      ]);

      const downloadPath = await download.path();
      const data = readFileSync(downloadPath);
      writeFileSync(outputFile, data);
      console.log(`Written to ${outputFile} (${(data.length / 1024).toFixed(1)} KB)`);
      break;
    }

    // Check progress
    const progressText = await page.locator('body').textContent();
    const progressMatch = progressText.match(/(\d+)%/);
    if (progressMatch) {
      const p = parseInt(progressMatch[1]);
      if (p !== lastProgress) {
        console.log(`Progress: ${p}%`);
        lastProgress = p;
      }
    }
  }

} finally {
  await browser.close();
}
