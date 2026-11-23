// frontend-web/src/hooks/useIdleDetector.ts
import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseIdleDetectorReturn {
  isIdle: boolean;
  lastActivityAt: number;
  reset: () => void;
}

const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function useIdleDetector(
  timeoutMs: number = DEFAULT_IDLE_TIMEOUT_MS
): UseIdleDetectorReturn {
  const [isIdle, setIsIdle] = useState(false);
  const lastActivityAtRef = useRef(Date.now());
  const timeoutMsRef = useRef(timeoutMs);
  const timerRef = useRef<number | null>(null);

  // Keep the ref in sync
  timeoutMsRef.current = timeoutMs;

  const reset = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    setIsIdle(false);
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setIsIdle(true);
    }, timeoutMsRef.current);
  }, []);

  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = [
      'mousemove',
      'keydown',
      'touchstart',
      'pointerdown',
      'scroll',
    ];

    const handleActivity = () => {
      // Always reset the timer on activity
      lastActivityAtRef.current = Date.now();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      setIsIdle(false);
      timerRef.current = window.setTimeout(() => {
        setIsIdle(true);
      }, timeoutMsRef.current);
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    timerRef.current = window.setTimeout(() => {
      setIsIdle(true);
    }, timeoutMsRef.current);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    isIdle,
    lastActivityAt: lastActivityAtRef.current,
    reset,
  };
}

export default useIdleDetector;
