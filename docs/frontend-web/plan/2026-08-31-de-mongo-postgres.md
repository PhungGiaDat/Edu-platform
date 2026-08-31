# De-Mongo: Postgres as Single Source of Truth — Plan

**Status:** Proposed — pending product owner approval (2026-08-31).
**Related:** [progress 2026-08-30](../progress/2026-08-30-dictionary-notebook-wiki.md) (notebook/chat_logs/learning_progress already Postgres-native).

## Context — the split-brain

- 15 Mongo repositories (`BaseRepository`, Mongo filter-dict style, ~264
  methods) still serve runtime reads/writes for flashcards, courses,
  lessons, quizzes, games, sessions, admin, chat, feedback, parental
  controls.
- The **Postgres schema already exists with a migrated data snapshot**
  (`flashcards` 37 rows, `courses` 4, `lessons` 23, `quiz_questions` 28,
  `mini_game_items` 25, `session_logs` 340, `users` 23) — evidence of a
  previous import (`import_mongo_live.py`, `legacy_collection_documents`).
- The production server has **no reachable MongoDB** → every Mongo-backed
  read/write fails or silently degrades. Postgres is a stale snapshot.
- Result: exactly the data-inconsistency the product owner flagged.

## Decision

Make Postgres the single runtime store by replacing the persistence layer
under the existing repository interfaces — **replace persistence, NOT
product behavior** (per AGENTS.md). Mongo code becomes unreachable, then
is deleted.

## Strategy — adapter, not 264 hand-written methods

1. **`BasePostgresRepository`** (new, `database/postgres_base_repo.py`):
   implements the same generic interface (`find_one/find_many/insert_one/
   insert_many/update_one/delete_one/count`) by translating the Mongo-style
   filter dicts to parameterized SQL against a per-repo table + column map.
   Supported operators: equality, `$in`, `$ne`, `$gt/$gte/$lt/$lte`, `$set`,
   sort, limit. Anything unsupported raises loudly (fail fast, add override).
2. **Per-repo swap**: each Mongo repo changes base class + gains a
   `_TABLE`/`_COLUMNS` map + `_id`↔`id` handling; complex/aggregation
   methods get hand-written SQL overrides (expected: minority).
3. **Domain waves** (web-first priority, independently verifiable):

| Wave | Repos | Postgres tables (rows ready) |
|---|---|---|
| W1 Core learner | `flashcard_repository` (16m), `course_lesson_repository` (18m), `lesson_media_repository` (22m) | flashcards(37), flashcard_decks(2), courses(4), lessons(23), media_assets |
| W2 Quiz + Games | `quiz_repository` (5m), `game_repository` (6m) | quiz_questions(28), quiz_attempts, mini_game_items(25) |
| W3 Progress | `learning_progress_repository` (18m) | learning_progress(0 — fresh start, see risks) |
| W4 Sessions | `session_log_repository` (14m), `session_tracking_repository` (27m), `user_session_repository` (14m), `cache_repository` (12m) | session_logs(340) |
| W5 Admin + misc | `admin_repository` (45m), `ai_repository` (7m), `chat_repository` (12m), `feedback_template_repository` (24m), `parental_controls_repository` (14m) | users(23), chat_logs, misc |

4. **Cleanup (W6)**: `main.py` Mongo connect → removed; `MONGO_URL` becomes
   optional; `database/mongodb.py`, `base_repo.py`, Mongo-only models and
   scripts deleted; `database_engine = "postgres"`.

## Risks

- **Learning progress data**: Postgres table is empty; server has no Mongo
  to backfill from. If a Mongo cluster holds real progress data, run
  `import_mongo_live.py` once before W3; otherwise accept fresh start.
- **Field-name drift** Mongo↔SQL (e.g. `_id`/`id`, camelCase vs snake_case)
  — each repo swap includes a column map + the domain's existing focused
  tests as the contract.
- **Complex filters** beyond the supported operator set → hand-written SQL
  override in that repo (fail-fast surfaces them in tests, not production).
- **Concurrent sessions** on the branch: each wave lands as its own commit
  series; rebase before starting a wave.

## Acceptance gates

- Per repo: existing focused tests pass against the Postgres implementation;
  new adapter tests for the filter translator; `tsc`/`pytest` gates green.
- Per wave: runtime smoke against Supabase (read a real row, write, read
  back) recorded in `progress/2026-08-31-de-mongo-postgres.md`.
- W6 exit: `grep -r "get_database\|BaseRepository\b" backend/services
  backend/api backend/repositories` returns zero Mongo hits; app boots with
  `MONGO_URL` unset.
