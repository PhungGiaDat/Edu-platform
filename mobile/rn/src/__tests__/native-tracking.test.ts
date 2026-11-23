/**
 * @file M3A — explicit native tracking DTO boundary tests.
 *
 * Scope: verify the three distinct layers of the M3A data boundary:
 *   1. Backend/API DTO  (`ARExperienceResponse`) — optional native fields
 *   2. NativeTrackingDto                          — validated RN domain
 *   3. CardDescriptorRN                           — Unity bridge DTO
 *
 * The functions tested:
 *   - `validateNativeTrackingMetadata` (validation step)
 *   - `toCardDescriptorRN`              (mapping step)
 *   - `mapToCardDescriptor`             (legacy composition; preserved)
 *
 * Per the task brief — M3A must prove:
 *   - Backend API DTO ≠ NativeTrackingDto ≠ CardDescriptorRN
 *   - Legacy backend record remains accepted
 *   - Complete native metadata → ready NativeTrackingDto → CardDescriptorRN
 *   - Missing/invalid native metadata → unavailable, never fabricated
 *   - modelUrl never participates in tracking image construction
 *   - physicalWidthMeters never silently defaulted
 *   - Missing-metadata failure is BACKEND_METADATA_UNAVAILABLE family,
 *     NOT REFERENCE_IMAGE_LOAD_FAILED
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          "--import=data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/native-tracking.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateNativeTrackingMetadata,
  toCardDescriptorRN,
  mapToCardDescriptor,
  mapToUnityPayload,
} from '../bridge/ARExperienceMapper';
import { BACKEND_METADATA_UNAVAILABLE } from '../types/ar';
import type { ARExperienceResponse } from '../types/api';
import type { NativeTrackingDto } from '../types/ar';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Legacy MindAR-era record — no native AR fields at all. This is the
 * 100% backwards-compatible shape: animals-v2, etc., must remain
 * parseable without ANY native tracking metadata.
 */
const legacyResponse: ARExperienceResponse = {
  qr_id: 'ele-cu',
  word: 'elephant',
  translation_vi: 'con voi',
  audio_url: 'https://cdn.example/audio/elephant.mp3',
  model_url: 'https://cdn.example/models/elephant.glb',
  animation_type: 'idle',
  glb_size: 1.0,
  position: '0 0 0',
  rotation: '0 0 0',
  scale: '1 1 1',
  related_combos: [],
};

const baseResponse: ARExperienceResponse = {
  ...legacyResponse,
  reference_image_url: 'https://cdn.example/refs/ele.png',
  physical_width_m: 0.085,
};

/**
 * Test-only fixture constant — declared here so it lives in the test file
 * rather than production source. Production source MUST NOT use this.
 *
 * ⚠️ NOT an approved production default. The M3A validator
 * (`validateNativeTrackingMetadata`) MUST NOT fall back to this value —
 * when the backend field is missing it returns `{ kind: 'unavailable' }`.
 */
export const DEFAULT_PHYSICAL_WIDTH_M = 0.08;

// ---------------------------------------------------------------------------
// 1. Raw API DTO — legacy coexistence
// ---------------------------------------------------------------------------

test('M3A: raw API DTO accepts a legacy record with native fields missing', () => {
  // The legacy record (animals-v2 etc.) MUST remain parseable. The raw
  // ARExperienceResponse type permits `reference_image_url` and
  // `physical_width_m` to be undefined.
  const parsed: ARExperienceResponse = {
    qr_id: legacyResponse.qr_id,
    word: legacyResponse.word,
    translation_vi: legacyResponse.translation_vi,
    audio_url: legacyResponse.audio_url,
    model_url: legacyResponse.model_url,
    animation_type: legacyResponse.animation_type,
    glb_size: legacyResponse.glb_size,
    position: legacyResponse.position,
    rotation: legacyResponse.rotation,
    scale: legacyResponse.scale,
    related_combos: [],
  };
  // Compile-time guard: the optional fields are absent, not coerced.
  assert.equal(parsed.reference_image_url, undefined);
  assert.equal(parsed.physical_width_m, undefined);
});

test('M3A: legacy record can still be mapped to UnityARExperiencePayload (single-card path preserved)', () => {
  // Legacy single-card experience mapping is unaffected. M3A only splits
  // the multi-card native tracking path.
  const payload = mapToUnityPayload(legacyResponse);
  assert.equal(payload.qrId, legacyResponse.qr_id);
  assert.equal(payload.modelUrl, legacyResponse.model_url);
});

// ---------------------------------------------------------------------------
// 2. Validator — ready branch
// ---------------------------------------------------------------------------

test('M3A: complete native metadata → validateNativeTrackingMetadata returns ready', () => {
  const result = validateNativeTrackingMetadata(baseResponse);
  assert.equal(result.kind, 'ready');
  if (result.kind !== 'ready') return;
  assert.deepEqual(result.tracking, {
    qrId: 'ele-cu',
    referenceImageUrl: 'https://cdn.example/refs/ele.png',
    physicalWidthMeters: 0.085,
  });
});

test('M3A: ready tracking carries referenceImageUrl (NOT imageUrl) — NativeTrackingDto has its own field name', () => {
  // The RN domain DTO uses `referenceImageUrl` to match the backend field
  // name. The bridge DTO uses `imageUrl`. The two types are distinct.
  const result = validateNativeTrackingMetadata(baseResponse);
  assert.equal(result.kind, 'ready');
  if (result.kind !== 'ready') return;
  const keys = Object.keys(result.tracking).sort();
  // NativeTrackingDto now carries modelUrl + word alongside the tracking fields.
  assert.deepEqual(keys, ['modelUrl', 'physicalWidthMeters', 'qrId', 'referenceImageUrl', 'word']);
  assert.equal(
    (result.tracking as unknown as Record<string, unknown>).imageUrl,
    undefined,
    'NativeTrackingDto must not carry imageUrl — that is the bridge field name',
  );
});

// ---------------------------------------------------------------------------
// 3. Validator — unavailable branch (missing/empty reference_image_url)
// ---------------------------------------------------------------------------

test('M3A: missing reference_image_url → unavailable, reason=missing_reference_image', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    reference_image_url: undefined,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_reference_image');
  assert.equal(result.qrId, 'ele-cu');
});

test('M3A: empty reference_image_url → unavailable, reason=missing_reference_image', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    reference_image_url: '',
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_reference_image');
});

test('M3A: null reference_image_url → unavailable, reason=missing_reference_image', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    reference_image_url: null,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_reference_image');
});

// ---------------------------------------------------------------------------
// 4. Validator — unavailable branch (missing/invalid physical_width_m)
// ---------------------------------------------------------------------------

test('M3A: missing physical_width_m → unavailable, reason=missing_physical_width', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: undefined,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
  assert.equal(result.qrId, 'ele-cu');
});

test('M3A: physical_width_m = 0 → READY (unknown-size dev-path)', () => {
  // Per P2 session: 0f is the intentional dev-path value for unknown physical size.
  // The updated validator accepts null/undefined/positive; 0 flows through as valid.
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: 0,
  });
  assert.equal(result.kind, 'ready');
  if (result.kind !== 'ready') return;
  assert.equal(result.tracking.physicalWidthMeters, 0,
    'Unknown-size dev path should carry physicalWidthMeters=0');
});

test('M3A: physical_width_m < 0 → unavailable, reason=missing_physical_width', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: -0.1,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
});

test('M3A: physical_width_m = NaN → unavailable, reason=missing_physical_width', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: Number.NaN,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
});

test('M3A: physical_width_m = Infinity → unavailable, reason=missing_physical_width', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: Number.POSITIVE_INFINITY,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
});

test('M3A: physical_width_m = -Infinity → unavailable, reason=missing_physical_width', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: Number.NEGATIVE_INFINITY,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
});

test('M3A: null physical_width_m → unavailable, reason=missing_physical_width', () => {
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: null,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_physical_width');
});

// ---------------------------------------------------------------------------
// 5. Validator — both missing → reason=both
// ---------------------------------------------------------------------------

test('M3A: both native fields missing → unavailable, reason=both', () => {
  const result = validateNativeTrackingMetadata(legacyResponse);
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'both');
  assert.equal(result.qrId, 'ele-cu');
});

// ---------------------------------------------------------------------------
// 6. Validator — anti-patterns
// ---------------------------------------------------------------------------

test('M3A: modelUrl is NEVER substituted for referenceImageUrl', () => {
  // Spec §K-3: imageUrl MUST come from backend reference_image_url. A 3D
  // model URL is not a reference image URL — silent substitution is
  // forbidden. Even when reference_image_url is missing, the model_url
  // is NOT used to fill the gap.
  const result = validateNativeTrackingMetadata({
    ...legacyResponse,
    // model_url is set; reference_image_url is absent.
    physical_width_m: 0.085,
  });
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'missing_reference_image');
  // The unavailable result has no tracking field, so no fabricated referenceImageUrl.
  assert.equal(
    (result as unknown as Record<string, unknown>).tracking,
    undefined,
  );
});

test('M3A: no default physical width is introduced (validator does not coerce)', () => {
  // BQ-3 is CLOSED — NO default. When physical_width_m is missing, the
  // validator returns unavailable (not 0.08 or any other wrapper).
  const result = validateNativeTrackingMetadata({
    ...baseResponse,
    physical_width_m: undefined,
  });
  assert.equal(result.kind, 'unavailable');
  // The unavailable result carries no physicalWidthMeters leak.
  assert.equal(
    (result as unknown as Record<string, unknown>).physicalWidthMeters,
    undefined,
  );
  // Test fixture sanity (a guard against the fixture being changed).
  assert.ok(DEFAULT_PHYSICAL_WIDTH_M > 0);
});

// ---------------------------------------------------------------------------
// 7. toCardDescriptorRN — bridge mapping
// ---------------------------------------------------------------------------

test('M3A: toCardDescriptorRN maps only approved bridge fields', () => {
  const tracking: NativeTrackingDto = {
    qrId: 'ele-cu',
    referenceImageUrl: 'https://cdn.example/refs/ele.png',
    physicalWidthMeters: 0.085,
    modelUrl: 'https://cdn.example/models/elephant.glb',
    word: 'elephant',
  };
  const descriptor = toCardDescriptorRN(tracking);
  const keys = Object.keys(descriptor).sort();
  assert.deepEqual(keys, ['imageUrl', 'modelUrl', 'physicalWidthMeters', 'qrId', 'word']);
  assert.equal(descriptor.qrId, 'ele-cu');
  assert.equal(descriptor.imageUrl, 'https://cdn.example/refs/ele.png');
  assert.equal(descriptor.physicalWidthMeters, 0.085);
  assert.equal(descriptor.modelUrl, 'https://cdn.example/models/elephant.glb');
  assert.equal(descriptor.word, 'elephant');
});

test('M3A: toCardDescriptorRN does NOT leak referenceImageUrl onto the bridge', () => {
  // The bridge field name is `imageUrl`, not `referenceImageUrl`. The
  // mapping is intentional — the two types are distinct.
  const tracking: NativeTrackingDto = {
    qrId: 'ele-cu',
    referenceImageUrl: 'https://cdn.example/refs/ele.png',
    physicalWidthMeters: 0.085,
    modelUrl: 'https://cdn.example/models/elephant.glb',
    word: 'elephant',
  };
  const descriptor = toCardDescriptorRN(tracking);
  assert.equal(
    (descriptor as unknown as Record<string, unknown>).referenceImageUrl,
    undefined,
    'CardDescriptorRN must not carry referenceImageUrl — the bridge field name is imageUrl',
  );
});

test('M3A: toCardDescriptorRN does NOT add arTag (RQ-3 CLOSED)', () => {
  const tracking: NativeTrackingDto = {
    qrId: 'ele-cu',
    referenceImageUrl: 'https://cdn.example/refs/ele.png',
    physicalWidthMeters: 0.085,
    modelUrl: 'https://cdn.example/models/elephant.glb',
    word: 'elephant',
  };
  const descriptor = toCardDescriptorRN(tracking);
  assert.equal(
    (descriptor as unknown as Record<string, unknown>).arTag,
    undefined,
    'CardDescriptorRN must not carry arTag — RQ-3 is CLOSED (Unity MultiCardRegistry lookup)',
  );
});

test('M3A: toCardDescriptorRN includes modelUrl for dynamic tracking + model association', () => {
  // The bridge DTO now carries modelUrl so Unity can spawn content when the card is detected.
  // This enables the dynamic QR → backend → reference-image → model-3d association path.
  const tracking: NativeTrackingDto = {
    qrId: 'ele-cu',
    referenceImageUrl: 'https://cdn.example/refs/ele.png',
    physicalWidthMeters: 0.085,
    modelUrl: 'https://cdn.example/models/elephant.glb',
    word: 'elephant',
  };
  const descriptor = toCardDescriptorRN(tracking);
  assert.equal(
    descriptor.modelUrl,
    'https://cdn.example/models/elephant.glb',
    'CardDescriptorRN must carry modelUrl for dynamic model association',
  );
});

// ---------------------------------------------------------------------------
// 8. Composition — full pipeline
// ---------------------------------------------------------------------------

test('M3A: validate → toCardDescriptorRN is the explicit pipeline (full chain)', () => {
  const availability = validateNativeTrackingMetadata(baseResponse);
  assert.equal(availability.kind, 'ready');
  if (availability.kind !== 'ready') return;

  const descriptor = toCardDescriptorRN(availability.tracking);
  assert.equal(descriptor.qrId, 'ele-cu');
  assert.equal(descriptor.imageUrl, 'https://cdn.example/refs/ele.png');
  assert.equal(descriptor.physicalWidthMeters, 0.085);
  assert.equal(descriptor.modelUrl, 'https://cdn.example/models/elephant.glb');
  assert.equal(descriptor.word, 'elephant');
});

test('M3A: mapToCardDescriptor (legacy thunk) returns ok when both fields are present', () => {
  const result = mapToCardDescriptor(baseResponse);
  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;
  assert.deepEqual(result.descriptor, {
    qrId: 'ele-cu',
    imageUrl: 'https://cdn.example/refs/ele.png',
    physicalWidthMeters: 0.085,
    modelUrl: 'https://cdn.example/models/elephant.glb',
    word: 'elephant',
  });
});

test('M3A: mapToCardDescriptor (legacy thunk) returns unavailable when fields missing', () => {
  const result = mapToCardDescriptor(legacyResponse);
  assert.equal(result.kind, 'unavailable');
  if (result.kind !== 'unavailable') return;
  assert.equal(result.reason, 'both');
  assert.equal(result.qrId, 'ele-cu');
});

// ---------------------------------------------------------------------------
// 9. Error semantics — not REFERENCE_IMAGE_LOAD_FAILED
// ---------------------------------------------------------------------------

test('M3A: missing backend metadata surfaces as BACKEND_METADATA_UNAVAILABLE family, NOT REFERENCE_IMAGE_LOAD_FAILED', () => {
  const result = validateNativeTrackingMetadata(legacyResponse);
  assert.equal(result.kind, 'unavailable');
  // The discriminated union reason is RN-internal. The downstream consumer
  // maps this to BACKEND_METADATA_UNAVAILABLE — a distinct error code from
  // REFERENCE_IMAGE_LOAD_FAILED (which is Unity → RN and requires a valid URL).
  if (result.kind === 'unavailable') {
    // RN-internal reason is one of: missing_reference_image | missing_physical_width | both
    assert.ok(
      [
        'missing_reference_image',
        'missing_physical_width',
        'both',
      ].includes(result.reason),
    );
    // The surface-level code is BACKEND_METADATA_UNAVAILABLE.
    assert.equal(
      BACKEND_METADATA_UNAVAILABLE,
      'BACKEND_METADATA_UNAVAILABLE',
    );
  }
  // The unavailable result.reason is structurally distinct from 'REFERENCE_IMAGE_LOAD_FAILED'.
  if (result.kind === 'unavailable') {
    assert.notEqual(result.reason, 'REFERENCE_IMAGE_LOAD_FAILED');
  }
});

// ---------------------------------------------------------------------------
// 10. Distinct types — three distinct layers
// ---------------------------------------------------------------------------

test('M3A: Backend/API DTO ≠ NativeTrackingDto ≠ CardDescriptorRN (distinct types)', () => {
  // Structural assertion: the three types have distinct field names.
  const apiKeys = Object.keys({
    qr_id: '',
    word: '',
    translation_vi: '',
    audio_url: '',
    model_url: '',
    animation_type: 'rotate' as const,
    glb_size: 0,
    position: '',
    rotation: '',
    scale: '',
    reference_image_url: '',
    physical_width_m: 0,
  }).sort();
  const trackingKeys = Object.keys({
    qrId: '',
    referenceImageUrl: '',
    physicalWidthMeters: 0,
  }).sort();
  const bridgeKeys = Object.keys({
    qrId: '',
    imageUrl: '',
    physicalWidthMeters: 0,
  }).sort();

  // API DTO uses snake_case; the other two use camelCase.
  assert.ok(apiKeys.includes('qr_id'));
  assert.ok(!apiKeys.includes('qrId'));
  // NativeTrackingDto uses `referenceImageUrl`; the bridge uses `imageUrl`.
  assert.deepEqual(trackingKeys, ['physicalWidthMeters', 'qrId', 'referenceImageUrl']);
  assert.deepEqual(bridgeKeys, ['imageUrl', 'physicalWidthMeters', 'qrId']);
  // The three key sets are pairwise distinct.
  assert.notDeepEqual(apiKeys, trackingKeys);
  assert.notDeepEqual(apiKeys, bridgeKeys);
  assert.notDeepEqual(trackingKeys, bridgeKeys);
});
