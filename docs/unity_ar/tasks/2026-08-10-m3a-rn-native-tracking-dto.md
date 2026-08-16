## Status
done

## Parent plan
`docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` §M3

## Goal
Implement the React Native data boundary that prepares a backend AR
experience for native image tracking, with three distinct types:
`ARExperienceResponse` (raw API), `NativeTrackingDto` (validated RN domain),
`CardDescriptorRN` (Unity bridge DTO).

## Acceptance criteria
- [x] Raw `ARExperienceResponse` accepts a legacy record with native fields missing.
- [x] Complete native metadata → `NativeTrackingDto` (ready) → `CardDescriptorRN` (ok).
- [x] Missing `reference_image_url` → `NativeTrackingAvailability` unavailable.
- [x] Empty `reference_image_url` → unavailable.
- [x] Missing `physical_width_m` → unavailable.
- [x] `physical_width_m <= 0` → unavailable.
- [x] `physical_width_m` NaN / Infinity → unavailable.
- [x] `modelUrl` is NEVER substituted for `referenceImageUrl`.
- [x] No default physical width is introduced.
- [x] `NativeTrackingDto` → `CardDescriptorRN` maps only approved bridge fields.
- [x] Missing backend metadata routes to `BACKEND_METADATA_UNAVAILABLE`, NOT `REFERENCE_IMAGE_LOAD_FAILED`.
- [x] Legacy response remains parseable / usable outside native tracking.

## Verification
- `node --test ... src/__tests__/native-tracking.test.ts` → 26/26 pass.
- `node --test ... src/__tests__/arscreen-m3a-wiring.test.ts` → 11/11 pass.
- Combined suite (ARExperienceMapper + bridge-types + arscreen-host + native-tracking + arscreen-m3a-wiring) → 82/82 pass.
- `npx tsc --noEmit` → 1 pre-existing unrelated `ClayButton.tsx:76` error. Zero new M3A diagnostics.

## Time / risk estimate
S — surgical changes, no architectural decisions.

## Out of scope
- Unity changes (M3B blocked on Unity P3 / AC-TRACK-003)
- Backend runtime (BACKEND-T001 separate)
- M3B (AR_READY E2E)
- QR scanner redesign
- Tracking UI
- WebAR removal
- Navigation redesign

## Deferred decisions preserved
- RQ-4 (onImageTrackingLost.reason) — preserved
- MQ-1 (startImageTrackingMulti replace vs parallel) — preserved
- MQ-7 (triggerCombo cardA/cardB semantic identity) — preserved
- MQ-3 (XP immediate vs session-end) — preserved
- BQ-1 (migration of existing ar_objects) — preserved
- BQ-2 (reference-image hosting/source) — preserved

## Progress
`docs/unity_ar/progress/2026-08-10-m3a-rn-native-tracking-dto.md`
