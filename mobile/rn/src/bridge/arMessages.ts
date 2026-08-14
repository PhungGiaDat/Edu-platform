import type {
  UnityARExperiencePayload,
  CardDescriptorRN,
} from '../types/ar';

/**
 * Message types for Unity-React Native AR bridge communication.
 * Extended for Phase 2: image tracking, combos, food/pet interactions.
 */
export type ARMessageType =
  | 'UNITY_READY'
  | 'PONG'
  // Core AR
  | 'onArReady'
  | 'onError'
  | 'onImageDetected'
  | 'onImageTrackingLost'
  | 'onMultiImageDetected'
  // Model loading
  | 'onModelProgress'
  | 'onCacheHit'
  | 'onObjectPlaced'
  | 'onModelLoaded'
  // Combos
  | 'onProximityNear'
  | 'onComboTriggered'
  | 'onComboComplete'
  // Food/Pet
  | 'onFoodDragging'
  | 'onFoodFed'
  | 'onPetStateChanged'
  // Legacy
  | 'LOAD_EXPERIENCE'
  | 'EXPERIENCE_LOADED'
  | 'EXPERIENCE_ERROR'
  | 'SCAN_START'
  | 'SCAN_SUCCESS'
  | 'SCAN_ERROR'
  | 'MODEL_ANIMATION'
  | 'AUDIO_PLAY'
  | 'CLOSE'
  | 'onInteraction'
  | 'onAnimationComplete'
  | 'onImagePoseUpdated';

export interface ARMessage {
  type: ARMessageType;
  payload?: UnityARExperiencePayload | Record<string, unknown>;
  timestamp: number;
}

export const createARMessage = (
  type: ARMessageType,
  payload?: ARMessage['payload']
): ARMessage => ({
  type,
  payload,
  timestamp: Date.now(),
});

// ---------------------------------------------------------------------------
// Typed payloads for Unity → RN events.
//
// Each interface below mirrors a row in `docs/unity_ar/spec/bridge-contract.md`
// §"Unity → React Native Events". Field names match the spec exactly; do not
// rename without a contract freeze (M1B / bridge-contract.md change).
//
// `useARSession` and other consumers should prefer these typed payloads over
// ad-hoc inline type assertions.
// ---------------------------------------------------------------------------

/** onArReady — Unity signals the AR subsystem is initialized and tracking can begin. */
export interface OnArReadyPayload {
  version: string;
}

/** onError — failure surfaced from Unity (camera, tracking, model load, ...). */
export interface OnErrorPayload {
  code: string;
  message: string;
}

/**
 * onImageDetected — emitted when a tracked image is first detected.
 *
 * Per bridge-contract.md §K-2, the runtime payload carries `qrId` (looked up
 * from MultiCardRegistry on the Unity side) so RN can key flashcards / combos /
 * XP by business identity rather than the runtime `imageId`. Both fields are
 * present: `imageId` is the AR Foundation runtime handle; `qrId` is the
 * authoritative card identifier for UX and game logic.
 */
export interface OnImageDetectedPayload {
  /** AR Foundation runtime instance handle. */
  imageId: string;
  imageName: string;
  /** Business identity (qr_id). Primary card identifier for UX/logic. */
  qrId: string;
  transform: { x: number; y: number; z: number };
}

/**
 * onImageTrackingLost — emitted ONLY when the trackable is removed from the
 * ARTrackedImageManager registry (TRACK-REQ-011). Tracking state degradation
 * (Limited/None) is a quality signal and must NOT fire this event.
 *
 * Per bridge-contract.md §K-2: `qrId` is REQUIRED — the business card identity.
 *
 * `reason` is DECISION_REQUIRED (RQ-4) — the semantic distinction between
 * CARD_REMOVED and TEMPORARY_OCCLUSION affects RN UX. Until RQ-4 resolves,
 * callers should guard with optional chaining.
 *
 * ⚠️ Tracking-state degradation !== trackable removal. A card briefly
 * occluded (trackingState = Limited) must NOT clear the flashcard overlay
 * if the trackable is still registered.
 */
export interface OnImageTrackingLostPayload {
  /** Business card identity — REQUIRED per spec §K-2. */
  qrId: string;
  reason?: 'CARD_REMOVED' | 'TEMPORARY_OCCLUSION';
}

/**
 * onMultiImageDetected — N tracked images are present simultaneously.
 *
 * Per bridge-contract.md §K-2: payload carries `qrIds[]` (business identities
 * looked up from MultiCardRegistry) so RN can reason about which cards are present.
 *
 * Legacy Unity `RNEventEmitter` implementations may emit `imageIds[]` (runtime
 * handles) instead. The union `qrIds | imageIds` preserves compat until the
 * Unity side is updated to emit `qrIds`.
 *
 * RN consumers should prefer `qrIds` when present; fall back to `imageIds`
 * for legacy flows.
 */
export interface OnMultiImageDetectedPayload {
  /** Business card identities present (native AR contract). */
  qrIds?: string[];
  /** Runtime image handles (legacy; present until Unity emits qrIds). */
  imageIds?: string[];
  count: number;
}

/** onModelProgress — model load progress events (download / load / instantiate). */
export interface OnModelProgressPayload {
  stage: 'download' | 'load' | 'instantiate';
  progress: number;
  message: string;
}

/**
 * onObjectPlaced — a model has been anchored in world space.
 *
 * ⚠️ LEGACY — plane-detection / plane-tap semantics.
 * Per bridge-contract.md §K-4 / MOB-ERR-REQ-030:
 * > `onObjectPlaced` carries plane-tap semantics from a legacy design.
 * > For native image tracking, `onImageDetected` is the primary spatial event.
 * > `onObjectPlaced` is NOT the image-tracking anchor event.
 *
 * This event remains in the union for backward compatibility with Unity's
 * current `RNEventEmitter` implementation, but it is NOT part of the active
 * native image-tracking contract. Do not use it as the anchor signal for
 * native AR flows.
 */
/** @deprecated legacy — see OnObjectPlacedPayload docblock. */
export interface OnObjectPlacedPayload {
  qrId: string;
  worldX: number;
  worldY: number;
  worldZ: number;
}

/** onModelLoaded — GLB finished loading and is ready to display. */
export interface OnModelLoadedPayload {
  modelUrl: string;
  /** Business card identity — REQUIRED per spec §K-2. */
  qrId: string;
}

/**
 * onProximityNear — two tracked cards are physically close enough to combo.
 *
 * `arTag` (semantic combo tag) is preferred over qrId pairs for combo lookup
 * — backend `related_combos` is keyed by ar_tag, not qr_id (see
 * `backend-contract.md` §"Tracking Identity").
 */
export interface OnProximityNearPayload {
  imageIdA: string;
  imageIdB: string;
  arTag: string;
  distance: number;
}

/**
 * onComboTriggered — combo fired (proximity dwell or user tap).
 * Identified by `arTag` (semantic) rather than qr_id pair.
 */
export interface OnComboTriggeredPayload {
  cardIdA: string;
  cardIdB: string;
  arTag: string;
  comboId: string;
}

/** onComboComplete — combo finished playing, XP awarded. */
export interface OnComboCompletePayload {
  rewardCardId: string;
  xpAwarded: number;
}

/** onFoodDragging — user is dragging a food model toward the pet. */
export interface OnFoodDraggingPayload {
  foodModelId: string;
}

/** onFoodFed — feeding animation completed; XP awarded, streak incremented. */
export interface OnFoodFedPayload {
  foodModelId: string;
  xpAwarded: number;
  streakCount: number;
}

/** onPetStateChanged — pet entered a new state. */
export interface OnPetStateChangedPayload {
  state: 'idle' | 'anticipating' | 'eating' | 'satisfied';
}

/**
 * onAnimationComplete — model animation finished playing.
 *
 * Emitted by Unity AnimationController when a GLB animation clip finishes.
 */
export interface OnAnimationCompletePayload {
  /** Animation clip name that completed. */
  clip: string;
  /** Business card identity (qrId) associated with this model. */
  qrId: string;
}

/**
 * onImagePoseUpdated — tracked image pose changed (per-frame update).
 *
 * Emitted from ARSessionManager's HandleTrackedImagesChanged args.updated path.
 * This is a quality/pose stream, NOT trackable removal — tracking state
 * changes (TRACKING / LIMITED / NONE) are normal behavior while the
 * trackable remains registered.
 */
export interface OnImagePoseUpdatedPayload {
  /** AR Foundation runtime instance handle. */
  imageId: string;
  trackableId: string;
  trackingState: string;
  transform: { x: number; y: number; z: number };
}

// ---------------------------------------------------------------------------
// RN → Unity method payloads.
//
// These describe what RN sends into `UnityBridgeModule`. They are intentionally
// distinct from the runtime Unity C# types — the bridge serializes them to
// "methodName|{json}" per `RNMessageReceiver.OnMessageFromRN`.
// ---------------------------------------------------------------------------

/**
 * Payload for `loadARExperience(json)`. Carries the experience metadata for
 * one card. Note: does NOT include `referenceImageUrl` / `physicalWidthMeters`
 * — those belong to `CardDescriptorRN` and flow via `startImageTrackingMulti`.
 */
export type LoadARExperiencePayload = UnityARExperiencePayload;

/**
 * Payload for `startImageTrackingMulti(json)`. Per bridge-contract.md
 * §"Multi-Card Bridge Contract".
 */
export interface StartImageTrackingMultiPayload {
  cards: CardDescriptorRN[];
}

/** Payload for `setPlaneDetection(bool)`. */
export interface SetPlaneDetectionPayload {
  enabled: boolean;
}

/** Payload for `triggerCombo({ cardA, cardB })`. */
export interface TriggerComboPayload {
  cardA: string;
  cardB: string;
}
