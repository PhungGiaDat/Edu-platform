# docs/unity_ar/progress/2026-08-10-m3a-rn-native-tracking-dto.md

## Session
2026-08-10 01:40, agent: cursor, branch: MindAR-Update

## Goal
Implement Mobile M3A — Backend/API DTO → Native AR DTO Preparation. Establish
the explicit RN data boundary with three distinct types
(`ARExperienceResponse`, `NativeTrackingDto`, `CardDescriptorRN`) and wire the
M3A consumer (ARScreen) to handle both `ready` and `unavailable` branches
without crossing into M3B (Unity runtime).

## Inputs re-read
- `docs/unity_ar/progress/2026-08-10-m1a-correction-final-rn-bridge-contract.md` (warm context)
- `docs/unity_ar/progress/2026-08-10-m2-rn-host-shell.md` (M2 verified)
- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` §M3 (current phase)
- `docs/unity_ar/spec/bridge-contract.md` §CardDescriptor (RN → Unity bridge shape)
- `docs/unity_ar/spec/mobile-ar-product-spec.md` §K-3 (CardDescriptorRN spec), §I-1 (error taxonomy)
- `docs/unity_ar/spec/backend-contract.md` §Tracking Identity, §Schema migration
- `docs/unity_ar/tasks/2026-08-09-backend-t001-native-ar-fields.md` (linked backend task — still open)
- Affected RN files: `mobile/rn/src/types/ar.ts`, `mobile/rn/src/types/api.ts`,
  `mobile/rn/src/bridge/ARExperienceMapper.ts`, `mobile/rn/src/screens/ARScreen.tsx`,
  `mobile/rn/src/__tests__/native-tracking.test.ts` (NEW),
  `mobile/rn/src/__tests__/arscreen-m3a-wiring.test.ts` (NEW)

## Current flow (documented before changes)

```
QR/business identity (lessonId)
  → flashcardApi.getFlashcard(lessonId)
    → ARExperienceResponse (raw API DTO)
      → mapToUnityPayload(response.data)        ← legacy single-card path
      → mapToCardDescriptor(response.data)      ← M1A multi-card path (mixed)
        → CardDescriptorSource { ok | unavailable }
```

The M1A-CORRECTION-FINAL `mapToCardDescriptor` already validated fields
and produced a discriminated union, but the validation and bridge-mapping
were conflated into one function. The M3A requirement is to make the
boundary explicit so future spec changes (RQ-4, MQ-1, BQ-2) can target
one layer without polluting the others.

## Architecture (M3A)

```
ARExperienceResponse          (raw API DTO, optional native fields)
   ↓
validateNativeTrackingMetadata (validation step)
   ↓
NativeTrackingAvailability    { ready | unavailable }
   ↓
toCardDescriptorRN             (bridge mapping step)
   ↓
CardDescriptorRN              (Unity bridge DTO)
```

Three distinct types. Three distinct functions. Backward compatibility:
`mapToCardDescriptor` is preserved as a thin composition of the two new
functions (used by M1A tests).

## Changed

### `mobile/rn/src/types/ar.ts:89-141`
- Added `NativeTrackingDto` interface — RN-side validated native tracking
  metadata (`qrId`, `referenceImageUrl`, `physicalWidthMeters`).
- Added `NativeTrackingAvailability` discriminated union — `{ kind: 'ready', tracking }`
  vs `{ kind: 'unavailable', reason, qrId }`.
- Field naming uses `referenceImageUrl` (RN-native validated name) to
  distinguish from the bridge field `imageUrl`.
- No `arTag` — RQ-3 CLOSED.

### `mobile/rn/src/types/api.ts:90-101`
- Added OPTIONAL `reference_image_url?: string | null` and `physical_width_m?: number | null`
  to `ARExperienceResponse`. Optional on the wire for legacy MindAR coexistence
  (per `backend-contract.md §Schema migration`).
- Pre-existing M1A-CORRECTION-FINAL types untouched.

### `mobile/rn/src/bridge/ARExperienceMapper.ts`
- Added `validateNativeTrackingMetadata(apiResponse)` — strict validation, returns `NativeTrackingAvailability`.
- Added `toCardDescriptorRN(tracking)` — pure mapping from validated `NativeTrackingDto` to `CardDescriptorRN`. No re-validation.
- Refactored `mapToCardDescriptor` as a thin composition of the two new functions. M1A test contract preserved.
- Strict validation rules:
  - `referenceImageUrl`: non-empty string.
  - `physicalWidthMeters`: finite, `> 0`.
  - No default physical width ever introduced.
  - `modelUrl` is NEVER substituted for `referenceImageUrl`.

### `mobile/rn/src/screens/ARScreen.tsx`
- Added `nativeTracking` state (`pending` / `ready` / `unavailable`).
- `loadLesson` now calls `validateNativeTrackingMetadata(response.data)` +
  `toCardDescriptorRN(availability.tracking)` after the API response.
- For `ready`: stores `qrId` of the descriptor (M3B will consume the descriptor).
- For `unavailable`: stores `BACKEND_METADATA_UNAVAILABLE` code + `qrId`.
- Added small banner UI for the unavailable state (RN-internal, NOT
  `REFERENCE_IMAGE_LOAD_FAILED`).
- M3A does NOT call Unity runtime when unavailable. Does NOT fabricate
  a `CardDescriptorRN` when unavailable.
- Legacy `mapToUnityPayload` (single-card path) is preserved.

### `mobile/rn/src/__tests__/native-tracking.test.ts` (NEW — 26 tests)
1. Raw API DTO accepts legacy record with native fields missing.
2. Legacy record still maps to `UnityARExperiencePayload` (single-card preserved).
3. Complete native metadata → ready + tracking fields.
4. Ready tracking has `referenceImageUrl` (NOT `imageUrl`).
5. Missing `reference_image_url` → unavailable, `reason='missing_reference_image'`.
6. Empty `reference_image_url` → unavailable.
7. Null `reference_image_url` → unavailable.
8. Missing `physical_width_m` → unavailable, `reason='missing_physical_width'`.
9. `physical_width_m = 0` → unavailable.
10. `physical_width_m < 0` → unavailable.
11. `physical_width_m = NaN` → unavailable.
12. `physical_width_m = Infinity` → unavailable.
13. `physical_width_m = -Infinity` → unavailable.
14. Null `physical_width_m` → unavailable.
15. Both fields missing → unavailable, `reason='both'`.
16. `modelUrl` is NEVER substituted for `referenceImageUrl`.
17. No default physical width is introduced.
18. `toCardDescriptorRN` maps only approved bridge fields.
19. `toCardDescriptorRN` does NOT leak `referenceImageUrl` onto the bridge.
20. `toCardDescriptorRN` does NOT add `arTag` (RQ-3 CLOSED).
21. `toCardDescriptorRN` does NOT add `modelUrl` (tracking-only).
22. Validate → `toCardDescriptorRN` is the explicit pipeline.
23. Legacy `mapToCardDescriptor` returns ok when both fields present.
24. Legacy `mapToCardDescriptor` returns unavailable when fields missing.
25. Missing backend metadata surfaces as `BACKEND_METADATA_UNAVAILABLE` family, NOT `REFERENCE_IMAGE_LOAD_FAILED`.
26. Three distinct types: Backend API DTO ≠ NativeTrackingDto ≠ CardDescriptorRN.

### `mobile/rn/src/__tests__/arscreen-m3a-wiring.test.ts` (NEW — 11 tests)
1. ARScreen imports `validateNativeTrackingMetadata` + `toCardDescriptorRN`.
2. ARScreen calls `validateNativeTrackingMetadata` after `flashcardApi.getFlashcard`.
3. ARScreen calls `toCardDescriptorRN` when ready.
4. ARScreen handles ready branch (state=ready).
5. ARScreen handles unavailable branch (state=unavailable, `BACKEND_METADATA_UNAVAILABLE`).
6. ARScreen does NOT call `startImageTrackingMulti` when unavailable.
7. ARScreen does NOT fabricate `CardDescriptorRN` when unavailable.
8. ARScreen surfaces the unavailable state via a banner.
9. ARScreen still calls `mapToUnityPayload` (legacy single-card path preserved).
10. Mapper exposes the two-step boundary (`validateNativeTrackingMetadata` + `toCardDescriptorRN`).
11. `NativeTrackingDto` is a distinct type in `types/ar.ts`.

## Verified

| Check | Result |
|---|---|
| `node --test ... src/__tests__/native-tracking.test.ts` | 26/26 pass |
| `node --test ... src/__tests__/arscreen-m3a-wiring.test.ts` | 11/11 pass |
| `ARExperienceMapper.test.ts` (M1A regression) | 8/8 pass |
| `bridge-types.test.ts` (M1A regression) | 27/27 pass |
| `arscreen-host.test.ts` (M2 regression) | 10/10 pass |
| **Combined suite** | **82/82 pass** (~356 ms) |
| `npx tsc --noEmit` | 1 pre-existing `ClayButton.tsx:76` error. **Zero new M3A diagnostics.** |
| Git diff scope | Only `mobile/rn/src/types/ar.ts`, `type/api.ts`, `bridge/ARExperienceMapper.ts`, `screens/ARScreen.tsx`, plus 2 new test files. Unity / backend runtime / frontend-web untouched. |
| Repository-wide tsc | **NOT PASS** (1 pre-existing unrelated error). Per project baseline, this is the documented pre-M3A state. |

## Not Verified
- Unity runtime tracking (M3B / Unity P3 / AC-TRACK-003).
- Native AR_READY E2E (M3B).
- BACKEND-T001 actually shipping `reference_image_url` / `physical_width_m` from backend (still open).
- Physical device tracking (M10/M11).

## Specs touched
- `docs/unity_ar/spec/bridge-contract.md` §CardDescriptor (referenced; no change).
- `docs/unity_ar/spec/mobile-ar-product-spec.md` §K-3 (referenced; no change).
- `docs/unity_ar/spec/backend-contract.md` §Tracking Identity (referenced; no change).

## Blockers raised
None — M3A scope implementable end-to-end without resolving deferred decisions.

## Deferred decisions preserved

| ID | Question | State after M3A |
|----|----------|-----------------|
| RQ-4 | `onImageTrackingLost.reason` field | UNRESOLVED. M3A carrier types do not depend on this. |
| MQ-1 | `startImageTrackingMulti` replace vs parallel | UNRESOLVED. M3A exposes `CardDescriptorRN` ready for either path. |
| MQ-7 | `triggerCombo` cardA/cardB semantic identity | UNRESOLVED. `CardDescriptorRN` does not carry `arTag` (RQ-3 CLOSED). |
| MQ-3 | XP immediate vs session-end | UNRESOLVED. M3A does not touch gamification. |
| BQ-1 | Migration of existing ar_objects | UNRESOLVED. M3A maps missing fields to `unavailable` (compatible). |
| BQ-2 | Reference-image hosting / source | UNRESOLVED. M3A accepts any non-empty string URL. |

## Conformity to plan §M3A scope

- ✅ `ARExperienceMapper` maps backend response to `UnityARExperiencePayload` and `CardDescriptorRN` (M3A specific path is two-step explicit).
- ✅ Bridge DTO mapper is implemented and tested.
- ✅ M3A does NOT touch Unity runtime.
- ✅ M3A does NOT touch backend runtime.
- ✅ M3A does NOT touch WebAR fallback.
- ✅ M3A does NOT touch QR scanner.
- ✅ M3A does NOT touch navigation.
- ✅ M3A does NOT touch M3B (AR_READY E2E).
- ✅ M3A is M-dependent only on M1A-CORRECTION-FINAL (verified) and M2 (verified).

## What M3A explicitly does NOT do

- Does NOT call `unityBridge.startImageTrackingMulti`.
- Does NOT load reference image library.
- Does NOT verify AR Foundation runtime state.
- Does NOT claim AR_READY.
- Does NOT touch `useARSession` state machine.
- Does NOT touch `ARLoadingOverlay` messaging.
- Does NOT touch permission UX.

## Confirmations

- ✅ No Unity source modified.
- ✅ No backend runtime modified.
- ✅ No frontend-web modified.
- ✅ No bridge contract files modified.
- ✅ No historical progress file modified.
- ✅ M3 was NOT started (only M3A).
- ✅ M3B was NOT started.
- ✅ No package upgrades.
- ✅ Surgical changes only.

## Next

- **M3A is complete.** The RN data boundary is now explicit:
  Backend API DTO → NativeTrackingDto → CardDescriptorRN.
- **M3B (Native AR_READY E2E)** is the next eligible Mobile task BUT
  remains blocked on Unity P3 / AC-TRACK-003 (runtime reference-image
  library) and BACKEND-T001 (backend actually shipping the fields).
- The current M3A bridge DTO is ready for M3B to consume once Unity
  ships P3.
- Until BACKEND-T001 lands, every backend record returns `unavailable`
  via the M3A validator — the consumer (ARScreen) correctly surfaces
  `BACKEND_METADATA_UNAVAILABLE` family without fabricating a
  `CardDescriptorRN`. The legacy single-card AR flow continues to run
  via `mapToUnityPayload` (legacy path preserved).
