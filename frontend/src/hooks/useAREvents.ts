// src/hooks/useAREvents.ts
import { useEffect, useCallback } from 'react';
import type { IEventBus } from '@/core/interfaces/IEventBus';
import { AREvent } from '@/core/types/AREvents';

/**
 * Hook for video ready event
 */
export function useVideoReady(
  eventBus: IEventBus,
  onReady: (video: HTMLVideoElement) => void
) {
  const handleReady = useCallback((data: any) => {
    onReady(data.video);
  }, [onReady]);

  useEffect(() => {
    eventBus.on(AREvent.VIDEO_READY, handleReady);
    return () => {
      eventBus.off(AREvent.VIDEO_READY, handleReady);
    };
  }, [eventBus, handleReady]);
}

/**
 * Hook for marker found/lost events
 */
export function useMarkerEvents(
  eventBus: IEventBus,
  onFound?: (markerId: string, target?: any) => void,
  onLost?: (markerId: string) => void
) {
  const handleFound = useCallback((data: any) => {
    if (onFound) {
      onFound(data.markerId, data.target);
    }
  }, [onFound]);

  const handleLost = useCallback((data: any) => {
    if (onLost) {
      onLost(data.markerId);
    }
  }, [onLost]);

  useEffect(() => {
    if (onFound) {
      eventBus.on(AREvent.MARKER_FOUND, handleFound);
    }
    if (onLost) {
      eventBus.on(AREvent.MARKER_LOST, handleLost);
    }

    return () => {
      if (onFound) {
        eventBus.off(AREvent.MARKER_FOUND, handleFound);
      }
      if (onLost) {
        eventBus.off(AREvent.MARKER_LOST, handleLost);
      }
    };
  }, [eventBus, onFound, onLost, handleFound, handleLost]);
}

/**
 * Hook for combo events
 */
export function useComboEvents(
  eventBus: IEventBus,
  onActivated?: (combo: any) => void,
  onDeactivated?: (combo: any) => void
) {
  const handleActivated = useCallback((data: any) => {
    if (onActivated) {
      onActivated(data.combo);
    }
  }, [onActivated]);

  const handleDeactivated = useCallback((data: any) => {
    if (onDeactivated) {
      onDeactivated(data.combo);
    }
  }, [onDeactivated]);

  useEffect(() => {
    if (onActivated) {
      eventBus.on(AREvent.COMBO_ACTIVATED, handleActivated);
    }
    if (onDeactivated) {
      eventBus.on(AREvent.COMBO_DEACTIVATED, handleDeactivated);
    }

    return () => {
      if (onActivated) {
        eventBus.off(AREvent.COMBO_ACTIVATED, handleActivated);
      }
      if (onDeactivated) {
        eventBus.off(AREvent.COMBO_DEACTIVATED, handleDeactivated);
      }
    };
  }, [eventBus, onActivated, onDeactivated, handleActivated, handleDeactivated]);
}

/**
 * Hook for display mode changes
 */
export function useDisplayModeChange(
  eventBus: IEventBus,
  onChange: (mode: '2D' | '3D') => void
) {
  const handleChange = useCallback((data: any) => {
    onChange(data.mode);
  }, [onChange]);

  useEffect(() => {
    eventBus.on(AREvent.DISPLAY_MODE_CHANGED, handleChange);
    return () => {
      eventBus.off(AREvent.DISPLAY_MODE_CHANGED, handleChange);
    };
  }, [eventBus, handleChange]);
}

/**
 * Hook for scene ready
 */
export function useSceneReady(
  eventBus: IEventBus,
  onReady: (scene: any) => void
) {
  const handleReady = useCallback((data: any) => {
    onReady(data.scene);
  }, [onReady]);

  useEffect(() => {
    eventBus.on(AREvent.SCENE_READY, handleReady);
    return () => {
      eventBus.off(AREvent.SCENE_READY, handleReady);
    };
  }, [eventBus, handleReady]);
}