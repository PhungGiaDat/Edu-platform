# LC9 — Learner Asset Generation / Preparation

## Status

- Local asset preparation: **IMPLEMENTED / VALIDATED**
- Required: **11**
- Existing-source prepared: **6**
- Generated: **5**
- Validated: **11**
- Ready for upload: **11**
- Blocked: **0**
- Manual source required: **0**
- Human pronunciation listening review: **NOT PERFORMED**
- Assets uploaded: **NO**
- Supabase mutated: **NO**
- Production media rows: **UNCHANGED**
- AR / Unity: **UNCHANGED**
- LC10 readiness: **READY**
- Downstream LC10 publication: **VERIFIED in `AR_models`**

## Preparation pipeline

`backend/database/seed/prepare_learner_assets.py` reads the versioned LC8 JSON manifest as its only asset enumeration. It supports `--dry-run`, normal preparation, and `--validate`. It preserves content identity plus semantic role, rejects unsupported classifications and path collisions, validates final bytes, and writes `backend/database/seed/manifests/animals_adventure_assets.prepared.json` with full SHA-256, MIME, size, dimensions/duration, provenance, destination, and `READY_FOR_UPLOAD` status.

The initial SVG source audit exposed a format boundary: current RN consumers use React Native `Image` and do not use `SvgUri`. LC8 output/object paths were therefore minimally reconciled to PNG while retaining the six SVGs as source provenance. Installed headless Chromium deterministically rasterized the 400×400 cover and five 240×240 vocabulary illustrations. XML parsing, semantic source text, PNG decoding/dimensions, and direct visual inspection all passed.

The repository's `TTSService` establishes English `en-US`, female voice, normal speed, and WAV-compatible output policy, but its Coqui/Google execution dependencies were unavailable locally. The LC9 adapter used installed Windows SAPI `Microsoft Zira Desktop`, matching that policy without credentials. It generated only the canonical LC7 words `Bird`, `Cat`, `Dog`, `Fish`, and `Rabbit`. All five files are mono PCM WAV, 22.05 kHz, non-silent, decodable, and 1.24–1.39 seconds. No narration, music, sound effect, or placeholder tone was produced.

## Evidence

- Dry-run: six `PREPARE_SVG_TO_PNG`, five `GENERATE_AUDIO`, eleven total.
- Real preparation: `prepared=11 ready=11`.
- Second preparation: `prepared=11 ready=11`, owned artifacts reused without generation/rasterization.
- Validation-only rerun: `prepared=11 ready=11`.
- Image semantic review: Course cover, Cat, Dog, Bird, Fish, and Rabbit all matched their canonical learner meanings.
- Audio technical validation: format, size, duration, channels, sample width, sample rate, and non-silence passed.
- Human pronunciation listening review: not performed; it is not a canonical LC10 prerequisite because generation inputs/provider policy and technical artifacts are recorded, but it remains recommended before a production-facing release.

Generated binaries remain under the repository's ignored `backend/generated/learnar-assets` workspace convention. The committed preparation inventory carries their exact deterministic local paths and checksums for LC10 conflict/readback verification.

LC10-B changed only destination bucket metadata from the stale `learnar-assets` value to the existing shared public `AR_models` bucket. The local files were reused without rasterization or TTS. All eleven byte sizes and SHA-256 values remained unchanged; the checksum-vector evidence stayed `c3a0a5b798653dbfbad7941cd79d9d0be23c09609b46b7e9dd6f3add19b43285`.

## Boundaries

LC9 did not contact Supabase, fabricate public URLs, upload objects, create/update `media_assets`, apply the LC7 seed, change schema/Alembic, or modify RN, Unity, AR tracking, Quiz, or Memory Match semantics.

## Downstream gate

LC10 enumerated all 11 artifacts from this inventory, uploaded the unchanged bytes under `AR_models/courses/animals-adventure-en-5-7/...`, and verified public readback. LC9 semantic generation remains closed and unchanged.
