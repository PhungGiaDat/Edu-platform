# Scope Expansion: Web → React Native Learner Feature Inventory + Parity + Product Spec

## Session
2026-08-10, agent: claude, branch: MindAR-Update

## Goal
Expand the mobile migration planning scope from Unity AR focus to full React Native learner-product migration. Reconcile existing docs/mobile_migration/ workspace, create missing spec files (web-feature-inventory, parity-matrix, learner-product-spec), and produce the authoritative inventory and plan reference.

## Changed
- `docs/mobile_migration/spec/web-feature-inventory.md` — created (73 features across 13 domains A–O)
- `docs/mobile_migration/spec/learner-parity-matrix.md` — created (full parity matrix with decisions)
- `docs/mobile_migration/spec/learner-product-spec.md` — created (69 MOB-*-REQ requirements)
- `docs/mobile_migration/spec/000-index.md` — updated to reference new spec files with counts

## Verified
- Confirmed docs/mobile_migration/ workspace already existed with R0–R15 phase structure
- Confirmed existing mobile/rn screens: AuthScreen (login-only), CourseListScreen, CourseDetailScreen, LessonPlayerScreen (stub), PetsScreen, ProfileScreen, ARScreen
- Confirmed existing mobile/rn hooks: useAuth, useCourses, useCourseDetail, useGamification, usePets, useUser
- Confirmed existing mobile/rn services: api.ts (full coursesApi, petsApi, gamificationService, flashcardApi, authApi)
- Confirmed frontend-web legacy files: Login, Register, CourseList, CourseDetail, LessonPlayer (standard), AnimalsCourse, AnimalsLessonPlayer, AnimalsAdventure, FlashcardPage, PronunciationGame, DragMatchGame, MemoryMatchGame, CatchWordGame, WordScrambleGame, ColoringGame, ChatInterface, sessionBreakState, GamificationService
- Confirmed backend pronunciation endpoints: api/pronunciation.py, api/pronunciation_enhanced.py
- Confirmed docs/unity_ar/spec/bridge-contract.md exists (shared RN↔Unity contract)
- Confirmed docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md exists (R0–R15 phases)
- Confirmed docs/mobile_migration/plans/2026-08-09-cursor-execution-model.md exists (task template)

## Not Verified
- No task files created in tasks/ (Cursor will create these)
- No actual implementation work (planning only per directive)
- Backend endpoint behavior (must be verified per-task)
- Unity AR integration gates (owned by docs/unity_ar/)

## Specs Touched
- `spec/000-index.md` — updated (added counts)
- `spec/web-feature-inventory.md` — created
- `spec/learner-parity-matrix.md` — created
- `spec/learner-product-spec.md` — created
- `spec/native-ar-integration.md` — referenced (existing)

## Blockers Raised
- None (planning only; blockers will be raised per-task as needed)

## Next Task
The mobile migration workspace is now complete. Cursor can begin executing from tasks/:

**Immediate candidates (no blockers, R1 domain):**
1. `tasks/YYYY-MM-DD-register-screen.md` — add register tab to AuthScreen
2. `tasks/YYYY-MM-DD-course-filters.md` — wire category/level filters to CourseListScreen
3. `tasks/YYYY-MM-DD-course-enrollment.md` — wire enrollment API to CourseDetailScreen

**Early parallel candidates (R2–R3):**
4. `tasks/YYYY-MM-DD-guest-mode.md` — implement guest mode (DQ-9 gates scope)
5. `tasks/YYYY-MM-DD-learning-path-ui.md` — implement Learning Path screens

**Canonical source decisions needed before R2/R4:**
- DQ-1: AnimalsCourse vs AnimalsAdventure (MOB-AUTH-REQ-004 gates R2)
- DQ-2: Standard LessonPlayer vs AnimalsLessonPlayer (MOB-LESSON-REQ-001 gates R4)

## Key Findings

### Existing mobile/rn state
- AuthScreen: login-only (no register)
- CourseListScreen: exists but filters not wired
- CourseDetailScreen: exists but enrollment/resume not wired
- LessonPlayerScreen: stub placeholder
- PetsScreen: hardcoded care stats (API defined but unwired)
- useGamification: exists but unused in screens
- Full coursesApi/petsApi/gamificationService API adapters exist

### Web duplicate classifications (DQ-1)
- AnimalsCourse.tsx: LEGACY (older standalone, hardcoded mascots)
- AnimalsAdventure.tsx: MERGE_SOURCE (data-driven, proper API, correct course_id)
- AnimalsLessonPlayer.tsx: DECISION_REQUIRED (targets wrong course_id)

### Session constants (from web)
- SESSION_LIMIT_SECS = 30 * 60 (30 minutes)
- SESSION_WARNING_SECS = 25 * 60 (25 minutes)
- SESSION_BREAK_SECS = 5 * 60 (5 minutes)

### Pronunciation endpoints (DQ-3)
- backend/api/pronunciation.py — original
- backend/api/pronunciation_enhanced.py — enhanced (route shadowed)
- Web uses hybrid: Web Speech API (primary) + server Whisper (fallback)

### Frozen paths (do not touch)
- mobile/unity/**
- mobile/rn/src/bridge/**
- mobile/rn/src/types/ar.ts, mobile/rn/src/bridge/arMessages.ts
- mobile/rn/src/screens/ARScreen.tsx, mobile/rn/src/hooks/useARSession.ts
- mobile/rn/src/components/UnityView.tsx, mobile/rn/src/components/PetStatusOverlay.tsx
- backend/** (read-only; endpoint reuse only)
- frontend-web/** (legacy; read-only reference)

### AR boundary
- docs/unity_ar/spec/bridge-contract.md: shared RN↔Unity contract (frozen)
- Mobile owns: AR entry button, AR capability gating, XP handoff display
- Unity owns: AR engine, image tracking, combo detection, pet AR scene

## Stats
- Feature domains: 13 (A–M)
- Total features inventoried: 73
- Implementation target: 57 (KEEP + ADAPT + MERGE, excluding WEB_ONLY/DEFER/LEGACY)
- Decision Required: 10
- Requirements documented: 69
- Phases: R0–R15 (already in existing plan)
- Cursor-ready initial tasks: 5 identified
