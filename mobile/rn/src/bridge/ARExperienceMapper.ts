import type { ARExperienceResponse } from '../types/api';
import type {
  UnityARExperiencePayload,
  CardDescriptorRN,
  CardDescriptorSource,
  NativeTrackingDto,
  NativeTrackingAvailability,
} from '../types/ar';

/**
 * Maps backend ARExperienceResponse to UnityARExperiencePayload
 * for Unity native module bridge communication.
 */
export const mapToUnityPayload = (
  apiResponse: ARExperienceResponse
): UnityARExperiencePayload => ({
  qrId: apiResponse.qr_id,
  word: apiResponse.word,
  translationVi: apiResponse.translation_vi,
  audioUrl: apiResponse.audio_url,
  modelUrl: apiResponse.model_url,
  animationType: apiResponse.animation_type,
  glbSize: apiResponse.glb_size,
  position: apiResponse.position,
  rotation: apiResponse.rotation,
  scale: apiResponse.scale,
});

// ---------------------------------------------------------------------------
// M3A — explicit native tracking boundary
//
// The data flow has three distinct layers:
//
//   1. Backend/API DTO  (`ARExperienceResponse`) — raw wire shape, optional
//                                                     native fields for legacy
//                                                     MindAR coexistence.
//   2. NativeTrackingDto                          — validated RN-side domain
//                                                     object. Strict. The
//                                                     product of
//                                                     `validateNativeTrackingMetadata`.
//   3. CardDescriptorRN                           — Unity bridge DTO. The
//                                                     product of
//                                                     `toCardDescriptorRN`.
//
// Each layer has its own type. The mapping is explicit and tested.
// ---------------------------------------------------------------------------

/**
 * Validates a backend response and produces a `NativeTrackingDto` (or
 * `unavailable` if fields are missing/invalid).
 *
 * Validation rules (per `mobile-ar-product-spec.md §K-3` + BQ-3 closure):
 *   - `reference_image_url` MUST exist and be a non-empty string.
 *   - `physical_width_m` MUST exist, be finite, and be > 0.
 *   - There is NO approved production default for `physical_width_m`.
 *   - `model_url` is NEVER substituted for `reference_image_url`.
 *
 * The mapper does NOT use a hard-coded production physical-width fallback.
 *
 * Distinct from `REFERENCE_IMAGE_LOAD_FAILED` (Unity → RN, post-URL
 * download/decode). A missing or invalid value here is a contract-metadata
 * failure, not a transport-layer failure. Downstream consumers map this
 * to `BACKEND_METADATA_UNAVAILABLE`.
 *
 * This is step 1 of the two-step boundary: validate first, then map to
 * the bridge DTO. Combines with `toCardDescriptorRN` to produce the bridge
 * payload when the validator yields `ready`.
 */
export const validateNativeTrackingMetadata = (
  apiResponse: ARExperienceResponse
): NativeTrackingAvailability => {
  const hasImage =
    typeof apiResponse.reference_image_url === 'string' &&
    apiResponse.reference_image_url.length > 0;

  // physical_width_m is optional in the dev path.
  // null/undefined is acceptable (unknown-size registration, widthMeters=0).
  // Explicitly invalid values (NaN, negative) still fail.
  const widthValue = apiResponse.physical_width_m;
  const hasValidWidth =
    widthValue == null ||
    (typeof widthValue === 'number' && Number.isFinite(widthValue) && widthValue > 0);

  if (!hasValidWidth) {
    return {
      kind: 'unavailable',
      reason: 'invalid_physical_width',
      qrId: apiResponse.qr_id,
    };
  }

  if (!hasImage) {
    return {
      kind: 'unavailable',
      reason: 'missing_reference_image',
      qrId: apiResponse.qr_id,
    };
  }

  // Image present; width is null (dev) or a valid positive number.
  return {
    kind: 'ready',
    tracking: {
      qrId: apiResponse.qr_id,
      referenceImageUrl: apiResponse.reference_image_url as string,
      // 0 means unknown size — AR Foundation uses the unknown-size registration path.
      physicalWidthMeters: widthValue ?? 0,
      // Model + word from the same backend response — used by Unity for GLTFast spawn.
      modelUrl: apiResponse.model_url,
      word: apiResponse.word,
    },
  };
};

/**
 * Maps a validated `NativeTrackingDto` to the Unity bridge DTO
 * (`CardDescriptorRN`).
 *
 * Step 2 of the two-step boundary. Pure mapping — does NOT re-validate.
 * The validator step has already rejected invalid input via the
 * `NativeTrackingAvailability` discriminated union.
 *
 * Field translation:
 *   - `referenceImageUrl` → `imageUrl` (RN-native validated name →
 *     bridge name per `mobile-ar-product-spec.md §K-3`).
 *   - `physicalWidthMeters` → `physicalWidthMeters` (same name).
 *   - `qrId` → `qrId` (same name).
 *
 * No `arTag` is added — RQ-3 is CLOSED. Unity `MultiCardRegistry` owns
 * the arTag → qrId lookup.
 *
 * No `modelUrl` is added — `CardDescriptorRN` is tracking-only.
 * Model content is a separate layer (M3A scope: tracking data only).
 */
export const toCardDescriptorRN = (
  tracking: NativeTrackingDto
): CardDescriptorRN => ({
  qrId: tracking.qrId,
  imageUrl: tracking.referenceImageUrl,
  physicalWidthMeters: tracking.physicalWidthMeters,
  modelUrl: tracking.modelUrl,
  word: tracking.word,
});

// ---------------------------------------------------------------------------
// M3A — backward-compatible composition
//
// `mapToCardDescriptor` is the legacy entry point used by M1A-CORRECTION
// tests. It composes the two explicit steps above. New code SHOULD call
// `validateNativeTrackingMetadata` + `toCardDescriptorRN` directly to
// make the boundary visible; this thunk is kept for backwards compat
// and for tests that only care about the final shape.
// ---------------------------------------------------------------------------

/**
 * Maps backend ARExperienceResponse to a CardDescriptorRN for multi-card
 * image tracking.
 *
 * Per `mobile-ar-product-spec.md §K-3`:
 *   - `imageUrl` MUST come from backend `reference_image_url` (NOT modelUrl)
 *   - `physicalWidthMeters` MUST come from backend `physical_width_m`
 *
 * There is NO approved production fallback. If either backend field is missing,
 * this mapper returns `{ kind: 'unavailable', ... }` so downstream code can
 * route the failure to validation / error paths (e.g. AR_LOAD_REFERENCE_IMAGE
 * error) rather than silently substituting a 3D model URL or an invented width.
 *
 * BACKEND-T001 (which adds `reference_image_url` / `physical_width_m` to the
 * backend) remains open. Until it lands, callers MUST treat `unavailable`
 * results as a blocking condition for `startImageTrackingMulti`.
 *
 * Per `bridge-contract.md` RQ-3, `arTag` is intentionally NOT a field of
 * `CardDescriptorRN` — combo lookup stays on Unity side via `MultiCardRegistry`.
 *
 * Implementation: thin composition of the two M3A steps
 * (validate → to-bridge). Prefer those two functions directly in new code.
 */
export const mapToCardDescriptor = (
  apiResponse: ARExperienceResponse
): CardDescriptorSource => {
  const availability = validateNativeTrackingMetadata(apiResponse);
  if (availability.kind === 'ready') {
    return {
      kind: 'ok',
      descriptor: toCardDescriptorRN(availability.tracking),
    };
  }
  return {
    kind: 'unavailable',
    reason: availability.reason,
    qrId: availability.qrId,
  };
};
