/**
 * useSafeGLTF.ts
 * 
 * A safe wrapper around useGLTF that prevents synchronous throws during render.
 * 
 * Problem: useGLTF from @react-three/drei throws synchronously when:
 * - The fetch fails (network error, 404, CORS)
 * - The response body is undefined
 * This causes "Cannot read properties of undefined (reading 'body')" errors
 * that crash the entire React app before error boundaries can catch them.
 * 
 * Solution: Pre-validate URLs with a HEAD request before calling useGLTF.
 * Only call useGLTF when we're confident the URL is accessible.
 */

import { useState, useEffect, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';

export type GLTFLoadingState = 'idle' | 'validating' | 'loading' | 'loaded' | 'error';

export interface SafeGLTFResult {
  /** The loaded GLTF object, or null if not yet loaded or failed */
  gltf: GLTF | null;
  /** Current loading state */
  state: GLTFLoadingState;
  /** Error message if loading failed */
  error: string | null;
  /** Whether the URL has been validated and is ready to load */
  isValidated: boolean;
  /** Retry loading the model */
  retry: () => void;
}

// Cache for URL validation results to avoid repeated HEAD requests
const urlValidationCache = new Map<string, { valid: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate a URL by making a HEAD request
 * Returns true if the URL is accessible, false otherwise
 */
async function validateUrl(url: string): Promise<boolean> {
  // Check cache first
  const cached = urlValidationCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.valid;
  }

  try {
    // Use HEAD request to minimize bandwidth
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-store',
    });

    const valid = response.ok;
    urlValidationCache.set(url, { valid, timestamp: Date.now() });
    return valid;
  } catch (error) {
    // Network error, CORS error, etc.
    console.warn('[useSafeGLTF] URL validation failed:', url, error);
    
    // For CORS errors, the resource might still be loadable via the GLTF loader
    // which has different CORS handling. Try a GET request with range header.
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Range': 'bytes=0-0', // Request minimal data
        },
      });
      
      const valid = response.ok || response.status === 206; // 206 = Partial Content
      urlValidationCache.set(url, { valid, timestamp: Date.now() });
      return valid;
    } catch (secondError) {
      console.warn('[useSafeGLTF] Fallback validation also failed:', url);
      urlValidationCache.set(url, { valid: false, timestamp: Date.now() });
      return false;
    }
  }
}

/**
 * Internal component that actually loads the GLTF
 * This is separated so we only call useGLTF after URL is validated
 */
function useGLTFLoader(url: string | null): GLTF | null {
  // useGLTF must be called unconditionally (React rules of hooks)
  // But we can pass a placeholder URL when not ready
  // The trick: pass an empty string which will fail validation before fetch
  
  // Only call useGLTF with a valid URL - otherwise return null
  // This is safe because we've already validated the URL exists
  if (!url) {
    return null;
  }
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useGLTF(url);
  } catch (error) {
    // This shouldn't happen if validation passed, but handle gracefully
    console.error('[useSafeGLTF] Unexpected error loading GLTF:', error);
    return null;
  }
}

/**
 * Safe wrapper around useGLTF that validates URLs before loading
 * 
 * @param url - The URL of the GLTF/GLB model to load
 * @returns SafeGLTFResult with loading state and GLTF object
 * 
 * @example
 * ```tsx
 * function MyModel({ url }: { url: string }) {
 *   const { gltf, state, error, retry } = useSafeGLTF(url);
 *   
 *   if (state === 'validating' || state === 'loading') {
 *     return <LoadingSpinner />;
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
  const [state, setState] = useState<GLTFLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(false);
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Validate URL before attempting to load
  useEffect(() => {
    // Reset state when URL changes
    setIsValidated(false);
    setValidatedUrl(null);
    setError(null);

    if (!url) {
      setState('error');
      setError('No model URL provided');
      return;
    }

    // Validate URL format
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setState('error');
        setError('Invalid URL protocol');
        return;
      }
    } catch {
      setState('error');
      setError('Invalid URL format');
      return;
    }

    // Start validation
    setState('validating');
    let cancelled = false;

    validateUrl(url).then((valid) => {
      if (cancelled) return;

      if (valid) {
        setIsValidated(true);
        setValidatedUrl(url);
        setState('loading');
      } else {
        setState('error');
        setError('Model URL is not accessible');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url, retryCount]);

  // Load GLTF only after validation passes
  const gltf = useGLTFLoader(validatedUrl);

  // Update state when GLTF loads
  useEffect(() => {
    if (gltf && state === 'loading') {
      setState('loaded');
    }
  }, [gltf, state]);

  // Retry function
  const retry = useCallback(() => {
    // Clear cache for this URL
    if (url) {
      urlValidationCache.delete(url);
    }
    setRetryCount((c) => c + 1);
  }, [url]);

  return {
    gltf,
    state,
    error,
    isValidated,
    retry,
  };
}

/**
 * Preload a GLTF model safely (validates URL first)
 * Use this to preload models before they're needed
 */
export async function preloadGLTFSafe(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    const isValid = await validateUrl(url);
    if (isValid) {
      useGLTF.preload(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Clear the URL validation cache
 * Useful when you know a URL should be re-validated
 */
export function clearValidationCache(url?: string): void {
  if (url) {
    urlValidationCache.delete(url);
  } else {
    urlValidationCache.clear();
  }
}

export default useSafeGLTF;
