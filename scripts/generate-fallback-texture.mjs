// Generate a tiny local colormap fallback PNG so legacy split-file GLB models
// (that reference e.g. Supabase-hosted colormap.png) have something to render
// against when the remote texture is unavailable (404/504/CORS).
//
// The output is a 2x2 semi-transparent gradient PNG, ~80 bytes — small enough
// to ship inline without bloating the bundle.
//
// Run: `node scripts/generate-fallback-texture.mjs`
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'frontend-web', 'public', 'textures', 'colormap-fallback.png');

const WIDTH = 2;
const HEIGHT = 2;
const CHANNELS = 4; // RGBA

// Pixel data: 4 pixels (semi-transparent warm beige so the model isn't pure white).
const pixels = Buffer.alloc(WIDTH * HEIGHT * CHANNELS);
const row = (WIDTH * CHANNELS);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const i = y * row + x * CHANNELS;
    pixels[i] = 245;     // R
    pixels[i + 1] = 222; // G
    pixels[i + 2] = 184; // B
    pixels[i + 3] = 255; // A
  }
}

// Add the per-row filter byte (0 = no filter) at the start of each row.
const raw = Buffer.alloc((row + 1) * HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  raw[y * (row + 1)] = 0;
  pixels.copy(raw, y * (row + 1) + 1, y * row, y * row + row);
}
const idatData = deflateRawSync(raw);

// CRC table (PNG uses CRC32 for chunk integrity).
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

// PNG signature
const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr.writeUInt8(8, 8);   // bit depth
ihdr.writeUInt8(6, 9);   // color type RGBA
ihdr.writeUInt8(0, 10);  // compression
ihdr.writeUInt8(0, 11);  // filter
ihdr.writeUInt8(0, 12);  // interlace

// IDAT — PNG requires zlib (deflate with header + adler32). deflateRawSync
// skips the header and trailer, so prepend the zlib header and append the
// adler32 of the raw data.
const adler = (() => {
  let a = 1, b = 0;
  for (let i = 0; i < raw.length; i++) {
    a = (a + raw[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
})();
const adlerBuf = Buffer.alloc(4);
adlerBuf.writeUInt32BE(adler, 0);
const zlibHeader = Buffer.from([0x78, 0x01]);
const idatPayload = Buffer.concat([zlibHeader, idatData, adlerBuf]);

const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', idatPayload),
  chunk('IEND', Buffer.alloc(0)),
]);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, png);
console.log(`Wrote ${outPath} (${png.length} bytes, ${WIDTH}x${HEIGHT} RGBA)`);