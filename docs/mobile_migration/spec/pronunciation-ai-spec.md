# Pronunciation AI — Product Specification

## Status
draft

## Goal
Lock in the product behavior, ownership, and verification method for the pronunciation AI feature. This is a product specification; ML training details live in `plans/pronunciation-ai-ml-plan.md`.

## Relationship to Other Artifacts

| Document | Role |
|---------|------|
| `spec/learner-product-spec.md` | Core RN learner product requirements |
| `plans/pronunciation-ai-ml-plan.md` | ML training/fine-tuning/inference plan |
| `spec/learner-parity-matrix.md` | Feature parity decisions |
| `plans/2026-08-09-learner-migration-plan.md` | Phase R7 mapping |
| `backend/api/pronunciation.py` | Backend endpoint (canonical — DQ-3 resolves shadow) |
| `backend/api/pronunciation_enhanced.py` | Shadowed endpoint — DQ-3 selects canonical |
| `backend/services/pronunciation_evaluator.py` | ML scoring engine |
| `backend/services/speech_processing_service.py` | Whisper-based STT |
| `backend/services/tts_service.py` | TTS for vocabulary audio |
| `plan/20260627_ai_pronunciation_evaluation_system.md` | Legacy reference — carry decisions forward |

---

## A. Recording UX

### MOB-PRON-REQ-001 — Recording Screen
**Product behavior**: Show target word + audio play button + microphone button. Tap mic → request microphone permission → start recording → auto-stop after 5 seconds → send for scoring → show result.
**Ownership**: React Native (R7).
**Backend dependency**: `POST /pronunciation/evaluate` (DQ-3 selects canonical endpoint).
**Verification**: tap mic → permission prompt → recording → transcript → score → retry works.
**Status**: not started (R7).

### MOB-PRON-REQ-002 — Audio Play
**Product behavior**: Tap audio icon → play vocabulary pronunciation (prerecorded or TTS). Uses `AudioPlayer` API. Visual waveform indicator during playback.
**Ownership**: React Native (R5+R7).
**Backend dependency**: audio URL from lesson/flashcard response + `POST /pronunciation/tts` for TTS fallback.
**Verification**: tap audio → sound plays; replay works.
**Status**: flashcard audio in AR overlay (R5); general practice R7.

### MOB-PRON-REQ-003 — Permission Denial Fallback
**Product behavior**: If microphone denied → show message "Microphone access needed for pronunciation practice" with "Skip" button. Skip does NOT award XP for that step.
**Ownership**: React Native (R7).
**Backend dependency**: none.
**Verification**: deny mic → fallback shown; skip advances.
**Status**: not started (R7).

### MOB-PRON-REQ-004 — Retry Flow
**Product behavior**: After any score result → show "Try Again" button. Retry resets to recording state. Max 3 retries per word.
**Ownership**: React Native (R7).
**Backend dependency**: `POST /pronunciation/evaluate` (idempotent per attempt).
**Verification**: retry → new recording prompt; score changes.
**Status**: not started (R7).

### MOB-PRON-REQ-005 — Child-Friendly Score Band Mapping
**Product behavior**: Raw model confidence/score is mapped to child-friendly bands before display:
- **GREAT**: "Perfect! 🌟" / "Amazing! 🎉" / "You said it exactly right! ⭐"
- **GOOD TRY**: "Good job! 👍" / "Almost there! 💪" / "Keep practicing! 🌈"
- **TRY AGAIN**: "Don't worry! 💖" / "Practice makes perfect! 🎈" / "Let's try together! 🤗"

Score band thresholds are **derived from calibration evidence**, stored as configuration. Backend returns raw score 0–100; RN maps to bands using calibrated thresholds from P-FT-5. Thresholds MUST NOT be hard-coded guesses — they are set by the P-FT-5 calibration workstream based on evaluation evidence.
**Ownership**: React Native (R7) + ML Backend (P-FT-5 calibration).
**Verification**: say "cat" → GREAT; say "cta" → GOOD TRY or TRY AGAIN depending on calibrated threshold.
**Status**: not started (R7). Threshold configuration: gated by P-FT-5.

### MOB-PRON-REQ-006 — Score Calibration Thresholds
**Product behavior**: Score band boundaries (GREAT ≥ X, GOOD TRY ≥ Y, else TRY AGAIN) are stored as configuration. Thresholds are initialized from P-FT-5 calibration evidence and are product-adjustable without code change. Values MUST NOT be hard-coded as fixed numbers such as 80/50 — they are evidence-driven.
**Ownership**: React Native (R7) + Backend config (P-FT-5 calibrated values).
**Verification**: threshold change → band labels change without rebuild.
**Status**: not started (R7). P-FT-5 gates calibration; PRON-DQ-3 retired.

---

## B. Scoring Flow

### MOB-PRON-REQ-010 — Scoring Pipeline
**Product behavior**:
1. User records audio
2. Audio sent to `POST /pronunciation/evaluate` (base64 or multipart)
3. Backend: Whisper STT → transcription
4. Backend: `PronunciationEvaluator.evaluate_from_audio()` → score 0–100 + grade + phoneme analysis
5. Backend: `FeedbackService` → kid-friendly message
6. RN receives: `{ score, grade, stars, transcription, feedback, feedback_emoji, phoneme_analysis }`
7. RN maps score → child-friendly band (GREAT/GOOD TRY/TRY AGAIN)
8. Display: band label + emoji + message + stars
**Ownership**: Backend (ML inference) + React Native (UX + band mapping).
**Backend dependency**: `POST /pronunciation/evaluate` (DQ-3), `POST /pronunciation/transcribe` (Whisper).
**Verification**: complete flow → correct band displayed; retry works.
**Status**: backend endpoints exist; RN integration not started (R7).

### MOB-PRON-REQ-011 — Transcription Display
**Product behavior**: Show what the child said ("You said: cat") alongside the target ("Try to say: cat").
**Ownership**: React Native (R7).
**Backend dependency**: `transcription` field from `EvaluationResponse`.
**Verification**: transcript shown next to target word.
**Status**: not started (R7).

---

## C. Audio System Architecture

Audio categories must be distinguished — they are NOT the same system:

| Category | Owner | Source | Example |
|----------|-------|--------|---------|
| **Vocabulary pronunciation** | RN | `audioUrl` from lesson/flashcard response; TTS fallback via `POST /pronunciation/tts` | Tap card → hear "cat" |
| **Flashcard interaction audio** | RN | Same as vocabulary audio | Tap flashcard → pronunciation |
| **Pronunciation recording/playback** | RN + Backend | User recording + Whisper | Child speaks; hear their recording |
| **Pronunciation feedback** | Backend | Template or Gemini | "Great job!" |
| **UI feedback sounds** | RN | Static assets | Button taps, card flips |
| **3D model interaction sounds** | Unity | Model-specific audio files | Animal sounds, combo FX |
| **AR spatial audio** | Unity | Spatial audio engine | Distance-based volume |
| **Reward celebration** | RN | Static + procedural | Confetti sound, level-up fanfare |

RN owns vocabulary audio, UI feedback, and reward celebration.
Unity owns model-local and spatial audio.
Backend owns feedback audio generation and TTS synthesis.

### MOB-AUDIO-REQ-001 — Vocabulary Audio
**Product behavior**: Fetch `audioUrl` from lesson/flashcard response. If absent, call `POST /pronunciation/tts` for TTS synthesis. Cache TTS results. Play via `AudioPlayer`.
**Ownership**: React Native (R5+R7).
**Verification**: card without pre-recorded audio → TTS generated and played.

### MOB-AUDIO-REQ-002 — Recording Pipeline
**Product behavior**: `expo-av` or equivalent for recording. Encode as base64 or multipart. Send to backend `POST /pronunciation/evaluate`.
**Ownership**: React Native (R7).
**Verification**: recording → upload → score returned.

### MOB-AUDIO-REQ-003 — Model Interaction Audio (Unity)
**Product behavior**: Unity plays model-specific audio (animal sounds, combo sounds) via `AudioSource` on model. Spatial audio via Unity audio engine.
**Ownership**: Unity (separate lane).
**Verification**: tap animal model → correct sound plays from model position.

### MOB-AUDIO-REQ-004 — Reward Audio
**Product behavior**: Play celebration sound on XP award, level-up, sticker earned. RN audio assets.
**Ownership**: React Native (R8).
**Verification**: earn sticker → celebration sound plays.

---

## D. Privacy Boundary

**DECISION_REQUIRED (PRON-DQ-2) — Child Audio Data Policy**

Because the application serves children, explicit decisions are required for audio data:

| Concern | Options | Decision Required |
|---------|---------|-----------------|
| Recording retention | Do not store raw recordings / Store temporarily for retry / Store for model training | PRON-DQ-2 |
| Parental consent for recordings | Not required / Consent required before any recording / Consent required for training data | PRON-DQ-2 |
| Training data eligibility | No recordings used for training / Only with explicit parental consent / All recordings eligible | PRON-DQ-2 |
| Deletion policy | Delete after scoring / Delete after 30 days / Retain indefinitely | PRON-DQ-2 |
| Access controls | Authenticated user + parent only / Authenticated user only / Backend admin only | PRON-DQ-2 |

**Implementation constraint**: Do NOT automatically route every pronunciation recording to model training. Mark `PRON-DQ-2 = DECISION_REQUIRED` until policy is defined.

Interim implementation: raw recordings are processed in-memory by Whisper and discarded immediately. Only transcription text and score are persisted (no audio blob stored in MongoDB `pronunciation_attempts`).

---

## E. Backend Endpoint Selection

**DECISION_REQUIRED (PRON-DQ-1) — Canonical `/pronunciation/evaluate` endpoint**

Two implementations exist:
1. `backend/api/pronunciation.py` — primary (`EvaluationRequest` with base64 audio, returns `EvaluationResponse` with full phoneme analysis)
2. `backend/api/pronunciation_enhanced.py` — shadowed (`pronunciation_evaluate_request` with multipart Form, simpler response)

Both use the same underlying `SpeechProcessingService` and `PronunciationEvaluator`.

**Recommendation**: `pronunciation.py` is canonical (full response model, consistent with other endpoints, Pydantic models defined). `pronunciation_enhanced.py` should be deprecated.

Until DQ-3 resolves: RN uses the multipart endpoint (matches existing web behavior), backend migrates to canonical single endpoint.

---

## F. Requirements Summary

| ID | Requirement | Phase | Status |
|----|-------------|-------|--------|
| MOB-PRON-REQ-001 | Recording screen | R7 | not started |
| MOB-PRON-REQ-002 | Audio play | R5+R7 | partial |
| MOB-PRON-REQ-003 | Permission denial fallback | R7 | not started |
| MOB-PRON-REQ-004 | Retry flow | R7 | not started |
| MOB-PRON-REQ-005 | Child-friendly score band mapping | R7 | not started |
| MOB-PRON-REQ-006 | Score calibration thresholds (config) | R7 | not started |
| MOB-PRON-REQ-010 | Scoring pipeline | R7 | backend exists; RN not started |
| MOB-PRON-REQ-011 | Transcription display | R7 | not started |
| MOB-AUDIO-REQ-001 | Vocabulary audio | R5+R7 | partial |
| MOB-AUDIO-REQ-002 | Recording pipeline | R7 | not started |
| MOB-AUDIO-REQ-003 | Model interaction audio (Unity) | Unity lane | separate |
| MOB-AUDIO-REQ-004 | Reward audio | R8 | not started |

---

## Open Decisions

| # | Decision | Blocks | Owner |
|---|----------|--------|-------|
| PRON-DQ-1 | Canonical `/pronunciation/evaluate` endpoint (pronunciation.py vs pronunciation_enhanced.py) | R7 | Backend / Architect |
| PRON-DQ-2 | Child audio data policy (consent, retention, training eligibility) | R7 | Product / Legal |
| ~~PRON-DQ-3~~ | ~~Score band thresholds as config vs hardcoded (default GREAT ≥ 80, GOOD TRY ≥ 50)~~ | ~~Retired~~ | Thresholds are now driven by P-FT-5 calibration evidence; PRON-DQ-3 is closed. |
