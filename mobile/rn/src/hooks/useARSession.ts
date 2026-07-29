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
  imageId: string;
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
        const payload = message.payload as { imageId: string; imageName: string; transform: { x: number; y: number; z: number } };
        setTrackedImages(prev => {
          const next = new Map(prev);
          next.set(payload.imageId, {
            imageId: payload.imageId,
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
        const payload = message.payload as { imageId: string };
        setTrackedImages(prev => {
          const next = new Map(prev);
          next.delete(payload.imageId);
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

      case 'onModelLoaded':
        if (arState === 'MODEL_SPAWNING') {
          setArState('MODEL_LOADED');
          // Check if we should go to AR_INTERACTING
          if (trackedImages.size >= 2) {
            setArState('AR_INTERACTING');
          }
        }
        break;

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
    const images = Array.from(trackedImages.keys());
    if (images.length < 2) return;

    await unityBridge.triggerCombo?.(images[0], images[1]);
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
