# PostgreSQL ORM persistence architecture

## Canonical boundary

```text
FastAPI Route -> Pydantic contract -> Service -> Repository
    -> SQLAlchemy ORM/Core -> AsyncSession -> asyncpg -> Supabase PostgreSQL
```

Routes own transport and authentication. Services own business semantics and
must not contain SQL. Repositories own persistence operations and receive the
request-scoped `AsyncSession`. Pydantic models are not ORM entities.

SQLAlchemy ORM is the default for ordinary domain persistence. SQLAlchemy Core
is allowed for PostgreSQL-specific, bulk, CTE, or performance-sensitive work.
Raw asyncpg remains only for explicitly unmigrated legacy domains.

## Transaction and session rule

`get_course_service()` creates one `AsyncSession` and `session.begin()` scope
for a learner-course request. Every ORM repository operation in that service
participates in that transaction; repositories do not commit independently.

The engine converts the existing `DATABASE_URL` to `postgresql+asyncpg` in code,
sets asyncpg statement caching to zero for the Supabase transaction pooler, and
uses pre-ping/recycling. No second deployment secret is required.

## Migration rule

Historical files in `backend/database/postgres/migrations/` are immutable.
Future changes follow: update mapping, generate/review Alembic revision, inspect
the revision, test, apply, then verify live schema. Alembic autogenerate must
never be applied when it proposes unexpected or destructive drift.

During incremental adoption, Alembic reflects only the public tables derived
from current ORM metadata. An unmapped existing table is not a table to drop.
The baseline may be stamped only after a managed-table comparison has no
unexplained destructive operations; partial metadata must be expanded to model
live managed indexes, checks, and foreign keys rather than filtering those
objects away.

## Current boundary

Mapped learner core: Course, Lesson, LessonSession, LessonSessionStep,
LessonStepAttempt, UserCourseProgress, UserCourseLessonProgress, plus direct
WordMastery and MediaAsset support. `learning_blocks` remains JSONB and
Pydantic remains authoritative for LC2 activity validation.

Legacy asyncpg repositories remain for unmigrated AR, auth/gamification, quiz,
game, learning-path, and legacy lesson-media routes. They are not a template for
new mapped-domain persistence work.
