# SQLAlchemy learner ORM foundation - 2026-08-14

Status: **IMPLEMENTED / PARTIAL ADOPTION**.

The live Supabase learner tables were inspected before implementation. The new
SQLAlchemy engine retains the asyncpg-compatible Supabase transaction-pooler
behavior by disabling asyncpg prepared-statement caching and converting the
existing secret URL in code.

The request-scoped course service now uses mappings for courses, lessons,
lesson_sessions, lesson_session_steps, lesson_step_attempts,
user_course_progress, and user_course_lesson_progress. Historical SQL
migrations are unchanged. The empty Alembic baseline revision records the
verified schema and must be stamped after Alembic is installed in deployment;
it does not recreate historical schema history.

The legacy `api/lessons.py` lesson-media path still uses the old asyncpg
repository, so direct SQL is **not fully retired**. This is an explicit
compatibility boundary, not a claim of complete raw-SQL removal.

## ORM-H1 hardening audit (2026-08-14)

Alembic 1.19.1 was installed from `backend/requirements.txt`. Its reflection
scope now derives from ORM metadata and only includes the public ORM-mapped
tables; unmapped public tables are not candidates for autogenerate removal.

The live, non-destructive metadata comparison was intentionally stopped before
baseline stamping. It proposed 44 destructive changes *inside the managed
tables*: removal of live indexes, check constraints, and foreign keys, together
with foreign-key schema-qualification replacement. The current ORM mappings do
not yet represent those live constraints/indexes completely enough for Alembic
to own them safely. `public.alembic_version` remains absent and the
`20260814_orm_baseline` revision is **not stamped**.

The SQLAlchemy engine now disables both asyncpg's `statement_cache_size` and
SQLAlchemy asyncpg dialect's `prepared_statement_cache_size`; this retains
transaction-pooler-safe prepared-statement behavior. No application tables or
data were changed by this audit.
