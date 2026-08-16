## Status
resolved (backend/persistence); content values deferred

## Parent plan
`docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` (Phase 2)

## Goal
Provide native AR tracking metadata through the backend contract. The
normalized implementation owns the metadata in `ar_tracking_targets` keyed by
`qr_id`; `ar_objects` retains semantic/model ownership keyed by `ar_tag`.

## Linked requirement
`BACKEND-REQ-003` — Native AR additive fields required: `reference_image_url` and `physical_width_m`.

## Linked blocker
`docs/unity_ar/blockers/2026-08-09-native-ar-backend-missing-fields.md`

## Acceptance criteria
- [x] Normalized `ar_tracking_targets` table owns optional native fields.
- [x] FastAPI AR composition resolves tracking metadata by `qr_id`.
- [x] `reference_image_url` and `physical_width_m` are optional in the API.
- [x] No fallback or inferred physical width is used.
- [x] Backend/runtime smoke and AR identity-chain checks pass.
- [ ] Content owner supplies one verified image and measured positive width.

## Verification
```
cd backend
pytest tests/test_ar_object_consistency.py -v
pytest tests/test_ar_objects_validator.py -v
```
New tests must be added covering the new fields.

## Time / risk estimate
M — schema work + migration planning. Risk: medium (affects existing schema).

## Prerequisites
- Content decision: provide a verified physical tracking image.
- Content measurement: provide `physical_width_m > 0` in metres.

## Scope completed
- Added normalized nullable metadata to `ar_tracking_targets`.
- Added PostgreSQL repository/service/API composition and runtime checks.
- Preserved `ar_objects` as semantic/model owner and `flashcards` as QR owner.
- Kept all unverified content values NULL.

## Out of scope
- Unity changes (consumes these fields in Phase 3)
- RN payload changes (separate task)
- Reference image generation
- Physical width measurement (product/content team)

## Implementation constraints
- Fields must be Optional (existing ar_objects may not have them)
- API responses must be backward compatible (Optional fields)
- Migration must be idempotent

## Progress
See `docs/unity_ar/blockers/2026-08-09-native-ar-backend-missing-fields.md` and
`docs/migration/progress/2026-08-13-fastapi-postgres-cutover.md`.
