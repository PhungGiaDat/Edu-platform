import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve('public/assets/target/catalogs');
const sources = JSON.parse(readFileSync(resolve(root, 'animals-v2.sources.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(root, 'animals-v2.manifest.json'), 'utf8'));

describe('animals-v2 catalog metadata', () => {
  it('keeps the Supabase URL only in the runtime manifest', () => {
    expect(manifest.mindUrl).toMatch(/^https:\/\/[^/]+\.supabase\.co\//);
    expect(manifest.mindUrl).toContain(manifest.sha256);
    expect(sources).not.toHaveProperty('mindUrl');
  });

  it('preserves the reviewed source order and indices', () => {
    expect(manifest.targets).toEqual(sources.targets.map(({ arTag, mindTargetIndex }: any) => ({
      arTag,
      mindTargetIndex,
    })));
    expect(manifest.targets.map((target: any) => target.mindTargetIndex)).toEqual([0, 1]);
  });

});
