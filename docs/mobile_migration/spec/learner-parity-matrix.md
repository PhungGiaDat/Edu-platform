# Learner Feature Parity Matrix

## Status
approved — learner-domain reconciliation applied 2026-08-14

## Goal
Authoritative Web → React Native feature parity decisions. Every feature in `web-feature-inventory.md` must have a decision here.

## Learner domain reconciliation

This matrix remains a parity inventory; normative ownership lives in `learner-product-spec.md`. The PostgreSQL-compatible transition is:

```text
courses.category_key + learning_paths.priority_topics -> canonical LearningTopic keys
lessons.learning_blocks.activities[]                  -> ordered authored activities
lesson_sessions/steps/attempts                        -> runtime traversal and attempts
mini_game_items + typed payload                       -> configured Course Game content
quiz_questions + quiz_question_options                -> data-driven question content
media_assets                                           -> reusable semantic learner assets
```

No parallel LessonActivity, GameTemplate, GameInstance, or asset table is assumed. Legacy flat lesson blocks remain readable while new content adopts the ordered activity representation.

## Decision vocabulary
- **KEEP**: Port directly; behavior unchanged
- **ADAPT**: Port with RN-specific changes (e.g. native speech API instead of Web Speech, AppState instead of tab visibility)
- **MERGE**: Two web implementations exist; select canonical and merge behavior
- **DEFER**: Not in initial RN scope; may be added later
- **WEB_ONLY**: Keep on web; not migrating
- **DECISION_REQUIRED**: Cannot decide without product input; DQ-N must resolve first

## Inventory Count
Total features: ~75 across domains A–O
Decided: ~65 | Decision Required: ~10

---

## Matrix

| ID | Feature | Web File | Current RN | Target RN | Decision | Backend Dependency | Notes |
|----|---------|----------|-----------|-----------|----------|-------------------|-------|
| **A: AUTH / APP SHELL** | | | | | | | |
| A1 | Login | `frontend-web/src/pages/Login.tsx` | existing | existing | KEEP | `POST /api/v1/auth/login` | SecureStore token storage |
| A2 | Register | `frontend-web/src/pages/Register.tsx` | none | implement | ADAPT | `POST /api/v1/auth/register` | Add register tab to AuthScreen; no localStorage change |
| A3 | Token/session restore | `frontend-web/src/hooks/useAuth.ts` | existing | existing | KEEP | `GET /api/v1/auth/me` | SecureStore already used |
| A4 | Guest mode | `frontend-web/src/middleware/RequireLearnerAccess.tsx` | none | implement | ADAPT | none (public only) | DQ-9: read-only catalog/flashcards with banner; no auth required endpoints |
| A5 | Protected learner routes | React Router guards | existing | existing | KEEP | — | Conditional navigator stack |
| A6 | Logout | `frontend-web/src/components/LogoutButton.tsx` | existing | existing | KEEP | — | Via clearToken callback |
| **B: COURSES** | | | | | | | |
| B1 | Course catalog | `frontend-web/src/pages/CourseList.tsx` | existing (partial) | existing + hero | ADAPT | `GET /api/v1/courses/` | Add hero + path cards + stats grid (RN-specific layout) |
| B2 | Category/level/path filters | `frontend-web/src/pages/CourseList.tsx` | stub | implement | ADAPT | `GET /api/v1/courses/` with query params | Backend supports; RN wiring needed |
| B3 | Course detail | `frontend-web/src/pages/CourseDetail.tsx` | existing | existing | KEEP | `GET /api/v1/courses/{id}` | Already wired |
| B4 | Enrollment/start | `frontend-web/src/pages/CourseDetail.tsx` | stub | implement | ADAPT | `POST /api/v1/courses/{id}/start` | Wire POST call on enroll tap |
| B5 | Lesson navigation | `frontend-web/src/pages/CourseDetail.tsx` | existing | existing | KEEP | `GET /api/v1/courses/{id}/lessons/{id}` | Already wired |
| B6 | Continue/resume | `frontend-web/src/pages/CourseDetail.tsx` | stub | implement | ADAPT | `GET /api/v1/users/{id}/progress` | Wire progress check → correct CTA |
| **C: LEARNING PATH** | | | | | | | |
| C1 | LearningTopic selection | `frontend-web/src/pages/LearningPathSetup.tsx` | course-derived mock topics | implement controlled Topic keys | ADAPT | `GET/POST /api/v1/learning-path/*` | Family/School/Nature sit above Courses; reuse `priority_topics` and `category_key` |
| C2 | Daily goals | `frontend-web/src/components/Gamification/DailyGoalRing.tsx` | none | implement | ADAPT | `GET /api/v1/learning-path/{user_id}/today` | RN circular progress component |
| C3 | Saved preferences | `frontend-web/src/pages/LearningPathSetup.tsx` | none | implement | KEEP | `POST /api/v1/learning-path/preferences` | Same backend contract |
| C4 | Learner onboarding | `frontend-web/src/pages/LearningPathSetup.tsx` | none | implement | ADAPT | `GET /api/v1/learning-path/{user_id}` | First-time flow; RN-specific UI |
| **D: LESSON PLAYER** | | | | | | | |
| D1 | Activity-driven Learning Session | `frontend-web/src/pages/LessonPlayer.tsx` | frontend foundation + disconnected APIs | implement ordered renderer | ADAPT | existing lesson/session/step/attempt APIs | `learning_blocks.activities[]` is authored definition; session tables own runtime |
| D2 | Step: Intro/Watch | `frontend-web/src/pages/LessonPlayer.tsx` | stub | implement | ADAPT | `GET /courses/{id}/lessons/{id}/media` | Media components; RN video/image |
| D3 | Step: Story/Media | `frontend-web/src/components/SceneViewer.tsx` | stub | implement | ADAPT | same as D2 | RN scene rendering |
| D4 | Course Game Activity | inline in LessonPlayer.tsx | standalone demo shells | implement configured activity | ADAPT | existing game route + `mini_game_items` | Normal RN flow; distinct from Unity AR Game |
| D5 | Step: Vocabulary | `frontend-web/src/components/courses/CourseLearningBlocks.tsx` | none | implement | ADAPT | lesson response (vocabulary field) | Word cards with audio/translation |
| D6 | Step: Reading | `frontend-web/src/pages/LessonPlayer.tsx` | none | implement | KEEP | from lesson data | Same behavior |
| D7 | Step: Pronunciation | `frontend-web/src/components/game/PronunciationGame.tsx` | none | implement | ADAPT | `POST /api/v1/pronunciation/*` | Native speech API (iOS Speech/Android SpeechRecognizer) |
| D8 | Data-driven Quiz Activity | `frontend-web/src/components/Quiz.tsx` | typed but disconnected | implement activity-selected question pool | ADAPT | existing quiz questions/options + submit route | No fixed global option count/pass threshold |
| D9 | Completion/Reward presentation | `frontend-web/src/components/Gamification/RewardCelebration.tsx` | stub | implement derived result UI | ADAPT | lesson completion + semantic gamification event | Not an XP-owning authored activity |
| **E: ANIMALS COURSE** | | | | | | | |
| E1 | AnimalsCourse (standalone) | `frontend-web/src/pages/AnimalsCourse.tsx` | none | not implemented | LEGACY | — | DQ-1: superseded by AnimalsAdventure |
| E2 | AnimalsAdventure (hooks) | `frontend-web/src/pages/AnimalsAdventure.tsx` | none | implement | MERGE | `GET /api/v1/courses/` | DQ-1: canonical source; proper API integration |
| E3 | Animals activity content | `frontend-web/src/pages/AnimalsLessonPlayer.tsx` | none | seed canonical activity data | ADAPT | lesson API | `AnimalsAdventure` canonical; no Animals-only player architecture |
| E4 | Standard LessonPlayer | `frontend-web/src/pages/LessonPlayer.tsx` | route preview stub | implement generic activity renderer | MERGE | lesson/session APIs | One renderer path for Animals and other Courses |
| **F: FLASHCARDS** | | | | | | | |
| F1 | Flashcard list/category | `frontend-web/src/pages/FlashcardPage.tsx` | none | implement | ADAPT | `GET /api/v1/flashcard/category/{cat}`, `search/{q}` | RN list component with category chips |
| F2 | Flashcard practice | `frontend-web/src/pages/FlashcardPage.tsx` | AR overlay stub | implement | ADAPT | `GET /api/v1/flashcard/{qr_id}` | General practice screen; flip/tap UX |
| F3 | Flashcard audio | `frontend-web/src/pages/FlashcardPage.tsx` | AR overlay | existing | KEEP | audio URL from response + `tts` | Already in FlashcardOverlay |
| F4 | Flashcard game launch | `frontend-web/src/pages/FlashcardPage.tsx` | none | implement | ADAPT | `GET /api/v1/game/{qr_id}`, `quiz/{qr_id}` | Navigate to game screen |
| F5 | QR entry | `frontend-web/src/pages/FlashcardPage.tsx` + scanner | existing (AR path) | existing | KEEP | `GET /api/v1/flashcard/{qr_id}` | Already wired via flashcardApi |
| **G: MINI-GAMES** | | | | | | | |
| G1 | DragMatch Course Game | `frontend-web/src/components/game/DragMatchGame.tsx` | demo shell | adapt to configured content | ADAPT | `mini_game_items` + lesson vocabulary | RN gesture mechanic; returns normalized result |
| G2 | MemoryMatch Course Game | `frontend-web/src/components/game/MemoryMatchGame.tsx` | demo shell | adapt to configured content | ADAPT | `mini_game_items` + lesson vocabulary | Image↔word or image↔image payload |
| G3 | PronunciationGame | `frontend-web/src/components/game/PronunciationGame.tsx` | none | implement | ADAPT | `POST /api/v1/pronunciation/*` | DQ-5+DQ-3; native speech API; overlaps D7 |
| G4 | CatchWordGame | `frontend-web/src/components/game/CatchWordGame.tsx` | none | not implemented | DECISION_REQUIRED | `GET /api/v1/game/{qr_id}` | DQ-5; canvas/falling-object game; complex |
| G5 | WordScrambleGame | `frontend-web/src/components/game/WordScrambleGame.tsx` | none | implement | KEEP (likely) | `GET /api/v1/game/{qr_id}` | DQ-5; letter reorder mechanic works in RN |
| G6 | Coloring Course Game | `frontend-web/src/components/game/ColoringGame.tsx` | tap-color demo shell | implement authored outline + pronunciation | ADAPT | `mini_game_items` + vocabulary assets | CORE requirement; drawing engine choice remains open |
| **H: PRONUNCIATION** | | | | | | | |
| H1 | Recording/input UX | `frontend-web/src/services/PronunciationService.ts` | none | implement | ADAPT | `POST /api/v1/pronunciation/*` | DQ-3; native iOS Speech + Android SpeechRecognizer |
| H2 | Assessment API | `frontend-web/src/services/PronunciationService.ts` | none | implement | DECISION_REQUIRED | `evaluate` vs `transcribe` | DQ-3; select canonical endpoint |
| H3 | Feedback/retry | `frontend-web/src/services/PronunciationService.ts` | none | implement | ADAPT | `POST /api/v1/pronunciation/feedback` | RN feedback UI component |
| H4 | Permissions/fallback | `frontend-web/src/services/PronunciationService.ts` | none | implement | ADAPT | — | Native permission prompt; skip option |
| **I: GAMIFICATION** | | | | | | | |
| I1 | XP system | `frontend-web/src/services/GamificationService.ts` | existing (partial) | implement | ADAPT | `POST /api/v1/gamification/add-xp`, `GET user/{id}` | Wire useGamification hook to screens; shared with AR lane |
| I2 | Levels | `frontend-web/src/components/Gamification/Leaderboard.tsx` | none | implement | ADAPT | `GET /api/v1/gamification/user/{id}` | Level badge component |
| I3 | Streaks | `frontend-web/src/components/Gamification/StreakBadge.tsx` | existing | existing | KEEP | `GET /api/v1/gamification/streak/{id}` | Already in HomeScreen |
| I4 | Badges | `frontend-web/src/components/Gamification/BadgeList.tsx` | none | implement | ADAPT | `GET /api/v1/gamification/badges` | RN badge grid with detail modal |
| I5 | Stickers | `frontend-web/src/components/Gamification/StickerCollection.tsx` | none | implement | ADAPT | `GET /api/v1/gamification/stickers/*` | RN sticker gallery |
| I6 | Rewards/celebration | `frontend-web/src/components/Gamification/RewardCelebration.tsx` | stub | implement | ADAPT | XP via add-xp | RN celebration modal with animation |
| I7 | Event tracking | `frontend-web/src/services/GamificationService.ts` | existing (partial) | existing | KEEP | `POST /api/v1/gamification/add-xp` | Hook already exists; XP idempotency shared with AR lane |
| I8 | Leaderboard | `frontend-web/src/components/Gamification/Leaderboard.tsx` | none | implement | KEEP | `GET /api/v1/gamification/leaderboard` | Weekly leaderboard component |
| **J: PROFILE / PROGRESS** | | | | | | | |
| J1 | Learner profile | `frontend-web/src/pages/Profile.tsx` | existing (partial) | existing + complete | ADAPT | `GET /api/v1/auth/me`, `gamification/user/{id}` | Complete profile screen; avatar/name/XP/streak |
| J2 | Progress dashboard | `frontend-web/src/pages/ProgressDashboard.tsx` | none | implement | ADAPT | `GET /api/v1/users/{id}/progress` | Weekly chart + XP history |
| J3 | Achievements | `frontend-web/src/components/Gamification/BadgeList.tsx` | none | implement | ADAPT | `GET /api/v1/gamification/badges` | Achievements tab in profile |
| **K: PETS** | | | | | | | |
| K1 | Pet collection | `frontend-web/src/pages/PetsPage.tsx` | existing (partial) | existing + wire | ADAPT | `GET /api/v1/pets` | Wire petsApi; care stats currently hardcoded |
| K2 | Active pet | `frontend-web/src/components/pets/PetSelector.tsx` | stub | implement | ADAPT | `GET/PUT/DELETE /api/v1/pets/active` | Wire active pet selection |
| K3 | Pet unlock | `frontend-web/src/components/pets/PetUnlockModal.tsx` | stub | implement | ADAPT | `POST /api/v1/pets/{id}/unlock` | Wire unlock API + modal |
| K4 | Pet care (feed/play) | `frontend-web/src/components/Gamification/VirtualPet.tsx` | none | implement | ADAPT | `GET /api/v1/gamification/pet/{user_id}`, `feed`, `play` | Wire care actions; care stats wired to petsApi |
| K5 | Pet outfit | `frontend-web/src/components/Gamification/VirtualPet.tsx` | none | implement | ADAPT | `POST /api/v1/gamification/pet/outfit` | Outfit picker component |
| K6 | Pet evolution | `frontend-web/src/components/Gamification/VirtualPetEvolved.tsx` | none | implement | ADAPT | `GET /api/v1/gamification/pet-xp/{user_id}` | Evolution stage + animation |
| K7 | Pet model/viewer | `frontend-web/src/components/Gamification/Buddy3D.tsx` | 2D existing | implement | DECISION_REQUIRED | — | DQ-6: 2D thumbnail-first vs R3F 3D vs Unity AR pet |
| K8 | Pet reward notifications | `frontend-web/src/components/Gamification/RewardCelebration.tsx` | none | implement | ADAPT | from feed/play response | Pet XP toast component |
| **L: SESSION MANAGEMENT** | | | | | | | |
| L1 | Session start/end | `frontend-web/src/session/sessionBreakState.ts` | none | implement | ADAPT | `POST /api/v1/sessions/start`, `PATCH /sessions/{id}/end` | AppState-based lifecycle; RN port of state machine |
| L2 | Session timer | `frontend-web/src/hooks/useSessionTimer.ts` | none | implement | ADAPT | — | RN timer with AppState integration |
| L3 | Idle detection | `frontend-web/src/hooks/useSessionTimer.ts` | none | implement | ADAPT | — | RN ActivityIndicator or touch-based idle |
| L4 | Warning/hard limit | `frontend-web/src/session/sessionBreakState.ts` | frontend foundation | integrate after policy | ADAPT | — | Exact thresholds/enforcement remain DQ-10 |
| L5 | Break/cooldown | `frontend-web/src/session/sessionBreakState.ts` | frontend foundation | integrate after policy | ADAPT | `POST /api/v1/session-lock/*` | Exact cooldown policy remains DQ-10; lifecycle foundation exists |
| L6 | App background/foreground | `frontend-web/src/hooks/useSessionTimer.ts` | none | implement | ADAPT | — | AppState API; break state persists across background |
| **M: AI CHAT** | | | | | | | |
| M1 | Chat UI | `frontend-web/src/components/ChatInterface.tsx` | none | implement | DECISION_REQUIRED | `POST /api/v1/chat/rag` | DQ-7: initial parity vs later phase vs web-only |
| M2 | RAG context | `frontend-web/src/services/ChatService.ts` | none | implement | DECISION_REQUIRED | `POST /api/v1/chat/rag` | DQ-7; same as M1 |
| **N: AR LEARNING** | | | | | | | |
| N1 | AR entry from lesson | `frontend-web/src/pages/LearnARV2.tsx` | existing (stub) | existing | KEEP | `GET /courses/{id}/lessons/{id}` | MOB-ARINT-REQ-001; Open AR button |
| N2 | AR capability gating | N/A | stub | implement | KEEP | — | MOB-ARINT-REQ-002; placeholder text fallback |
| N3 | AR completion → XP | AR detection → GamificationService | existing | existing | KEEP | `POST /api/v1/gamification/add-xp` | Shared XP idempotency; Unity lane owns MOB-GAME-REQ |
| **O: PUBLIC / ADMIN** | | | | | | | |
| O1 | Marketing landing page | `frontend-web/src/pages/LandingPage.tsx` | none | none | WEB_ONLY | — | Marketing stays on web |
| O2 | Public flashcard viewer | `frontend-web/src/pages/FlashcardPage.tsx` | none | none | DEFERRED | `GET /api/v1/f/{qr_id}` | Mobile-native QR entry serves differently |
| O3 | Admin dashboard | assumed | none | none | WEB_ONLY | — | Admin tools stay on web |

---

## Decision Summary

| Decision | Count |
|----------|-------|
| KEEP | 18 |
| ADAPT | 37 |
| MERGE | 2 (E2, E4) |
| DEFER | 2 (G6, O2) |
| WEB_ONLY | 2 (O1, O3) |
| DECISION_REQUIRED | 10 (E3, G1, G3, G4, H2, K7, L4, L5, M1, M2) |
| LEGACY | 1 (E1) |
| none (not in web) | 0 |
| **Total** | **73** |

---

## Decision Dependencies

```
DQ-1 (Animals canonical) ──┬── E2 (MERGE) → R2
                            └── E3 (ADAPT) → R4

DQ-2 (Lesson player canonical) ── E4 (MERGE) → R4

DQ-3 (Pronunciation endpoint) ─── H2 (DECISION_REQUIRED) → R7
                                      └── G3 (ADAPT) → R7

DQ-5 (Mini-games per-game) ──┬── G1 (DECISION_REQUIRED) → R6
                             ├── G2 (KEEP likely) → R6
                             ├── G3 (ADAPT) → R7
                             ├── G4 (DECISION_REQUIRED) → R6
                             ├── G5 (KEEP likely) → R6
                             └── G6 (DEFER) → R6 (no-op)

DQ-6 (Pet 3D viewer) ────── K7 (DECISION_REQUIRED) → R9

DQ-7 (AI Chat) ───────────── M1, M2 (DECISION_REQUIRED) → R11 or WEB_ONLY

DQ-9 (Guest mode) ────────── A4 (ADAPT) → R1

DQ-10 (Session constants) ─── L4, L5 (ADAPT) → R10
```

---

## Verification

- Total features in inventory (web-feature-inventory.md): ~75
- Features with decisions in this matrix: 73
- Decision Required: 10
- LEGACY (not to be implemented): 1 (E1)
- WEB_ONLY (not to be implemented): 2 (O1, O3)
- DEFERRED: 2 (G6, O2)
- Implementation target: 57 features (KEEP + ADAPT + MERGE — excluding WEB_ONLY, DEFER, LEGACY, DECISION_REQUIRED)

---

## Related
- `spec/web-feature-inventory.md` — raw inventory
- `spec/learner-product-spec.md` — target product requirements
- `plans/2026-08-09-learner-migration-plan.md` — phase mapping
