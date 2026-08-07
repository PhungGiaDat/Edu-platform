// src/image-utils.ts — shared image dimension parsing and validation
//
// Pure-Node image utilities used by both the validate tools and the
// compile tool. No native deps beyond pngjs for PNG; JPEG/WebP parsing
// is hand-rolled to avoid sharp/canvas dependencies.

import { promises as fs } from 'node:fs';

export const EXT_OK = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const MIN_W = 480;
export const MIN_H = 480;
export const MAX_W = 2048;
export const MAX_H = 2048;
export const MIN_BYTES = 10_000;
export const MAX_BYTES = 8_000_000;

export interface ImageDims {
  w: number;
  h: number;
  format: 'png' | 'jpeg' | 'webp';
}

export function readPngDimensions(buf: Buffer): ImageDims | null {
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) {
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    return { w, h, format: 'png' };
  }
  return null;
}

export function readJpegDimensions(buf: Buffer): ImageDims | null {
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const segLen = buf.readUInt16BE(i + 2);
    if (
      marker >= 0xc0 && marker <= 0xcf &&
      marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    ) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return { w, h, format: 'jpeg' };
    }
    i += 2 + segLen;
  }
  return null;
}

export function readWebpDimensions(buf: Buffer): ImageDims | null {
  if (
    !(buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) ||
    !(buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50)
  ) return null;

  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    const w = (buf.readUInt16LE(26) & 0x3fff);
    const h = (buf.readUInt16LE(28) & 0x3fff);
    return { w, h, format: 'webp' };
  }
  if (chunk === 'VP8L') {
    const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
    const w = 1 + (((b1 & 0x3f) << 8) | b0);
    const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { w, h, format: 'webp' };
  }
  return null;
}

export function readImageDimensions(buf: Buffer): ImageDims | null {
  return readPngDimensions(buf) ?? readJpegDimensions(buf) ?? readWebpDimensions(buf);
}

export interface Issue {
  level: 'FAIL' | 'WARN';
  code: string;
  msg: string;
}

export interface ImageCheckResult {
  file: string;
  size: number;
  dim: ImageDims | null;
  issues: Issue[];
}

export async function checkImage(file: string): Promise<ImageCheckResult> {
  const buf = await fs.readFile(file);
  const ext = file.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  const issues: Issue[] = [];

  if (!EXT_OK.has(ext)) {
    issues.push({ level: 'FAIL', code: 'UNSUPPORTED_FORMAT', msg: `Format ${ext} not supported; use JPG, PNG, or WebP` });
  }
  if (buf.byteLength < MIN_BYTES) {
    issues.push({ level: 'FAIL', code: 'TOO_SMALL', msg: `File < ${MIN_BYTES} bytes (likely empty or corrupted)` });
  }
  if (buf.byteLength > MAX_BYTES) {
    issues.push({ level: 'WARN', code: 'TOO_LARGE', msg: `File > ${MAX_BYTES / 1e6}MB; consider compressing` });
  }

  const dim = readImageDimensions(buf);
  if (!dim) {
    issues.push({ level: 'FAIL', code: 'CANNOT_READ_DIM', msg: 'Unable to read image dimensions' });
  } else {
    if (dim.w < MIN_W || dim.h < MIN_H) {
      issues.push({
        level: 'FAIL', code: 'LOW_RES',
        msg: `Resolution ${dim.w}x${dim.h} below minimum ${MIN_W}x${MIN_H}; tracking will be unreliable`,
      });
    }
    if (dim.w > MAX_W || dim.h > MAX_H) {
      issues.push({
        level: 'FAIL', code: 'HIGH_RES',
        msg: `Resolution ${dim.w}x${dim.h} above maximum ${MAX_W}x${MAX_H}; exceeds MindAR limits`,
      });
    }
    const aspect = dim.w / dim.h;
    if (aspect < 0.5 || aspect > 2.0) {
      issues.push({
        level: 'WARN', code: 'EXTREME_ASPECT',
        msg: `Aspect ratio ${aspect.toFixed(2)} outside recommended 0.5-2.0 range`,
      });
    }
  }

  return { file, size: buf.byteLength, dim, issues };
}