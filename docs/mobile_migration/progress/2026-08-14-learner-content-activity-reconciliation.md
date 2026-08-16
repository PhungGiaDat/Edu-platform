# Learner Content and Activity Reconciliation — 2026-08-14

## Session

Documentation-only architecture/specification reconciliation, UTC+7. No production code, schema, data, asset, storage, RN, Unity, or deployment mutation was performed.

## Persistence truth used

- Supabase PostgreSQL is the current learner-core authority.
- Current workspace backend→Supabase read runtime is verified.
- MongoDB is legacy/historical and was not used as learner schema evidence.
- Render deployment runtime remains unverified in a separate deployment-readiness lane and does not block this reconciliation.

## Canonical evidence read

- `CLAUDE.md`
- `docs/mobile_migration/README.md`
- `docs/mobile_migration/plans/README.md`
- `docs/mobile_migration/progress/README.md`
- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md`
- `docs/mobile_migration/spec/000-index.md`
- `docs/mobile_migration/spec/learner-product-spec.md`
- `docs/mobile_migration/spec/learner-parity-matrix.md`
- `docs/mobile_migration/spec/game-catalog.md`
- `docs/mobile_migration/progress/2026-08-14-dq1-course-enrollment-reconciliation.md`
- `docs/mobile_migration/progress/2026-08-14-r10-session-frontend-foundation.md`
- `docs/mobile_migration/progress/2026-08-11-p2-learning-path-ui-implemented.md`
- `docs/migration/postgres-execution-2026-08-12.md`
- `docs/migration/progress/2026-08-13-fastapi-postgres-cutover.md`
- `docs/migration/mongo-postgres-field-map.md` (historical migration map only)
- PostgreSQL migrations and current backend/RN Course, Lesson, session, quiz, game, progress, and asset contracts.

## Current versus target

| Concern | Current | Target | Classification |
|---|---|---|---|
| LearningTopic | `courses.category_key/category_label/category_icon`; ordered `learning_paths.priority_topics`; RN currently derives topic cards from Courses | Controlled stable LearningTopic keys above Courses | ADDITIVE contract evolution; no table for MVP |
| Course | Enrollable PostgreSQL Course with Lessons and progress | Same responsibility, belonging to one Topic key | NO CHANGE to enrollment/progress; semantic clarification |
| Lesson activities | Flat heterogeneous keys inside `lessons.learning_blocks` | Versioned ordered `activities[]` with typed config | ADDITIVE JSONB/API evolution; no activity table |
| Learning Session | Session, step, and attempt tables exist; RN frontend foundation is separate | Runtime traversal keyed by stable activity IDs | ADDITIVE mapping; reuse existing tables |
| Vocabulary | Lesson vocabulary, flashcards, word mastery | Reusable content referenced by activities/games/quiz | NO NEW TABLE for milestone |
| Course Game | `mini_game_items` plus payload; standalone RN demos | Typed configured items selected by Course Game activities | ADDITIVE validation/integration; no template/instance tables |
| Quiz | Normalized questions/options tied to flashcards | Quiz Activity selects a data-driven pool and policy | ADDITIVE activity contract; existing tables first |
| Reward | Lesson/gamification result fields and semantic event architecture | Derived completion presentation; backend-authoritative XP | NO NEW ACTIVITY/TABLE |
| Learner assets | Course media fields, `media_assets`, Supabase Storage | Semantic roles and deterministic reusable paths | ADDITIVE conventions/metadata; no new asset table |
| Activity progress | Lesson/course progress, session steps, attempts | Lesson-level authority plus session position/attempts | NO CHANGE for MVP; permanent activity progress DEFERRED |

## Decisions recorded

- `LearningTopic` is the product term; controlled `category_key` and `priority_topics` are its initial persistence representation.
- A topic table is conditional, not assumed. It requires a demonstrated need for independently managed metadata/localization/order/assets.
- `LessonActivity` is a typed domain/API abstraction stored in `learning_blocks.activities[]`, not a new table.
- Existing flat learning blocks remain readable through an additive compatibility adapter.
- Existing session/step/attempt tables own runtime state; Lesson definition remains separate.
- Existing quiz and mini-game tables are evolved/reused before any parallel schema is considered.
- Course Game and AR Game are different runtime/content instances; Unity/native AR authority is unchanged.
- Reward is derived completion presentation, not an XP-owning authored activity.
- DQ-10 remains open.
- `AnimalsAdventure` remains canonical; `AnimalsCourse` remains legacy.

## Changed

- Updated the master plan with one LC0–LC11 milestone-level node, dependency direction, and child-plan link.
- Updated the learner product spec with normative domain, persistence reuse, activity/session, game/quiz, asset, preference, and reward rules.
- Updated the game catalog with the mechanic/configured-item model, PostgreSQL payload strategy, Course Game/AR Game boundary, and semantic reward events.
- Updated the parity matrix rows affected by Topic, activity-driven sessions, Course Games, Quiz, completion, Animals, and Coloring.
- Aligned the three canonical spec statuses with the approved specification index and removed fixed session constants while preserving DQ-10 as open.
- Created `plans/2026-08-14-learner-content-activity-milestone.md` for detailed future implementation sequencing.

## Verified

- Cross-document ownership and links were checked.
- The milestone sequence orders contract/schema work before seed, manifest, generation, upload, and RN content integration.
- The plan explicitly reuses `learning_blocks`, session/attempt tables, quiz tables, `mini_game_items.payload`, and `media_assets`.
- Unity/native AR documents and bridge code were not modified.
- DQ-10 remains open.

## Not verified

- No production implementation, migration, seed, asset generation, Supabase upload, runtime, emulator, or device verification was performed.
- No Render deployment verification was performed.
- The conditional need for a topic table or additive quiz columns remains an implementation-evidence question, not an approved schema change.

## Next implementation task

`LC1 — Canonical LearningTopic contract on existing fields` is the single recommended next slice. It must prove stable Topic semantics using existing Course/Learning Path fields before any migration is proposed.
