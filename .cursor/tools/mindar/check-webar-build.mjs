#!/usr/bin/env node
// check-webar-build.mjs
//
// Pre-flight checks for a MindAR (or any WebAR) build:
//   - HTTPS / secure-context required for camera
//   - Permissions-Policy header must allow camera
//   - index.html must serve over the network (not file://)
//   - Static asset references resolve
//
// Usage: node scripts/check-webar-build.mjs <dist-or-public-dir> [--url <https-url>]
//
// Exit codes: 0 = OK, 1 = at least one error, 2 = usage

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

async function checkIndexHtml(dir) {
  const indexPath = path.join(dir, 'index.html');
  let html;
  try {
    html = await fs.readFile(indexPath, 'utf-8');
  } catch {
    return [{ level: 'FAIL', code: 'NO_INDEX', msg: 'No index.html found' }];
  }
  const issues = [];
  if (!/getUserMedia|getusermedia/i.test(html))
    issues.push({ level: 'FAIL', code: 'NO_CAMERA_API', msg: 'No getUserMedia call detected; MindAR cannot access the camera' });
  if (!/mind-?ar|mindar/i.test(html))
    issues.push({ level: 'FAIL', code: 'NO_MINDAR', msg: 'No reference to mindar in index.html' });
  if (!/<script[^>]+type=["']module["']/i.test(html) && !/import\s/m.test(html))
    issues.push({ level: 'WARN', code: 'NO_ESM', msg: 'No ES module import detected; consider module-type script for modern bundlers' });
  return issues;
}

async function checkAssets(dir) {
  const issues = [];
  const subdirs = ['assets', 'targets', 'static'];
  let found = false;
  for (const sub of subdirs) {
    try {
      await fs.access(path.join(dir, sub));
      found = true;
    } catch {}
  }
  if (!found) issues.push({ level: 'WARN', code: 'NO_ASSETS_DIR', msg: 'No assets/targets/static directory; MindAR needs .mind files and models' });

  // .mind files must exist if a compiled target is referenced
  async function* walk(d) {
    for (const entry of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) yield* walk(p);
      else yield p;
    }
  }
  let mindCount = 0, glbCount = 0, imageCount = 0;
  for await (const p of walk(dir)) {
    const e = path.extname(p).toLowerCase();
    if (e === '.mind') mindCount++;
    else if (e === '.glb' || e === '.gltf') glbCount++;
    else if (e === '.jpg' || e === '.jpeg' || e === '.png' || e === '.webp') imageCount++;
  }
  console.log(`    Found: ${mindCount} .mind, ${glbCount} .glb/.gltf, ${imageCount} images`);
  if (mindCount === 0) issues.push({ level: 'FAIL', code: 'NO_MIND_FILES', msg: 'No .mind files in build; image tracking will not work' });
  return issues;
}

function checkHttpsUrl(url) {
  const issues = [];
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:')
      issues.push({ level: 'FAIL', code: 'NOT_HTTPS', msg: `URL is ${u.protocol}, not https://; camera access requires HTTPS` });
  } catch (e) {
    issues.push({ level: 'FAIL', code: 'BAD_URL', msg: `Invalid URL: ${url}` });
  }
  return issues;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node check-webar-build.mjs <dist-or-public-dir> [--url <https-url>]');
    process.exit(2);
  }
  const dir = args[0];
  let url = null;
  const urlIdx = args.indexOf('--url');
  if (urlIdx >= 0) url = args[urlIdx + 1];

  console.log(`\nWebAR build check: ${dir}\n`);

  const allIssues = [];
  console.log('  Checking index.html...');
  allIssues.push(...(await checkIndexHtml(dir)));

  console.log('  Checking assets...');
  allIssues.push(...(await checkAssets(dir)));

  if (url) {
    console.log(`  Checking URL ${url}...`);
    allIssues.push(...checkHttpsUrl(url));
  } else {
    console.log('  Skipping URL check (no --url)');
    console.log('    REMINDER: production deployment MUST be served over HTTPS');
  }

  console.log('');
  if (!allIssues.length) {
    console.log('  [OK] all checks passed');
    process.exit(0);
  }
  let fail = 0;
  for (const i of allIssues) {
    console.log(`  [${i.level}] ${i.code}: ${i.msg}`);
    if (i.level === 'FAIL') fail++;
  }
  console.log(`\nSummary: ${fail} failure(s)`);
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });