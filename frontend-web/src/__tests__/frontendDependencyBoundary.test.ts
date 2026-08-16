import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve('.');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

describe('frontend deployment dependency boundary', () => {
  it('pins the same Node major used by Vercel', () => {
    expect(pkg.engines?.node).toBe('24.x');
    expect(readFileSync(resolve(root, '.nvmrc'), 'utf8').trim()).toBe('24');
  });

  it.each([
    'mind-ar',
    '@napi-rs/canvas',
    '@tensorflow/tfjs-node',
    'canvas',
    'msgpackr',
    'puppeteer',
  ])('does not install compiler-only package %s', (name) => {
    expect(pkg.dependencies?.[name]).toBeUndefined();
    expect(pkg.devDependencies?.[name]).toBeUndefined();
  });

  it.each([
    'scripts/buildMindCatalog.mjs',
    'scripts/mindar-loader.mjs',
    'scripts/tfjs-node-entry.mjs',
    'scripts/.tfjs-shim.mjs',
  ])('does not ship compiler file %s', (relativePath) => {
    expect(existsSync(resolve(root, relativePath))).toBe(false);
  });

  it('keeps the browser runtime and QR vendor step', () => {
    expect(pkg.scripts['ar:catalog:build']).toBeUndefined();
    expect(pkg.scripts.postinstall).toBe('node scripts/vendor-jsqr.cjs');
    expect(existsSync(resolve(root, 'public/static/vendor/mindar-image-aframe-1.2.5.prod.js'))).toBe(true);
  });
});
