// src/hooks/useRuntimeBridge.ts - FIXED QR Auto-Start
import { useEffect, useRef } from 'react';
import { runtimeBridge } from '@/runtime/RuntimeBridge';

export interface UseRuntimeBridgeOptions {
  autoStartQR?: boolean;
  debug?: boolean;
}

export function useRuntimeBridge(
  options: UseRuntimeBridgeOptions = {}
) {
  const { debug = false } = options;
  const initRef = useRef(false);

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
    };
  }, [debug]);

  return runtimeBridge;
}

export function useRuntimeStatus() {
  return runtimeBridge.getStatus();
}