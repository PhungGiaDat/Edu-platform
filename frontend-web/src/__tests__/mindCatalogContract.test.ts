import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decode } from '@msgpack/msgpack';
import { describe, expect, it } from 'vitest';

const catalogRoot = resolve('public/assets/target/catalogs');
const sources = JSON.parse(readFileSync(resolve(catalogRoot, 'animals-v2.sources.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(catalogRoot, 'animals-v2.manifest.json'), 'utf8'));
const mindBytes = readFileSync(resolve(catalogRoot, 'animals-v2.mind'));
const decoded = decode(mindBytes) as { v: number; dataList: unknown[] };

const lessonRows = JSON.parse(readFileSync(resolve('../backend/database/seed/lessons.json'), 'utf8'));
const objectRows = JSON.parse(readFileSync(resolve('../backend/database/seed/ar_objects.json'), 'utf8'));

describe('animals-v2 MindAR catalog', () => {
  it('preserves the explicit tag/index map', () => {
    expect(manifest.targets).toEqual(sources.targets.map((target: any) => ({
      arTag: target.arTag,
      mindTargetIndex: target.mindTargetIndex,
    })));
    expect(manifest.targetCount).toBe(2);
  });

  it('matches the compiled artifact', () => {
    expect(decoded.v).toBe(2);
    expect(decoded.dataList).toHaveLength(manifest.targetCount);
    expect(createHash('sha256').update(mindBytes).digest('hex')).toBe(manifest.sha256);
  });

  it('matches lesson and AR object seeds', () => {
    const lesson = lessonRows.find((row: any) => row.lesson_id === 'animals_001');
    expect(lesson.mind_catalog_id).toBe(manifest.catalogId);
    expect(lesson.mind_file_url).toBe(manifest.mindUrl);
    for (const target of manifest.targets) {
      const row = objectRows.find((candidate: any) => candidate.ar_tag === target.arTag);
      expect(row).toMatchObject({
        nft_base_url: manifest.mindUrl,
        mind_catalog_id: manifest.catalogId,
        mind_target_index: target.mindTargetIndex,
      });
    }
  });
});
