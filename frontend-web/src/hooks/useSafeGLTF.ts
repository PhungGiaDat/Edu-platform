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

const SUPPORTED_MODEL_EXTENSIONS = new Set(['.glb', '.gltf']);

function getPathExtension(pathname: string): string {
  const lastDotIndex = pathname.lastIndexOf('.');
  if (lastDotIndex < 0) {
    return '';
  }
  return pathname.slice(lastDotIndex).toLowerCase();
}

function isSupportedModelUrl(modelUrl: string): boolean {
  try {
    const parsed = new URL(modelUrl);
    const extension = getPathExtension(parsed.pathname);
    return SUPPORTED_MODEL_EXTENSIONS.has(extension);
  } catch {
    return false;
  }
}

function getDracoLoader(): DRACOLoader {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  }
  return dracoLoader;
}

function createGLTFLoader(modelUrl: string): {
  loader: GLTFLoader;
  getExternalDependencies: () => string[];
} {
  const manager = new THREE.LoadingManager();
  const baseModelUrl = new URL(modelUrl);
  const externalDependencies = new Set<string>();

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

      const isPrimaryModelRequest =
        resolved.pathname === baseModelUrl.pathname &&
        resolved.search === baseModelUrl.search;

      if (!isPrimaryModelRequest) {
        externalDependencies.add(resolved.toString());
      }

      return resolved.toString();
    } catch {
      return resourceUrl;
    }
  });

  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(getDracoLoader());
  return {
    loader,
    getExternalDependencies: () => Array.from(externalDependencies),
  };
}

// Cache for loaded models to avoid re-downloading
const modelCache = new Map<string, GLTF>();

function getModelCacheKey(url: string, textureUrl?: string | null): string {
  return textureUrl ? `${url}::texture=${textureUrl}` : url;
}


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
export function useSafeGLTF(url: string | null | undefined, textureUrl?: string | null): SafeGLTFResult {
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

      const extension = getPathExtension(parsed.pathname);
      if (!SUPPORTED_MODEL_EXTENSIONS.has(extension)) {
        setState('error');
        setError('Unsupported model format. Use pipeline-generated self-contained .glb/.gltf assets.');
        return;
      }
    } catch {
      setState('error');
      setError('Invalid URL format');
      return;
    }

    const cacheKey = getModelCacheKey(url, textureUrl);

    // Check cache first
    const cached = modelCache.get(cacheKey);
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

    const { loader, getExternalDependencies } = createGLTFLoader(url);

        // Load the model asynchronously
        console.log('[useSafeGLTF] Starting load for:', url);
        loader.load(
            url,
            // onLoad callback
            (loadedGltf) => {
                if (signal.aborted) return;
                console.log('[useSafeGLTF] Model file loaded successfully:', url);

                const externalDependencies = getExternalDependencies();
                if (externalDependencies.length > 0 && !textureUrl) {
                    console.warn('[useSafeGLTF] Legacy split-file model detected without override:', url, externalDependencies);
                    setError('Legacy split-file model detected. Re-upload as self-contained optimized GLB.');
                    setState('error');
                    setProgress(0);
                    return;
                }
                
                if (externalDependencies.length > 0) {
                    console.log('[useSafeGLTF] External dependencies detected but override is available. Proceeding...', externalDependencies);
                }
                
                // If a separate textureUrl is provided, override the model's textures
                if (textureUrl) {
                    console.log('[useSafeGLTF] Applying texture override:', textureUrl);
                    const textureLoader = new THREE.TextureLoader();
                    textureLoader.setCrossOrigin('anonymous');
                    
                    // Set a timeout for texture loading so it doesn't hang the whole model
                    const textureTimeout = setTimeout(() => {
                        console.warn('[useSafeGLTF] Texture load timed out, showing model without override');
                        modelCache.set(cacheKey, loadedGltf);
                        setGltf(loadedGltf);
                        setState('loaded');
                        setProgress(100);
                    }, 5000);

                    textureLoader.load(textureUrl, (texture) => {
                        clearTimeout(textureTimeout);
                        if (signal.aborted) return;

                        // Pixel-perfect sharp look for Cube Pets
                        texture.minFilter = THREE.NearestFilter;
                        texture.magFilter = THREE.NearestFilter;
                        texture.flipY = false; 
                        texture.colorSpace = THREE.SRGBColorSpace;
                        
                        loadedGltf.scene.traverse((child) => {
                            if (child instanceof THREE.Mesh) {
                                // Apply to single material or array of materials
                                const materials = Array.isArray(child.material) ? child.material : [child.material];
                                materials.forEach(mat => {
                                    if (mat) {
                                        mat.map = texture;
                                        mat.needsUpdate = true;
                                    }
                                });
                            }
                        });
                        
                        console.log('[useSafeGLTF] Texture applied and model ready');
                        modelCache.set(cacheKey, loadedGltf);
                        setGltf(loadedGltf);
                        setState('loaded');
                        setProgress(100);
                    }, undefined, (err) => {
                        clearTimeout(textureTimeout);
                        console.error('[useSafeGLTF] Failed to load separate texture:', textureUrl, err);
                        modelCache.set(cacheKey, loadedGltf);
                        setGltf(loadedGltf);
                        setState('loaded');
                        setProgress(100);
                    });
                } else {
                    // Standard load for self-contained GLBs
                    modelCache.set(cacheKey, loadedGltf);
                    setGltf(loadedGltf);
                    setState('loaded');
                    setProgress(100);
                }
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
  }, [url, textureUrl, retryCount]);

  // Retry function
  const retry = useCallback(() => {
    // Clear cache for this URL to force reload
    if (url) {
      modelCache.delete(getModelCacheKey(url, textureUrl));
    }
    setRetryCount((c) => c + 1);
  }, [url, textureUrl]);

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

    if (!isSupportedModelUrl(url)) {
      resolve(null);
      return;
    }

    // Check cache first
    const cached = modelCache.get(url);
    if (cached) {
      resolve(cached);
      return;
    }

    const { loader, getExternalDependencies } = createGLTFLoader(url);
    
    loader.load(
      url,
      (gltf) => {
        const externalDependencies = getExternalDependencies();
        if (externalDependencies.length > 0) {
          console.warn('[preloadGLTFSafe] Skipping legacy split-file model:', url, externalDependencies);
          resolve(null);
          return;
        }

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
