# MongoDB to PostgreSQL source map

## Execution and cutover addendum - 2026-08-13

Status: `POSTGRES_CUTOVER_COMPLETE`.

Qualifiers: `LEARNER_CORE_COMPLETE`, `LEGACY_NON_CORE_MONGO_REMAINS`,
`BACKEND_SCHEMA_READY_CONTENT_DATA_MISSING`.

The approved Supabase target `rofprrtoeyirssfndxag` (`Edu-platform-project`)
now contains the versioned local schema from
`backend/database/postgres/migrations/20260812_01_mobile_core.sql` and a real
source import read through MongoDB MCP. The importer transaction committed the
following primary records: 12 users, 4 courses, 23 lessons, 1 flashcard deck,
24 canonical flashcards, 37 AR objects, 24 tracking-target records, 9 AR
combinations, 645 media assets, 24 pets, 20 mini-game items, 3 quiz questions,
2 user-course-progress records, 2 lesson sessions, and 8 user-gamification
records.

The import ledger records five non-silent exceptions: `tree_palm_02` is the
approved duplicate skipped in favour of `jungle01`; one guest progress record,
one demo-user aggregate, one stale zero-XP processing event, and one
pronunciation row without a public `attempt_id` are `SKIPPED_WITH_REASON`.

`ar_tracking_targets` is the frozen native tracking owner. It is one-to-one
with canonical `flashcards.qr_id`; it contains nullable
`reference_image_url` and positive-only nullable `physical_width_m`. No source
image, model, pixel dimension, or legacy MindAR URL was promoted to either
native field. All 24 imported rows have both fields NULL. `ar_objects` retains
semantic/model ownership only, and `flashcards.ar_tag` remains non-unique.

The FastAPI PostgreSQL connection boundary and learner-core adapters are now
verified behind `POSTGRES_CORE_ENABLED=true`. Normal learner-core startup does
not initialize MongoDB/Beanie. Remaining Mongo repositories are non-core/admin,
legacy, or cache paths and do not block the mobile learner-core release.

## Status

`SOURCE_MAPPED` — 2026-08-12. This document is the Phase 0 source-of-truth
mapping for the configured, read-only MongoDB source. It is deliberately based
on live MCP evidence, not solely on Beanie models.

Safe source evidence: connection `preconfigured`; source database
`edu_platform` (31 collections, 841 documents). A second database named
`eduplatform` exists but contains zero documents, so it is not a migration
source. Connection credentials are not recorded here.

## Scope classification and inventory

| Collection | Live count | Classification | Target responsibility | Source notes |
|---|---:|---|---|---|
| users | 12 | MIGRATE_REQUIRED | `users` | Mongo `_id` is the public string identity in existing references. |
| courses | 4 | MIGRATE_REQUIRED | `courses`, `lessons`, lesson child tables | 23 embedded lessons; `course_lessons` is empty. |
| flashcards | 25 | MIGRATE_REQUIRED | `flashcards` | `qr_id` is the business identity. |
| flashcard_decks | 1 | MIGRATE_LATER | `flashcard_decks` | Retain deck metadata and relation. |
| user_course_progress | 3 | MIGRATE_REQUIRED | `user_course_progress`, `lesson_progress` | One guest-user orphan is reported below. |
| lesson_sessions | 2 | MIGRATE_REQUIRED | `lesson_sessions`, `lesson_session_steps` | Session identity is distinct from lesson identity. |
| lesson_step_attempts | 0 | MIGRATE_REQUIRED | `lesson_step_attempts` | Empty but active model/index contract. |
| learning_progress | 0 | MIGRATE_REQUIRED | `learning_progress` | Empty but mobile spaced-repetition model. |
| word_mastery | 0 | MIGRATE_REQUIRED | `word_mastery` | Empty but active course repository contract. |
| learning_paths | 0 | MIGRATE_REQUIRED | `learning_paths` | Empty but one-per-user mobile API contract. |
| user_points | 9 | MIGRATE_REQUIRED | `user_gamification` plus child pet/sticker state | Aggregate starting state, not synthetic event history. |
| gamification_events | 1 | MIGRATE_REQUIRED | `gamification_events` | Must enforce `UNIQUE (user_id, event_id)`. |
| pronunciation_attempts | 1 | MIGRATE_REQUIRED | `pronunciation_attempts` | Live record lacks `attempt_id`; see anomalies. |
| quiz_attempts | 0 | MIGRATE_REQUIRED | `quiz_attempts` | Empty retained contract. |
| quiz_questions | 1 | MIGRATE_LATER | `quiz_questions`, `quiz_question_options` | Flashcard-owned question bank. |
| mini_game_bank | 20 | MIGRATE_REQUIRED | `mini_game_items` | Flexible per-game configuration needs a JSONB payload. |
| pets | 24 | MIGRATE_REQUIRED | `pets` | Static catalog, `pet_id` business key. |
| ar_objects | 37 | MIGRATE_REQUIRED | `ar_objects` | Native tracking fields are absent in all live records. |
| ar_combinations | 9 | MIGRATE_REQUIRED | `ar_combinations`, `ar_combination_tags` | Active mobile multi-card data. |
| combos | 1 | MIGRATE_LATER | legacy compatibility only | Duplicate/legacy combination representation. |
| media_assets | 645 | MIGRATE_REQUIRED | `media_assets` | Stores structured references only; binaries remain in Supabase Storage. |
| user_sessions | 0 | MIGRATE_LATER | `user_sessions` | Empty session model. |
| session_logs | 20 | MIGRATE_LATER | `session_logs` | TTL/audit-like telemetry. |
| ai_feedback | 1 | MIGRATE_LATER | `ai_feedback` | Legacy feedback record. |
| feedback_templates | 24 | MIGRATE_LATER | `feedback_templates` | Content templates. |
| flashcard_editor | 0 | LEGACY_WEB_ONLY | retain in Mongo initially | Admin/editor surface is not a mobile gate. |
| profile_content | 1 | LEGACY_WEB_ONLY | retain in Mongo initially | Web marketing/profile content. |
| redis_cache | 0 | UNUSED/UNKNOWN | do not migrate | Cache, not business persistence. |
| rag_cache | 0 | UNUSED/UNKNOWN | do not migrate | Cache, not business persistence. |
| chat_logs | 0 | MIGRATE_LATER | `chat_logs` | Not a current mobile release gate. |

## Identity and relationship map

| Identity | Live owner and type | Proposed target identity | Evidence / relationship |
|---|---|---|---|
| user_id | `users._id` ObjectId, referenced as string | `users.id TEXT` preserving the 24-hex string | Progress, sessions, events, and attempts use its string form. |
| course_id | `courses.course_id` string | `courses.course_id TEXT PK` | All live progress and lesson sessions join successfully to courses. |
| lesson_id | embedded `courses.lessons[].lesson_id` string | `lessons.lesson_id TEXT` with course FK | There are 23 embedded lessons; `course_lessons` has no live records. |
| qr_id | `flashcards.qr_id` string | `flashcards.qr_id TEXT UNIQUE` | Public flashcard / QR identity. |
| ar_tag | `flashcards.ar_tag`, `ar_objects.ar_tag` strings | Separate columns; do not make the flashcard value unique | Two flashcards share one `ar_tag`; `ar_objects.ar_tag` has no duplicate group. |
| combo_id | `ar_combinations.combo_id` string | `ar_combinations.combo_id TEXT UNIQUE` | Required tags form a child relation. |
| session_id | lesson/user session string | `lesson_sessions.session_id TEXT UNIQUE` | Not a user ID, course ID, or event ID. |
| attempt_id | intended `pronunciation_attempts.attempt_id` string | `pronunciation_attempts.attempt_id TEXT UNIQUE` | The live record is missing it; migration must quarantine/report it, not substitute `_id`. |
| event_id | `gamification_events.event_id` string | `gamification_events.event_id TEXT`, unique with user | Distinct retry/idempotency identity. |
| pet_id | `pets.pet_id` string | `pets.pet_id TEXT UNIQUE` | User owned/unlocked pet arrays reference it. |
| Mongo `_id` | ObjectId | retained only as `legacy_mongo_id` where needed | Do not expose a new surrogate ID in existing API contracts. |

## Field mapping

The field lists below are complete for the mobile-required live collections.
`[]` denotes a normalized child table; `JSONB` is used only for flexible or
heterogeneous payloads. All Mongo `Date` values map to `TIMESTAMPTZ` and all
Mongo strings map to `TEXT` unless otherwise stated.

| Mongo collection | Mongo fields / observed shape | Existing model / API name | Target table / columns | Transform and constraints |
|---|---|---|---|---|
| users | `_id:ObjectId`, `email`, `username`, `full_name?`, `avatar_url?`, `hashed_password`, flags, `role`, `roles[]`, `active_pet?`, `unlocked_pets[]`, `pet_preferences?`, timestamps | `UserDocument`, `UserResponse` | `users(id,email,username,full_name,avatar_url,hashed_password,is_active,is_verified,is_superuser,role,roles JSONB,active_pet_id,pet_preferences JSONB,created_at,updated_at,last_login)`; `user_unlocked_pets(user_id,pet_id)` | `id=string(_id)`; email and username unique; optional pet FK only after catalog import. |
| courses | `course_id`, title/description fields, category/theme/age/level, `thumbnail?`, `catalogPreview[]`, `studentTestimonials[]`, `enrollmentCta?`, `lessons[]`, published/timestamps | `CourseSchema`, course API | `courses` plus `lessons`, `lesson_vocabulary`, `lesson_quiz_questions`, `lesson_quiz_options`, `lesson_assets`, and JSONB only for flexible game/activity/reward payloads | Extract embedded lessons in `order`; `course_id` unique; no source `course_lessons` rows exist. |
| flashcards | `qr_id`, `ar_tag`, word, bilingual `translation` document, definition, category, image/audio URLs, difficulty, animation hint, embedding? timestamps | `Flashcard`, `FlashcardResponse` | `flashcards(qr_id,ar_tag,word,translation JSONB,definition,category,image_url,audio_url,difficulty,image_animation_type,created_at,updated_at)` | `qr_id` unique; keep `ar_tag` non-unique. Embeddings stay out of PostgreSQL/Qdrant owns vector search. |
| user_course_progress | `user_id`, `course_id`, `completed_lessons[]`, `current_lesson_id`, `lesson_progress[]`, `rewards[]`, dates/status/total_xp | `UserProgress` | `user_course_progress(user_id,course_id,current_lesson_id,status,total_xp,started_at,updated_at)` and `user_course_lesson_progress(...)` | Composite `(user_id,course_id)` unique; child rows from `lesson_progress`; reward payload remains JSONB. |
| lesson_sessions | user/course/lesson/session IDs, status/current step/progress, `steps[]`, dates | `LessonSession` | `lesson_sessions` and `lesson_session_steps` | Enforce source declared session and user-course-lesson unique keys. `last_response` is JSONB. |
| media_assets | course/lesson/section IDs, asset key, bucket/path, type/status, public URL, provider, metadata, dates | `MediaAssetRecord` | `media_assets` | Unique `(course_id,lesson_id,section_id,asset_key,path)`; do not copy binary objects. |
| learning_paths | user id, topic array, daily goals, notification/timestamps | `LearningPathDocument` | `learning_paths` | `user_id` unique; topic order retained in `priority_topics JSONB`. |
| learning_progress | user id, flashcard QR, counters/mastery/timestamps | `LearningProgressDocument` | `learning_progress` | Unique `(user_id,flashcard_qr_id)`, FKs to users/flashcards. |
| word_mastery | user/course/lesson/word, mastery metrics, timestamps | course repository | `word_mastery` | Unique `(user_id,course_id,lesson_id,word)`. |
| user_points | user id, totals/level/streak, `pet` document, badges array, sticker objects | gamification API/service | `user_gamification` with `user_gamification_stickers`; pet state JSONB; badges JSONB | Migrate aggregate state as starting XP. Do not invent historical ledger events. |
| gamification_events | user/event/action/source IDs, optional context IDs, XP/status/result snapshot, metadata, dates | `GamificationEventDocument`, `AddXPEvent*` | `gamification_events` | `UNIQUE(user_id,event_id)`; metadata JSONB; C26 transaction operates here and `user_gamification`. |
| pronunciation_attempts | user, flashcard QR, audio refs, text/scores/feedback, course/lesson/section/session, AI metadata/status/xp/timestamps | `PronunciationAttemptDocument`, response DTO | `pronunciation_attempts` | `attempt_id` must be a separately persisted public ID and unique; variable word feedback/device data is JSONB. |
| quiz_questions / quiz_attempts | flashcard QR/questions/options; user/type/score/timing | quiz models | `quiz_questions`, `quiz_question_options`, `quiz_attempts` | Questions/options normalized; preserve optional flashcard relation. |
| mini_game_bank | game type, flashcard QR, content, choices/pairs, rewards, heterogeneous `game_config` | game service | `mini_game_items` | Core identity/type columns plus `game_config JSONB`; arrays become JSONB because shapes vary by game type. |
| pets | `pet_id`, names, model/texture/thumbnail URLs, category/rarity/color, animations[], unlock condition, dates/status | `PetDocument` | `pets` | `pet_id` unique; animations JSONB, unlock condition JSONB. |
| ar_objects | `ar_tag`, description, animation, `glb_size`, legacy MindAR data, model/texture/2D URLs, transform strings, dates | `ARObject`, AR response | `ar_objects` | `ar_tag` unique; transform values remain typed text for API compatibility. Add nullable typed `reference_image_url TEXT`, `physical_width_m NUMERIC CHECK (>0)`. Never derive either. |
| ar_combinations | `combo_id`, tags[], model/media URLs, transform, active/priority/reward and optional semantic fields | `ARCombination` | `ar_combinations` + `ar_combination_required_tags` | `combo_id` unique; tags normalized and ordered. |
| flashcard_decks / feedback_templates / session_logs / ai_feedback | live structural fields captured by MCP | respective Beanie/repository layers | similarly named tables | Migrate later only; no release dependency. |

## Live data quality and source/model mismatches

1. The configured FastAPI default in `backend/settings.py` is `eduplatform`,
   while the live populated source is `edu_platform`. This is a deployment
   configuration mismatch, not a reason to use the empty database as source.
2. `courses` has four records and 23 embedded lessons, while the separately
   declared `course_lessons` collection has zero records. The embedded course
   lessons are migration source truth.
3. `ar_objects` live documents do not contain the current model's mandatory
   `mind_catalog_id` or `mind_target_index` fields. No migration may fabricate
   those values.
4. Every one of 25 flashcards and 37 AR objects is missing both
   `reference_image_url` and `physical_width_m` and has no observed legacy
   alias among the requested candidate fields. `image_url`/`image_2d_url` are
   not silently promoted; `model_3d_url` and `glb_size` are never fallbacks.
5. One `user_course_progress` record has a guest user with no user document;
   one `user_points` record has a demo user with no user document; one
   pronunciation attempt points to a non-existent flashcard and lacks an
   `attempt_id`. These are `SKIPPED_WITH_REASON` unless a documented parent is
   supplied.
6. Flashcard `ar_tag` has one duplicate group of two documents, so a unique
   target constraint would corrupt valid/legacy source semantics.
7. The live `gamification_events` record is stuck in `processing` with zero
   XP. This matches the known obsolete Beanie runtime baseline; preserve
   intended C26 semantics in PostgreSQL rather than migrating it as an applied
   reward.
8. MCP exposed live index names and keys. Its index response does not expose
   index options, so unique status is corroborated with source model/index
   declarations and must be re-verified in a direct PostgreSQL constraint test.

## Index map

| Mongo index evidence | PostgreSQL equivalent |
|---|---|
| `users.email_1`, `users.username_1` with declared unique Beanie fields | unique `users(email)`, unique `users(username)` |
| `courses.course_id_unique` | unique `courses(course_id)` |
| `flashcards.qr_id_1` declared unique | unique `flashcards(qr_id)` |
| `lesson_sessions` user/course/lesson and session indexes | unique `(user_id,course_id,lesson_id)`, unique `(session_id)` |
| `user_event_unique` | unique `(user_id,event_id)` |
| `pronunciation_attempts.attempt_id_1` declared unique | unique `pronunciation_attempts(attempt_id)` |
| `media_asset_course_lesson_section_key_path_unique` | unique `(course_id,lesson_id,section_id,asset_key,path)` |
| `learning_progress` user/flashcard key | unique `(user_id,flashcard_qr_id)` |
| `word_mastery` user/course/lesson/word key | unique `(user_id,course_id,lesson_id,word)` |
| declared cache/TTL indexes | not migrated as relational business constraints |

## Native AR readiness snapshot

| Records inspected | NATIVE_READY | MISSING_REFERENCE_IMAGE | MISSING_PHYSICAL_WIDTH | MISSING_BOTH | LEGACY_MINDAR_ONLY |
|---|---:|---:|---:|---:|---:|
| flashcards (25) | 0 | 0 | 0 | 25 | 25 |
| ar_objects (37) | 0 | 0 | 0 | 37 | 37 |

`BACKEND_SCHEMA_READY_CONTENT_DATA_MISSING` is the only possible eventual AR
blocker status until content owners provide at least one verified tracking image
and physical printed-card width in metres.
