# Reverse-Engineering Report: MongoDB to Relational (PostgreSQL)

> Source: read-only export under `/export` (collections, indexes, stats, validators, relationships).
> No live database connection was used for this analysis.

## 1. Executive Summary

The application is a **gamified language-learning platform** (Vietnamese-facing, English/vocabulary content) that blends structured courses, flashcards, quizzes, mini-games, AR (augmented reality) experiences, a virtual-pet reward loop, and an AI feedback/chat layer.

The MongoDB design shows the classic symptoms of an application-driven, schema-on-read database that grew organically:

- **Two database namespaces coexist**: `edu_platform` (populated, authoritative) and `eduplatform` (empty legacy duplicate — every collection has `count: 0`).
- **No schema validators** anywhere (`validators.json` is `{}` for all 46 namespaces) — zero server-side type/constraint enforcement.
- **Heavy denormalization**: `courses` embeds the entire lesson → section → step hierarchy (avg object size ~76 KB) while a dedicated `course_lessons` collection exists but is empty.
- **Duplicated entities**: pets, flashcards, quizzes, and mini-games each exist both as standalone collections and as embedded copies elsewhere.
- **Reference relationships are string-keyed** (`course_id`, `user_id`, `pet_id`, `qr_id`) rather than `_id` foreign keys, with no enforced integrity.

The document below inventories every populated collection, documents the current design, proposes a normalized relational schema, and lists risks, missing constraints, and legacy fields.

## 2. Data Inventory (populated collections)

Namespace `edu_platform` (document counts from `stats.json`):

| Collection | Docs | Avg Size | Role |
|---|---|---|---|
| `media_assets` | 645 | 490 B | Media file registry (audio/image per course/lesson/section) |
| `ar_objects` | 28 | 610 B | AR renderable objects keyed by `ar_tag` |
| `pets` | 24 | 695 B | Virtual pet catalog |
| `mini_game_bank` | 20 | 663 B | Mini-game question/pair bank |
| `flashcards` | 16 | 594 B | Standalone flashcards keyed by `qr_id` |
| `users` | 11 | 438 B | User accounts + embedded gamification state |
| `ar_combinations` | 9 | 675 B | AR combo rules (tag sets → reward) |
| `user_points` | 9 | 290 B | Points/currency + embedded pet state per user |
| `session_logs` | 7 | 144 B | Chat/tutor session logs (30-day TTL) |
| `courses` | 3 | ~76 KB | Course + full embedded lesson hierarchy |
| `user_course_progress` | 3 | 892 B | Per-user course progress |
| `lesson_sessions` | 2 | 1577 B | Per-user lesson run state |
| `flashcard_decks` | 1 | 316 B | Flashcard deck grouping |
| `quiz_questions` | 1 | 956 B | Quiz question set |
| `combos` | 1 | 671 B | Combo/reward definition |
| `ai_feedback` | 1 | 120 B | AI-generated feedback record |

Empty-but-defined collections (schema intent, no data): `course_lessons`, `learning_paths`, `learning_progress`, `word_mastery`, `quiz_attempts`, `pronunciation_attempts`, `lesson_step_attempts`, `chat_logs`, `user_sessions`, `flashcard_editor`, `feedback_templates`, `profile_content`, `rag_cache`, `redis_cache`.

Namespace `eduplatform` (all empty): duplicate of a subset of the above — legacy/abandoned.

## 3. Business Domain

The platform teaches vocabulary/language through several reinforcing loops:

1. **Structured learning** — `courses` contain ordered lessons; each lesson contains sections; each section contains steps (flashcard drill, quiz, pronunciation, AR task, mini-game). `lesson_sessions` and `user_course_progress` track a learner's position and results.
2. **Flashcards & QR** — `flashcards` are the atomic study unit, each with a unique `qr_id` scannable in the real world; `flashcard_decks` group them. `learning_progress`/`word_mastery` (empty) are the spaced-repetition tracking layer.
3. **Assessment** — `quiz_questions` hold question banks; `quiz_attempts` and `pronunciation_attempts` (empty) capture learner responses with TTL retention.
4. **Augmented Reality** — `ar_objects` are renderable 3D/animated tags; `ar_combinations` define reward rules when a set of tags/flashcards is scanned together.
5. **Gamification** — `pets` (catalog), `user_points` (currency + active pet state), and `combos` drive a virtual-pet reward economy. Gamification state is also embedded directly on `users`.
6. **AI layer** — `ai_feedback`, `session_logs`, `chat_logs` (empty), `feedback_templates` (empty), and `rag_cache`/`redis_cache` support an AI tutor / RAG assistant.

## 4. Entity Descriptions

### Core identity & gamification

- **users** (11 docs) — account record: `email` (unique), `username` (unique), `password_hash`, `role`, plus **embedded gamification state** (points, level, streak, owned pets, active pet). Mixes authentication, profile, and game economy in one document.
- **user_points** (9 docs) — per-user points/currency ledger that **also embeds the full active pet object** (name, stage, stats). Overlaps with the gamification fields embedded on `users`.
- **pets** (24 docs) — pet catalog keyed by unique `pet_id`: display name, stages/evolution, cost, art asset references. The canonical pet definition.
- **combos** (1 doc) — reward/bonus definition (multipliers, unlock conditions).

### Content

- **courses** (3 docs, ~76 KB each) — top-level course plus a **deeply embedded** `lessons[] → sections[] → steps[]` tree, plus marketing fields (`catalogPreview`, `studentTestimonials`, `enrollmentCta`). Keyed by unique `course_id`.
- **course_lessons** (empty, richly indexed) — the intended **normalized** lesson table (`lesson_id`, `course_id`, `order`, `status`, `lesson_type`, `created_by`). Its existence + indexes prove the team planned to extract lessons out of `courses` but never migrated.
- **flashcards** (16 docs) — atomic card keyed by unique `qr_id`: front/back text, `category`, `difficulty`, `deck_id`, `teacher_id`, `is_active`, media refs.
- **flashcard_decks** (1 doc) — deck grouping (`deck_id`, `teacher_id`).
- **quiz_questions** (1 doc) — a quiz definition embedding a `questions[]` array (prompt, options, answer).
- **mini_game_bank** (20 docs) — mini-game items embedding `pairs[]`/options for matching games.
- **media_assets** (645 docs) — media registry: unique on (`course_id`,`lesson_id`,`section_id`,`asset_key`,`path`). The one collection that is already close to normalized.

### AR

- **ar_objects** (28 docs) — renderable AR object keyed by unique `ar_tag`, with `animation_type`.
- **ar_combinations** (9 docs) — combo rule keyed by unique `combo_id`: `required_tags[]`, `flashcard_set`, `semantic_result`, `active`.

### Activity & progress

- **lesson_sessions** (2 docs) — a learner's run through a lesson; unique on (`user_id`,`course_id`,`lesson_id`); embeds `steps[]` progress; has `session_id`.
- **user_course_progress** (3 docs) — per-user, per-course progress summary.
- **session_logs** (7 docs) — AI/tutor session logs; 30-day TTL.
- **ai_feedback** (1 doc) — a single AI feedback record.

### Empty scaffolding (defined via indexes, no data)

`learning_paths`, `learning_progress`, `word_mastery`, `quiz_attempts`, `pronunciation_attempts`, `lesson_step_attempts`, `chat_logs`, `user_sessions`, `feedback_templates`, `flashcard_editor`, `profile_content`, `rag_cache`, `redis_cache`.

## 5. Current MongoDB Design

### 5.1 Keying and references

References are carried as **business string keys**, not `_id` foreign keys:

- `users.email`, `users.username` — unique.
- `pets.pet_id`, `courses.course_id`, `flashcards.qr_id`, `ar_objects.ar_tag`, `ar_combinations.combo_id` — unique business keys.
- Cross-collection links are stored by these string keys: `flashcards.deck_id → flashcard_decks.deck_id`, `flashcards.teacher_id → users`, `lesson_sessions.(user_id, course_id, lesson_id)`, `media_assets.(course_id, lesson_id, section_id)`, `pronunciation_attempts.flashcard_qr_id → flashcards.qr_id`.

No `$jsonSchema` validators exist, so nothing enforces that these references resolve, that types are consistent, or that required fields are present.

### 5.2 Embedding (denormalization)

| Parent | Embeds | Should be |
|---|---|---|
| `courses` | `lessons[] → sections[] → steps[]`, `catalogPreview`, `studentTestimonials`, `enrollmentCta` | `course_lessons`, `lesson_sections`, `lesson_steps`, `course_testimonials` |
| `quiz_questions` | `questions[]` (+ options) | `quiz_questions`, `quiz_options` |
| `mini_game_bank` | `pairs[]` / options | `mini_game_items`, `mini_game_pairs` |
| `users` | gamification state (points, level, streak, owned pets, active pet) | `user_points`, `user_pets` |
| `user_points` | active pet object | FK to `pets` + `user_pets` |
| `lesson_sessions` | `steps[]` progress | `lesson_step_attempts` (already defined, empty) |

### 5.3 Indexes of note

- **Unique business keys**: `users.email`, `users.username`, `pets.pet_id`, `courses.course_id`, `flashcards.qr_id`, `ar_objects.ar_tag`, `ar_combinations.combo_id`, `profile_content.key`, `rag_cache.key`.
- **Composite uniques** (natural keys for relational PKs): `lesson_sessions (user_id, course_id, lesson_id)`, `word_mastery (user_id, course_id, lesson_id, word)`, `media_assets (course_id, lesson_id, section_id, asset_key, path)`.
- **TTL indexes** (retention rules to preserve): `session_logs.started_at` (30 days), `redis_cache.expires_at` / `rag_cache.expires_at` (on-expiry), `pronunciation_attempts.attempted_at` / `quiz_attempts.attempted_at` (90 days).
- **Partial indexes**: `learning_progress` mastered-items (`mastery_level >= 3`), `pronunciation_attempts` processing-status.

## 6. Detected Relationships

### 6.1 One-to-many (1:N)

- `users` 1—N `user_course_progress`, `lesson_sessions`, `session_logs`, `quiz_attempts`, `pronunciation_attempts`, `learning_progress`.
- `courses` 1—N `course_lessons` (intended) 1—N sections 1—N steps.
- `courses` 1—N `media_assets`.
- `flashcard_decks` 1—N `flashcards`.
- `users` (as teacher) 1—N `flashcards`, `flashcard_decks`, `course_lessons.created_by`.
- `flashcards` 1—N `pronunciation_attempts`, `learning_progress` (by `flashcard_qr_id`).
- `quiz_questions` 1—N embedded questions 1—N options.

### 6.2 Many-to-many (M:N)

- **users ↔ pets** — a user can own many pets; a pet type is owned by many users. Currently embedded on `users`/`user_points`. Needs a `user_pets` junction.
- **ar_combinations ↔ flashcards / ar_objects** — a combination references a set (`required_tags[]`, `flashcard_set`); each tag/flashcard participates in many combinations. Needs `ar_combination_tags` / `ar_combination_flashcards` junctions.
- **courses ↔ flashcards** — flashcards are reused across courses/lessons via steps. Needs a `lesson_step_flashcards` (or `course_flashcards`) junction rather than embedding copies.

### 6.3 One-to-one (1:1)

- `users` 1—1 `user_points` (currently split, partly duplicated).

## 7. Proposed Relational Design (PostgreSQL)

Notation: `PK` primary key, `FK` foreign key, `UQ` unique. Prefer surrogate `BIGINT GENERATED ALWAYS AS IDENTITY` (or `uuid`) PKs while retaining existing business keys as `UQ` for migration and external QR/AR scanning.

### 7.1 Identity & gamification

```
users
  id            PK
  email         UQ NOT NULL
  username      UQ NOT NULL
  password_hash NOT NULL
  role          NOT NULL DEFAULT 'student'
  created_at, updated_at

user_points                       -- 1:1 with users
  user_id       PK FK -> users(id)
  points        NOT NULL DEFAULT 0
  level         NOT NULL DEFAULT 1
  streak_days   NOT NULL DEFAULT 0
  active_pet_id FK -> pets(id) NULL
  updated_at

pets                              -- catalog
  id            PK
  pet_id        UQ NOT NULL       -- keep legacy business key
  name          NOT NULL
  cost_points   NOT NULL DEFAULT 0
  metadata      JSONB             -- stages/evolution/art refs

user_pets                         -- M:N users <-> pets
  user_id       FK -> users(id)
  pet_id        FK -> pets(id)
  stage         NOT NULL DEFAULT 1
  unlocked_at   NOT NULL
  PRIMARY KEY (user_id, pet_id)

combos
  id            PK
  metadata      JSONB
```

### 7.2 Content hierarchy (extract from embedded `courses`)

```
courses
  id            PK
  course_id     UQ NOT NULL
  title, description
  category_key
  is_published  NOT NULL DEFAULT false
  created_at, updated_at

course_lessons                    -- already indexed/empty in Mongo
  id            PK
  lesson_id     UQ NOT NULL
  course_id     FK -> courses(id)
  order         NOT NULL
  lesson_type
  status        NOT NULL DEFAULT 'draft'
  created_by    FK -> users(id)
  UQ (course_id, order)

lesson_sections
  id            PK
  lesson_id     FK -> course_lessons(id)
  order         NOT NULL
  title
  UQ (lesson_id, order)

lesson_steps
  id            PK
  section_id    FK -> lesson_sections(id)
  order         NOT NULL
  step_type     NOT NULL          -- flashcard | quiz | pronunciation | ar | mini_game
  ref_id                            -- points at flashcard/quiz/mini_game/ar_combo
  config        JSONB
  UQ (section_id, order)

course_testimonials
  id            PK
  course_id     FK -> courses(id)
  author, quote, rating
```

### 7.3 Flashcards, quizzes, mini-games

```
flashcard_decks
  id PK, deck_id UQ, teacher_id FK -> users(id), title

flashcards
  id PK, qr_id UQ NOT NULL
  deck_id     FK -> flashcard_decks(id)
  teacher_id  FK -> users(id)
  front, back, category, difficulty
  is_active   NOT NULL DEFAULT true

quiz_questions
  id PK, quiz_id UQ, title
quiz_items
  id PK, quiz_id FK -> quiz_questions(id), prompt, answer, order
quiz_options
  id PK, quiz_item_id FK -> quiz_items(id), label, is_correct

mini_games
  id PK, title, game_type
mini_game_pairs
  id PK, mini_game_id FK -> mini_games(id), left_value, right_value
```

### 7.4 AR

```
ar_objects
  id PK, ar_tag UQ NOT NULL, animation_type, asset_ref

ar_combinations
  id PK, combo_id UQ NOT NULL, semantic_result, active NOT NULL DEFAULT true

ar_combination_tags               -- M:N combo <-> ar_object(tag)
  combo_id FK -> ar_combinations(id)
  ar_object_id FK -> ar_objects(id)
  PRIMARY KEY (combo_id, ar_object_id)

ar_combination_flashcards         -- M:N combo <-> flashcard
  combo_id FK -> ar_combinations(id)
  flashcard_id FK -> flashcards(id)
  PRIMARY KEY (combo_id, flashcard_id)
```

### 7.5 Activity & progress

```
lesson_sessions
  id PK, session_id UQ
  user_id FK, course_id FK, lesson_id FK
  status, started_at, updated_at
  UQ (user_id, course_id, lesson_id)

lesson_step_attempts
  id PK
  session_id FK -> lesson_sessions(id)
  step_id    FK -> lesson_steps(id)
  user_id    FK -> users(id)
  result JSONB, attempted_at

user_course_progress
  user_id FK, course_id FK, percent, updated_at
  PRIMARY KEY (user_id, course_id)

quiz_attempts / pronunciation_attempts / word_mastery / learning_progress
  -- per-user activity tables keyed by (user_id, ...), retain TTL via
  -- scheduled purge jobs / partitioning (Postgres has no native TTL)

media_assets
  id PK
  course_id FK, lesson_id FK, section_id FK
  asset_key, path, kind
  UQ (course_id, lesson_id, section_id, asset_key, path)

session_logs / chat_logs
  id PK, user_id FK, started_at, payload JSONB
  -- retention via partition drop / cron purge
```

## 8. Duplicated Entities

1. **Pet state — three representations**: (a) `pets` catalog, (b) gamification fields embedded on `users`, (c) active pet object embedded in `user_points`. The same pet can be described three ways with no guarantee they agree. → Consolidate into `pets` + `user_pets` + `user_points.active_pet_id`.
2. **Flashcards** — standalone `flashcards` collection **and** flashcard content embedded inside `courses` lesson steps. → Reference `flashcards.id` from `lesson_steps`.
3. **Quizzes** — `quiz_questions` collection **and** quiz steps embedded in `courses`. → Reference `quiz_questions.id`.
4. **Mini-games** — `mini_game_bank` collection **and** mini-game steps embedded in `courses`. → Reference `mini_games.id`.
5. **AR combinations** — defined in both `edu_platform.ar_combinations` and `eduplatform.ar_combinations` (the latter empty). → Single table.
6. **Whole-database duplication** — `edu_platform` vs `eduplatform`: identical collection/index definitions; `eduplatform` is empty. → Drop the legacy namespace after confirming nothing writes to it.

## 9. Anti-Patterns

- **Massive embedded trees** — `courses` at ~76 KB average object size embeds the full lesson/section/step hierarchy; any lesson edit rewrites the whole course document and blocks reuse of content across courses.
- **Empty "intended" normalized tables** — `course_lessons` is fully indexed but empty: a half-finished normalization the app never adopted. Design intent and runtime reality diverge.
- **No schema validation** — `validators.json` empty for all 46 namespaces; types/required fields enforced only in app code (or not at all).
- **Business-key references without integrity** — string keys (`course_id`, `qr_id`, `pet_id`) used as foreign keys with no FK constraint; orphaned references are possible and undetectable at the DB layer.
- **Mixed concerns in `users`** — authentication + profile + game economy in one document, updated by unrelated features (write contention, unclear ownership).
- **Two sources of truth for points/pets** — `users` embedded gamification vs `user_points`.
- **Encoding corruption** — Vietnamese text in `courses` is mojibake-corrupted, while `flashcards`/`quiz_questions` store correct Unicode. Indicates an inconsistent write path / encoding bug for course content.
- **Duplicate database namespaces** — `edu_platform` vs `eduplatform`.

## 10. Risks

- **Data-integrity risk**: no validators + string FKs means the export may already contain orphaned references and type drift; a naive migration will fail FK creation until data is cleaned.
- **Encoding risk**: corrupted `courses` text must be repaired (or re-sourced) before migration, or the corruption becomes permanent in Postgres.
- **Migration complexity**: the embedded `courses` tree must be exploded into `course_lessons`/`lesson_sections`/`lesson_steps`, generating deterministic keys from array order. Ambiguity here can scramble lesson ordering.
- **Ambiguous ownership of pet/points state**: reconciling three pet representations requires a business rule for which source wins.
- **TTL semantics**: Postgres has no native TTL; the retention guarantees (`session_logs` 30 d, attempts 90 d, cache on-expiry) must be reimplemented via partitioning + scheduled purge, or the data-retention/GDPR behavior silently changes.
- **Low data volume masks issues**: with only 1–3 docs in key collections, schema variance may be under-sampled — the migration schema should be validated against app code, not just this export.
- **Legacy namespace**: dropping `eduplatform` without confirming no service targets it risks breaking a hidden consumer.

## 11. Missing Constraints (to add in PostgreSQL)

- **NOT NULL**: `users.email/username/password_hash`, all `*_id` business keys, all `order` fields, timestamps.
- **Foreign keys** with `ON DELETE` policy for every reference in §6 (currently none exist).
- **Unique constraints**: promote every unique Mongo index to a `UNIQUE` constraint (`email`, `username`, `pet_id`, `course_id`, `qr_id`, `ar_tag`, `combo_id`, `profile_content.key`) and each composite natural key (`lesson_sessions`, `word_mastery`, `media_assets`).
- **CHECK constraints**: `difficulty`/`mastery_level` ranges, `role`/`status`/`step_type`/`lesson_type` enumerations (or Postgres `ENUM`/lookup tables), `points >= 0`, `rating` bounds.
- **DEFAULTs**: booleans (`is_active`, `is_published`, `active`), counters, timestamps.
- **Referential integrity for junctions**: composite PKs on `user_pets`, `ar_combination_tags`, `ar_combination_flashcards`.

## 12. Legacy / Deprecated Fields & Structures

- **`eduplatform.*`** — entire duplicate namespace, empty. Legacy; exclude from migration.
- **`courses` marketing blocks** (`catalogPreview`, `studentTestimonials`, `enrollmentCta`) — presentation data mixed into the domain aggregate; migrate to a dedicated `course_testimonials`/CMS table or keep as `JSONB` if purely display.
- **Embedded flashcard/quiz/mini-game copies inside `courses`** — superseded by standalone collections; treat embedded copies as legacy and reference the canonical tables instead.
- **Embedded gamification on `users`** — superseded by `user_points`; migrate then drop the embedded fields.
- **Active-pet object embedded in `user_points`** — replace with `active_pet_id` FK.
- **`redis_cache` / `rag_cache`** — operational cache collections, not domain data; do **not** migrate to Postgres (belong in Redis / a cache layer).
- **Empty scaffolding collections** (`flashcard_editor`, `profile_content`, `feedback_templates`, `learning_paths`, etc.) — carry forward only those the application actively uses; the rest are unrealized design intent.

## 13. Recommended Migration Sequence

1. Freeze writes / snapshot; confirm `eduplatform` is unused.
2. Repair `courses` text encoding in a staging copy of the export.
3. Load reference/catalog tables first (`users`, `pets`, `courses`, `flashcard_decks`, `ar_objects`).
4. Explode embedded `courses` tree → `course_lessons` → `lesson_sections` → `lesson_steps` (derive order from array index).
5. Rebuild references as surrogate FKs while keeping business keys as `UNIQUE`.
6. Migrate activity/progress tables; add FKs last and quarantine orphaned rows.
7. Reconcile pet/points into `user_points` + `user_pets`; drop embedded duplicates.
8. Reimplement TTL via partitioning + scheduled purge.
9. Add CHECK/NOT NULL/UNIQUE constraints; validate against application code.
