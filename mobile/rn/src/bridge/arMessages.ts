import type { UnityARExperiencePayload } from '../types/ar';

/**
 * Message types for Unity-React Native AR bridge communication.
 * Extended for Phase 2: image tracking, combos, food/pet interactions.
 */
export type ARMessageType =
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
  | 'onAnimationComplete';

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

// Type guards for common payloads
export interface OnModelProgressPayload {
  stage: 'download' | 'load' | 'instantiate';
  progress: number;
  message: string;
}

export interface OnImageDetectedPayload {
  imageId: string;
  imageName: string;
  transform: { x: number; y: number; z: number };
}

export interface OnErrorPayload {
  code: string;
  message: string;
}
