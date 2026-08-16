# React Native Learner Migration Plan (Web → RN)

## Status
draft

## Target specs
- `docs/mobile_migration/spec/web-feature-inventory.md` — raw inventory (what exists)
- `docs/mobile_migration/spec/learner-parity-matrix.md` — per-feature decisions
- `docs/mobile_migration/spec/learner-product-spec.md` — target product behavior (MOB-*-REQ)
- `docs/mobile_migration/spec/native-ar-integration.md` — AR boundary

## Overview

Migrate the learner-facing `frontend-web/` product into the React Native app (`mobile/rn/`), reusing the existing FastAPI backend. `frontend-web` is the legacy/product parity source; `mobile/rn` is the native implementation source of truth. The Unity/native-AR domain stays in `docs/unity_ar/` — this plan only owns AR entry/navigation/product integration (R12).

Phases use **R0–R15** (RN learner migration). They are distinct from the Unity lane P0–P11 and the Mobile AR lane M0–M12 in `docs/unity_ar/`.

**Core principle:** React Native owns the learner product UI/state; Unity owns native AR; backend owns persistent state. Reuse existing backend endpoints; create new ones only via a backend-gap blocker.

## Phase Summary

| Phase | Title | Mobile Deliverable | Depends on | Unity/AR Gate | Backend Gate |
|-------|-------|-------------------|-----------|--------------|-------------|
| R0 | Inventory / parity / canonical-source decisions | Web→RN inventory + parity matrix + canonical decisions | — | — | — |
| R1 | App shell + auth + guest mode | Auth/register/guest, token restore, protected routes | R0 | — | Auth endpoints (exist) |
| R2 | Course catalog + detail | Catalog, filters, detail, enrollment, lesson nav | R1 | — | `/courses/*` (exist) |
| R3 | Learning Path | Topic selection, daily goals, saved prefs, onboarding | R1 | — | `/learning-path/*` (exist) |
| R4 | Lesson Player foundation | Session engine, step renderers (intro/watch, vocab, read, quiz, finish/reward) | R2 | — | `/courses/{id}/lessons/{id}*`, `/quizzes/*/submit`, `/lessons/*/complete` (exist) |
| R5 | Flashcards + practice | Flashcard list, practice, **tap-to-hear audio**, **visual interaction feedback**, **state tracking (NEW/SEEN/PRACTICING/LEARNED)**, game launch, QR entry | R4 | — | `/flashcard*`, `/quiz/*`, `/game/*` (exist) |
| R6 | Mini-games | Per-game KEEP/ADAPT decisions, **DragMatch**, **MemoryPairs**, **ColorLearn** RN screens; bonus games catalog | R4 | — | `/game/{qr_id}` (exist) |
| R7 | Pronunciation | Recording/input UX, assessment, **child-friendly scoring bands (GREAT/GOOD TRY/TRY AGAIN)**, score calibration, feedback, retry, permissions, fallback | R4 | — | `/pronunciation/*` (exist; DQ-3 selects canonical endpoint) |
| R8 | Gamification + progress + stickers | XP/levels/streaks/badges/stickers/rewards/leaderboard UI + **shared XP idempotency util** + **reward event taxonomy** | R1, R4 | AR lane M7 coordinates on XP idempotency | `/gamification/*` (exist) |
| R9 | Pets | Collection, active pet, unlock, feed, play, evolution, viewer, reward notifications | R1 | AR lane pet events separate | `/pets/*`, `/gamification/pet*` (exist) |
| R10 | Session management / break lifecycle | Native-aware timer, idle, warning, hard limit, break/cooldown, background/foreground | R1 | shares `useAppStateLifecycle` concept with AR lane M8 | `/sessions/*`, `/session-lock/*`, `/parental/*` (exist) |
| R11 | Optional AI Chat | Lexi/RAG chat UI (decision-gated — see DQ-7) | R8 | — | `/chat/rag` (exist) |
| R12 | Native AR product integration | Lesson→AR entry, AR capability gating, AR completion→XP handoff, **3D model touch interaction** (cat hotspot fixture) | R4 | **AR lane integration gates (M2–M3+)** | — |
| R13 | Android learner E2E | Full learner flow on Android | R1–R12 | — | All above |
| R14 | iOS learner E2E | Full learner flow on iOS | R13 | — | All above |
| R15 | Web/mobile learner parity + cutover | Parity gate sign-off; cutover decision | R1–R14 | parity checklist | All above |

### Parallel ML Workstream: Pronunciation AI

Runs parallel to RN phases R7–R9 (not blocking RN implementation, but required before production scoring quality):

| ML Phase | Title | Deliverable | Blocks |
|---------|-------|-------------|--------|
| PRON-A0 | Pipeline reconnaissance | Baseline evaluation (WER, latency) | PRON-A3+ |
| PRON-A1 | Dataset definition | Dataset spec + vocabulary coverage | PRON-A2+ |
| PRON-A2 | Data cleaning/labeling | Labeled dataset (500–2000 samples) | PRON-A3+ |
| PRON-A3 | Baseline model eval | WER on child speech baseline | PRON-A4 |
| PRON-A4 | Fine-tuning/adaptation | Fine-tuned LoRA weights | PRON-A5 |
| PRON-A5 | Offline evaluation | Model quality report | PRON-A6 |
| PRON-A6 | Child-friendly score calibration | Band thresholds (GREAT ≥ 80, GOOD TRY ≥ 50) | PRON-A7 |
| PRON-A7 | Backend inference integration | Updated `/pronunciation/evaluate` endpoint | PRON-A8 |
| PRON-A8 | RN UX integration | PronunciationScreen with scoring | — (runs with R7) |
| PRON-A9 | Pilot evaluation | Real-device study (10–20 children) | Production |
| PRON-B0 | Privacy decisions | DECISION_REQUIRED: child audio consent/retention | PRON-A1 |

## Phase Detail

### R0 — Inventory / parity / canonical-source decisions
Deliverables:
- `docs/mobile_migration/spec/web-feature-inventory.md` ✅
- `docs/mobile_migration/spec/learner-parity-matrix.md` (every learner feature classified)
- Canonical-source decisions for duplicates: animals course (DQ-1), lesson player families (DQ-2), pronunciation evaluate (DQ-3), flashcard systems (DQ-4)
Acceptance: every domain A–O has a decision; no duplicate web implementation left unclassified; parity matrix total equals the inventory count.

### R1 — App shell + auth + guest mode
- Auth: register screen (RN today is login-only — `AuthScreen.tsx` has no register), token/session restore (exists via `useAuth` + SecureStore), logout (exists).
- Guest mode: **none exists today** (binary token gate) — specify product behavior (read-only catalog/flashcards with warning banner, per web `RequireLearnerAccess`/guest pattern).
- App shell: navigation stack (exists), protected learner routes, tab/nav structure for learner areas.
- Cursor tasks: Register screen + guest-mode hook + auth error states; nav restructure.
Backend: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me` (all exist).
Verify: register→login→restore on relaunch; guest sees public content only.

### R2 — Course catalog + detail
- Catalog list + category/level/path filtering (web `CourseList.tsx` has hero + path cards + stats grid), course detail, enrollment/start, continue-resume, lesson navigation.
- RN today: `CourseListScreen`/`CourseDetailScreen` exist (real) with `courseService`; filters/hero/path cards are web-only.
- Cursor tasks: filter chips + hero port; start/enroll wiring (`POST /courses/{id}/start`); resume CTA from `getProgress`.
Backend: `GET /courses`, `GET /courses/{id}`, `POST /courses/{id}/start`, `GET /users/{id}/progress` (exist).
Verify: catalog parity with web; enrollment persists; resume shows correct CTA.

### R3 — Learning Path
- Topic selection, daily goals, saved preferences, learner onboarding (web `learning_path.py` endpoints exist).
- RN today: nothing.
- Cursor tasks: path/topic selection screen; daily-goal ring; onboarding flow.
Backend: `GET /learning-path/{user_id}`, `POST /learning-path/preferences`, `POST /learning-path/goals`, `POST /learning-path/progress`, `GET /learning-path/{user_id}/today` (exist).
Verify: topic selection persists; daily goal shows today state.

### R4 — Lesson Player foundation
- Lesson session engine + step renderers. **Canonical target behavior must be selected (DQ-2)** — RN already adapts the course-scoped session API (`coursesApi.startLessonSession`/`submitLessonStep`/`completeLesson` on `/courses/{id}/lessons/{id}/*`). The web learner player behavior (intro/watch → game → vocabulary → reading → pronunciation → quiz → finish) is the product source; the backend step blueprint lives in `backend/services/course_service.py` (`_lesson_step_blueprint`).
- RN today: `LessonPlayerScreen` is a STUB; the entire lesson-session/step/quiz/vocab API surface is defined but unwired.
- Cursor tasks: `useLessonSession` hook (start-on-mount → normalize → step progression), `StepNav`, step renderers (WatchStep, VocabStep, ReadStep, QuizStep, FinishStep), `RewardCelebration` modal, `eventBus`.
- Do NOT port both lesson implementations; port the canonical product behavior once.
Backend: `GET /courses/{id}/lessons/{id}`, `GET .../media`, `POST .../session/start`, `GET .../session`, `POST .../steps/attempt`, `POST /quizzes/{id}/submit`, `POST /lessons/{id}/complete` (exist).
Verify: full lesson E2E (intro→…→finish) with XP delta; resume mid-lesson preserves state.

### R5 — Flashcards + practice
- Flashcard list, practice, audio/pronunciation, game launch, QR entry.
- RN today: `flashcardApi.getFlashcard(qrId)` exists (AR entry); flashcard practice UI does not.
- Cursor tasks: flashcard list screen; practice screen (word/translation/audio); game-launch CTA (→ R6 games); QR scan entry (gated on AR lane for AR path; product-level QR entry owned here).
Backend: `GET /flashcard`, `GET /flashcard/category/{category}`, `GET /flashcard/search/{query}`, `GET /flashcard/{qr_id}`, `GET /quiz/{qr_id}`, `GET /game/{qr_id}`, `GET /f/{qr_id}` (public) (exist).
Verify: practice flow parity; audio plays; game launch navigates.

### R6 — Mini-games
- Each learner mini-game on web gets an individual decision (KEEP / ADAPT / WEB_ONLY / DEFER / DECISION_REQUIRED) in the parity matrix — do not assume canvas/DOM implementations port directly. Specify product behavior, not web implementation.
- Likely candidates (from web, to be confirmed in inventory): drag-match, memory-match, pronunciation game, combo-related games.
- Cursor tasks: one task per KEEP/ADAPT game.
Backend: `GET /game/{qr_id}` (exists); quiz submit (exists).
Verify: per-game acceptance criteria in task files.

### R7 — Pronunciation
- Recording/input UX (platform speech: iOS Speech framework via native/expo, Android SpeechRecognizer — **native lifecycle, not Web Speech API**), assessment API, feedback, retry, permissions, fallback behavior (e.g. "skip pronunciation" when mic denied).
- RN today: nothing.
- **DQ-3**: two backend `/pronunciation/evaluate` implementations exist (`pronunciation.py` vs `pronunciation_enhanced.py`) — select canonical.
Backend: `POST /pronunciation/attempt`, `POST /pronunciation/evaluate`, `POST /pronunciation/ai-feedback`, `POST /pronunciation/tts`, `GET /pronunciation/{user_id}/recent` (exist).
Verify: attempt→feedback→retry flow; mic-permission denial shows fallback.

### R8 — Gamification + progress + stickers
- XP, levels, streaks, badges, stickers, rewards, event tracking, leaderboard; **persistent state stays backend-owned** (`/gamification/*`).
- RN today: `useGamification` hook exists but is unused; Home shows XP/streak via `useUser`; no badge/sticker/leaderboard UI.
- Shared XP idempotency utility owned here; AR lane M7 consumes the same contract (coordinate via cross-lane note — do not duplicate).
- Cursor tasks: badge/sticker screens; leaderboard; reward-celebration state machine; `useXpAward` idempotent hook.
Backend: `GET /gamification/user/{user_id}`, `GET /gamification/streak/{user_id}`, `GET /gamification/leaderboard`, `GET /gamification/stickers/*`, `POST /gamification/stickers/collect`, `POST /gamification/award-badge`, `POST /gamification/add-xp` (exist).
Verify: XP/streak persist across app restarts (backend-owned); sticker collect works; leaderboard renders.

### R9 — Pets
- Pet collection, active pet, unlock, feed, play, evolution, pet model/viewer, pet reward notifications. **Separate product requirements from the current React Three Fiber web implementation** — the RN pet module is its own native module (thumbnail/2D viewer first; 3D viewer decision DQ-6; the AR scene's Unity pet stays in the AR lane).
- RN today: `PetsScreen` exists but care stats are hardcoded; feed/play/outfit endpoints are defined but unwired; no evolution UI.
- Cursor tasks (from the courses/pets plan, absorbed): `usePets`, `PetGrid`/`PetCard`, `PetDetailSheet`, `usePetCareState` (+ local decay mirror), `PetCareCard`, `PetOutfitPicker`, `usePetXP`, `PetEvolutionToast`.
Backend: `GET /pets`, `GET /pets/{id}`, `POST /pets/{id}/unlock`, `PUT /pets/active`, `GET /pets/active/current`, `DELETE /pets/active`, `GET /gamification/pet/{user_id}`, `POST /gamification/pet/feed`, `POST /gamification/pet/play`, `POST /gamification/pet/outfit`, `GET /gamification/pet-xp/{user_id}` (exist).
Verify: feed→XP→evolution; unlock conditions enforced server-side; active pet persists.

### R10 — Session management / break lifecycle
- Learning-session start/end, timer, idle detection, warning, hard limit, break/cooldown, background/foreground, learning-route semantics.
- **Native lifecycle must be specified explicitly** — RN uses `AppState` (background/foreground), not browser tab-visibility. Web parity constants: 30-min window, 25-min warning, 5-min cooldown (`frontend-web/src/session/sessionBreakState.ts`).
- RN today: nothing; AR lane M8 owns AR-session pause/resume — **share** the `useAppStateLifecycle` primitive (cross-lane note in R-NEW-5 of the design doc).
- Cursor tasks: pure session state machine (RN port of web `sessionBreakState.ts` with storage via AsyncStorage/SecureStore), warning reducer, break cooldown screen, `AppState` wiring, backend session calls.
Backend: `POST /sessions/start`, `PATCH /sessions/{id}/end`, `GET /sessions/{user_id}/active`, `POST /session-lock/*` (start/heartbeat/pause/resume/end/status), `GET /parental/check-limit/{child_id}` (exist).
Verify: timer warning at 25 min; hard stop at 30 min; 5-min break enforced across background/foreground; reload does not bypass cooldown.

### R11 — Optional AI Chat
- Lexi/RAG chat: **decision-gated (DQ-7)** — product evidence needed before making it mandatory. Default: NOT in initial parity; later phase candidate.
- Backend: `POST /chat/rag`, `POST /chat/message` (exist).
Verify: only after DQ-7 resolves.

### R12 — Native AR product integration
- Owns **entry/navigation/product integration only** (lesson→AR entry, capability gating, AR completion→XP handoff). Native AR engine behavior is `docs/unity_ar/` (M2–M9). Do not duplicate Unity implementation.
- Start gate: AR lane integration gates (Mobile AR plan M2/M3) met.
- See `spec/native-ar-integration.md`.

### R13 / R14 — Android / iOS learner E2E
- Full learner flows on physical devices (the AR lane has its own Android/iOS E2E — M10/M11 — for AR features; these phases cover the learner product).
- Verify: every RN-GATE plus the parity matrix KEEP/ADAPT items on device.

### R15 — Web/mobile learner parity + cutover
- Parity gate: all KEEP/ADAPT items verified; WEB_ONLY/DEFERRED items documented; DECISION_REQUIRED items resolved (DQ-1…DQ-7).
- Cutover decision: when parity = acceptable per product owner (auto at 100% vs approval — DQ-8).
- `frontend-web` remains legacy until cutover.

## Parallelization

- **R1–R11 run in parallel with the Unity lane** (P0–P11) — no hard Unity dependencies.
- R1→R2→R4→R5/R6/R7/R8/R9/R10 dependency spine; R3 can run beside R2; R5/R6/R7/R8/R9/R10 fan out after R4's foundation hook exists (R1 + R4 prerequisites only).
- R12 waits on AR lane integration gates; R13/R14 wait on R1–R12.
- Backend work is limited to confirmed gaps (none known today; `GET /flashcard` list exists, `GET /courses` filters exist via query params — verify in R2).

## Backend reuse rules

1. Identify existing web API usage (inventory).
2. Identify current backend endpoint (inventory).
3. Check whether mobile already has an adapter (`mobile/rn/src/services/api.ts` — most already present).
4. Reuse the backend contract where valid.
5. Create a backend gap only when required behavior cannot be supported → open a blocker in `docs/mobile_migration/blockers/`.

## Cross-system orchestration

- Master orchestration: `docs/unity_ar/plans/2026-08-09-master-orchestration-plan.md` (updated to reference this plan).
- Prior design: `docs/unity_ar/spec/2026-08-09-mobile-product-design.md` (placement superseded; substantive decisions carried forward).
- Prior courses/pets plan (absorbed): `docs/superpowers/plans/2026-07-25-courses-pets-rn-migration-plan.md` — its Phase-0 contract gate, typed-client list, claymorphic token rules, and frozen-path list are inherited.

## Open decisions (DQ)

| # | Decision | Blocks | Owner |
|---|----------|--------|-------|
| DQ-1 | Duplicate animals course implementations — which is CANONICAL vs MERGE_SOURCE vs LEGACY? | R2 | Product |
| DQ-2 | Lesson player family — course-scoped session API (courses.py, already adapted by RN) vs enhanced_lessons.py standalone sessions? Canonical target behavior. | R4 | Product / Architect |
| DQ-3 | Pronunciation — original `/pronunciation/evaluate` vs enhanced `/pronunciation/evaluate` (route shadowed)? | R7 | Backend / Product |
| DQ-4 | Flashcard systems — `/flashcard` CRUD + `/flashcard/{qr_id}` AR experience vs `flashcard_editor` admin editor vs public `/f/{qr_id}` viewer — which is learner canonical? | R5 | Product |
| DQ-5 | Mini-games — per-game KEEP/ADAPT/WEB_ONLY/DEFER (itemized in parity matrix + game-catalog.md) | R6 | Product |
| DQ-6 | **RESOLVED 2026-08-12:** Pet detail uses a native, non-camera GLB viewer for the active pet. Implement with `expo-gl` + `three` + `@react-three/fiber/native`; load the backend `model_url` through the existing `glbCache`; show the existing 2D pet sprite/thumbnail fallback on model download or rendering failure. Unity remains the owner of AR-only pet behavior. | R9 | Product / Architect |
| DQ-7 | AI Chat (Lexi/RAG) — initial parity, later phase, or web-only? (default: later phase) | R11 | Product |
| DQ-8 | Cutover — auto at 100% parity or product-owner approval? | R15 | Product owner |
| DQ-9 | Guest mode product scope — read-only catalog/flashcards only, or also preview lessons? | R1 | Product |
| DQ-10 | Session break semantics — keep web constants (30/25/5) or adjust for mobile? | R10 | Product |
| PRON-DQ-1 | Canonical `/pronunciation/evaluate` endpoint (pronunciation.py vs pronunciation_enhanced.py)? | R7 | Backend / Architect |
| PRON-DQ-2 | Child audio data policy — consent, retention, training eligibility? | PRON-B0 | Product / Legal |
| PRON-DQ-3 | Score band thresholds as config vs hardcoded (default GREAT ≥ 80, GOOD TRY ≥ 50)? | R7 | Product |
| GAME-DQ-1 | Canvas library for ColorLearn (react-native-skia vs SVG vs alternative)? | GAME-3 | Architect |
| GAME-DQ-2 | Sound assets for SoundMatch — who creates/provides? | GAME-5 | Content |
| GAME-DQ-3 | Game difficulty auto-adjustment (easier after N failures)? | All games | Product |

## Risks

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|-----------|
| Duplicate web implementations ported twice | R2/R4/R5/R7 | High | DQ-1…DQ-4 resolved in R0 before implementation |
| Native lifecycle semantics copied from browser code | R10 | High | Specify AppState behavior explicitly; RN pure-state machine + tests |
| Lesson API family ambiguity blocks R4 | R4 | High | DQ-2 resolved in R0; RN already adapts course-scoped API |
| Session break state not persisted across RN restarts | R10 | Medium | AsyncStorage persistence + corrupt-storage validation (mirror web) |
| XP double-award between learner and AR lanes | R8/M7 | High | Shared idempotency contract; cross-lane coordinate |
| Backend gaps discovered late | R2+ | Medium | Inventory-first; gap blockers opened before phase start |
| R12 blocked on Unity gates | R12 | Low | R1–R11 explicitly not blocked; R12 tasks scheduled after gates |
| Pronunciation scoring too strict for children | R7 | High | PRON-A6 score calibration + PRON-A9 pilot eval |
| Child audio privacy policy not defined | PRON-B0 | High | Interim: no audio stored; final policy before PRON-A1 |
| Canvas library unavailable for ColorLearn | GAME-3 | Medium | SVG fallback; GAME-DQ-1 resolves |
| ML compute/resources unavailable for fine-tuning | PRON-A4 | Medium | Start with baseline; upgrade when resources available |
| 3D touch system not implemented in Unity | R12 | Medium | Unity lane owns this; coordinate timing |

## Out of scope

- Unity/native-AR engine behavior (P0–P11, M0–M12 — `docs/unity_ar/`)
- Web product roadmap (`frontend-web` held as legacy)
- Admin dashboard / marketing landing page / public flashcard viewer on mobile (WEB_ONLY — see parity matrix)
- New backend endpoints without a backend-gap blocker

---

## Demo-Critical Path

The demo-critical path shows the priority projection for the upcoming Fable/Cursor demo. This is a coherent learner story that maps to planned capabilities. Clearly label implementation status.

### Demo Story (Fable/Cursor)

```
1. Learner selects "Animals" topic from learning path
     → requires: R3 (Learning Path), R1 (Auth)
2. Opens "Animals Course" → sees lesson cards with progress
     → requires: R2 (Course catalog + detail)
3. Starts lesson → animated interactive flashcard shown
4. Taps card → hears "elephant!" pronunciation + bounce animation
     → requires: R5 (Flashcard tap-to-hear)
5. Plays DragMatch game with 5 vocabulary words
     → requires: R6 (DragMatch game)
6. Practices pronunciation "elephant" → receives AI feedback
     → requires: R7 (Pronunciation with child-friendly scoring)
7. Earns XP → XP toast + sticker collected
     → requires: R8 (Gamification + stickers)
8. Sees pet updated / progress ring filled
     → requires: R9 (Pets, partial)
9. Optional: taps "Practice in AR" → Unity AR opens
     → touch model → animation + sound
     → requires: R12 (Native AR) — DEPENDS ON UNITY GATES
```

### Implementation Status Labels

| Label | Meaning |
|-------|---------|
| IMPLEMENTED | Already exists in codebase (verified) |
| PLANNED | Documented in spec; not yet started |
| BLOCKED | Waiting on external dependency |
| DEMO-MOCKABLE | Can be demonstrated with mock data |
| NOT IN MVP | Future phase / bonus |

### Demo-Critical Mapping

| Step | Capability | Status | Phase |
|------|-----------|--------|-------|
| Auth | Login + register | IMPLEMENTED | R1 |
| Course catalog | List + filters | IMPLEMENTED | R2 |
| Course detail | Enrollment + lesson list | IMPLEMENTED | R2 |
| Learning path | Topic selection | PLANNED | R3 |
| Flashcard | Tap-to-hear + bounce | PLANNED | R5 |
| DragMatch | Game with vocabulary | PLANNED | R6 |
| Pronunciation | Record + AI feedback | PLANNED | R7 |
| Gamification | XP + stickers | PLANNED | R8 |
| Pets | Pet viewer | IMPLEMENTED (partial) | R9 |
| AR | Touch 3D model | PLANNED | R12 |

### Demo Priority

**Phase 1 (Fable ready)**:
- R1 + R2 (existing — login, course catalog, course detail)
- R5 (flashcard tap-to-hear)
- R6 (DragMatch game)
- R8 (gamification XP/sticker display)

**Phase 2 (Fable ready)**:
- R7 (pronunciation with mock/placeholder scoring)
- R3 (learning path topic selection)

**Phase 3 (Unity-dependent)**:
- R12 (AR touch interaction) — BLOCKED on Unity M3+ gates

## Verification gates (RN-GATE)

- RN-GATE-001: `npx tsc --noEmit` exits 0 from `mobile/rn/`
- RN-GATE-002: `npx ts-node mobile/rn/scripts/phase0-smoke.ts` exits 0 against the live backend (exists)
- RN-GATE-003: every Cursor task's acceptance criteria verified + progress entry written
- RN-GATE-004: no frozen-path diffs (`mobile/unity/`, `mobile/rn/src/bridge/**`, `ARScreen.tsx`, `UnityView.tsx`, `PetStatusOverlay.tsx`, `useARSession.ts`, `types/ar.ts`)
- RN-GATE-005: parity matrix KEEP/ADAPT items verified on device (R13/R14)
