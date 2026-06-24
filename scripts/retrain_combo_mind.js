/**
 * retrain_combo_mind.js
 * 
 * Retrains the combo_targets.mind file using MindAR's offline compiler.
 * This script compiles TWO flashcard images into a single multi-target .mind file
 * that MindAR can track simultaneously (maxTrack: 2).
 * 
 * Combo concept: Elephant + Jungle → "Jungle Scene" (scene-based grammar combo)
 * 
 * HOW TO RUN:
 *   cd frontend-web
 *   node ../scripts/retrain_combo_mind.js
 * 
 * REQUIREMENTS:
 *   npm install mind-ar   (inside frontend-web)
 * 
 * OUTPUT:
 *   backend/static/assets/target/combo_targets.mind
 */

const { Compiler } = require('mind-ar/dist/mindar-image.prod.js');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────
// This manifest is deliberately ordered: array position becomes MindAR's
// targetIndex and must match ar_combinations.target_order in MongoDB.
const TARGETS = [
  {
    arTag: 'jungle_marker_01',
    imagePath: path.resolve(__dirname, '../backend/static/assets/flashcards/jungle_card.png'),
  },
  {
    arTag: 'elephant_marker_01',
    imagePath: path.resolve(__dirname, '../backend/static/assets/flashcards/elephant_card.png'),
  },
];

const OUTPUT_PATH = path.resolve(
  __dirname,
  '../backend/static/assets/target/combo_targets.mind'
);

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log('[MindAR Compiler] Starting combo_targets.mind retraining...');
  console.log('[MindAR Compiler] Images:');
  TARGETS.forEach((target, i) => {
    console.log(`  [${i}] ${target.arTag}: ${target.imagePath}`);
  });

  // Verify images exist
  for (const { imagePath: imgPath } of TARGETS) {
    if (!fs.existsSync(imgPath)) {
      console.error(`[ERROR] Image not found: ${imgPath}`);
      process.exit(1);
    }
  }

  // Load images into canvas ImageData format (required by MindAR compiler)
  const imageDataList = [];
  for (const { imagePath: imgPath } of TARGETS) {
    console.log(`[MindAR Compiler] Loading image: ${path.basename(imgPath)}`);
    const img = await loadImage(imgPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    imageDataList.push(imageData);
    console.log(`  → Loaded ${img.width}x${img.height}px`);
  }

  // Run MindAR compiler
  console.log('[MindAR Compiler] Compiling targets (this may take 30-120 seconds)...');
  const compiler = new Compiler();
  await compiler.compileImageTargets(imageDataList, (progress) => {
    process.stdout.write(`\r  Progress: ${(progress * 100).toFixed(1)}%`);
  });
  console.log('\n[MindAR Compiler] Compilation complete.');

  // Export .mind file
  const exportedBuffer = await compiler.exportData();
  fs.writeFileSync(OUTPUT_PATH, Buffer.from(exportedBuffer));

  console.log(`[MindAR Compiler] ✅ Saved: ${OUTPUT_PATH}`);
  console.log(`[MindAR Compiler] File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);
  console.log('');
  console.log('Target index mapping (store this exact list as target_order):');
  TARGETS.forEach((target, index) => {
    console.log(`  target-${index} -> ${target.arTag} (${path.basename(target.imagePath)})`);
  });
  console.log('');
  console.log('Next step: Restart the backend server so it serves the new .mind file.');
}

main().catch((err) => {
  console.error('[MindAR Compiler] Fatal error:', err);
  process.exit(1);
});
