# LC5 — Canonical Asset-Role Contract

## Status

**IMPLEMENTED / TESTED (contract)** on 2026-08-15. No production content, database data, Supabase Storage object, bucket policy, Unity, or AR metadata changed.

## Delivered

- Reused mapped PostgreSQL `media_assets`; no new table, schema change, or Alembic revision.
- Added typed learner-only roles: `course_cover`, `warm_up_visual`, `vocabulary_illustration`, `pronunciation_audio`, and `coloring_outline`, with role/media-type validation.
- Added deterministic vocabulary asset keys and a request-scoped SQLAlchemy resolver. It requires exactly one ready record for a semantic identity and rejects ambiguity rather than selecting an arbitrary path.
- Extended LC4 Memory Match hydration so a new payload may reference `vocabulary_id + vocabulary_illustration`; the service returns a learner-safe resolved asset. Legacy raw image URL payloads remain readable.
- Aligned RN DTOs for optional resolved learner assets; no screen or new renderer was added.
- Recorded the single normative role/reuse mapping in `spec/learner-product-spec.md`.

## Deferred

- LC7 Animals canonical seed, LC8 manifest, LC9 generation, LC10 upload, and LC11 content integration remain separate.
- LC3 Quiz remains text-only; it can reuse vocabulary roles in a future approved media extension.
- AR keeps `reference_image_url`, `model_3d_url`, and `physical_width_m` in its own lane.

## Verification

- `pytest tests/test_asset_role_contract.py` plus LC2/LC3/LC4/Course/session regressions: **62 passed**.
- LC3/LC4/LC5 RN source-contract suites: **14 passed**.
- `alembic check`: **No new upgrade operations detected**; `current == head == 20260814_orm_baseline`.
- `tsc --noEmit` has no LC5 errors. Five pre-existing unrelated AR/gamification errors remain in `ARExperienceMapper.ts`, `useARSession.ts`, `useGamification.ts`, `api.ts`, and `gamificationService.ts`.

## Acceptance evidence — 2026-08-16

- Synthetic `test-fox` media-assets-shaped fixture exercised `LearnerAssetService -> MediaAssetRepository -> MediaAssetORM` lookup semantics for illustration, pronunciation audio, and coloring outline.
- Content identity plus role resolved deterministically for all three fixture URLs; incompatible role/media combinations rejected.
- Duplicate ready `test-fox + vocabulary_illustration` rows rejected as ambiguous; a missing coloring role raised unavailable rather than falling back to another image.
- LC4 Memory Match projected the canonical illustration URL ahead of its legacy raw image content; the legacy-only payload still hydrated without a media row.
- Learner resolution ignored fixture-level AR reference/model/width fields, and the vocabulary asset key proved manifest identity does not infer filenames.
- Evidence command: `pytest tests/test_asset_role_contract.py tests/test_asset_role_evidence.py tests/test_mini_game_activity_contract.py -q` — **17 passed**.
- Full relevant backend selection — **68 passed**; RN LC3/LC4/LC5 source-contract selection — **14 passed**.

Asset-role contract: **IMPLEMENTED + TESTED**  
Semantic resolver: **TESTED**  
Deterministic content identity + role resolution: **PASS**  
Ambiguity rejection: **PASS**  
Memory Match canonical projection: **PASS**  
Legacy compatibility: **PASS**  
Learner/AR separation: **TESTED**  
Manifest-key readiness: **PASS**  
Production assets: **NOT GENERATED**  
Production upload: **NOT PERFORMED**
