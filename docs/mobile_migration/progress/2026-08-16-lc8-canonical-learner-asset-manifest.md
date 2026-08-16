# LC8 — Canonical Learner Asset Manifest

## Status

- Manifest implementation: **IMPLEMENTED / TESTED**
- Canonical requirement extraction: **PASS**
- Entries: **11**
- Existing-source candidates: **6**
- Generation-required: **5**
- Manual-source required: **0**
- Blocked: **0**
- Assets generated/uploaded: **NO / NO**
- Production media records: **UNCHANGED**
- AR / Unity: **UNCHANGED**
- LC9 readiness: **READY**

## Canonical mechanism

`backend/database/seed/learner_asset_manifest.py` consumes only LC7 `asset_requirements()` and LC5 `AssetRole` media compatibility. It deduplicates requirements by `content identity + role`, validates unique semantic keys and collision-free output/object paths, and emits stable semantic-key ordering. The machine-readable artifact is `backend/database/seed/manifests/animals_adventure_assets.json` (schema version 1).

Regeneration check:

```text
cd backend
python -m database.seed.learner_asset_manifest --check
```

LC10-B reconciled the physical destination to the existing shared public application bucket `AR_models`, using the isolated learner namespace `courses/<course-id>/...`. Semantic learner roles remain separate from native-AR roles even though they share physical Storage. LC8 itself did not contact or mutate Supabase Storage; the generated manifest now carries the corrected bucket metadata.

## Requirement and source audit

- Course `animals-adventure-en-5-7` + `course_cover`: existing repository SVG candidate.
- Vocabulary `animals-v1-{cat,dog,bird,fish,rabbit}` + `vocabulary_illustration`: five existing repository SVG candidates.
- Vocabulary `animals-v1-{cat,dog,bird,fish,rabbit}` + `pronunciation_audio`: five generation-required WAV outputs, following the repository's current local learner-audio convention.
- `warm_up_visual`, `coloring_outline`, Quiz-specific media, and other roles: zero requirements.

The legacy paths are used only as source-candidate provenance after semantic requirements have been derived; filenames never establish asset meaning. Memory Match and Learn Vocabulary share each vocabulary illustration entry. Current text-only Quiz adds no asset.

Remote inventory was **NOT CHECKED**. Absence of generated/uploaded media and `media_assets` rows is expected at this stage and does not block LC9 local preparation.

## Safety and evidence

Manifest entries contain repository-relative paths and logical object paths only. They contain no credentials, signed/public URLs, developer absolute paths, `reference_image_url`, `model_3d_url`, or `physical_width_m`. No schema, Alembic revision, production database row, bucket, object, RN source, or Unity source changed.

Focused LC8 tests cover exact LC7 parity, typed media compatibility, deterministic identity/order, duplicate collapse/rejection, path collisions, reuse, existing-source classification, unsupported-role exclusion, AR isolation, and byte-identical committed regeneration. LC5/LC7/LC8 and the relevant learner backend regression selection remain the acceptance gate.

## Next gate

LC9 may consume the manifest directly to distinguish six reusable source artifacts from five audio generation requirements. It does not need Lesson JSON, React Native components, AR metadata, or filename guessing to infer semantic ownership.
