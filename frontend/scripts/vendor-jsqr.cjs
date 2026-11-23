#!/usr/bin/env node
/**
 * Vendoring helper for locally-pinned third-party libraries.
 *
 * The persistent MindAR viewer requires a deterministic local copy of the
 * jsQR 1.4.0 decoder so we never depend on jsDelivr at runtime. This
 * script copies the exact dist file produced by the pinned npm package
 * into `public/static/vendor/`, exiting non-zero if the source is
 * missing or unexpected.
 */
const fs = require('node:fs');
const path = require('node:path');

const EXPECTED_VERSION = '1.4.0';
const SOURCE_FILE = path.resolve(
  __dirname,
  '..',
  'node_modules',
  'jsqr',
  'package.json'
);
const DIST_FILE = path.resolve(
  __dirname,
  '..',
  'node_modules',
  'jsqr',
  'dist',
  'jsQR.js'
);
const VENDOR_DIR = path.resolve(__dirname, '..', 'public', 'static', 'vendor');
const OUTPUT_FILE = path.resolve(VENDOR_DIR, `jsQR-${EXPECTED_VERSION}.min.js`);

function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(
      `[vendor-jsqr] missing jsqr package; run 'npm.cmd install jsqr@${EXPECTED_VERSION}' first.`
    );
    process.exit(1);
  }
  const pkg = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  if (pkg.version !== EXPECTED_VERSION) {
    console.error(
      `[vendor-jsqr] expected jsqr version ${EXPECTED_VERSION} but found ${pkg.version}.`
    );
    process.exit(1);
  }
  if (!fs.existsSync(DIST_FILE)) {
    console.error(`[vendor-jsqr] expected dist file missing at ${DIST_FILE}.`);
    process.exit(1);
  }
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  const sourceBytes = fs.readFileSync(DIST_FILE);
  const previousBytes = fs.existsSync(OUTPUT_FILE)
    ? fs.readFileSync(OUTPUT_FILE)
    : null;
  if (previousBytes && previousBytes.equals(sourceBytes)) {
    console.log(`[vendor-jsqr] vendor file already up to date at ${OUTPUT_FILE}.`);
    process.exit(0);
  }
  fs.writeFileSync(OUTPUT_FILE, sourceBytes);
  console.log(
    `[vendor-jsqr] wrote ${OUTPUT_FILE} (${sourceBytes.length} bytes from jsqr ${EXPECTED_VERSION}).`
  );
}

main();
