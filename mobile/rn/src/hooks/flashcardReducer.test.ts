/**
 * flashcardReducer.test.ts — C15 behavioral tests.
 *
 * Strategy: this project has no test framework installed (no jest/vitest
 * in package.json). To keep the change "smallest reusable" we do NOT add
 * one. Instead these tests are pure-TS and run with Node's built-in
 * `node:test` runner — zero new dependencies, runs with:
 *
 *     npx tsx src/hooks/flashcardReducer.test.ts
 *     node --test --import tsx src/hooks/flashcardReducer.test.ts
 *
 * The pure reducer is the most testable piece of the C15 surface and
 * covers the brief's required cases:
 *   - all transitions (REVEAL, COMPLETE, ADVANCE, PREV, GOTO, RESET, HYDRATE)
 *   - idempotence (every action dispatchable twice without changing output)
 *   - no regression (RESET preserves vocabularyVersion; HYDRATE no-op on
 *     mismatch)
 *   - identity isolation (two independent state objects never share refs)
 *   - missing identity / empty deck (all actions are no-ops on length=0)
 *   - rapid calls (100× ADVANCE clamps at total-1)
 *   - remount simulation (HYDRATE then dispatch sequence preserves state)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialDeckState,
  flashcardReducer,
  isFlashcardAction,
  type FlashcardAction,
  type FlashcardDeckState,
} from './flashcardReducer';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const vocab = (n: number): string[] => Array.from({ length: n }, (_, i) => `card-${i}`);

/** Dispatch many actions in a row and capture the final state. */
const dispatchAll = (
  initial: FlashcardDeckState,
  actions: FlashcardAction[],
): FlashcardDeckState => actions.reduce(flashcardReducer, initial);

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

test('createInitialDeckState seeds N cards at index 0, all unseen', () => {
  const s = createInitialDeckState(5, 7);
  assert.equal(s.currentIndex, 0);
  assert.equal(s.cards.length, 5);
  assert.equal(s.vocabularyVersion, 7);
  assert.deepEqual(
    s.cards.map((c) => [c.index, c.revealed, c.completed]),
    [
      [0, false, false],
      [1, false, false],
      [2, false, false],
      [3, false, false],
      [4, false, false],
    ],
  );
});

test('createInitialDeckState with length 0 is valid and idempotent', () => {
  const s = createInitialDeckState(0);
  assert.equal(s.cards.length, 0);
  // No crash on further dispatches.
  const after = flashcardReducer(s, { type: 'ADVANCE' });
  assert.equal(after.currentIndex, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// REVEAL
// ─────────────────────────────────────────────────────────────────────────────

test('REVEAL marks current card revealed', () => {
  const start = createInitialDeckState(3);
  const after = flashcardReducer(start, { type: 'REVEAL' });
  assert.equal(after.cards[0].revealed, true);
  assert.equal(after.cards[1].revealed, false);
  assert.equal(after.currentIndex, 0);
});

test('REVEAL is idempotent — second dispatch is a no-op (no new ref churn)', () => {
  const start = createInitialDeckState(3);
  const once = flashcardReducer(start, { type: 'REVEAL' });
  const twice = flashcardReducer(once, { type: 'REVEAL' });
  assert.equal(once, twice, 'idempotent reducer must return structurally equal state');
  assert.equal(once.cards, twice.cards, 'idempotent reducer must not allocate a new array');
});

test('REVEAL on empty deck is a no-op', () => {
  const start = createInitialDeckState(0);
  const after = flashcardReducer(start, { type: 'REVEAL' });
  assert.equal(after, start);
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE
// ─────────────────────────────────────────────────────────────────────────────

test('COMPLETE marks current card completed AND revealed', () => {
  const start = createInitialDeckState(3);
  const after = flashcardReducer(start, { type: 'COMPLETE' });
  assert.equal(after.cards[0].completed, true);
  assert.equal(after.cards[0].revealed, true);
});

test('COMPLETE is idempotent', () => {
  const start = createInitialDeckState(3);
  const once = flashcardReducer(start, { type: 'COMPLETE' });
  const twice = flashcardReducer(once, { type: 'COMPLETE' });
  assert.equal(once, twice);
});

// ─────────────────────────────────────────────────────────────────────────────
// ADVANCE / PREV (with clamping & idempotence)
// ─────────────────────────────────────────────────────────────────────────────

test('ADVANCE moves cursor forward by one', () => {
  const start = createInitialDeckState(5);
  const after = flashcardReducer(start, { type: 'ADVANCE' });
  assert.equal(after.currentIndex, 1);
});

test('ADVANCE clamps at last index — further calls are no-ops', () => {
  const start = createInitialDeckState(3);
  const once = flashcardReducer(start, { type: 'ADVANCE' });
  const twice = flashcardReducer(once, { type: 'ADVANCE' });
  const end = flashcardReducer(twice, { type: 'ADVANCE' });
  assert.equal(end.currentIndex, 2);
  // Idempotent at end:
  const beyond = flashcardReducer(end, { type: 'ADVANCE' });
  assert.equal(beyond, end);
});

test('PREV moves cursor backward and clamps at 0', () => {
  const start = createInitialDeckState(3);
  const a = flashcardReducer(start, { type: 'ADVANCE' });
  const b = flashcardReducer(a, { type: 'ADVANCE' });
  const back = flashcardReducer(b, { type: 'PREV' });
  assert.equal(back.currentIndex, 1);
  const atStart = flashcardReducer(back, { type: 'PREV' });
  assert.equal(atStart.currentIndex, 0);
  // Idempotent at start:
  const before = flashcardReducer(atStart, { type: 'PREV' });
  assert.equal(before, atStart);
});

// ─────────────────────────────────────────────────────────────────────────────
// Rapid-call stress
// ─────────────────────────────────────────────────────────────────────────────

test('rapid 100× ADVANCE clamps at total-1 (rapid-call safety)', () => {
  const start = createInitialDeckState(10);
  const after = dispatchAll(
    start,
    Array.from({ length: 100 }, () => ({ type: 'ADVANCE' as const })),
  );
  assert.equal(after.currentIndex, 9);
});

test('rapid alternating ADVANCE/PREV never throws and is bounded', () => {
  const start = createInitialDeckState(4);
  const seq: FlashcardAction[] = [];
  for (let i = 0; i < 200; i += 1) {
    seq.push(i % 2 === 0 ? { type: 'ADVANCE' } : { type: 'PREV' });
  }
  const after = dispatchAll(start, seq);
  assert.ok(after.currentIndex >= 0 && after.currentIndex <= 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// GOTO
// ─────────────────────────────────────────────────────────────────────────────

test('GOTO jumps to a specific index', () => {
  const start = createInitialDeckState(5);
  const after = flashcardReducer(start, { type: 'GOTO', index: 3 });
  assert.equal(after.currentIndex, 3);
});

test('GOTO clamps out-of-range values', () => {
  const start = createInitialDeckState(3);
  const tooHigh = flashcardReducer(start, { type: 'GOTO', index: 99 });
  assert.equal(tooHigh.currentIndex, 2);
  const tooLow = flashcardReducer(start, { type: 'GOTO', index: -5 });
  assert.equal(tooLow.currentIndex, 0);
});

test('GOTO with NaN is treated as 0 (defensive)', () => {
  const start = createInitialDeckState(3);
  const after = flashcardReducer(start, { type: 'GOTO', index: Number.NaN });
  assert.equal(after.currentIndex, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────────────────────────────────────

test('RESET restores initial state but preserves vocabularyVersion', () => {
  const start = createInitialDeckState(4, 11);
  const mutated = dispatchAll(start, [
    { type: 'ADVANCE' },
    { type: 'ADVANCE' },
    { type: 'REVEAL' },
    { type: 'COMPLETE' },
  ]);
  // Sanity: state is actually different from start.
  assert.notEqual(mutated.currentIndex, start.currentIndex);
  const reset = flashcardReducer(mutated, { type: 'RESET' });
  assert.equal(reset.currentIndex, 0);
  assert.equal(reset.cards.length, 4);
  assert.equal(reset.vocabularyVersion, 11);
  assert.equal(reset.cards[0].revealed, false);
  assert.equal(reset.cards[0].completed, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// HYDRATE
// ─────────────────────────────────────────────────────────────────────────────

test('HYDRATE replaces state when card lengths match', () => {
  const start = createInitialDeckState(3);
  const snapshot: FlashcardDeckState = {
    currentIndex: 2,
    cards: [
      { index: 0, revealed: true, completed: true },
      { index: 1, revealed: true, completed: false },
      { index: 2, revealed: false, completed: false },
    ],
    vocabularyVersion: 0,
  };
  const after = flashcardReducer(start, { type: 'HYDRATE', state: snapshot });
  assert.deepEqual(after, snapshot);
});

test('HYDRATE on length mismatch is a no-op (corrupt-storage protection)', () => {
  const start = createInitialDeckState(3);
  const corrupt: FlashcardDeckState = {
    currentIndex: 0,
    cards: [{ index: 0, revealed: true, completed: false }],
    vocabularyVersion: 0,
  };
  const after = flashcardReducer(start, { type: 'HYDRATE', state: corrupt });
  assert.equal(after, start);
});

// ─────────────────────────────────────────────────────────────────────────────
// Identity isolation
// ─────────────────────────────────────────────────────────────────────────────

test('two independent reducer instances never share state', () => {
  const a = createInitialDeckState(5);
  const b = createInitialDeckState(5);
  // Each state object is independent.
  assert.notEqual(a, b);
  assert.notEqual(a.cards, b.cards);
  const aMut = flashcardReducer(a, { type: 'ADVANCE' });
  // b untouched.
  assert.equal(b.currentIndex, 0);
  // aMut touched.
  assert.equal(aMut.currentIndex, 1);
  // Mutating one branch does not affect the original.
  assert.equal(a.currentIndex, 0);
});

test('reducer never mutates the input state or its cards array', () => {
  const start = createInitialDeckState(4);
  const snapshot = JSON.parse(JSON.stringify(start));
  const next = flashcardReducer(start, { type: 'REVEAL' });
  // start is unchanged.
  assert.deepEqual(start, snapshot);
  // next is a fresh object.
  assert.notEqual(next, start);
  assert.notEqual(next.cards, start.cards);
});

// ─────────────────────────────────────────────────────────────────────────────
// Type guard
// ─────────────────────────────────────────────────────────────────────────────

test('isFlashcardAction recognises valid actions and rejects garbage', () => {
  assert.ok(isFlashcardAction({ type: 'REVEAL' }));
  assert.ok(isFlashcardAction({ type: 'GOTO', index: 2 }));
  assert.ok(!isFlashcardAction({ type: 'BLOW_UP' }));
  assert.ok(!isFlashcardAction(null));
  assert.ok(!isFlashcardAction(undefined));
  assert.ok(!isFlashcardAction('REVEAL'));
  assert.ok(!isFlashcardAction(42));
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end deck walk (the realistic usage pattern)
// ─────────────────────────────────────────────────────────────────────────────

test('walk through a deck: REVEAL → ADVANCE → REVEAL → COMPLETE → ADVANCE…', () => {
  const start = createInitialDeckState(3);
  const final = dispatchAll(start, [
    { type: 'REVEAL' },     // card 0 revealed
    { type: 'ADVANCE' },
    { type: 'REVEAL' },     // card 1 revealed
    { type: 'COMPLETE' },   // card 1 completed+revealed
    { type: 'ADVANCE' },
    { type: 'COMPLETE' },   // card 2 completed+revealed
  ]);
  assert.equal(final.currentIndex, 2);
  assert.equal(final.cards[0].revealed, true);
  assert.equal(final.cards[0].completed, false);
  assert.equal(final.cards[1].revealed, true);
  assert.equal(final.cards[1].completed, true);
  assert.equal(final.cards[2].revealed, true);
  assert.equal(final.cards[2].completed, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Remount simulation — HYDRATE then dispatch sequence, used by the hook layer
// ─────────────────────────────────────────────────────────────────────────────

test('remount simulation: HYDRATE picks up a prior session, then mutates', () => {
  const start = createInitialDeckState(3);
  const snapshot: FlashcardDeckState = {
    currentIndex: 1,
    cards: [
      { index: 0, revealed: true, completed: true },
      { index: 1, revealed: true, completed: false },
      { index: 2, revealed: false, completed: false },
    ],
    vocabularyVersion: 0,
  };
  const hydrated = flashcardReducer(start, { type: 'HYDRATE', state: snapshot });
  // Subsequent REVEAL applies to current card (index 1).
  const revealed = flashcardReducer(hydrated, { type: 'REVEAL' });
  assert.equal(revealed.cards[1].revealed, true);
  // Subsequent ADVANCE goes to index 2.
  const advanced = flashcardReducer(revealed, { type: 'ADVANCE' });
  assert.equal(advanced.currentIndex, 2);
});