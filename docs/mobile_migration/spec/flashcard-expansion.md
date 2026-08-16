# Flashcard Expansion — Interactive Tap-to-Hear + Visual Feedback

## Status
draft

## Goal
Expand the flashcard specification with tap-to-hear pronunciation, visual interaction feedback, and explicit flashcard state tracking.

---

## A. Tap-to-Hear Audio

### MOB-FLASH-REQ-005 — Tap Image → Pronunciation Audio
**Product behavior**: Tap the vocabulary image on a flashcard → play the target-word pronunciation audio. Visual feedback follows audio playback.
**Interaction flow**:
1. Learner sees flashcard (word + image)
2. Learner taps image
3. Vocabulary audio plays (prerecorded `audioUrl` from lesson/flashcard response, or TTS fallback)
4. Visual feedback animates simultaneously with audio
5. Optional: reward event if word was NEW → becomes SEEN
**Ownership**: React Native (R5).
**Backend dependency**: `audioUrl` from `GET /api/v1/flashcard/{qr_id}` or `GET /api/v1/courses/{id}/lessons/{id}`.
**Audio source**: `POST /api/v1/pronunciation/tts` as TTS fallback if no pre-recorded audio.
**Verification**: tap image → sound plays; tap again → safe (cooldown prevents double-play).
**Status**: not started (R5).

### MOB-FLASH-REQ-006 — Visual Interaction Feedback
**Product behavior**: When the learner taps the image, a light animation plays. The animation is: scale bounce (1.0 → 1.1 → 1.0 over 300ms).
**Animation types**:
- **Bounce** (default): scale 1.0 → 1.1 → 1.0, 300ms ease-out
- **Wiggle**: rotation -5° → 5° → 0°, 400ms
- **Blink**: opacity 1.0 → 0.7 → 1.0, 200ms
- **Short animation**: model-specific (e.g., animal blinks)

A **reusable interaction primitive** handles this — not per-card animation code.
**Ownership**: React Native (R5).
**Implementation**: `useFlashcardInteraction` hook with animation config per flashcard type.
**Verification**: tap → bounce visible; tap again after cooldown → animation replays.

### MOB-FLASH-REQ-007 — Flashcard State Tracking
**Product behavior**: Each vocabulary word has an explicit learning state:
- **NEW**: never seen; audio plays; marked SEEN on first tap
- **SEEN**: audio plays; visual feedback; can transition to PRACTICING on review
- **PRACTICING**: in active review; pronunciation and game content targets this word
- **LEARNED**: consistently answered correctly (e.g., 3 correct pronunciations or game matches); shown in progress

States are stored in backend (reuse existing progress endpoints) or client-side for offline.

**Backend dependency**: `GET /api/v1/users/{id}/progress` already tracks lesson/quiz completion. Add vocabulary-level state to the progress model or use a separate `vocabulary_progress` collection.
**Verification**: NEW word tapped → becomes SEEN; practice → PRACTICING; quiz pass → LEARNED.
**Status**: not started (R5). Backend schema may need extension.

---

## B. Flashcard Audio Architecture

### Audio Source Priority

| Priority | Source | When Used |
|----------|--------|-----------|
| 1 | Pre-recorded `audioUrl` | Available from lesson/flashcard response |
| 2 | TTS via `POST /pronunciation/tts` | No pre-recorded audio; cache result |
| 3 | Native TTS | Offline fallback |

### Audio Caching

- Check local cache for TTS result (key: `tts:{text}:{language}`)
- If cached: play from cache immediately
- If not cached: call TTS → cache result → play
- Cache stored via AsyncStorage or file system

### Audio Player API

```typescript
// hooks/useFlashcardAudio.ts
interface FlashcardAudio {
  playVocabulary: (word: string, audioUrl?: string) => Promise<void>;
  playTts: (text: string, language: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
}
```

---

## C. Flashcard in Learning Loop

Flashcard states map to lesson progression:

```
Lesson vocabulary list
  → Each word starts NEW
  → Tap flashcard (tap-to-hear) → SEEN
  → Pronunciation practice → PRACTICING
  → Quiz correct → LEARNED
  → AR 3D interaction → LEARNED + XP
```

---

## D. Flashcard vs. AR Card Distinction

| Aspect | Flashcard (R5) | AR Card (R12) |
|--------|----------------|----------------|
| Rendering | 2D card UI | Unity 3D model over camera |
| Interaction | Tap image → audio | Tap model → hotspot → animation + audio |
| State | NEW/SEEN/PRACTICING/LEARNED | Same + AR interaction tracking |
| Audio | RN plays vocabulary audio | Unity plays model sound OR RN plays vocabulary via bridge |
| Progress | Backend vocabulary_progress | Backend AR interaction events |

The flashcard tap-to-hear and AR model interaction are **different interaction modes** for the same vocabulary item.

---

## E. Requirements Summary

| ID | Requirement | Phase | Status |
|----|-------------|-------|--------|
| MOB-FLASH-REQ-005 | Tap image → pronunciation audio | R5 | not started |
| MOB-FLASH-REQ-006 | Visual interaction feedback (bounce/wiggle) | R5 | not started |
| MOB-FLASH-REQ-007 | Flashcard state tracking (NEW/SEEN/PRACTICING/LEARNED) | R5 | not started |
