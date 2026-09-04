// Fetch word-card images for topic mini-games from Pollinations (free, no key).
// Usage:  node scripts/fetch-game-cards.mjs
// Saves to frontend/public/assets/game-cards/{topic}/{word}.png (committed to repo —
// we do NOT hotlink pollinations at runtime).
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const SEED = {
  animals: ["elephant", "lion", "monkey", "fish", "bird", "rabbit", "bear", "duck"],
  home: ["house", "family", "mother", "father", "door", "table", "bed", "chair"],
  nature: ["sun", "tree", "water", "flower", "sky", "rain", "leaf", "stone"],
  school_food: ["book", "pencil", "apple", "rice", "milk", "bag", "pen", "cake"],
};

const OUT = "frontend/public/assets/game-cards";
const STYLE = "cute 3D clay render of a single {WORD}, soft pastel colors, chunky rounded toy shapes, matte clay material, centered, plain warm cream background, kid friendly education flashcard, no text";

async function fetchOne(word, topic, attempt = 1) {
  const prompt = encodeURIComponent(STYLE.replace("{WORD}", word));
  const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&nologo=true&seed=${hash(word)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error("image too small, likely failed");
  const file = `${OUT}/${topic}/${word}.png`;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, buf);
  return file;
}

function hash(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 9999;
}

let ok = 0, fail = 0;
const failed = [];
for (const [topic, words] of Object.entries(SEED)) {
  for (const word of words) {
    let done = false;
    for (let attempt = 1; attempt <= 2 && !done; attempt++) {
      try {
        await fetchOne(word, topic, attempt);
        ok++;
        done = true;
        console.log(`OK  ${topic}/${word}.png`);
      } catch (e) {
        if (attempt === 2) { fail++; failed.push(`${topic}/${word}`); console.log(`ERR ${topic}/${word}: ${e.message}`); }
        else await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }
}
console.log(`\nDone: ${ok} fetched, ${fail} failed.`);
if (failed.length) console.log("Failed list:", failed.join(", "));
