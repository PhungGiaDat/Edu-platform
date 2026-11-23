/**
 * @file useFlashcardState — vocabulary state tracking (NEW / SEEN / PRACTICING / LEARNED).
 *
 * Implements MOB-FLASH-REQ-007 from `flashcard-expansion.md`:
 *
 *   - **NEW**: never seen; first tap (audio play) → SEEN.
 *   - **SEEN**: tapped; can transition to PRACTICING on review.
 *   - **PRACTICING**: in active review; on repeated correct answers → LEARNED.
 *   - **LEARNED**: consistently correct; terminal within a session.
 *
 * The transition logic is a **pure function** above the hook:
 *   - `transitionState(current, event)` returns the next state.
 *   - The hook stores per-vocabulary state in React state and dispatches
 *     events through that pure function.
 *
 * Boundary-first design:
 *   - NO persistence (no AsyncStorage / secure-storage / backend call).
 *     Vocabulary-progress persistence is the BACKEND team's B4 task
 *     (not yet started). Adding it here would be speculative.
 *   - NO XP / reward / analytics emission. Those are downstream
 *     concerns (C26 / C27 / etc.) and belong in their own hooks.
 *   - NO bridge to Unity. State machine is RN-only and is NOT
 *     mirrored on the Unity side.
 *   - NO C14 audio/animation coupling. The hook exposes a transition
 *     event; the C14 component (or future parent) decides WHEN to
 *     dispatch. The hook does NOT call `useFlashcardAudio`.
 *
 * Vocabulary identity: `word_en` from `LessonVocabularyItem`. This is the
 * stable, language-neutral identifier that lives in both the lesson
 * vocabulary list AND the AR `ARExperienceResponse.word` field. Using
 * `word_en` keeps the hook reusable across the catalog flow and the
 * AR flashcard flow without forcing a different identity per consumer.
 *
 * Created: C15 (state tracking hook).
 */

import * as React from 'react';

// ---------------------------------------------------------------------------
// Public types — state machine vocabulary
// ---------------------------------------------------------------------------

/** The four states a vocabulary word can be in. */
export type FlashcardState = 'NEW' | 'SEEN' | 'PRACTICING' | 'LEARNED';

/**
 * Events that drive state transitions.
 * Discriminated union — easy to extend without breaking existing callers.
 */
export type FlashcardEvent =
  /** First tap / audio play. NEW → SEEN. No-op on other states. */
  | { type: 'TAP' }
  /** Pronunciation / game review started. SEEN → PRACTICING. */
  | { type: 'START_PRACTICE' }
  /** One correct answer recorded. Increments correct-counter on PRACTICING. */
  | { type: 'RECORD_CORRECT' }
  /** One incorrect answer recorded. PRACTICING → SEEN (drops the streak). */
  | { type: 'RECORD_INCORRECT' }
  /** Force the word back to NEW. Used by tests / admin / explicit reset. */
  | { type: 'RESET' };

/**
 * Internal state bag — purely functional machinery.
 * `correctCount` is the running streak of correct answers in PRACTICING.
 * It is invisible to consumers; they only see `state` and `dispatch`.
 */
export interface FlashcardStateBag {
  /** Current discrete state. */
  state: FlashcardState;
  /** Streak of correct answers while in PRACTICING. Reset on INCORRECT / RESET. */
  correctCount: number;
}

/** Number of consecutive correct answers required to mark a word LEARNED. */
export const LEARNED_THRESHOLD = 3;

/** Initial state for any vocabulary word. */
export const INITIAL_FLASHCARD_STATE: FlashcardStateBag = {
  state: 'NEW',
  correctCount: 0,
};

// ---------------------------------------------------------------------------
// Pure transition function
// ---------------------------------------------------------------------------

/**
 * Pure state transition. Given the current state bag and an event,
 * return the next state bag. Co-located with the hook so consumers
 * can test the FSM in isolation. No React, no I/O, no side effects.
 *
 * Deterministic rules:
 *   - TAP       : NEW → SEEN. Other states: no-op (no double-counted "first tap").
 *   - START_PRACTICE : SEEN → PRACTICING. NEW → PRACTICING is a no-op (must be SEEN first).
 *                     PRACTICING / LEARNED: no-op.
 *   - RECORD_CORRECT : PRACTICING + correctCount+1 >= LEARNED_THRESHOLD → LEARNED.
 *                      Otherwise PRACTICING + count++.
 *                      Other states: no-op (must be PRACTICING first).
 *   - RECORD_INCORRECT : PRACTICING → SEEN (drops the streak).
 *                        Other states: no-op.
 *   - RESET     : → NEW, correctCount = 0. Always idempotent.
 *
 * The `no-op` semantics are intentional. Repeated TAPs on a SEEN word
 * MUST NOT jump the word to PRACTICING (that requires an explicit
 * START_PRACTICE event). Repeated START_PRACTICE on a PRACTICING word
 * MUST NOT reset the counter (idempotent). Only the discrete event
 * meant for that transition advances the FSM.
 */
export function transitionState(
  current: FlashcardStateBag,
  event: FlashcardEvent
): FlashcardStateBag {
  switch (event.type) {
    case 'TAP': {
      if (current.state === 'NEW') {
        return { state: 'SEEN', correctCount: 0 };
      }
      // Idempotent: subsequent taps do not advance.
      return current;
    }

    case 'START_PRACTICE': {
      if (current.state === 'SEEN') {
        return { state: 'PRACTICING', correctCount: 0 };
      }
      // NEW → PRACTICING is forbidden (must go through SEEN first).
      // PRACTICING / LEARNED: idempotent.
      return current;
    }

    case 'RECORD_CORRECT': {
      if (current.state !== 'PRACTICING') {
        // Must be actively practicing to count correct answers.
        return current;
      }
      const nextCount = current.correctCount + 1;
      if (nextCount >= LEARNED_THRESHOLD) {
        return { state: 'LEARNED', correctCount: LEARNED_THRESHOLD };
      }
      return { state: 'PRACTICING', correctCount: nextCount };
    }

    case 'RECORD_INCORRECT': {
      // PRACTICING → SEEN. Drops the streak back to zero.
      // Other states: no-op (you cannot be "incorrect" on a NEW word).
      if (current.state !== 'PRACTICING') {
        return current;
      }
      return { state: 'SEEN', correctCount: 0 };
    }

    case 'RESET': {
      return { ...INITIAL_FLASHCARD_STATE };
    }
  }
}

// ---------------------------------------------------------------------------
// Hook — React-shaped state container
// ---------------------------------------------------------------------------

export interface UseFlashcardStateResult {
  /** Current discrete state for this vocabulary word. */
  state: FlashcardState;
  /** Current correct-streak (only meaningful in PRACTICING). */
  correctCount: number;
  /** Dispatch an event into the pure transition function. */
  dispatch: (event: FlashcardEvent) => void;
  /** Reset to NEW. Convenience for tests / explicit reset. */
  reset: () => void;
}

/**
 * useFlashcardState — per-vocabulary state tracking.
 *
 * Each hook instance is keyed by its `word_en` (the stable vocabulary
 * identity). Two words → two independent FSM instances. Cross-word
 * coupling is intentionally absent.
 *
 * No persistence: refreshing or remounting the component resets the
 * state to NEW. The flashcard surface is session-scoped — vocabulary
 * progress persistence is the backend team's B4 task.
 *
 * The hook does NOT call `useFlashcardAudio`. The C14 component
 * decides when to dispatch `TAP` (typically from a successful audio
 * play callback). Decoupling keeps each hook individually testable.
 *
 * Word identity contract: `word` is the canonical vocabulary key.
 * A `null` or `undefined` word is treated as an "unknown identity" —
 * the hook still mounts, but the state machine is essentially inert
 * (no consumer should dispatch without a real word). Calling with
 * `null` MUST NOT crash, MUST NOT carry over previous state.
 */
export function useFlashcardState(
  word: string | null | undefined
): UseFlashcardStateResult {
  const [bag, setBag] = React.useState<FlashcardStateBag>(
    INITIAL_FLASHCARD_STATE
  );

  // Reset to NEW if the word identity changes. Without this, swapping
  // <FlashcardState word="cat" /> → <FlashcardState word="dog" /> would
  // surface the previous word's state. Initially this CAN be argued to
  // be desirable (cross-session continuity), but the spec says no
  // persistence, so each distinct identity boots fresh.
  const lastWordRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (word !== lastWordRef.current) {
      lastWordRef.current = word ?? null;
      setBag(INITIAL_FLASHCARD_STATE);
    }
  }, [word]);

  const dispatch = React.useCallback((event: FlashcardEvent) => {
    setBag((prev) => transitionState(prev, event));
  }, []);

  const reset = React.useCallback(() => {
    setBag(INITIAL_FLASHCARD_STATE);
  }, []);

  return {
    state: bag.state,
    correctCount: bag.correctCount,
    dispatch,
    reset,
  };
}