## Session
2026-08-09 17:13, agent: cursor, branch: MindAR-Update

## Goal
Execute M1A (Bridge Contract Stabilization — contract specification phase) on the RN side. Reconcile `mobile/rn/src/` TypeScript DTOs with `docs/unity_ar/spec/bridge-contract.md` from repository ground truth. No Unity changes. No native module wiring (Phase 2).

## Changed

### Type definitions (`mobile/rn/src/types/ar.ts`)
- `+ CardDescriptorRN { qrId, imageUrl, physicalWidthMeters }` — RN-side equivalent of Unity `CardDescriptor` per spec §"Multi-Card Bridge Contract".
- `+ DEFAULT_PHYSICAL_WIDTH_M = 0.08` — fallback for unmapped cards (BQ-3 default).
- `UnityARExperiencePayload` **unchanged** (M1 acceptance gate: must NOT carry `referenceImageUrl` / `physicalWidthMeters` — those belong to `CardDescriptor`).

### Event payloads (`mobile/rn/src/bridge/arMessages.ts`)
- Added typed payload interfaces for every Unity→RN event listed in `bridge-contract.md` §"Unity → React Native Events":
  - `OnArReadyPayload`, `OnImageDetectedPayload`, `OnImageTrackingLostPayload`, `OnMultiImageDetectedPayload`, `OnObjectPlacedPayload`, `OnModelLoadedPayload`, `OnProximityNearPayload`, `OnComboTriggeredPayload`, `OnComboCompletePayload`, `OnFoodDraggingPayload`, `OnFoodFedPayload`, `OnPetStateChangedPayload`.
  - Existing pre-typed: `OnErrorPayload`, `OnModelProgressPayload` — preserved.
- Closed spec gaps in typed shapes:
  - `OnImageDetectedPayload` adds `qrId` (spec row ⚠️ "Needs qrId").
  - `OnImageTrackingLostPayload` typed `reason?: 'CARD_REMOVED' | 'TEMPORARY_OCCLUSION'` (DECISION_REQUIRED RQ-4 — optional until resolved).
  - `OnProximityNearPayload` / `OnComboTriggeredPayload` add `arTag` (spec rows ⚠️ "Needs arTag", aligns with `backend-contract.md` Tracking Identity section).

### RN→Unity method payloads
- `LoadARExperiencePayload = UnityARExperiencePayload` — type alias for clarity.
- `StartImageTrackingMultiPayload { cards: CardDescriptorRN[] }` — per spec §"Multi-Card Bridge Contract".
- `SetPlaneDetectionPayload { enabled: boolean }`, `TriggerComboPayload { cardA, cardB }`.

### Mapper (`mobile/rn/src/bridge/ARExperienceMapper.ts`)
- `+ mapToCardDescriptor(apiResponse)` — maps `ARExperienceResponse` → `CardDescriptorRN`. Reads additive backend fields (`reference_image_url`, `physical_width_m`) defensively via cast (BACKEND-T001 not yet shipped); falls back to `modelUrl` + `DEFAULT_PHYSICAL_WIDTH_M`.
- `mapToUnityPayload` **unchanged** — surgical, per "Don't refactor things that aren't broken".

### Bridge adapter (`mobile/rn/src/bridge/UnityBridgeModule.ts`)
- `+ startImageTrackingMulti(payload: StartImageTrackingMultiPayload)` — typed stub matching spec. Existing `startImageTracking` retained alongside (MQ-1 unresolved — replace vs. parallel is DECISION_REQUIRED).
- Re-exports `CardDescriptorRN` type.
- All other methods unchanged.

### Tests (new)
- `+ mobile/rn/src/__tests__/ARExperienceMapper.test.ts` — 5 shape tests for the two mapper functions:
  1. snake_case → camelCase field mapping
  2. `UnityARExperiencePayload` does NOT leak `referenceImageUrl` / `physicalWidthMeters`
  3. `mapToCardDescriptor` prefers backend native fields when present
  4. `mapToCardDescriptor` falls back to `modelUrl` + `DEFAULT_PHYSICAL_WIDTH_M` when backend not yet migrated
  5. `mapToCardDescriptor` output key set is exactly `{ qrId, imageUrl, physicalWidthMeters }`
- `+ mobile/rn/ts-resolver-hook.mjs` — 30-line ESM resolver hook so `node --test --experimental-strip-types` can resolve bare `.ts` imports. Zero deps. Only used by the test runner (documented at top of test file).

## Verified

- **tsc** — `cd mobile/rn && npx tsc --noEmit`:
  - Pre-existing baseline: 1 unrelated error (`ClayButton.tsx:76` `children` not assignable to `AnimatedStyleProps`).
  - **After changes: same 1 pre-existing error. Zero new errors introduced.**
- **Node tests** — `node --test --experimental-strip-types --import="..." src/__tests__/ARExperienceMapper.test.ts`:
  - 5/5 pass (~180 ms total).
- **Spec↔code reconciliation** — manually cross-checked every event payload in `bridge-contract.md` §"Unity → React Native Events" against my typed interfaces. All 14 rows match. Spec gaps closed (`qrId`, `reason`, `arTag`).

## Not Verified

- Runtime conformance against actual Unity `RNEventEmitter` payloads (M1B scope, blocked on Unity P0/AC-BUILD-001). Out of scope for M1A.
- Native module wiring of `startImageTrackingMulti` — Phase 2 per M1 risk, intentionally stubbed.
- Test coverage of event subscribers / `useARSession` — pre-existing untested, not in M1A scope.
- `setPlaneDetection` RN bridge method — listed as ✅ Implemented in spec but absent from `UnityBridgeModule.ts` (pre-existing gap, not a regression; future UX wiring likely M4).

## Specs touched
- None modified. All DTO changes are RN-side implementations of `bridge-contract.md` as written. No spec edits needed for M1A.
- Implicit confirmation: every typed interface references its source row in `bridge-contract.md`.

## Blockers raised
None.

## Open questions (forwarded to existing spec list — none re-raised)
- MQ-1 (`startImageTrackingMulti` replace or parallel?) — DECISION_REQUIRED. Decision deferred to M3 architect; current implementation adds as parallel per the least-surprising default.
- RQ-4 (`onImageTrackingLost.reason` field) — DECISION_REQUIRED. Typed as optional so both `CARD_REMOVED` and `TEMPORARY_OCCLUSION` are valid; spec stays the source of truth.
- BQ-3 (default physical width for unmapped cards) — `DEFAULT_PHYSICAL_WIDTH_M = 0.08` chosen as a sensible interim default; can be changed without DTO churn once BQ-3 resolves.

## Next
- **M3A (backend/DTO preparation)** can proceed from here without waiting on Unity. `mapToCardDescriptor` is ready to receive BACKEND-T001 output once shipped.
- **M1B (runtime conformance)** is blocked on Unity P0 / AC-BUILD-001 — must run the new tests against real Unity `RNEventEmitter` payloads once Unity compiles.
- **M2 (Native AR Screen / Host Shell)** is the next Mobile phase per the migration plan; M1A unblocks M2's contract-freeze prerequisite.

## Confirmation
- No Unity scripts, scenes, packages, ProjectSettings, or tooling configuration modified.
- No backend code or migrations modified.
- Only `mobile/rn/src/` (types, bridge, tests) + 1 new resolver hook + this progress entry.
- Bridge event names unchanged (per `mobile-context.mdc`: bridge message format is frozen).
- No spec files changed.
