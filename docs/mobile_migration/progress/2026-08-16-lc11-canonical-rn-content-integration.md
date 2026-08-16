# LC11 — Canonical React Native Learner Content Integration

## Status

- API integration: **CODE_VERIFIED WITH CANONICAL FIXTURES**
- Canonical Course visible through normal learner API: **NO**
- Canonical Lessons consumable through normal learner API: **0/5**
- Production schema-v2 Lessons: **0/5**
- Course cover consumption: **PASS in RN/API contract; production Course filtered out**
- Vocabulary illustrations: **5/5 live read-only backend resolution plus fixture-safe RN consumption**
- Pronunciation audio: **5/5 live read-only backend resolution plus fixture-safe RN playback integration**
- Memory Match: **PASS in focused tests**
- Quiz: **PASS in focused tests**
- LearningSession activity dispatch: **PASS in focused tests**
- Representative Cat Lesson: **PARTIAL — fixture traversal passes; production content unavailable**
- Device runtime: **NOT VERIFIED**
- Supabase Storage / `media_assets`: **UNCHANGED**
- AR / Unity / DQ-10: **UNCHANGED**

## Production canonical content gate

LC11-PROD-APPLY performed a real production dry-run using the bounded SQLAlchemy reconciler. Typed validation passed for 5/5 schema-v2 Lessons, 25 quiz Questions, 50 Options, and five Memory Match items, but the dry-run correctly refused all writes: the legacy relational quiz schema requires a non-null FK to `flashcards.qr_id`, and production only has a unique matching flashcard for Cat (`cat001`). Dog, Bird, Fish, and Rabbit have no matching flashcard owner. Flashcard creation was outside the authorized mutation set, and substituting unrelated QR IDs would violate canonical quiz ownership. No Course, Lesson, quiz, game, runtime, media, Storage, or AR row changed.

A read-only in-process request exercised the normal FastAPI learner route against the configured Supabase PostgreSQL runtime. `GET /api/v1/courses` returned HTTP 200 and three published Courses, but did not include `animals-adventure-en-5-7`. Therefore no canonical Animals Lesson was reachable through the Course response: Course `FAIL`, Lessons `0/5`, schema-v2 `0/5`.

This matches the separately inspected persistence state: the owner Course is unpublished and the five existing Lesson rows still contain legacy schema-v1 blocks. LC11 did not publish the Course, apply the LC7 content seed, rewrite Lesson JSONB, or mutate production data. Render deployment readiness was not used as a gate.

A separate read-only resolver smoke proved that the Cat Lesson context can resolve all five canonical illustrations and all five canonical pronunciation assets as HTTPS application URLs through the backend service. This does not make the missing schema-v2 Lesson activity available through the learner API.

## Implemented integration

The existing backend DTO boundary now exposes `learn_vocabulary` hydration through authored vocabulary IDs plus LC5 semantic `vocabulary_illustration` and `pronunciation_audio` assets. It reuses `media_assets`, `LearnerAssetService`, the request-scoped `AsyncSession`, and the existing lesson session; no table, ORM mapping, or Alembic revision was added. Resolution prefers an exact Lesson binding, then reuses exactly one course-wide semantic vocabulary binding. This reconciles LC7's cross-Lesson vocabulary references with LC10's one-copy publication without duplicating media.

React Native now consumes backend `thumbnail_url` on Course cards/detail, enters the existing `LearningSessionScreen` for any schema-v2 Lesson, orders activities by backend `order`, starts the existing backend lesson session, and dispatches `learn_vocabulary`, `mini_game`, and `quiz`. The vocabulary renderer displays only the backend-resolved illustration URL, forwards only the backend-resolved audio URL to the existing `expo-av` hook, and submits the existing step-attempt contract after all items. Memory Match still prefers `asset.url` over its legacy content fallback. Quiz correctness remains backend-authoritative.

RN contains no Supabase client, bucket/path construction, filename guessing, or learner-to-AR fallback for these assets. Audio cleanup and repeated playback continue through the existing playback hook.

## Verification

- LC11 RN focused: **15 passed**.
- Relevant LC3/LC4/LC5/enrollment RN selection: **35 passed**.
- Relevant backend Lesson/Quiz/Game/asset/Course/session/transaction selection: **84 passed**.
- New LC11 TypeScript errors: **0**.
- Pre-existing TypeScript errors: **5** in AR/gamification files.
- Separate pre-existing Course-list source-contract test mismatch: **2 failures**; the screen already split the featured Course from `listCourses` and already used hard-coded filter labels before LC11.
- Device/runtime smoke: **NOT VERIFIED**.

## Safety

Storage, `media_assets`, production schema, Alembic, production learner content, user progress, AR metadata, Unity, and DQ-10 were not mutated.

## Gate

`LC11 RN CONTENT INTEGRATION PARTIAL`

Blocking invariant: four canonical vocabulary concepts lack the required production `flashcards` FK owners, so the atomic canonical Animals apply cannot safely materialize its quiz rows and schema-v2 Lessons.
