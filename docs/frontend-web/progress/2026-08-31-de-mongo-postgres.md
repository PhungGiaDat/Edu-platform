# De-Mongo: Postgres as Single Source of Truth — Progress

**Date:** 2026-08-31
**Related plan:** `docs/frontend-web/plan/2026-08-31-de-mongo-postgres.md`
**Status:** Wave 1 repos converted + API layer adapted (Task E), smoke-tested against live Supabase.

## Wave 1 repo conversion (done before Task E)

| Repo | Postgres table | Notes |
|---|---|---|
| `flashcard_repository.py` | `public.flashcards` | `BaseRepository`/Mongo removed; returns plain dicts |
| `course_lesson_repository.py` | `public.lessons` | raw SQL; `_COLUMN_MAP`; `_row` parses JSONB + `lesson_order`→`order` |
| `lesson_media_repository.py` | `public.media_assets` | BIGINT identity `id` exposed as `asset_id` |

Migrations added:
- `20260831_01_flashcard_vector_embedding.sql` — `vector_embedding JSONB` on flashcards
- `20260831_02_lessons_schema_align.sql` — lesson_type/created_by/xp_reward/status/vocabulary_items/timestamps on lessons

Seed infrastructure added:
- `backend/database/seed/canonical_momo_courses.py` + `apply_canonical_momo_courses.py` + `manifests/momo_adaptive_courses.json`
- `backend/tests/test_canonical_momo_courses_seed.py` (10 tests)

## Task E — API layer adaptation (this session)

### Fix 1: `GET /course-lessons` unfiltered fallback (`api/course_lessons.py`)

- **Before:** `repo.collection.find({}).skip(skip).limit(limit).sort("+order")` — broke the moment
  `CourseLessonRepository` lost its Mongo `.collection` (AttributeError on every unfiltered list).
- **After:** new `CourseLessonRepository.list_all(status, lesson_type, skip, limit)` does a
  parameterized `SELECT * FROM public.lessons ... ORDER BY lesson_order OFFSET $n LIMIT $n+1`;
  the endpoint delegates to it. Response model (`List[CourseLesson]`) unchanged.

### Fix 2: `POST /flashcard` create path (`repositories/flashcard_repository.py`)

- **Before:** `FlashcardService.create_with_embedding()` called `self.flashcard_repo.create(...)`
  which did not exist on the Postgres repo (the Mongo `BaseRepository` had no `create` either —
  latent defect surfaced by the cutover).
- **After:** `FlashcardRepository.create(flashcard_data)` inserts a row into
  `public.flashcards` (translation/vector_embedding as JSONB) and returns the created dict.
  Verified end-to-end: insert → read back → delete in the live DB.

### Fix 3: Public flashcard editor state (`api/public.py`)

- **Before:** `FlashcardEditor.find_one(...)` (Beanie/Mongo) gated behind
  `if not postgres_core_enabled()` — with Postgres the sole path, editor state was silently
  never loaded.
- **After:** uses `PostgresFlashcardEditorRepository.get_by_flashcard_id()` (existing Postgres
  repo used by the editor API); removed the `postgres_core_enabled` gate and Beanie import from
  `public.py`. Lookup failure degrades to `None` with a warning, preserving the old soft behavior.

## Verification

- `python -m pytest -q` (excluding 2 known pre-existing collection errors +
  Mongo-only suites): **599 passed, 1 skipped** — the only 2 failures are pre-existing
  (`test_course_schema_integrity.py` JSON decode, `test_validator_apply_safety.py` dry-run CLI)
  and unrelated to W1/Task E.
- Focused W1 tests: `test_flashcard_ar_response`, `test_canonical_flashcard_owners`,
  `test_ar_service` → 21 passed.
- `test_canonical_momo_courses_seed` → 10 passed.
- API module imports clean: `api.course_lessons`, `api.public`.
- Runtime smoke against live Supabase (`_task_e_smoke.py`, deleted after):
  - `list_all` returned real rows (first: `my-classroom`), `list_all(status=published)` OK
  - `create` inserted a flashcard, `get_by_qr_id` read it back, row cleaned up
  - editor lookup returned `None` without exception
- Grep gate: `backend/api/*.py` has zero `.collection`, `FlashcardEditor.find_one`,
  `postgres_core_enabled` references.

## Next steps (unchanged per plan)

- W2: quiz + games repos (`quiz_repository`, `game_repository`)
- W3: learning progress
- W4: sessions
- W5: admin + misc
- W6: remove `main.py` Mongo connect, `database/mongodb.py`, `base_repo.py`, Mongo models;
  make `MONGO_URL` optional; `database_engine = "postgres"`; final zero-Mongo grep across
  `services`/`api`/`repositories`.
