# Learner Content and Activity Milestone

## Status

in progress — LC2 and LC3 implemented and tested; content/runtime tasks remain

## Parent and authority

- Parent: `2026-08-10-final-super-product-plan.md`
- Normative domain: `../spec/learner-product-spec.md`
- Game mechanics: `../spec/game-catalog.md`
- Parity inventory: `../spec/learner-parity-matrix.md`
- Persistence authority: Supabase PostgreSQL; current workspace backend read path is verified.
- MongoDB is legacy/historical and is not a schema or seed authority.

This is a bounded child milestone, not a second orchestration plan.

## Objective

Deliver one reproducible mobile learner slice:

```text
Parent preference -> LearningTopic -> AnimalsAdventure Course
-> ordered Lesson activities -> vocabulary/practice/Course Game/Quiz
-> completion -> reusable learner assets in Supabase -> RN renderer
```

## Reuse-first architecture

| Product concept | Existing PostgreSQL capability | Milestone decision |
|---|---|---|
| LearningTopic | `courses.category_key/category_label/category_icon`; `learning_paths.priority_topics` | Canonicalize controlled keys first; no topic table for MVP |
| Ordered LessonActivity | `lessons.learning_blocks JSONB` | Add typed/versioned `activities[]`; no activity table |
| Runtime activity position | `lesson_sessions`, `lesson_session_steps` | `step_id=activity_id`; session snapshots content version; step snapshots type/order/required |
| Attempts | `lesson_step_attempts` | Reuse unchanged unless contract evidence proves a missing field |
| Quiz content | `quiz_questions`, `quiz_question_options` | Activity selects a question pool; no new quiz table |
| Course Game content | `mini_game_items` with `game_type` and `payload` | Treat rows as configured items; no template/instance tables |
| Learner assets | Course media fields and `media_assets` | Add semantic role conventions; no parallel asset table |
| Course/Lesson progress | existing course/lesson progress and `word_mastery` | Preserve; no permanent activity-progress table for MVP |

The API contract must validate discriminated activity/game/quiz payloads even though storage uses JSONB. Legacy flat `learning_blocks` remain readable during transition.

## Out of scope

- Production Lesson content rewrite or final Animals seed execution
- Parent settings UI or recommendation algorithms
- New topic/activity/game-template/game-instance/asset tables without a proven capability gap
- Asset generation/upload in this planning session
- Unity, AR bridge, AR Game implementation, or AR tracking fields
- DQ-10 timing/enforcement policy
- Render deployment readiness

## Dependency graph

```text
LC1 Topic contract
  -> LC2 ordered activity contract + session mapping foundation [IMPLEMENTED/TESTED]
      -> LC3 Quiz data selection/runtime contract -------+
      -> LC4 Course Game payload/runtime contract --------+-> LC6 content-integrated API/session verification
      -> LC5 asset-role contract -----------+       -> LC7 Animals canonical seed
                                                        -> LC8 asset manifest
                                                            -> LC9 asset generation
                                                                -> LC10 Supabase upload
                                                                    -> LC11 RN integration

RN renderer primitives may start after LC2, but content-integrated acceptance waits for LC6/LC7.
Unity/native AR and Render deployment readiness remain parallel independent lanes.
```

## Future implementation tasks

### LC1 — Canonical LearningTopic contract on existing fields

- Scope: define stable topic keys and validate `courses.category_key` plus `learning_paths.priority_topics`; document Family/School/Nature and the Nature→Animals relationship.
- Expected surfaces: backend Course/Learning Path schemas, repositories, API tests, RN topic type/mapping.
- Acceptance: Course enrollment/progress contracts are unchanged; API returns stable controlled keys; no new table or migration unless a concrete metadata requirement is demonstrated and approved.
- Verify: focused schema/repository/API tests and existing enrollment regression tests.
- Stop: do not implement parent UI or recommendations.

### LC2 — Typed ordered Lesson Activity contract

- Status: **IMPLEMENTED / TESTED / SUPABASE SCHEMA VERIFIED** on 2026-08-14. RN renderer and seeded v2 Lesson content are not implemented.
- Scope delivered: versioned `learning_blocks.activities[]` with stable `activity_id`, positive unique order, authored `required`, controlled completion policy, discriminated type-specific configs, legacy-flat-block adapter, typed Lesson API/RN DTOs, and existing-session mapping by activity ID/content version.
- Expected surfaces: backend lesson models/repository mapping, course API DTO/tests, RN lesson types.
- Acceptance evidence: existing lessons deserialize as schema v1 without fabricated activities; v2 activities preserve authored order; malformed types/config/order/IDs fail validation; no LessonActivity table; additive session columns verified live.
- Verify: 23 focused serialization/compatibility/API/session tests passed; Supabase columns, constraints, index, and legacy defaults read back successfully.
- Stop: do not build renderers or migrate production data.

### LC3 — Data-driven Quiz Activity contract

- Status: **IMPLEMENTED / TESTED / SCHEMA VERIFIED** on 2026-08-15.
- Scope: define activity pool selection/count/order/completion configuration over existing `quiz_questions` and `quiz_question_options`.
- Acceptance: vocabulary-backed image/word/audio, identify, concept, and simple-sentence questions can be represented; no fixed global option count, pass threshold, or reward amount.
- Delivered: database-first SQLAlchemy mappings, request-scoped quiz repository/service, authenticated activity hydration, backend-evaluated answer submission, and existing session/attempt runtime storage.
- Verify: focused repository/service/contract tests and live Alembic comparison (`0` operations).
- Stop: if a required question cannot be represented because `flashcard_qr_id` is mandatory, record the smallest additive column/nullability proposal; do not create a parallel quiz table.

### LC4 — Configured Course Game contract

- Scope: define typed `mini_game_items.payload` variants for Drag & Drop, Memory Match, and Coloring; define normalized input/result boundaries.
- Acceptance: one mechanic supports different lesson vocabulary without custom per-word code; Course Game context is explicitly non-AR; no template/instance tables.
- Verify: payload validation, repository read, and result-contract tests.
- Stop: drawing-engine selection remains an explicit implementation decision; do not touch Unity Game Mode.

### LC5 — Learner asset-role and manifest contract

- Status: **IMPLEMENTED / TESTED** on 2026-08-15. Semantic learner roles are projected from existing course fields and `media_assets`; no asset table, storage mutation, or content seed was added.
- Scope: define semantic roles and deterministic object-path rules using Course fields plus existing `media_assets.section_id`, `asset_key`, `metadata`, and `public_url`.
- Acceptance: vocabulary illustration/audio/coloring outline are reusable across activities; Course assets cannot be promoted to AR tracking assets; no new asset table.
- Verify: manifest schema examples and duplicate/reuse checks.
- Stop: do not create buckets or upload assets.

### LC6 — Activity-driven Lesson API and session mapping

- Status: foundation completed by LC2; content-integrated runtime verification remains pending LC3/LC4/LC7.
- Scope: verify authored v2 content end-to-end through current Course/Lesson endpoints and the activity-ID session/attempt mapping implemented in LC2.
- Acceptance: start/resume/read/attempt/complete behavior remains coherent; Course enrollment and lesson-level progress semantics are unchanged; DQ-10 stays open.
- Verify: existing Course/session regression suite plus ordered activity traversal tests.
- Stop: do not add permanent activity progress unless existing session/attempt records demonstrably cannot satisfy resume/reporting.

### LC7 — Canonical AnimalsAdventure content seed update

- Scope: update the reproducible PostgreSQL seed source for Nature→Animals→lessons with ordered activities, quiz references, game item references, and asset keys.
- Acceptance: `AnimalsAdventure` remains canonical, `AnimalsCourse` remains legacy, and legacy identifiers/API behavior are preserved where practical.
- Verify: isolated seed dry-run/fixture validation before any approved database write.
- Stop: no production seed execution in the same slice.
- Status: **IMPLEMENTED / TESTED / PRODUCTION APPLIED + VERIFIED** on 2026-08-16. LC11-FK-OWNER created four deterministic minimum learner flashcard owners with no AR metadata, verified 5/5 owners and 25/25 Quiz FK references, then reused the bounded Animals reconciler to publish the Course, five schema-v2 Lessons, 25 Questions, 50 Options, and five Memory Match items. Fresh readback passed; the final dry-run is all `NO_CHANGE` with zero conflicts or destructive operations.

### LC8 — Animals asset manifest

- Scope: derive the exact required Topic/Course/Lesson/Vocabulary/Game/Quiz assets from LC7, reusing canonical vocabulary assets.
- Acceptance: every manifest entry has owner, semantic role, deterministic path, source/generation status, and consumers; no AR tracking image/width inference.
- Verify: manifest completeness and duplicate-content audit.
- Stop: no generation or upload.
- Status: **IMPLEMENTED / TESTED** on 2026-08-16. `backend/database/seed/learner_asset_manifest.py` derives a versioned deterministic manifest from LC7 requirements and LC5 roles; the committed Animals artifact contains exactly 11 learner entries (6 existing SVG sources, 5 audio generation requirements), with no AR fields. LC10-B reconciled its physical destination to the existing shared public `AR_models` bucket while preserving the learner-only `courses/` namespace.

### LC9 — Generate approved learner assets

- Scope: generate only missing assets from the approved LC8 manifest.
- Acceptance: output dimensions/formats/quality match manifest; source and generated artifacts remain traceable.
- Verify: asset inventory plus visual/audio review appropriate to each asset.
- Stop: no Supabase upload.
- Status: **IMPLEMENTED / VALIDATED LOCALLY** on 2026-08-16. All 11 LC8 entries have deterministic upload-ready local artifacts and SHA-256 metadata: six reviewed SVG sources were rasterized to RN-compatible PNGs, and five canonical English words were synthesized to validated WAV files with the established `en-US` female/normal-rate policy. LC10-B changed only bucket metadata, reused every byte/checksum, and published them downstream; LC9 generation itself made no schema, RN, Unity, or AR change.

### LC10 — Supabase learner asset upload and record verification

- Status: **VERIFIED** on 2026-08-16 after LC10-B corrected the target to the existing shared public `AR_models` bucket. All eleven exact learner objects were uploaded without overwrite, authenticated/public byte-readback verified, bound through one AsyncSession transaction (one Course cover plus ten `media_assets` rows), fresh-session resolved 11/11, and rerun at `0 upload / 11 skip / 0 conflict`. Schema, policies, user state, AR metadata, Unity, and RN remained unchanged; LC11 may proceed.
- Scope: upload approved LC9 outputs to existing approved bucket conventions and create/update existing `media_assets` records through an approved workflow.
- Acceptance: deterministic paths, successful readback, correct semantic roles, no duplicate per-activity vocabulary uploads, and no AR asset mutation.
- Verify: storage readback plus API asset resolution.
- Stop: do not change bucket policy or create a new bucket without separate approval.

### LC11 — RN activity-driven Learning Session integration

- Status: **PRODUCTION/API INTEGRATION PASS; EXPO WEB PREFLIGHT PASS; AUTHENTICATED WEB E2E AND DEVICE ACCEPTANCE PENDING** on 2026-08-16. Course cover, semantic vocabulary illustration/audio hydration, existing `expo-av` pronunciation playback, backend-ordered `learn_vocabulary → mini_game → quiz` dispatch, Memory Match reuse, Quiz reuse, and focused regression coverage are implemented. The normal generic FastAPI Course list/detail routes expose `animals-adventure-en-5-7` and five schema-v2 Lessons; all-five vocabulary, Memory Match, and Quiz hydration passed against real production repositories/assets without persisting session state. Expo Web boots through the existing production-mode command and the Playwright Chromium shell preflight passes with zero browser errors. The Cat and all-five browser flows remain pending because no approved `LC11_WEB_EMAIL` / `LC11_WEB_PASSWORD` session was configured; no credentials were invented and no production registration was performed. The Android acceptance attempt remains blocked by zero connected ADB devices. Schema, Storage, media publication, AR, Unity, DQ-10, and learner runtime state remained unchanged.
- Scope: connect CourseDetail→LessonPlayer→LearningSession to the ordered activity contract and existing session APIs; adapt flashcard/game/quiz primitives into renderers.
- Acceptance: one Animals lesson traverses authored order, resumes, submits attempts, completes once, and displays backend-authoritative rewards; existing enrollment remains intact.
- Verify: typecheck/focused tests, runtime verification, then Android device verification for the non-AR lesson flow.
- Stop: Unity/native AR behavior and DQ-10 timing remain outside this task.

## Compatibility and deferred escalation

- Legacy flat lesson blocks remain readable until canonical content is migrated and compatibility evidence permits removal.
- Existing `category_key`, `category_label`, and `category_icon` remain API-compatible even though the product term is LearningTopic.
- A future `learning_topics` table is justified only if independent topic administration/localization/order/assets cannot be represented cleanly by the controlled registry and existing fields.
- Additive quiz columns are considered only if initial authored questions cannot fit the existing flashcard-backed model.
- Render deployment verification is tracked separately and does not block this milestone's documentation/domain work.

## Milestone completion gate

LC1–LC11 must retain evidence distinctions: contract/tests are `CODE_VERIFIED`; runtime and physical-device proof are separate. Planning reconciliation alone does not complete any implementation task.
