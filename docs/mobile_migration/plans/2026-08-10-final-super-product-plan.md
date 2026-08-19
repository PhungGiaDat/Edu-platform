# Final Super Product Plan — Complete Learning Platform

## Status
approved

## Goal
One coherent product migration and implementation plan for the children's English-learning React Native application, reconciling all existing planning artifacts into a unified execution graph.

---

## Part 1: Architecture Hierarchy

```
MASTER PRODUCT ORCHESTRATION
│
├── React Native Learner Migration (R0–R15)
│   ├── R1: App Shell + Auth + Guest Mode
│   ├── R2: Courses (catalog, detail, enrollment)
│   ├── R3: Learning Path (topic selection, daily goals)
│   ├── R4: Lesson Player Foundation
│   ├── R5: Interactive Flashcards
│   ├── R6: Educational Games (3 core + 5 bonus)
│   ├── R7: Pronunciation UX (mock adapter)
│   ├── R8: Gamification + Progress + Stickers
│   ├── R9: Pets (collection, care, unlock)
│   ├── R10: Session Management / Break Lifecycle
│   ├── R11: AI Chat — Lexi Agentic RAG (TokenRouter multi-model + RN ChatScreen) · spec: `spec/lexi-agentic-rag-spec.md` · plan: `plans/2026-08-19-lexi-agentic-rag-plan.md`
│   ├── R12: Native AR Product Integration
│   ├── R13: Android E2E
│   ├── R14: iOS E2E
│   └── R15: Learner Parity + Cutover
│
├── Mobile AR Integration (M0–M12)
│   ├── M1A: RN bridge/type contract baseline ✅ COMPLETED
│   ├── M1A-CORRECTION-FINAL ✅ COMPLETED
│   ├── M2: RN host shell ✅ COMPLETED
│   ├── M3A: Backend DTO → NativeTrackingDto → CardDescriptorRN ✅ COMPLETED
│   ├── M1B: Unity runtime conformance (BLOCKED on Unity P0)
│   ├── M3B: Native AR_READY E2E (BLOCKED on Unity P3 + BACKEND-T001)
│   └── M4–M12: Tracking UX → Multi-card → Combo → Gamification → E2E
│
├── Unity Native AR Engine (P0–P11)
│   ├── P0: Project setup + bridge foundation ✅
│   ├── P1: Single-card AR foundation (pending AC-TRACK-001)
│   ├── P3: Runtime reference-image library
│   └── P4–P11: Multi-card, combos, lifecycle, animation, gamification
│
├── Pronunciation AI / Speech Intelligence (PARALLEL WORKSTREAM)
│   ├── PRON-A0: Pipeline reconnaissance
│   ├── PRON-A1: Dataset definition
│   ├── PRON-A2: Data cleaning/labeling
│   ├── PRON-A3: Baseline model evaluation
│   ├── PRON-A4: Fine-tuning / adaptation
│   ├── PRON-A5: Offline evaluation
│   ├── PRON-A6: Score calibration
│   ├── PRON-A7: Backend inference integration
│   ├── PRON-A8: RN UX integration (overlaps R7)
│   ├── PRON-A9: Pilot evaluation
│   └── PRON-B0: Privacy decisions (DECISION_REQUIRED)
│
└── Backend / Shared Capabilities
    ├── BACKEND-T001: Native AR fields (reference_image_url, physical_width_m)
    ├── Pronunciation endpoint canonical selection (PRON-DQ-1)
    ├── Gamification XP idempotency validation
    └── Progress reporting aggregation
```

### Learner Content & Activity Expansion (LC0–LC11)

High-level architecture change: `Parent preference → LearningTopic → Course → Lesson → ordered Activities`, with data-driven Course Games/Quiz and a reusable Supabase asset/content pipeline. This is an additive expansion of R2–R6 and R10, not a second learner migration root.

- PostgreSQL reuse baseline: `courses.category_key`, `learning_paths.priority_topics`, `lessons.learning_blocks`, session/step/attempt tables, quiz tables, `mini_game_items.payload`, and `media_assets`.
- Sequence: contract/schema evolution → canonical Animals content → asset manifest/generation/upload → RN activity renderer.
- Parallel lanes: RN presentation primitives may proceed after the activity contract; Unity/native AR and Render deployment readiness remain independent.
- Detailed tasks and acceptance gates live only in `plans/2026-08-14-learner-content-activity-milestone.md`.

---

## Part 2: Current Implementation State

### Completed (Verified 2026-08-10)

| Milestone | Status | Evidence |
|-----------|--------|----------|
| M1A: RN bridge/type contract baseline | ✅ COMPLETE | 45/45 tests pass |
| M1A-CORRECTION-FINAL: Contract corrections | ✅ COMPLETE | RQ-3 CLOSED, BQ-3 CLOSED |
| M2: RN host shell | ✅ COMPLETE | 10/10 host tests pass |
| M3A: Backend DTO → NativeTrackingDto → CardDescriptorRN | ✅ COMPLETE | 82/82 combined tests pass |
| R0: Inventory + parity matrix | ✅ COMPLETE | 73 features classified |

### Blocked (Not Started — External Dependencies)

| Milestone | Blocked By | Unblock Action |
|-----------|-----------|----------------|
| M1B: Unity runtime conformance | Unity P0 (AC-BUILD-001) | Unity compiles cleanly |
| M3B: Native AR_READY E2E | Unity P3 (AC-TRACK-003) + BACKEND-T001 | Unity runtime reference-image library + backend native AR fields |

### R0–R15 RN Learner State

| Phase | Status | Notes |
|-------|--------|-------|
| R0 | ✅ COMPLETE | Inventory, parity matrix, canonical decisions |
| R1 | PARTIAL | Login exists; register + guest not wired |
| R2 | PARTIAL | CourseListScreen + CourseDetailScreen exist; filters/enrollment unwired |
| R3 | NOT STARTED | Topic selection, daily goals, onboarding |
| R4 | NOT STARTED | Lesson session engine + step renderers |
| R5 | NOT STARTED | Flashcard list, practice, tap-to-hear, state tracking |
| R6 | NOT STARTED | DragMatch, MemoryPairs, ColorLearn, bonus games |
| R7 | NOT STARTED | Pronunciation UX with mock adapter |
| R8 | PARTIAL | gamificationService exists; no UI wiring |
| R9 | PARTIAL | PetsScreen with hardcoded stats |
| R10 | NOT STARTED | Session timer, warning, break |
| R11 | IN PROGRESS | Lexi Agentic RAG — TokenRouter multi-model (Qwen planner / DeepSeek generator / Nemotron validator + fallback cascade + circuit breaker) + RN ChatScreen with model picker. Spec: `spec/lexi-agentic-rag-spec.md` · Plan: `plans/2026-08-19-lexi-agentic-rag-plan.md` |
| R12 | NOT STARTED | AR entry, capability gating |
| R13–R15 | NOT STARTED | Android/iOS E2E, cutover |

---

## Part 3: Learner Feature Coverage

### Primary Product Loop

```
Learning Path
      ↓
Course
      ↓
Lesson
      ↓
Vocabulary / Flashcard
   ↙       ↓        ↘
Audio   Games    Pronunciation
            ↓
         Reward
            ↓
      XP / Sticker / Pet
            ↓
       Progress Report
            ↓
        Next Lesson
```

### Interactive Flashcard (R5)

**Tap → Audio + Animation pipeline:**

```
Learner taps vocabulary image
    ↓
Audio: vocabulary pronunciation plays
    ↓
Animation: configurable flashcard bounce (configurable animation profile)
    ↓
State transition: NEW → SEEN (first tap)
    ↓
Optional: reward event if NEW word
```

**Flashcard states:**
- NEW: never seen
- SEEN: tapped once
- PRACTICING: pronunciation/game activity
- LEARNED: consistently correct (quiz/game/pronunciation pass)

**Audio categories:**
| Category | Owner | Source |
|----------|-------|--------|
| Vocabulary pronunciation | RN | audioUrl or TTS fallback |
| Flashcard interaction | RN | Same as vocabulary |
| Pronunciation recording | RN + Backend | User audio → Whisper |
| UI feedback | RN | Static assets |
| 3D model sounds | Unity | Model-specific files |
| AR spatial | Unity | Spatial audio engine |
| Reward celebration | RN | Static + procedural |

---

## Part 4: Educational Game Catalog

### Game States

| State | Meaning |
|-------|--------|
| CORE | Required for MVP — blocks learner cutover if missing |
| BONUS_CANDIDATE | Planned feature; does NOT block MVP |
| DEFERRED | Explicitly deferred; not in current scope |

### CORE Games (Required — R6)

| Game | Learning Objective | Interaction | Audio | Reward | Status |
|------|-------------------|-------------|-------|--------|--------|
| **DragMatch** | Word → image matching | Tap word → tap image | Pronunciation on correct | XP + GAME_COMPLETED | NOT STARTED |
| **MemoryPairs** | Image ↔ word pairs | Flip cards, match pairs | Pronunciation on match | XP + GAME_COMPLETED | NOT STARTED |
| **ColorLearn** | Color + vocabulary | Canvas coloring | Color + object audio | XP + GAME_COMPLETED | DECISION_REQUIRED (GAME-DQ-1: canvas library) |

### BONUS_CANDIDATE Games

| Game | Priority | Status | Blocks MVP? | Notes |
|------|----------|--------|------------|-------|
| **ListenChoose** | Hear → choose picture | Audio → tap image | NO | BONUS_CANDIDATE |
| **SoundMatch** | Sound → entity | Sound → tap image | NO | BONUS_CANDIDATE (needs soundUrl) |
| **QuickTap** | Word → find object | Tap correct in scene | NO | BONUS_CANDIDATE |
| **FeedThePet** | Vocabulary → pet care | Food → pet | NO | BONUS_CANDIDATE (R9 dep) |
| **FindIt** | Find requested word | Grid → tap card | NO | BONUS_CANDIDATE |

**Note:** Bonus games do NOT block R15 learner cutover. Each requires explicit product approval before entering the blocking path.

### DEFERRED

| Game | Reason |
|------|--------|
| **WordBuilder** | Letter ordering too complex for ages 4–8 |

### Game Architecture Reuse

```
VocabularyItem { word, translation, audioUrl, imageUrl, emoji }
    ↓
    ├── Flashcard (R5)
    ├── DragMatch (R6)
    ├── MemoryPairs (R6)
    ├── ColorLearn (R6)
    ├── ListenChoose (R6+)
    ├── Pronunciation (R7)
    └── AR content (R12)
```

**Shared abstractions:**
- `GameRound` — one round of gameplay
- `GameResult` — correct/incorrect/skipped
- `GameSession` — full game with multiple rounds
- `RewardEvent` — emitted on completion
- `AudioPrompt` — what audio plays when
- `ChoiceOption` — selectable options

---

## Part 5: Gamification Plan

### Reward Event Taxonomy

| Event | Trigger | XP | Idempotent |
|-------|---------|-----|------------|
| `LESSON_COMPLETED` | Lesson finish | configurable | yes (attemptId) |
| `FLASHCARD_MASTERED` | Word → LEARNED state | configurable | yes (wordId+timestamp) |
| `GAME_COMPLETED` | Game finish | configurable | yes (sessionId) |
| `PRONUNCIATION_SUCCESS` | Score = GREAT | configurable | yes (attemptId) |
| `AR_COMBO_DISCOVERED` | Combo triggered | configurable | yes (comboId+timestamp) |
| `MODEL_INTERACTION_DISCOVERED` | 3D model tap | configurable | yes (hotspotId+timestamp) |
| `STREAK_REACHED` | Daily milestone | configurable | yes (streakCount) |
| `PET_CARE_ACTION` | Feed/play | configurable | yes (actionId) |

**Note:** XP amounts are configurable/reward-calibrated values owned by the product layer. NOT hard-coded in implementation.

### XP Idempotency

**REQUIRED:** Network retry must not award XP twice.

Implementation:
```typescript
// RN gamification hook
const awardXp = async (event: RewardEvent, metadata: object) => {
  const idempotencyKey = `${event}:${metadata.hash()}:${Date.now()}`;
  await api.post('/gamification/add-xp', {
    action: event,
    metadata,
    idempotencyKey,
  });
};
```

**CRITICAL:** Unity MUST NOT persist XP directly. Unity emits semantic `MODEL_INTERACTION` / `COMBO_COMPLETE` events. RN maps events to `add-xp` calls. Backend is the persistent source of truth.

### Gamification Capabilities

| Capability | Status | Backend Endpoint |
|-----------|--------|-----------------|
| XP award | PARTIAL | POST /gamification/add-xp |
| XP display | NOT STARTED | GET /gamification/user/{id} |
| Level system | NOT STARTED | GET /gamification/user/{id} |
| Streak | EXISTING | GET /gamification/streak/{id} |
| Badges | NOT STARTED | GET /gamification/badges |
| Stickers | NOT STARTED | GET /gamification/stickers |
| Reward celebration | NOT STARTED | POST /gamification/add-xp |
| Leaderboard | NOT STARTED | GET /gamification/leaderboard |
| Level-up animation | NOT STARTED | — |

---

## Part 6: Pronunciation Architecture

### Product Experience (R7)

```
Target vocabulary
    ↓
Reference pronunciation audio (tap to hear)
    ↓
Record child speech (5s auto-stop)
    ↓
Submit score request
    ↓
Scoring pipeline:
  raw model score → calibration layer → normalized product score → feedback band
    ↓
Child-friendly feedback bands (PRON-A6 calibration REQUIRED):
  GREAT: "Perfect! 🌟"        ← raw→normalized→band mapping DECISION_REQUIRED
  GOOD TRY: "Good job! 👍"    ← raw→normalized→band mapping DECISION_REQUIRED
  TRY AGAIN: "Don't worry! 💖"
    ↓
Retry (max 3) or continue
    ↓
Progress / XP (PRONUNCIATION_SUCCESS)
```

**IMPORTANT:** Score band thresholds are **NOT approved**. Raw model scores must pass through a calibration layer (PRON-A6) before mapping to product bands. Values shown below are illustrative placeholders — DECISION_REQUIRED until PRON-A6 calibration evidence is available.

### Service Abstraction

```typescript
// PronunciationScoringAdapter interface
interface PronunciationScoringAdapter {
  score(
    vocabularyId: string,
    language: 'en',
    audioData: base64
  ): Promise<PronunciationScoreResult>;
}

// Mock adapter for RN development (R7)
class MockPronunciationScoringAdapter implements PronunciationScoringAdapter {
  async score(...): Promise<PronunciationScoreResult> {
    // NOTE: mock returns deterministic placeholder values for UX development.
    // Product band mapping is NOT calibrated — treat as DEMO_MOCKABLE.
    return {
      attemptId: uuid(),
      normalizedScore: 70 + Math.random() * 30,
      feedbackBand: this._mapToBand(70 + Math.random() * 30), // placeholder mapping
      modelVersion: 'mock-v1',
      scoringVersion: 'mock-v1',
    };
  }
  private _mapToBand(score: number): 'GREAT' | 'GOOD TRY' | 'TRY AGAIN' {
    // PLACEHOLDER — actual thresholds determined by PRON-A6 calibration
    if (score >= 80) return 'GREAT';
    if (score >= 50) return 'GOOD TRY';
    return 'TRY AGAIN';
  }
}

// Remote adapter for production (after PRON-A7)
class RemotePronunciationScoringAdapter implements PronunciationScoringAdapter {
  async score(...): Promise<PronunciationScoreResult> {
    return api.post('/pronunciation/evaluate', { ... });
  }
}
```

**RN does NOT depend on:** mHuBERT, Wav2Vec2, HuBERT, GOP internals, ONNX Runtime, hosting provider.

### Pronunciation API Contract

**Request:**
```typescript
interface PronunciationScoreRequest {
  vocabularyId: string;     // business identity of target word
  language: string;        // 'en'
  audio: base64;           // raw recording
  attemptId?: string;      // for idempotency
}
```

**Response (MINIMAL stable contract):**
```typescript
interface PronunciationScoreResult {
  attemptId: string;             // idempotency key
  normalizedScore: number;       // calibrated 0–100 (PRON-A6 calibration REQUIRED)
  feedbackBand: 'GREAT' | 'GOOD TRY' | 'TRY AGAIN';  // PRON-A6 mapping
  modelVersion: string;
  scoringVersion: string;
  // Optional fields (product layer may request):
  // - calibrationVersion?: string
  // - diagnostics?: object  // PRON-A6 output for debugging
  // - transcript?: string   // OPTIONAL: ASR output if service exposes it
  // NOTE: targetWord, feedback, feedbackEmoji, stars are PRODUCT/GAMIFICATION
  //       concerns produced by the RN layer, NOT part of the service contract.
}
```

---

## Part 7: USER_ML Pronunciation Parallel Plan

**Owner:** USER_ML (not Cursor)

This workstream proceeds independently and in parallel with RN implementation.

| Phase | Title | Deliverable | Status | Owner | Integration Gate |
|-------|-------|-------------|--------|-------|-----------------|
| PRON-A0 | Pipeline reconnaissance | Baseline WER report | PENDING | USER_ML | — |
| PRON-A1 | Dataset definition | Dataset spec (500–2000 samples) | PENDING | USER_ML | — |
| PRON-A2 | Data cleaning/labeling | Labeled dataset | PENDING | USER_ML | — |
| PRON-A3 | Baseline model eval | WER on child speech | PENDING | USER_ML | — |
| PRON-A4 | Fine-tuning / adaptation | Fine-tuned weights | PENDING | USER_ML | — |
| PRON-A5 | Offline evaluation | Model quality report | PENDING | USER_ML | — |
| PRON-A6 | Score calibration | Band thresholds config | PENDING | USER_ML | — |
| PRON-A7 | Backend inference | ONNX + FastAPI endpoint | PENDING | USER_ML + BACKEND | BACKEND owns API; USER_ML owns model/ONNX |
| PRON-A8 | RN E2E integration | Real scoring in R7 UX | PENDING | CURSOR | CURSOR integrates; USER_ML provides adapter spec |
| PRON-A9 | Pilot evaluation | Real-device study | PENDING | USER_ML | — |
| PRON-B0 | Privacy decisions | DECISION_REQUIRED | PENDING | PRODUCT + LEGAL | — |

**Ownership Clarification:**
- USER_ML owns: dataset, experiments, fine-tuning, evaluation, calibration, ONNX export, hosting
- BACKEND owns: stable pronunciation scoring API, request validation, inference-service integration
- CURSOR owns: pronunciation UX, mock adapter, recording UX, loading/error UX, child-friendly result UI, reward integration

### Model Direction

**Candidate:** Wav2Vec2 / HuBERT-family phoneme recognition + GOP scoring.

**NOT using:** Large generative audio models.

**Target problem:** known English vocabulary + short child recording.

**Training vs. Hosting are separate:**
- TRAINING: temporary/local GPU (free tier if available)
- EXPORT: ONNX → INT8 optimization
- INFERENCE: lightweight CPU service

**Hosting goal:** sustainable zero-cost CPU hosting where practical. Benchmark before deployment. Do NOT force a specific free host.

---

## Part 8: 3D Touch / Animation / Audio Plan

### Interaction Pipeline

```
Learner taps screen
    ↓
Unity: camera raycast from screen touch
    ↓
Unity: hit test against model colliders / hotspots
    ↓
Unity: resolve hotspot → interaction type
    ↓
Unity: trigger animation (if defined)
    ↓
Unity: trigger audio (model sound OR vocabulary via bridge)
    ↓
Unity: check cooldown / repeat policy
    ↓
Unity: emit MODEL_INTERACTION event to RN
    ↓
RN: map MODEL_INTERACTION → reward event
    ↓
RN: POST /gamification/add-xp (idempotent)
    ↓
RN: update pet care / progress
```

### Cat First Fixture

| Hotspot | Animation | Audio | XP |
|---------|-----------|-------|-----|
| cat_head | head_bump | vocabulary: "cat" | configurable |
| cat_body | body_rub | model_sound: "purr" | configurable |
| cat_tail | tail_swish | model_sound: "meow" | configurable |
| cat_food_target | eating | model_sound: "eating" | configurable |

### ModelInteractionDefinition Schema

```typescript
// Generic 3D model interaction definition
interface ModelInteractionHotspot {
  hotspotId: string;
  bodyPart: string;                      // model-specific label (e.g., "head", "body")
  interactionType: 'tap' | 'hold' | 'drag';
  animationTrigger: string;               // animation clip name (verified against actual model)
  audioAction: 'vocabulary' | 'model_sound' | 'reaction' | 'none';
  modelSoundKey?: string;               // for model_sound type
  vocabularyWord?: string;              // for vocabulary type
  cooldownMs: number;
  rewardEvent?: RewardEventType;         // semantic event, NOT raw XP amount
  vocabularyId?: string;                // optional link to vocabulary item

  // NOTE: rewardXp is a product/gamification layer concern.
  // Backend/config owns actual XP amounts, not this interface.
  // Example Cat mappings remain EXAMPLES, not architectural truth.
}
```

### Ownership

| Concern | Owner |
|---------|-------|
| Touch raycast | Unity |
| Hotspot resolution | Unity |
| Animation triggering | Unity |
| Model-local sound | Unity |
| Spatial audio | Unity |
| Vocabulary audio | RN (via bridge request) |
| XP persistence | RN + Backend |
| Pet state update | RN + Backend |
| Navigation | RN |

---

## Part 9: CURSOR Task Queue

**Executor:** CURSOR (React Native / mobile/rn)

> **Classification Legend:**
> - `READY_NOW` — ALL prerequisites satisfied, can begin immediately
> - `READY_AFTER_PHASE` — blocked by earlier phase completion
> - `READY_AFTER_DECISION` — blocked by explicit product decision
> - `READY_AFTER_BACKEND` — blocked by backend capability
> - `READY_AFTER_UNITY` — blocked by Unity runtime/features
> - `DEFERRED` — explicitly deferred from MVP scope

### READY_NOW (All prerequisites satisfied)

| # | Task | Files | Tests | Phase | Notes |
|---|------|-------|-------|-------|-------|
| C14 | Tap-to-hear + bounce primitive | useFlashcardAudio.ts, useBounce.ts | tap-hear.test.ts | R5 | Can implement with existing audioUrl |
| C26 | XP idempotency hook | useXpAward.ts | xp-idempotency.test.ts | R8 | gamificationService exists |
| C27 | XP display in header | HomeScreen.tsx, XPBadge.tsx | xp-display.test.ts | R8 | gamificationService exists |

### READY_AFTER_PHASE (Blocked by earlier phases)

| # | Task | Files | Phase | Blocks |
|---|------|-------|-------|--------|
| C1 | Register screen | AuthScreen.tsx | R1 | Requires auth wiring |
| C2 | Guest mode hook | useGuestMode.ts | R1 | Requires DQ-9 |
| C3 | Course filter chips | CourseListScreen.tsx | R2 | Requires R1 |
| C4 | Course enrollment wiring | CourseDetailScreen.tsx | R2 | Requires R1 |
| C5 | Resume/continue CTA | CourseDetailScreen.tsx | R2 | Requires progress API |
| C6 | Topic selection screen | LearningPathScreen.tsx | R3 | Requires R2 |
| C7 | Daily goals ring | DailyGoalRing.tsx | R3 | Requires R2 |
| C8 | Onboarding flow | OnboardingScreen.tsx | R3 | Requires R3 |
| C9 | useLessonSession hook | useLessonSession.ts | R4 | Requires R3 |
| C10 | Step renderers | Steps/*.tsx | R4 | Requires R4 |
| C11 | Reward celebration modal | RewardCelebration.tsx | R4 | Requires R4 |
| C12 | Flashcard list screen | FlashcardListScreen.tsx | R5 | Requires R4 |
| C13 | Flashcard practice screen | FlashcardPracticeScreen.tsx | R5 | Requires R5 |
| C15 | Flashcard state tracking hook | useFlashcardState.ts | R5 | Requires vocabulary API |
| C16 | DragMatch game | DragMatchGame.tsx | R6 | Requires R5 vocabulary |
| C17 | MemoryPairs game | MemoryPairsGame.tsx | R6 | Requires R5 vocabulary |
| C18 | ColorLearn game | ColorLearnGame.tsx | R6 | Requires GAME-DQ-1 |
| C19 | ListenChoose game | ListenChooseGame.tsx | R6+ | BONUS |
| C20 | Recording screen + mock adapter | PronunciationScreen.tsx | R7 | READY_AFTER_BACKEND: needs mock adapter contract |
| C21 | Score band display | PronunciationScoreDisplay.tsx | R7 | READY_AFTER_BACKEND: needs band config |
| C22 | Transcription display | PronunciationTranscript.tsx | R7 | READY_AFTER_BACKEND |
| C23 | Retry flow | usePronunciationRetry.ts | R7 | READY_AFTER_BACKEND |
| C24 | Badge/sticker screens | BadgeScreen.tsx | R8 | Requires R8 wire |
| C25 | Leaderboard component | Leaderboard.tsx | R8 | Requires backend endpoint |
| C28 | Pet collection wiring | PetsScreen.tsx | R9 | Requires R1 auth |
| C29 | Pet detail + care | PetDetailSheet.tsx | R9 | Requires R9 |
| C30 | Pet unlock modal | PetUnlockModal.tsx | R9 | Requires R9 |
| C31 | Pet reward toast | PetRewardToast.tsx | R9 | Requires R9 |
| C32 | Session timer hook | useSessionTimer.ts | R10 | Requires DQ-10 constants |
| C33 | Warning modal | SessionWarningModal.tsx | R10 | Requires DQ-10 |
| C34 | Hard limit modal | SessionLimitModal.tsx | R10 | Requires DQ-10 |
| C35 | Break cooldown screen | BreakCooldownScreen.tsx | R10 | Requires R10 |

### READY_AFTER_DECISION (Blocked by explicit DQ)

| # | Task | Blocks on |
|---|------|-----------|
| C2 | Guest mode hook | DQ-9: Guest mode scope |
| C18 | ColorLearn canvas | GAME-DQ-1: Canvas library |
| C32-C35 | Session management | DQ-10: Session constants |

### READY_AFTER_UNITY (Blocked by Unity runtime)

| # | Task | Blocks on |
|---|------|-----------|
| AR touch | R12: AR entry | Unity P3 runtime image library |

### DEFERRED (Explicitly deferred from MVP)

| # | Task | Reason |
|---|------|--------|
| AI Chat | R11 | DQ-7 not resolved |
| FeedThePet | Bonus | Requires R9 pet system + 3D model |
| Full AR | R12 | BLOCKED on Unity P3 |

### NOT in Cursor Queue (Owned by Others)

| Task | Owner | Reason |
|------|-------|--------|
| ML fine-tuning (PRON-A4) | USER_ML | Not Cursor domain |
| ONNX export (PRON-A8) | USER_ML | Not Cursor domain |
| Model hosting (PRON-A10) | USER_ML | Not Cursor domain |
| Unity hotspot component | UNITY | Unity implementation |
| Unity raycast system | UNITY | Unity implementation |
| Unity animation triggers | UNITY | Unity implementation |
| Unity MODEL_INTERACTION event | UNITY | Unity implementation |
| BACKEND-T001 native AR fields | BACKEND | Backend implementation |
| Pronunciation endpoint canonical | BACKEND | Backend decision |

---

## Part 10: USER_ML Queue (Informational)

**Owner:** USER_ML (parallel, not Cursor's queue)

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| ML1 | PRON-A0: Pipeline reconnaissance | WER baseline report | PENDING |
| ML2 | PRON-A1: Dataset definition | Dataset spec document | PENDING |
| ML3 | PRON-A2: Data cleaning/labeling | Labeled dataset (500–2000 samples) | PENDING |
| ML4 | PRON-A3: Baseline model evaluation | WER on child speech | PENDING |
| ML5 | PRON-A4: Fine-tuning / adaptation | Fine-tuned model weights | PENDING |
| ML6 | PRON-A5: Offline evaluation | Evaluation report | PENDING |
| ML7 | PRON-A6: Score calibration | Band thresholds config | PENDING |
| ML8 | PRON-A7: Backend inference | ONNX + FastAPI scoring endpoint | PENDING |
| ML9 | PRON-A8: RN E2E | Replace mock with real adapter | PENDING |
| ML10 | PRON-A9: Pilot evaluation | Real-device pilot report | PENDING |
| ML11 | PRON-B0: Privacy decisions | DECISION_REQUIRED resolved | PENDING |

---

## Part 11: UNITY Queue

**Owner:** UNITY

### Task Classification

| # | Task | Classification | Prerequisite | Notes |
|---|------|---------------|-------------|-------|
| U1 | Generic ModelInteractionHotspot MonoBehaviour | READY_AFTER_UNITY | Unity P0 (P0 ✅ COMPLETE) | Generic 3D interaction — can implement in non-AR scene |
| U2 | Touch raycast against registered hotspots | READY_AFTER_UNITY | U1 | Generic raycast — non-AR scene |
| U3 | Hotspot → animation mapping | READY_AFTER_UNITY | U2 | Generic animation system |
| U4 | Hotspot → audio mapping | READY_AFTER_UNITY | U3 | Generic audio system |
| U5 | Typed MODEL_INTERACTION event (bridge) | READY_AFTER_UNITY | U4 | Bridge integration |
| U6 | Cat interaction fixture | READY_AFTER_UNITY | U5 | 3D model in non-AR scene |
| U7 | Animation/audio cooldown verification | READY_AFTER_UNITY | U6 | Can test in non-AR scene |
| U8 | Multi-card AR tracking | READY_AFTER_PHASE | Unity P4 | AR runtime required |
| U9 | Combo proximity + dwell | READY_AFTER_PHASE | Unity P5 | AR runtime required |
| U10 | Gamification bridge (P8) | READY_AFTER_PHASE | Unity P5 | AR runtime required |

**Note:** U1–U7 are generic 3D interaction infrastructure. They CAN be implemented and tested in a non-AR test scene (e.g., Cat fixture in a test scene) once Unity P0 build baseline is available. U8–U10 require full AR runtime (P4/P5 gates).

### Current Unity Status

| Milestone | Status |
|-----------|--------|
| P0: Project setup + bridge foundation | ✅ COMPLETE |
| P1: Single-card AR foundation | PENDING (AC-TRACK-001) |
| P3: Runtime reference-image library | PENDING |
| P4–P11 | Future |

---

## Part 12: BACKEND/SHARED Queue

**Owner:** BACKEND

| # | Task | Blocks | Status |
|---|------|--------|--------|
| B1 | BACKEND-T001: Native AR fields (reference_image_url, physical_width_m) | M3B | PENDING |
| B2 | Pronunciation endpoint canonical (PRON-DQ-1) | R7 | PENDING |
| B3 | Gamification XP idempotency validation | R8 | PENDING |
| B4 | Vocabulary progress persistence (NEW/SEEN/PRACTICING/LEARNED) | R5 | PENDING |
| B5 | Model/scoring version in response | R7 | PENDING |

---

## Part 13: Demo-Critical Path

### Demo Story

```
1. Learner selects "Animals" topic
     → R3 (Learning Path)
2. Opens "Animals Course" → sees lesson cards with progress
     → R2 (Course catalog + detail)
3. Starts lesson → animated interactive flashcard shown
4. Taps card → hears "elephant!" pronunciation + bounce animation
     → R5 (Flashcard tap-to-hear)
5. Plays DragMatch game with 5 vocabulary words
     → R6 (DragMatch game)
6. Practices pronunciation "elephant" → receives AI feedback
     → R7 (Pronunciation — mock adapter)
7. Earns XP → XP toast + sticker collected
     → R8 (Gamification + stickers)
8. Sees pet updated / progress ring filled
     → R9 (Pets, partial)
9. Optional: taps "Practice in AR" → Unity AR opens
     → R12 (Native AR) — BLOCKED on Unity P3 gates
```

### Demo Priority

| Priority | Features | Phase | Status | Label |
|----------|---------|-------|--------|-------|
| **Phase 1** | R1 + R2 (login, catalog, detail) | R1+R2 | IMPLEMENTED | IMPLEMENTED |
| **Phase 1** | R5 (flashcard tap-to-hear) | R5 | NOT STARTED | PLANNED |
| **Phase 1** | R6 (DragMatch game) | R6 | NOT STARTED | PLANNED |
| **Phase 1** | R8 (gamification XP/sticker display) | R8 | NOT STARTED | PLANNED |
| **Phase 2** | R7 (pronunciation with mock adapter) | R7 | NOT STARTED | DEMO_MOCKABLE |
| **Phase 2** | R3 (learning path topic selection) | R3 | NOT STARTED | PLANNED |
| **Phase 3** | R12 (AR touch interaction) | R12 | BLOCKED | BLOCKED (Unity P3) |

### Implementation Status Labels

| Label | Meaning |
|-------|---------|
| IMPLEMENTED | Already exists in codebase (verified) |
| PLANNED | Documented in spec; not yet started |
| BLOCKED | Waiting on external dependency |
| DEMO_MOCKABLE | Can be demonstrated with mock data (pronunciation = mock, NOT real AI) |

---

## Part 14: Remaining Decisions

### DECISION_REQUIRED (Unresolved)

| ID | Question | Blocks | Owner |
|----|----------|--------|-------|
| DQ-2 | Lesson player canonical | R4 | Product/Architect |
| DQ-3 | Pronunciation endpoint selection | R7 | Backend |
| DQ-4 | Flashcard systems | R5 | Product |
| DQ-5 | Mini-games per-game | R6 | Product |
| DQ-6 | Pet 3D viewer strategy | R9 | Product/Architect |
| DQ-7 | AI Chat inclusion | R11 | Product |
| DQ-8 | Cutover trigger | R15 | Product |
| DQ-9 | Guest mode scope | R1 | Product |
| DQ-10 | Session constants | R10 | Product |
| PRON-DQ-1 | Pronunciation endpoint canonical | PRON-A7 | Backend |
| PRON-DQ-2 | Child audio data policy | PRON-B0 | Product/Legal |
| PRON-DQ-3 | Score band thresholds | R7 | Product |
| GAME-DQ-1 | Canvas library for ColorLearn | GAME-3 | Architect |
| GAME-DQ-2 | Sound assets for SoundMatch | GAME-5 | Content |
| GAME-DQ-3 | Game difficulty auto-adjust | All games | Product |
| MQ-1 | Multi-card replace vs parallel | M6 | Unity |
| MQ-3 | XP persistence timing | M7 | Product |
| MQ-6 | AR capability detection | M4 | Unity/Mobile |
| MQ-7 | Combo identity (arTag vs qrId) | M6 | Unity |
| RQ-4 | onImageTrackingLost.reason | M9 | Unity |
| BQ-1 | AR objects migration | M3B | Backend |
| BQ-2 | Reference image source | M3B | Content |
| 3D-DQ-1 | Food proximity hysteresis | GAME-8 | Product/UX |
| 3D-DQ-2 | Hold interaction duration | 3DINT | Unity |
| 3D-DQ-3 | Drag interaction for food | GAME-8 | Unity |

### CLOSED Decisions

| ID | Resolution |
|----|------------|
| DQ-1 | `AnimalsAdventure` is canonical; `AnimalsCourse` remains legacy. See `progress/2026-08-14-dq1-course-enrollment-reconciliation.md`. |
| RQ-3 | `arTag` NOT on CardDescriptorRN. Unity MultiCardRegistry is the lookup mechanism. |
| BQ-3 | NO default `physical_width_m`. Mapper returns `unavailable` when missing. |

---

## Part 15: Final Cutover Requirements

### Release Readiness Graph (PARALLEL)

```
RN Learner Work ───────────────────────────────────────┐
                                                     │
Pronunciation RN UX ──────────────────────────┐       │
                                              │       │
USER_ML workstream ───────────────────────────┴──→ Pronunciation Real-E2E Gate ──┤
                                                                                 │
Unity/Mobile AR readiness ───────────────────────────────────────────────────┤
                                                                                 │
Android E2E ───────────────────────────────────────────────────────────────────┤
                                                                                 ▼
                                                              PRODUCT CUTOVER GATE

IF pronunciation is CORE/MVP scope → real pronunciation readiness required before cutover
IF pronunciation is explicitly deferred → cutover may proceed without it
```

### RN Learner Cutover (R15)

### RN Learner Cutover (R15)

- All KEEP + ADAPT parity items implemented and verified
- All WEB_ONLY / DEFER items documented
- All DECISION_REQUIRED items resolved (or explicitly deferred with owner)
- Product owner signs off on parity checklist

### AR Cutover (M12)

- All KEEP + ADAPT AR features implemented
- All AC-* acceptance gates passed (Android + iOS)
- Product owner approves Unity AR as default
- MindAR retained behind feature flag

### Pronunciation Cutover (PRON-A9)

> **NOTE:** Pronunciation is a PARALLEL workstream. Its readiness is parallel to learner work, NOT sequential after R15.

- Pilot criteria met (>90% task completion, >60% GOOD TRY/GREAT, <5% false reject)
- Privacy policy resolved (PRON-B0) — **DECISION_REQUIRED**
- Model deployed and benchmarked
- Calibrated thresholds from PRON-A6 applied

**Privacy:** Child audio inference is architecturally separate from training-data collection. Default: record → inference → result → discard raw audio. Retention/consent policy is PRON-B0 — DECISION_REQUIRED.

---

## Part 16: Document Authority

| Concern | Authority Document |
|---------|-------------------|
| Learner product | `docs/mobile_migration/spec/learner-product-spec.md` |
| Learner parity | `docs/mobile_migration/spec/learner-parity-matrix.md` |
| Flashcards | `docs/mobile_migration/spec/flashcard-expansion.md` |
| Games | `docs/mobile_migration/spec/game-catalog.md` |
| 3D interaction | `docs/mobile_migration/spec/interactive-3d-model-spec.md` |
| Pronunciation spec | `docs/mobile_migration/spec/pronunciation-ai-spec.md` |
| Pronunciation ML | `docs/mobile_migration/plans/pronunciation-ai-ml-plan.md` |
| Unity/AR | `docs/unity_ar/spec/mobile-ar-product-spec.md` |
| Bridge contract | `docs/unity_ar/spec/bridge-contract.md` |
| Orchestration | `docs/unity_ar/plans/2026-08-09-master-orchestration-plan.md` |

---

## Plan Status / Executability

**Status:** approved (with surgical corrections applied 2026-08-10)

### Execution Gates

| Workstream | Can Begin | Prerequisites |
|------------|-----------|----------------|
| Cursor READY_NOW tasks | YES | None (C14, C26, C27) |
| Cursor R1–R5 phases | YES | Auth wiring exists |
| Cursor pronunciation mock UX | YES | Mock adapter contract |
| USER_ML PRON-A0 | YES | None |
| Unity U1–U7 (non-AR 3D infra) | YES | Unity P0 baseline |
| Unity U8–U10 (AR runtime) | NO | P4/P5 gates |
| Backend BACKEND-T001 | YES | None |
| Backend pronunciation API | NO | PRON-A7 readiness |

### Deferred Decisions Blocking Execution

| Decision | Blocks | Must Resolve By |
|----------|--------|-----------------|
| DQ-9: Guest mode scope | C2 | Before R1 complete |
| DQ-10: Session constants | C32–C35 | Before R10 |
| GAME-DQ-1: Canvas library | C18 | Before ColorLearn |
| PRON-B0: Privacy policy | PRON-A9 | Before pronunciation cutover |

---

## Related Files

- `docs/mobile_migration/spec/000-index.md` — spec index
- `docs/mobile_migration/spec/learner-product-spec.md` — 69 MOB-*-REQ requirements
- `docs/mobile_migration/spec/learner-parity-matrix.md` — 73 feature decisions
- `docs/mobile_migration/spec/flashcard-expansion.md` — tap-to-hear + state tracking
- `docs/mobile_migration/spec/game-catalog.md` — 9 games (3 core, 5 bonus, 1 deferred)
- `docs/mobile_migration/spec/interactive-3d-model-spec.md` — 3D touch pipeline
- `docs/mobile_migration/spec/pronunciation-ai-spec.md` — pronunciation product spec
- `docs/mobile_migration/plans/pronunciation-ai-ml-plan.md` — ML workstream (PRON-A0–A9)
- `docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md` — R0–R15 phases
- `docs/mobile_migration/plans/2026-08-14-learner-content-activity-milestone.md` — LC0–LC11 detailed learner content/activity implementation sequence
- `docs/unity_ar/plans/2026-08-09-master-orchestration-plan.md` — cross-system orchestration
- `docs/unity_ar/progress/2026-08-10-m3a-rn-native-tracking-dto.md` — latest AR progress
- `docs/unity_ar/progress/2026-08-10-super-product-planning-pass.md` — prior planning pass
