# docs/unity_ar/progress/2026-08-10-m1a-correction-rn-bridge-contract.md

## Session
2026-08-10 00:51, agent: cursor, branch: MindAR-Update

## Goal
Correction / verification pass on the existing M1A RN bridge contract. Reconcile M1A progress entry (`2026-08-09-m1a-rn-contract-baseline.md`) against the **latest approved specs** (`docs/unity_ar/spec/bridge-contract.md`, `docs/unity_ar/spec/mobile-ar-product-spec.md`). The LATEST APPROVED SPEC wins over the older M1A progress entry.

## What in M1A was stale

| # | M1A Decision | Latest Spec Verdict | Stale because |
|---|---|---|---|
| 1 | `mapToCardDescriptor` silently substituted `modelUrl` when `reference_image_url` was missing | `mobile-ar-product-spec.md §K-3` mandates `imageUrl = reference_image_url from backend`. Spec §K-3 is silent on substitution; silent fallback violates the explicit field contract | `modelUrl` (3D GLB) ≠ `reference_image_url` (AR Foundation tracked image). Substitution produces a working `CardDescriptorRN` against an invalid runtime asset |
| 2 | `DEFAULT_PHYSICAL_WIDTH_M = 0.08` used as production fallback in `mapToCardDescriptor` | No spec approves a hard-coded physical width. `mobile-ar-product-spec.md §K-3` says `physicalWidthMeters = physical_width_m from backend` | Invented production default with no spec authority. Hidden data absence |
| 3 | `useARSession.triggerCombo` used `qrId` values silently | `mobile-ar-product-spec.md §F-1` says combos use `arTag` (semantic). `bridge-contract.md §"React Native → Unity Methods"` for `triggerCombo` payload is `{ cardA, cardB }` — no semantic identity specified | RN silently chose qrId without resolving whether the bridge expects qrId or arTag |
| 4 | M1A declared "all spec gaps closed with documented decisions" | RQ-3 (arTag on CardDescriptor), RQ-4 (onImageTrackingLost.reason), and triggerCombo identity remain unresolved | Overstated finality |

## What was corrected

### `mobile/rn/src/types/ar.ts`
- `CardDescriptorRN` docblock rewritten to reflect that:
  - `imageUrl` MUST come from backend `reference_image_url` (NOT modelUrl)
  - `physicalWidthMeters` MUST come from backend `physical_width_m` (NO silent default)
  - `arTag` is intentionally NOT in the shape (per RQ-3)
- `DEFAULT_PHYSICAL_WIDTH_M` retained ONLY for unit-test fixtures with explicit warning. Production mapper paths MUST NOT use it.
- **NEW** `CardDescriptorSource` discriminated union:
  ```typescript
  type CardDescriptorSource =
    | { kind: 'ok'; descriptor: CardDescriptorRN }
    | { kind: 'unavailable'; reason: 'missing_reference_image' | 'missing_physical_width' | 'both'; qrId: string };
  ```

### `mobile/rn/src/bridge/ARExperienceMapper.ts`
- `mapToCardDescriptor` now returns `CardDescriptorSource` (not `CardDescriptorRN`).
- When `reference_image_url` is missing: returns `{ kind: 'unavailable', reason: 'missing_reference_image' | 'missing_physical_width' | 'both' }`.
- NEVER substitutes `modelUrl` for missing reference image.
- NEVER substitutes `DEFAULT_PHYSICAL_WIDTH_M` for missing physical width.
- Empty strings / non-positive numbers / NaN / Infinity all count as missing.

### `mobile/rn/src/hooks/useARSession.ts`
- `triggerCombo` body rewritten with explicit DECISION_REQUIRED comment block:
  - Spec §F-1 says combos use `arTag` (semantic)
  - Bridge `triggerCombo { cardA, cardB }` doesn't specify identity
  - Current code passes `qrId` because `TrackedImage.qrId` is the only card identifier on hand
  - Forwarded as MQ-7 — needs resolution before M5

### `mobile/rn/src/__tests__/ARExperienceMapper.test.ts`
- All 4 stale test cases REPLACED with corrected contract tests:
  - `returns ok when both backend native fields are present`
  - `returns unavailable when reference_image_url is missing (NEVER substitutes modelUrl)`
  - `returns unavailable when physical_width_m is missing (NEVER substitutes default)`
  - `returns unavailable with reason=both when both fields missing`
  - `does NOT contain modelUrl in ok result`
  - `does NOT use DEFAULT_PHYSICAL_WIDTH_M as production fallback`

### `mobile/rn/src/__tests__/bridge-types.test.ts`
- **5 NEW tests** added (preserving all 18 prior tests):
  - `CardDescriptorRN does NOT include arTag (combo lookup stays on Unity side per RQ-3)`
  - `OnImageTrackingLostPayload qrId is REQUIRED, reason is optional (DECISION_REQUIRED: RQ-4)`
  - `OnProximityNearPayload uses arTag for combo identity, NOT qrId pairs`
  - `OnComboTriggeredPayload uses arTag for combo identity, NOT just qrId pair`
  - `TriggerComboPayload carries cardA/cardB strings (semantic identity DECISION_REQUIRED)`

## What remains DECISION_REQUIRED

| ID | Question | Spec reference | Forwarded from |
|----|----------|----------------|-----------------|
| **MQ-7** | What semantic identity does `triggerCombo { cardA, cardB }` use — `qrId` or `arTag`? | `bridge-contract.md §"React Native → Unity Methods"` for `triggerCombo`; `mobile-ar-product-spec.md §F-1` says combos use arTag | NEW (this correction) |
| **RQ-3** | Should `CardDescriptor` include `ar_tag` for combo lookup, or stay on Unity side via `MultiCardRegistry`? | Spec verdict: "No" (does not block approval) — but still open for future evolution | forwarded from M1A |
| **RQ-4** | Should `onImageTrackingLost` payload include a `reason` field distinguishing `CARD_REMOVED` from `TEMPORARY_OCCLUSION`? | `OnImageTrackingLostPayload.reason?` typed as optional; not in `mobile-ar-product-spec.md §K-2` row | forwarded from M1A |
| **MQ-1** | `startImageTrackingMulti` replace vs parallel? | Parallel (current implementation) | forwarded from M1A |
| **MQ-3** | Approach A (immediate XP) or B (session-end XP)? | Affects M7 | forwarded from spec |

## What was NOT changed (still correct per latest spec)

| M1A decision | Spec reference | Status |
|---|---|---|
| `CardDescriptorRN { qrId, imageUrl, physicalWidthMeters }` — no extras | `mobile-ar-product-spec.md §K-3` exact match; `bridge-contract.md §CardDescriptor (C#)` mirror | ✅ |
| `onImageTrackingLost = trackable REMOVAL` (not tracking-state degradation) | `bridge-contract.md §Tracking State vs Trackable Removal` + `TRACK-REQ-011` | ✅ |
| `onObjectPlaced` legacy annotated, not active native contract | `mobile-ar-product-spec.md §K-4 / MOB-ERR-REQ-030` | ✅ |
| `onPlaneDetected` absent from `ARMessageType` union | `mobile-ar-product-spec.md §K-4 / MOB-ERR-REQ-031` | ✅ |
| `qrId` is the primary card identity in `OnImageDetectedPayload` / `OnModelLoadedPayload` | `mobile-ar-product-spec.md §K-2` row | ✅ |
| `arTag` present in `OnProximityNearPayload` / `OnComboTriggeredPayload` | Spec §K-2 + §F-1 | ✅ |
| `OnMultiImageDetectedPayload` carries `qrIds[]` + legacy `imageIds[]` | Spec §K-2 + legacy compat note | ✅ |
| `OnModelProgressPayload.stage` covers `download/load/instantiate` only | Spec §K-2 + `ARLoadingOverlay` stages | ✅ |

## M2 impact

M2 (host shell) is **NOT affected** by this correction. M2 implemented:
- `AR` screen route navigation with `{ lessonId, lessonTitle }`
- `AppState` subscription → `pauseSession` / `resumeSession`
- `UnityView` activation via `unityBridge.checkAvailability()`

None of these touch `CardDescriptorRN` mapping or `triggerCombo`. M2 host shell stays verified (see `2026-08-10-m2-rn-host-shell.md`).

## Whether M3A is safe to start

**YES — with caveats.**

`mapToCardDescriptor` is now safe for M3A (Backend/DTO preparation) usage:
- Returns `{ kind: 'ok', descriptor }` when backend has shipped `reference_image_url` + `physical_width_m`
- Returns `{ kind: 'unavailable', reason, qrId }` when fields are missing — caller can route to `REFERENCE_IMAGE_LOAD_FAILED` error path per `mobile-ar-product-spec.md §I-1`

Caveats for M3A:
- BACKEND-T001 must include BOTH `reference_image_url` and `physical_width_m` as required (not optional) fields on `ARExperienceResponse`. Without them, `mapToCardDescriptor` will return `unavailable` for every card, blocking `startImageTrackingMulti`.
- If backend ships with nullable fields, M3A must add explicit validation in the API service layer before calling the mapper.

## Verified

- **tsc** — `cd mobile/rn && npx tsc --noEmit`:
  - Same 1 pre-existing unrelated error (`ClayButton.tsx:76`)
  - **Zero new errors introduced by this correction pass**
- **Targeted tests**:
  - `bridge-types.test.ts`: 23/23 pass (18 prior + 5 new) — `~688 ms`
  - `ARExperienceMapper.test.ts`: 8/8 pass (rewritten) — `~688 ms`
  - `arscreen-host.test.ts`: 10/10 pass (unchanged M2) — `~688 ms`
  - **Combined: 41/41 pass**, ~688 ms
- **Git diff scope** — only `mobile/rn/src/` files touched (RN + types + tests). Zero changes to Unity, backend, frontend-web, navigation, or contracts.

## Not Verified (M1B scope)

- Runtime conformance against actual Unity `RNEventEmitter` payloads — blocked on Unity P0/AC-BUILD-001.
- `triggerCombo` semantic identity resolution (qrId vs arTag) — DECISION_REQUIRED MQ-7.
- BACKEND-T001 backend shape for `reference_image_url` / `physical_width_m` — out of RN scope.

## Confirmations

- No Unity source modified.
- No backend code modified.
- No frontend-web modified.
- No bridge contract files modified.
- No historical progress file modified (M1A progress entry preserved; this is a NEW correction entry).
- M3 was NOT started.
- M3A's `mapToCardDescriptor` consumer wiring is safe to add (the function returns the new `CardDescriptorSource` union; callers must handle both branches).

## Next

- **M1A-CORRECTION is complete.** Bridge contract type layer now enforces: no silent modelUrl substitution, no invented physical width, CardDescriptorRN does NOT carry arTag, combo semantic identity recorded as MQ-7.
- **M3A** can now start — `mapToCardDescriptor` returns an explicit `unavailable` branch that M3A can route to AR error paths.
- **MQ-7** (triggerCombo semantic identity) must be resolved before M5 (combo UX).
- **M1B** remains blocked on Unity P0/AC-BUILD-001.
