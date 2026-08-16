/**
 * Learning Session state types — policy-neutral presentation layer.
 *
 * These types define the frontend session shell state. They are PRESENTATION-ORIENTED
 * and intentionally do NOT include:
 *   - Backend session IDs or persistence contracts
 *   - Server-side pause/resume API
 *   - Hardcoded session duration thresholds (DQ-10)
 *
 * DQ-10 will supply the actual policy configuration (limitSeconds, warningSeconds, breakSeconds).
 * This layer receives pre-computed policy state from the parent hook, not raw seconds.
 *
 * The session shell is decoupled from:
 *   - Unity/AR lifecycle (AR navigation does NOT reset session state)
 *   - Backend session API (which is a separate phase/contract)
 *   - DQ-10 policy constants (those are injected via props/config)
 */

import type { LessonSessionStepState } from './session';

// ---------------------------------------------------------------------------
// Session presentation status
// ---------------------------------------------------------------------------

/**
 * The visual/modal status of the session.
 *
 * These are UI concepts only — the parent hook computes these from policy config.
 * - NORMAL: session active, no alerts
 * - WARNING: policy-defined warning threshold reached (e.g., 5 min left)
 * - LIMIT_REACHED: policy-defined limit threshold reached (e.g., time's up)
 * - BREAK: break/cooldown phase active (learning routes blocked)
 * - COMPLETED: lesson/session finished
 */
export type SessionStatus =
  | 'NORMAL'
  | 'WARNING'
  | 'LIMIT_REACHED'
  | 'BREAK'
  | 'COMPLETED';

// ---------------------------------------------------------------------------
// Session shell state
// ---------------------------------------------------------------------------

/**
 * The complete session shell state used by LearningSessionScreen and its children.
 *
 * This state is MINIMAL and PRESENTATION-ORIENTED:
 *   - elapsedSeconds: seconds elapsed since session start (for display)
 *   - status: computed UI status (NORMAL/WARNING/etc.)
 *   - progress: step progress within the lesson
 *   - completedCount: number of completed steps
 *   - totalCount: total steps in lesson
 *   - breakRemainingSeconds: seconds remaining in break cooldown (0 when not in break)
 *   - isPaused: whether session timer is paused (e.g., app backgrounded)
 *
 * NOT included (out of scope for shell foundation):
 *   - sessionId (backend concern)
 *   - server pause/resume API
 *   - lesson content/vocabulary (passed separately to content slot)
 */
export interface SessionShellState {
  /** Seconds elapsed since session start. 0 if not started. */
  elapsedSeconds: number;

  /** Current computed UI status. Parent hook derives this from policy config. */
  status: SessionStatus;

  /** Current step index (0-based). */
  currentStepIndex: number;

  /** Number of completed steps. */
  completedCount: number;

  /** Total steps in this lesson/session. */
  totalCount: number;

  /** Progress as 0..1 ratio (safe for divide-by-zero). */
  progressRatio: number;

  /** Break cooldown remaining seconds. 0 when not in break. */
  breakRemainingSeconds: number;

  /** Whether the session timer is paused (e.g., app backgrounded). */
  isPaused: boolean;

  /** Whether the session has been started. */
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Session shell actions
// ---------------------------------------------------------------------------

/**
 * Actions that can be dispatched to the session shell reducer.
 */
export type SessionShellAction =
  | { type: 'START' }
  | { type: 'TICK'; delta: number }
  | { type: 'ADVANCE_STEP' }
  | { type: 'SET_STATUS'; status: SessionStatus }
  | { type: 'SET_BREAK'; remainingSeconds: number }
  | { type: 'TICK_BREAK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'END' }
  | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Session shell config (DQ-10 injection point)
// ---------------------------------------------------------------------------

/**
 * Policy configuration for session behavior.
 *
 * DQ-10 will supply these values. Until then, this interface documents
 * where the policy constants will connect.
 *
 * Example (after DQ-10 resolves):
 *   const SESSION_CONFIG: SessionConfig = {
 *     limitSeconds: 30 * 60,    // 30 minutes
 *     warningSeconds: 25 * 60,   // 5 min warning
 *     breakSeconds: 5 * 60,      // 5 min break
 *   };
 */
export interface SessionConfig {
  /** Hard limit in seconds (e.g., 1800 for 30 min). DQ-10 decision required. */
  limitSeconds: number;

  /** Warning threshold in seconds (e.g., 1500 for 25 min). DQ-10 decision required. */
  warningSeconds: number;

  /** Break/cooldown duration in seconds (e.g., 300 for 5 min). DQ-10 decision required. */
  breakSeconds: number;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/** Default initial state for session shell. */
export const INITIAL_SESSION_SHELL_STATE: SessionShellState = {
  elapsedSeconds: 0,
  status: 'NORMAL',
  currentStepIndex: 0,
  completedCount: 0,
  totalCount: 0,
  progressRatio: 0,
  breakRemainingSeconds: 0,
  isPaused: false,
  isActive: false,
};

// ---------------------------------------------------------------------------
// Pure reducer
// ---------------------------------------------------------------------------

/**
 * Pure reducer for session shell state.
 *
 * Computes status transitions based on elapsed time vs config.
 * This reducer does NOT make policy decisions — it applies the
 * computed status that the parent hook derives from config.
 *
 * Policy decisions (when to show WARNING/LIMIT_REACHED) live ABOVE this reducer.
 * The reducer receives pre-computed status from the parent.
 */
export function sessionShellReducer(
  state: SessionShellState,
  action: SessionShellAction,
): SessionShellState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        isActive: true,
        isPaused: false,
        elapsedSeconds: 0,
        status: 'NORMAL',
      };

    case 'TICK':
      return {
        ...state,
        elapsedSeconds: Math.max(0, state.elapsedSeconds + action.delta),
      };

    case 'ADVANCE_STEP':
      return {
        ...state,
        currentStepIndex: state.currentStepIndex + 1,
        completedCount: state.completedCount + 1,
        progressRatio:
          state.totalCount > 0
            ? (state.completedCount + 1) / state.totalCount
            : 0,
      };

    case 'SET_STATUS':
      return {
        ...state,
        status: action.status,
      };

    case 'SET_BREAK':
      return {
        ...state,
        status: 'BREAK',
        breakRemainingSeconds: action.remainingSeconds,
        isPaused: true,
      };

    case 'TICK_BREAK':
      if (state.status !== 'BREAK') return state;
      const newBreakRemaining = Math.max(0, state.breakRemainingSeconds - 1);
      if (newBreakRemaining === 0) {
        return {
          ...state,
          status: 'NORMAL',
          breakRemainingSeconds: 0,
          isPaused: false,
        };
      }
      return {
        ...state,
        breakRemainingSeconds: newBreakRemaining,
      };

    case 'PAUSE':
      return {
        ...state,
        isPaused: true,
      };

    case 'RESUME':
      return {
        ...state,
        isPaused: false,
      };

    case 'END':
      return {
        ...state,
        status: 'COMPLETED',
        isActive: false,
        isPaused: true,
      };

    case 'RESET':
      return INITIAL_SESSION_SHELL_STATE;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Step progress helpers (used by SessionProgress component)
// ---------------------------------------------------------------------------

/**
 * Safe progress ratio calculation (avoids divide-by-zero).
 */
export function computeProgressRatio(
  completed: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, completed / total));
}

/**
 * Format seconds as MM:SS string.
 */
export function formatSessionTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format seconds as human-readable string (e.g., "5 min", "1 giờ 30 phút").
 */
export function formatSessionTimeHuman(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} giây`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} phút`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${remainingMinutes} phút`;
}
