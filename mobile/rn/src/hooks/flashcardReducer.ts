/**
 * flashcardReducer — pure transition helper for a flashcard deck.
 *
 * C15 — Flashcard State Tracking.
 *
 * Lives outside React so the transition logic can be unit-tested without
 * a renderer, and so any consumer (component, hook, server-rendered code
 * path) can derive state from `(state, action)` pairs deterministically.
 *
 * The reducer is intentionally small and idempotent:
 *   - REVEAL:    mark current card revealed; no-op if already revealed.
 *   - COMPLETE:  mark current card completed; idempotent.
 *   - ADVANCE:   move currentIndex forward; clamps at end (idempotent).
 *   - PREV:      move currentIndex backward; clamps at start (idempotent).
 *   - GOTO:      jump to a specific card index; clamps out-of-range.
 *   - RESET:     return to initial deck state.
 *   - HYDRATE:   replace state from persisted snapshot.
 *
 * It does NOT touch storage, network, or RNG. All side-effects are the
 * consumer's responsibility — this matches the project convention
 * (`useAuth` / `useCourses` keep state + actions; persistence is
 * optional and explicit).
 *
 * Identity for a card is its array index. The vocabulary array identity
 * (the deck) is not stored; consumers must pass the same deck for the
 * reducer output to remain coherent. The hook layer enforces that with
 * a `vocabularyVersion` guard so a fresh deck resets the cursor.
 */

export type FlashcardStatus = 'unseen' | 'revealed' | 'completed';

export interface FlashcardCardState {
  /** Card index in the source vocabulary array. */
  readonly index: number;
  /** Whether the card's content has been revealed at least once. */
  readonly revealed: boolean;
  /** Whether the card has been marked completed. */
  readonly completed: boolean;
}

export interface FlashcardDeckState {
  /** Index of the currently-focused card. Always 0..length-1 once seeded. */
  readonly currentIndex: number;
  /** Per-card state, keyed by index. */
  readonly cards: ReadonlyArray<FlashcardCardState>;
  /**
   * Monotonic version counter the consumer bumps whenever the underlying
   * vocabulary array changes. The hook layer uses it to reset the cursor
   * without forcing every card back to `unseen`.
   */
  readonly vocabularyVersion: number;
}

export type FlashcardAction =
  | { type: 'REVEAL' }
  | { type: 'COMPLETE' }
  | { type: 'ADVANCE' }
  | { type: 'PREV' }
  | { type: 'GOTO'; index: number }
  | { type: 'RESET' }
  | {
      type: 'HYDRATE';
      state: FlashcardDeckState;
    };

export const createInitialDeckState = (
  length: number,
  vocabularyVersion = 0,
): FlashcardDeckState => ({
  currentIndex: length > 0 ? 0 : 0,
  cards: Array.from({ length }, (_, index) => ({
    index,
    revealed: false,
    completed: false,
  })),
  vocabularyVersion,
});

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

/**
 * Reduce a deck state by one action. Pure: same `(state, action)` always
 * yields the same result. Empty decks are valid and stay empty.
 */
export const flashcardReducer = (
  state: FlashcardDeckState,
  action: FlashcardAction,
): FlashcardDeckState => {
  const total = state.cards.length;

  switch (action.type) {
    case 'REVEAL': {
      if (total === 0) return state;
      const idx = clamp(state.currentIndex, 0, total - 1);
      const card = state.cards[idx];
      if (!card || card.revealed) return state;
      const nextCards = state.cards.map((c, i) =>
        i === idx ? { ...c, revealed: true } : c,
      );
      return { ...state, cards: nextCards };
    }

    case 'COMPLETE': {
      if (total === 0) return state;
      const idx = clamp(state.currentIndex, 0, total - 1);
      const card = state.cards[idx];
      if (!card || card.completed) return state;
      const nextCards = state.cards.map((c, i) =>
        i === idx ? { ...c, revealed: true, completed: true } : c,
      );
      return { ...state, cards: nextCards };
    }

    case 'ADVANCE': {
      if (total === 0) return state;
      const next = clamp(state.currentIndex + 1, 0, total - 1);
      if (next === state.currentIndex) return state;
      return { ...state, currentIndex: next };
    }

    case 'PREV': {
      if (total === 0) return state;
      const next = clamp(state.currentIndex - 1, 0, total - 1);
      if (next === state.currentIndex) return state;
      return { ...state, currentIndex: next };
    }

    case 'GOTO': {
      if (total === 0) return state;
      const next = clamp(action.index, 0, total - 1);
      if (next === state.currentIndex) return state;
      return { ...state, currentIndex: next };
    }

    case 'RESET':
      return createInitialDeckState(total, state.vocabularyVersion);

    case 'HYDRATE': {
      // Defensive: if the hydrated deck length doesn't match the current
      // vocabulary length, fall back to initial state. This protects
      // consumers from corrupt AsyncStorage entries.
      if (action.state.cards.length !== total) return state;
      return action.state;
    }

    default:
      return state;
  }
};

export const isFlashcardAction = (value: unknown): value is FlashcardAction => {
  if (!value || typeof value !== 'object') return false;
  const v = value as { type?: unknown };
  return (
    v.type === 'REVEAL' ||
    v.type === 'COMPLETE' ||
    v.type === 'ADVANCE' ||
    v.type === 'PREV' ||
    v.type === 'GOTO' ||
    v.type === 'RESET' ||
    v.type === 'HYDRATE'
  );
};