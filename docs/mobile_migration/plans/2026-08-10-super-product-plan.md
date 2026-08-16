# Super Product Plan — Complete Learning Platform Migration

## Status
draft

## Goal
Consolidate all planning artifacts into ONE coherent planning graph covering: React Native learner migration (R0–R15), Pronunciation AI ML workstream (PRON-A0 to PRON-A9), Mobile AR integration (M0–M12), Unity AR Engine (P0–P11), and Backend Capabilities. This plan preserves completed work, reconciles all existing specs, and defines the execution lanes for Cursor, Unity, and ML/Backend.

## Relationship to Other Artifacts

| Document | Role |
|---------|------|
| `spec/learner-product-spec.md` | Core RN learner product requirements (69 MOB-*-REQ) |
| `spec/learner-parity-matrix.md` | Web → RN feature parity decisions |
| `spec/flashcard-expansion.md` | Flashcard tap-to-hear + visual feedback + state tracking |
| `spec/game-catalog.md` | Educational mini-game catalog (core + bonus) |
| `spec/interactive-3d-model-spec.md` | Native 3D model touch interaction |
| `spec/pronunciation-ai-spec.md` | Pronunciation AI product specification |
| `plans/pronunciation-ai-ml-plan.md` | ML workstream for pronunciation scoring |
| `plans/2026-08-09-learner-migration-plan.md` | React Native R0–R15 phase plan |
| `plans/2026-08-09-mobile-ar-migration-plan.md` | Mobile AR M0–M12 phase plan |
| `plans/2026-08-09-unity-ar-migration-plan.md` | Unity Engine P0–P11 phase plan |
| `plans/2026-08-09-master-orchestration-plan.md` | Cross-system orchestration |
| `docs/unity_ar/spec/bridge-contract.md` | RN ↔ Unity bridge contract (frozen) |
| `docs/unity_ar/spec/mobile-ar-product-spec.md` | AR product behavior (RN mobile side) |

---

## Part 1: Current Implementation State

### React Native Learner (docs/mobile_migration/)

**Completed:**
- R0: Inventory, parity matrix, canonical decisions ✅
- R1: App shell + auth + guest mode (partial: login exists, register not wired)
- R2: Course catalog + detail (partial: screens exist, filters/enrollment unwired)

**Existing RN infrastructure:**
- `AuthScreen.tsx` (login-only)
- `CourseListScreen.tsx`, `CourseDetailScreen.tsx`
- `LessonPlayerScreen.tsx` (stub)
- `PetsScreen.tsx` (hardcoded stats)
- `ProfileScreen.tsx` (partial)
- `ARScreen.tsx` (with M1A/M2/M3A completed)
- Hooks: `useAuth`, `useCourses`, `useCourseDetail`, `useGamification`, `usePets`, `useUser`
- Services: `api.ts`, `courseService.ts`, `gamificationService.ts`, `petService.ts`

### Mobile AR (docs/unity_ar/progress/)

**Completed:**
- M1A: RN bridge/type contract baseline ✅
- M1A-CORRECTION-FINAL: RN bridge contract corrections ✅
- M2: RN native AR host shell ✅
- M3A: Backend/API DTO → NativeTrackingDto → CardDescriptorRN ✅

**Blocked (pending Unity gates):**
- M3B: Native AR_READY E2E (blocked on Unity P3 + BACKEND-T001)
- M1B: Unity runtime (blocked on Unity P1)

### Backend

**Existing endpoints:**
- Auth: `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/me`
- Courses: `/api/v1/courses/`, `/api/v1/courses/{id}`, `/api/v1/courses/{id}/start`
- Learning Path: `/api/v1/learning-path/*`
- Sessions: `/api/v1/sessions/start`, `/api/v1/sessions/{id}/end`
- Flashcards: `/api/v1/flashcard/category/{cat}`, `/api/v1/flashcard/{qr_id}`
- Games: `/api/v1/game/{qr_id}`
- Pronunciation: `/api/v1/pronunciation/*` (two implementations: `pronunciation.py`, `pronunciation_enhanced.py`)
- Gamification: `/api/v1/gamification/*`
- Pets: `/api/v1/pets/*`, `/api/v1/gamification/pet/*`

**Pending:**
- BACKEND-T001: Native AR fields (`reference_image_url`, `physical_width_m`) — needed for M3B

### Unity AR Engine

**Completed:**
- P0: Project setup + bridge foundation ✅
- P1: Single-card AR foundation (AC-TRACK-001 pending)

**Pending:**
- P1+: Runtime reference-image library, multi-card, combos, lifecycle, etc.

---

## Part 2: Complete Product Capability Map

### 2.1 Auth / App Shell (R1)

| Capability | Status | Notes |
|------------|--------|-------|
| Email+password login | IMPLEMENTED | `AuthScreen.tsx` |
| Register | PARTIAL | No register tab yet |
| Token restore | IMPLEMENTED | `useAuth.ts` + SecureStore |
| Guest mode | NOT STARTED | DQ-9 gates scope |
| Protected routes | IMPLEMENTED | `AppNavigator.tsx` |
| Logout | IMPLEMENTED | `HomeScreen` |

### 2.2 Courses (R2)

| Capability | Status | Notes |
|------------|--------|-------|
| Course catalog list | IMPLEMENTED | `CourseListScreen.tsx` |
| Category/level filters | NOT STARTED | |
| Course detail | IMPLEMENTED | `CourseDetailScreen.tsx` |
| Enrollment/start | NOT STARTED | `POST /courses/{id}/start` unwired |
| Lesson navigation | IMPLEMENTED | |
| Continue/resume | NOT STARTED | |

### 2.3 Learning Path (R3)

| Capability | Status | Notes |
|------------|--------|-------|
| Topic selection | NOT STARTED | Multi-select grid |
| Daily goals | NOT STARTED | Circular progress ring |
| Saved preferences | NOT STARTED | |
| Onboarding flow | NOT STARTED | |

### 2.4 Lesson Player (R4)

| Capability | Status | Notes |
|------------|--------|-------|
| Session engine | NOT STARTED | `useLessonSession` hook |
| Step: Intro/Watch | NOT STARTED | |
| Step: Vocabulary | NOT STARTED | |
| Step: Reading | NOT STARTED | |
| Step: Quiz | NOT STARTED | |
| Step: Pronunciation | NOT STARTED | R7 |
| Step: Game | NOT STARTED | R6 |
| Step: Finish/Reward | STUB | |

### 2.5 Interactive Flashcards (R5)

| Capability | Status | Notes |
|------------|--------|-------|
| Flashcard list | NOT STARTED | |
| Flashcard practice | NOT STARTED | |
| Tap image → pronunciation audio | NOT STARTED | MOB-FLASH-REQ-005 |
| Visual interaction feedback | NOT STARTED | MOB-FLASH-REQ-006 (bounce/wiggle) |
| Flashcard state tracking | NOT STARTED | MOB-FLASH-REQ-007 (NEW/SEEN/PRACTICING/LEARNED) |
| QR entry | IMPLEMENTED | AR path |

### 2.6 Educational Mini-Games (R6)

| Game | Priority | Status | Notes |
|------|----------|--------|-------|
| DragMatch | CORE | NOT STARTED | GAME-1 |
| MemoryPairs | CORE | NOT STARTED | GAME-2 |
| ColorLearn | CORE | NOT STARTED | GAME-3 (canvas complexity) |
| ListenChoose | BONUS | NOT STARTED | GAME-4 |
| SoundMatch | BONUS | NOT STARTED | GAME-5 (needs soundUrl) |
| QuickTap | BONUS | NOT STARTED | GAME-6 |
| WordBuilder | DEFER | DEFERRED | GAME-7 |
| FeedThePet | BONUS | NOT STARTED | GAME-8 (R9 dependency) |
| FindIt | BONUS | NOT STARTED | GAME-9 |

### 2.7 Pronunciation AI (R7 + PRON-A0 to PRON-A9)

| Capability | Status | Notes |
|------------|--------|-------|
| Recording UX | NOT STARTED | |
| Child-friendly scoring | NOT STARTED | GREAT/GOOD TRY/TRY AGAIN |
| Score calibration | NOT STARTED | PRON-A6 |
| Transcription display | NOT STARTED | |
| Permission fallback | NOT STARTED | |
| Retry flow | NOT STARTED | |

**ML Workstream:**
| Phase | Status | Notes |
|-------|--------|-------|
| PRON-A0: Pipeline reconnaissance | PENDING | Inspect existing backend ML pipeline |
| PRON-A1: Dataset definition | PENDING | Dataset schema for child pronunciation |
| PRON-A2: Data cleaning/labeling | PENDING | |
| PRON-A3: Baseline model eval | PENDING | WER on child speech |
| PRON-A4: Fine-tuning | PENDING | LoRA adaptation |
| PRON-A5: Offline evaluation | PENDING | Model quality report |
| PRON-A6: Score calibration | PENDING | Band thresholds as config |
| PRON-A7: Backend integration | PENDING | Updated `/pronunciation/evaluate` |
| PRON-A8: RN UX integration | NOT STARTED | R7 |
| PRON-A9: Pilot evaluation | PENDING | Real-device study |
| PRON-B0: Privacy decisions | DECISION_REQUIRED | PRON-DQ-2 |

### 2.8 Gamification (R8)

| Capability | Status | Notes |
|------------|--------|-------|
| XP award | PARTIAL | `gamificationService` exists |
| XP display | NOT STARTED | |
| Level system | NOT STARTED | |
| Streak | IMPLEMENTED | `StreakBadge` |
| Badges | NOT STARTED | |
| Stickers | NOT STARTED | |
| Reward celebration | NOT STARTED | |
| Leaderboard | NOT STARTED | |

**Reward Event Taxonomy (MOB-GAM-REQ-009):**
- `LESSON_COMPLETED`
- `FLASHCARD_MASTERED`
- `GAME_COMPLETED`
- `PRONUNCIATION_SUCCESS`
- `AR_COMBO_DISCOVERED`
- `MODEL_INTERACTION_DISCOVERED`
- `STREAK_REACHED`
- `PET_CARE_ACTION`

### 2.9 Pets (R9)

| Capability | Status | Notes |
|------------|--------|-------|
| Pet collection | PARTIAL | `PetsScreen` exists |
| Active pet | NOT STARTED | |
| Pet unlock | NOT STARTED | |
| Pet care (feed/play) | NOT STARTED | |
| Pet outfit | NOT STARTED | |
| Pet evolution | NOT STARTED | |
| Pet reward notifications | NOT STARTED | |

### 2.10 Session Management (R10)

| Capability | Status | Notes |
|------------|--------|-------|
| Session start/end | NOT STARTED | |
| Session timer | NOT STARTED | |
| Warning state | NOT STARTED | 25 min |
| Hard limit | NOT STARTED | 30 min |
| Break cooldown | NOT STARTED | 5 min |
| AppState lifecycle | NOT STARTED | |

### 2.11 Native AR Integration (R12)

| Capability | Status | Notes |
|------------|--------|-------|
| AR entry from lesson | STUB | "AR coming soon" |
| AR capability gating | STUB | |
| XP handoff from AR | PARTIAL | Shared `add-xp` |
| 3D model touch interaction | NOT STARTED | MOB-3DINT-REQ-* |

### 2.12 3D Model Touch Interaction (Interactive 3D Model Spec)

**Pipeline:**
```
Learner taps screen
    ↓
Unity: camera raycast from screen touch
    ↓
Unity: hit test against model colliders / interaction hotspots
    ↓
Unity: resolve hotspot → interaction type
    ↓
Unity: trigger animation (if defined for hotspot)
    ↓
Unity: trigger audio (model sound vs vocabulary pronunciation)
    ↓
Unity: check cooldown / repeat policy
    ↓
Unity: emit MODEL_INTERACTION event to RN
    ↓
RN: map MODEL_INTERACTION → vocabulary event / reward event
    ↓
RN: update XP via backend (if reward event)
    ↓
RN: update pet care / progress state
```

**Requirements:**
| ID | Requirement | Notes |
|----|-------------|-------|
| MOB-3DINT-REQ-001 | Hotspot Registration | Data-driven, not per-model |
| MOB-3DINT-REQ-002 | Touch Raycast | Mobile touch + editor mouse |
| MOB-3DINT-REQ-003 | Animation Triggering | Correct animation per hotspot |
| MOB-3DINT-REQ-004 | Audio Triggering | Model sound OR vocabulary via bridge |
| MOB-3DINT-REQ-005 | Cooldown Enforcement | Prevents spam |
| MOB-3DINT-REQ-006 | MODEL_INTERACTION Event | Typed event to RN |
| MOB-3DINT-REQ-007 | RN Reward Processing | `POST /gamification/add-xp` |
| MOB-3DINT-REQ-008 | Vocabulary Progress | Update word state |

**Cat First Fixture:**
| Hotspot | Animation | Audio | XP |
|---------|-----------|-------|-----|
| `cat_head` | `head_bump` | `vocabulary: "cat"` | 2 |
| `cat_body` | `body_rub` | `model_sound: "purr"` | 1 |
| `cat_tail` | `tail_swish` | `model_sound: "meow"` | 1 |
| `cat_food_target` | `eating` | `model_sound: "eating"` | 3 |

### 2.13 Audio System Architecture

| Category | Owner | Source |
|----------|-------|--------|
| Vocabulary pronunciation | RN | `audioUrl` or TTS |
| Flashcard interaction audio | RN | Same as vocabulary |
| Pronunciation recording/playback | RN + Backend | User recording + Whisper |
| Pronunciation feedback | Backend | Template or Gemini |
| UI feedback sounds | RN | Static assets |
| 3D model interaction sounds | Unity | Model-specific audio |
| AR spatial audio | Unity | Spatial audio engine |
| Reward celebration | RN | Static + procedural |

---

## Part 3: Execution Lanes

### 3.1 Cursor / React Native Lane

**Best suited for:**
- Courses, learning path, lesson UI
- Flashcards, flashcard tap audio
- 2D interaction animation
- DragMatch, MemoryPairs, ColorLearn
- Bonus 2D games
- Pronunciation recording UX
- Gamification UI
- Progress reports
- Pet UI/state
- Session limits
- API adapters/tests

**Ready for Cursor (R1–R4 foundation):**
1. Register screen (add to AuthScreen)
2. Course filters (category/level chips)
3. Course enrollment wiring
4. Guest mode (DQ-9 gate)
5. Learning path topic selection
6. Daily goals ring
7. Lesson session engine
8. Step renderers (intro, vocab, quiz, finish)

**R5 Flashcard Queue:**
1. Flashcard list screen
2. Practice screen with tap-to-hear
3. Visual interaction feedback (bounce primitive)
4. Flashcard state tracking hook

**R6 Game Queue:**
1. DragMatch game
2. MemoryPairs game
3. ColorLearn game (canvas complexity TBD)
4. Bonus: ListenChoose

**R7 Pronunciation Queue:**
1. Recording screen with mock adapter
2. Child-friendly score band mapping
3. Transcription display
4. Retry flow

**R8 Gamification Queue:**
1. Badge/sticker screens
2. Leaderboard
3. Reward celebration modal
4. XP idempotency hook

### 3.2 Unity Lane

**Best suited for:**
- 3D hit testing
- Interaction hotspots
- Model animation
- Model-local sound
- AR interactions
- Model feeding interaction
- Spatial interactions

**Unity Queue (blocked until P3):**
1. Generic ModelInteractionHotspot component
2. Touch raycast against registered hotspots
3. Hotspot → animation mapping
4. Hotspot → audio mapping
5. Typed MODEL_INTERACTION event
6. Cat interaction fixture
7. Animation/audio cooldown verification

### 3.3 ML / Backend Lane

**Best suited for:**
- Pronunciation dataset collection
- Fine-tuning
- Inference
- Score calibration
- Reward persistence
- Progress aggregation
- Idempotent mutations

**ML Queue:**
1. PRON-A0: Pipeline reconnaissance
2. PRON-A1: Dataset definition
3. PRON-A2: Data cleaning/labeling
4. PRON-A3: Baseline model evaluation
5. PRON-A4: Fine-tuning (LoRA)
6. PRON-A5: Offline evaluation
7. PRON-A6: Score calibration
8. PRON-A7: Backend inference integration

**Backend Queue:**
1. BACKEND-T001: Native AR fields (reference_image_url, physical_width_m)
2. Pronunciation endpoint canonical selection (PRON-DQ-1)
3. Gamification XP idempotency validation

---

## Part 4: Phase Plan

### R0: Inventory / Parity ✅ COMPLETED
### R1: App Shell + Auth
### R2: Courses
### R3: Learning Path
### R4: Lesson Player Foundation
### R5: Flashcards + Practice
### R6: Mini-Games
### R7: Pronunciation AI
### R8: Gamification + Progress + Stickers
### R9: Pets
### R10: Session Management
### R11: AI Chat (DECISION_REQUIRED)
### R12: Native AR Integration
### R13: Android E2E
### R14: iOS E2E
### R15: Learner Parity + Cutover

**ML Workstream (parallel to R7–R9):**
PRON-A0 → PRON-A1 → PRON-A2 → PRON-A3 → PRON-A4 → PRON-A5 → PRON-A6 → PRON-A7 → PRON-A8 (R7) → PRON-A9

---

## Part 5: Demo-Critical Path

### Demo Story (Fable/Cursor)

```
1. Learner selects "Animals" topic from learning path
     → R3 (Learning Path)
2. Opens "Animals Course" → sees lesson cards with progress
     → R2 (Course catalog + detail)
3. Starts lesson → animated interactive flashcard shown
4. Taps card → hears "elephant!" pronunciation + bounce animation
     → R5 (Flashcard tap-to-hear)
5. Plays DragMatch game with 5 vocabulary words
     → R6 (DragMatch game)
6. Practices pronunciation "elephant" → receives AI feedback
     → R7 (Pronunciation)
7. Earns XP → XP toast + sticker collected
     → R8 (Gamification + stickers)
8. Sees pet updated / progress ring filled
     → R9 (Pets)
9. Optional: taps "Practice in AR" → Unity AR opens
     → R12 (Native AR) — DEPENDS ON UNITY GATES
```

### Demo Priority

**Phase 1 (Fable ready):**
- R1 + R2 (existing — login, course catalog, course detail)
- R5 (flashcard tap-to-hear)
- R6 (DragMatch game)
- R8 (gamification XP/sticker display)

**Phase 2 (Fable ready):**
- R7 (pronunciation with mock/placeholder scoring)
- R3 (learning path topic selection)

**Phase 3 (Unity-dependent):**
- R12 (AR touch interaction) — BLOCKED on Unity P3+ gates

### Implementation Status Labels

| Label | Meaning |
|-------|---------|
| IMPLEMENTED | Already exists in codebase (verified) |
| PLANNED | Documented in spec; not yet started |
| BLOCKED | Waiting on external dependency |
| DEMO-MOCKABLE | Can be demonstrated with mock data |
| NOT IN MVP | Future phase / bonus |

---

## Part 6: Priority Matrix

### P0 — Product Foundation
- Auth (login + register)
- Token restore
- Guest mode

### P1 — Core Learning
- Course catalog + filters
- Course detail + enrollment
- Learning path
- Lesson session engine
- Flashcard tap-to-hear
- Basic gamification (XP display)

### P2 — Engagement
- DragMatch game
- MemoryPairs game
- Pronunciation UX
- Reward celebration
- Streak + badges + stickers
- Pet care (feed/play)

### P3 — Advanced / Bonus
- ColorLearn game
- ListenChoose game
- 3D model touch interaction
- Native AR integration
- AI Chat (R11)

---

## Part 7: Decision Inventory

### Active Decisions

| # | Decision | Owner | Blocks |
|---|----------|-------|--------|
| DQ-1 | Animals canonical source | Product | R2 |
| DQ-2 | Lesson player canonical | Product/Architect | R4 |
| DQ-3 | Pronunciation endpoint | Backend | R7 |
| DQ-4 | Flashcard systems | Product | R5 |
| DQ-5 | Mini-games per-game | Product | R6 |
| DQ-6 | Pet 3D viewer | Product/Architect | R9 |
| DQ-7 | AI Chat inclusion | Product | R11 |
| DQ-8 | Cutover trigger | Product | R15 |
| DQ-9 | Guest mode scope | Product | R1 |
| DQ-10 | Session constants | Product | R10 |
| PRON-DQ-1 | Pronunciation endpoint canonical | Backend | PRON-A7 |
| PRON-DQ-2 | Child audio policy | Product/Legal | PRON-B0 |
| PRON-DQ-3 | Score band thresholds | Product | R7 |
| GAME-DQ-1 | Canvas library for ColorLearn | Architect | GAME-3 |
| GAME-DQ-2 | Sound assets for SoundMatch | Content | GAME-5 |
| GAME-DQ-3 | Game difficulty auto-adjust | Product | All games |
| MQ-1 | Multi-card replace vs parallel | Unity | M6 |
| MQ-3 | XP persistence timing | Product | M7 |
| MQ-6 | AR capability detection | Unity/Mobile | M4 |
| MQ-7 | Combo identity | Unity | M6 |
| BQ-1 | Existing AR objects migration | Backend | M3B |
| BQ-2 | Reference image source | Content | M3B |
| RQ-4 | onImageTrackingLost reason | Unity | M9 |
| 3D-DQ-1 | Food proximity hysteresis | Product/UX | GAME-8 |
| 3D-DQ-2 | Hold interaction duration | Unity | 3DINT |
| 3D-DQ-3 | Drag interaction | Unity | GAME-8 |

---

## Part 8: Deferred Decisions Preserved

The following deferred decisions from existing specs remain unchanged unless this expanded product plan introduces a real dependency:

| ID | Question | Status |
|----|----------|--------|
| RQ-4 | `onImageTrackingLost.reason` field | UNRESOLVED |
| MQ-1 | `startImageTrackingMulti` replace vs parallel | UNRESOLVED |
| MQ-7 | `triggerCombo` cardA/cardB semantic identity | UNRESOLVED |
| MQ-3 | XP immediate vs session-end | UNRESOLVED |
| BQ-1 | Migration of existing ar_objects | UNRESOLVED |
| BQ-2 | Reference-image hosting/source | UNRESOLVED |

---

## Part 9: Risks

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|------------|
| Pronunciation scoring too strict for children | R7 | High | PRON-A6 score calibration + PRON-A9 pilot |
| Child audio privacy policy undefined | PRON-B0 | High | Interim: no audio stored |
| XP double-award between lanes | R8/M7 | High | Shared idempotency contract |
| Unity gates delay AR features | R12 | Medium | R1–R11 not blocked |
| Canvas library unavailable for ColorLearn | GAME-3 | Medium | SVG fallback |
| ML compute unavailable for fine-tuning | PRON-A4 | Medium | Start with baseline |

---

## Part 10: Verification Gates

### RN Gates (RN-GATE)
- RN-GATE-001: `npx tsc --noEmit` exits 0
- RN-GATE-002: Phase smoke test against live backend
- RN-GATE-003: Every task acceptance criteria verified + progress entry
- RN-GATE-004: No frozen-path diffs
- RN-GATE-005: Parity items verified on device

### AR Gates (MOB-AR-*)
- AC-BUILD-001: Unity project builds
- AC-TRACK-001: Single-card tracking in XR sim
- AC-TRACK-003: Runtime reference-image library
- AC-MULTI-001: Multi-card tracking
- AC-COMBO-001: Combo detection
- AC-GAME-001: AR gamification
- AC-ANDROID-001/002: Android E2E
- AC-IOS-001: iOS E2E

### ML Gates (PRON-*)
- PRON-GATE-A0: Baseline WER evaluated
- PRON-GATE-A6: Band thresholds configured
- PRON-GATE-A9: Pilot criteria met

---

## Part 11: Acceptance Criteria by Capability

### Flashcard
- [ ] Tap produces correct vocabulary audio
- [ ] Visual feedback is visible
- [ ] Repeated taps are safe (cooldown)

### Game
- [ ] Deterministic success/failure behavior
- [ ] Completion event generated exactly once
- [ ] Vocabulary/audio content correct

### Pronunciation
- [ ] Recording lifecycle safe
- [ ] Model result handled
- [ ] Child-friendly score mapping
- [ ] Retry supported
- [ ] Backend/inference failure handled

### Gamification
- [ ] Reward event maps to backend action
- [ ] Retry is idempotent
- [ ] UI reflects persistent result

### 3D Interaction
- [ ] Screen touch hits intended hotspot
- [ ] Correct animation starts
- [ ] Correct sound plays
- [ ] One interaction produces one semantic event
- [ ] No accidental duplicate reward

### Session
- [ ] Warning/limit lifecycle survives background/resume correctly

---

## Part 12: Document Authority

| Concern | Authority |
|---------|-----------|
| Learner product | `docs/mobile_migration/spec/` |
| Unity/native-AR | `docs/unity_ar/spec/` |
| ML behavior/training/evaluation | `plans/pronunciation-ai-ml-plan.md` |
| Orchestration | `plans/2026-08-09-master-orchestration-plan.md` |

---

## Related
- `spec/000-index.md` — spec index (updated)
- `spec/learner-product-spec.md` — requirements
- `spec/learner-parity-matrix.md` — parity decisions
- `spec/flashcard-expansion.md` — flashcard expansion
- `spec/game-catalog.md` — game catalog
- `spec/interactive-3d-model-spec.md` — 3D interaction
- `spec/pronunciation-ai-spec.md` — pronunciation product spec
- `plans/pronunciation-ai-ml-plan.md` — ML workstream
- `plans/2026-08-09-learner-migration-plan.md` — RN phases
- `plans/2026-08-09-master-orchestration-plan.md` — orchestration
