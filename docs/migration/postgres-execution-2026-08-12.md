# PostgreSQL execution evidence - 2026-08-12

## Current final status - 2026-08-13

`POSTGRES_CUTOVER_COMPLETE`

- `LEARNER_CORE_COMPLETE`
- `LEGACY_NON_CORE_MONGO_REMAINS`
- `BACKEND_SCHEMA_READY_CONTENT_DATA_MISSING`

PostgreSQL/Supabase is the default learner-core runtime. FastAPI starts with
`POSTGRES_CORE_ENABLED=true`, and normal learner-core startup does not
initialize MongoDB/Beanie. Remaining Mongo repositories are limited to admin,
legacy, cache, and other non-core paths; they do not block the mobile
learner-core release path.

## Scope and target

The remote write was explicitly approved for Supabase project
`rofprrtoeyirssfndxag` (`Edu-platform-project`). The source was the MongoDB MCP
database `edu_platform`, not the empty `eduplatform` database. Source export
contained 841 documents across the known 31 collections.

## Applied artifact

`backend/database/postgres/migrations/20260812_01_mobile_core.sql` was applied
directly to the approved target. It contains no `DROP`, `TRUNCATE`, or
unintended `ON DELETE CASCADE`; relational foreign keys use `RESTRICT` except
optional links that use `SET NULL`.

`backend/database/postgres/import_mongo_live.py` imported a MongoDB MCP export
in a PostgreSQL transaction. It has an explicit exception ledger instead of
silently dropping bad/duplicate source records.

## Data and integrity evidence

| Check | Result |
|---|---:|
| users / courses / lessons | 12 / 4 / 23 |
| flashcards / canonical tracking targets / AR objects | 24 / 24 / 37 |
| AR combinations / combination tags | 9 / 18 |
| media assets / pets / mini-game items | 645 / 24 / 20 |
| duplicate `flashcards.qr_id` groups | 0 |
| unique index on `flashcards.ar_tag` | no |
| orphan tracking targets / combination tags | 0 / 0 |
| populated tracking reference images / physical widths | 0 / 0 |
| duplicate `(user_id,event_id)` gamification groups | 0 |

The exception ledger has five records: canonical duplicate cleanup for
`tree_palm_02`, and four source rows that cannot be represented safely without
inventing identity or retry state.

## FastAPI runtime cutover evidence - 2026-08-13

`POSTGRES_CORE_ENABLED` now defaults to `true`. FastAPI opens the asyncpg pool
with prepared-statement caching disabled (required by the Supabase transaction
pooler) and returns before Mongo/Beanie initialization. MongoDB remains an
archive and is not consulted by the cut-over learner paths.

The additive migration
`backend/database/postgres/migrations/20260813_02_core_runtime.sql` was applied
to the approved target. It adds `lesson_step_attempts` and
`daily_learning_progress`; no source import was rerun and no existing data was
modified for the cutover.

| Domain | Runtime authority and evidence |
|---|---|
| Auth/users | PostgreSQL user repository; register, invalid/valid login, `/auth/me`, and profile lookup passed. |
| Courses/lessons/sessions | PostgreSQL normalized composition; list/detail and authenticated lesson-session start passed. |
| Flashcards/public QR | PostgreSQL; 24 canonical cards, `/flashcard`, `/f/{qr}`, `/verify_qr`, and `/ar_data/{qr}` passed. `tree_palm_02` remains absent. |
| AR | PostgreSQL flashcard -> AR object and tracking-target composition passed for `ele123`. Native image/width stays `NULL`/unavailable; no URL or width was inferred. |
| Learning path/progress | PostgreSQL `learning_paths` and `daily_learning_progress`; write/read smoke passed. |
| C26 | PostgreSQL transaction and unique `(user_id,event_id)`: first request passed, replay returned cached result, semantic conflict returned 409, and concurrent duplicate produced exactly one mutation and one replay. |
| Pronunciation | PostgreSQL attempt repository; a new attempt returned and persisted one stable public `attempt_id`, used as its XP event identity. |
| Game/quiz/pets | PostgreSQL `mini_game_items`, `quiz_questions`, and `pets`; representative learner routes passed. |

The runtime smoke used one temporary user and removed that exact user plus all
dependent test records afterwards (`TEMP_CLEANUP_REMAINING=0`). Redis was
missing from the local environment even though declared; the optional service
now imports safely and uses its existing in-memory fallback when no server is
available. The local environment installed `redis` and `argon2-cffi`; no
dependency declaration was changed.

RN C26 had a concrete transport mismatch: its domain DTO is camelCase while
FastAPI accepts snake_case. `toAddXpEventWireRequest` now explicitly maps
`eventId/sourceType/sourceId/attemptId/sessionId/learningPathId` to the API
wire fields before all three RN call sites post the event. No Unity bridge or
AR DTO was changed.

## Content visibility (expected filtering)

The target has four normalized courses and 23 lessons, but only three courses
and 18 lessons are learner-visible because `animals-adventure-en-5-7` has
`is_published=false`. This matches the prior Mongo repository's published-only
filter. No publication state was changed because doing so would alter source
content behavior. This is expected business filtering, not migration loss. The
course remains unpublished by design; do not change publishing state merely to
make API counts match database totals. It is not a PostgreSQL cutover blocker.

## Remaining runtime scope

Migrated learner paths above do not read/write Mongo. Mongo-backed admin and
legacy routes remain intentionally outside the learner cutover: pet admin CRUD,
course-lessons admin CRUD, reports, chat/RAG cache, flashcard-editor state, and
profile/legacy session helpers. They must not be used as a Mongo fallback for
the migrated production paths.

No RLS policy was enabled or changed. Current application access remains
server-side FastAPI only; direct client database access must remain disabled
until an intentional RLS design is approved.
