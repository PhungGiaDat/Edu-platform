#!/usr/bin/env node
/**
 * Vendoring helper for @8thwall/engine-binary
 *
 * Copies 8th Wall engine binaries to public/external/xr/ so they can be
 * served without bundling. The xr.js script tag in ar-viewer.html loads
 * these files directly.
 */
const fs = require('node:fs');
const path = require('node:path');

const SOURCE_DIR = path.resolve(
  __dirname,
  '..',
  'node_modules',
  '@8thwall',
  'engine-binary',
  'dist'
);
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'external', 'xr');

const EXPECTED_FILES = [
  'xr.js',
  'xr-face.js',
  'xr-slam.js',
  'LICENSE'
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'resources') {
        // Copy resources directory recursively
        copyDir(srcPath, destPath);
      } else {
        fs.mkdirSync(destPath, { recursive: true });
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  // Check if source exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(
      '[vendor-8thwall] @8thwall/engine-binary not found.\n' +
      'Run: npm install @8thwall/engine-binary'
    );
    process.exit(1);
  }

  // Verify expected files exist
  const missingFiles = EXPECTED_FILES.filter(
    file => !fs.existsSync(path.join(SOURCE_DIR, file))
  );

  if (missingFiles.length > 0) {
    console.error(
      `[vendor-8thwall] missing expected files: ${missingFiles.join(', ')}`
    );
    process.exit(1);
  }

  // Copy files
  console.log('[vendor-8thwall] Copying 8th Wall engine binaries...');
  copyDir(SOURCE_DIR, OUTPUT_DIR);
  console.log('[vendor-8thwall] Done. Files in:', OUTPUT_DIR);

  // List copied files
  const copied = fs.readdirSync(OUTPUT_DIR, { recursive: true });
  console.log('[vendor-8thwall] Copied:', copied.filter(f => !f.includes('resources')).join(', '));
}

main();
