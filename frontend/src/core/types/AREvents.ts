// src/core/types/AREvents.ts
import type { AFrameScene } from '@/types/aframe';
import type { ARTarget, ARCombo } from '@/types';

/**
 * AR Event constants (const assertion thay vì enum)
 */
export const AREvent = {
  SCENE_READY: 'SCENE_READY',
  SCENE_DESTROYED: 'SCENE_DESTROYED',
  VIDEO_READY: 'VIDEO_READY',
  MARKER_FOUND: 'MARKER_FOUND',
  MARKER_LOST: 'MARKER_LOST',
  COMBO_ACTIVATED: 'COMBO_ACTIVATED',
  COMBO_DEACTIVATED: 'COMBO_DEACTIVATED',
  DISPLAY_MODE_CHANGED: 'DISPLAY_MODE_CHANGED',
  AR_ERROR: 'AR_ERROR',
} as const;

export type AREventType = typeof AREvent[keyof typeof AREvent];

/**
 * Event payload type mapping
 */
export interface AREventPayloadMap {
  [AREvent.SCENE_READY]: { scene: AFrameScene };
  [AREvent.SCENE_DESTROYED]: { scene: AFrameScene };
  [AREvent.VIDEO_READY]: { video: HTMLVideoElement };
  [AREvent.MARKER_FOUND]: { markerId: string; target?: ARTarget };
  [AREvent.MARKER_LOST]: { markerId: string };
  [AREvent.COMBO_ACTIVATED]: { combo: ARCombo; anchorMarkerId: string };
  [AREvent.COMBO_DEACTIVATED]: { combo: ARCombo };
  [AREvent.DISPLAY_MODE_CHANGED]: { mode: '2D' | '3D' };
  [AREvent.AR_ERROR]: { error: Error; context?: string };
}

export type AREventEmitter = {
  emit<K extends AREventType>(
    event: K,
    payload: K extends keyof AREventPayloadMap ? AREventPayloadMap[K] : never
  ): void;
};

export type AREventSubscriber = {
  on<K extends AREventType>(
    event: K,
    callback: (payload: K extends keyof AREventPayloadMap ? AREventPayloadMap[K] : never) => void
  ): () => void;
};