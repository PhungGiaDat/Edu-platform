# AR Combination Schema Contract Repair

## Context

The live `ar_combinations` collection has nine documents and no MongoDB JSON
Schema validator. All nine documents lack `cross_category_allowed`; eight retain
legacy `combo_name` and `reward_points` fields. The immediate HTTP 500 is caused
by a code-level response contract mismatch: repository output contains `id`,
`center_transform`, and `_id`, while `ArCombinationSchema` forbids those fields.

## Selected approach

Use one explicit API serializer for every combo response. Keep the Beanie
document responsible for persistence, keep `ArCombinationSchema` responsible
for the public API contract, and preserve `center_transform` in that contract.
Database-only identifiers must not leak into the API response.

Alternatives rejected:

- Cleaning MongoDB alone cannot fix fields injected by `model_dump()` and the
  repository.
- Setting `extra="ignore"` on the response DTO would hide future contract drift
  instead of detecting it.

## Components and data flow

1. `ARCombination` remains the Beanie persistence model.
2. `ArCombinationSchema` gains optional `center_transform` so it mirrors the
   intentional public fields of `ARCombination`.
3. A shared serializer converts a Beanie/repository dictionary into
   `ArCombinationSchema` by selecting public DTO fields and applying the legacy
   `reward_xp` fallback for `bonus_xp`.
4. The combo API and `ARService.get_ar_experience()` both use the same serializer.
5. Repository methods may continue returning dictionaries for compatibility,
   but API boundaries never return those dictionaries directly.

## Migration safety

`migrate_cross_category_flag.py` will be changed to:

- default to dry-run;
- require `--apply` for writes;
- use an explicit allowlist of known cross-category combo IDs;
- set allowlisted IDs to `true` and all other known combo IDs to `false`;
- report missing/unexpected IDs without modifying them;
- use an `$and` query containing two `$or` groups where conditional matching is
  required, avoiding duplicate dictionary keys.

The migration will be dry-run against live MongoDB during verification. Applying
it to live data remains a separate explicit database operation.

## Validation and future enforcement

Regression coverage must exercise the real FastAPI response serialization for a
flashcard that has a related combo and assert HTTP 200 plus `center_transform`
without `id` or `_id`. Migration tests must prove dry-run performs no writes and
that `--apply` only updates allowlisted IDs.

After the data is backfilled and verified, a separate migration may add a
MongoDB JSON Schema validator. It is intentionally excluded from this repair so
legacy documents are not rejected before cleanup.

## Error handling

Backend schema failures remain visible through strict DTO validation. The
frontend loading-state recovery is a separate robustness change and is not part
of this backend contract repair.
