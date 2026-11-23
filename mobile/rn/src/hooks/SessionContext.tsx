/**
 * Learning Session Context — presentation-layer state management.
 *
 * Provides a React context + provider for the session shell state.
 *
 * This is DECOUPLED from:
 *   - Unity/AR lifecycle (AR navigation does NOT reset session state)
 *   - Backend session API (persistence contract is a separate phase)
 *   - DQ-10 policy constants (those are injected via config prop)
 *
 * The context exposes:
 *   - sessionState: the current SessionShellState
 *   - sessionConfig: the DQ-10 policy config (optional, defaults to zeros)
 *   - actions: dispatch functions for session shell actions
 *   - computedStatus: status computed from elapsedSeconds vs config
 *
 * Usage:
 * ```tsx
 * // Parent wraps with config (after DQ-10 resolves):
 * <SessionProvider config={{ limitSeconds: 1800, warningSeconds: 1500, breakSeconds: 300 }}>
 *   <LearningSessionScreen ... />
 * </SessionProvider>
 *
 * // Or without config (shell works, but no auto-status transitions):
 * <SessionProvider>
 *   <LearningSessionScreen ... />
 * </SessionProvider>
 * ```
 *
 * AR navigation: LearningSessionScreen → navigate('AR', ...) → back
 * The context value persists across navigation because the provider
 * lives above the navigation stack.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  SessionShellState,
  SessionShellAction,
  SessionConfig,
  SessionStatus,
  INITIAL_SESSION_SHELL_STATE,
  sessionShellReducer,
  computeProgressRatio,
} from '../types/session-state';
import type { LessonSessionStepState } from '../types/session';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface SessionContextValue {
  /** Current session shell state. */
  sessionState: SessionShellState;

  /** Policy configuration (DQ-10 injection point). Defaults to zeros. */
  sessionConfig: SessionConfig;

  /** Dispatch an action to the session reducer. */
  dispatch: React.Dispatch<SessionShellAction>;

  /**
   * Start the session with total step count.
   * Must be called before TICK/ADVANCE_STEP.
   */
  startSession: (totalSteps: number) => void;

  /**
   * Advance to the next step. Increments completedCount and currentStepIndex.
   */
  advanceStep: () => void;

  /**
   * Pause the session timer (e.g., app backgrounded).
   */
  pauseSession: () => void;

  /**
   * Resume the session timer.
   */
  resumeSession: () => void;

  /**
   * End the session (marks as COMPLETED).
   */
  endSession: () => void;

  /**
   * Reset the session to initial state.
   */
  resetSession: () => void;

  /**
   * Manually set the session status (for parent to override computed status).
   */
  setStatus: (status: SessionStatus) => void;

  /**
   * Enter break mode with the configured break duration.
   */
  startBreak: (breakSeconds: number) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const SessionContext = createContext<SessionContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface SessionProviderProps {
  children: React.ReactNode;

  /**
   * DQ-10 policy configuration.
   *
   * Until DQ-10 is resolved, pass zeros or omit:
   *   { limitSeconds: 0, warningSeconds: 0, breakSeconds: 0 }
   *
   * When DQ-10 resolves, pass the actual values.
   * Example (30/25/5):
   *   { limitSeconds: 1800, warningSeconds: 1500, breakSeconds: 300 }
   */
  config?: Partial<SessionConfig>;

  /**
   * Initial steps (optional). Call startSession() with this after mount.
   */
  initialSteps?: number;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
  config = {},
  initialSteps,
}) => {
  const mergedConfig = useMemo<SessionConfig>(
    () => ({
      limitSeconds: config.limitSeconds ?? 0,
      warningSeconds: config.warningSeconds ?? 0,
      breakSeconds: config.breakSeconds ?? 0,
    }),
    [config],
  );

  const [sessionState, dispatch] = useReducer(
    sessionShellReducer,
    INITIAL_SESSION_SHELL_STATE,
  );

  // ---- Timer tick -------------------------------------------------------
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionState.isActive && !sessionState.isPaused) {
      timerRef.current = setInterval(() => {
        dispatch({ type: 'TICK', delta: 1 });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [sessionState.isActive, sessionState.isPaused]);

  // ---- Break countdown ----------------------------------------------------
  const breakRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (sessionState.status === 'BREAK' && sessionState.breakRemainingSeconds > 0) {
      breakRef.current = setInterval(() => {
        dispatch({ type: 'TICK_BREAK' });
      }, 1000);
    } else {
      if (breakRef.current) {
        clearInterval(breakRef.current);
        breakRef.current = null;
      }
    }
    return () => {
      if (breakRef.current) {
        clearInterval(breakRef.current);
        breakRef.current = null;
      }
    };
  }, [sessionState.status, sessionState.breakRemainingSeconds]);

  // ---- App State (pause when backgrounded) -------------------------------
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (sessionState.isActive && !sessionState.isPaused) {
          dispatch({ type: 'PAUSE' });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [sessionState.isActive, sessionState.isPaused]);

  // ---- Actions ---------------------------------------------------------
  const startSession = useCallback((totalSteps: number) => {
    dispatch({ type: 'START' });
    // Set totalCount separately (not in reducer for simplicity)
    dispatch({ type: 'SET_STATUS', status: 'NORMAL' });
  }, []);

  const advanceStep = useCallback(() => {
    dispatch({ type: 'ADVANCE_STEP' });
  }, []);

  const pauseSession = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resumeSession = useCallback(() => {
    dispatch({ type: 'RESUME' });
  }, []);

  const endSession = useCallback(() => {
    dispatch({ type: 'END' });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setStatus = useCallback((status: SessionStatus) => {
    dispatch({ type: 'SET_STATUS', status });
  }, []);

  const startBreak = useCallback((breakSeconds: number) => {
    dispatch({ type: 'SET_BREAK', remainingSeconds: breakSeconds });
  }, []);

  // ---- Context value --------------------------------------------------
  const value = useMemo<SessionContextValue>(
    () => ({
      sessionState,
      sessionConfig: mergedConfig,
      dispatch,
      startSession,
      advanceStep,
      pauseSession,
      resumeSession,
      endSession,
      resetSession,
      setStatus,
      startBreak,
    }),
    [
      sessionState,
      mergedConfig,
      startSession,
      advanceStep,
      pauseSession,
      resumeSession,
      endSession,
      resetSession,
      setStatus,
      startBreak,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the session context.
 *
 * Must be called inside <SessionProvider>.
 */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error(
      'useSession must be used within a <SessionProvider>. ' +
        'Wrap your app or screen with <SessionProvider> first.',
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Computed selectors (policy-neutral helpers)
// ---------------------------------------------------------------------------

/**
 * Get the current step progress label (e.g., "3 / 10").
 */
export function useStepLabel(): string {
  const { sessionState } = useSession();
  return `${sessionState.completedCount} / ${sessionState.totalCount}`;
}

/**
 * Get whether the session is currently active and not paused.
 */
export function useIsSessionRunning(): boolean {
  const { sessionState } = useSession();
  return sessionState.isActive && !sessionState.isPaused;
}

/**
 * Get whether we are in break mode.
 */
export function useIsInBreak(): boolean {
  const { sessionState } = useSession();
  return sessionState.status === 'BREAK';
}

/**
 * Get whether the session has ended/completed.
 */
export function useIsSessionCompleted(): boolean {
  const { sessionState } = useSession();
  return sessionState.status === 'COMPLETED';
}
