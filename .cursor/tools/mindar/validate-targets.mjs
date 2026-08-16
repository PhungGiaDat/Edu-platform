#!/usr/bin/env node
// validate-targets.mjs
//
// Validate MindAR image-target source images before compilation.
// Checks resolution, aspect ratio, file size, and produces warnings for
// features that commonly cause tracking instability.
//
// Usage:  node scripts/validate-targets.mjs <targets-dir> [--json]
//
// Exit codes: 0 = all pass, 1 = at least one FAIL, 2 = usage error

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const EXT_OK = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MIN_W  = 480;
const MIN_H  = 480;
const MAX_W  = 2048;
const MAX_H  = 2048;
const MIN_BYTES = 10_000;
const MAX_BYTES = 8_000_000;

async function readPngDimensions(buf) {
  // PNG: bytes 16-23 contain width/height (big-endian uint32)
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { w, h, format: 'png' };
  }
  // JPEG: scan SOF markers (0xFFC0..0xFFCF, excluding 0xFFC4, 0xFFC8, 0xFFCC)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const segLen = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const h = buf.readUInt16BE(i + 5);
        const w = buf.readUInt16BE(i + 7);
        return { w, h, format: 'jpeg' };
      }
      i += 2 + segLen;
    }
  }
  // WebP: parse VP8/VP8L/VP8X chunk
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    const chunk = buf.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      const w  = buf.readUInt16LE(26) & 0x3fff;
      const h  = buf.readUInt16LE(28) & 0x3fff;
      return { w, h, format: 'webp' };
    }
    if (chunk === 'VP8L') {
      const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
      const w = 1 + (((b1 & 0x3f) << 8) | b0);
      const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { w, h, format: 'webp' };
    }
  }
  return null;
}

async function checkImage(file) {
  const buf = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const issues = [];

  if (!EXT_OK.has(ext)) {
    issues.push({ level: 'FAIL', code: 'UNSUPPORTED_FORMAT', msg: `Format ${ext} not supported; use JPG, PNG, or WebP` });
  }
  const stat = await fs.stat(file);
  if (stat.size < MIN_BYTES) issues.push({ level: 'FAIL', code: 'TOO_SMALL', msg: `File < ${MIN_BYTES} bytes (likely empty or corrupted)` });
  if (stat.size > MAX_BYTES) issues.push({ level: 'WARN', code: 'TOO_LARGE', msg: `File > ${MAX_BYTES / 1e6}MB; consider compressing` });

  const dim = await readPngDimensions(buf);
  if (!dim) {
    issues.push({ level: 'FAIL', code: 'CANNOT_READ_DIM', msg: 'Unable to read image dimensions' });
  } else {
    if (dim.w < MIN_W || dim.h < MIN_H)
      issues.push({ level: 'FAIL', code: 'LOW_RES', msg: `Resolution ${dim.w}x${dim.h} below minimum ${MIN_W}x${MIN_H}; tracking will be unreliable` });
    if (dim.w > MAX_W || dim.h > MAX_H)
      issues.push({ level: 'FAIL', code: 'HIGH_RES', msg: `Resolution ${dim.w}x${dim.h} above maximum ${MAX_W}x${MAX_H}; exceeds MindAR limits` });

    const aspect = dim.w / dim.h;
    if (aspect < 0.5 || aspect > 2.0)
      issues.push({ level: 'WARN', code: 'EXTREME_ASPECT', msg: `Aspect ratio ${aspect.toFixed(2)} outside recommended 0.5-2.0 range` });
  }

  return { file: path.basename(file), size: stat.size, dim, issues };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node validate-targets.mjs <targets-dir> [--json]');
    process.exit(2);
  }
  const targetsDir = args[0];
  const jsonMode = args.includes('--json');

  let entries;
  try {
    entries = await fs.readdir(targetsDir);
  } catch (e) {
    console.error(`Error: cannot read directory ${targetsDir}: ${e.message}`);
    process.exit(2);
  }

  const images = entries.filter(e => EXT_OK.has(path.extname(e).toLowerCase()));
  if (!images.length) {
    console.error('No supported images found. Use JPG, PNG, or WebP.');
    process.exit(2);
  }

  const results = [];
  for (const img of images) {
    results.push(await checkImage(path.join(targetsDir, img)));
  }

  if (jsonMode) {
    console.log(JSON.stringify({ results }, null, 2));
  } else {
    console.log(`\nMindAR target validation: ${results.length} image(s) in ${targetsDir}\n`);
    let fail = 0, warn = 0;
    for (const r of results) {
      console.log(`  ${r.file}${r.dim ? ` (${r.dim.w}x${r.dim.h}, ${(r.size / 1024).toFixed(0)}KB)` : ''}`);
      for (const i of r.issues) {
        console.log(`    [${i.level}] ${i.code}: ${i.msg}`);
        if (i.level === 'FAIL') fail++;
        else if (i.level === 'WARN') warn++;
      }
      if (!r.issues.length) console.log('    [OK] ready to compile');
    }
    console.log(`\nSummary: ${fail} failure(s), ${warn} warning(s)`);
    process.exit(fail ? 1 : 0);
  }
}

main().catch(e => { console.error(e); process.exit(2); });