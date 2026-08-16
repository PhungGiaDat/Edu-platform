# React Native Learner Product Specification

## Status
approved — LC3 data-driven Quiz Activity contract implemented 2026-08-15

## Goal
Lock in the product behavior, ownership, backend dependency, and verification method for every learner-facing feature in the React Native app. Stable MOB-*-REQ IDs referenced by Cursor tasks and test files.

## Scope
React Native learner product (auth through lesson completion, gamification, pets, session management, AR entry). Excludes Unity/native AR engine behavior (owned by `docs/unity_ar/`).

## Normative Learner Domain

### Canonical hierarchy and ownership

```text
Parent preference -> LearningTopic -> Course -> Lesson
                                             -> ordered LessonActivity definitions
LearningSession -> runtime traversal of those activities and attempts
```

- **LearningTopic** is the learner-facing educational theme that groups Courses and can be prioritized for a learner. For MVP, it is a controlled stable key represented by existing `courses.category_key` and `learning_paths.priority_topics`; `category_label` and `category_icon` are compatibility metadata. Do not add a `learning_topics` table until independently managed topic localization, ordering, or assets require one.
- **Course** is an enrollable unit within one LearningTopic. Existing enrollment and `user_course_progress` semantics remain authoritative. `AnimalsAdventure` is canonical; `AnimalsCourse` remains legacy.
- **Lesson** is authored reusable content within a Course and owns an ordered learning sequence. It is not a learner attempt.
- **LessonActivity** is an authored stable activity definition. For MVP it is a typed entry in `lessons.learning_blocks.activities`, not a relational row and not runtime state.
- **Learning Session Step** is the runtime execution/progress record for one LessonActivity. Existing `lesson_sessions`, `lesson_session_steps`, and `lesson_step_attempts` own position, status, attempts, scores, and responses. `lesson_session_steps.step_id` is the authored `activity_id` for schema-v2 lessons.
- **Learning Path Progress** is higher-level learner state derived through authoritative Lesson completion and Course progress. It does not contain activity rows.

These concepts never merge: authored definition -> runtime step/attempt -> Lesson completion -> Course/Learning Path progress.

### Versioned `learning_blocks` contract

Canonical authored content uses:

```json
{
  "schema_version": 2,
  "content_version": 1,
  "vocabulary": ["stable-vocabulary-id"],
  "activities": [
    {
      "activity_id": "learn-animals",
      "type": "learn_vocabulary",
      "order": 1,
      "required": true,
      "completion_policy": { "mode": "all_items" },
      "config": { "vocabulary_ids": ["cat", "dog"] }
    }
  ]
}
```

- `schema_version` identifies the JSON contract shape. Canonical activities require version `2`.
- `content_version` is a positive authored Lesson revision. It changes when activity content/order/policy changes and is persisted on `lesson_sessions` so resume normalization detects revision changes.
- `vocabulary` contains canonical reference IDs in v2. It does not clone vocabulary records.
- `activities` is sorted by positive unique `order`. Array position is never identity.
- `activity_id` is a stable lowercase identifier unique within a Lesson. It is not generated from array index or translated title and does not change merely because order changes.
- `required` is authored completion policy, never runtime completion state.
- Optional `title` and `instructions` are presentation text.
- Activity objects and configs reject unknown fields. Runtime fields such as `status`, `current`, `completed`, timestamps, attempts, score, or selected answers are prohibited.

`completion_policy.mode` is controlled: `viewed`, `all_items`, `interaction_complete`, `game_complete`, or `quiz_complete`. Allowed modes are constrained by activity type. Quiz performance is evaluated from canonical question data; XP does not belong to Quiz config.

### LC3 quiz contract

- A `quiz` activity references stable `quiz_questions.id` values through `config.question_ids`; it may cap that pool with `question_count` and use `order_policy` (`authored` or `random`). Duplicate IDs and counts larger than the pool are invalid.
- Options retain canonical `quiz_question_options.option_order`; learner wire identity is the stable derived `{question_id}:{option_order}`. Question and option identity are never array indexes.
- Random selections are saved in existing lesson-session step response JSONB. Backend answer evaluation records runtime attempts in `lesson_step_attempts`; a quiz completes when all selected questions have been attempted, independently of performance score.
- Existing tables cover LC3: **no SQL/Alembic migration is required**. LC3 does not seed or rewrite production Lessons.

| Activity `type` | Required typed `config` |
|---|---|
| `warm_up` | non-empty `media_asset_ids` |
| `learn_vocabulary` | non-empty `vocabulary_ids` |
| `listen_choose` | non-empty `vocabulary_ids`; optional positive `question_count`; `order_policy=authored|random` |
| `match`, `drag_drop`, `memory_match` | at least one `vocabulary_ids` or positive `mini_game_item_ids` reference |
| `coloring` | `vocabulary_id` and `outline_asset_id` |
| `mini_game` | controlled `game_type` plus non-empty positive `mini_game_item_ids` |
| `quiz` | non-empty positive `question_ids`; optional positive `question_count`; `order_policy`; optional per-activity `passing_score` 0-100 |
| `read_aloud` | stable `story_id` |
| `pronunciation` | non-empty `vocabulary_ids` |

Supported Course Game values initially match existing persistence (`catch_word`, `drag_match`, `memory_match`, `word_scramble`) plus planned `coloring`. Quiz references point to existing `quiz_questions.id`; game references point to existing `mini_game_items.id`; asset references use existing `media_assets.asset_id` semantics.

Legacy flat keys already stored in `learning_blocks` (`vocabulary`, `game`, `activity`, `readAloudStory`, `pronunciation`, `quiz`) remain readable. The compatibility adapter returns them as `schema_version: 1`, `content_version: 1`, and `activities: []`; it does not fabricate rich activities or rewrite production rows. Legacy sessions retain their established step IDs. A separate activity table and an untyped v2 public JSON contract are rejected for MVP.

### Session and progress mapping

For schema-v2 Lessons, `activity_id -> lesson_session_steps.step_id -> lesson_step_attempts.step_id`. The parent session supplies `lesson_id` and snapshots `content_version`; each step snapshots nullable `activity_type`, nullable `activity_order`, and authored `required`. Existing legacy rows keep null type/order and default `required=true`.

On content-version change, resume remaps saved runtime state by stable `activity_id`, reapplies new authored order/type/required metadata, and updates the session version. It never maps by previous array index. Completion of all required session steps completes the Learning Session, but authoritative Lesson completion still flows through existing Lesson/Course progress and gamification services. No activity-level Learning Path rows or competing completion truth are created.

### Activity, vocabulary, game, quiz, and completion rules

- Activity order comes from data, not a hardcoded React Native screen sequence. Initial families include warm-up/media, vocabulary learning, practice, pronunciation, Course Game, Quiz, and reading.
- Vocabulary is canonical reusable content. Existing lesson vocabulary, `flashcards`, and `word_mastery` remain the content/progress foundation; activities reference stable vocabulary/flashcard identities where possible instead of cloning words and assets.
- `game_type` is the reusable mechanic. Existing `mini_game_items` rows are configured Course Game content, with type-specific configuration validated inside `payload`; a Course Game activity references/selects those items. No `GameTemplate` or `GameInstance` table is required for MVP.
- Course Games run in the ordinary RN lesson flow without a camera. AR Games run in Unity's active AR context. A mechanic name may be shared, but content instance, runtime state, tracking assets, and ownership are not.
- A Quiz Activity stores pool selection, count/order/randomization, and completion policy in its typed activity config. Existing `quiz_questions` and `quiz_question_options` own prompts, options, answers, and question types. No new quiz table is required for the initial vocabulary-backed question set.
- Reward is a completion presentation/result, not an authored activity that decides XP. Persistent rewards remain backend-authoritative semantic events with stable `event_id` values.

### Asset roles and reuse

LC5's controlled learner role vocabulary is deliberately separate from physical storage and native-AR fields. A learner API exposes only `{role, url, media_type, metadata}` after backend resolution; it never exposes a bucket credential, storage implementation detail, `reference_image_url`, `model_3d_url`, or `physical_width_m`.

| Domain | Role | Media type | Canonical owner / representation | Known consumers |
|---|---|---|---|---|
| Course | `course_cover` | image | existing `courses.thumbnail_url` / `thumbnail` | Course card and Course detail |
| Lesson | `warm_up_visual` | image | one ready `media_assets` row for the lesson | typed warm-up activity |
| Vocabulary | `vocabulary_illustration` | image | ready `media_assets`: `section_id=vocabulary`, `asset_key=vocabulary:<id>:vocabulary_illustration` | flashcard, Listen & Choose, Memory Match, future Quiz image choice |
| Vocabulary | `pronunciation_audio` | audio | ready `media_assets`: `section_id=vocabulary`, `asset_key=vocabulary:<id>:pronunciation_audio` | flashcard tap-to-hear, Listen activity, future Quiz audio |
| Vocabulary | `coloring_outline` | image | ready `media_assets`: `section_id=vocabulary`, `asset_key=vocabulary:<id>:coloring_outline` | future Coloring renderer |

`media_assets` remains the lesson-scoped persistence record (`course_id`, `lesson_id`, `section_id`, `asset_key`, `path`, `type`, `status`, `public_url`, `metadata`). It is not exposed as an ORM response. For the first manifest/seed, each content identity plus semantic role has one ready canonical record. The resolver rejects more than one ready match rather than choosing an arbitrary path; variants require a later explicit role/selection decision.

One vocabulary illustration/audio/outline is reused across activities; an activity must not create a duplicate asset record merely to consume it. The Memory Match payload retains legacy raw image URLs, but new canonical image cards use `vocabulary_id + vocabulary_illustration`; the service resolves the learner-safe image projection. Quiz has no media behavior in LC3, but a future Quiz may reuse these vocabulary roles without a new Quiz-specific role.

AR is a separate namespace and persistence lane: a learner illustration is never an AR tracking reference image; course-game media is never AR-game media; learner images never fall back to `reference_image_url` or `model_3d_url`; no learner role resolves physical tracking width. Existing native-AR fields remain authoritative and untouched.

Future manifests identify assets by content identity plus semantic role, source artifact, media type, destination, and status, never by guessing filenames. Storage bucket/path remains independent of the role. Existing Supabase Storage conventions remain in place; LC5 creates no bucket, object, or media record.

### Parent preference and progress

Parent-managed preference is conceptually `learner_id + topic_key + priority/enabled`. Existing ordered `learning_paths.priority_topics` is the MVP persistence surface; it prioritizes Courses through `courses.category_key` and is not copied onto every Course. Recommendation algorithms and parent settings UI are out of scope.

For MVP, keep authoritative Course/Lesson progress, `word_mastery`, session position, and step attempts. A new permanent activity-progress table is deferred unless resume/reporting requirements cannot be met by the existing session and attempt records. DQ-10 remains open and does not affect this domain model.

## A. Auth / App Shell

### MOB-AUTH-REQ-001 — Email+password login
**Product behavior**: Email + password form → POST /auth/login → JWT stored in SecureStore → navigate to Home. Invalid credentials show error banner.
**Ownership**: this workspace.
**Backend dependency**: `POST /api/v1/auth/login` (exists).
**Verification**: register→login→token persist on relaunch.
**Status**: existing (AuthScreen.tsx).

### MOB-AUTH-REQ-002 — Register
**Product behavior**: Email + password + name form → POST /auth/register → auto-login → navigate to Home. Duplicate email shows error.
**Ownership**: this workspace (R1).
**Backend dependency**: `POST /api/v1/auth/register` (exists).
**Verification**: register flow completes; new user in backend.
**Status**: not started (R1).

### MOB-AUTH-REQ-003 — Token restore
**Product behavior**: On app launch, check SecureStore for JWT. If valid → /auth/me returns 200 → navigate to Home. If missing or 401 → navigate to Auth.
**Ownership**: this workspace.
**Backend dependency**: `GET /api/v1/auth/me` (exists).
**Verification**: force-quit app; relaunch; should show Home not Auth.
**Status**: existing (useAuth.ts).

### MOB-AUTH-REQ-004 — Guest mode
**Product behavior**: User without JWT can browse catalog and flashcards. Auth-required features (enroll, progress, pets) show "Sign in to continue" banner. No JWT stored for guests.
**Ownership**: this workspace (R1).
**Backend dependency**: none (public endpoints only).
**Verification**: no token → catalog loads; enroll shows sign-in prompt.
**Status**: not started (R1). DQ-9 gates scope.

### MOB-AUTH-REQ-005 — Protected learner routes
**Product behavior**: Navigator conditionally renders Auth stack (no JWT) vs Home stack (has JWT). All learner routes (Home, Courses, Pets, Profile) are behind JWT guard.
**Ownership**: this workspace.
**Backend dependency**: none.
**Verification**: remove token → navigating to /pets redirects to Auth.
**Status**: existing (AppNavigator.tsx).

### MOB-AUTH-REQ-006 — Logout
**Product behavior**: User taps logout → clear SecureStore JWT → navigate to Auth screen.
**Ownership**: this workspace.
**Backend dependency**: none.
**Verification**: logout → navigate to Auth; token gone from storage.
**Status**: existing (HomeScreen → clearToken).

---

## B. Courses

### MOB-COURSE-REQ-001 — Course catalog list
**Product behavior**: Scrollable list of published courses. Each card shows thumbnail, title, category badge, lesson count, level. Pull-to-refresh. Loading skeleton on fetch.
**Ownership**: this workspace (R2).
**Backend dependency**: `GET /api/v1/courses/` (exists).
**Verification**: catalog renders; pull-to-refresh reloads.
**Status**: existing (partial, R2 to complete).

### MOB-COURSE-REQ-002 — Course filtering
**Product behavior**: Filter chips use canonical LearningTopic keys (Family, School, Nature), plus level and learning-path filters. Courses such as Animals are children of a Topic, not peer taxonomy values. Tap chip → filter applied. Active chip highlighted.
**Ownership**: this workspace (R2).
**Backend dependency**: `GET /api/v1/courses/` with query params (backend supports).
**Verification**: tap category filter → only matching courses shown.
**Status**: not started (R2).

### MOB-COURSE-REQ-003 — Course detail
**Product behavior**: Course hero (title, description, age range, thumbnail), lesson list with progress indicators (completed/in-progress/locked), enrollment CTA.
**Ownership**: this workspace (R2).
**Backend dependency**: `GET /api/v1/courses/{course_id}`, `GET /api/v1/users/{user_id}/progress` (exist).
**Verification**: course detail loads; lesson list renders with correct progress states.
**Status**: existing.

### MOB-COURSE-REQ-004 — Course enrollment
**Product behavior**: "Start Course" button → POST /courses/{id}/start → show "Continue" after success. Already-enrolled users see "Continue".
**Ownership**: this workspace (R2).
**Backend dependency**: `POST /api/v1/courses/{course_id}/start` (exists).
**Verification**: enroll → POST called; button changes to Continue; progress persists.
**Status**: not started (R2).

### MOB-COURSE-REQ-005 — Lesson navigation
**Product behavior**: Tap lesson card → navigate to LessonPlayer with lessonId, lessonTitle, qrCode params.
**Ownership**: this workspace (R2).
**Backend dependency**: `GET /api/v1/courses/{course_id}/lessons/{lesson_id}` (exists).
**Verification**: tap lesson → LessonPlayer opens with correct params.
**Status**: existing.

### MOB-COURSE-REQ-006 — Resume / continue
**Product behavior**: If user has progress → show "Continue" CTA with next incomplete lesson. If no progress → show "Start Course".
**Ownership**: this workspace (R2).
**Backend dependency**: `GET /api/v1/users/{user_id}/progress` (exists).
**Verification**: with progress → Continue shown; without progress → Start shown.
**Status**: not started (R2).

---

## C. Learning Path

### MOB-PATH-REQ-001 — Topic selection
**Product behavior**: Grid of controlled LearningTopic tiles (Family, School, Nature). Parent-managed selection is future scope; the learner flow may display the same saved priorities. Persist ordered stable topic keys through the existing learning-path preferences contract.
**Ownership**: this workspace (R3).
**Backend dependency**: `GET /api/v1/learning-path/{user_id}`, `POST /api/v1/learning-path/preferences` (exist).
**Verification**: select topics → POST sent; topics persist on return.
**Status**: not started (R3).

### MOB-PATH-REQ-002 — Daily goals
**Product behavior**: Circular progress ring showing today's earned XP vs target goal (default 50 XP). Ring fills as learner earns XP. Goal complete animation at 100%.
**Ownership**: this workspace (R3).
**Backend dependency**: `GET /api/v1/learning-path/{user_id}/today` (exists).
**Verification**: goal at 30 XP / 50 → ring 60% filled.
**Status**: not started (R3).

### MOB-PATH-REQ-003 — Saved preferences
**Product behavior**: Load saved topics + daily goal on app launch. Show current selection. POST changes.
**Ownership**: this workspace (R3).
**Backend dependency**: `GET /api/v1/learning-path/{user_id}` (exists).
**Verification**: saved topics appear as selected on next launch.
**Status**: not started (R3).

### MOB-PATH-REQ-004 — Onboarding flow
**Product behavior**: First-time user sees onboarding: select topics → set daily goal → start learning. Skippable. Shown once per user.
**Ownership**: this workspace (R3).
**Backend dependency**: `GET /api/v1/learning-path/{user_id}` (exists; `is_onboarded` check).
**Verification**: new user → onboarding shown; returning user → skipped.
**Status**: not started (R3).

---

## D. Lesson Player

### MOB-LESSON-REQ-001 — Session engine
**Product behavior**: On lesson open, load ordered `learning_blocks.activities`, start/resume the Learning Session, map each stable `activity_id` to a session step, and render the current activity. Submit attempts through the existing step-attempt endpoint; complete through the existing completion/gamification boundary. Timing enforcement remains gated by DQ-10.
**Ownership**: this workspace (R4).
**Backend dependency**: `POST /courses/{course_id}/lessons/{lesson_id}/session/start`, `POST /steps/attempt`, `POST /lessons/{id}/complete` (exist).
**Verification**: full lesson flow → steps complete → XP awarded.
**Status**: not started (R4).

### MOB-LESSON-REQ-002 — Step: Intro / Watch
**Product behavior**: Show lesson intro (title, description). Auto-play media if available (video or image carousel). "Continue" button advances to next step.
**Ownership**: this workspace (R4).
**Backend dependency**: `GET /courses/{course_id}/lessons/{lesson_id}/media` (exists).
**Verification**: intro renders; media plays; continue advances.
**Status**: not started (R4).

### MOB-LESSON-REQ-003 — Step: Vocabulary
**Product behavior**: Card per word showing: emoji, English word, Vietnamese translation, audio play button, simple sentence. Swipe or tap "next" to advance.
**Ownership**: this workspace (R4).
**Backend dependency**: lesson response (vocabulary field) + audio URLs (exist).
**Verification**: vocab cards render with correct data; audio plays.
**Status**: not started (R4).

### MOB-LESSON-REQ-004 — Step: Reading
**Product behavior**: Display reading passage with vocabulary words highlighted. Tap highlighted word → show translation tooltip.
**Ownership**: this workspace (R4).
**Backend dependency**: from lesson data (exists).
**Verification**: reading renders; highlighted words show tooltips on tap.
**Status**: not started (R4).

### MOB-LESSON-REQ-005 — Step: Quiz
**Product behavior**: Render a data-driven Quiz Activity whose typed config selects existing questions, count, ordering/randomization, and completion rule. Initial types include image→word, word/audio→image, listen→word, identify object, characteristic/concept match, and simple-sentence completion where authored content exists. No fixed global option count or pass threshold is implied.
**Ownership**: this workspace (R4).
**Backend dependency**: `POST /api/v1/quizzes/{lesson_id}/submit` (exists).
**Verification**: answer questions → submit → score shown; <70% shows retry.
**Status**: not started (R4).

### MOB-LESSON-REQ-006 — Step: Pronunciation
**Product behavior**: Show target word + audio. Tap mic → record → native speech recognition → score → feedback. Retry button. DQ-3 gates backend endpoint choice.
**Ownership**: this workspace (R7).
**Backend dependency**: `POST /api/v1/pronunciation/*` (DQ-3).
**Verification**: record → score returned; retry works.
**Status**: not started (R7).

### MOB-LESSON-REQ-007 — Step: Game
**Product behavior**: Render a configured Course Game Activity in the normal RN lesson flow. The reusable mechanic comes from `game_type`; configured content comes from existing `mini_game_items.payload`, selected by activity config and lesson vocabulary. This is not an AR Game and does not require a camera.
**Ownership**: this workspace (R6).
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: game loads and is playable.
**Status**: not started (R6).

### MOB-LESSON-REQ-008 — Step: Finish / Reward
**Product behavior**: Present the backend-authoritative lesson-completion and gamification result with celebration UI. This is derived completion presentation, not an authored activity that owns XP. "Back to Course" returns to course detail.
**Ownership**: this workspace (R4).
**Backend dependency**: `POST /api/v1/lessons/{id}/complete`, `POST /api/v1/gamification/add-xp` (exist).
**Verification**: finish → XP awarded; sticker/badge shown if earned.
**Status**: stub (R4).

### MOB-LESSON-REQ-009 — Animals lesson player
**Product behavior**: Canonical `AnimalsAdventure` content expresses a data-driven sequence (warm-up → vocabulary → listen/practice → match → Course Game → Quiz → completion). Animal-specific presentation comes from content/assets, not a hardcoded seven-screen controller. `AnimalsCourse` remains legacy.
**Ownership**: this workspace (R4).
**Backend dependency**: lesson API for animals-adventure-en-5-7 (DQ-1).
**Verification**: animal lesson → 7 sections navigable; mascot displays.
**Status**: not started (R4).

---

## E. Flashcards

### MOB-FLASH-REQ-001 — Flashcard list
**Product behavior**: Browse flashcards by category. Category filter chips at top. Scrollable list with word + translation + emoji preview.
**Ownership**: this workspace (R5).
**Backend dependency**: `GET /api/v1/flashcard/category/{category}` (exists).
**Verification**: category chips filter the list.
**Status**: not started (R5).

### MOB-FLASH-REQ-002 — Flashcard practice
**Product behavior**: Card shows word → tap to flip → show translation. Audio play button. Mark as "learned" or "review again". Progress tracked.
**Ownership**: this workspace (R5).
**Backend dependency**: `GET /api/v1/flashcard/{qr_id}` (exists).
**Verification**: flip card → translation shown; progress saved.
**Status**: not started (R5).

### MOB-FLASH-REQ-003 — Flashcard audio
**Product behavior**: Tap audio icon → play pronunciation audio. Uses AudioPlayer API.
**Ownership**: this workspace (R5).
**Backend dependency**: audio URL in flashcard response (exists).
**Verification**: tap audio → sound plays.
**Status**: AR overlay has it; general practice R5.

### MOB-FLASH-REQ-005 — Tap image → pronunciation audio
**Product behavior**: Tap the vocabulary image on a flashcard → play the target-word pronunciation audio (prerecorded audioUrl from lesson/flashcard response, or TTS fallback via `POST /pronunciation/tts`). Visual feedback animates simultaneously.
**Ownership**: this workspace (R5).
**Backend dependency**: `audioUrl` from `GET /api/v1/flashcard/{qr_id}` or lesson response; `POST /api/v1/pronunciation/tts` for TTS fallback.
**Verification**: tap image → pronunciation plays; repeated taps safe.
**Status**: not started (R5). See `spec/flashcard-expansion.md`.

### MOB-FLASH-REQ-006 — Visual interaction feedback
**Product behavior**: When learner taps the flashcard image, a light bounce animation plays (scale 1.0 → 1.1 → 1.0 over 300ms). Reusable interaction primitive, not per-card animation code.
**Ownership**: this workspace (R5).
**Verification**: tap → bounce visible; tap again after cooldown → animation replays.
**Status**: not started (R5). See `spec/flashcard-expansion.md`.

### MOB-FLASH-REQ-007 — Flashcard state tracking
**Product behavior**: Each vocabulary word has a learning state: NEW (never seen) → SEEN (tapped) → PRACTICING (pronunciation/game) → LEARNED (consistently correct). States stored in backend or client-side.
**Ownership**: this workspace (R5).
**Backend dependency**: extension of `GET /api/v1/users/{id}/progress` or new `vocabulary_progress` collection.
**Verification**: NEW word tapped → becomes SEEN; practice → PRACTICING; quiz pass → LEARNED.
**Status**: not started (R5). See `spec/flashcard-expansion.md`.
**Product behavior**: Tap scan button → camera opens → scan QR code → fetch flashcard by qr_id → show card. Handles invalid QR gracefully.
**Ownership**: this workspace (R5).
**Backend dependency**: `GET /api/v1/flashcard/{qr_id}` (exists).
**Verification**: scan valid QR → flashcard shown; invalid QR → error message.
**Status**: existing (AR path; R5 for general use).

---

## F. Mini-Games

### MOB-MINIGAME-REQ-001 — Memory Match
**Product behavior**: Grid of face-down cards. Tap to flip. Match pairs. Complete when all matched. Award XP on completion. DQ-5.
**Ownership**: this workspace (R6).
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: play game → all pairs matched → XP awarded.
**Status**: not started (R6).

### MOB-MINIGAME-REQ-002 — Word Scramble
**Product behavior**: Scrambled letters shown. Drag/tap to reorder into correct word. Complete → XP awarded. DQ-5.
**Ownership**: this workspace (R6).
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: reorder letters → correct word → XP awarded.
**Status**: not started (R6).

### MOB-MINIGAME-REQ-003 — Pronunciation Game
**Product behavior**: Listen + speak + score game. Native speech recognition. Competition mode with timing. DQ-5+DQ-3.
**Ownership**: this workspace (R7).
**Backend dependency**: `POST /api/v1/pronunciation/*` (DQ-3).
**Verification**: speak word → score shown; high score saved.
**Status**: not started (R6+R7).

### MOB-MINIGAME-REQ-004 — Drag Match
**Product behavior**: Drag words onto matching images. DQ-5.
**Ownership**: this workspace (R6).
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: drag word to image → match confirmed.
**Status**: not started (R6). DQ-5 gates.

### MOB-MINIGAME-REQ-005 — Catch Word

### MOB-GAME-REQ-009 — DragMatch game
**Product behavior**: See image → tap to select word → tap image to confirm. Correct → green highlight + vocabulary audio + proceed. Incorrect → try again (no penalty). Complete when all matched.
**Ownership**: this workspace (R6). Reference: `frontend-web/src/components/game/DragMatchGame.tsx`.
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: correct match → audio + green; game completes; XP awarded.
**Status**: not started (R6). See `spec/game-catalog.md` GAME-1.

### MOB-GAME-REQ-010 — MemoryPairs game
**Product behavior**: Grid of face-down cards (min 4 pairs). Tap to flip. Match image ↔ word. Matched pair stays up + success audio. Complete when all pairs found.
**Ownership**: this workspace (R6). Reference: `frontend-web/src/components/game/MemoryMatchGame.tsx`.
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: pairs matched → audio + XP; game completes; shuffle works.
**Status**: not started (R6). See `spec/game-catalog.md` GAME-2.

### MOB-GAME-REQ-011 — ColorLearn game
**Product behavior**: Color an animal outline with a palette of 8 colors. Select color → tap/drag to paint. Track colored percentage. ≥25% colored → vocabulary audio + completion. Learn object name + color vocabulary.
**Ownership**: this workspace (R6). Reference: `frontend-web/src/components/game/ColoringGame.tsx`.
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: line art renders; color palette works; percentage tracks; completion triggers audio + XP.
**Status**: not started (R6). See `spec/game-catalog.md` GAME-3. GAME-DQ-1 gates canvas library choice.

### MOB-GAME-REQ-012 — Game reward event taxonomy
**Product behavior**: Games emit typed reward events: `GAME_COMPLETED`, `GAME_ROUND_CORRECT`, `GAME_PERFECT`, `GAME_SPEED_BONUS`. Each event carries metadata and maps to XP awards via shared gamification util.
**Ownership**: this workspace (R6+R8).
**Backend dependency**: `POST /api/v1/gamification/add-xp` with idempotent event ID.
**Verification**: each game completion → exactly one `GAME_COMPLETED` event; retries idempotent.
**Status**: not started (R6+R8). See `spec/game-catalog.md`.

### MOB-GAME-REQ-013 — Shared vocabulary dataset
**Product behavior**: One `VocabularyItem` reused across all games and flashcards — not duplicated per game. Game engine consumes vocabulary from lesson API.
**Ownership**: this workspace (R5+R6).
**Verification**: same word appears consistently across flashcard, DragMatch, MemoryPairs, ColorLearn.
**Product behavior**: Catch falling words game. DQ-5.
**Ownership**: this workspace (R6).
**Backend dependency**: `GET /api/v1/game/{qr_id}` (exists).
**Verification**: catch word → score increases.
**Status**: not started (R6). DQ-5 gates.

---

## G. Pronunciation

### MOB-PRON-REQ-001 — Recording UX
**Product behavior**: Mic button → request microphone permission → start recording → native speech recognition → show transcript. Auto-stop after 5 seconds.
**Ownership**: this workspace (R7).
**Backend dependency**: native speech API + `POST /api/v1/pronunciation/*` (DQ-3).
**Verification**: tap mic → permission prompt → recording → transcript.
**Status**: not started (R7).

### MOB-PRON-REQ-002 — Assessment
**Product behavior**: Score accuracy of transcript vs expected word. Levenshtein similarity with kid bonus (+20%). Show score 0–100. Pass threshold: 70%.
**Ownership**: this workspace (R7).
**Backend dependency**: `POST /api/v1/pronunciation/evaluate` or `transcribe` (DQ-3).
**Verification**: say "cat" → score shown; "cta" → lower score.
**Status**: not started (R7).

### MOB-PRON-REQ-003 — Feedback
**Product behavior**: Show score + emoji + encouragement message. Dynamic feedback from backend templates. Retry button.
**Ownership**: this workspace (R7).
**Backend dependency**: `POST /api/v1/pronunciation/feedback` (exists).
**Verification**: retry → new attempt; score changes.
**Status**: not started (R7).

### MOB-PRON-REQ-005 — Child-friendly score band mapping
**Product behavior**: Raw model score (0–100) mapped to child-friendly bands before display: GREAT (≥80), GOOD TRY (50–79), TRY AGAIN (<50). Band labels and emoji shown. Thresholds are **configuration**, not hard-coded.
**Ownership**: this workspace (R7) + ML backend (calibration).
**Backend dependency**: raw score from `POST /pronunciation/evaluate`; band thresholds as config.
**Verification**: say "cat" → GREAT; say "cta" → GOOD TRY or TRY AGAIN.
**Status**: not started (R7). See `spec/pronunciation-ai-spec.md`.

### MOB-PRON-REQ-006 — Score calibration thresholds (configurable)
**Product behavior**: Score band boundaries stored as configuration (default: GREAT ≥ 80, GOOD TRY ≥ 50). Product owner can adjust without code change.
**Ownership**: this workspace (R7) + backend config.
**Verification**: threshold change → band labels change without rebuild.
**Status**: not started (R7). See `spec/pronunciation-ai-spec.md`.

### MOB-PRON-REQ-007 — Transcription display
**Product behavior**: Show what the child said ("You said: cat") alongside the target ("Try to say: cat").
**Ownership**: this workspace (R7).
**Backend dependency**: `transcription` field from `EvaluationResponse`.
**Verification**: transcript shown next to target word.
**Status**: not started (R7). See `spec/pronunciation-ai-spec.md`.

### MOB-PRON-REQ-004 — Permission denial fallback
**Product behavior**: If microphone denied → show message "Microphone access needed for pronunciation practice" with "Skip" button. Skip does not award XP for that step.
**Ownership**: this workspace (R7).
**Backend dependency**: none.
**Verification**: deny mic → fallback shown; skip advances.
**Status**: not started (R7).

---

## H. Gamification

### MOB-GAM-REQ-001 — XP award
**Product behavior**: On lesson complete, game win, etc. → POST /gamification/add-xp with action type. XP stored backend. Idempotent (same action + metadata = same XP, no double-award).
**Ownership**: this workspace (R8).
**Backend dependency**: `POST /api/v1/gamification/add-xp` (exists).
**Verification**: complete lesson → XP added; reload → XP persists.
**Status**: existing (partial, R8 to wire to screens).

### MOB-GAM-REQ-002 — XP display
**Product behavior**: Show current XP count in header/Home. Level calculated from XP thresholds.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/user/{user_id}` (exists).
**Verification**: earn XP → count updates; level shown.
**Status**: not started (R8).

### MOB-GAM-REQ-003 — Level system
**Product behavior**: Level badge in profile/header. Level thresholds: 0-100 (L1), 101-300 (L2), etc. Level-up celebration animation.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/user/{user_id}` (level in response).
**Verification**: reach XP threshold → level-up animation shown.
**Status**: not started (R8).

### MOB-GAM-REQ-004 — Streak
**Product behavior**: Daily streak count in Home header. Fire icon. Streak breaks if no learning activity for a day.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/streak/{user_id}` (exists).
**Verification**: streak count shown; backend tracks break.
**Status**: existing (StreakBadge in HomeScreen).

### MOB-GAM-REQ-005 — Badges
**Product behavior**: Grid of earned badges (completed course, perfect quiz, etc.). Tap badge → detail modal (title, description, earned date).
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/badges` (exists).
**Verification**: badges render; tap → detail shown.
**Status**: not started (R8).

### MOB-GAM-REQ-006 — Stickers
**Product behavior**: Collectible sticker gallery. Earned stickers shown in color; locked in grayscale. Tap sticker → full-size view.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/stickers/*`, `POST /api/v1/gamification/stickers/collect` (exist).
**Verification**: earned stickers shown; locked grayed out.
**Status**: not started (R8).

### MOB-GAM-REQ-007 — Reward celebration
**Product behavior**: Modal on lesson/game complete: confetti animation, XP earned, sticker/badge (if any), "Continue" button. Auto-dismiss after 3 seconds or tap.
**Ownership**: this workspace (R4+R8).
**Backend dependency**: XP from add-xp; sticker/badge from lesson/game reward.
**Verification**: complete lesson → celebration shown; XP added.
**Status**: stub (R4+R8).

### MOB-GAM-REQ-008 — Leaderboard

### MOB-GAM-REQ-009 — Reward event taxonomy
**Product behavior**: Unified reward event taxonomy across all product interactions:
| Event | Trigger | XP Awarded |
|-------|---------|------------|
| `LESSON_COMPLETED` | Lesson finish | yes |
| `FLASHCARD_MASTERED` | Flashcard LEARNED state | yes |
| `GAME_COMPLETED` | Game finish | yes |
| `PRONUNCIATION_SUCCESS` | Score ≥ GREAT | yes |
| `AR_COMBO_DISCOVERED` | AR combo triggered | yes |
| `MODEL_INTERACTION_DISCOVERED` | 3D model tap interaction | yes |
| `STREAK_REACHED` | Daily streak milestone | yes |
| `PET_CARE_ACTION` | Feed/play pet | yes |

**Ownership**: this workspace (R8).
**Backend dependency**: `POST /api/v1/gamification/add-xp` with typed action.
**Verification**: each event emits exactly once; retry is idempotent.
**Status**: not started (R8).

### MOB-GAM-REQ-010 — XP idempotency
**Product behavior**: XP awards are idempotent — same action + metadata = same XP, no double-award. Implemented via unique event ID per action. Network retries do not grant extra XP.
**Ownership**: this workspace (R8) + backend.
**Backend dependency**: idempotency key in `POST /api/v1/gamification/add-xp`.
**Verification**: retry XP call → same XP; no duplicate award.
**Status**: not started (R8).

### MOB-GAM-REQ-011 — Reward celebration UI
**Product behavior**: Modal on reward event: confetti animation, XP earned, sticker/badge (if earned), "Continue" button. Auto-dismiss after 3 seconds or tap. Applies to lesson complete, game complete, pronunciation success, AR combo, pet care.
**Ownership**: this workspace (R4+R8).
**Backend dependency**: XP from add-xp; sticker/badge from lesson/game reward.
**Verification**: reward event → celebration modal shown; auto-dismiss works.
**Status**: not started (R8).

### MOB-GAM-REQ-012 — Streak fire animation
**Product behavior**: Streak badge shows animated fire icon when streak ≥ 3 days. Animation plays on app launch if streak is active.
**Ownership**: this workspace (R8).
**Verification**: streak ≥ 3 → fire animation visible.
**Status**: not started (R8).
**Product behavior**: Weekly leaderboard. Top 3 highlighted with medals. User's own position shown. Tabs: weekly / all-time.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/leaderboard` (exists).
**Verification**: leaderboard renders; user position highlighted.
**Status**: not started (R8).

---

## I. Profile / Progress

### MOB-PROGRESS-REQ-001 — Learner profile
**Product behavior**: Avatar, name, email, level badge, XP progress bar, streak, member since date. Editable name.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/auth/me`, `GET /api/v1/gamification/user/{id}` (exist).
**Verification**: profile renders with correct data; name editable.
**Status**: existing (partial, R8 to complete).

### MOB-PROGRESS-REQ-002 — Progress dashboard
**Product behavior**: Weekly XP chart (bar chart), lessons completed this week, accuracy trend. Data from progress + gamification endpoints.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/users/{id}/progress`, `GET /api/v1/gamification/user/{id}` (exist).
**Verification**: chart renders with correct data.
**Status**: not started (R8).

### MOB-PROGRESS-REQ-003 — Achievements
**Product behavior**: Achievements tab in profile. List of achievements with earned/locked state. Tap → detail.
**Ownership**: this workspace (R8).
**Backend dependency**: `GET /api/v1/gamification/badges` (same as badges I5).
**Verification**: achievements tab shows earned vs locked.
**Status**: not started (R8). Shared endpoint with MOB-GAM-REQ-005.

---

## J. Pets

### MOB-PET-REQ-001 — Pet collection
**Product behavior**: Grid of owned pets. Each pet shows name, emoji/icon, evolution stage. Locked pets grayed. Tap → Pet Detail.
**Ownership**: this workspace (R9).
**Backend dependency**: `GET /api/v1/pets` (exists).
**Verification**: pets render; locked shown differently.
**Status**: existing (partial, R9 to wire API).

### MOB-PET-REQ-002 — Pet detail
**Product behavior**: Pet detail sheet: name, description, evolution stage, care stats (hunger, happiness, energy), care buttons (feed, play), outfit picker.
**Ownership**: this workspace (R9).
**Backend dependency**: `GET /api/v1/pets/{id}`, `GET /api/v1/gamification/pet/{user_id}` (exist).
**Verification**: detail shows care stats; feed/play buttons work.
**Status**: not started (R9).

### MOB-PET-REQ-003 — Active pet
**Product behavior**: Set one pet as active. Active pet shown in Home header. PUT /pets/active. Clear active pet.
**Ownership**: this workspace (R9).
**Backend dependency**: `PUT /api/v1/pets/active`, `GET /api/v1/pets/active/current`, `DELETE /api/v1/pets/active` (exist).
**Verification**: set active → pet appears in header; clear → gone.
**Status**: not started (R9).

### MOB-PET-REQ-004 — Pet unlock
**Product behavior**: Unlock modal: pet preview (name, emoji, description), XP cost, "Unlock" button → POST /pets/{id}/unlock. Success → pet added to collection.
**Ownership**: this workspace (R9).
**Backend dependency**: `POST /api/v1/pets/{id}/unlock` (exists).
**Verification**: unlock → pet appears in collection; XP deducted.
**Status**: not started (R9).

### MOB-PET-REQ-005 — Pet care (feed/play)
**Product behavior**: Feed → POST /gamification/pet/feed → hunger restored + XP. Play → POST /gamification/pet/play → happiness restored + XP. Cooldown on actions (e.g., 30 min).
**Ownership**: this workspace (R9).
**Backend dependency**: `POST /api/v1/gamification/pet/feed`, `POST /api/v1/gamification/pet/play` (exist).
**Verification**: feed → hunger increases; XP awarded.
**Status**: not started (R9).

### MOB-PET-REQ-006 — Pet outfit
**Product behavior**: Outfit picker: select from available outfits. POST /gamification/pet/outfit. Applied to pet viewer.
**Ownership**: this workspace (R9).
**Backend dependency**: `POST /api/v1/gamification/pet/outfit` (exists).
**Verification**: select outfit → pet shows new outfit.
**Status**: not started (R9).

### MOB-PET-REQ-007 — Pet evolution
**Product behavior**: Pet evolves when pet XP threshold reached. Evolution animation. Stage 1 → Stage 2 → Stage 3.
**Ownership**: this workspace (R9).
**Backend dependency**: `GET /api/v1/gamification/pet-xp/{user_id}` (evolution stage).
**Verification**: reach XP threshold → evolution animation plays; stage updates.
**Status**: not started (R9).

### MOB-PET-REQ-008 — Pet reward notification
**Product behavior**: Toast notification when pet care action awards XP. "Your pet is happy! +5 XP"
**Ownership**: this workspace (R9).
**Backend dependency**: from feed/play response.
**Verification**: feed → XP toast appears.
**Status**: not started (R9).

---

## K. Session Management

### MOB-SESSION-REQ-001 — Session start
**Product behavior**: When learner enters learning route (courses, lesson, flashcards) → POST /sessions/start → session active. Timer begins.
**Ownership**: this workspace (R10).
**Backend dependency**: `POST /api/v1/sessions/start` (exists).
**Verification**: enter lesson → session starts; timer visible.
**Status**: frontend foundation implemented; backend/runtime integration not verified.

### MOB-SESSION-REQ-002 — Session timer
**Product behavior**: Visible countdown for the configured session policy. Exact duration remains unresolved by DQ-10.
**Ownership**: this workspace (R10).
**Backend dependency**: none (client-side timer; backend for lock).
**Verification**: timer reflects the eventual configured policy and remains correct across lifecycle changes.
**Status**: frontend foundation implemented; final policy blocked by DQ-10.

### MOB-SESSION-REQ-003 — Warning state
**Product behavior**: At the configured warning threshold, show a child-safe warning. Exact threshold/copy remains unresolved by DQ-10.
**Ownership**: this workspace (R10).
**Backend dependency**: none (client-side; DQ-10).
**Verification**: configured warning threshold produces the warning state.
**Status**: frontend foundation implemented; final policy blocked by DQ-10.

### MOB-SESSION-REQ-004 — Hard limit
**Product behavior**: At the configured hard-limit threshold, show the policy-defined limit state and trigger cooldown when required. Exact enforcement remains unresolved by DQ-10.
**Ownership**: this workspace (R10).
**Backend dependency**: `POST /api/v1/session-lock/*` (exists).
**Verification**: configured hard-limit policy produces the expected limit state.
**Status**: frontend foundation implemented; final policy blocked by DQ-10.

### MOB-SESSION-REQ-005 — Break cooldown
**Product behavior**: After a policy-defined hard limit, apply the configured cooldown behavior and preserve it across app background/foreground. Exact duration/enforcement remains unresolved by DQ-10.
**Ownership**: this workspace (R10).
**Backend dependency**: `POST /api/v1/session-lock/*` (exists).
**Verification**: configured cooldown state persists across background/foreground.
**Status**: frontend foundation implemented; final policy blocked by DQ-10.

### MOB-SESSION-REQ-006 — AppState lifecycle
**Product behavior**: Timer pauses when app backgrounds (AppState 'background'). Resumes when app foregrounds. Break state persists.
**Ownership**: this workspace (R10).
**Backend dependency**: none (client-side).
**Verification**: background app → timer paused; foreground → timer resumes; break persists.
**Status**: not started (R10).

### MOB-SESSION-REQ-007 — Session end
**Product behavior**: User exits learning route → PATCH /sessions/{id}/end. Timer cleared. Can resume if within window.
**Ownership**: this workspace (R10).
**Backend dependency**: `PATCH /api/v1/sessions/{id}/end` (exists).
**Verification**: exit lesson → session ended; re-enter → new session.
**Status**: not started (R10).

---

## L. AI Chat (Decision Required)

### MOB-CHAT-REQ-001 — Chat UI
**Product behavior**: Message thread with AI tutor. User sends message → RAG response. DQ-7 gates inclusion.
**Ownership**: this workspace (R11, if DQ-7 resolves to include).
**Backend dependency**: `POST /api/v1/chat/rag` (exists).
**Verification**: send message → response received.
**Status**: not started (R11, gated on DQ-7).

---

## M. Native AR Integration

### MOB-ARINT-REQ-001 — AR entry from lesson
**Product behavior**: Lessons with `lesson.arReference.ar_tag` show "Practice in AR" button. Tapping navigates to AR route with `{lessonId, lessonTitle}`.
**Ownership**: this workspace (R12).
**Backend dependency**: `GET /courses/{id}/lessons/{id}` (arReference field exists).
**Verification**: tap "Practice in AR" → AR screen opens.
**Status**: existing (stub, R12 to add ar_tag gate).

### MOB-ARINT-REQ-002 — AR capability gating
**Product behavior**: If Unity native module unavailable → show "AR not available on this device" placeholder. No crash.
**Ownership**: this workspace (R12).
**Backend dependency**: none.
**Verification**: build without Unity module → placeholder shown; no crash.
**Status**: stub (R12).

### MOB-ARINT-REQ-003 — No cross-lane contract drift
**Product behavior**: RN bridge contract (arMessages.ts, types/ar.ts) never altered by mobile lane. Contract changes require spec decision in `docs/unity_ar/`.
**Ownership**: both lanes (STOP gate).
**Backend dependency**: none.
**Verification**: PR review rule; frozen-path guard.
**Status**: in effect.

### MOB-ARINT-REQ-004 — XP handoff from AR
**Product behavior**: AR completion (combo complete, flashcard detect) → add XP via shared add-xp contract. Idempotent. AR lane owns MOB-GAME-REQ XP logic.
**Ownership**: this workspace (XP display) + `docs/unity_ar/` (XP calculation).
**Backend dependency**: `POST /api/v1/gamification/add-xp` (shared).
**Verification**: AR combo complete → XP toast shown in RN.
**Status**: existing (partial).

---

## Requirement ID Summary

| Prefix | Domain | Count |
|--------|--------|-------|
| MOB-AUTH-REQ-* | Auth / app shell | 6 |
| MOB-COURSE-REQ-* | Courses | 6 |
| MOB-PATH-REQ-* | Learning Path | 4 |
| MOB-LESSON-REQ-* | Lesson Player | 9 |
| MOB-FLASH-REQ-* | Flashcards | 4 |
| MOB-MINIGAME-REQ-* | Mini-games | 5 |
| MOB-PRON-REQ-* | Pronunciation | 4 |
| MOB-GAM-REQ-* | Gamification | 8 |
| MOB-PROGRESS-REQ-* | Profile / Progress | 3 |
| MOB-PET-REQ-* | Pets | 8 |
| MOB-SESSION-REQ-* | Session Management | 7 |
| MOB-CHAT-REQ-* | AI Chat | 1 |
| MOB-ARINT-REQ-* | Native AR Integration | 4 |
| **Total** | | **69** |

---

## Related
- `spec/web-feature-inventory.md` — raw inventory
- `spec/learner-parity-matrix.md` — parity decisions
- `spec/native-ar-integration.md` — AR boundary spec
- `plans/2026-08-09-learner-migration-plan.md` — phase mapping
