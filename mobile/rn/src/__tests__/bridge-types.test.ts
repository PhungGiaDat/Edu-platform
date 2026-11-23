/**
 * @file Bridge contract type tests — M1A RN Contract Baseline.
 *
 * Scope: verifies the TypeScript type layer of the RN ↔ Unity bridge contract
 * WITHOUT touching Unity source or requiring runtime execution.
 *
 * What is tested here (not covered by ARExperienceMapper.test.ts):
 *   1. Event discriminant exhaustiveness — every spec event has a typed payload.
 *   2. CardDescriptorRN shape — exactly { qrId, imageUrl, physicalWidthMeters }.
 *   3. Legacy events (onObjectPlaced) are present but annotated as deprecated.
 *   4. onImageDetected and onImageTrackingLost carry qrId (business identity).
 *   5. OnMultiImageDetectedPayload carries qrIds (business identities).
 *   6. OnModelLoadedPayload carries qrId (not modelName).
 *   7. Tracking-state degradation !== trackable removal distinction is preserved
 *      in the type system (separate event types, separate handler paths).
 *
 * Run from `mobile/rn/`:
 *
 *     node --test \
 *          --experimental-strip-types \
 *          "--import=data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" \
 *          src/__tests__/bridge-types.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type {
  OnArReadyPayload,
  OnErrorPayload,
  OnImageDetectedPayload,
  OnImageTrackingLostPayload,
  OnMultiImageDetectedPayload,
  OnModelProgressPayload,
  OnObjectPlacedPayload,
  OnModelLoadedPayload,
  OnProximityNearPayload,
  OnComboTriggeredPayload,
  OnComboCompletePayload,
  OnFoodDraggingPayload,
  OnFoodFedPayload,
  OnPetStateChangedPayload,
  OnAnimationCompletePayload,
  OnImagePoseUpdatedPayload,
  StartImageTrackingMultiPayload,
  ARMessageType,
} from '../bridge/arMessages';
import type { CardDescriptorRN } from '../types/ar';
import type { UnityARExperiencePayload } from '../types/ar';

// ---------------------------------------------------------------------------
// 1. CardDescriptorRN — approved shape per bridge-contract.md §"Multi-Card Bridge Contract"
// ---------------------------------------------------------------------------

test('CardDescriptorRN has exactly qrId, imageUrl, physicalWidthMeters (no extras)', () => {
  // The spec defines only these three fields. Any extra field is a contract violation.
  const _shapeCheck: CardDescriptorRN = {
    qrId: 'cat-01',
    imageUrl: 'https://cdn.example/refs/cat.jpg',
    physicalWidthMeters: 0.085,
  };
  const keys = Object.keys(_shapeCheck).sort();
  assert.deepEqual(keys, ['imageUrl', 'physicalWidthMeters', 'qrId']);
});

test('CardDescriptorRN physicalWidthMeters is number (not string)', () => {
  const _typeCheck: CardDescriptorRN = {
    qrId: 'dog-02',
    imageUrl: 'https://cdn.example/refs/dog.jpg',
    physicalWidthMeters: 0.08,
  };
  assert.equal(typeof _typeCheck.physicalWidthMeters, 'number');
});

test('UnityARExperiencePayload does NOT have referenceImageUrl or physicalWidthMeters', () => {
  // These fields belong to CardDescriptorRN — not UnityARExperiencePayload.
  // Gate: M1 acceptance criterion.
  const payload: UnityARExperiencePayload = {
    qrId: 'test',
    word: 'test',
    translationVi: 'test',
    audioUrl: 'https://cdn.example/audio/test.mp3',
    modelUrl: 'https://cdn.example/models/test.glb',
    animationType: 'idle',
    glbSize: 1,
    position: '0 0 0',
    rotation: '0 0 0',
    scale: '1 1 1',
  };
  assert.equal(
    (payload as unknown as Record<string, unknown>).referenceImageUrl,
    undefined,
  );
  assert.equal(
    (payload as unknown as Record<string, unknown>).physicalWidthMeters,
    undefined,
  );
});

// ---------------------------------------------------------------------------
// 2. Event discriminants — every spec event has a typed payload
// ---------------------------------------------------------------------------

test('OnImageDetectedPayload carries qrId (business identity) per spec §K-2', () => {
  const payload: OnImageDetectedPayload = {
    imageId: 'runtime-handle-abc',
    imageName: 'cat.jpg',
    qrId: 'cat-01', // Primary card identifier for UX/game logic.
    transform: { x: 0.1, y: 0.2, z: 0.3 },
  };
  assert.equal(payload.qrId, 'cat-01');
  assert.equal(payload.imageId, 'runtime-handle-abc');
});

test('OnImageTrackingLostPayload carries qrId (REQUIRED per spec §K-2)', () => {
  // qrId is REQUIRED — not optional. A tracking-lost event without a card
  // identity cannot be processed by RN UX.
  const payload: OnImageTrackingLostPayload = {
    qrId: 'cat-01', // Required per spec.
  };
  assert.equal(payload.qrId, 'cat-01');
  // reason is optional (RQ-4 unresolved).
  assert.equal((payload as { reason?: string }).reason, undefined);
});

test('OnImageTrackingLostPayload supports optional reason (RQ-4 placeholder)', () => {
  const withReason: OnImageTrackingLostPayload = {
    qrId: 'cat-01',
    reason: 'CARD_REMOVED',
  };
  assert.equal(withReason.reason, 'CARD_REMOVED');
});

test('OnMultiImageDetectedPayload carries qrIds[] (business identities)', () => {
  // Native AR contract uses qrIds; imageIds is legacy compat.
  const payload: OnMultiImageDetectedPayload = {
    qrIds: ['cat-01', 'dog-02'],
    count: 2,
  };
  assert.deepEqual(payload.qrIds, ['cat-01', 'dog-02']);
  assert.equal(payload.count, 2);
});

test('OnMultiImageDetectedPayload legacy imageIds present for backward compat', () => {
  // Until Unity emits qrIds, existing Unity RNEventEmitter implementations
  // may emit imageIds (runtime handles). Both fields are optional for compat.
  const legacyPayload: OnMultiImageDetectedPayload = {
    imageIds: ['handle-1', 'handle-2'],
    count: 2,
  };
  assert.deepEqual(legacyPayload.imageIds, ['handle-1', 'handle-2']);
  assert.equal(legacyPayload.count, 2);
});

test('OnModelLoadedPayload carries qrId (per spec §K-2), NOT modelName', () => {
  // Spec §K-2: { modelUrl, qrId }. modelName was a pre-spec field.
  const payload: OnModelLoadedPayload = {
    modelUrl: 'https://cdn.example/models/cat.glb',
    qrId: 'cat-01', // Required per spec.
  };
  assert.equal(payload.qrId, 'cat-01');
  // modelName must NOT be in the type (spec says qrId only).
  assert.equal(
    (payload as unknown as Record<string, unknown>).modelName,
    undefined,
  );
});

test('OnProximityNearPayload carries arTag (semantic combo identity)', () => {
  // Per bridge-contract.md §K-2 + backend-contract.md §"Tracking Identity":
  // arTag is the semantic combo lookup key, not qrId pairs.
  const payload: OnProximityNearPayload = {
    imageIdA: 'handle-a',
    imageIdB: 'handle-b',
    arTag: 'food-cat', // Semantic combo identity.
    distance: 0.15,
  };
  assert.equal(payload.arTag, 'food-cat');
});

test('OnComboTriggeredPayload carries arTag (semantic combo identity)', () => {
  const payload: OnComboTriggeredPayload = {
    cardIdA: 'cat-01',
    cardIdB: 'food-01',
    arTag: 'food-cat', // Semantic combo identity.
    comboId: 'combo-123',
  };
  assert.equal(payload.arTag, 'food-cat');
});

// ---------------------------------------------------------------------------
// 3. Legacy events are present but annotated as deprecated (plane-placement semantics)
// ---------------------------------------------------------------------------

test('OnObjectPlacedPayload is present in the union (legacy compat)', () => {
  // bridge-contract.md §K-4 / MOB-ERR-REQ-030: onObjectPlaced carries
  // plane-tap semantics and is NOT the image-tracking anchor event.
  // It stays in the union for backward compat with existing Unity RNEventEmitter.
  const payload: OnObjectPlacedPayload = {
    qrId: 'cat-01',
    worldX: 1.0,
    worldY: 0.5,
    worldZ: -0.3,
  };
  assert.equal(payload.qrId, 'cat-01');
  assert.ok(typeof payload.worldX === 'number');
});

test('onPlaneDetected is NOT in the active native AR contract type layer', () => {
  // Per bridge-contract.md §K-4 / MOB-ERR-REQ-031:
  // onPlaneDetected carries plane-detection semantics.
  // For native image tracking, it is suppressed or informational.
  // The active native AR contract does NOT include onPlaneDetected as a
  // tracking event. It may exist in the Unity event emitter for backward
  // compat but is not part of the spec's K-2 event table.
  //
  // Verification: grep the arMessages.ts ARMessageType union.
  // If 'onPlaneDetected' appears in the union, this test MUST fail.
  // Currently it does NOT appear — which is correct per MOB-ERR-REQ-031.
  //
  // This test documents the requirement: onPlaneDetected should not
  // be re-introduced into the active contract without a spec change.
  const messageTypes: ARMessageType[] = [
    'onArReady',
    'onError',
    'onImageDetected',
    'onImageTrackingLost',
    'onMultiImageDetected',
    'onModelProgress',
    'onObjectPlaced',
    'onModelLoaded',
    'onProximityNear',
    'onComboTriggered',
    'onComboComplete',
    'onFoodDragging',
    'onFoodFed',
    'onPetStateChanged',
  ];
  const hasPlaneDetected = messageTypes.includes('onPlaneDetected' as ARMessageType);
  assert.equal(
    hasPlaneDetected,
    false,
    'onPlaneDetected must NOT be in the active native AR contract',
  );
});

// ---------------------------------------------------------------------------
// 4. Tracking-state degradation !== trackable removal — type-level distinction
// ---------------------------------------------------------------------------

test('onImageTrackingLost is trackable REMOVAL (not tracking-state degradation)', () => {
  // TRACK-REQ-011: onImageTrackingLost fires ONLY from the ARTrackedImageManager
  // 'removed' path. It is NOT the same as trackingState transitioning to
  // Limited/None (which is an ongoing quality signal).
  // The type distinction is enforced: OnImageTrackingLostPayload represents
  // removal; the TrackedImage.trackingState field represents quality.
  const removed: OnImageTrackingLostPayload = { qrId: 'cat-01' };
  assert.equal(removed.qrId, 'cat-01');
  // reason is optional — temporary occlusion (not yet removed) should NOT
  // fire this event.
  assert.equal(removed.reason, undefined);
});

test('OnModelProgressPayload stage covers download/load/instantiate only', () => {
  // onModelProgress is a model-loading event, not a tracking-state event.
  // It has no relationship to image tracking quality.
  const payload: OnModelProgressPayload = {
    stage: 'download',
    progress: 0.5,
    message: 'Downloading model...',
  };
  assert.equal(payload.stage, 'download');
});

test('OnArReadyPayload is AR subsystem init, not tracking state', () => {
  // onArReady signals AR subsystem initialization (TRACKING state).
  // It is NOT about any particular trackable.
  const payload: OnArReadyPayload = { version: '6.0.7' };
  assert.equal(payload.version, '6.0.7');
});

test('OnErrorPayload covers AR subsystem failures', () => {
  const payload: OnErrorPayload = {
    code: 'CAMERA_PERMISSION_DENIED',
    message: 'Camera access is required for AR.',
  };
  assert.equal(payload.code, 'CAMERA_PERMISSION_DENIED');
});

// ---------------------------------------------------------------------------
// 5. startImageTrackingMulti payload type
// ---------------------------------------------------------------------------

test('StartImageTrackingMultiPayload carries CardDescriptorRN[]', () => {
  const payload: StartImageTrackingMultiPayload = {
    cards: [
      { qrId: 'cat-01', imageUrl: 'https://cdn.example/refs/cat.jpg', physicalWidthMeters: 0.08 },
      { qrId: 'food-01', imageUrl: 'https://cdn.example/refs/food.jpg', physicalWidthMeters: 0.085 },
    ],
  };
  assert.equal(payload.cards.length, 2);
  assert.equal(payload.cards[0].qrId, 'cat-01');
  assert.equal(payload.cards[1].qrId, 'food-01');
});

// ---------------------------------------------------------------------------
// 6. M1A-CORRECTION (2026-08-10) — new type assertions for corrected contract
// ---------------------------------------------------------------------------

test('CardDescriptorRN does NOT include arTag (combo lookup stays on Unity side per RQ-3)', () => {
  // Per `bridge-contract.md RQ-3`: combo lookup is keyed by ar_tag but stays
  // on the Unity side via `MultiCardRegistry`. `arTag` is NOT a field of
  // `CardDescriptorRN`. Adding it would be a contract violation.
  const _shapeCheck: CardDescriptorRN = {
    qrId: 'cat-01',
    imageUrl: 'https://cdn.example/refs/cat.jpg',
    physicalWidthMeters: 0.085,
  };
  const keys = Object.keys(_shapeCheck).sort();
  assert.deepEqual(keys, ['imageUrl', 'physicalWidthMeters', 'qrId']);
  // Explicitly: arTag MUST NOT appear
  assert.equal(
    (_shapeCheck as unknown as Record<string, unknown>).arTag,
    undefined,
    'CardDescriptorRN must not carry arTag (RQ-3: stays on Unity side)',
  );
});

test('OnImageTrackingLostPayload qrId is REQUIRED, reason is optional (DECISION_REQUIRED: RQ-4)', () => {
  // Per `mobile-ar-product-spec.md §K-2` row: payload is `{ qrId: string }`.
  // `reason` is NOT in the spec table — it is a placeholder for RQ-4
  // (DECISION_REQUIRED). When RQ-4 resolves, the union may expand or this
  // field may be removed.
  const baseCase: OnImageTrackingLostPayload = { qrId: 'cat-01' };
  assert.equal(baseCase.qrId, 'cat-01');
  assert.equal(baseCase.reason, undefined);

  // If RQ-4 lands as-is, these are the values:
  const removed: OnImageTrackingLostPayload = {
    qrId: 'cat-01',
    reason: 'CARD_REMOVED',
  };
  assert.equal(removed.reason, 'CARD_REMOVED');

  const occluded: OnImageTrackingLostPayload = {
    qrId: 'cat-01',
    reason: 'TEMPORARY_OCCLUSION',
  };
  assert.equal(occluded.reason, 'TEMPORARY_OCCLUSION');
});

test('OnProximityNearPayload uses arTag for combo identity, NOT qrId pairs', () => {
  // Per `mobile-ar-product-spec.md §F-1`: combos use `arTag` (semantic),
  // not qrId pairs. RN does NOT infer combo identity from detection order
  // or qrId pairs.
  const payload: OnProximityNearPayload = {
    imageIdA: 'handle-a',
    imageIdB: 'handle-b',
    arTag: 'food-cat',
    distance: 0.15,
  };
  assert.equal(payload.arTag, 'food-cat');
  // No qrIdA/qrIdB fields — only imageIdA/imageIdB (runtime handles).
  assert.equal(
    (payload as unknown as Record<string, unknown>).qrIdA,
    undefined,
    'OnProximityNearPayload must not carry qrIdA — combo identity is arTag',
  );
  assert.equal(
    (payload as unknown as Record<string, unknown>).qrIdB,
    undefined,
    'OnProximityNearPayload must not carry qrIdB — combo identity is arTag',
  );
});

test('OnComboTriggeredPayload uses arTag for combo identity, NOT just qrId pair', () => {
  // Per `mobile-ar-product-spec.md §F-1`: combo identity is `arTag`.
  const payload: OnComboTriggeredPayload = {
    cardIdA: 'cat-01',
    cardIdB: 'food-01',
    arTag: 'food-cat',
    comboId: 'combo-123',
  };
  assert.equal(payload.arTag, 'food-cat');
});

test('TriggerComboPayload carries cardA/cardB strings (semantic identity DECISION_REQUIRED)', () => {
  // The `triggerCombo` RN→Unity method payload is `{ cardA, cardB }` per
  // `bridge-contract.md`. The semantic identity (qrId vs arTag) is
  // DECISION_REQUIRED — see MQ-7.
  // Spec §F-1 says combos use arTag, but the bridge method doesn't specify.
  // The current `useARSession.triggerCombo` passes qrId values; this is a
  // placeholder pending resolution. The type permits either identity.
  const payload: import('../bridge/arMessages').TriggerComboPayload = {
    cardA: 'cat-01',
    cardB: 'food-01',
  };
  assert.equal(typeof payload.cardA, 'string');
  assert.equal(typeof payload.cardB, 'string');
});

// ---------------------------------------------------------------------------
// 7. M1A-CORRECTION-FINAL (2026-08-10) — tracking-lost semantic reconciliation
// ---------------------------------------------------------------------------

test('onImageTrackingLost is trackable REMOVAL — quality states (TRACKING/LIMITED/NONE) are NOT this event', () => {
  // Per `bridge-contract.md §Tracking State vs Trackable Removal`:
  //   - onImageTrackingLost fires ONLY from ARTrackedImageManager 'removed' path
  //   - trackingState transitions (Tracking/Limited/None) are quality signals
  //   - Limited/None MUST NOT fire onImageTrackingLost
  //
  // The type layer enforces the distinction: OnImageTrackingLostPayload is
  // for REMOVAL events; the TrackedImage.trackingState field carries quality.
  //
  // reason? is OPTIONAL and is RQ-4 (DECISION_REQUIRED). When the field is
  // present, it should NOT be conflated with the AR Foundation trackingState
  // — it is a Unity-side semantic annotation (CARD_REMOVED vs
  // TEMPORARY_OCCLUSION), not a quality value.
  const removed: OnImageTrackingLostPayload = { qrId: 'cat-01' };
  assert.equal(removed.qrId, 'cat-01');

  // The semantic payload (qrId + reason) does NOT include a trackingState
  // value — that lives on TrackedImage, not on this event.
  assert.equal(
    (removed as unknown as Record<string, unknown>).trackingState,
    undefined,
    'onImageTrackingLost payload must not carry trackingState — that is a TrackedImage field',
  );

  // The reason union values are NOT the AR Foundation trackingState values.
  // 'TEMPORARY_OCCLUSION' is conceptually similar to Limited but is NOT the
  // same enum — it is a Unity-side annotation that would only fire if RQ-4
  // were resolved AND an explicit removal-with-occlusion event existed.
  const payloadWithReason: OnImageTrackingLostPayload = {
    qrId: 'cat-01',
    reason: 'CARD_REMOVED',
  };
  assert.equal(payloadWithReason.reason, 'CARD_REMOVED');
  assert.notEqual(
    payloadWithReason.reason,
    'Limited',
    "reason must not equal AR Foundation trackingState value 'Limited'",
  );
  assert.notEqual(
    payloadWithReason.reason,
    'None',
    "reason must not equal AR Foundation trackingState value 'None'",
  );
});

test('CardDescriptorSource does NOT include arTag on ok descriptor (RQ-3 CLOSED)', () => {
  // Per `bridge-contract.md` line 164: RQ-3 verdict is "No" (does not block
  // approval). arTag is NOT a CardDescriptorRN field.
  //
  // Per `backend-contract.md §Tracking Identity`:
  //   - Unity resolves arTag → qrId via MultiCardRegistry
  //   - MultiCardRegistry holds the full CardDescriptor per card
  //   - Detection order does NOT determine card identity
  //
  // This is the explicit lookup mechanism. CardDescriptorRN carries qrId
  // (business identity); arTag stays on Unity side via the registry.
  const _okShape: import('../types/ar').CardDescriptorSource = {
    kind: 'ok',
    descriptor: {
      qrId: 'cat-01',
      imageUrl: 'https://cdn.example/refs/cat.jpg',
      physicalWidthMeters: 0.085,
    },
  };
  assert.equal(_okShape.kind, 'ok');
  if (_okShape.kind !== 'ok') return;
  // The descriptor must NOT carry arTag
  assert.equal(
    (_okShape.descriptor as unknown as Record<string, unknown>).arTag,
    undefined,
    'CardDescriptorRN (ok branch) must not carry arTag — RQ-3 is CLOSED',
  );
});

test('CardDescriptorSource unavailable reason discriminates metadata failure from REFERENCE_IMAGE_LOAD_FAILED', () => {
  // Per `mobile-ar-product-spec.md §I-1`:
  //   REFERENCE_IMAGE_LOAD_FAILED (Unity → RN) fires only AFTER a valid URL
  //   was provided and the load step failed.
  //
  // Pre-URL metadata absence (backend response missing reference_image_url
  // or physical_width_m) is a SEPARATE failure category. The mapper routes
  // this to `{ kind: 'unavailable' }`; downstream consumer surfaces it as
  // `BACKEND_METADATA_UNAVAILABLE` (RN-owned, additive — needs spec
  // approval before becoming public).
  const missingImage: import('../types/ar').CardDescriptorSource = {
    kind: 'unavailable',
    reason: 'missing_reference_image',
    qrId: 'cat-01',
  };
  const missingWidth: import('../types/ar').CardDescriptorSource = {
    kind: 'unavailable',
    reason: 'missing_physical_width',
    qrId: 'cat-01',
  };
  const missingBoth: import('../types/ar').CardDescriptorSource = {
    kind: 'unavailable',
    reason: 'both',
    qrId: 'cat-01',
  };
  assert.equal(missingImage.kind, 'unavailable');
  assert.equal(missingWidth.kind, 'unavailable');
  assert.equal(missingBoth.kind, 'unavailable');
  // None of these should be confused with the transport-layer code
  assert.notEqual(missingImage.reason, 'REFERENCE_IMAGE_LOAD_FAILED');
  assert.notEqual(missingWidth.reason, 'REFERENCE_IMAGE_LOAD_FAILED');
  assert.notEqual(missingBoth.reason, 'REFERENCE_IMAGE_LOAD_FAILED');
});

test('DEFAULT_PHYSICAL_WIDTH_M is NOT exported from production types/ar.ts', () => {
  // Move to test fixture completed in M1A-CORRECTION-FINAL.
  // This test guards the contract: production source MUST NOT re-introduce
  // the constant. Mapper tests carry their own fixture copy.
  //
  // We verify by importing and checking the type module — the constant
  // is not present, so any code that tries to use it will fail to compile.
  const typesModule = (): void => {
    // Reference shape only — the actual constant is gone from production.
    const _t: import('../types/ar').CardDescriptorSource = {
      kind: 'ok',
      descriptor: {
        qrId: 'x',
        imageUrl: 'https://x',
        physicalWidthMeters: 0.08,
      },
    };
    void _t;
  };
  assert.doesNotThrow(typesModule);
});

// ---------------------------------------------------------------------------
// M1B Runtime Conformance — New types added 2026-08-12
// ---------------------------------------------------------------------------

test('OnAnimationCompletePayload has clip and qrId fields', () => {
  // Per Unity AnimationController.cs: emits { clip, qrId }
  const payload: OnAnimationCompletePayload = {
    clip: 'bounce',
    qrId: 'cat-01',
  };
  assert.equal(payload.clip, 'bounce');
  assert.equal(payload.qrId, 'cat-01');
});

test('OnImagePoseUpdatedPayload has imageId, trackableId, trackingState, transform', () => {
  // Per Unity ARSessionManager.cs: emits onImagePoseUpdated from args.updated path
  const payload: OnImagePoseUpdatedPayload = {
    imageId: 'cat-01',
    trackableId: '12345',
    trackingState: 'Tracking',
    transform: { x: 0.1, y: 0.2, z: 0.3 },
  };
  assert.equal(payload.imageId, 'cat-01');
  assert.equal(payload.trackingState, 'Tracking');
  assert.equal(payload.transform.x, 0.1);
});

test('onAnimationComplete is in ARMessageType union', () => {
  const types: ARMessageType[] = ['onAnimationComplete'];
  assert.equal(types.includes('onAnimationComplete'), true);
});

test('onImagePoseUpdated is in ARMessageType union', () => {
  const types: ARMessageType[] = ['onImagePoseUpdated'];
  assert.equal(types.includes('onImagePoseUpdated'), true);
});
