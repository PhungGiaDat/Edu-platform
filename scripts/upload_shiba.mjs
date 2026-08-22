#!/usr/bin/env node
/**
 * upload_shiba.mjs
 *
 * One-off script to upload the shiba dog AR assets to the Edu-platform
 * Supabase project (https://rofprrtoeyirssfndxag.supabase.co), bucket
 * `AR_models`.
 *
 * Files uploaded (paths mirror the elephant pattern already in the seed):
 *   models/shiba_dog.glb               <-- self-contained GLB (converted from split glTF)
 *   frontend/model2D/shiba_dog.jpg     <-- 2D reference card
 *   assets/mind-files/shiba_targets.mind <-- MindAR marker(s), OPTIONAL
 *
 * The script prints the final public URLs so you can paste them straight
 * into backend/database/seed/ar_objects.json (already wired in this repo).
 *
 * Usage:
 *   1. Run `node scripts/gltf_to_glb.mjs` first to produce shiba_dog.glb
 *   2. (Optional) Generate `shiba_targets.mind` with your multi-target
 *      MindAR tool and save it on disk.
 *   3. Put your service_role key in scripts/.env  (see .env.example)
 *   4. Run:  node scripts/upload_shiba.mjs
 *
 *   Optional env vars (override .env):
 *        SUPABASE_SERVICE_KEY
 *        SHIBA_GLB_PATH       default: scripts/gltf_to_glb_output/shiba_dog.glb
 *        SHIBA_MIND_PATH      skip .mind upload if not set
 *        SHIBA_2D_PATH        default: ../frontend-web/public/assets/flashcards/shiba_dog.jpg
 *
 * Requires Node.js >= 18 (uses native fetch).
 */

import { readFileSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// load .env (simple no-dependency parser)
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val; // .env does NOT override real env
  }
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://rofprrtoeyirssfndxag.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? "AR_models";

const SHIBA_GLB_PATH = process.env.SHIBA_GLB_PATH
  ?? resolve(__dirname, "gltf_to_glb_output/shiba_dog.glb");
const SHIBA_MIND_PATH = process.env.SHIBA_MIND_PATH; // optional
const SHIBA_2D_PATH =
  process.env.SHIBA_2D_PATH ??
  resolve(__dirname, "../frontend-web/public/assets/flashcards/shiba_dog.jpg");

const UPLOADS = [
  {
    local: SHIBA_2D_PATH,
    remote: "frontend/model2D/shiba_dog.jpg",
    contentType: "image/jpeg",
    required: true,
    description: "2D reference card for AR viewfinder",
  },
  {
    local: SHIBA_GLB_PATH,
    remote: "models/shiba_dog.glb",
    contentType: "model/gltf-binary",
    required: true,
    description: "Self-contained 3D GLB model (bin + texture embedded)",
  },
  {
    local: SHIBA_MIND_PATH,
    remote: "assets/mind-files/shiba_targets.mind",
    contentType: "application/octet-stream",
    required: false,
    description: "MindAR .mind target file (optional)",
  },
];

// ---------------------------------------------------------------------------
// utils
// ---------------------------------------------------------------------------

function die(msg) {
  console.error(`\n\u274c  ${msg}\n`);
  process.exit(1);
}

function ok(msg)  { console.log(`\u2705  ${msg}`); }
function info(msg) { console.log(`\ud83d\udd0e  ${msg}`); }
function warn(msg) { console.log(`\u26a0\ufe0f  ${msg}`); }

function publicUrl(remotePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${remotePath}`;
}

async function uploadOne({ local, remote, contentType, required, description }) {
  if (!local) {
    if (required) die(`Missing local path for required file: ${remote}`);
    warn(`Skipping optional ${remote} (no path provided).`);
    return null;
  }
  if (!existsSync(local)) {
    if (required) die(`Local file not found: ${local}`);
    warn(`Optional file missing, skipping: ${local}`);
    return null;
  }

  const sizeKb = (statSync(local).size / 1024).toFixed(1);
  const body   = readFileSync(local);
  const url    = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${remote}`;

  info(`Uploading ${description}`);
  info(`  file : ${local}`);
  info(`  size : ${sizeKb} KB`);
  info(`  dest : ${remote}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    die(`Upload failed (HTTP ${res.status}): ${errText}`);
  }

  ok(`Uploaded: ${remote}`);
  return publicUrl(remote);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    die(
      "SUPABASE_SERVICE_KEY env var is required.\n" +
      "Get it from Supabase dashboard -> Project Settings -> API -> service_role key."
    );
  }

  console.log("\n========================================");
  console.log("  Shiba AR — Supabase Upload Script");
  console.log("========================================\n");
  info(`Supabase project: ${SUPABASE_URL}`);
  info(`Bucket           : ${BUCKET}`);
  info(`GLB path        : ${SHIBA_GLB_PATH}`);
  info(`2D image path   : ${SHIBA_2D_PATH}`);
  info(`MIND path       : ${SHIBA_MIND_PATH ?? "(optional — skip)"}`);
  console.log("");

  const results = {};
  for (const item of UPLOADS) {
    const url = await uploadOne(item);
    if (url) results[item.remote] = url;
  }

  console.log("\n========================================");
  console.log("  Upload complete — final public URLs");
  console.log("========================================\n");
  for (const [remote, url] of Object.entries(results)) {
    console.log(`  ${remote.padEnd(42)}  ${url}`);
  }

  // Paste-ready JSON snippet for ar_objects.json
  if (results["models/shiba_dog.glb"]) {
    console.log("\n========================================");
    console.log("  Paste-ready ar_objects.json snippet");
    console.log("  (shiba_marker_01 — replace the existing entry)");
    console.log("========================================\n");
    const nftUrl = results["assets/mind-files/shiba_targets.mind"] ?? null;
    const snippet = {
      ar_tag: "shiba_marker_01",
      description:
        "A small, alert Japanese shiba dog 3D model with idle wiggle animation for AR vocabulary learning",
      animation_type: "wiggle",
      glb_size: parseFloat((statSync(SHIBA_GLB_PATH).size / (1024 * 1024)).toFixed(2)),
      nft_base_url: nftUrl,
      model_3d_url: results["models/shiba_dog.glb"],
      image_2d_url: results["frontend/model2D/shiba_dog.jpg"],
      position: "0 0.1 0",
      rotation: "0 180 0",
      scale: "0.5 0.5 0.5",
      created_at: "2025-07-03T12:00:00Z",
    };
    console.log(JSON.stringify(snippet, null, 2));
    console.log("");
    if (!nftUrl) {
      warn("NOTE: nft_base_url is null — set SHIBA_MIND_PATH and re-run to include it.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
