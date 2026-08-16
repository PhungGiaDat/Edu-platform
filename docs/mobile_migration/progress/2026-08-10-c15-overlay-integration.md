# C15 Integration — Flashcard Overlay → Learning State Wiring

## Session
2026-08-10, agent: Claude Code, branch: MindAR-Update

## Goal
Perform the minimum C15 integration pass promised by the prior C15 progress note: wire `useFlashcardState` into the actual flashcard overlay so vocabulary taps can transition `NEW → SEEN` and parent screens can observe the current state.

## Inputs Re-read
- `docs/mobile_migration/progress/2026-08-10-c15-flashcard-state-tracking-hook.md`
- `mobile/rn/src/components/FlashcardOverlay.tsx`
- `mobile/rn/src/hooks/useFlashcardState.ts`
- `mobile/rn/src/__tests__/flashcard-audio.test.ts`

## Integration Boundary
This session intentionally implemented only the smallest approved integration:
- dispatch `TAP` from overlay interactions
- expose current flashcard state upward via callback

This session did **not** add:
- persistence
- XP/reward side effects
- backend writes
- Unity bridge logic
- PRACTICING/LEARNED progression UI

## Changed

### `mobile/rn/src/components/FlashcardOverlay.tsx`
- Imported `useFlashcardState` and `FlashcardState`.
- Extended props with:
  - `onStateChange?: (state: FlashcardState) => void`
- Created per-word state via:
  - `const { state, dispatch } = useFlashcardState(word)`
- Added effect to propagate state to parent:
  - `onStateChange?.(state)`
- Updated both interaction paths to dispatch `TAP` before replaying audio:
  - image tap
  - speaker tap
- Preserved existing C14 audio flow:
  - `useFlashcardAudio()` still owns playback
  - `playVocabulary(audioUrl)` still runs on tap
  - repeated taps still replay audio

### `mobile/rn/src/__tests__/flashcard-audio.test.ts`
- Extended the overlay prop-contract assertion so `onStateChange` is explicitly covered as an optional prop.

### `mobile/rn/src/__tests__/flashcard-overlay-state.test.ts` (NEW)
- Added focused source-contract coverage for the C15 integration.
- Verifies:
  1. overlay imports `useFlashcardState` + `FlashcardState`
  2. overlay accepts `onStateChange`
  3. overlay calls `useFlashcardState(word)`
  4. overlay propagates state via `onStateChange?.(state)`
  5. image tap dispatches `TAP` before `playVocabulary(audioUrl)`
  6. speaker tap dispatches `TAP` before `playVocabulary(audioUrl)`
  7. existing `useFlashcardAudio()` boundary remains intact

## Verified

### Read-only verification completed
Confirmed in `FlashcardOverlay.tsx`:
- `import { useFlashcardState, FlashcardState } from '../hooks/useFlashcardState';`
- `onStateChange?: (state: FlashcardState) => void;`
- `const { state, dispatch } = useFlashcardState(word);`
- `onStateChange?.(state);`
- `dispatch({ type: 'TAP' });` appears in both tap handlers
- `playVocabulary(audioUrl);` remains in both tap handlers
- `useFlashcardAudio()` is still present and unchanged as the playback owner

Confirmed in tests:
- `flashcard-audio.test.ts` now checks `props.onStateChange === undefined` when omitted
- `flashcard-overlay-state.test.ts` exists with dedicated source-contract coverage for the new wiring

## Not Verified
Command-based verification is still blocked by the same environment issue from earlier in the session:
- `node --test ... flashcard-overlay-state.test.ts`
- `node --test ... flashcard-audio.test.ts`
- `npx tsc --noEmit`

Blocked by harness error:
- `claude-opus-4-8 is temporarily unavailable, so auto mode cannot determine the safety of Bash right now`

So this integration is **implemented and source-verified**, but command execution is still pending.

## Spec/Plan Corrections from Implementation Evidence
None.

This integration matches the prior C15 direction exactly:
- overlay dispatches `TAP` into the state machine ✓
- state can be observed by the parent ✓
- no speculative persistence or reward coupling ✓

## Blockers Raised
- **ENVIRONMENT_BLOCKER:** Bash classifier unavailable, preventing automated test/typecheck execution.

## Confirmations
- ✅ No Unity source modified
- ✅ No `docs/unity_ar/**` modified
- ✅ No backend runtime modified
- ✅ No persistence added
- ✅ No XP/reward mutation added
- ✅ No direct MongoDB access added
- ✅ No privileged Supabase access added
- ✅ No unrelated refactor outside the overlay/test boundary
- ✅ C14 audio ownership remains in RN `useFlashcardAudio`

## Next
The next real functional step after this integration would be a consumer that uses `onStateChange` for UI/telemetry/state display, or a separate review flow that dispatches `START_PRACTICE` / `RECORD_CORRECT` / `RECORD_INCORRECT`.
