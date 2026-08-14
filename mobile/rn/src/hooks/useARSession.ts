import { useState, useEffect, useCallback, useRef } from 'react';
import { unityBridge } from '../bridge/UnityBridgeModule';
import { mapToUnityPayload } from '../bridge/ARExperienceMapper';
import { flashcardApi } from '../services/api';
import type { UnityARExperiencePayload } from '../types/ar';
import type { ARMessage } from '../bridge/arMessages';

export type ARState =
  | 'IDLE'
  | 'AR_INITIALIZING'
  | 'IMAGE_TRACKING_READY'
  | 'IMAGE_DETECTED'
  | 'MODEL_SPAWNING'
  | 'MODEL_LOADED'
  | 'AR_INTERACTING'
  | 'AR_ERROR';

export interface TrackedImage {
  /** AR Foundation runtime handle (informational — do not use as Map key). */
  imageId: string;
  /** Business identity — primary Map key, per TRACK-REQ-004. */
  qrId: string;
  imageName: string;
  modelId: string;
  transform: { x: number; y: number; z: number };
  trackingState: 'found' | 'updated' | 'lost';
  detectedAt: number;
}

export interface ARSessionState {
  arState: ARState;
  trackedImages: Map<string, TrackedImage>;
  activeCombos: string[];
  petState: 'idle' | 'anticipating' | 'eating' | 'satisfied';
  currentStreak: number;
  error: string | null;
  progress: number;
  progressStage: 'download' | 'load' | 'instantiate' | null;
  progressMessage: string;
}

export interface UseARSessionResult extends ARSessionState {
  canCombo: boolean;
  startSession: (lessonId: string, payload: UnityARExperiencePayload) => void;
  stopSession: () => void;
  triggerCombo: () => Promise<void>;
  feedPet: (foodModelId: string) => void;
  retry: () => void;
}

/**
 * Central hook managing the image-tracking AR state machine, Unity bridge subscriptions, and multi-card tracking.
 */
export const useARSession = (
  _lessonId?: string,
  _initialPayload?: UnityARExperiencePayload
): UseARSessionResult => {
  const [arState, setArState] = useState<ARState>('IDLE');
  const [trackedImages, setTrackedImages] = useState<Map<string, TrackedImage>>(new Map());
  const [activeCombos, setActiveCombos] = useState<string[]>([]);
  const [petState, setPetState] = useState<'idle' | 'anticipating' | 'eating' | 'satisfied'>('idle');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState<'download' | 'load' | 'instantiate' | null>(null);
  const [progressMessage, setProgressMessage] = useState('');

  const currentPayloadRef = useRef<UnityARExperiencePayload | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTrackingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleUnityEvent = useCallback((message: ARMessage) => {
    switch (message.type) {
      case 'onArReady':
        setArState('IMAGE_TRACKING_READY');
        clearTrackingTimeout();
        break;

      case 'onError': {
        const payload = message.payload as { code: string; message: string };
        setError(payload.message);
        setArState('AR_ERROR');
        clearTrackingTimeout();
        break;
      }

      case 'onImageDetected': {
        // Per bridge-contract.md §K-2, qrId is the business card identity.
        // imageId is the AR Foundation runtime handle (informational only).
        const payload = message.payload as { imageId: string; qrId: string; imageName: string; transform: { x: number; y: number; z: number } };
        setTrackedImages(prev => {
          const next = new Map(prev);
          next.set(payload.qrId, {
            imageId: payload.imageId,
            qrId: payload.qrId,
            imageName: payload.imageName,
            modelId: '',
            transform: payload.transform,
            trackingState: 'found',
            detectedAt: Date.now(),
          });
          return next;
        });
        if (arState === 'IMAGE_TRACKING_READY') {
          setArState('IMAGE_DETECTED');
        }
        break;
      }

      case 'onImageTrackingLost': {
        // Per bridge-contract.md §K-2: payload carries qrId (business identity).
        // NOT tracking-state degradation — that is a quality signal, not removal.
        const payload = message.payload as { qrId: string };
        setTrackedImages(prev => {
          const next = new Map(prev);
          next.delete(payload.qrId);
          return next;
        });
        if (arState !== 'IDLE' && arState !== 'AR_INITIALIZING') {
          setArState('IMAGE_TRACKING_READY');
        }
        break;
      }

      case 'onMultiImageDetected':
        if (arState === 'MODEL_LOADED') {
          setArState('AR_INTERACTING');
        }
        break;

      case 'onModelProgress': {
        const payload = message.payload as { stage: 'download' | 'load' | 'instantiate'; progress: number; message: string };
        setProgressStage(payload.stage);
        setProgress(payload.progress);
        setProgressMessage(payload.message);
        if (arState === 'IMAGE_DETECTED') {
          setArState('MODEL_SPAWNING');
        }
        break;
      }

      case 'onCacheHit':
        setProgress(1);
        setProgressStage('load');
        setProgressMessage('Using cached model');
        break;

      case 'onObjectPlaced':
        setProgress(1);
        setProgressStage('instantiate');
        setProgressMessage('Ready!');
        break;

      case 'onModelLoaded': {
        // qrId is present per spec §K-2 (for card lookup); handler only needs AR state.
        if (arState === 'MODEL_SPAWNING') {
          setArState('MODEL_LOADED');
          if (trackedImages.size >= 2) {
            setArState('AR_INTERACTING');
          }
        }
        break;
      }

      case 'onProximityNear':
        // Show combo hint UI
        break;

      case 'onComboTriggered':
        // Play combo animation
        break;

      case 'onComboComplete': {
        const payload = message.payload as { rewardCardId: string; xpAwarded: number };
        setCurrentStreak(prev => prev + payload.xpAwarded);
        break;
      }

      case 'onFoodFed': {
        const payload = message.payload as { foodModelId: string; xpAwarded: number; streakCount: number };
        setCurrentStreak(prev => prev + payload.xpAwarded);
        break;
      }

      case 'onPetStateChanged': {
        const payload = message.payload as { state: 'idle' | 'anticipating' | 'eating' | 'satisfied' };
        setPetState(payload.state);
        break;
      }

      default:
        break;
    }
  }, [arState, trackedImages.size, clearTrackingTimeout]);

  // Subscribe to Unity events on mount
  useEffect(() => {
    const unsubscribers = [
      unityBridge.subscribe('onArReady', handleUnityEvent),
      unityBridge.subscribe('onError', handleUnityEvent),
      unityBridge.subscribe('onImageDetected', handleUnityEvent),
      unityBridge.subscribe('onImageTrackingLost', handleUnityEvent),
      unityBridge.subscribe('onMultiImageDetected', handleUnityEvent),
      unityBridge.subscribe('onModelProgress', handleUnityEvent),
      unityBridge.subscribe('onCacheHit', handleUnityEvent),
      unityBridge.subscribe('onObjectPlaced', handleUnityEvent),
      unityBridge.subscribe('onModelLoaded', handleUnityEvent),
      unityBridge.subscribe('onProximityNear', handleUnityEvent),
      unityBridge.subscribe('onComboTriggered', handleUnityEvent),
      unityBridge.subscribe('onComboComplete', handleUnityEvent),
      unityBridge.subscribe('onFoodDragging', handleUnityEvent),
      unityBridge.subscribe('onFoodFed', handleUnityEvent),
      unityBridge.subscribe('onPetStateChanged', handleUnityEvent),
    ];

    return () => {
      unsubscribers.forEach(fn => fn?.());
      clearTrackingTimeout();
    };
  }, [handleUnityEvent, clearTrackingTimeout]);

  const startSession = useCallback((lessonId: string, payload: UnityARExperiencePayload) => {
    currentPayloadRef.current = payload;
    setArState('AR_INITIALIZING');
    setError(null);
    setProgress(0);
    setProgressStage(null);
    setProgressMessage('');

    // Set 10-second timeout for AR initialization
    timeoutRef.current = setTimeout(() => {
      setError('AR session timed out. Please try again.');
      setArState('AR_ERROR');
    }, 10000);

    // Start AR session
    unityBridge.startARSession?.();

    // Load AR experience
    unityBridge.loadExperience(payload);
  }, []);

  const stopSession = useCallback(() => {
    clearTrackingTimeout();
    unityBridge.destroySession?.();
    setArState('IDLE');
    setTrackedImages(new Map());
    setActiveCombos([]);
    setPetState('idle');
    setCurrentStreak(0);
    setError(null);
    setProgress(0);
    setProgressStage(null);
    currentPayloadRef.current = null;
  }, [clearTrackingTimeout]);

  const triggerCombo = useCallback(async () => {
    const images = Array.from(trackedImages.values());
    if (images.length < 2) return;
    // ⚠️ DECISION_REQUIRED — combo semantic identity unresolved.
    //
    // Per `mobile-ar-product-spec.md §F-1`, combos are identified by `arTag`
    // (semantic combo tag) — backend `related_combos` is keyed by ar_tag,
    // NOT qr_id. Per `bridge-contract.md §"React Native → Unity Methods"`,
    // `triggerCombo` payload is `{ cardA, cardB }` with no field-level
    // semantic identity specified (ambiguous).
    //
    // Current implementation passes `qrId` because:
    //   1. `TrackedImage` exposes `qrId` (REQUIRED per spec §K-2)
    //   2. The bridge has no `arTag` field on `TrackedImage`
    //
    // This needs resolution before combo UX lands (M5). Until then:
    //   - Unity side (`ComboManager`) is the source of truth for ar_tag mapping
    //   - RN should NOT silently choose qrId over arTag
    //
    // Forwarded as DECISION_REQUIRED: see MQ-7 (added).
    await unityBridge.triggerCombo?.(images[0].qrId, images[1].qrId);
  }, [trackedImages]);

  const feedPet = useCallback((foodModelId: string) => {
    // Forward to Unity via bridge
  }, []);

  const retry = useCallback(() => {
    if (currentPayloadRef.current) {
      startSession('', currentPayloadRef.current);
    } else {
      setArState('IDLE');
    }
  }, [startSession]);

  return {
    arState,
    trackedImages,
    activeCombos,
    petState,
    currentStreak,
    error,
    progress,
    progressStage,
    progressMessage,
    canCombo: trackedImages.size >= 2,
    startSession,
    stopSession,
    triggerCombo,
    feedPet,
    retry,
  };
};
