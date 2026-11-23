#!/usr/bin/env node
/**
 * gltf_to_glb.mjs
 *
 * Converts a split glTF asset (scene.gltf + scene.bin + textures/) into
 * a self-contained GLB binary blob. The resulting .glb has no external
 * dependencies and can be uploaded to Supabase Storage as a single file.
 *
 * How it works:
 *   1. Reads scene.gltf as JSON.
 *   2. Replaces the external "uri" fields:
 *        buffer  -> base64 data URI of scene.bin
 *        image   -> base64 data URI of textures/default_baseColor.png
 *   3. Updates byteLength to reflect the embedded binary.
 *   4. Packs everything into a valid GLB (Binary glTF) file:
 *        GLB header  (12 bytes)   : magic + version + length + chunkLength + chunkType
 *        JSON chunk               : modified gltf JSON string (padded to 4-byte boundary)
 *        BIN  chunk               : raw scene.bin bytes  (padded to 4-byte boundary)
 *      The PNG texture is inlined as a base64 data URI so no second BIN chunk needed.
 *
 * Usage:
 *   node scripts/gltf_to_glb.mjs
 *
 *   Or with custom paths:
 *   SHIBA_DIR=shiba OUTPUT=shiba_dog.glb node scripts/gltf_to_glb.mjs
 *
 * Output: scripts/gltf_to_glb_output/shiba_dog.glb  (or $OUTPUT if set)
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHIBA_DIR = process.env.SHIBA_DIR ?? resolve(__dirname, "../shiba");
const OUTPUT_PATH = process.env.OUTPUT ?? resolve(__dirname, "gltf_to_glb_output/shiba_dog.glb");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Convert a Buffer to a base64 data URI string. */
function bufferToDataUri(mimeType, buf) {
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}

/** Return the length of a GLB chunk (rounded up to the nearest 4-byte boundary). */
function pad4(n) {
  return Math.ceil(n / 4) * 4;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const gltfPath = join(SHIBA_DIR, "scene.gltf");
const binPath  = join(SHIBA_DIR, "scene.bin");
const texPath = join(SHIBA_DIR, "textures/default_baseColor.png");

if (!existsSync(gltfPath)) die(`scene.gltf not found at: ${gltfPath}`);
if (!existsSync(binPath))  die(`scene.bin  not found at: ${binPath}`);
if (!existsSync(texPath))  die(`textures/default_baseColor.png not found at: ${texPath}`);

console.log("Reading source files...");
const gltfJson  = JSON.parse(readFileSync(gltfPath, "utf8"));
const binBuf    = readFileSync(binPath);
const texBuf    = readFileSync(texPath);

console.log(`  bin  : ${(binBuf.byteLength / 1024).toFixed(1)} KB`);
console.log(`  tex  : ${(texBuf.byteLength / 1024).toFixed(1)} KB  (will be base64 inlined)`);

// ---------------------------------------------------------------------------
// patch 1 – buffer.uri  ->  base64 data URI of scene.bin
// ---------------------------------------------------------------------------

const buffer = gltfJson.buffers?.[0];
if (!buffer) die("No buffers[0] found in scene.gltf");
const originalUri = buffer.uri;   // e.g. "scene.bin"
buffer.uri = bufferToDataUri("application/octet-stream", binBuf);

// Update byteLength to the actual binary size (GLB BIN chunk is the raw .bin)
buffer.byteLength = binBuf.byteLength;

console.log(`\nPatched buffers[0].uri  : "${originalUri}"  ->  base64 data URI (${(binBuf.byteLength / 1024).toFixed(1)} KB)`);
console.log(`Patched buffers[0].byteLength: 133296  ->  ${binBuf.byteLength}`);

// ---------------------------------------------------------------------------
// patch 2 – image[0].uri  ->  base64 data URI of the PNG texture
// ---------------------------------------------------------------------------

const image = gltfJson.images?.[0];
if (!image) die("No images[0] found in scene.gltf");
const originalImgUri = image.uri;  // e.g. "textures/default_baseColor.png"
image.uri = bufferToDataUri("image/png", texBuf);

console.log(`Patched images[0].uri   : "${originalImgUri}"  ->  base64 data URI (${(texBuf.byteLength / 1024).toFixed(1)} KB)`);

// ---------------------------------------------------------------------------
// pack into GLB
// ---------------------------------------------------------------------------

const jsonString = JSON.stringify(gltfJson);
const jsonBytes  = Buffer.from(jsonString, "utf8");
const jsonPadded = Buffer.alloc(pad4(jsonBytes.byteLength));
jsonBytes.copy(jsonPadded);

const binPadded = Buffer.alloc(pad4(binBuf.byteLength));
binBuf.copy(binPadded);

// GLB header: 12 bytes
//   magic: 0x46546C67  ("glTF")
//   version: 2
//   length: total file size
const totalLength =
  12 +                           // header
  8 + pad4(jsonBytes.byteLength) +  // JSON chunk header + content
  8 + pad4(binBuf.byteLength);       // BIN  chunk header + content

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546C67, 0);  // magic
header.writeUInt32LE(2,              4);  // version
header.writeUInt32LE(totalLength,   8);  // length

// JSON chunk header
const jsonChunkHeader = Buffer.alloc(8);
jsonChunkHeader.writeUInt32LE(jsonBytes.byteLength, 0);  // chunkLength
jsonChunkHeader.writeUInt32LE(0x4E4F534A,            4);  // chunkType = JSON

// BIN chunk header
const binChunkHeader = Buffer.alloc(8);
binChunkHeader.writeUInt32LE(binBuf.byteLength, 0);  // chunkLength
binChunkHeader.writeUInt32LE(0x004E4942,         4);  // chunkType = BIN

// Assemble
const glb = Buffer.concat([
  header,
  jsonChunkHeader, jsonPadded,
  binChunkHeader,  binPadded,
]);

// ---------------------------------------------------------------------------
// write output
// ---------------------------------------------------------------------------

const outDir = dirname(OUTPUT_PATH);
mkdirSync(outDir, { recursive: true });
writeFileSync(OUTPUT_PATH, glb);

const sizeKb = (glb.byteLength / 1024).toFixed(1);
console.log(`\n\u2705  Written: ${OUTPUT_PATH}`);
console.log(`   GLB size : ${sizeKb} KB  (${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`);
console.log(`   JSON    : ${(jsonBytes.byteLength / 1024).toFixed(1)} KB`);
console.log(`   BIN     : ${(binBuf.byteLength / 1024).toFixed(1)} KB`);
console.log(`   Texture : embedded as base64 in JSON chunk`);
console.log(`   External refs: 0  (fully self-contained)`);

function die(msg) {
  console.error(`\n\u274c  ${msg}\n`);
  process.exit(1);
}
