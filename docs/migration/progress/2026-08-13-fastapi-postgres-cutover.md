# FastAPI PostgreSQL cutover progress - 2026-08-13

Status: `POSTGRES_CUTOVER_COMPLETE`.

Qualifiers: `LEARNER_CORE_COMPLETE`, `LEGACY_NON_CORE_MONGO_REMAINS`,
`BACKEND_SCHEMA_READY_CONTENT_DATA_MISSING`.

The PostgreSQL default runtime is active and the migrated learner domains have
runtime evidence: auth, courses/lessons/session, flashcards/public QR, AR,
learning progress, C26, pronunciation, game/quiz, and pets. C26 concurrency
produced one apply plus one replay, and the temporary runtime user was fully
removed.

The learner API exposes 3 published courses / 18 lessons because
`animals-adventure-en-5-7` is stored with `is_published=false`. This is expected
content filtering, not migration data loss, and publishing state was not
changed.

Native AR metadata is schema-ready but content-missing: all 24 tracking targets
retain `reference_image_url=NULL` and `physical_width_m=NULL`. This is reported
as native-unavailable and is not a cutover blocker.

RN C26 now serializes its camelCase domain request explicitly to FastAPI's
snake_case request contract. The Unity bridge and native tracking DTO remain
unchanged.

Legacy Mongo repositories remain only for non-core/admin/legacy features and
are not active learner-core dependencies. The next native AR gate is the
RN ↔ Unity bridge smoke test; native image tracking remains content-gated until
one verified tracking image and measured positive physical width are supplied.
