/**
 * @file Runtime smoke tests for the AR bridge DTO mappers.
 *
 * Why this file exists: `mobile/rn` has no Jest infra (no `jest.config*`,
 * no `test` script in package.json). Adding Jest is a substantial infra
 * change that goes beyond M1A's contract-spec scope, so this file uses
 * Node's built-in test runner (`node:test`) plus `--experimental-strip-types`
 * (Node 22+). No new dependencies.
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          "--import=data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/ARExperienceMapper.test.ts
 *
 * The companion `ts-resolver-hook.mjs` (in `mobile/rn/`) patches ESM
 * resolution to append `.ts` / `.tsx` so internal imports resolve under
 * raw Node. Metro does this automatically; the test runner does not.
 *
 * Scope: this test ONLY exercises the two mapper functions (`mapToUnityPayload`,
 * `mapToCardDescriptor`) plus the corrected `CardDescriptorSource` return type.
 *
 * M1A-CORRECTION (2026-08-10): Tests updated to enforce the corrected contract:
 *   - reference_image_url and physical_width_m are REQUIRED per spec §K-3
 *   - modelUrl MUST NOT be substituted for missing reference_image_url
 *   - DEFAULT_PHYSICAL_WIDTH_M MUST NOT be substituted for missing physical_width_m
 *   - When either is missing, mapper returns `{ kind: 'unavailable', reason }`
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mapToUnityPayload,
  mapToCardDescriptor,
} from '../bridge/ARExperienceMapper';
import type { ARExperienceResponse } from '../types/api';

/**
 * Test-only fixture constant — declared here so it lives in the test file
 * rather than production source. Production code MUST NOT use this.
 *
 * ⚠️ NOT an approved production default. Spec `mobile-ar-product-spec.md §K-3`
 * requires `physical_width_m` from backend. The mapper (`mapToCardDescriptor`)
 * MUST NOT fall back to this value — when the backend field is missing it
 * returns `{ kind: 'unavailable', reason }`.
 */
export const DEFAULT_PHYSICAL_WIDTH_M = 0.08;

const baseResponse: ARExperienceResponse = {
  qr_id: 'cat-meow',
  word: 'cat',
  translation_vi: 'con mèo',
  audio_url: 'https://cdn.example/audio/cat.mp3',
  model_url: 'https://cdn.example/models/cat.glb',
  animation_type: 'idle',
  glb_size: 1.2,
  position: '0 0 0',
  rotation: '0 0 0',
  scale: '1 1 1',
};

// ---------------------------------------------------------------------------
// mapToUnityPayload — single-card experience mapping (unchanged from M1A)
// ---------------------------------------------------------------------------

test('mapToUnityPayload maps every snake_case field to its camelCase RN twin', () => {
  const payload = mapToUnityPayload(baseResponse);

  assert.equal(payload.qrId, 'cat-meow');
  assert.equal(payload.word, 'cat');
  assert.equal(payload.translationVi, 'con mèo');
  assert.equal(payload.audioUrl, baseResponse.audio_url);
  assert.equal(payload.modelUrl, baseResponse.model_url);
  assert.equal(payload.animationType, 'idle');
  assert.equal(payload.glbSize, 1.2);
  assert.equal(payload.position, '0 0 0');
  assert.equal(payload.rotation, '0 0 0');
  assert.equal(payload.scale, '1 1 1');
});

test('mapToUnityPayload does NOT leak referenceImageUrl / physicalWidthMeters', () => {
  // These fields belong to CardDescriptorRN, not UnityARExperiencePayload
  // (M1 acceptance gate).
  const payload = mapToUnityPayload({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
    physical_width_m: 0.085,
  } as ARExperienceResponse & { reference_image_url: string; physical_width_m: number });

  assert.equal(
    (payload as unknown as Record<string, unknown>).referenceImageUrl,
    undefined,
    'UnityARExperiencePayload must not carry referenceImageUrl',
  );
  assert.equal(
    (payload as unknown as Record<string, unknown>).physicalWidthMeters,
    undefined,
    'UnityARExperiencePayload must not carry physicalWidthMeters',
  );
});

// ---------------------------------------------------------------------------
// mapToCardDescriptor — multi-card descriptor mapping (M1A-CORRECTION)
//
// Per `mobile-ar-product-spec.md §K-3`:
//   - imageUrl MUST come from backend reference_image_url
//   - physicalWidthMeters MUST come from backend physical_width_m
//
// There is NO approved production fallback. Missing fields produce
// `{ kind: 'unavailable', reason }` so downstream code routes to
// validation / error paths.
// ---------------------------------------------------------------------------

test('mapToCardDescriptor returns ok when both backend native fields are present', () => {
  const result = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
    physical_width_m: 0.085,
  } as ARExperienceResponse & { reference_image_url: string; physical_width_m: number });

  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;
  assert.deepEqual(result.descriptor, {
    qrId: 'cat-meow',
    imageUrl: 'https://cdn.example/refs/cat.jpg',
    physicalWidthMeters: 0.085,
  });
});

test('mapToCardDescriptor returns unavailable when reference_image_url is missing (NEVER substitutes modelUrl)', () => {
  // Spec §K-3: imageUrl MUST be reference_image_url. A 3D model URL is not a
  // reference image URL — silent substitution is forbidden.
  // When reference_image_url is missing AND physical_width_m is also missing,
  // reason will be 'both'. To isolate 'missing_reference_image', we provide
  // physical_width_m so only the image is missing.
  const result = mapToCardDescriptor({
    ...baseResponse,
    physical_width_m: 0.085,
  } as ARExperienceResponse & { physical_width_m: number });

  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_reference_image');
  assert.equal(result.qrId, 'cat-meow');
  // CRITICAL: imageUrl field MUST NOT exist in unavailable result
  assert.equal(
    (result as unknown as Record<string, unknown>).imageUrl,
    undefined,
    'unavailable result must not leak an imageUrl',
  );
});

test('mapToCardDescriptor returns unavailable when physical_width_m is missing (NEVER substitutes default)', () => {
  const result = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
  } as ARExperienceResponse & { reference_image_url: string });

  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
  assert.equal(result.qrId, 'cat-meow');
});

test('mapToCardDescriptor returns unavailable with reason=both when both fields missing', () => {
  // When neither reference_image_url nor physical_width_m is present, the
  // mapper discriminates reason as 'both' (most specific).
  const result = mapToCardDescriptor(baseResponse);

  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'both');
  assert.equal(result.qrId, 'cat-meow');

  // Empty string for reference_image_url counts as missing — still 'both'
  const result2 = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: '',
  } as ARExperienceResponse & { reference_image_url: string });

  assert.equal(result2.kind, 'unavailable');
  if (result2.kind !== 'unavailable') return;
  assert.equal(result2.reason, 'both');

  // Non-positive physical_width_m counts as missing
  const result3 = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
    physical_width_m: 0,
  } as ARExperienceResponse & { reference_image_url: string; physical_width_m: number });

  assert.equal(result3.kind, 'unavailable');
  if (result3.kind !== 'unavailable') return;
  assert.equal(result3.reason, 'missing_physical_width');

  // NaN / Infinity also count as missing
  const result4 = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
    physical_width_m: Number.NaN,
  } as ARExperienceResponse & { reference_image_url: string; physical_width_m: number });

  assert.equal(result4.kind, 'unavailable');
});

test('mapToCardDescriptor does NOT contain modelUrl in ok result', () => {
  const result = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
    physical_width_m: 0.085,
  } as ARExperienceResponse & { reference_image_url: string; physical_width_m: number });

  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;
  // The descriptor must have imageUrl from reference_image_url, NOT modelUrl
  assert.equal(result.descriptor.imageUrl, 'https://cdn.example/refs/cat.jpg');
  assert.notEqual(result.descriptor.imageUrl, baseResponse.model_url);
});

test('mapToCardDescriptor does NOT use DEFAULT_PHYSICAL_WIDTH_M as production fallback', () => {
  // Verify that when physical_width_m is missing, the result is unavailable
  // (not silently coerced to 0.08).
  const result = mapToCardDescriptor({
    ...baseResponse,
    reference_image_url: 'https://cdn.example/refs/cat.jpg',
    // physical_width_m intentionally absent
  } as ARExperienceResponse & { reference_image_url: string });

  assert.equal(result.kind, 'unavailable');
  // physicalWidthMeters field must NOT be present in unavailable result
  if (result.kind === 'unavailable') {
    assert.equal(
      (result as unknown as Record<string, unknown>).physicalWidthMeters,
      undefined,
      'unavailable result must not leak a physicalWidthMeters value',
    );
  }
});
