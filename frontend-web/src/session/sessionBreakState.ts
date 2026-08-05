import {
  SESSION_BREAK_SECS,
  SESSION_LIMIT_SECS,
  SESSION_WARNING_SECS,
} from '../config';
import { matchPath } from 'react-router-dom';

export const SESSION_STATE_STORAGE_KEY = 'edu_session_state_v1';
export const LEGACY_SESSION_KEYS = [
  'edu_session_started_at',
  'edu_session_paused_seconds',
] as const;

export type SessionState =
  | { version: 1; phase: 'active'; elapsedSeconds: number; runningSince: number | null }
  | { version: 1; phase: 'limit_reached' }
  | { version: 1; phase: 'on_break'; breakUntil: number };

export interface SessionSnapshot {
  phase: SessionState['phase'] | null;
  elapsedSeconds: number;
  remainingSeconds: number;
  breakRemainingSeconds: number;
  isWarning: boolean;
  isLimitReached: boolean;
  isOnBreak: boolean;
  isPaused: boolean;
}

const elapsedAt = (state: Extract<SessionState, { phase: 'active' }>, now: number) =>
  state.elapsedSeconds +
  (state.runningSince === null ? 0 : Math.max(0, (now - state.runningSince) / 1000));

const emptySnapshot = (): SessionSnapshot => ({
  phase: null,
  elapsedSeconds: 0,
  remainingSeconds: 0,
  breakRemainingSeconds: 0,
  isWarning: false,
  isLimitReached: false,
  isOnBreak: false,
  isPaused: false,
});

export function settleSessionState(state: SessionState | null, now: number): SessionState | null {
  if (state === null) {
    return null;
  }

  if (state.phase === 'active' && elapsedAt(state, now) >= SESSION_LIMIT_SECS) {
    return { version: 1, phase: 'limit_reached' };
  }

  if (state.phase === 'on_break' && now >= state.breakUntil) {
    return null;
  }

  return state;
}

export function beginLearningSession(state: SessionState | null, now: number): SessionState {
  const settled = settleSessionState(state, now);
  if (settled === null) {
    return { version: 1, phase: 'active', elapsedSeconds: 0, runningSince: now };
  }
  if (settled.phase === 'active' && settled.runningSince === null) {
    return { ...settled, runningSince: now };
  }
  return settled;
}

export function setSessionRunning(
  state: SessionState | null,
  now: number,
  shouldRun: boolean,
): SessionState | null {
  const settled = settleSessionState(state, now);
  if (settled === null || settled.phase !== 'active') {
    return settled;
  }

  if (shouldRun) {
    return settled.runningSince === null ? { ...settled, runningSince: now } : settled;
  }

  return settled.runningSince === null
    ? settled
    : { ...settled, elapsedSeconds: elapsedAt(settled, now), runningSince: null };
}

export function takeSessionBreak(now: number): SessionState {
  return { version: 1, phase: 'on_break', breakUntil: now + SESSION_BREAK_SECS * 1000 };
}

export function getSessionSnapshot(state: SessionState | null, now: number): SessionSnapshot {
  if (state === null) {
    return emptySnapshot();
  }

  if (state.phase === 'active') {
    const elapsedSeconds = Math.min(SESSION_LIMIT_SECS, elapsedAt(state, now));
    const isLimitReached = elapsedSeconds >= SESSION_LIMIT_SECS;

    return {
      phase: isLimitReached ? 'limit_reached' : 'active',
      elapsedSeconds: Math.floor(elapsedSeconds),
      remainingSeconds: Math.max(0, Math.ceil(SESSION_LIMIT_SECS - elapsedSeconds)),
      breakRemainingSeconds: 0,
      isWarning: elapsedSeconds >= SESSION_WARNING_SECS && !isLimitReached,
      isLimitReached,
      isOnBreak: false,
      isPaused: !isLimitReached && state.runningSince === null,
    };
  }

  if (state.phase === 'limit_reached') {
    return {
      phase: 'limit_reached',
      elapsedSeconds: SESSION_LIMIT_SECS,
      remainingSeconds: 0,
      breakRemainingSeconds: 0,
      isWarning: false,
      isLimitReached: true,
      isOnBreak: false,
      isPaused: false,
    };
  }

  const breakRemainingSeconds = Math.max(0, Math.ceil((state.breakUntil - now) / 1000));
  if (breakRemainingSeconds === 0) {
    return emptySnapshot();
  }

  return {
    phase: 'on_break',
    elapsedSeconds: 0,
    remainingSeconds: 0,
    breakRemainingSeconds,
    isWarning: false,
    isLimitReached: false,
    isOnBreak: true,
    isPaused: false,
  };
}

export function readSessionState(storage: Storage, now: number): SessionState | null {
  const remove = (key: string) => {
    try {
      storage.removeItem(key);
    } catch {
      // Browser storage can be unavailable in privacy-restricted contexts.
    }
  };

  LEGACY_SESSION_KEYS.forEach(remove);

  let raw: string | null;
  try {
    raw = storage.getItem(SESSION_STATE_STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    remove(SESSION_STATE_STORAGE_KEY);
    return null;
  }

  const invalid = () => {
    remove(SESSION_STATE_STORAGE_KEY);
    return null;
  };

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return invalid();
  }

  const value = parsed as Record<string, unknown>;
  if (value.version !== 1 || typeof value.phase !== 'string') {
    return invalid();
  }

  if (value.phase === 'active') {
    const { elapsedSeconds, runningSince } = value;
    if (
      typeof elapsedSeconds !== 'number' ||
      !Number.isFinite(elapsedSeconds) ||
      elapsedSeconds < 0 ||
      (runningSince !== null &&
        (typeof runningSince !== 'number' ||
          !Number.isFinite(runningSince) ||
          runningSince > now + 60_000))
    ) {
      return invalid();
    }

    return settleSessionState({ version: 1, phase: 'active', elapsedSeconds, runningSince }, now);
  }

  if (value.phase === 'limit_reached') {
    return { version: 1, phase: 'limit_reached' };
  }

  if (value.phase === 'on_break') {
    const { breakUntil } = value;
    if (
      typeof breakUntil !== 'number' ||
      !Number.isFinite(breakUntil) ||
      breakUntil > now + (SESSION_BREAK_SECS + 60) * 1000
    ) {
      return invalid();
    }

    return settleSessionState({ version: 1, phase: 'on_break', breakUntil }, now);
  }

  return invalid();
}

export function writeSessionState(storage: Storage, state: SessionState | null): void {
  try {
    if (state === null) {
      storage.removeItem(SESSION_STATE_STORAGE_KEY);
      return;
    }

    storage.setItem(SESSION_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep the in-memory state authoritative when browser storage is blocked.
  }
}

export function isLearningPath(pathname: string): boolean {
  const matches = (path: string) =>
    matchPath({ path, end: true, caseSensitive: false }, pathname) !== null;

  return (
    matches('/learn-ar') ||
    matches('/flashcards') ||
    matches('/flashcards/*') ||
    matches('/courses') ||
    matches('/courses/*') ||
    matches('/f/:id')
  );
}
