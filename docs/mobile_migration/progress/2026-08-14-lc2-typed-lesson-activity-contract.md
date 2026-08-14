# LC2 Typed Ordered Lesson Activity Contract

## Status

- Requirements: **LOCKED**
- Backend/RN contract: **IMPLEMENTED**
- Focused tests: **TESTED**
- Supabase additive schema: **VERIFIED**
- Generic RN Activity Renderer: **NOT IMPLEMENTED**
- Seeded schema-v2 Animals Lesson: **NOT IMPLEMENTED**
- End-to-end Learning Session runtime/device flow: **NOT VERIFIED**

## Persistence truth inspected

Live Supabase project `Edu-platform-project` was inspected before DDL. Existing truth was:

- `lessons.learning_blocks JSONB NOT NULL DEFAULT '{}'`
- `lesson_sessions` owned learner/lesson/current-step/progress runtime but had no content revision
- `lesson_session_steps` used primary key `(session_id, step_id)` but sorted only by `step_id`
- `lesson_step_attempts.step_id` already persisted attempt identity
- Lesson/Course progress remained in `user_course_lesson_progress` and `user_course_progress`
- all 23 Lesson rows were flat legacy blocks with no version or `activities`

## Contract implemented

- Canonical envelope: `schema_version=2`, positive `content_version`, canonical vocabulary references, typed ordered `activities[]`.
- Stable common fields: `activity_id`, controlled `type`, positive unique `order`, `required`, controlled `completion_policy`, discriminated `config`; optional `title`/`instructions`.
- Supported types: warm-up, vocabulary, listen/choose, match, drag/drop, memory match, coloring, mini-game, quiz, read-aloud, pronunciation.
- Unknown activity/config fields and runtime state inside authored definitions are rejected.
- Legacy adapter returns schema v1/content v1 with known flat keys and no fabricated activities.

## Additive migration

Applied `backend/database/postgres/migrations/20260814_03_lesson_activity_contract.sql` through Supabase migration tooling.

- `lesson_sessions.content_version INTEGER NOT NULL DEFAULT 1 CHECK >= 1`
- `lesson_session_steps.activity_type TEXT NULL`
- `lesson_session_steps.activity_order INTEGER NULL CHECK NULL OR >= 1`
- `lesson_session_steps.required BOOLEAN NOT NULL DEFAULT TRUE`
- ordered session-step index on `(session_id, activity_order, step_id)`

No table, destructive DDL, Lesson JSON rewrite, or production content seed was added. Both existing sessions read back with `content_version=1`; their 16 legacy steps retained null type/order and `required=true`.

## Runtime mapping

```text
LessonActivity.activity_id
  -> lesson_session_steps.step_id
  -> lesson_step_attempts.step_id
  -> required session steps complete
  -> existing Lesson completion service
  -> user_course_lesson_progress
  -> user_course_progress
  -> Learning Path derivation
```

Resume normalization detects `content_version` changes, remaps saved step state by activity ID, and reapplies authored order/type/required metadata. It does not use the old array index. Runtime state remains in session/attempt tables.

## Files changed

- `backend/models/lesson_activity.py`
- `backend/models/course_model.py`
- `backend/repositories/course_repository.py`
- `backend/services/course_service.py`
- `backend/api/courses.py`
- `backend/database/postgres/migrations/20260814_03_lesson_activity_contract.sql`
- `backend/tests/test_lesson_activity_contract.py`
- `mobile/rn/src/types/course.ts`
- `mobile/rn/src/types/session.ts`
- `mobile/rn/src/types/api.ts`
- `docs/mobile_migration/spec/learner-product-spec.md`
- `docs/mobile_migration/plans/2026-08-14-learner-content-activity-milestone.md`

## Verification

```powershell
.venv\Scripts\python.exe -m pytest backend/tests/test_lesson_activity_contract.py -q -p no:cacheprovider
```

Result: `23 passed` after the final non-empty-v2 contract test was added.

Live readback verified all four new columns, both check constraints, the authored-order index, and legacy-row defaults.
The actual backend PostgreSQL repository also read `learn-the-cat` successfully and returned the schema-v1 compatibility envelope (`LIVE_LEGACY_LESSON_CONTRACT_OK`).

An expanded backend regression selection passed 51 of 52 tests. The remaining existing `test_normalizeCoursePayload_rejectsMissingGeneratedCourseBlock` assertion fails because current `course_integrity.py` explicitly accepts optional `videoLesson`; LC2 did not change that validator. RN `tsc --noEmit` reports three pre-existing `import type` misuse errors in gamification files and no LC2 type errors.

## Compatibility and boundaries

- Legacy `learning_blocks`: readable, unmodified, schema-v1 compatibility response.
- Course enrollment and Lesson/Course progress: unchanged.
- Learning Session foundation: evolved in place; no second session system.
- DQ-10: **OPEN**.
- Unity/native AR: **UNCHANGED**.
- Render deployment: not assessed and not an LC2 gate.
- Supabase RLS: inventory reported RLS disabled across public tables; not changed because policy design is outside LC2.

## Next implementation task

**LC3 — Data-driven Quiz Activity contract**, including repository-backed question selection over existing `quiz_questions`/`quiz_question_options`. Do not execute it as part of LC2.
