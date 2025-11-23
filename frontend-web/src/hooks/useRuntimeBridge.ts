// src/hooks/useRuntimeBridge.ts - FIXED QR Auto-Start
import { useEffect, useRef } from 'react';
import { runtimeBridge } from '@/runtime/RuntimeBridge';

export interface UseRuntimeBridgeOptions {
  autoStartQR?: boolean;
  debug?: boolean;
}

export function useRuntimeBridge(
  video: HTMLVideoElement | null,
  options: UseRuntimeBridgeOptions = {}
) {
  const { autoStartQR = true, debug = false } = options;
  const initRef = useRef(false);
  const videoInitializedRef = useRef(false);

  // Initialize bridge on mount (ONCE)
  useEffect(() => {
    if (initRef.current) {
      if (debug) console.log('⏭️ useRuntimeBridge: Already initialized');
      return;
    }

    if (debug) console.log('🚀 useRuntimeBridge: Initializing...');
    
    runtimeBridge.init();
    initRef.current = true;

    return () => {
      if (debug) console.log('🧹 useRuntimeBridge: Cleanup');
      runtimeBridge.cleanup();
      initRef.current = false;
      videoInitializedRef.current = false;
    };
  }, [debug]);

  // Start QR scanning when video becomes available
  useEffect(() => {
    if (!video || !autoStartQR || !initRef.current) {
      return;
    }

    // Prevent double initialization
    if (videoInitializedRef.current) {
      if (debug) console.log('⏭️ useRuntimeBridge: QR already started');
      return;
    }

    if (debug) console.log('🔍 useRuntimeBridge: Starting QR scanning with video');
    
    // Wait a bit for video to be ready
    const timer = setTimeout(() => {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        if (debug) console.log('✅ Video ready, starting QR service');
        runtimeBridge.startQRScanning(video);
        videoInitializedRef.current = true;
      } else {
        if (debug) console.log('⏳ Video not ready yet, waiting...');
        // Try again after video is ready
        const checkReady = setInterval(() => {
          if (video.readyState >= video.HAVE_CURRENT_DATA) {
            if (debug) console.log('✅ Video now ready, starting QR service');
            runtimeBridge.startQRScanning(video);
            videoInitializedRef.current = true;
            clearInterval(checkReady);
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkReady);
          if (!videoInitializedRef.current) {
            console.warn('⚠️ Video readyState timeout');
          }
        }, 5000);
      }
    }, 500); // Wait 500ms for AR.js to initialize video

    return () => {
      clearTimeout(timer);
    };
  }, [video, autoStartQR, debug]);

  return runtimeBridge;
}

export function useRuntimeStatus() {
  return runtimeBridge.getStatus();
}