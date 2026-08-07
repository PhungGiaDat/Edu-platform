---
name: mindar-target-compiler
description: Prepare image targets and compile them into .mind files for MindAR — validate resolution and contrast, batch-compile multiple PNG/JPGs into one .mind bundle, and emit a manifest that maps target names to indices. Use when generating, validating, or compiling image-target source images for MindAR projects.
---

# MindAR Target Compiler

Take raw PNG/JPG images, validate them, and compile to a single `.mind`
file. The `.mind` file is what `MindARThree` or A-Frame's `mindar-image`
component loads at runtime.

## Inputs and outputs

```
targets/source/*.jpg ──┐
                        ├─▶ mindar_compile_targets ─▶ public/targets/targets.mind
manifest.json (optional)┘                            public/targets/manifest.json
```

`manifest.json` maps human-readable names to `targetIndex`:

```json
{
  "compiledAt": "2026-08-04T10:00:00Z",
  "version": "1.2.5",
  "targets": [
    { "index": 0, "name": "apple",    "source": "apple.jpg",    "width": 1024, "height": 1024 },
    { "index": 1, "name": "ball",     "source": "ball.jpg",     "width": 1024, "height": 1024 }
  ]
}
```

## Tooling

Two equivalent paths:

### MCP tool (preferred from agents)

```javascript
mindar_compile_targets({
  sourceDir: '/path/to/targets/source',
  outFile:   '/path/to/public/targets/targets.mind',
  emitManifest: true,
  validate: true
})
```

The MCP tool validates, runs the MindAR compiler, and writes the manifest
in one call.

### Manual / CI

```bash
# Validate first (exit 1 if any FAIL)
node scripts/validate-targets.mjs targets/source

# Compile (browser-based; runs in a headless Chrome)
npx mindar-cli compile \
  --input targets/source \
  --output public/targets/targets.mind
```

## Pre-compilation validation

Run `scripts/validate-targets.mjs` (also exposed as
`mindar_validate_target` via MCP) **before** compiling. Common failures:

| Issue                | Cause                                | Fix                                  |
| -------------------- | ------------------------------------ | ------------------------------------ |
| Resolution too low   | Image < 480×480                      | Re-export at 1024×1024                |
| Resolution too high  | Image > 2048×2048                    | Resize down; excess detail wastes CPU |
| Empty / tiny file    | Broken export, ~0 bytes             | Re-export from source                 |
| Extreme aspect ratio | 4:1 or 1:4                           | Crop closer to 1:1                    |
| Low contrast         | All-white or all-black poster        | Add varied features (text, edges)    |

**Contrast check** is heuristic — compute a Sobel/edge density on the
image and warn if the feature density is too low. MindAR uses corners and
edges; smooth gradients don't track.

## Source image rules of thumb

- **Resolution:** 1024×1024 is the sweet spot for printed cards.
- **File size:** keep source PNGs under 500KB; compile to `.mind` (~200KB
  per target) is what ships to users.
- **Subject:** fill the frame with high-frequency content (text, line art,
  patterns). Avoid smooth gradients, photos of clouds, etc.
- **Physical print size:** 5–25cm is the recommended printed size.
- **Format:** PNG for transparency / sharp text, JPG for photos. Both work.

## Compiling via headless Chrome

MindAR's official compiler runs **in the browser** (it uses TFJS). To use
it from a CLI:

```javascript
// compile.mjs — using puppeteer to drive the official compiler
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import path from 'node:path';

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.goto('https://hiukim.github.io/mind-ar-js-doc/tools/compile');

const input = path.resolve('./targets/source');
await page.waitForSelector('input[type=file]');
const inputEl = await page.$('input[type=file]');
await inputEl.uploadFile(...fs.readdirSync(input).map(f => path.join(input, f)));

// wait for download
const downloadPath = path.resolve('./targets/targets.mind');
const client = await page.target().createCDPSession();
await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath });
await page.click('#compile-button');

await browser.close();
```

This is heavy. **Use the MCP tool** when possible — it caches the headless
browser.

## Compiling with `mindar-compiler` npm package

If the package exists in the workspace (`npm ls mindar-compiler`), prefer
that:

```bash
npx mindar-compiler \
  --input targets/source \
  --output public/targets/targets.mind \
  --format json  # emits manifest
```

## Common mistakes

- **Reordering files in `targets/source/`.** Anchor indices change. Update
  consumers or restore the original order.
- **Mismatched source vs runtime URL.** The `.mind` ships relative to the
  build output; ensure the URL in `imageTargetSrc` matches.
- **Compiling on every build.** The `.mind` is content-addressed; cache it
  keyed on file hashes + compile options.
- **Skipping validation.** Low-contrast or low-res targets compile fine
  but fail at runtime — always validate first.

## References

- `references/compiler-options.md` — flags for the official compiler
- `references/contrast-check.md` — heuristic for feature density
- For runtime use of the compiled `.mind` → load `mindar-image-tracking`