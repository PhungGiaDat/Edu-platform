# LC7 — Canonical Animals Content Seed

## Status

- Seed definition: **IMPLEMENTED / TESTED**
- Production apply: **AUTHORIZED BY LC11-PROD-APPLY, SAFELY BLOCKED BEFORE WRITE**
- Production content verified: **NO**
- Assets generated/uploaded: **NO / NO**

## Canonical content

`AnimalsAdventure` (`animals-adventure-en-5-7`) remains the sole canonical learner course. Its canonical Course taxonomy is Nature (`category_key=nature`). `AnimalsCourse` and the legacy Mongo Animals JSON remain readable historical sources only. No topic table or learner preference row was added.

The reproducible source is `backend/database/seed/canonical_animals.py`. It defines five ordered lessons (`learn-the-cat`, `learn-the-dog`, `learn-the-bird`, `learn-the-fish`, `learn-the-rabbit`) and reusable stable vocabulary identities (`animals-v1-*`). Each lesson materialises a validated schema-v2 sequence: learn vocabulary, `memory_match`, quiz.

Each Lesson owns five authored text-only `multiple_choice`-compatible quiz definitions (25 total, two options each); correctness remains relational, not Lesson JSON. Quiz and mini-game database identities are intentionally resolved at controlled PostgreSQL materialisation because the existing tables use database-generated bigint primary keys. The authored stable identities are the vocabulary IDs, lesson/activity IDs, quiz semantic keys, and memory-match vocabulary payload identities; no guessed integer IDs or raw asset URLs are committed to lesson JSON.

## Asset input for LC8

- `course_cover`: 1
- `vocabulary_illustration`: 5
- `pronunciation_audio`: 5
- `warm_up_visual`: 0
- `coloring_outline`: 0

Requirements are content identity plus controlled LC5 role, with no filename inference and no `media_assets` placeholder/ready row. Memory Match image cards carry `vocabulary_id + vocabulary_illustration`, never an AR field or a permanent raw URL.

## Evidence

`pytest tests/test_canonical_animals_seed.py` validates deterministic course/lesson/vocabulary identities, LC2 ordered schema-v2 activity validation, relational Quiz/Game references, LC4/LC5 Memory Match semantics, controlled asset roles, and repeatable dry-run summary. Its fake repository applies the seed twice and snapshots the same Course, five Lessons, 25 Quiz identities, and five Game identities with no duplicate rows. Production application is intentionally excluded by the canonical milestone plan.

## LC11 production apply attempt

The later LC11-PROD-APPLY task added a bounded SQLAlchemy reconciler at `backend/database/seed/apply_canonical_animals.py` and ran its typed validation plus real production dry-run. All five LC2 schema-v2 Lessons, 25 Questions, 50 Options, and five Memory Match payloads validated. The dry-run then stopped before mutation because the existing non-null `quiz_questions.flashcard_qr_id` foreign key requires real `flashcards` owners: only canonical word Cat resolves (`cat001`), while Dog, Bird, Fish, and Rabbit have no flashcard row. Creating those dependency rows was not authorized, and unrelated QR substitution would corrupt ownership. Production writes: **0**.

## Boundaries preserved

No database schema or Alembic revision; no production data, user progress, lesson sessions/attempts, gamification, preferences, media rows, storage, Unity, or AR metadata changed.
