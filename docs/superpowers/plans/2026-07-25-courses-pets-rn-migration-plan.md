# Courses + Pets React Native Migration Plan

> **Date:** 2026-07-25
> **Status:** Planning — awaiting user approval
> **Goal:** Migrate the existing web **courses** and **pets** features into the React Native iOS app (`mobile/rn/`) on top of the existing FastAPI backend, with the **AR / Unity bridge frozen** and untouched.
> **Companion documents:**
> • `docs/superpowers/plans/2026-07-23-unity-rn-mobile-ar-migration-plan.md` — RN ↔ Unity bridge (frozen baseline; we only *consume* `mobile/rn/src/services/api.ts` + `useAuth` it already shipped).
> • `docs/planner/ENGINE_BUILD_CHECKLIST.md` — tone reference for daily breakdown.
> • `mobile/rn/AGENTS.md` — Expo 57 hard rule (consult https://docs.expo.dev/versions/v57.0.0/ before coding).

---

## Scope, Constraints, and Non-Goals

| Item | Decision | Why |
|------|----------|-----|
| **Scope** | Courses (list, detail, lesson player, session/step progression, quiz submit, lesson completion) **and** Pets (catalog, unlock, active pet, pet care state, pet XP/evolution). | Direct user request. |
| **Frozen — no changes** | `mobile/unity/Assets/**`, `mobile/rn/src/bridge/**`, `mobile/rn/src/bridge/arMessages.ts`, `mobile/rn/src/screens/ARScreen.tsx`, Unity C# scripts, RN↔Unity message contract, `mobile/rn/src/components/UnityView.tsx`, `mobile/rn/src/components/PetStatusOverlay.tsx` (only its public `PetState` is read; existing callers keep working). | User instruction: AR/Unity must not change. |
| **Hard constraints** | RN is **Expo 57** (`expo@~57.0.8`, `react-native@0.86.0`, `react@19.2.3`, `typescript@~6.0.3`). `app.json` does not change for the migration. Auth is real (`useAuth` + `SecureStore`). Backend is untouched — we *only* add typed RN clients and screens. | Existing repo state. |
| **Non-goals (deferred)** | 3D pet rendering (Unity-only path is frozen), offline course downloads, content authoring UI, parent dashboard, push notifications, analytics. | Out of stated scope. |
| **Tone** | Mirror `docs/planner/ENGINE_BUILD_CHECKLIST.md` — daily table, file-level tasks, concrete deliverables, verify step, commit message. | User tone requirement. |
| **Forbidden** | New ar-* modules, new Swift code, new Unity scripts, modifications to `backend/` business logic, new dependency on Supabase, breaking changes to existing RN screens (Home, AR, Auth). | Frozen-scope rule + working app preservation. |
| **Phase gate** | **UI screens may not start until Tasks 0.1–0.7, the Phase-0 contract gate, are signed off.** See §4 below. | Explicit user instruction. |

---

## Design System (mirror the web claymorphic language — no new visual styles)

> **PO directive (2026-07-25):** "All new screens MUST use the same claymorphic style as the web version. Reuse existing RN claymorphic primitives and tokens; do not invent new visual languages."

The RN migration is a **port, not a redesign**. Every new component, screen, and visual element under `mobile/rn/src/screens/*`, `mobile/rn/src/components/*`, and `mobile/rn/src/components/pets/*` must consume the existing claymorphic primitives and the tokens extended in WBS 2.0. Visual flat / glassmorphism / material-default / neumorphism-lite styling is **forbidden** in any new file.

### Existing RN primitives (reuse — do not modify their public API)

| Primitive | Path | Purpose |
|-----------|------|---------|
| `ClayCard` | `mobile/rn/src/components/ClayCard.tsx` | 3-layer claymorphic card (drop + ambient + LinearGradient highlight). Variants `sm` / `md` / `lg`. Color via `COLOR_MAP` keys: `yellow`, `blue`, `green`, `coral`, `white`. |
| `ClayButton` | `mobile/rn/src/components/ClayButton.tsx` | Animated press/lift button via Reanimated `withSpring`. Variants `sm` / `md` / `lg`. Touch targets ≥44 pt. |
| `ClayProgressBar` | `mobile/rn/src/components/ClayProgressBar.tsx` | Animated fill + shimmer. Used for XP, stats, progress, rarities. |
| `ProgressTracker` | `mobile/rn/src/components/ProgressTracker.tsx` | Step-through indicator (lessons, course complete state). |

### Existing tokens (extended in WBS 2.0 — see `mobile/rn/src/design/tokens.ts`)

| Group | Exports | Source in web |
|-------|---------|---------------|
| Brand palette | `COLORS`, `COLOR_MAP`, `Cl       ayColor` | `frontend-web/src/design-tokens/claymorphic.ts` |
| Shadows | `SHADOWS.claySm`, `clayMd`, `clayLg` | `frontend-web/src/design-tokens/claymorphic.ts` shadows |
| Radius | `RADIUS.sm / md / lg / xl` | `frontend-web/src/design-tokens/claymorphic.ts` radius |
| Spacing | `SPACING.xs / sm / md / lg / xl` | web spacing tokens |
| Animation | `ANIMATION.spring`, `ANIMATION.press`, `ANIMATION.floatY`, `ANIMATION.shimmerDuration` | web animations |
| Typography | `FONT.primary`, `FONT.sizes` | web typography |
| **NEW — Brand** | `BRAND.sunshineYellow`, `BRAND.sunshineYellowDark`, `BRAND.sunshineYellowLight`, `BRAND.skyBlue`, `BRAND.skyBlueDark`, `BRAND.skyBlueLight`, `BRAND.mintGreen`, `BRAND.mintGreenDark`, `BRAND.mintGreenLight`, `BRAND.coralPink`, `BRAND.coralPinkDark`, `BRAND.coralPinkLight`, `BRAND.warmWhite`, `BRAND.deepSlate`, `BRAND.mediumGray`, `BRAND.lightGray`, `BRAND.darkBg` | web `colors` |
| **NEW — Pet rarity** | `RARITY_COLORS.common / rare / epic / legendary` (each: `base`, `dark`, `badge`, `glow`, `gradient: [from, to]`) + `PetRarity` type | `frontend-web/src/components/pets/PetCard.tsx` `rarityConfig` |
| **NEW — Pet evolution** | `STAGE_GRADIENTS.baby / child / teen / adult` (each: `from`, `to`, `base`), `EVOLUTION_EMOJI.baby / child / teen / adult` + `PetStage` type | `frontend-web/src/pages/PetsPage.tsx` `STAGE_COLORS` + `STAGE_EMOJI` |
| **NEW — Course category** | `CATEGORY_COLORS.home_family / nature / school_food / animals` (each: `shell`, `border`, `accent`, `accentDark`) + `CourseCategoryKey` type | `frontend-web/src/pages/CourseList.tsx` `pathPalette` |
| **NEW — Pet care stats** | `CARE_STAT_COLORS.happiness / energy / hunger / xp / streak / active / activeMuted` | `frontend-web/src/pages/PetsPage.tsx` `ProgressBar` color props |
| **NEW — Claymorphic tone shadows** | `CLAY_TONE_SHADOWS.yellow / blue / green / pink / white` (each: `offsetY`, `color`) | `frontend-web/src/design-tokens/claymorphic.ts` `shadows.clayYellow / Blue / Green / Pink / White` |
| **NEW — Motion** | `MOTION.duration.{fast, normal, slow, reveal}`, `MOTION.easing.{springBounce, springSubtle, standard}`, `MOTION.loop.{float, shimmer, xpPulse, floatDelay}`, `MOTION.stagger` | web `transitions` + `animations` |
| **NEW — Spring presets** | `CLAYMORPHIC_SPRINGS.buttonPress / cardReveal / modalBounce / toast` | web springBounce / springSubtle timing |
| **NEW — Helper** | `withOpacity(color, opacity)` | web `withOpacity` |

### Web source-of-truth files being mirrored

The RN tokens are a one-way port — when the web file changes, RN updates the corresponding token in the same PR. The web files to mirror (read-only) are:

- `frontend-web/src/design-tokens/claymorphic.ts` — colors, shadows, radius, transitions, animations, helpers
- `frontend-web/src/styles/claymorphic-utilities.css` — `.clay-card`, `.clay-card-elevated`, `.clay-btn`, `.clay-btn-yellow|blue|green|pink|white`, `.clay-progress`, `.clay-stat-card`, `.clay-section-title`, `.clay-cta-primary` / `.clay-cta-secondary`, `.clay-badge-{green,blue,yellow,pink}`, `.clay-icon-bubble{,-mint,-sunshine,-sky,-lavender}`, `.clay-pet-showcase`, `.clay-shimmer`, `.clay-float-element`, `.clay-bg-playful`
- `frontend-web/src/styles/course-catalog.css` — CourseList hero, path cards, stats grid
- `frontend-web/src/pages/CourseList.tsx` — hero composition, `pathPalette`, stat cards, course-card surface
- `frontend-web/src/pages/PetsPage.tsx` — pet hero, gallery grid, `PetCollectionCard`, `StatCard`, `ProgressBar`, `EvolutionModal`, `STAGE_*`, `rarityConfig` import
- `frontend-web/src/components/pets/PetCard.tsx` — `rarityConfig` (4 rarities)
- `frontend-web/src/components/CourseCard.tsx` — course-card surface (CTAs, progress arc, tags)

### Mandatory rules

1. **No raw hex colors** in any new file. Use `COLORS.*`, `BRAND.*`, `RARITY_COLORS[*].*`, `STAGE_GRADIENTS[*].*`, `CATEGORY_COLORS[*].*`, or `CARE_STAT_COLORS.*`.
2. **No raw inline shadows** (`shadowOffset: { … }`). Use `SHADOWS.claySm | clayMd | clayLg` or `CLAY_TONE_SHADOWS[*].*`.
3. **No new visual primitives.** No raw `<View style={{ backgroundColor: '#xxx' }}>`, no `BlurView`, no `LinearGradient` outside the existing ClayCard/ClayButton/ClayProgressBar highlight layers, no `expo-blur`, no `MaterialIcons` defaults in new screens.
4. **Pet rarity color → `RARITY_COLORS[pet.rarity]`** (not hardcoded).
5. **Pet evolution → `STAGE_GRADIENTS[stage]` + `EVOLUTION_EMOJI[stage]`** (not hardcoded).
6. **Course category color → `CATEGORY_COLORS[course.category_key]`** (not hardcoded).
7. **Pet care stat colors → `CARE_STAT_COLORS.{happiness, energy, hunger, xp, streak}`**.
8. **Animation timings → `MOTION.duration.*` / `CLAYMORPHIC_SPRINGS.*`** — do not invent new force/duration values.
9. **No new font families** beyond `FONT.primary` (System). Existing FONT sizes only.
10. **No new shadows** beyond the three in `SHADOWS` plus the five in `CLAY_TONE_SHADOWS`.

### Phase 2 inclusion — tokens + component primitives

Tasks 2.0 and 2.1 of the WBS 2.0 row in `docs/pm-excel/COURSES_PETS_MIGRATION_TRACKER.xlsx` enforce the rules above by gate. New UI screens may not start until:

- `mobile/rn/src/design/tokens.ts` exports `BRAND`, `RARITY_COLORS`, `STAGE_GRADIENTS`, `EVOLUTION_EMOJI`, `CATEGORY_COLORS`, `CARE_STAT_COLORS`, `CLAY_TONE_SHADOWS`, `MOTION`, `CLAYMORPHIC_SPRINGS`, and `withOpacity`.
- `npx tsc --noEmit` exits 0 from `mobile/rn/`.
- A static `grep` over `mobile/rn/src/screens/**` and `mobile/rn/src/components/**` (excluding the clay primitives themselves) returns no raw hex literals.
- The Reviewer subagent's claymorphic checklist (see §12) passes.

### Visual reference (web)

When in doubt, mirror the web component verbatim. Specifically:

- **Hero card** → `CourseList.tsx` hero (`<header class="course-catalog__hero">`)
- **Course card** → `<CourseCard>` (CTAs `Start learning` / `Continue learning`, progress bar, AR/Vocabulary/Fun tags)
- **Path card** → `CourseList.tsx` `pathPalette` button surface (yellow / blue / green / coral shells)
- **Pet collection card** → `PetsPage.tsx` `PetCollectionCard` (clay-card-mint / sky / lavender / sunshine)
- **Pet card (catalog)** → `PetCard.tsx` (rarity gradient + lock overlay + progress bar)
- **Reward modal** → `LessonPlayer.tsx` `RewardCelebration` (clay-card-elevated, scale-up + spring)
- **Evolution modal** → `PetsPage.tsx` `EvolutionModal` (gradient stage background + stage emoji + bounce-in keyframe)
- **Empty state** → `.clay-card-elevated` with centered emoji + title + CTA

### Token-extension deliverable (this PR)

- Added `BRAND`, `RARITY_COLORS`, `STAGE_GRADIENTS`, `EVOLUTION_EMOJI`, `CATEGORY_COLORS`, `CARE_STAT_COLORS`, `CLAY_TONE_SHADOWS`, `MOTION`, `CLAYMORPHIC_SPRINGS`, `withOpacity`, and the type aliases `BrandColor`, `RarityColor`, `CareStatColor`, `ClayTone`, `PetRarity`, `PetStage`, `CourseCategoryKey`.
- No existing export was renamed or removed. Existing `ClayCard`, `ClayButton`, `ClayProgressBar`, `ProgressTracker` consumers compile unchanged.
- `mobile/rn/src/design/tokens.ts` is the only file modified in this PR. No UI screen work has started yet.

---

## 1. Authoritative Backend Contracts (read-only — do NOT modify backend)

These are the contracts the RN migration consumes. Reproduced here so RN work can proceed without re-reading the backend; treat this table as the source of truth.

### 1.1 Courses (already exposed by FastAPI, no new endpoints required)

| RN method | HTTP | Path | Auth | Notes |
|-----------|------|------|------|-------|
| `coursesApi.listCourses(skip,limit)` | `GET` | `/api/v1/courses` | optional | Used by Home + Catalog screens. |
| `coursesApi.getCourse(courseId)` | `GET` | `/api/v1/courses/{course_id}` | optional | Course detail. |
| `coursesApi.getLesson(courseId, lessonId)` | `GET` | `/api/v1/courses/{course_id}/lessons/{lesson_id}` | optional | Lesson content (full `Lesson` payload incl. `vocabulary[]`, `quiz[]`, `videoLesson`, `readAloudStory`, `pronunciation`, `reward`, `arReference`). |
| `coursesApi.getLessonMedia(courseId, lessonId)` | `GET` | `/api/v1/courses/{course_id}/lessons/{lesson_id}/media` | required | `MediaAssetRecord[]` — already-registered Supabase URLs for vocab images, audio, video, scene stills. |
| `coursesApi.startCourse(courseId)` | `POST` | `/api/v1/courses/{course_id}/start` | required | Returns `UserProgress` (creates if missing). |
| `coursesApi.startLessonSession(courseId, lessonId)` | `POST` | `/api/v1/courses/{course_id}/lessons/{lesson_id}/session/start` | required | Returns `LessonSession` (auto-unlocks step 0). |
| `coursesApi.getLessonSession(courseId, lessonId)` | `GET` | `/api/v1/courses/{course_id}/lessons/{lesson_id}/session` | required | Re-fetches and **normalizes** against current lesson blueprint. |
| `coursesApi.submitLessonStep(courseId, lessonId, payload)` | `POST` | `/api/v1/courses/{course_id}/lessons/{lesson_id}/steps/attempt` | required | `LessonStepAttemptPayload` (see 1.2). |
| `coursesApi.submitQuiz(courseId, lessonId, answers)` | `POST` | `/api/v1/quizzes/{lesson_id}/submit` | required | Returns `QuizSubmitResult`. |
| `coursesApi.completeLesson(courseId, lessonId, stats)` | `POST` | `/api/v1/lessons/{lesson_id}/complete` | required | Accepts `{score, timeSpent, wordsLearned, pronunciationScores, gamesPlayed}`. Awards XP + checks sticker milestones. |
| `coursesApi.getProgress(userId)` | `GET` | `/api/v1/users/{user_id}/progress` | required (self) | `UserProgress[]`. |
| `coursesApi.getStreak()` | `GET` | `/api/v1/gamification/streak/{user_id}` | required (self) | `current_streak`, `longest_streak`, `minutes_today`. |
| `coursesApi.getUserStats()` | `GET` | `/api/v1/gamification/user/{user_id}` | required (self) | XP, level, badges, streak, **embedded pet care state**. |
| `coursesApi.addXp(action, metadata)` | `POST` | `/api/v1/gamification/add-xp` | required | XP action (used for non-lesson rewards like `pet_fed`). |

### 1.2 Lesson session step state machine (must mirror)

Step IDs are **derived server-side** by `_lesson_step_blueprint()` in `backend/services/course_service.py`:

```
videoLesson → watch → (story, if scenes)
game        → game
vocabulary  → words
readAloud   → read
pronunciation → say
quiz        → quiz
finish      → finish (always last, gates complete_lesson)
```

Step `LessonStepStatus = locked | available | in_progress | needs_retry | completed`. The RN `LessonPlayerScreen` must mirror this ordering and gate "next" button on `next.status !== 'locked'`.

`submit_lesson_step` server rules (must validate client-side):
- `passed === true` ⇒ `score >= 70` (else 400).
- `mastery_words` must all be lowercased members of `lesson.vocabulary[].word_en` (else 400).
- Step must equal `session.current_step_id` (else 400).

### 1.3 Pets (already exposed by FastAPI)

| RN method | HTTP | Path | Auth | Notes |
|-----------|------|------|------|-------|
| `petsApi.listPets({category?, rarity?})` | `GET` | `/api/v1/pets` | required | `PetListResponse {pets: PetResponse[], stats: PetStats}`. Cached server-side 10 min when no filters. |
| `petsApi.getPet(petId)` | `GET` | `/api/v1/pets/{pet_id}` | required | Single pet with user flags. |
| `petsApi.unlockPet(petId)` | `POST` | `/api/v1/pets/{pet_id}/unlock` | required | 403 if `can_unlock=false` (XP/streak/achievement not met). |
| `petsApi.setActivePet(petId)` | `PUT` | `/api/v1/pets/active` body `{pet_id}` | required | 403 if pet not in `user.unlocked_pets`. |
| `petsApi.getActivePet()` | `GET` | `/api/v1/pets/active/current` | required | `PetResponse | null`. |
| `petsApi.clearActivePet()` | `DELETE` | `/api/v1/pets/active` | required | Soft-clears; AR side consumes `onActivePetChanged` event. |
| `petsApi.getPetCareState()` | `GET` | `/api/v1/gamification/pet/{user_id}` | required (self) | Returns the gamification pet state (happiness, hunger, energy, mood, last_care_at, last_mood_update, needs_attention, animation_clip). |
| `petsApi.feedPet()` | `POST` | `/api/v1/gamification/pet/feed` | required | Increases happiness, +5 XP user, +5 pet XP, may evolve. |
| `petsApi.playWithPet()` | `POST` | `/api/v1/gamification/pet/play` | required | +15 happiness, +8 XP user, +8 pet XP, may evolve. |
| `petsApi.changePetOutfit(outfit)` | `POST` | `/api/v1/gamification/pet/outfit` body `{outfit}` | required | Validated against whitelist `["none","crown","wizard_hat","superhero_cape","party_hat","glasses","bowtie"]`. |
| `petsApi.getPetXP()` | `GET` | `/api/v1/gamification/pet-xp/{user_id}` | required (self) | `{xp, stage, progress: {current_stage, current_xp, progress_percentage, xp_to_next_stage, next_stage, next_stage_threshold}}`. |

### 1.4 Type mapping table (RN types must be added — see §2)

| Backend field | RN TS field | Notes |
|---------------|-------------|-------|
| `course.course_id` | `Course.course_id` | **MUST** be `course_id` (web uses `course_id`, RN mock used `id` — see Migration Note A). |
| `lesson.lesson_id` | `Lesson.lesson_id` | Same reason — RN mock used `id`. |
| `PetDocument.pet_id` | `Pet.pet_id` | Snake-case keys throughout. |
| `UserProgress.lesson_progress[]` | mirror | Status enum identical. |
| `LessonSession.steps[]` | mirror | `LessonStepStatus` enum identical. |
| `UnlockCondition` | `UnlockCondition` | `type` ∈ `free\|xp\|streak\|achievement\|purchase`. |
| Gamification pet state fields | `PetCareState` | Snake-case → camelCase at the RN boundary (see Task 3.4). |

---

## 2. Phase-0 Contract Gate (MUST complete before any UI screen work)

**Goal:** Lock the RN contracts, drop the current mock, expose the new typed clients, and prove them against a live backend. The **Design System** section defines the visual contract every screen must follow. UI screens may not start until the gate passes AND the WBS 2.0 token extension is merged.

### 2.1 Tasks (Phase 0)

| # | Task | File | Est. | Deliverable |
|---|------|------|------|-------------|
| 0.1 | Replace `mobile/rn/src/types/api.ts` with the canonical types (Course, Lesson, LessonSession, UserProgress, LessonStepStatus, QuizSubmitResult, MediaAssetRecord, Pet, PetListResponse, PetStats, UnlockPetResponse, UnlockCondition, PetCareState, UserStats, StreakData, AddXpRequest/Response). Re-export from the same file path so the rest of the tree imports `from '../types/api'`. | `mobile/rn/src/types/api.ts` | 90 min | One file replaces the current 4-interface stub. |
| 0.2 | Add `petsApi` (11 methods listed in §1.3) and the new course endpoints (`getCourse`, `getLesson`, `getLessonMedia`, `startCourse`, `startLessonSession`, `getLessonSession`, `submitLessonStep`, `submitQuiz`, `completeLesson`, `getProgress`, `getStreak`, `getUserStats`, `addXp`) to `mobile/rn/src/services/api.ts`. Keep `authApi`, `flashcardApi`, `arConfigApi` byte-identical to today. | `mobile/rn/src/services/api.ts` | 90 min | All 11+13 = 24 methods exported. |
| 0.3 | Add `mobile/rn/src/services/mappers.ts` with two pure helpers: `mapPetResponse()` (snake→camel for `model_url`, `texture_url`, `thumbnail_url`, `unlock_condition`, `is_unlocked`, `is_active`, `can_unlock`) and `mapPetCareState()` (snake→camel for `last_care_at`, `last_mood_update`, `needs_attention`, `animation_clip`). Keep snake keys exposed too via `PetCareStateRaw`. | new `mobile/rn/src/services/mappers.ts` | 45 min | Unit-testable pure functions. |
| 0.4 | Add `mobile/rn/src/hooks/useUser.ts` — single source of truth for `{userId, stats, streak, activePet, refresh()}`. Pulls from `petsApi.getActivePet()`, `coursesApi.getUserStats()`, `coursesApi.getStreak()` in parallel. Memoized; handles 401 by clearing token via existing `useAuth` callback. | new `mobile/rn/src/hooks/useUser.ts` | 60 min | Hook returns the joined view the rest of the app will read. |
| 0.5 | Update `HomeScreen.tsx` to remove the hardcoded `MOCK_USER_XP`. Wire XP/level to `useUser().stats`. Switch the lesson card onPress to **not** navigate directly to `AR` (Phase 1+ will route to `LessonPlayer`). For now keep the existing AR nav, but consume the new `Course.course_id` / `Lesson.lesson_id` fields. **Do not** break the existing flow. | `mobile/rn/src/screens/HomeScreen.tsx` | 60 min | Home screen compiles; real XP shown; existing AR nav still works. |
| 0.6 | Add the **Phase-0 smoke test** at `mobile/rn/scripts/phase0-smoke.ts` (executed by `npx ts-node scripts/phase0-smoke.ts` against `EXPO_PUBLIC_API_URL`). Asserts: login → list courses → list pets → get active pet (may be null) → get lesson session for the seeded course → submit one step → fail fast with a non-zero exit if any payload doesn't match the new types. | new `mobile/rn/scripts/phase0-smoke.ts` | 60 min | Script exits 0 against the live backend. |
| 0.7 | Add `mobile/rn/scripts/__snapshots__/phase0-baseline.json` capturing the current `/api/v1/courses` and `/api/v1/pets` responses so we have a frozen baseline to compare against Phase 4 polish work. | new snapshot | 20 min | Snapshot committed. |
| 0.8 | **Design System token extension (WBS 2.0)**. Port `BRAND`, `RARITY_COLORS`, `STAGE_GRADIENTS`, `EVOLUTION_EMOJI`, `CATEGORY_COLORS`, `CARE_STAT_COLORS`, `CLAY_TONE_SHADOWS`, `MOTION`, `CLAYMORPHIC_SPRINGS`, and `withOpacity` into `mobile/rn/src/design/tokens.ts`. No existing export renamed or removed. | `mobile/rn/src/design/tokens.ts` | 30 min | `npx tsc --noEmit` exits 0; every new export typed; pre-merged into this plan as the gated deliverable. |

### 2.2 Phase-0 Gate Checklist (must all be ✓ before Phase 1 starts)

- [ ] `npx tsc --noEmit` passes from `mobile/rn/`.
- [ ] `npx ts-node scripts/phase0-smoke.ts` exits 0 against the configured backend.
- [ ] No reference to `MOCK_USER_XP` anywhere in `mobile/rn/src/`.
- [ ] No file under `mobile/rn/src/` imports from `backend/` or `frontend-web/`.
- [ ] `git diff` against the frozen `AR/Unity` modules is empty.
- [ ] Manual QA: Home screen shows the seeded courses (momo_nature) with real XP pulled from `getUserStats`.
- [ ] **Design System** section merged: `mobile/rn/src/design/tokens.ts` exports `BRAND`, `RARITY_COLORS`, `STAGE_GRADIENTS`, `EVOLUTION_EMOJI`, `CATEGORY_COLORS`, `CARE_STAT_COLORS`, `CLAY_TONE_SHADOWS`, `MOTION`, `CLAYMORPHIC_SPRINGS`, and `withOpacity`; the existing `ClayCard` / `ClayButton` / `ClayProgressBar` / `ProgressTracker` public API is unchanged.
- [ ] **Claymorphic Rule-0 grep** passes: `rg -n "'#[0-9a-fA-F]{3,6}'" mobile/rn/src` returns hits only in `design/tokens.ts`, `ClayCard.tsx`, `ClayButton.tsx`, `ClayProgressBar.tsx`. The capture deck is documented in the plan's Design System section.

### 2.3 Migration Note A — `course_id` vs `id` (must fix in 0.1)

Today `mobile/rn/src/types/api.ts` exposes `Course.id` / `Lesson.id`, but the backend uses `course_id` / `lesson_id` and **the existing `HomeScreen` already passes `course.id` directly to `/courses/{course_id}`** (this is a latent bug masked by the mock). Phase 0 fixes this once, here. After 0.1 lands, *every* downstream file must use `course_id` / `lesson_id`.

---

## 3. Phased Implementation (20 working days, AR/Unity frozen)

### Phase 1 — RN Course Foundation (Days 1–4, Mon Jul 27 → Thu Jul 30)

**Goal:** Course list → course detail → lesson session creation with mocked step progression. AR route becomes a fallback "deep-link" stub still pointing at `ARScreen`.

| # | Task | File | Est. | Verify |
|---|------|------|------|--------|
| 1.1 | Build `CourseListScreen` (route: `Courses`) using `coursesApi.listCourses`. Render `ClayCard` grid with thumbnail, title, lesson count, age range, total XP. Pull-to-refresh + clay loading skeleton. | new `mobile/rn/src/screens/CourseListScreen.tsx` | 90 min | Renders seeded courses; refresh works. |
| 1.2 | Build `CourseDetailScreen` (route: `CourseDetail`, param `courseId`) with hero card + lesson list + start/resume CTA. Reuses `ClayCard`. Use `coursesApi.getCourse` + `coursesApi.getProgress` in parallel. | new `mobile/rn/src/screens/CourseDetailScreen.tsx` | 120 min | Resume shows correct "continue" CTA when progress exists. |
| 1.3 | Build `LessonCard` component with completion state, step indicator (locked dot for `status === 'locked'`, glowing dot for `in_progress`), vocabulary/quiz counts. | new `mobile/rn/src/components/LessonCard.tsx` | 45 min | Renders all 5 statuses correctly per web parity. |
| 1.4 | Add new routes to `RootStackParamList` and `AppNavigator`: `Courses`, `CourseDetail`, `LessonPlayer`. HomeScreen becomes the auth gate + tab bar (or a launcher card). | `mobile/rn/src/navigation/AppNavigator.tsx` | 45 min | Stack nav works, AR route still functions. |
| 1.5 | Wire `HomeScreen` → `Courses` (replace mock course list display with the `Courses` button + a "Welcome {username}" card using `useUser()`). | `mobile/rn/src/screens/HomeScreen.tsx` | 30 min | Existing AR launch path still works. |
| 1.6 | Add a `CourseProgressRing` clay component (compact radial progress) used on `CourseListScreen` and `CourseDetailScreen`. | new `mobile/rn/src/components/CourseProgressRing.tsx` | 45 min | Renders 0–100 % correctly with `ClayProgressBar` fallback. |

**Day-1 verify:** Open app, log in, tap Courses → see seeded courses → tap one → see lesson list → tap lesson → still ends up in `ARScreen` (existing flow). **Commit:** `feat(rn): courses list + detail screens (frozen AR fallback)`.

### Phase 2 — Lesson Player Session Engine (Days 5–9, Fri Jul 31 → Tue Aug 4)

**Goal:** Replicate `frontend-web/src/pages/LessonPlayer.tsx` for the steps that **do not require** Unity (intro/watch, vocabulary, read-aloud, pronunciation text input, quiz, finish/reward). Unity-bound lesson content (e.g. live AR practice step) keeps the existing `ARScreen` deep-link via a "Practice in AR" button that only appears when `lesson.arReference?.ar_tag` exists.

| # | Task | File | Est. | Verify |
|---|------|------|------|--------|
| 2.1 | `LessonPlayerScreen` scaffold with `useLessonSession(courseId, lessonId)` hook. Hook handles: start-on-mount → normalize via `getLessonSession` → expose `{session, lesson, activeStep, advance(passed, score, responseData, masteryWords)}`. | new screen + new hook | 180 min | Re-entering a lesson preserves progress; closing mid-lesson does not lose state. |
| 2.2 | `StepNav` clay component (pill row showing all step IDs from blueprint; locked steps greyed, current step pulsing). | new `mobile/rn/src/components/StepNav.tsx` | 60 min | Step locking respected; tap a locked step is no-op. |
| 2.3 | Step renderer — `WatchStep` (play video via `expo-av`), `VocabStep` (gallery + per-word "Mark mastered" toggle using `lesson.vocabulary[]` images from `getLessonMedia`), `ReadStep` (paginated text with highlighted words; "Read aloud" placeholder button that records no audio yet but advances the step — full pronunciation check is **deferred**), `QuizStep` (image-choice quiz using `lesson.quiz[]`), `FinishStep` (calls `completeLesson`). | new folder `mobile/rn/src/screens/lesson/steps/*.tsx` (6 files) | 240 min | End-to-end lesson flow: watch → vocab → read → quiz → finish → returns to course detail. |
| 2.4 | `submitLessonStep` wrapper that validates `score >= 70` before sending and rejects unknown `mastery_words` locally — surface 400 errors as a clay toast. | in `useLessonSession` | 30 min | Misuse shows inline error; correct attempt advances. |
| 2.5 | `RewardCelebration` clay modal triggered by `lesson.reward` (XP delta, sticker emoji from `lesson.reward.sticker.path`, badge title). Reanimated scale-up + spring. | new `mobile/rn/src/components/RewardCelebration.tsx` | 60 min | Animates and persists across re-render. |
| 2.6 | Replace the lesson card onPress in `CourseDetailScreen` to navigate to `LessonPlayer` (instead of `AR`). Add a secondary "Practice in AR" clay button when `lesson.arReference?.ar_tag` is present — this is the only place that touches the frozen AR path, via the existing `navigation.navigate('AR', {lessonId, lessonTitle})`. | `mobile/rn/src/screens/CourseDetailScreen.tsx` | 30 min | AR button only appears on AR-tagged lessons; non-AR lessons never route to AR. |
| 2.7 | Hook `useLessonSession` writes to the `course-progress-changed` event bus (a simple `MobileEventBus` in `mobile/rn/src/services/eventBus.ts`) so `CourseListScreen` and `CourseDetailScreen` invalidate cached progress without prop-drilling. | new `mobile/rn/src/services/eventBus.ts` + emitter inside hook | 30 min | Pull-to-refresh on CourseList works without re-login. |

**Day-5 verify:** Complete one full seeded lesson, see XP added to `useUser().stats` (no reload needed). **Commit:** `feat(rn): lesson player session engine + step renderers`.

### Phase 3 — Pet Catalog + Active Pet (Days 10–14, Wed Aug 5 → Sun Aug 9)

**Goal:** Mirror `frontend-web/src/pages/PetsPage.tsx` and `usePets.ts` for catalog browse, unlock, and active-pet selection. **3D pet rendering stays in Unity** — the RN screen shows `pet.thumbnail_url` only.

| # | Task | File | Est. | Verify |
|---|------|------|------|--------|
| 3.1 | `usePets(userId)` hook (RN port of web's hook). Returns `{pets, activePet, stats, isLoading, error, recentlyUnlocked, fetchPets, fetchActivePet, unlockPet, setActivePet, clearActivePet, getPetById, getPetsByCategory, getPetsByRarity, getUnlockedPets, getUnlockablePets, getUnlockProgress}`. Uses the `petsApi` from §0.2. | new `mobile/rn/src/hooks/usePets.ts` | 120 min | Lists the 3 admin-seeded pets with correct unlock flags. |
| 3.2 | `PetGrid` component — 2-column grid of `PetCard`s with category/rarity filter chips (clay style). | new `mobile/rn/src/components/pets/PetGrid.tsx` | 90 min | Filter chips correctly hide locked pets when "Unlocked" selected. |
| 3.3 | `PetCard` component — rarity badge (🥉🥈🏵️👑), thumbnail, lock overlay with unlock-condition text ("Need 500 XP", "Need 7 Day Streak", "Free!"). Mirrors web `PetCard.tsx` minus the 3D viewer button. | new `mobile/rn/src/components/pets/PetCard.tsx` | 90 min | Locked pet shows correct requirement copy. |
| 3.4 | `PetDetailSheet` (bottom-sheet clay) showing pet name EN+VI, description, unlock condition progress bar, [Set as Companion] button (only if unlocked + not active). | new `mobile/rn/src/components/pets/PetDetailSheet.tsx` | 75 min | "Set as Companion" calls `setActivePet` and dismisses with a clay checkmark. |
| 3.5 | `PetsScreen` (route `Pets`). Composes `PetGrid` + filter bar + sticky header with active pet thumbnail + XP/level/streak from `useUser`. | new `mobile/rn/src/screens/PetsScreen.tsx` | 90 min | Pulls active pet from server; handles null gracefully. |
| 3.6 | `PetUnlockToast` — clay toast triggered by `unlockPet` success. Shows pet thumbnail + rarity for 3 s. | new `mobile/rn/src/components/pets/PetUnlockToast.tsx` | 30 min | Visual only; no AR celebration (AR path is frozen). |
| 3.7 | Add `Pets` route to `AppNavigator`. Add a "Pets" clay button card on `HomeScreen` (sibling to the "Courses" card). | nav + HomeScreen edits | 20 min | Tap "Pets" navigates to `PetsScreen`. |
| 3.8 | Wire `usePets` to the `eventBus` from 2.7: when `petsApi.listPets` is called from `HomeScreen` (e.g. after a lesson complete emits XP delta), PetsScreen invalidates its grid. | hook + emitter | 20 min | Complete a lesson, return to Pets → XP-driven unlocks reflect. |

**Day-10 verify:** Open Pets screen → see all pets (some locked) → unlock a free pet → tap "Set as Companion" → `getActivePet` returns that pet on next app launch. **Commit:** `feat(rn): pets catalog + active pet screen`.

### Phase 4 — Pet Care + Evolution (Days 15–17, Mon Aug 10 → Wed Aug 12)

**Goal:** Care state (happiness/hunger/energy/mood), feed & play actions, evolution progress. RN never animates the 3D pet — `usePetCareState` mirrors the backend's `_hydrate_pet_state` summary and updates it locally between server fetches.

| # | Task | File | Est. | Verify |
|---|------|------|------|--------|
| 4.1 | `usePetCareState(userId)` hook — wraps `petsApi.getPetCareState()` and adds an in-memory decay loop (mirrors server `_hydrate_pet_state` math: every 15 min, +6 hunger, -3 happiness, +4 energy). Exposes `feed()`, `play()`, `outfit(outfit)` actions. | new `mobile/rn/src/hooks/usePetCareState.ts` | 120 min | Math matches server snapshots within 1 unit after 30 min idle. |
| 4.2 | `PetCareCard` (clay) showing the three stat bars + mood emoji + `last_action`. Lives on `PetsScreen` below active pet card. | new `mobile/rn/src/components/pets/PetCareCard.tsx` | 60 min | Bars animate via Reanimated 4.5; bars reach 100% after several feeds. |
| 4.3 | Outfit picker — simple clay chip row listing the 7 allowed outfits (none/crown/wizard_hat/superhero_cape/party_hat/glasses/bowtie). Disabled when pet mood is "sleeping". | new `mobile/rn/src/components/pets/PetOutfitPicker.tsx` | 60 min | Invalid outfit returns 400 → toast shown. |
| 4.4 | `usePetXP(userId)` hook — pulls `petsApi.getPetXP()` + `petsApi.addXp('pet_care', {pet_id})` after a successful feed/play. Local store invalidates `usePets` via eventBus. | new `mobile/rn/src/hooks/usePetXP.ts` | 45 min | Baby → Child transition fires after 100 pet XP. |
| 4.5 | Evolution modal — clay toast that surfaces `stage` change (baby 🥚 → child 🐣 → teen 🦋 → adult 🌟). | new `mobile/rn/src/components/pets/PetEvolutionToast.tsx` | 45 min | Modal triggers exactly once per stage change. |

**Day-15 verify:** Feed pet 20 times → pet crosses 100 XP → baby → child evolution toast shows once. **Commit:** `feat(rn): pet care state, feed/play, evolution`.

### Phase 5 — Polish, Empty States, Localization Hooks (Days 18–19, Thu Aug 13 → Fri Aug 14)

**Goal:** UX parity with the web app, minus 3D viewer. Empty/error/loading states for every screen. Reduced-motion + accessibility labels.

| # | Task | File | Est. | Verify |
|---|------|------|------|--------|
| 5.1 | Empty-state clay cards (no courses published, no pets unlocked yet, no progress yet). | new folder `mobile/rn/src/components/Empty*.tsx` (4 files) | 60 min | Each screen renders empty state cleanly. |
| 5.2 | Error-state clay toast component using `ClayButton` + `COLORS.error`. Wire to global axios interceptor that already exists. | new `mobile/rn/src/components/ErrorToast.tsx` | 45 min | 500 from backend → toast visible + does not crash app. |
| 5.3 | Reduced-motion respect — wrap all `Reanimated` transitions with `useReducedMotion()` equivalent (already in Expo). | edits to `RewardCelebration`, `PetEvolutionToast`, `PetUnlockToast` | 30 min | iOS reduce-motion toggle honored. |
| 5.4 | VoiceOver / TalkBack labels on every interactive clay element (`accessibilityRole`, `accessibilityLabel`). Pass RN's lint via `npx eslint mobile/rn/src --ext .ts,.tsx`. | global audit | 60 min | `eslint` passes with `--max-warnings 0`. |
| 5.5 | Wire `eventBus` to also expose typed events: `lessonComplete`, `petUnlocked`, `petEvolved`, `xpDelta` — so future screens (badges, leaderboard) can subscribe. | `eventBus.ts` + `types.ts` | 30 min | Bus exposes a typed API. |
| 5.6 | Update `HomeScreen` to read `useUser().stats` for XP/level (already wired in Phase 0) **and** show a streak chip + active pet thumbnail strip (tap → goes to Pets). | `HomeScreen.tsx` | 30 min | Home shows streak and active pet. |

**Day-18 verify:** Run through every empty/error/loading state and document with screenshots in `docs/superpowers/plans/2026-07-25-courses-pets-screenshots/`. **Commit:** `feat(rn): polish, empty states, a11y`.

### Phase 6 — Final QA, Snapshot Update, Sign-off (Day 20, Sat Aug 15)

| # | Task | File | Est. | Verify |
|---|------|------|------|--------|
| 6.1 | Re-run `phase0-smoke.ts` and refresh `phase0-baseline.json` to capture any contract drift. | snapshot + script | 15 min | Baseline matches live backend within reason. |
| 6.2 | Full manual QA walkthrough on the Expo Go iOS dev build: login → courses → detail → lesson end-to-end → pets → unlock → set active → feed → play → evolution. Capture each screen to `docs/superpowers/plans/2026-07-25-courses-pets-screenshots/`. | manual | 120 min | All flows green; screenshots committed. |
| 6.3 | `git diff` against the frozen `AR/Unity` module (`mobile/unity/`, `mobile/rn/src/bridge/`, `mobile/rn/src/components/UnityView.tsx`, `mobile/rn/src/components/PetStatusOverlay.tsx`) must be empty. Add a CI guard if not already present. | repo | 20 min | `git diff --stat main -- .../frozen-paths` returns 0 lines. |
| 6.4 | Update `mobile/rn/README.md` with a "Courses & Pets migration" section: new routes, new hooks, frozen-scope rule, how to run the smoke test. | doc | 45 min | README renders correctly. |
| 6.5 | Final commit + tag `v0.8-courses-pets-rn` per project convention. | git | 5 min | Tag pushed. |

**Day-20 verify:** All gates green; tag published. **Commit:** `docs(rn): migration sign-off + screenshots`.

---

## 4. The Phase-0 Gate (re-emphasized)

No UI screen work in Phase 1–6 may begin until:

1. Task 0.1 (`types/api.ts` overhaul) is merged.
2. Task 0.2 (`petsApi` + new course endpoints) is merged.
3. Task 0.3 (`mappers.ts`) is merged.
4. Task 0.4 (`useUser.ts`) is merged.
5. Task 0.5 (HomeScreen rewires off the mock) is merged.
6. Task 0.6 (`phase0-smoke.ts`) exits 0 against the live backend.
7. Task 0.7 (snapshot baseline) is committed.

**Rationale:** the new types and clients are the shared substrate; starting screens before they exist will force rewrite churn later.

---

## 5. Dependencies & Prerequisites

| Dep | Type | Notes |
|-----|------|-------|
| `expo@~57.0.8`, `react-native@0.86.0`, `react@19.2.3` | already installed | No dependency changes. |
| `expo-secure-store@~57.0.1` | already installed | Used by existing `useAuth`. |
| `react-native-reanimated@4.5.0` | already installed | For clay toast + celebration animations. |
| `react-native-svg@15.15.4` | already installed | For `CourseProgressRing` and stat bars. |
| `@react-navigation/native-stack@^7.18.5` | already installed | New routes added to existing stack. |
| **None new.** | — | — |

If we discover we need `expo-av` for video playback in `WatchStep`, add it as a single line in `package.json` at the start of Phase 2 and re-verify the smoke test.

---

## 6. Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|-----------|
| R-1 | **AR/Unity path accidentally modified** | Medium | High (out of scope, breaks demo) | Add a CI guard (Task 6.3) that fails the build on any diff under `mobile/unity/` or `mobile/rn/src/bridge/`. Use `git diff --stat` in a pre-merge check. |
| R-2 | **Backend contract drift between phases** | Medium | Medium | Phase-0 smoke test re-run at Day 20 + baseline snapshot comparison in Task 6.1. |
| R-3 | **`course_id` vs `id` regression** | High at first, decreasing | High (existing HomeScreen would crash on a real course) | Migration Note A in §2.3 is a one-time fix; covered by Phase-0 smoke test (Task 0.6) which asserts the live payload shape. |
| R-4 | **Pet care state drift (client vs server hydration math)** | Medium | Low | Local decay math in `usePetCareState` mirrors `_hydrate_pet_state` exactly; periodic server pull every 5 min while screen is open. |
| R-5 | **Reanimated babel plugin already configured?** | Low | High | Verify by spinning up a small test animation on Day 1 before any UI work. If missing, add `react-native-reanimated/plugin` to `babel.config.js`. |
| R-6 | **`expo-secure-store` not available on web target** | Low | Low | Plan targets iOS via Expo Go / prebuild — web out of scope; if a web smoke check fails, skip Task 0.6 on web. |
| R-7 | **Phase-0 smoke test cannot reach live backend during CI** | Medium | Medium | Provide a local backend mock fixture at `mobile/rn/__fixtures__/courses-pets.json` so Task 0.6 can run with `EXPO_PUBLIC_API_URL=http://localhost:8000` *or* `--mock-fixture`. |
| R-8 | **3D pet "evolution" cannot be expressed in RN** | Low | Low | Out of scope — only the textual stage emoji + clay modal is shown. The Unity bridge already emits `onPetStateChanged` (frozen) which is unaffected. |
| R-9 | **Asset URL expiration** | Low | Low | All lesson media URLs go through `getLessonMedia` which always returns current signed URLs. |

---

## 7. Concrete File Inventory (post-plan)

```
mobile/rn/
├── src/
│   ├── types/
│   │   └── api.ts                 (rewritten, Task 0.1)
│   ├── services/
│   │   ├── api.ts                 (extended, Task 0.2)
│   │   ├── mappers.ts             (new, Task 0.3)
│   │   └── eventBus.ts            (new, Tasks 2.7, 5.5)
│   ├── hooks/
│   │   ├── useAuth.ts             (unchanged)
│   │   ├── useUser.ts             (new, Task 0.4)
│   │   ├── useLessonSession.ts    (new, Task 2.1)
│   │   ├── usePets.ts             (new, Task 3.1)
│   │   ├── usePetCareState.ts     (new, Task 4.1)
│   │   └── usePetXP.ts            (new, Task 4.4)
│   ├── screens/
│   │   ├── HomeScreen.tsx         (rewired, Tasks 0.5, 1.5, 5.6)
│   │   ├── AuthScreen.tsx         (unchanged)
│   │   ├── ARScreen.tsx           (FROZEN — do not touch)
│   │   ├── CourseListScreen.tsx   (new, Task 1.1)
│   │   ├── CourseDetailScreen.tsx (new, Task 1.2)
│   │   ├── LessonPlayerScreen.tsx (new, Task 2.1)
│   │   ├── PetsScreen.tsx         (new, Task 3.5)
│   │   └── lesson/
│   │       └── steps/             (6 files, Task 2.3)
│   ├── components/
│   │   ├── ClayCard.tsx           (unchanged)
│   │   ├── ClayButton.tsx         (unchanged)
│   │   ├── ClayProgressBar.tsx    (unchanged)
│   │   ├── CourseProgressRing.tsx (new, Task 1.6)
│   │   ├── LessonCard.tsx         (new, Task 1.3)
│   │   ├── PetStatusOverlay.tsx   (FROZEN — do not touch)
│   │   ├── ProgressTracker.tsx    (unchanged)
│   │   ├── RewardCelebration.tsx  (new, Task 2.5)
│   │   ├── StepNav.tsx            (new, Task 2.2)
│   │   ├── Empty.tsx …            (new, Task 5.1)
│   │   ├── ErrorToast.tsx         (new, Task 5.2)
│   │   └── pets/
│   │       ├── PetGrid.tsx        (new, Task 3.2)
│   │       ├── PetCard.tsx        (new, Task 3.3)
│   │       ├── PetDetailSheet.tsx (new, Task 3.4)
│   │       ├── PetUnlockToast.tsx (new, Task 3.6)
│   │       ├── PetCareCard.tsx    (new, Task 4.2)
│   │       ├── PetOutfitPicker.tsx(new, Task 4.3)
│   │       └── PetEvolutionToast.tsx (new, Task 4.5)
│   ├── navigation/
│   │   └── AppNavigator.tsx       (extended, Tasks 1.4, 3.7)
│   ├── design/
│   │   └── tokens.ts              (unchanged — re-use existing)
│   ├── bridge/                    (FROZEN — do not touch)
│   ├── hooks/useARSession.ts      (FROZEN — do not touch)
│   └── App.tsx                    (unchanged)
├── scripts/
│   ├── phase0-smoke.ts            (new, Task 0.6)
│   └── __snapshots__/
│       └── phase0-baseline.json   (new, Task 0.7)
└── README.md                      (updated, Task 6.4)
```

**Frozen paths (no edits):**
- `mobile/unity/Assets/**`
- `mobile/rn/src/bridge/**`
- `mobile/rn/src/screens/ARScreen.tsx`
- `mobile/rn/src/components/UnityView.tsx`
- `mobile/rn/src/components/PetStatusOverlay.tsx`
- `mobile/rn/src/hooks/useARSession.ts`
- `mobile/rn/src/types/ar.ts`
- `mobile/rn/src/bridge/arMessages.ts`
- `mobile/rn/src/utils/glbCache.ts`
- `mobile/rn/src/components/FlashcardOverlay.tsx` (only if AR view is the consumer — do not refactor)
- `backend/**` (read-only)

---

## 8. 20-Day Calendar (no Mac days required)

| Day | Date | Phase | Deliverable | Commit |
|-----|------|-------|-------------|--------|
| 1 | Mon Jul 27 | 0 | `types/api.ts` rewrite (Task 0.1) | `feat(rn): phase-0 types rewrite` |
| 2 | Tue Jul 28 | 0 | `api.ts` petsApi + course endpoints (Task 0.2), `mappers.ts` (Task 0.3) | `feat(rn): phase-0 typed clients` |
| 3 | Wed Jul 29 | 0 | `useUser` hook (Task 0.4), HomeScreen rewires off mock (Task 0.5), `eventBus` skeleton (Task 2.7 partial) | `feat(rn): phase-0 useUser + mock removal` |
| 4 | Thu Jul 30 | 0 | `phase0-smoke.ts` (Task 0.6) + snapshot (Task 0.7) — **GATE** | `test(rn): phase-0 smoke test` |
| 5 | Fri Jul 31 | 1 | `CourseListScreen` (1.1), `LessonCard` (1.3), nav extensions (1.4) | `feat(rn): courses list + lesson card` |
| 6 | Sat Aug 1 | 1 | `CourseDetailScreen` (1.2), `CourseProgressRing` (1.6) | `feat(rn): course detail + progress ring` |
| 7 | Sun Aug 2 | 1 | HomeScreen rewires (1.5); Phase-1 verify | `feat(rn): home screen entry` |
| 8 | Mon Aug 3 | 2 | `LessonPlayerScreen` scaffold + `useLessonSession` (2.1), `StepNav` (2.2) | `feat(rn): lesson player scaffold` |
| 9 | Tue Aug 4 | 2 | `WatchStep` + `VocabStep` (2.3 first half) | `feat(rn): lesson watch + vocab steps` |
| 10 | Wed Aug 5 | 2 | `ReadStep` + `QuizStep` + `FinishStep` (2.3 second half); `submitLessonStep` wrapper (2.4) | `feat(rn): lesson quiz + finish step` |
| 11 | Thu Aug 6 | 2 | `RewardCelebration` (2.5); CourseDetailScreen "Practice in AR" button (2.6) | `feat(rn): reward modal + ar deep link` |
| 12 | Fri Aug 7 | 2 | `eventBus` typed events (5.5) + invalidation hook (2.7) | `feat(rn): typed eventBus for invalidation` |
| 13 | Sat Aug 8 | 2 | Phase-2 verify + bug bash | `chore(rn): phase-2 polish` |
| 14 | Sun Aug 9 | 3 | `usePets` (3.1) + `PetGrid` (3.2) + `PetCard` (3.3) | `feat(rn): pets hook + grid + card` |
| 15 | Mon Aug 10 | 3 | `PetDetailSheet` (3.4) + `PetsScreen` (3.5) + nav + HomeScreen entry (3.7) | `feat(rn): pets screen + sheet` |
| 16 | Tue Aug 11 | 3 | `PetUnlockToast` (3.6), eventBus wiring (3.8), Phase-3 verify | `feat(rn): pets unlock + invalidation` |
| 17 | Wed Aug 12 | 4 | `usePetCareState` (4.1) + `PetCareCard` (4.2) | `feat(rn): pet care state + card` |
| 18 | Thu Aug 13 | 4 | `PetOutfitPicker` (4.3) + `usePetXP` (4.4) + `PetEvolutionToast` (4.5); Phase-4 verify | `feat(rn): pet outfit + evolution` |
| 19 | Fri Aug 14 | 5 | Empty/Error states (5.1, 5.2), a11y + reduced motion (5.3, 5.4), HomeScreen polish (5.6) | `feat(rn): polish, empty states, a11y` |
| 20 | Sat Aug 15 | 6 | Smoke regression + screenshots + frozen-path guard + README + tag (6.1–6.5) | `docs(rn): migration sign-off` |

---

## 9. Acceptance Criteria (binary, per phase)

**Phase 0 (gate):**
- `npx tsc --noEmit` exits 0 from `mobile/rn/`.
- `npx ts-node mobile/rn/scripts/phase0-smoke.ts` exits 0 against the configured backend.
- No string `MOCK_USER_XP` in `mobile/rn/src/`.
- `git diff --stat -- mobile/unity mobile/rn/src/bridge mobile/rn/src/screens/ARScreen.tsx mobile/rn/src/components/PetStatusOverlay.tsx mobile/rn/src/hooks/useARSession.ts` is empty.

**Phase 1:**
- Tap Courses → see ≥1 course from the seeded `momo_nature` catalog.
- Tap a course → see lesson list with `lesson_count` matching the backend.
- Tap a lesson → existing `ARScreen` flow still launches.

**Phase 2:**
- Complete one full lesson (watch → vocab → read → quiz → finish) → XP delta appears on Home screen within one event-bus tick.
- Resume a partially-complete lesson → step state preserved.

**Phase 3:**
- Open Pets → see ≥3 pets (mix of locked/unlocked).
- Unlock a free pet → toast shows; pet appears in unlocked list.
- Set a pet as active → `getActivePet` returns that pet on app re-launch.

**Phase 4:**
- Feed pet 20 times → crosses `child` threshold → evolution toast fires exactly once.
- Outfit picker rejects unknown outfits with a clay error toast.

**Phase 5:**
- Empty-state cards render for: no courses, no pets unlocked yet, no progress.
- iOS reduce-motion toggle honored on every animation.
- `eslint --max-warnings 0` passes on `mobile/rn/src/`.

**Phase 6:**
- All Phase 0–5 criteria remain green.
- Frozen-path CI guard passes.
- `v0.8-courses-pets-rn` tag pushed.

---

## 10. Open Questions (for user before Phase 1 starts)

| # | Question | Default if unanswered |
|---|----------|-----------------------|
| OQ-1 | **Confirm the `course_id`/`lesson_id` rename (Migration Note A)** is acceptable — the existing `HomeScreen.tsx` is being corrected in Phase 0. | Proceed with rename (would cause a silent bug if not). |
| OQ-2 | **Pronunciation recording** in `ReadStep`/`SayStep`: do we record actual audio and post to `/api/v1/pronunciation/attempt`, or stub the action? The web app uses `PronunciationService` + an event bus. Recording requires `expo-av` permissions. | Stub the action (just advance the step); full audio deferred to a later phase. |
| OQ-3 | **WatchStep video source** — use `lesson.videoLesson.video.path` (asset reference → URL via `getLessonMedia`) or the legacy `lesson.video_url`? Web does both via `getAssetCandidateUrls`. | Prefer `getLessonMedia` for the canonical signed URL; fall back to `video_url` if media list empty. |
| OQ-4 | **Pets screen entry point** — single "Pets" card on Home, or a tab bar with Courses / Pets / Profile? | Single card on Home (lowest scope); tab bar deferred. |
| OQ-5 | **Local pet-care decay timer** — should it run while the app is backgrounded, or only when Pets screen is mounted? Web does not run it client-side. | Run only while Pets screen is mounted (matches web behavior; simpler). |

---

## 11. Status Return Block (to be filled when user reviews)

- **Status:** Draft — awaiting user approval
- **Created path:** `docs/superpowers/plans/2026-07-25-courses-pets-rn-migration-plan.md`
- **Open questions:** §10 lists 5; OQ-1 and OQ-2 are the highest-impact ones.
- **Phase-0 gate:** Hard block on Phase 1+ until §2.2 checklist passes.
- **Design system:** New "Design System" section added near the top with the full token matrix, mandatory rules, and web source-of-truth files. Reviewer compliance checklist added as §12.
- **Frozen scope confirmed:** AR/Unity bridge and backend untouched. CI guard planned for Day 20.
- **No UI screen implementation written** — only token extension in `mobile/rn/src/design/tokens.ts` (WBS 2.0 deliverable).
- **No unrelated markdown files created** — only this plan file.

---

## 12. Reviewer Subagent — Claymorphic Compliance Checklist

The Reviewer subagent must run the following checks on every PR that modifies `mobile/rn/src/screens/**`, `mobile/rn/src/components/**`, or `mobile/rn/src/components/pets/**`. Each item is **blocking** unless explicitly waived.

### Static checks (run as part of the review)

1. **No raw `<View style={{ backgroundColor: '#xxx' }}` colors.** Grep `mobile/rn/src` for `backgroundColor: '#[0-9a-fA-F]\{3,6\}'` and `color: '#[0-9a-fA-F]\{3,6\}'`. The only allowed files are `mobile/rn/src/design/tokens.ts` and the three clay primitives (`ClayCard`, `ClayButton`, `ClayProgressBar`).
2. **No raw inline shadows.** Every `shadow*` property must originate from `SHADOWS.claySm | clayMd | clayLg` or `CLAY_TONE_SHADOWS[*].*`. Reject any file that hand-rolls `shadowOffset`, `shadowOpacity`, `shadowRadius`, or `elevation` outside `tokens.ts` and the clay primitives.
3. **Pet rarity color comes from `RARITY_COLORS`.** Every `PetCard` / `PetCollectionCard` / `PetGrid` consumer must read `RARITY_COLORS[pet.rarity]`. Reject hardcoded `#9CA3AF`, `#60A5FA`, `#A78BFA`, `#FBBF24`, or any equivalent palette literal.
4. **Pet evolution uses `STAGE_GRADIENTS` + `EVOLUTION_EMOJI`.** Every `PetEvolutionToast` / `EvolutionModal` / stage indicator must use `STAGE_GRADIENTS[stage]` and `EVOLUTION_EMOJI[stage]`. Reject hardcoded gradients or emoji constants.
5. **Course category color comes from `CATEGORY_COLORS`.** Every `CourseCard` / `CourseHero` / category chip must read `CATEGORY_COLORS[course.category_key]` (fall back to `home_family` if unknown). Reject hardcoded `#FFF1D7`, `#EAF5FF`, `#EEF9E7`, `#FFE7E3`.
6. **Pet care stat colors come from `CARE_STAT_COLORS`.** Every `ProgressBar` (happiness/energy/hunger) consumer must read `CARE_STAT_COLORS.{happiness|energy|hunger|xp|streak}`. Reject `'#5B8DEF'`, `'#7BC67E'`, `'#FFB347'`, `'#FF9F9F'`.
7. **Animation timings use `MOTION` / `CLAYMORPHIC_SPRINGS`.** Every `withTiming`, `withSpring`, `withDelay`, or `Animated.timing` call must use the matching preset. Reject magic numbers like `duration: 500` without a token reference.
8. **No new visual primitives.** Reject any new file under `mobile/rn/src/components/` that imports `expo-blur`, `react-native-blur`, `MaskedViewIOS`, or hard-rolls a `LinearGradient` outside the clay primitives' highlight layers. Any new component must compose `ClayCard` / `ClayButton` / `ClayProgressBar` / `ProgressTracker` or use tokens directly.
9. **No new font families.** Reject any `fontFamily` outside `FONT.primary`. Reject any new size outside `FONT.sizes`.
10. **No new shadow presets.** Reject any new keys in `SHADOWS` or `CLAY_TONE_SHADOWS` unless the equivalent `frontend-web/src/design-tokens/claymorphic.ts` file is updated in the same PR.
11. **Existing primitives are not modified.** `ClayCard`, `ClayButton`, `ClayProgressBar`, `ProgressTracker` public API must be unchanged. Reject PRs that add new props or change default behavior of these primitives.
12. **No Unity/AR coupling.** `mobile/rn/src/screens/**` and `mobile/rn/src/components/**` (new files) must not import from `mobile/rn/src/bridge/**`, `mobile/rn/src/hooks/useARSession.ts`, `mobile/rn/src/components/UnityView.tsx`, or `mobile/rn/src/components/PetStatusOverlay.tsx`. Frozen-path CI guard (§2.4) also runs.

### Visual checks (run on the iOS simulator build)

13. **CourseListScreen** renders the same hero / path-card / stat-card composition as `frontend-web/src/pages/CourseList.tsx`.
14. **CourseDetailScreen** hero card, lesson list, and "Start learning" / "Continue learning" CTA match the web CTAs.
15. **PetsScreen** hero, gallery, evolution modal, and reward celebration match the web pages.
16. **PetCard** rarity gradient + lock overlay + progress bar match the web `PetCard.tsx`.
17. **RewardCelebration** clay modal matches the web reward modal (XP delta + sticker + badge).

### Reporting

Each failed check must be recorded as an `ISSUE-NNN` with severity:

- **Critical** — any of items 1, 2, 3, 4, 5, 6, 8, 11, 12 (visual language violation).
- **Important** — items 7, 9, 10 (token drift but visually equivalent).
- **Suggestion** — items 13–17 (visual deltas from the web reference).

The Reviewer must refuse to mark the WBS task "Done" until every Critical item is closed.

### Where this lives in the agent

The full checklist will be inlined into the Reviewer subagent prompt when it is invoked; the checklist is also duplicated into the PM tracker `Daily Checklist` row for Day 4 (Design + i18n) and Day 17 (Integration Gate) so reviewers can self-check before the gate.
