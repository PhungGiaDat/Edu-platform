# C14 — Interactive Flashcard Tap-to-Hear + Reusable Visual Feedback

## Session
2026-08-10 14:00, agent: cursor, branch: MindAR-Update

## Goal
Implement C14: tap vocabulary image → plays pronunciation audio + spring-bounce visual feedback.

## Inputs re-read
- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` §R5 + C14 entry
- `docs/mobile_migration/spec/flashcard-expansion.md` §MOB-FLASH-REQ-005/006
- `docs/mobile_migration/progress/2026-08-10-final-super-product-reconciliation.md` §READY_NOW
- `backend/api/flashcards.py` — GET /flashcard/{qr_id} returns ARExperienceResponseSchema
- `backend/services/ar_service.py` — returns { flashcard, target, related_combos }
- `mobile/rn/src/types/api.ts` — ARExperienceResponse.audio_url (Supabase public URL)
- `mobile/rn/src/types/course.ts` — LessonVocabularyItem.audio (AssetReferenceLike)
- `frontend-web/src/components/Flashcard.tsx` — origin reference (Web Audio + HTMLAudioElement)
- `frontend-web/src/services/AudioService.ts` — origin reference (Web Audio API + SpeechSynthesis)
- `mobile/rn/package.json` — no expo-av present

## Architecture

```
Backend ARExperienceResponse.audio_url (Supabase public URL)
  → API DTO (no change needed)
  → RN: ARExperienceResponse.audio_url
  → FlashcardOverlay: audioUrl prop
  → useFlashcardAudio: playVocabulary(audioUrl)
    → expo-av Audio.Sound.createAsync()
    → MISSING_AUDIO_METADATA | AUDIO_LOAD_OR_PLAYBACK_FAILED
  → FlashcardInteraction: spring-bounce onPress → onTap → playVocabulary
```

**Backend contract consumed:** `ARExperienceResponse.audio_url` — existing field, already non-nullable string on the type. No new backend fields introduced. No MongoDB/Supabase privileged access added.

## Changed

### `mobile/rn/package.json`
- Added `expo-av: "~16.0.0"` (Audio API for React Native). Installed via `npx expo install expo-av`.

### `mobile/rn/src/hooks/useFlashcardAudio.ts` (NEW — 127 lines)
- Vocabulary pronunciation audio playback hook using expo-av.
- Exported types: `FlashcardAudioError`, `MissingAudioError`, `PlaybackError`.
- `useFlashcardAudio(): { isPlaying, playVocabulary(audioUrl), stop(), lastError }`.
- **Repeated-tap behavior:** calls `soundRef.current.stopAsync()` + `unloadAsync()` before creating a new `Audio.Sound`. Clean restart, no overlapping instances.
- **Missing audio:** `playVocabulary(null|undefined|'')` → no audio request, `lastError = { kind: 'MISSING_AUDIO_METADATA' }`, `isPlaying` stays false.
- **Playback failure:** caught, `lastError = { kind: 'AUDIO_LOAD_OR_PLAYBACK_FAILED', message }`, component stays usable.
- **Ownership:** RN owns pronunciation audio. NOT routed through Unity.

### `mobile/rn/src/components/FlashcardInteraction.tsx` (NEW — 130 lines)
- Reusable tap-to-interact primitive with spring-bounce visual feedback.
- Props: `children`, `onTap`, `disabled`, `style`, `profile`, `accessibilityLabel`.
- Uses `react-native-reanimated` (already installed) spring animations.
- `FlashcardAnimationProfile`: `scalePeak` (default 1.08), `damping` (default 12), `stiffness` (default 180).
- NOT per-vocabulary animation — generic reusable primitive.
- NOT tied to specific animal/word. NOT Unity/cat animation system.

### `mobile/rn/src/components/FlashcardOverlay.tsx` (MODIFIED)
- Added `imageUrl` prop (existing backend `image_url`).
- Integrated `FlashcardInteraction` wrapping vocabulary image → spring-bounce on tap.
- Integrated `useFlashcardAudio` for pronunciation playback.
- Speaker icon (🔊/🔈) as explicit replay control.
- Fallback `onPress` on Text when no image.
- `isLoading` prop prevents interaction during parent loading state.
- `onAudioStateChange` prop exposes `isPlaying` to parent (e.g. ARScreen).
- Debug note shown when `lastError.kind === 'MISSING_AUDIO_METADATA'`.

### `mobile/rn/src/__tests__/flashcard-audio.test.ts` (NEW — 310 lines, 16 tests)
- Uses Node's built-in `node --test` runner (matching existing test pattern).
- Test groups:
  1. **Error taxonomy** (3 tests): `MISSING_AUDIO_METADATA` vs `AUDIO_LOAD_OR_PLAYBACK_FAILED`, distinct kinds.
  2. **FlashcardInteraction props** (3 tests): `FlashcardAnimationProfile` shape, optional fields.
  3. **FlashcardOverlay props** (5 tests): interface contract, `audioUrl` normalization, `onAudioStateChange`.
  4. **Backend field** (2 tests): `audio_url` field on `ARExperienceResponse`, audio ≠ model distinction.
  5. **Repeated-tap safety** (3 tests): `stop()` returns `Promise<void>`, closure ordering, `soundRef.current.stopAsync()` called before `createAsync()`.
- expo-av not mocked — type-level verification only (RN-only dependency).
- 16/16 pass.

## Verified

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 1 pre-existing `ClayButton.tsx:76` error. **Zero new C14 diagnostics.** |
| `node --test ... flashcard-audio.test.ts` | 16/16 pass |
| Full RN suite (`src/__tests__/*.test.ts`) | 98/98 pass (M3A regression preserved) |
| Git diff scope | 5 C14 files only (package.json, FlashcardOverlay.tsx, 2 new files, 1 new test) |
| Repository-wide tsc | **NOT PASS** (pre-existing ClayButton error). Per M3A baseline. |

## Not Verified

- Physical device / simulator audio playback (requires device/simulator runtime).
- expo-av integration on iOS/Android (requires `npx expo prebuild` + native build).

## Spec/Plan Corrections from Implementation Evidence

None. The implementation evidence matches the approved plan:
- `ARExperienceResponse.audio_url` field already exists and is non-nullable string ✓
- Backend `GET /flashcard/{qr_id}` returns `{ flashcard: ..., target: ..., related_combos: [] }` ✓
- `audio_url` is a direct Supabase public URL in the flashcard sub-document ✓
- `LessonVocabularyItem.audio` uses `AssetReferenceLike` (separate path) — distinct from AR flashcard ✓

## Blockers Raised

None — C14 is self-contained. The next R5 task (C15: flashcard state tracking hook) can proceed immediately.

## Confirmations

- ✅ No Unity source modified.
- ✅ No backend runtime modified.
- ✅ No frontend-web modified.
- ✅ No direct MongoDB/Supabase privileged access added.
- ✅ No hard-coded vocabulary/audio URLs in RN component.
- ✅ `expo-av` installed via `npx expo install` (version pinned to SDK 54).
- ✅ FlashcardInteraction is reusable, not per-vocabulary.
- ✅ Repeated taps: clean restart (stop before play), no overlapping audio.
- ✅ Missing audio: `MISSING_AUDIO_METADATA`, no crash, `isPlaying` stays false.
- ✅ Playback failure: `AUDIO_LOAD_OR_PLAYBACK_FAILED`, component stays usable.
- ✅ C26 (XP idempotency hook) not started in this session.
- ✅ C27 (XP display in header) not started in this session.
- ✅ Surgical changes only — only C14 files modified.
- ✅ No package manifests outside `mobile/rn/package.json` modified.

## Next

- **C15: Flashcard state tracking hook** (`useFlashcardState.ts`) — tracks NEW/SEEN/PRACTICING/LEARNED per word. Can start immediately; blocked only on C14 completion (done).
- C26 (XP idempotency hook) and C27 (XP header display) are parallel C14-ready tasks.
