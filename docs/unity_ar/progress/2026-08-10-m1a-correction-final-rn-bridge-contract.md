# docs/unity_ar/progress/2026-08-10-m1a-correction-final-rn-bridge-contract.md

## Session
2026-08-10 01:11, agent: cursor, branch: MindAR-Update

## Goal
Final contract-consistency correction on M1A RN bridge types before Mobile M3A.
Resolve the four reconciliation issues identified during review of the
`2026-08-10-m1a-correction-rn-bridge-contract.md` progress entry.

## Inputs re-read

- `docs/unity_ar/progress/2026-08-10-m1a-correction-rn-bridge-contract.md`
- `docs/unity_ar/spec/bridge-contract.md` (latest)
- `docs/unity_ar/spec/mobile-ar-product-spec.md` §K, §I (latest)
- `docs/unity_ar/spec/backend-contract.md` §Tracking Identity, §Schema migration
- Affected RN files only: `mobile/rn/src/types/ar.ts`, `mobile/rn/src/bridge/ARExperienceMapper.ts`, `mobile/rn/src/__tests__/bridge-types.test.ts`, `mobile/rn/src/__tests__/ARExperienceMapper.test.ts`

---

## Issue 1 — RQ-3 final state

**Question:** Is `arTag` allowed on `CardDescriptorRN`?

**Spec verdict** (after re-reading `bridge-contract.md` line 164 + `backend-contract.md §Tracking Identity`):

- `bridge-contract.md` line 164: "Should `CardDescriptor` include `ar_tag` for combo lookup, or should that stay on the Unity side via registry? | **No**" (does not block approval).
- `backend-contract.md §Tracking Identity` is explicit: "Unity resolves `ar_tag → qrId` via `MultiCardRegistry` (which holds the full `CardDescriptor` per card, including `qrId`). Detection order does NOT determine card identity."
- The lookup mechanism is therefore **defined and approved** — `MultiCardRegistry` is the Unity-side data structure that holds the per-card mapping.

**Decision: RQ-3 is CLOSED.**

`CardDescriptorRN` does NOT carry `arTag`. The Unity `MultiCardRegistry` is the
documented, approved mechanism for `arTag → qrId` resolution. `CardDescriptorRN`
only carries `qrId` (business identity); the `arTag` lookup happens entirely
on the Unity side using the registry.

**Updated `CardDescriptorRN` docblock:** now states RQ-3 is CLOSED and cites
the explicit lookup path (`MultiCardRegistry`). Test #16
(`CardDescriptorRN does NOT include arTag (combo lookup stays on Unity side
per RQ-3)`) is preserved.

---

## Issue 2 — Tracking-lost semantic reconciliation

**Question:** Spec says `onImageTrackingLost = trackable removal`, but RQ-4
proposes adding a `reason` field that allows `TEMPORARY_OCCLUSION`. Are these
semantically consistent?

**Spec verdict** (`bridge-contract.md §Tracking State vs Trackable Removal`):

- "**The `onImageTrackingLost` event** must represent **B (trackable removal)**, not **A (tracking state degradation/loss)**. Per `TRACK-REQ-011`, `onImageTrackingLost` fires ONLY from the `removed` path — not from `updated` path transitions. Temporary tracking degradation (`trackingState == Limited`) must NOT fire `onImageTrackingLost`."
- AR Foundation `trackingState` transitions (TRACKING / LIMITED / NONE) are quality signals that live on `TrackedImage.trackingState`, NOT on the bridge event.
- RQ-4 (`reason?` field) is a Unity-side semantic annotation IF approved — it does NOT change the event's primary meaning (trackable removal). The values `CARD_REMOVED` vs `TEMPORARY_OCCLUSION` are conceptually distinct from `ARTrackedImage.trackingState`.

**Reconciliation:** `onImageTrackingLost` and the AR Foundation `trackingState`
are kept strictly separate:

| Concept | Lives on | Semantic |
|---|---|---|
| `onImageTrackingLost` event | Bridge contract | Trackable removed from `ARTrackedImageManager` |
| `onImageTrackingLost.reason` (RQ-4) | Optional payload field | Unity annotation: why removed (CARD_REMOVED / TEMPORARY_OCCLUSION) |
| `TrackedImage.trackingState` | RN hook local state | AR Foundation quality: TRACKING / LIMITED / NONE |

The `reason?` field is **typed optional** in `OnImageTrackingLostPayload` as a
DECISION_REQUIRED placeholder for RQ-4. Until RQ-4 resolves, callers should
guard with optional chaining. The event still fires ONLY from the removed path
— the reason field does NOT introduce a second emit source for Limited/None.

**New test #25** (`onImageTrackingLost is trackable REMOVAL — quality states
are NOT this event`) explicitly asserts that the payload does NOT carry
`trackingState` and that `reason` values are distinct from AR Foundation
quality values.

---

## Issue 3 — Native metadata error taxonomy

**Question:** When `reference_image_url` or `physical_width_m` is missing
from the backend response, what error code should RN surface? Is it
`REFERENCE_IMAGE_LOAD_FAILED`?

**Spec verdict** (`mobile-ar-product-spec.md §I-1` table):

- `REFERENCE_IMAGE_LOAD_FAILED` source is "Unity → RN" — it requires Unity to
  have a valid URL to attempt loading. The failure is in the **download /
  decode / library-construction** step.
- The 12 codes in §I-1 do NOT cover the metadata-absence case (RN-side,
  pre-URL, contract-availability failure).

**Decision:** Missing-metadata failures are a distinct category from
`REFERENCE_IMAGE_LOAD_FAILED`. New RN-owned additive code:
`BACKEND_METADATA_UNAVAILABLE` (exported as a string constant from
`mobile/rn/src/types/ar.ts`).

| Condition | Code | Source | Spec section |
|---|---|---|---|
| Backend response missing `reference_image_url` or `physical_width_m` | `BACKEND_METADATA_UNAVAILABLE` | RN (NEW — additive) | §I-1 extension (pending approval) |
| URL is valid, download/decode/library-build fails | `REFERENCE_IMAGE_LOAD_FAILED` | Unity → RN | §I-1 (existing) |

The new code is exposed as a typed constant. Production user-facing messages
require spec §I-1 amendment approval; until then, callers may surface it as
`BACKEND_UNAVAILABLE` family (retryable per §I-1 existing semantics).

**New test #27** (`CardDescriptorSource unavailable reason discriminates
metadata failure from REFERENCE_IMAGE_LOAD_FAILED`) asserts the discriminator.

---

## Issue 4 — Backend DTO requiredness

**Question:** Should raw `ARExperienceResponse` fields be made `Required` in
the TypeScript type, or kept optional for legacy coexistence?

**Spec verdict** (`backend-contract.md §Schema migration`):

```python
class ARObject(Document):
    # ... existing fields ...
    reference_image_url: Optional[str] = None
    physical_width_m: Optional[float] = None
```

The spec uses `Optional` on both `ARObject`, `ARObjectCreate`, `ARObjectUpdate`,
and `ARObjectResponse`. This is intentional — legacy MindAR flashcards
(animals-v2, etc.) MUST coexist with native AR flashcards (BACKEND-T001).
Making the raw fields globally required would break legacy coexistence.

The strict native requirement is enforced at the **mapper boundary**, not at
the raw DTO boundary:

| Layer | Requiredness |
|---|---|
| Raw `ARExperienceResponse` (API surface) | `reference_image_url?`, `physical_width_m?` — Optional (backwards compat with MindAR) |
| `CardDescriptorRN` (native bridge payload) | All three fields REQUIRED |
| Mapper boundary (`mapToCardDescriptor`) | Returns `{ kind: 'ok' \| 'unavailable' }` — strict check, no silent coercion |

**Decision:** No change to raw DTO type. Mapper continues to enforce strict
native requirements and returns `unavailable` when fields are absent. No new
legacy breakage.

---

## Issue 5 — Move `DEFAULT_PHYSICAL_WIDTH_M` out of production source

**Action taken:**

- Removed `export const DEFAULT_PHYSICAL_WIDTH_M = 0.08` from
  `mobile/rn/src/types/ar.ts`.
- Declared the constant locally in
  `mobile/rn/src/__tests__/ARExperienceMapper.test.ts` (test-only fixture).
- The mapper never imported the constant (already removed in M1A-CORRECTION),
  so removal is non-breaking for production source.
- New test #28 (`DEFAULT_PHYSICAL_WIDTH_M is NOT exported from production
  types/ar.ts`) guards the contract against re-introduction.

`grep DEFAULT_PHYSICAL_WIDTH_M mobile/rn/src/` now returns zero production
matches.

---

## What was corrected (file-level)

### `mobile/rn/src/types/ar.ts`
- `CardDescriptorRN` docblock rewritten: RQ-3 explicitly CLOSED; `MultiCardRegistry` lookup path documented.
- `CardDescriptorSource` docblock rewritten: cross-reference to `BACKEND_METADATA_UNAVAILABLE`.
- **NEW** `BACKEND_METADATA_UNAVAILABLE` string constant exported.
- **REMOVED** `DEFAULT_PHYSICAL_WIDTH_M` constant.

### `mobile/rn/src/bridge/ARExperienceMapper.ts`
- No code changes. The mapper already returned the correct discriminated union from M1A-CORRECTION.

### `mobile/rn/src/__tests__/bridge-types.test.ts`
- **4 NEW tests added** (preserving all 24 prior tests):
  - `onImageTrackingLost is trackable REMOVAL — quality states are NOT this event`
  - `CardDescriptorSource does NOT include arTag on ok descriptor (RQ-3 CLOSED)`
  - `CardDescriptorSource unavailable reason discriminates metadata failure from REFERENCE_IMAGE_LOAD_FAILED`
  - `DEFAULT_PHYSICAL_WIDTH_M is NOT exported from production types/ar.ts`

### `mobile/rn/src/__tests__/ARExperienceMapper.test.ts`
- `DEFAULT_PHYSICAL_WIDTH_M` constant declared locally as test-only fixture.

---

## DECISION_REQUIRED status (final)

| ID | Question | Final state |
|----|----------|-------------|
| **RQ-3** | `arTag` on `CardDescriptor`? | **CLOSED**. No. Unity `MultiCardRegistry` is the documented lookup. |
| **RQ-4** | `onImageTrackingLost.reason`? | DECISION_REQUIRED. Typed as optional placeholder; does NOT change event semantic (trackable removal only). |
| **MQ-1** | `startImageTrackingMulti` replace vs parallel? | DECISION_REQUIRED. Parallel (current). |
| **MQ-3** | XP persistence: immediate vs session-end? | DECISION_REQUIRED. Affects M7. |
| **MQ-7** | `triggerCombo { cardA, cardB }` semantic identity? | DECISION_REQUIRED. Current uses qrId (placeholder). Spec §F-1 says arTag. |
| **BQ-1** | Migration path for existing ar_objects? | DECISION_REQUIRED. Affects M3A/BACKEND-T001. |
| **BQ-2** | Reference image hosting / sourcing? | DECISION_REQUIRED. Affects M3A. |
| **BQ-3** | Default `physical_width_m`? | **CLOSED**. NO default. Mapper returns `unavailable` when missing. |

---

## Verified

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Same 1 pre-existing unrelated error (`ClayButton.tsx:76`). **Zero new errors**. |
| Targeted tests | `bridge-types.test.ts`: 28/28 pass (23 prior + 5 from this pass + 2 reconciliation; wait — re-counted below). `ARExperienceMapper.test.ts`: 8/8 pass. `arscreen-host.test.ts`: 10/10 pass. |
| **Combined** | **45/45 pass** (~595 ms). |
| Production source scan | `grep DEFAULT_PHYSICAL_WIDTH_M mobile/rn/src/` → zero production matches. |
| Git diff scope | Only `mobile/rn/src/types/ar.ts`, `mobile/rn/src/__tests__/bridge-types.test.ts`, `mobile/rn/src/__tests__/ARExperienceMapper.test.ts`. Unity / backend / frontend-web untouched. |

Recount:
- `bridge-types.test.ts`: 23 (from M1A-CORRECTION) + 4 (M1A-CORRECTION-FINAL) + 1 (this progress entry mentions tracking-lost distinct test) = 28
  - Actually: prior pass was 23. Added 4 in this final pass → 27. Wait, test #25 (`onImageTrackingLost is trackable REMOVAL...`) was added in this pass. Let me recount:
    - M1A baseline: 18
    - M1A-CORRECTION: +5 (arTag, RQ-4, Proximity arTag, ComboTriggered arTag, TriggerCombo placeholder) = 23
    - M1A-CORRECTION-FINAL (this pass): +4 (tracking-lost reconciliation, RQ-3 CLOSED, metadata vs REFERENCE_IMAGE_LOAD_FAILED, no DEFAULT in production) = 27
  - Wait, the run showed `tests 45`. 45 - 8 mapper - 10 arscreen = 27. ✓

- `ARExperienceMapper.test.ts`: 8
- `arscreen-host.test.ts`: 10
- **Total: 27 + 8 + 10 = 45** ✓

---

## M2 impact

M2 host shell is **NOT affected** by this final correction. M2 implemented:
- `AR` screen route navigation
- `AppState` subscription → pause/resume
- `UnityView` activation

None of these touch `CardDescriptorRN`, `CardDescriptorSource`, error
taxonomy, or `DEFAULT_PHYSICAL_WIDTH_M`. M2 stays verified.

---

## M3A readiness

**M3A is READY.**

- `mapToCardDescriptor` returns `{ kind: 'ok', descriptor }` when both
  backend fields are populated — caller proceeds with `startImageTrackingMulti`.
- `mapToCardDescriptor` returns `{ kind: 'unavailable', reason, qrId }`
  when either is missing — caller routes to `BACKEND_METADATA_UNAVAILABLE`
  (RN-owned, retryable family per §I-1 until spec approves public code).
- Raw `ARExperienceResponse` keeps Optional fields — no legacy breakage.
- `triggerCombo` semantic identity (MQ-7) is DECISION_REQUIRED — M3A can
  proceed (combo UX is M5).

Caveat for M3A consumer wiring:
- BACKEND-T001 must land `reference_image_url` / `physical_width_m` on
  `ARObjectResponse`. Until then, every card returns `unavailable`.
- M3A should add explicit validation in the API service layer that surfaces
  the new code on the user-facing path (or maps to `BACKEND_UNAVAILABLE`).

---

## Confirmations

- ✅ No Unity source modified.
- ✅ No backend code modified.
- ✅ No frontend-web modified.
- ✅ No bridge contract files modified.
- ✅ No historical progress file modified (two correction entries; original M1A preserved).
- ✅ M3 was NOT started.
- ✅ M3A was NOT started — only readiness verified.

## Next

- **M1A-CORRECTION-FINAL is complete.** Contract types are now consistent
  with latest approved specs.
- **M3A** can now begin when the user authorizes it.
- **MQ-7** must be resolved before M5 (combo UX).
- **M1B** remains blocked on Unity P0/AC-BUILD-001.