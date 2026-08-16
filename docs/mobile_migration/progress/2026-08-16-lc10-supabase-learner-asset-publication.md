# LC10 — Supabase Learner Asset Publication

## Status

- Storage publication: **VERIFIED**
- Physical bucket: **`AR_models` (PUBLIC)**
- Learner namespace: **`courses/animals-adventure-en-5-7/`**
- Prepared entries: **11**
- Local checksum validation: **11/11 PASS**
- Initial remote plan: **11 UPLOAD_NEW / 0 SKIP / 0 CONFLICT**
- Remote verified: **11/11**
- Public application references verified: **11/11**
- Canonical bindings: **11/11** — one Course cover projection plus ten lesson-scoped `media_assets` rows
- LearnerAssetService resolution: **11/11**
- Idempotency rerun: **0 UPLOAD_NEW / 11 SKIP / 0 CONFLICT; 11 bindings unchanged**
- Production schema: **UNCHANGED**
- Learner/AR semantic separation: **PRESERVED**
- User state / AR metadata / Unity / RN: **UNCHANGED**
- LC11: **READY**

## Storage-target reconciliation

LC10-B corrected the stale assumption that learner assets required a separate `learnar-assets` bucket. Live Supabase and repository inspection verified `AR_models` as the existing public shared application-asset bucket. It already contains `courses/`, `assets/`, `images/`, `mind-files/`, `pets/`, and other isolated namespaces. No bucket was created, renamed, or made public.

The LC8 generator and both generated LC8/LC9 inventories now use `bucket=AR_models`. All semantic keys, learner roles, media types, and deterministic object paths remain unchanged. Local PNG/WAV bytes were not regenerated; all checksums and sizes remained identical.

Sharing a bucket did not merge domains. `course_cover`, `vocabulary_illustration`, and `pronunciation_audio` remain learner roles under `courses/animals-adventure-en-5-7/`. No learner record was mapped to `reference_image_url`, `model_3d_url`, or `physical_width_m`, and no AR row or AR namespace was changed.

## Publication and binding evidence

The bounded publisher preflight inspected all eleven exact paths before mutation and returned `11/0/0`. Uploads used the manifest paths and MIME types with overwrite/upsert disabled. Every object was then downloaded through the authenticated Storage path and its raw bytes, size, MIME, and SHA-256 were matched to LC9. The canonical public URL helper produced each application reference, and an unauthenticated public GET verified the same bytes and MIME.

Only after all eleven remote and public checks passed, one SQLAlchemy `AsyncSession` transaction applied the canonical representations:

- Course cover: `courses.thumbnail_url` for `animals-adventure-en-5-7`.
- Vocabulary assets: ten `ready` `media_assets` rows, two for each focus lesson, with canonical semantic `asset_key`, bucket/path, public URL, media type, and checksum provenance.

A new session resolved the Course cover plus all ten vocabulary assets through `LearnerAssetService`. Live readback independently confirmed eleven Storage objects, ten `media_assets` rows, and the Course cover URL. A complete second publication run uploaded nothing, changed no binding, and returned `0/11/0` with `unchanged=11`.

Machine-readable evidence: `backend/database/seed/manifests/animals_adventure_assets.publication.json`. It contains no credential or absolute developer path.

## Verification

- LC8 generator check: PASS.
- LC9 validation-only rerun: `prepared=11 ready=11`.
- LC8/LC9/LC10 focused selection: 36 passed.
- LC4/LC5/LC7/LC8/LC9/LC10 relevant backend selection: **64 passed, 0 failed** in the final rerun after the idempotency proof.
- Production schema/Alembic: unchanged; no revision.
- Bucket visibility and policies: unchanged.

## Separate security item

The Supabase UI warning about broad bucket SELECT/listing policy is recorded as a **SEPARATE STORAGE SECURITY HARDENING ITEM**. LC10-B did not treat this as authorization to redesign shared-bucket policies and made no policy change.

## Gate

`LC10 SUPABASE LEARNER ASSET PUBLICATION VERIFIED — LC11 RN CONTENT INTEGRATION MAY PROCEED`
