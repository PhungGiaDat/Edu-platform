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
let gltfLoader: GLTFLoader | null = null;
let dracoLoader: DRACOLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    
    // Set up DRACO decoder for compressed models
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    gltfLoader.setDRACOLoader(dracoLoader);
  }
  return gltfLoader;
}

// Cache for loaded models to avoid re-downloading
const modelCache = new Map<string, GLTF>();

// Pleasant fallback colors for models with missing textures
const FALLBACK_COLORS = [
  0x8b7fbf, // Purple
  0x7fbeeb, // Sky Blue
  0x7feba8, // Mint Green
  0xebcf7f, // Golden Yellow
  0xeb9f7f, // Coral Orange
  0xf5a0c1, // Pink
  0xa0c1f5, // Light Blue
  0xc1f5a0, // Lime Green
  0xf5d6a0, // Peach
  0xd6a0f5, // Lavender
];

/**
 * Apply fallback materials to meshes with missing textures
 * This handles GLB files that reference external textures which fail to load
 */
function applyFallbackMaterials(scene: THREE.Object3D, url: string): void {
  // Generate consistent color based on URL
  const urlHash = url.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const fallbackColor = new THREE.Color(FALLBACK_COLORS[urlHash % FALLBACK_COLORS.length]);
  
  let texturesFixed = 0;
  
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((material) => {
          const stdMaterial = material as THREE.MeshStandardMaterial;
          
          // Check if map (diffuse texture) exists but failed to load
          if (stdMaterial.map) {
            const texture = stdMaterial.map;
            // Check if texture image is valid
            const hasValidImage = texture.image && 
              (texture.image instanceof HTMLImageElement 
                ? texture.image.complete && texture.image.naturalWidth > 0 
                : texture.image.data || texture.image.width > 0);
            
            if (!hasValidImage) {
              // Texture failed to load - apply fallback
              stdMaterial.map = null;
              stdMaterial.color = fallbackColor;
              stdMaterial.metalness = 0.1;
              stdMaterial.roughness = 0.6;
              stdMaterial.needsUpdate = true;
              texturesFixed++;
            }
          } else {
            // No texture at all - this might be intentional or might be missing
            // If color is white (default), apply our fallback color for better visibility
            if (stdMaterial.color && stdMaterial.color.getHex() === 0xffffff) {
              stdMaterial.color = fallbackColor;
              stdMaterial.needsUpdate = true;
              texturesFixed++;
            }
          }
          
          // Also check for broken normal/roughness/metalness maps
          if (stdMaterial.normalMap && !stdMaterial.normalMap.image) {
            stdMaterial.normalMap = null;
            stdMaterial.needsUpdate = true;
          }
          if (stdMaterial.roughnessMap && !stdMaterial.roughnessMap.image) {
            stdMaterial.roughnessMap = null;
            stdMaterial.needsUpdate = true;
          }
          if (stdMaterial.metalnessMap && !stdMaterial.metalnessMap.image) {
            stdMaterial.metalnessMap = null;
            stdMaterial.needsUpdate = true;
          }
          if (stdMaterial.aoMap && !stdMaterial.aoMap.image) {
            stdMaterial.aoMap = null;
            stdMaterial.needsUpdate = true;
          }
        });
      }
    }
  });
  
  if (texturesFixed > 0) {
    console.warn(`[useSafeGLTF] Applied fallback materials to ${texturesFixed} meshes with missing textures`);
  }
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

    const loader = getGLTFLoader();

    // Load the model asynchronously
    loader.load(
      url,
      // onLoad callback
      (loadedGltf) => {
        if (signal.aborted) return;
        
        // Post-process: Apply fallback materials for missing textures
        // This handles the case where GLB references external textures that fail to load
        applyFallbackMaterials(loadedGltf.scene, url);
        
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

    const loader = getGLTFLoader();
    
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
