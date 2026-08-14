# Course enrollment reconciliation — 2026-08-14

## Scope

Reconciled the React Native Course/Enrollment lane only. R10 session timing,
Unity, AR, gamification behavior, and course schema were not changed.

## DQ-1 status

**RESOLVED (for the historical DQ-1):** DQ-1 is the canonical Animals-course
source decision, not a separate enrollment-model decision. The canonical
learner parity matrix classifies `AnimalsCourse` as LEGACY and
`AnimalsAdventure` as the canonical MERGE source. The older learner migration
plan still has DQ-1 in its open-decision table; this progress record records
the spec-level resolution without rewriting that historical plan.

## Enrollment model and backend contract

The current domain uses a per-user `user_course_progress` record as the
enrollment/start state. `POST /api/v1/courses/{course_id}/start` creates the
initial progress record when absent and otherwise upserts the existing record.
It preserves `current_lesson_id`, `completed_lessons`, lesson progress, XP,
and rewards on a repeat call.

The route now requires the authenticated user and rejects a request body whose
`user_id` differs from that user. This preserves the existing request shape
while preventing a client from starting a course for another learner.
`GET /api/v1/users/{user_id}/progress` applies the same authenticated-user
boundary, which makes it safe for Course Detail to use as its authoritative
re-entry state.

## React Native reconciliation

`CourseDetailScreen` now receives course-specific progress from
`useCourseDetail(courseId, userId)`. Progress is fetched from
`GET /users/{user_id}/progress` on entry and when the screen regains focus;
the screen derives `completedLessonIds` and the resume target from that server
state. The Start/Continue CTA uses the authenticated `userId`, is disabled
while user/progress/start state is pending or when authoritative progress could
not be read, and only applies returned progress after a successful start
response. Pull-to-refresh and retry re-request both Course and progress. A
failed request does not create local enrollment state.

## Evidence

- PASS: `node --test --experimental-strip-types --import "data:text/javascript,import { register } from 'node:module'; import { pathToFileURL } from 'node:url'; register('./ts-resolver-hook.mjs', pathToFileURL('./'));" src/__tests__/course-detail-start-course.test.ts`
  - 6/6 focused Course Detail source-contract tests passed.
- PRE-EXISTING FAILURE: `npx.cmd tsc --noEmit`
  - three existing gamification errors involving `toAddXpEventWireRequest`
    imported with `import type`; no Course/Enrollment error reported.
- BLOCKED: `python -m pytest tests/test_course_start.py -q`
  - test collection cannot import the PostgreSQL course repository because the
    current Python environment lacks `asyncpg`. No dependency was installed.
- BLOCKED: `python -m compileall -q api/courses.py tests/test_course_start.py`
  - compilation could parse neither file to completion because Python cannot
    replace the existing `backend/api/__pycache__/courses*.pyc` file. A
    no-bytecode AST parse of both files passed.
- PRE-EXISTING FAILURE: the separately existing Course List source test has
  two stale assertions against the current UI (`filteredCourses` as the direct
  FlatList data and localized filter labels). This task did not modify
  `CourseListScreen` or that test.

## Status

- Course UI implementation: IMPLEMENTED; Course Detail progress re-entry
  reconciliation added and source-test verified.
- Course enrollment behavior: CODE_VERIFIED for RN wiring and service-level
  idempotency implementation; backend runtime verification remains BLOCKED on
  the missing Python dependency.
- DQ-1: RESOLVED as the Animals canonical-source decision; it does not choose
  or introduce a new enrollment entity.
- Learning Session / DQ-10: unchanged; DQ-10 remains OPEN.
