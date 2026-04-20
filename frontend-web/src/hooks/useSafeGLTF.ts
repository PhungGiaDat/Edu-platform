/**
 * useSafeGLTF.ts
 * 
 * A COMPLETELY SAFE wrapper that loads GLTF models WITHOUT using useGLTF.
 * 
 * Problem: useGLTF from @react-three/drei throws synchronously when:
 * - The fetch fails (network error, 404, CORS)
 * - The response body is undefined
 * This causes "Cannot read properties of undefined (reading 'body')" errors
 * that crash the entire React app before error boundaries can catch them.
 * 
 * Solution: Use THREE.GLTFLoader directly in useEffect, with full async error handling.
 * This completely avoids the synchronous throw issue because loading happens
 * in an effect, not during render.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export type GLTFLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface SafeGLTFResult {
  /** The loaded GLTF object, or null if not yet loaded or failed */
  gltf: GLTF | null;
  /** Current loading state */
  state: GLTFLoadingState;
  /** Error message if loading failed */
  error: string | null;
  /** Loading progress (0-100) */
  progress: number;
  /** Retry loading the model */
  retry: () => void;
}

// Singleton loader instances for reuse
let dracoLoader: DRACOLoader | null = null;

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  }
  return dracoLoader;
}

function createGLTFLoader(modelUrl: string): GLTFLoader {
  const manager = new THREE.LoadingManager();
  const baseModelUrl = new URL(modelUrl);

  // Keep signed query params for GLTF external resources (textures/bin files).
  // Supabase signed URLs commonly require this for every dependent request.
  manager.setURLModifier((resourceUrl) => {
    try {
      if (!resourceUrl || resourceUrl.startsWith('data:') || resourceUrl.startsWith('blob:')) {
        return resourceUrl;
      }

      const resolved = new URL(resourceUrl, baseModelUrl);
      const modelHasQuery = baseModelUrl.search.length > 1;
      const resourceHasQuery = resolved.search.length > 1;

      if (
        modelHasQuery &&
        !resourceHasQuery &&
        resolved.origin === baseModelUrl.origin
      ) {
        resolved.search = baseModelUrl.search;
      }

      return resolved.toString();
    } catch {
      return resourceUrl;
    }
  });

  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(getDracoLoader());
  return loader;
}

// Cache for loaded models to avoid re-downloading
const modelCache = new Map<string, GLTF>();


/**
 * Safe GLTF loader that uses THREE.GLTFLoader directly
 * 
 * This hook NEVER throws during render - all loading happens in useEffect
 * 
 * @param url - The URL of the GLTF/GLB model to load
 * @returns SafeGLTFResult with loading state and GLTF object
 * 
 * @example
 * ```tsx
 * function MyModel({ url }: { url: string }) {
 *   const { gltf, state, error, progress, retry } = useSafeGLTF(url);
 *   
 *   if (state === 'loading') {
 *     return <LoadingSpinner progress={progress} />;
 *   }
 *   
 *   if (state === 'error' || !gltf) {
 *     return <ErrorFallback message={error} onRetry={retry} />;
 *   }
 *   
 *   return <primitive object={gltf.scene} />;
 * }
 * ```
 */
export function useSafeGLTF(url: string | null | undefined): SafeGLTFResult {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [state, setState] = useState<GLTFLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Reset state when URL changes
    setGltf(null);
    setError(null);
    setProgress(0);

    // Validate URL
    if (!url) {
      setState('error');
      setError('No model URL provided');
      return;
    }

    // Check URL format
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setState('error');
        setError('Invalid URL protocol - must be http or https');
        return;
      }
    } catch {
      setState('error');
      setError('Invalid URL format');
      return;
    }

    // Check cache first
    const cached = modelCache.get(url);
    if (cached) {
      setGltf(cached);
      setState('loaded');
      setProgress(100);
      return;
    }

    // Start loading
    setState('loading');
    setProgress(0);

    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loader = createGLTFLoader(url);

    // Load the model asynchronously
    loader.load(
      url,
      // onLoad callback
      (loadedGltf) => {
        if (signal.aborted) return;
        
        // Post-process: Removed aggressive fallback material application
        // applyFallbackMaterials(loadedGltf.scene, url);
        
        // Cache the result
        modelCache.set(url, loadedGltf);
        
        setGltf(loadedGltf);
        setState('loaded');
        setProgress(100);
      },
      // onProgress callback
      (progressEvent) => {
        if (signal.aborted) return;
        
        if (progressEvent.lengthComputable) {
          const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
          setProgress(Math.round(percentComplete));
        } else {
          // If length not computable, show indeterminate progress
          setProgress((prev) => Math.min(prev + 10, 90));
        }
      },
      // onError callback
      (loadError) => {
        if (signal.aborted) return;
        
        console.error('[useSafeGLTF] Failed to load model:', url, loadError);
        
        // Parse error message
        let errorMessage = 'Failed to load 3D model';
        if (loadError instanceof Error) {
          if (loadError.message.includes('404')) {
            errorMessage = 'Model file not found';
          } else if (loadError.message.includes('CORS') || loadError.message.includes('cross-origin')) {
            errorMessage = 'Model blocked by CORS policy';
          } else if (loadError.message.includes('network') || loadError.message.includes('fetch')) {
            errorMessage = 'Network error loading model';
          } else if (loadError.message.includes('body')) {
            errorMessage = 'Invalid model response';
          } else {
            errorMessage = loadError.message;
          }
        }
        
        setError(errorMessage);
        setState('error');
        setProgress(0);
      }
    );

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [url, retryCount]);

  // Retry function
  const retry = useCallback(() => {
    // Clear cache for this URL to force reload
    if (url) {
      modelCache.delete(url);
    }
    setRetryCount((c) => c + 1);
  }, [url]);

  return {
    gltf,
    state,
    error,
    progress,
    retry,
  };
}

/**
 * Preload a GLTF model into cache
 * Use this to preload models before they're needed
 */
export function preloadGLTFSafe(url: string): Promise<GLTF | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    // Check cache first
    const cached = modelCache.get(url);
    if (cached) {
      resolve(cached);
      return;
    }

    const loader = createGLTFLoader(url);
    
    loader.load(
      url,
      (gltf) => {
        modelCache.set(url, gltf);
        resolve(gltf);
      },
      undefined,
      (error) => {
        console.warn('[preloadGLTFSafe] Failed to preload:', url, error);
        resolve(null);
      }
    );
  });
}

/**
 * Clear the model cache
 * Useful when you need to free memory or force reload
 */
export function clearModelCache(url?: string): void {
  if (url) {
    modelCache.delete(url);
  } else {
    modelCache.clear();
  }
}

/**
 * Check if a model is cached
 */
export function isModelCached(url: string): boolean {
  return modelCache.has(url);
}

export default useSafeGLTF;
