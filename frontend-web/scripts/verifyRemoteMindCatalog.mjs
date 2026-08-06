import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { decode } from '@msgpack/msgpack';

const manifestPath = new URL('../public/assets/target/catalogs/animals-v2.manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);
let response;
try {
  response = await fetch(manifest.mindUrl, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
if (!response.ok) {
  throw new Error(`MIND_ARTIFACT_UNAVAILABLE status=${response.status}`);
}
const bytes = new Uint8Array(await response.arrayBuffer());
if (bytes.byteLength === 0) throw new Error('MIND_ARTIFACT_EMPTY');

const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== manifest.sha256) {
  throw new Error(`MIND_ARTIFACT_CHECKSUM_MISMATCH expected=${manifest.sha256} actual=${sha256}`);
}

const decoded = decode(bytes);
if (decoded?.v !== 2) throw new Error(`MIND_FORMAT_INVALID version=${decoded?.v}`);
if (!Array.isArray(decoded?.dataList) || decoded.dataList.length !== manifest.targetCount) {
  throw new Error(`MIND_TARGET_COUNT_MISMATCH expected=${manifest.targetCount} actual=${decoded?.dataList?.length}`);
}

console.log(JSON.stringify({
  catalogId: manifest.catalogId,
  sha256,
  bytes: bytes.byteLength,
  targetCount: decoded.dataList.length,
}));
