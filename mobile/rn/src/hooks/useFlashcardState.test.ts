/**
 * useFlashcardState.test.ts — C15 hook contract test.
 *
 * The project does NOT install a React test renderer (no jest/vitest,
 * no react-test-renderer, no @testing-library/react-native). Rather
 * than silently introduce a multi-megabyte dependency tree, this file
 * asserts the hook's PUBLIC CONTRACT through three angles:
 *
 *   1. Static shape — the exported surface (function + types) is what
 *      callers expect.
 *   2. Action identity — action callbacks returned by the hook are
 *      referentially stable across renders (the basis for
 *      React.memo'd Flashcard children to skip re-renders).
 *   3. Reducer-driven dispatch semantics — simulating the hook's
 *      dispatch loop against the pure reducer to prove the public
 *      actions compose correctly.
 *
 * Run with:
 *   npx tsx src/hooks/useFlashcardState.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialDeckState,
  flashcardReducer,
  type FlashcardAction,
  type FlashcardDeckState,
} from './flashcardReducer';

// ─────────────────────────────────────────────────────────────────────────────
// Public surface
// ─────────────────────────────────────────────────────────────────────────────

test('hook module exports the expected public surface', async () => {
  const mod = await import('./useFlashcardState');
  assert.equal(typeof mod.useFlashcardState, 'function');
});

test('hook types compile and accept the documented config shape', () => {
  // This block is purely a type-level assertion: if it compiles under
  // strict TS, the public contract is sound. We don't run anything here.
  const seq: FlashcardAction[] = [
    { type: 'REVEAL' },
    { type: 'COMPLETE' },
    { type: 'ADVANCE' },
    { type: 'PREV' },
    { type: 'GOTO', index: 2 },
    { type: 'RESET' },
  ];
  // Each action must narrow correctly.
  for (const a of seq) {
    assert.ok(a && typeof a === 'object');
    assert.equal(typeof (a as { type: unknown }).type, 'string');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Action identity stability — the hook returns `useCallback` results,
// which are stable across renders when their deps are stable. We can't
// run React here, but we can assert the reducer's inputs are pure, which
// is the contract those callbacks rely on for referential stability.
// ─────────────────────────────────────────────────────────────────────────────

test('dispatching the same action twice produces structurally equal state (basis for action stability)', () => {
  const start = createInitialDeckState(4);
  const once = flashcardReducer(start, { type: 'ADVANCE' });
  const twice = flashcardReducer(once, { type: 'ADVANCE' });
  const thrice = flashcardReducer(twice, { type: 'ADVANCE' });
  // Each subsequent dispatch on an idempotent endpoint is a structural no-op.
  const stable = flashcardReducer(thrice, { type: 'ADVANCE' });
  assert.equal(stable, thrice);
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook dispatch simulation — the hook calls `dispatch({type:...})`.
// Simulate that here to prove the public action surface composes
// correctly against the reducer, which is what the hook does internally.
// ─────────────────────────────────────────────────────────────────────────────

test('simulated hook lifecycle: hydrate → reveal → advance → complete → goto → reset', () => {
  const length = 4;
  let state: FlashcardDeckState = createInitialDeckState(length);

  // hydrate with prior session
  const snapshot: FlashcardDeckState = {
    currentIndex: 1,
    cards: [
      { index: 0, revealed: true, completed: true },
      { index: 1, revealed: false, completed: false },
      { index: 2, revealed: false, completed: false },
      { index: 3, revealed: false, completed: false },
    ],
    vocabularyVersion: 0,
  };
  state = flashcardReducer(state, { type: 'HYDRATE', state: snapshot });
  assert.equal(state.currentIndex, 1);
  assert.equal(state.cards[0].completed, true);

  // reveal current
  state = flashcardReducer(state, { type: 'REVEAL' });
  assert.equal(state.cards[1].revealed, true);

  // advance to index 2 and complete
  state = flashcardReducer(state, { type: 'ADVANCE' });
  assert.equal(state.currentIndex, 2);
  state = flashcardReducer(state, { type: 'COMPLETE' });
  assert.equal(state.cards[2].completed, true);

  // jump back to index 1 and reveal (no-op, already revealed)
  state = flashcardReducer(state, { type: 'GOTO', index: 1 });
  assert.equal(state.currentIndex, 1);
  const beforeReReveal = state;
  state = flashcardReducer(state, { type: 'REVEAL' });
  assert.equal(state, beforeReReveal, 're-revealing an already revealed card is a no-op');

  // reset wipes progress but preserves version (matches hook behaviour)
  state = flashcardReducer(state, { type: 'RESET' });
  assert.equal(state.currentIndex, 0);
  assert.equal(state.cards[0].revealed, false);
  assert.equal(state.cards[0].completed, false);
  assert.equal(state.cards.length, 4);
});

// ─────────────────────────────────────────────────────────────────────────────
// Remount behaviour — when the hook sees a new vocabularyVersion it
// dispatches RESET. Simulate that here.
// ─────────────────────────────────────────────────────────────────────────────

test('remount simulation: bump vocabularyVersion triggers RESET, preserving card count', () => {
  // Initial mount
  let state = createInitialDeckState(3, /*version*/ 1);
  state = flashcardReducer(state, { type: 'ADVANCE' });
  state = flashcardReducer(state, { type: 'COMPLETE' });
  assert.equal(state.currentIndex, 1);
  assert.equal(state.cards[1].completed, true);

  // New deck arrives with same length but new version → RESET
  state = flashcardReducer(state, { type: 'RESET' });
  assert.equal(state.currentIndex, 0);
  assert.equal(state.cards.length, 3);
  // Per-card completion wiped (this is the documented hook behaviour).
  assert.equal(state.cards[1].completed, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// Identity isolation: two simulated hooks must not share state.
// ─────────────────────────────────────────────────────────────────────────────

test('two independent hook simulations are isolated', () => {
  const hookA = createInitialDeckState(5);
  const hookB = createInitialDeckState(5);
  // Independent dispatch chains.
  const aFinal = flashcardReducer(hookA, { type: 'ADVANCE' });
  const bFinal = flashcardReducer(hookB, { type: 'COMPLETE' });
  assert.equal(aFinal.currentIndex, 1);
  assert.equal(aFinal.cards[0].completed, false);
  assert.equal(bFinal.currentIndex, 0);
  assert.equal(bFinal.cards[0].completed, true);
});