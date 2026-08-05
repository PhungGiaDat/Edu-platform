// frontend-web/src/context/SessionContext.tsx
/**
 * Global session context for the child-safe learning window and break cooldown.
 * Browser state is the UX source of truth; backend cleanup remains best-effort.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIdleDetector } from '../hooks/useIdleDetector';
import {
  beginLearningSession,
  getSessionSnapshot,
  isLearningPath,
  readSessionState,
  setSessionRunning,
  settleSessionState,
  takeSessionBreak,
  writeSessionState,
} from '../session/sessionBreakState';
import sessionApi from '../services/sessionApi';

interface SessionContextValue {
  phase: 'active' | 'limit_reached' | 'on_break' | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  breakRemainingSeconds: number;
  isWarning: boolean;
  isLimitReached: boolean;
  isOnBreak: boolean;
  isPaused: boolean;
  takeBreak: () => void;
  isInitialized: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const location = useLocation();
  const learningPath = isLearningPath(location.pathname);
  const { isAuthenticated, isGuest } = useAuth();
  const isAuthed = isAuthenticated && !isGuest;
  const { isIdle } = useIdleDetector(5 * 60 * 1000);
  const [isTabHidden, setIsTabHidden] = useState(() => document.hidden);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [sessionState, setSessionState] = useState(() => readSessionState(localStorage, Date.now()));

  const shouldRun = learningPath && !isTabHidden && !isIdle;
  const shouldTick =
    (learningPath && shouldRun && sessionState?.phase === 'active') ||
    sessionState?.phase === 'on_break';

  useEffect(() => {
    const handleVisibilityChange = () => setIsTabHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!learningPath) {
      return;
    }

    const now = Date.now();
    setClockNow(now);
    setSessionState(previous => beginLearningSession(previous, now));
  }, [learningPath]);

  useEffect(() => {
    const now = Date.now();
    setClockNow(now);
    setSessionState(previous => setSessionRunning(previous, now, shouldRun));
  }, [shouldRun]);

  useEffect(() => {
    writeSessionState(localStorage, sessionState);
  }, [sessionState]);

  useEffect(() => {
    if (!shouldTick) {
      return;
    }

    const tick = () => {
      const now = Date.now();
      setClockNow(now);
      setSessionState(previous => settleSessionState(previous, now));
    };

    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [shouldTick]);

  const takeBreak = useCallback(() => {
    const now = Date.now();
    const next = takeSessionBreak(now);
    setClockNow(now);
    setSessionState(next);
    writeSessionState(localStorage, next);
    if (isAuthed) {
      void sessionApi.endSession().then(success => {
        if (!success) console.warn('[SessionContext] backend cleanup failed');
      });
    }
  }, [isAuthed]);

  const snapshot = getSessionSnapshot(sessionState, clockNow);
  const value: SessionContextValue = {
    ...snapshot,
    takeBreak,
    isInitialized: true,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export default SessionContext;
