// Fetch game assets from Pollinations (free, no key).
// Idempotent: skips files that already exist.
// Usage:  node scripts/fetch-game-cards.mjs
//
// 1) Word-cards -> frontend/public/assets/game-cards/{topic}/{word}.png
// 2) Topic backgrounds -> frontend/public/assets/game-themes/{topic}/bg.png
//    (committed to repo — we do NOT hotlink pollinations at runtime)
import { mkdir, writeFile, stat } from "node:fs/promises";
import { dirname } from "node:path";

const SEED = {
  animals: ["elephant", "lion", "monkey", "fish", "bird", "rabbit", "bear", "duck"],
  home: ["house", "family", "mother", "father", "door", "table", "bed", "chair"],
  nature: ["sun", "tree", "water", "flower", "sky", "rain", "leaf", "stone"],
  school_food: ["book", "pencil", "apple", "rice", "milk", "bag", "pen", "cake"],
};

// Expansion pack 2026-09-06: +6 words per topic (richer rounds)
const EXPANSION = {
  animals: ["penguin", "turtle", "owl", "pig", "cow", "horse"],
  home: ["kitchen", "window", "sofa", "lamp", "garden", "clock"],
  nature: ["cloud", "moon", "star", "river", "mountain", "grass"],
  school_food: ["banana", "bread", "egg", "juice", "ruler", "notebook"],
};

// Claymorphic topic backgrounds (hub + game screens)
const BACKGROUNDS = {
  animals: "3D claymorphic jungle scene background, soft rounded clay trees and rolling hills, cute clay animals peeking from bushes, warm pastel colors, matte clay material, wide establishing shot, kid friendly, no text",
  home: "3D claymorphic cozy living room background, rounded chunky clay furniture, warm pastel colors, matte clay material, soft daylight, kid friendly, no text",
  nature: "3D claymorphic sunny meadow background, rounded clay flowers and puffy clouds, bright pastel colors, matte clay material, kid friendly, no text",
  school_food: "3D claymorphic classroom background, chunky clay blackboard and apples and desks, pastel colors, matte clay material, kid friendly, no text",
};

const OUT_CARDS = "frontend/public/assets/game-cards";
const OUT_THEMES = "frontend/public/assets/game-themes";
const CARD_STYLE = "cute 3D clay render of a single {WORD}, soft pastel colors, chunky rounded toy shapes, matte clay material, centered, plain warm cream background, kid friendly education flashcard, no text";

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function fetchImage(url, file) {
  const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error("image too small, likely failed");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
  return file;
}

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 9999;
}

async function job(word, file, url) {
  if (await exists(file)) { console.log(`SKIP ${file}`); return true; }
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await fetchImage(url, file);
      console.log(`OK  ${file}`);
      return true;
    } catch (e) {
      if (attempt === 2) { console.log(`ERR ${file}: ${e.message}`); return false; }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return false;
}

let ok = 0, fail = 0;
const failed = [];

for (const [topic, words] of Object.entries({ ...SEED, ...EXPANSION })) {
  for (const word of words) {
    const file = `${OUT_CARDS}/${topic}/${word}.png`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(CARD_STYLE.replace("{WORD}", word))}?width=512&height=512&nologo=true&seed=${hash(word)}`;
    const done = await job(word, file, url);
    done ? ok++ : (fail++, failed.push(file));
  }
}

for (const [topic, prompt] of Object.entries(BACKGROUNDS)) {
  const file = `${OUT_THEMES}/${topic}/bg.png`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=768&nologo=true&seed=${hash(topic + "bg")}`;
  const done = await job(topic, file, url);
  done ? ok++ : (fail++, failed.push(file));
}

console.log(`\nDone: ${ok} ok, ${fail} failed.`);
if (failed.length) console.log("Failed:", failed.join(", "));
