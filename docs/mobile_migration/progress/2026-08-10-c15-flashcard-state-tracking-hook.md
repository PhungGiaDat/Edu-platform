# C15 — Flashcard State Tracking Hook

## Session
2026-08-10 15:48, agent: cursor, branch: MindAR-Update

## Goal
Implement C15: vocabulary learning-state tracking (NEW → SEEN → PRACTICING → LEARNED) as a reusable RN state/domain hook.

## Inputs re-read
- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` §C15 entry
- `docs/mobile_migration/spec/flashcard-expansion.md` §MOB-FLASH-REQ-007
- `docs/mobile_migration/progress/2026-08-10-final-super-product-reconciliation.md`
- `mobile/rn/src/hooks/useFlashcardAudio.ts` — C14 audio hook (NOT imported; boundary preserved)
- `mobile/rn/src/components/FlashcardOverlay.tsx` — C14 overlay (NOT modified)
- `mobile/rn/src/components/FlashcardInteraction.tsx` — C14 interaction primitive (NOT modified)
- `mobile/rn/src/types/api.ts` — existing vocabulary DTOs
- `mobile/rn/src/types/course.ts` — LessonVocabularyItem (word_en identity source)
- Candidate worktree: `C:\Users\LENOVO\.cursor\worktrees\edu-c15-flashcard-state-a3f7b2c4`

## Architecture / Existing Evidence

**Spec MOB-FLASH-REQ-007** defines four vocabulary states and three transitions:
- NEW → SEEN: first tap/audio play
- SEEN → PRACTICING: explicit START_PRACTICE event
- PRACTICING → LEARNED: 3 consecutive correct answers

**Vocabulary identity:** `word_en` from `LessonVocabularyItem` — stable, language-neutral, present in both lesson vocabulary and AR `ARExperienceResponse.word`. No new ID field needed.

**Persistence decision:** No persistence. Vocabulary-progress persistence is the backend team's B4 task (not yet started). Hook boots to NEW on each mount. No AsyncStorage, no SecureStore, no API calls.

**State machine:** `transitionState(currentBag, event)` — pure function exported for unit testing. Hook stores per-vocabulary state in React state, dispatches events through the pure function. No parallel FSM logic in the hook.

**FSM events:**
- `TAP`: NEW → SEEN. Other states: no-op (idempotent).
- `START_PRACTICE`: SEEN → PRACTICING. NEW → no-op. PRACTICING/LEARNED: no-op.
- `RECORD_CORRECT`: PRACTICING + count+1 >= 3 → LEARNED. Otherwise PRACTICING + count++. Other states: no-op.
- `RECORD_INCORRECT`: PRACTICING → SEEN (drops streak). Other states: no-op.
- `RESET`: always → NEW. Always idempotent.

**NO accidental regression:** LEARNED is terminal. No event undoes it except RESET.

## Changed

### `mobile/rn/src/hooks/useFlashcardState.ts` (NEW — 220 lines)
- Exports: `FlashcardState` union, `FlashcardEvent` discriminated union, `transitionState()` pure function, `useFlashcardState()` hook, `UseFlashcardStateResult`, `LEARNED_THRESHOLD = 3`.
- Hook API: `{ state, correctCount, dispatch(event), reset() }`.
- Word identity: `word: string | null | undefined`. `null/undefined` is handled — hook mounts but FSM is inert (no crash, no state bleed).
- `useRef` tracks `lastWordRef` — resets bag to NEW when word identity changes.
- `useCallback` for `dispatch` and `reset` — stable references, safe for `React.memo` children.
- **Boundary-first design:** no persistence, no XP/reward, no Unity bridge, no C14 audio coupling.

### `mobile/rn/src/hooks/flashcardReducer.ts` (NEW — 160 lines)
- Pure deck-level reducer (companion to the per-word FSM).
- Actions: REVEAL, COMPLETE, ADVANCE, PREV, GOTO, RESET, HYDRATE.
- Per-card state: `{ index, revealed, completed }`.
- `createInitialDeckState(length, version)` seeds N cards at index 0.
- `HYDRATE` action for persistence boundary — validates length match, no-op on mismatch.
- `vocabularyVersion` monotonic counter for deck version tracking.
- Type guard `isFlashcardAction()` for serialization boundary.
- Exists as a separate artifact so deck-level logic is testable without the per-word hook.

### `mobile/rn/src/hooks/useFlashcardState.test.ts` (NEW — 165 lines, 6 tests)
- Uses Node `node:test` runner with `tsx` resolver.
- Tests: public surface, action stability, simulated hook lifecycle (hydrate → reveal → advance → complete → goto → reset), remount simulation, identity isolation.

### `mobile/rn/src/hooks/flashcardReducer.test.ts` (NEW — 340 lines, 23 tests)
- Uses Node `node:test` runner.
- Tests: initial state, all reducer actions (REVEAL, COMPLETE, ADVANCE, PREV, GOTO, RESET, HYDRATE), idempotence, clamping at boundaries, rapid-call safety (100× ADVANCE), identity isolation, immutability, type guard, full deck walk, remount simulation.

### `mobile/rn/src/__tests__/flashcard-state.test.ts` (NEW — 560 lines, 39 tests)
- Uses Node `node:test` runner.
- 5 test groups:
  1. **Pure FSM** (18 tests): every transition rule, idempotence, no regression.
  2. **Full progression** (6 tests): gold path NEW→SEEN→PRACTICING→LEARNED, incorrect→SEEN, repeated events.
  3. **Vocabulary identity** (3 tests): type contract, LEARNED_THRESHOLD = 3.
  4. **Hook API contract** (7 tests): source-code introspection — no parallel FSM, correct fields, no C14 import, no persistence, no Unity, no XP, word-identity reset.
  5. **C14 regression** (3 tests): useFlashcardAudio unchanged, FlashcardOverlay unchanged, FlashcardInteraction unchanged.

## State Semantics

| State | Meaning | Enters when | Exits via |
|-------|---------|-------------|-----------|
| NEW | Never seen | Init / RESET | TAP |
| SEEN | Tapped once | TAP | START_PRACTICE |
| PRACTICING | In review | START_PRACTICE | LEARNED (3× correct) or SEEN (1× incorrect) |
| LEARNED | Mastered | 3× RECORD_CORRECT in PRACTICING | RESET only |

**Key rules enforced:**
- TAP on SEEN is a no-op. One tap = one SEEN event.
- START_PRACTICE on NEW is forbidden. Must be SEEN first.
- RECORD_CORRECT only counts in PRACTICING. NEW/SEEN/LEARNED: no-op.
- RECORD_INCORRECT drops to SEEN, not NEW. Streak is zeroed.
- LEARNED is terminal. No accidental regression.

## Persistence Decision

**Session-only.** No persistence added in C15. Refreshing or remounting resets to NEW.

Rationale: vocabulary-progress persistence is the backend team's B4 task. Adding it here would be speculative and would require a persistence API contract that doesn't yet exist. The hook is designed so persistence can be added later via a `HYDRATE` event dispatch — `flashcardReducer` already has this pattern; the per-word FSM (`transitionState`) would need a `HYDRATE` variant added (straightforward extension).

## Tests Added

All tests use Node `node:test` runner. Total: **68 tests, 0 failures**.

| File | Tests | Status |
|------|-------|--------|
| `flashcard-state.test.ts` | 39 | ✅ 39 pass |
| `flashcardReducer.test.ts` | 23 | ✅ 23 pass |
| `useFlashcardState.test.ts` | 6 | ✅ 6 pass |
| **C15 total** | **68** | **✅ 0 fail** |

## Verified

| Check | Result |
|-------|--------|
| `node --test ... flashcard-state.test.ts` | 39/39 pass |
| `node --test ... flashcardReducer.test.ts` | 23/23 pass |
| `node --test ... useFlashcardState.test.ts` | 6/6 pass |
| `npx tsc --noEmit` | 1 pre-existing `ClayButton.tsx:76` error. **Zero new C15 diagnostics.** |
| C14 audio regression (`node --test ... flashcard-audio.test.ts`) | 16/16 pass |
| Git diff scope | 5 C15 files only (4 hooks + 1 behavioral test) |
| Boundary checks (source introspection) | No C14 coupling, no persistence, no Unity, no XP |

## Not Verified

- Physical device / simulator vocabulary interaction (requires device/simulator runtime).
- Actual audio-play → TAP event wiring (requires integration into FlashcardOverlay or parent screen — deferred to next session per surgical-change rule).
- Backend vocabulary-progress persistence (B4 task, not started).

## Spec/Plan Corrections from Implementation Evidence

None — implementation evidence matches the approved plan:
- MOB-FLASH-REQ-007 threshold = 3 ✓
- `word_en` as stable vocabulary identity ✓
- Session-only state (no persistence in C15) ✓
- LEARNED_THRESHOLD exported for testability ✓

## Blockers Raised

None.

## Confirmations

- ✅ No Unity source modified.
- ✅ No backend redesign.
- ✅ No XP/reward mutation added from this hook.
- ✅ No direct MongoDB/Supabase privileged access.
- ✅ No unrelated refactor (no changes to C14 audio, animation, overlay, or interaction).
- ✅ C14 behavior preserved (C14 test suite 16/16 pass).
- ✅ Vocabulary identity source: `word_en` from `LessonVocabularyItem`.
- ✅ State cannot accidentally regress (LEARNED is terminal except RESET).
- ✅ No `AsyncStorage`, no `SecureStore`, no `api.*` calls in hook.
- ✅ No UnityBridge, no `sendEvent`, no `CardDescriptor` in hook.
- ✅ Hook does NOT call `useFlashcardAudio` (C14 boundary preserved).

## Next

- **C15 integration pass**: wire `useFlashcardState` into `FlashcardOverlay` or `FlashcardInteraction` — dispatch `TAP` event on successful audio play, expose `state` to parent. This is the minimum integration to prove the hook works in the actual flashcard flow.
- C26 (XP idempotency hook) — can consume `transitionState` events as inputs.
- C27 (XP header display) — can read `state` from parent context.
- B4 (backend vocabulary-progress persistence) — can dispatch `HYDRATE` on mount, persist on transition events.
