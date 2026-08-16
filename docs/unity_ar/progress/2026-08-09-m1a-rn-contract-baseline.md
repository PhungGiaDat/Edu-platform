# docs/unity_ar/progress/2026-08-09-m1a-rn-contract-baseline.md

## Session
2026-08-09 21:48, agent: claude-code, branch: MindAR-Update

## Goal
Execute M1A (RN Contract Baseline — TypeScript type alignment) on the React Native side.
Freeze the RN ↔ Unity native AR contract types against `bridge-contract.md` and
`mobile-ar-product-spec.md §K`. No Unity source changes. No later-phase implementation.

## Changed

### `mobile/rn/src/types/ar.ts`
- `+ CardDescriptorRN { qrId, imageUrl, physicalWidthMeters }` — approved tracking descriptor per spec §"Multi-Card Bridge Contract" and `bridge-contract.md §K-3`.
- `+ DEFAULT_PHYSICAL_WIDTH_M = 0.08` — fallback for cards without backend-native AR fields (BQ-3 interim default).
- `UnityARExperiencePayload` **unchanged** — does NOT leak `referenceImageUrl` / `physicalWidthMeters` (M1 acceptance gate ✅).

### `mobile/rn/src/bridge/arMessages.ts` (rewritten as fully-typed spec mirror)
- Added typed payload interfaces for ALL 14 spec events (§K-2 + legacy):
  - `OnArReadyPayload { version }` — ✅ existing, documented.
  - `OnErrorPayload { code, message }` — ✅ existing, documented.
  - `OnImageDetectedPayload { imageId, qrId, imageName, transform }` — added `qrId` (business identity) per spec §K-2.
  - `OnImageTrackingLostPayload { qrId, reason? }` — `qrId` REQUIRED per spec; `reason` optional (RQ-4 open).
  - `OnMultiImageDetectedPayload { qrIds?, imageIds?, count }` — `qrIds[]` is native AR contract; `imageIds[]` is legacy compat.
  - `OnModelProgressPayload { stage, progress, message }` — ✅ existing.
  - `OnObjectPlacedPayload` — **LEGACY** annotated: `/** @deprecated legacy */` + full docblock citing MOB-ERR-REQ-030. Not part of active native contract.
  - `OnModelLoadedPayload { modelUrl, qrId }` — replaced `modelName` with `qrId` per spec §K-2.
  - `OnProximityNearPayload { imageIdA, imageIdB, arTag, distance }` — ✅ existing, `arTag` present.
  - `OnComboTriggeredPayload { cardIdA, cardIdB, arTag, comboId }` — ✅ existing, `arTag` present.
  - `OnComboCompletePayload`, `OnFoodDraggingPayload`, `OnFoodFedPayload`, `OnPetStateChangedPayload` — ✅ existing.
  - `OnCacheHitPayload` — present in union, untype-annotated (pre-existing).
- Added RN→Unity method payload types: `LoadARExperiencePayload`, `StartImageTrackingMultiPayload`, `SetPlaneDetectionPayload`, `TriggerComboPayload`.
- **`onPlaneDetected` is NOT in the `ARMessageType` union** — correct per MOB-ERR-REQ-031. Cannot be re-introduced without a spec change.

### `mobile/rn/src/bridge/UnityBridgeModule.ts`
- `+ startImageTrackingMulti(payload: StartImageTrackingMultiPayload)` — typed stub matching spec §K-1. Existing `startImageTracking` retained alongside (MQ-1 unresolved — parallel, not replacement).
- `export type { CardDescriptorRN }` — re-export so consumers import both bridge and type from one module.

### `mobile/rn/src/bridge/ARExperienceMapper.ts`
- `+ mapToCardDescriptor(apiResponse)` — maps `ARExperienceResponse` → `CardDescriptorRN`. Reads additive backend fields (`reference_image_url`, `physical_width_m`) defensively; falls back to `modelUrl` + `DEFAULT_PHYSICAL_WIDTH_M`.
- `mapToUnityPayload` **unchanged** — surgical, per guidelines.

### `mobile/rn/src/hooks/useARSession.ts`
- `TrackedImage` interface: added `qrId` field + comment clarifying `imageId` is runtime handle, `qrId` is primary Map key (per TRACK-REQ-004).
- `onImageDetected` handler: uses `qrId` as `Map` key instead of `imageId`. Stores both fields in `TrackedImage`.
- `onImageTrackingLost` handler: uses `qrId` key (not `imageId`).
- `triggerCombo`: uses `qrId` values (not runtime handles) for combo API.
- `onModelLoaded` handler: added block comment noting `qrId` present per spec.

### `mobile/rn/src/__tests__/bridge-types.test.ts` (NEW — 18 tests)
1. `CardDescriptorRN` exactly `{ qrId, imageUrl, physicalWidthMeters }` — no extras.
2. `physicalWidthMeters` is `number` (not string).
3. `UnityARExperiencePayload` does NOT have `referenceImageUrl` / `physicalWidthMeters`.
4. `OnImageDetectedPayload` carries `qrId` (business identity) per spec §K-2.
5. `OnImageTrackingLostPayload` carries `qrId` (REQUIRED per spec §K-2).
6. `OnImageTrackingLostPayload` supports optional `reason` (RQ-4 placeholder).
7. `OnMultiImageDetectedPayload` carries `qrIds[]` (business identities).
8. `OnMultiImageDetectedPayload` legacy `imageIds[]` present for backward compat.
9. `OnModelLoadedPayload` carries `qrId` (spec §K-2), NOT `modelName`.
10. `OnProximityNearPayload` carries `arTag` (semantic combo identity).
11. `OnComboTriggeredPayload` carries `arTag` (semantic combo identity).
12. `OnObjectPlacedPayload` present in union (legacy compat, annotated deprecated).
13. `onPlaneDetected` is NOT in the active native AR contract type layer.
14. `onImageTrackingLost` is trackable **removal** (not tracking-state degradation).
15. `OnModelProgressPayload` stage covers `download/load/instantiate` only (not tracking).
16. `OnArReadyPayload` is AR subsystem init (not tracking state).
17. `OnErrorPayload` covers AR subsystem failures.
18. `StartImageTrackingMultiPayload` carries `CardDescriptorRN[]`.

## Verified

- **tsc** — `cd mobile/rn && npx tsc --noEmit`:
  - Pre-existing baseline: 1 unrelated error (`ClayButton.tsx:76` `children` not assignable to `AnimatedStyleProps`).
  - **After M1A changes: same 1 pre-existing error. Zero new errors introduced.**
- **Bridge type tests** — 18/18 pass (~266 ms).
- **ARExperienceMapper tests** — 5/5 pass (~180 ms). **23/23 total tests passing.**
- **Spec↔code reconciliation**:
  - Every spec §K-2 event row → typed payload in `arMessages.ts`.
  - Every spec §K-1 method row → typed stub / payload in `UnityBridgeModule.ts`.
  - `CardDescriptorRN` shape matches spec exactly.
  - `UnityARExperiencePayload` does NOT leak tracking descriptor fields (acceptance gate ✅).
  - `qrId` is primary business identity throughout: handlers, `TrackedImage` Map key, `triggerCombo`.
  - `arTag` present in `OnProximityNearPayload` and `OnComboTriggeredPayload` per spec.
  - `onObjectPlaced` documented as LEGACY (MOB-ERR-REQ-030) — not active native contract.
  - `onPlaneDetected` absent from union (MOB-ERR-REQ-031) — confirmed by test #13.
  - Tracking-state degradation !== trackable removal: separate handler paths + test #14.

## Not Verified

- Runtime conformance against actual Unity `RNEventEmitter` payloads (M1B scope, blocked on Unity P0/AC-BUILD-001). Out of scope for M1A.
- Native module wiring of `startImageTrackingMulti` — Phase 2 per MQ-1.
- Test coverage of event subscribers / `setPlaneDetection` RN bridge method wiring — pre-existing gaps, not in M1A scope.

## Specs touched

- `docs/unity_ar/spec/bridge-contract.md` — compared against; no edits needed (M1A is spec implementation, not spec authoring).
- `docs/unity_ar/spec/mobile-ar-product-spec.md` §K — used as authoritative source for event payloads and `CardDescriptorRN` shape.
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md` §5 — consulted for tracking guidance requirements.

## Blockers raised

None — all spec gaps closed with documented decisions.

## Open questions forwarded

- **MQ-1** (`startImageTrackingMulti` replace vs parallel?) — DECISION_REQUIRED. Implemented as parallel; existing `startImageTracking` retained. Resolution needed before Phase 2 native wiring.
- **RQ-4** (`onImageTrackingLost.reason` field) — DECISION_REQUIRED. Typed as optional union `'CARD_REMOVED' | 'TEMPORARY_OCCLUSION'`. Resolution needed for UX implementation (M4/M5).
- **BQ-3** (default physical width for unmapped cards) — `DEFAULT_PHYSICAL_WIDTH_M = 0.08` chosen as interim default. Can change without DTO churn.

## Confirmation

- No Unity source scripts, scenes, packages, or ProjectSettings modified.
- No backend code or migrations modified.
- No `mobile/rn/src/screens/ARScreen.tsx` modified (ARScreen redesign is M2+).
- Only `mobile/rn/src/` modified (types, bridge, hooks, tests) + 1 new test file.
- Bridge message event names unchanged (frozen per `mobile-context.mdc`).
- No spec files changed.

## Next

- **M1B (Runtime Conformance Verification)** is the natural follow-on — run new tests against real Unity `RNEventEmitter` payloads once Unity P0/AC-BUILD-001 is verified. Cannot be completed without Unity runtime access.
- **M3A (Backend/DTO preparation)** can proceed from here without waiting on Unity or M1B. `mapToCardDescriptor` is ready to receive BACKEND-T001 output.
- **M2 (Native AR Screen / Host Shell)** is the next mobile phase per the migration plan; M1A unblocks M2's contract-freeze prerequisite.
