export interface UnityARExperiencePayload {
  qrId: string;
  word: string;
  translationVi: string;
  audioUrl: string;
  modelUrl: string;
  animationType: 'rotate' | 'bounce' | 'idle';
  glbSize: number;
  position: string;
  rotation: string;
  scale: string;
}

/**
 * RN-side equivalent of Unity `CardDescriptor` (mobile/unity/Assets/AR/CardImageLibraryBuilder.cs).
 *
 * Used by the multi-card tracking bridge method `startImageTrackingMulti`.
 * Per `bridge-contract.md §CardDescriptor` and `mobile-ar-product-spec.md §K-3`:
 *
 *   CardDescriptorRN {
 *     qrId: string;                    // business flashcard ID
 *     imageUrl: string;                // reference_image_url from backend (NOT modelUrl)
 *     physicalWidthMeters: number;     // physical_width_m from backend (NO silent default)
 *   }
 *
 * The 3D model URL and `reference_image_url` are DIFFERENT artifacts:
 *   - modelUrl → 3D GLB asset rendered in scene
 *   - imageUrl (reference image) → AR Foundation tracked-image texture
 *
 * Per `mobile-ar-product-spec.md §K-3`, `imageUrl` MUST come from backend
 * `reference_image_url`. There is NO approved production default — the
 * mapper MUST NOT silently substitute `modelUrl` when `reference_image_url`
 * is missing. Missing metadata is represented explicitly as
 * `{ kind: 'unavailable', reason }` so downstream validation / error paths
 * can route to `BACKEND_METADATA_UNAVAILABLE`.
 *
 * `arTag` is intentionally NOT in `CardDescriptorRN` — RQ-3 is CLOSED.
 * Per `bridge-contract.md` line 164: "Should `CardDescriptor` include
 * `ar_tag` for combo lookup, or should that stay on the Unity side via
 * registry? | No". Per `backend-contract.md §Tracking Identity`: Unity
 * resolves `arTag → qrId` via `MultiCardRegistry` (which holds the full
 * `CardDescriptor` per card). Detection order does NOT determine card identity.
 *
 * If the spec ever flips on RQ-3, add `arTag?: string` here and update the
 * mapper. Until then, no `arTag` field is permitted on `CardDescriptorRN`.
 */
export interface CardDescriptorRN {
  qrId: string;
  imageUrl: string;
  physicalWidthMeters: number;
  /** 3D model URL — sent alongside tracking data so Unity can spawn content on detection. */
  modelUrl?: string;
  /** Card word — sent alongside tracking data. */
  word?: string;
}

/**
 * Result of mapping a backend response into a `CardDescriptorRN`.
 *
 * `unavailable` is the discriminated union returned when the backend has not
 * yet shipped `reference_image_url` / `physical_width_m` (BACKEND-T001).
 *
 * Per spec:
 *   - reference_image_url is REQUIRED for native image tracking
 *   - physical_width_m is REQUIRED for AR Foundation library construction
 *   - There is NO approved fallback to `modelUrl` or to a hard-coded width
 *
 * Downstream consumers should map `unavailable` to `BACKEND_METADATA_UNAVAILABLE`
 * (an RN-side error code per `mobile-ar-product-spec.md §I-1` extension — see
 * `2026-08-10-m1a-correction-final` progress entry). This is distinct from
 * `REFERENCE_IMAGE_LOAD_FAILED` (Unity → RN, fires only AFTER a valid URL
 * exists and the download/decode step fails).
 */
export type CardDescriptorSource =
  | { kind: 'ok'; descriptor: CardDescriptorRN }
  | { kind: 'unavailable'; reason: 'missing_reference_image' | 'missing_physical_width' | 'both'; qrId: string };

/**
 * RN-side error code emitted when backend response is missing native AR
 * metadata (`reference_image_url` / `physical_width_m`).
 *
 * Distinct from spec `mobile-ar-product-spec.md §I-1` codes:
 *   - `REFERENCE_IMAGE_LOAD_FAILED` (Unity → RN) fires only AFTER a valid URL
 *     was provided and the load step failed. Pre-URL metadata absence is a
 *     separate condition — backend/contract availability, not transport.
 *
 * This is an additive RN-owned code; spec §I-1 extension needs explicit
 * approval before it ships in user-facing messages. Until then, callers may
 * surface it as `BACKEND_UNAVAILABLE` family (retryable).
 */
export const BACKEND_METADATA_UNAVAILABLE = 'BACKEND_METADATA_UNAVAILABLE';

// ---------------------------------------------------------------------------
// M3A — RN-side native tracking domain DTO
//
// `NativeTrackingDto` is a STRICT, validated RN-side domain object. It is the
// result of the validation step that turns a backend `ARExperienceResponse`
// into something the Unity multi-card bridge can consume.
//
// It is NOT the backend response type.
// It is NOT the bridge DTO (`CardDescriptorRN`), even though fields
// currently overlap — they are distinct types with distinct lives:
//   - `NativeTrackingDto` lives in RN, has RN-native validation status.
//   - `CardDescriptorRN`   lives on the bridge wire, has React+Unity agreed
//                          shape (imageUrl vs referenceImageUrl, etc.).
//
// Future changes (RQ-4, MQ-1, BQ-2, ...) may add fields to one layer
// without polluting the other. Keep them separate.
// ---------------------------------------------------------------------------

/**
 * RN-side validated native tracking metadata for one card.
 *
 * Source: `reference_image_url` + `physical_width_m` from the backend
 * `ARExperienceResponse`, after strict validation in
 * `validateNativeTrackingMetadata`.
 *
 * Field naming follows the backend wire format (`referenceImageUrl`,
 * `physicalWidthMeters`) — these are RN-owned validated fields, distinct
 * from the bridge field names (`imageUrl`, `physicalWidthMeters`) on
 * `CardDescriptorRN`. The mapping between `NativeTrackingDto` and
 * `CardDescriptorRN` is intentionally explicit (`toCardDescriptorRN`).
 *
 * No `arTag` — RQ-3 is CLOSED. Unity `MultiCardRegistry` owns the
 * arTag → qrId lookup.
 */
export interface NativeTrackingDto {
  qrId: string;
  referenceImageUrl: string;
  physicalWidthMeters: number;
  /** 3D model URL — used by Unity for GLTFast instantiation when card is tracked. */
  modelUrl?: string;
  /** Card word — sent to Unity alongside the model. */
  word?: string;
}

/**
 * Result of validating native tracking metadata from a backend response.
 *
 * `unavailable` is the discriminated union returned when the backend has
 * not shipped `reference_image_url` / `physical_width_m` (BACKEND-T001),
 * or when the fields are present but invalid (BQ-2 / BQ-3 unresolved).
 *
 * The `reason` field is RN-internal — it discriminates the failure category
 * so downstream code can route to `BACKEND_METADATA_UNAVAILABLE` (an
 * additive RN-owned error code per `mobile-ar-product-spec.md §I-1`
 * extension). This is distinct from `REFERENCE_IMAGE_LOAD_FAILED` (Unity →
 * RN, requires a valid URL).
 */
export type NativeTrackingAvailability =
  | { kind: 'ready'; tracking: NativeTrackingDto }
  | { kind: 'unavailable'; reason: 'missing_reference_image' | 'missing_physical_width' | 'both' | 'invalid_physical_width'; qrId: string };

export interface ARStabilityConfig {
  plane_detection: boolean;
  image_tracking: boolean;
  object_anchoring: boolean;
  light_estimation: boolean;
}
