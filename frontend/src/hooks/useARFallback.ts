/**
 * useARFallback.ts
 *
 * Automatic fallback from MindAR to 8th Wall (Self-hosted binary).
 *
 * Fallback triggers:
 * 1. Timeout: MindAR doesn't emit AR_READY within AR_READY_TIMEOUT_MS
 * 2. Performance: FPS drops below MIN_PERFORMANCE_FPS for sustained period
 * 3. System error: ARContainerV2 reports unrecoverable error
 * 4. URL param: ?force-fallback=xr (for testing)
 *
 * Emits AR_FALLBACK_TRIGGERED CustomEvent for A/B analysis.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AR_READY_TIMEOUT_MS, MIN_PERFORMANCE_FPS } from '@/config';

export type AREngine = 'mindar' | 'xr';

export interface ARFallbackMetrics {
  reason: FallbackReason;
  timestamp: number;
  fpsSamples: number[];
  timeToReadyMs: number | null;
}

export type FallbackReason =
  | 'TIMEOUT_NO_READY'
  | 'LOW_PERFORMANCE'
  | 'SYSTEM_ERROR'
  | 'URL_PARAM_FORCED';

interface UseARFallbackOptions {
  /** Initial engine (default: 'mindar') */
  initialEngine?: AREngine;
  /** Custom timeout in ms (default: AR_READY_TIMEOUT_MS from config) */
  timeoutMs?: number;
  /** Minimum FPS before triggering fallback (default: MIN_PERFORMANCE_FPS from config) */
  minFps?: number;
  /** Low FPS sustained duration in ms before fallback (default: 5000ms) */
  lowFpsGracePeriodMs?: number;
  /** Called when fallback is triggered */
  onFallbackTriggered?: (reason: FallbackReason) => void;
  /** Allow timeout/performance/system-error fallback (default: true). */
  automaticFallbackEnabled?: boolean;
}

export function useARFallback(options: UseARFallbackOptions = {}) {
  const {
    initialEngine = 'mindar',
    timeoutMs = AR_READY_TIMEOUT_MS,
    minFps = MIN_PERFORMANCE_FPS,
    lowFpsGracePeriodMs = 5000,
    onFallbackTriggered,
    automaticFallbackEnabled = true,
  } = options;

  const [engine, setEngine] = useState<AREngine>(() => {
    // Check URL param first
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      // ?engine=xr forces XR engine from start (for standalone testing)
      if (params.get('engine') === 'xr') return 'xr';
      if (params.get('force-fallback') === 'xr') return 'xr';
    }
    return initialEngine;
  });

  const [fallbackTriggered, setFallbackTriggered] = useState(() => {
    // When ?force-fallback=xr is set, treat as already-fallbacked so LearnARV2 navigates immediately
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('force-fallback') === 'xr') return true;
    }
    return false;
  });
  const [metrics, setMetrics] = useState<ARFallbackMetrics | null>(null);
  const [timeToReady, setTimeToReady] = useState<number | null>(null);

  // Track when MindAR started initializing
  const mindarStartTimeRef = useRef<number | null>(null);
  // Readiness and timeout are refs so a stale timeout callback cannot switch
  // engines after the iframe has already reported AR_READY.
  const mindarReadyRef = useRef(false);
  const readyTimeoutRef = useRef<number | null>(null);
  // Track FPS samples for performance analysis
  const fpsSamplesRef = useRef<number[]>([]);
  // Low FPS duration tracker
  const lowFpsStartRef = useRef<number | null>(null);

  const clearReadyTimeout = useCallback(() => {
    if (readyTimeoutRef.current !== null) {
      window.clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
  }, []);

  // Core trigger function
  const triggerFallback = useCallback((reason: FallbackReason) => {
    if (!automaticFallbackEnabled) {
      console.warn(`[AR-Fallback] Automatic XR fallback disabled. Keeping MindAR active. Reason: ${reason}`);
      return;
    }
    if (engine !== 'mindar' || fallbackTriggered) return;
    if (reason === 'TIMEOUT_NO_READY' && mindarReadyRef.current) return;

    clearReadyTimeout();

    console.warn(`[AR-Fallback] Switching to XR engine. Reason: ${reason}`);
    setEngine('xr');
    setFallbackTriggered(true);

    const finalMetrics: ARFallbackMetrics = {
      reason,
      timestamp: Date.now(),
      fpsSamples: fpsSamplesRef.current,
      timeToReadyMs: timeToReady,
    };
    setMetrics(finalMetrics);

    // Emit for A/B analysis
    window.dispatchEvent(new CustomEvent('AR_FALLBACK_TRIGGERED', {
      detail: finalMetrics,
    }));

    onFallbackTriggered?.(reason);
  }, [automaticFallbackEnabled, clearReadyTimeout, engine, fallbackTriggered, onFallbackTriggered, timeToReady]);

  // ── Logic 1: Timeout fallback ──────────────────────────────────────────────────
  useEffect(() => {
    if (!automaticFallbackEnabled || engine !== 'mindar' || fallbackTriggered || mindarReadyRef.current) return;

    // Record start time on first effect run
    if (mindarStartTimeRef.current === null) {
      mindarStartTimeRef.current = performance.now();
    }

    clearReadyTimeout();
    readyTimeoutRef.current = window.setTimeout(() => {
      readyTimeoutRef.current = null;
      triggerFallback('TIMEOUT_NO_READY');
    }, timeoutMs);

    return clearReadyTimeout;
  }, [automaticFallbackEnabled, clearReadyTimeout, engine, fallbackTriggered, triggerFallback, timeoutMs]);

  // ── Logic 2: Listen for AR_READY (reset timeout) ─────────────────────────────
  // IMPORTANT: viewer fires AR_READY via postMessage, not a DOM CustomEvent.
  // Must listen on the 'message' event to catch it.
  useEffect(() => {
    if (engine !== 'mindar' || fallbackTriggered) return;

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || !msg.type || msg.type !== 'AR_READY') return;
      // `msg.origin` is the protocol's logical marker (`child`). The browser's
      // trusted MessageEvent.origin is what must be checked for same-origin.
      if (event.origin !== window.location.origin) return;
      if (mindarReadyRef.current) return;

      mindarReadyRef.current = true;
      clearReadyTimeout();

      const elapsed = mindarStartTimeRef.current !== null
        ? performance.now() - mindarStartTimeRef.current
        : null;
      if (elapsed !== null) {
        setTimeToReady(elapsed);
        console.log(`[AR-Fallback] MindAR ready in ${elapsed.toFixed(0)}ms`);
      }
      mindarStartTimeRef.current = null;
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [clearReadyTimeout, engine, fallbackTriggered]);

  // ── Logic 3: Performance fallback ─────────────────────────────────────────────
  const handlePerformanceMetrics = useCallback((fps: number) => {
    if (!automaticFallbackEnabled || engine !== 'mindar' || fallbackTriggered) return;

    fpsSamplesRef.current.push(fps);
    // Keep only last 60 samples (30 seconds at 2Hz)
    if (fpsSamplesRef.current.length > 60) {
      fpsSamplesRef.current.shift();
    }

    if (fps < minFps) {
      if (lowFpsStartRef.current === null) {
        lowFpsStartRef.current = performance.now();
      } else if (performance.now() - lowFpsStartRef.current > lowFpsGracePeriodMs) {
        triggerFallback('LOW_PERFORMANCE');
      }
    } else {
      // Reset if FPS recovers
      lowFpsStartRef.current = null;
    }
  }, [automaticFallbackEnabled, engine, fallbackTriggered, triggerFallback, minFps, lowFpsGracePeriodMs]);

  // ── Logic 4: System error handler (to be called from ARContainerV2) ───────────
  const handleSystemError = useCallback((errorCode: string) => {
    console.warn(`[AR-Fallback] System error received: ${errorCode}`);
    triggerFallback('SYSTEM_ERROR');
  }, [triggerFallback]);

  // ── Reset on engine change ─────────────────────────────────────────────────────
  const reset = useCallback(() => {
    clearReadyTimeout();
    setEngine(initialEngine);
    setFallbackTriggered(false);
    setMetrics(null);
    setTimeToReady(null);
    mindarStartTimeRef.current = null;
    mindarReadyRef.current = false;
    fpsSamplesRef.current = [];
    lowFpsStartRef.current = null;
  }, [clearReadyTimeout, initialEngine]);

  return {
    /** Current AR engine */
    engine,
    /** Whether fallback has been triggered */
    fallbackTriggered,
    /** Metrics collected at fallback time */
    metrics,
    /** Time from MindAR start to AR_READY event */
    timeToReady,
    /** Call with FPS from PerformanceMonitor to trigger performance-based fallback */
    handlePerformanceMetrics,
    /** Call from ARContainerV2 on unrecoverable error */
    handleSystemError,
    /** Manually trigger fallback */
    triggerFallback,
    /** Reset to initial state */
    reset,
  };
}
