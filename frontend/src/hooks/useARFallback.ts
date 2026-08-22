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
}

export function useARFallback(options: UseARFallbackOptions = {}) {
  const {
    initialEngine = 'mindar',
    timeoutMs = AR_READY_TIMEOUT_MS,
    minFps = MIN_PERFORMANCE_FPS,
    lowFpsGracePeriodMs = 5000,
    onFallbackTriggered,
  } = options;

  const [engine, setEngine] = useState<AREngine>(() => {
    // Check URL param first
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
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
  // Track FPS samples for performance analysis
  const fpsSamplesRef = useRef<number[]>([]);
  // Low FPS duration tracker
  const lowFpsStartRef = useRef<number | null>(null);

  // Core trigger function
  const triggerFallback = useCallback((reason: FallbackReason) => {
    if (engine !== 'mindar' || fallbackTriggered) return;

    console.warn(`[AR-Fallback] Switching to XR engine. Reason: ${reason}`);
    setEngine('xr');
    setFallbackTriggered(true);

    const finalMetrics: ARFallbackMetrics = {
      reason,
      timestamp: Date.now(),
      fpsSamples: fpsSamplesRef.current,
      timeToReady: timeToReady,
    };
    setMetrics(finalMetrics);

    // Emit for A/B analysis
    window.dispatchEvent(new CustomEvent('AR_FALLBACK_TRIGGERED', {
      detail: finalMetrics,
    }));

    onFallbackTriggered?.(reason);
  }, [engine, fallbackTriggered, onFallbackTriggered, timeToReady]);

  // ── Logic 1: Timeout fallback ──────────────────────────────────────────────────
  useEffect(() => {
    if (engine !== 'mindar' || fallbackTriggered) return;

    // Record start time on first effect run
    if (mindarStartTimeRef.current === null) {
      mindarStartTimeRef.current = performance.now();
    }

    const timer = setTimeout(() => {
      triggerFallback('TIMEOUT_NO_READY');
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [engine, fallbackTriggered, triggerFallback, timeoutMs]);

  // ── Logic 2: Listen for AR_READY (reset timeout) ─────────────────────────────
  useEffect(() => {
    if (engine !== 'mindar' || fallbackTriggered) return;

    const handleReady = () => {
      if (mindarStartTimeRef.current !== null) {
        setTimeToReady(performance.now() - mindarStartTimeRef.current);
        console.log(`[AR-Fallback] MindAR ready in ${timeToReady?.toFixed(0) ?? '?'}ms`);
      }
      mindarStartTimeRef.current = null; // Cancel timeout
    };

    window.addEventListener('AR_READY', handleReady);
    return () => window.removeEventListener('AR_READY', handleReady);
  }, [engine, fallbackTriggered, timeToReady]);

  // ── Logic 3: Performance fallback ─────────────────────────────────────────────
  const handlePerformanceMetrics = useCallback((fps: number) => {
    if (engine !== 'mindar' || fallbackTriggered) return;

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
  }, [engine, fallbackTriggered, triggerFallback, minFps, lowFpsGracePeriodMs]);

  // ── Logic 4: System error handler (to be called from ARContainerV2) ───────────
  const handleSystemError = useCallback((errorCode: string) => {
    console.warn(`[AR-Fallback] System error received: ${errorCode}`);
    triggerFallback('SYSTEM_ERROR');
  }, [triggerFallback]);

  // ── Reset on engine change ─────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setEngine(initialEngine);
    setFallbackTriggered(false);
    setMetrics(null);
    setTimeToReady(null);
    mindarStartTimeRef.current = null;
    fpsSamplesRef.current = [];
    lowFpsStartRef.current = null;
  }, [initialEngine]);

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
