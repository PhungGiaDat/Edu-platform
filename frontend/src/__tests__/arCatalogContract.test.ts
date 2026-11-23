import { describe, expect, it, vi } from 'vitest';
import {
  type MindCatalogManifest,
  preflightRequiredGlb,
  validateCardForCatalog,
} from '@/features/ar/components/arCatalogContract';

const manifest: MindCatalogManifest = {
  schemaVersion: 1,
  catalogId: 'animals-v2',
  mindUrl: '/assets/target/catalogs/animals-v2.mind',
  targetCount: 2,
  sha256: 'a'.repeat(64),
  targets: [
    { arTag: 'elephant_marker_01', mindTargetIndex: 0 },
    { arTag: 'shiba_marker_01', mindTargetIndex: 1 },
  ],
};

describe('validateCardForCatalog', () => {
  it('keeps slot identity separate from mind target index', () => {
    expect(
      validateCardForCatalog(
        {
          arTag: 'shiba_marker_01',
          mindCatalogId: 'animals-v2',
          mindUrl: manifest.mindUrl,
          mindTargetIndex: 1,
        },
        manifest,
      ),
    ).toMatchObject({ arTag: 'shiba_marker_01', mindTargetIndex: 1 });
  });

  it('rejects a catalog mismatch', () => {
    expect(() =>
      validateCardForCatalog(
        {
          arTag: 'shiba_marker_01',
          mindCatalogId: 'animals-v3',
          mindUrl: manifest.mindUrl,
          mindTargetIndex: 1,
        },
        manifest,
      ),
    ).toThrow('MIND_CATALOG_MISMATCH');
  });

  it('rejects an out-of-range target index', () => {
    expect(() =>
      validateCardForCatalog(
        {
          arTag: 'shiba_marker_01',
          mindCatalogId: 'animals-v2',
          mindUrl: manifest.mindUrl,
          mindTargetIndex: 7,
        },
        manifest,
      ),
    ).toThrow('MIND_TARGET_INDEX_INVALID');
  });
});

describe('preflightRequiredGlb', () => {
  it('rejects a non-GLB response without suggesting 2D', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('missing', { status: 404 })),
    );
    await expect(
      preflightRequiredGlb('/missing.glb', new AbortController().signal),
    ).rejects.toThrow('MODEL_ASSET_UNAVAILABLE');
  });

  it('rejects a payload whose first bytes are not glTF magic', async () => {
    const gltfBody = new TextEncoder().encode('NOTglb').buffer;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(gltfBody, {
          status: 206,
          headers: { 'Content-Type': 'model/gltf-binary' },
        }),
      ),
    );
    await expect(
      preflightRequiredGlb('/mismatch.glb', new AbortController().signal),
    ).rejects.toThrow('MODEL_ASSET_INVALID');
  });
});
