// frontend-web/src/context/SessionContext.tsx
/**
 * Global session context — provides app-wide session time tracking.
 * Manages the local clock (source of truth for UX) and optionally
 * syncs with the backend via heartbeat every 60s.
 *
 * Timer pauses when:
 * - Tab is hidden (document.visibilitychange)
 * - User is idle for 5+ minutes (useIdleDetector)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import sessionApi from '../services/sessionApi';
import { useIdleDetector } from '../hooks/useIdleDetector';
import { useAuth } from '../contexts/AuthContext';
import { SESSION_LIMIT_SECS, SESSION_WARNING_SECS } from '../config';

interface SessionContextValue {
  elapsedSeconds: number;
  warningThresholdSeconds: number;
  limitSeconds: number;
  isWarning: boolean;
  isLimitReached: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  pause: () => void;
  resume: () => void;
  extendLock: (extraMinutes: number) => Promise<void>;
  reset: () => void;
  isInitialized: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const STORAGE_START_KEY = 'edu_session_started_at';
const STORAGE_PAUSED_KEY = 'edu_session_paused_seconds';

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { isAuthenticated, isGuest } = useAuth();
  const isAuthed = isAuthenticated && !isGuest;

  // Idle detection — pause if no interaction for 5 min
  const { isIdle, reset: resetIdle } = useIdleDetector(5 * 60 * 1000);

  // Tab visibility
  const [isTabHidden, setIsTabHidden] = useState(false);

  // Persisted state from localStorage
  const [startTime, setStartTime] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_START_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  });
  const [pausedSeconds, setPausedSeconds] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_PAUSED_KEY);
    return stored ? parseInt(stored, 10) : 0;
  });

  // Manual pause (e.g. "Take a Break Early")
  const [isManualPaused, setIsManualPaused] = useState(false);

  const isPaused = isTabHidden || isIdle || isManualPaused;
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000) - pausedSeconds);
  const remainingSeconds = Math.max(0, SESSION_LIMIT_SECS - elapsedSeconds);
  const isWarning = elapsedSeconds >= SESSION_WARNING_SECS && elapsedSeconds < SESSION_LIMIT_SECS;
  const isLimitReached = elapsedSeconds >= SESSION_LIMIT_SECS;

  const lastHeartbeatRef = useRef<number>(0);

  // Persist to localStorage whenever start/paused state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_START_KEY, String(startTime));
  }, [startTime]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PAUSED_KEY, String(pausedSeconds));
  }, [pausedSeconds]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Backend heartbeat every 60 seconds (authenticated users only)
  useEffect(() => {
    if (!isAuthed) return;

    const sendHeartbeat = async () => {
      try {
        await sessionApi.heartbeat();
        lastHeartbeatRef.current = Date.now();
      } catch (err) {
        console.warn('[SessionContext] heartbeat failed:', err);
      }
    };

    // Send initial heartbeat on mount
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, [isAuthed]);

  // When manual pause flips off, accumulate the pause duration
  const prevManualPausedRef = useRef(isManualPaused);
  useEffect(() => {
    if (prevManualPausedRef.current && !isManualPaused) {
      // Just resumed — accumulate the pause into pausedSeconds
      const now = Date.now();
      const rawElapsed = Math.floor((now - startTime) / 1000);
      const accumulatedPause = Math.max(0, rawElapsed - elapsedSeconds);
      if (accumulatedPause > 0) {
        setPausedSeconds(p => p + accumulatedPause);
      }
    }
    prevManualPausedRef.current = isManualPaused;
  }, [isManualPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    setIsManualPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsManualPaused(false);
    resetIdle();
    if (isAuthed) {
      sessionApi.resumeLock().catch(console.warn);
    }
  }, [resetIdle, isAuthed]);

  const extendLock = useCallback(async (extraMinutes: number) => {
    if (isAuthed) {
      const result = await sessionApi.extendLock(extraMinutes, 'parent');
      if (result) {
        // Extend the local start time to effectively give them more time
        const extraMs = extraMinutes * 60 * 1000;
        setStartTime(prev => prev - elapsedSeconds * 1000 + (elapsedSeconds + extraMinutes * 60) * 1000);
        setPausedSeconds(0);
        setIsManualPaused(false);
        return;
      }
    }
    // Local-only fallback (guests)
    const extraMs = extraMinutes * 60 * 1000;
    setStartTime(prev => prev - elapsedSeconds * 1000 + (elapsedSeconds + extraMinutes * 60) * 1000);
    setPausedSeconds(0);
    setIsManualPaused(false);
  }, [isAuthed, elapsedSeconds]);

  const reset = useCallback(() => {
    setStartTime(Date.now());
    setPausedSeconds(0);
    setIsManualPaused(false);
    resetIdle();
    if (isAuthed) {
      sessionApi.startLock().catch(console.warn);
    }
  }, [resetIdle, isAuthed]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (isAuthed) {
        sessionApi.endSession().catch(console.warn);
      }
      localStorage.removeItem(STORAGE_START_KEY);
      localStorage.removeItem(STORAGE_PAUSED_KEY);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: SessionContextValue = {
    elapsedSeconds,
    warningThresholdSeconds: SESSION_WARNING_SECS,
    limitSeconds: SESSION_LIMIT_SECS,
    isWarning,
    isLimitReached,
    isPaused,
    remainingSeconds,
    pause,
    resume,
    extendLock,
    reset,
    isInitialized: true,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
