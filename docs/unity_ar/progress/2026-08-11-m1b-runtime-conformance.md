# docs/unity_ar/progress/2026-08-11-m1b-runtime-conformance.md

## Session
2026-08-11, agent: claude, branch: MindAR-Update

## Goal
M1B — Runtime conformance verification: compare actual Unity C# source against
the frozen bridge contract (`docs/unity_ar/spec/bridge-contract.md`) to identify
any semantic gaps that need fixing before M3B (AR_READY E2E).

Scope: source-code inspection only. No Unity editor required.

## Method
1. Read all C# files emitting `RNEventEmitter.Instance.SendEvent`.
2. Read all `RNMessageReceiver` switch cases.
3. Cross-reference with `bridge-contract.md` §RN→Unity Methods and §Unity→RN Events.
4. Read `arMessages.ts` (RN typed payloads) and `UnityBridgeModule.ts` (RN stubs).

---

## FINDING 1 — ✅ NEW TODAY: `startImageTrackingMulti` C# route now exists

**Before this session:** `RNMessageReceiver` had no case for `startImageTrackingMulti`.
`ARExperienceHandler` lacked `HandleTrackedImageAdded`/`HandleTrackedImageRemoved`.
Source compiled but wiring was broken.

**After this session:** Both gaps are fixed (see `2026-08-11-unity-multi-card-wiring.md`).
C# side: ✅ implemented. RN side: `UnityBridgeModule.startImageTrackingMulti` exists as
a no-op stub (native wiring deferred to M3B). This is a KNOWN GAP — not blocking M1B.

---

## FINDING 2 — 🔴 `onImageDetected` missing `qrId` (CRITICAL — blocks M3B UX)

**Contract:** `bridge-contract.md` §Unity→RN Events + `arMessages.ts`:
```typescript
interface OnImageDetectedPayload {
  imageId: string;
  imageName: string;
  qrId: string;       // ← REQUIRED per spec §K-2
  transform: { x, y, z };
}
```

**Source:** `ARSessionManager.cs:99`:
```csharp
RNEventEmitter.Instance.SendEvent("onImageDetected", new {
    imageId = image.referenceImage.name,
    imageName = image.referenceImage.name,
    trackableId = image.trackableId.ToString(),
    trackingState = image.trackingState.ToString(),
    transform = new { x = pos.x, y = pos.y, z = pos.z }
});
```

`qrId` is absent. RN cannot key flashcard state by business identity.

**Fix:** Add `qrId` field. The value must come from `MultiCardRegistry.TryResolveQrId`
or `ARExperienceHandler.HandleTrackedImageAdded`'s binding — the same lookup
already done in the new multi-card handler. `ARSessionManager` would need to call
`CardImageLibraryBuilder.TryResolveQrId` to emit `qrId` here.

---

## FINDING 3 — 🔴 `onImageTrackingLost` field name mismatch

**Contract:** `arMessages.ts:113`:
```typescript
interface OnImageTrackingLostPayload {
  qrId: string;              // REQUIRED
  reason?: 'CARD_REMOVED' | 'TEMPORARY_OCCLUSION';
}
```

**Source:** `ARExperienceHandler.cs:151`:
```csharp
RNEventEmitter.Instance.SendEvent("onImageTrackingLost", new {
    imageId = qrId,           // sends 'imageId' but value IS qrId
    trackableId = trackableId.ToString()
});
```

`imageId` field name does not match `qrId` required by spec. The VALUE is correct
(qrId), but RN `OnImageTrackingLostPayload.qrId` will be `undefined` — the TypeScript
type does not have `imageId` as a valid field.

**Fix:** Rename `imageId` → `qrId` in the event payload. Also consider emitting
`reason?: 'CARD_REMOVED'` since this handler fires only on trackable removal
(TRACK-REQ-011 compliant), never on tracking-state degradation.

---

## FINDING 4 — 🔴 `onModelLoaded` wrong field — `modelName` instead of `qrId`

**Contract:** `arMessages.ts:169`:
```typescript
interface OnModelLoadedPayload {
  modelUrl: string;
  qrId: string;    // ← REQUIRED per spec §K-2
}
```

**Source:** `ARExperienceHandler.cs:222`:
```csharp
RNEventEmitter.Instance.SendEvent("onModelLoaded", new {
    modelUrl = payload.Value.ModelUrl,
    modelName = modelPrefab.name   // ← sends 'modelName'; spec requires 'qrId'
});
```

RN consumer cannot correlate `onModelLoaded` to a card without `qrId`.

**Fix:** Replace `modelName = modelPrefab.name` → `qrId = qrId` (the qrId already
in scope from `SpawnModelForTrackable`'s parameter).

---

## FINDING 5 — 🟡 `onMultiImageDetected` sends `imageIds[]` not `qrIds[]`

**Contract:** `arMessages.ts:132`:
```typescript
interface OnMultiImageDetectedPayload {
  qrIds?: string[];    // business identities (native AR contract)
  imageIds?: string[]; // runtime handles (legacy compat)
  count: number;
}
```

**Source:** `ARExperienceHandler.cs:186`:
```csharp
RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
    imageIds = imageNames,   // runtime handles, not business identities
    count = count
});
```

**Severity:** Lower because spec marks `imageIds` as legacy-compat. But `qrIds`
is the native AR contract and currently absent. RN consumer must fall back to
`imageIds` which won't match business logic keyed by `qrId`.

**Fix:** Look up `qrId` for each tracked image via `cardRegistry.TryGetTrackableQrId`
and emit `qrIds`. Keep `imageIds` for backward compat.

---

## FINDING 6 — 🟡 `onProximityNear` missing `arTag`

**Contract:** `arMessages.ts:183`:
```typescript
interface OnProximityNearPayload {
  imageIdA: string;
  imageIdB: string;
  arTag: string;    // ← REQUIRED per spec
  distance: number;
}
```

**Source:** `ComboManager.cs:76`:
```csharp
RNEventEmitter.Instance.SendEvent("onProximityNear", new {
    imageIdA = imgA.ImageId,
    imageIdB = imgB.ImageId,
    distance = dist
    // ← 'arTag' missing
});
```

`ComboDefinition` has `arTag` (confirmed in `ComboManager.cs` class definition).
The proximity check iterates all pairs and fires per-pair, but does not look up
`arTag`. After `RegisterTrackedImage` binds `ImageId → TrackedImageState`,
combo lookup could retrieve `arTag` if the combo table were keyed by
`imageIdPair → arTag`.

**Severity:** Medium. `onProximityNear` → RN → combo UX won't have `arTag` for
semantic display. `onComboTriggered` has the same gap (see FINDING 7).

---

## FINDING 7 — 🟡 `onComboTriggered` missing `arTag`

**Contract:** `arMessages.ts:194`:
```typescript
interface OnComboTriggeredPayload {
  cardIdA: string;
  cardIdB: string;
  arTag: string;    // ← REQUIRED per spec
  comboId: string;
}
```

**Source:** `ComboManager.cs:126`:
```csharp
RNEventEmitter.Instance.SendEvent("onComboTriggered", new {
    cardIdA = cardA,
    cardIdB = cardB,
    comboId = combo.ComboId
    // ← 'arTag' missing; combo.arTag is available in scope
});
```

`combo.arTag` is available (`ComboDefinition` has the field). Straightforward add.

---

## FINDING 8 — ✅ Other events fully conformant

| Event | Status | Notes |
|-------|--------|-------|
| `onArReady` | ✅ | `{ version: "1.0" }` — matches spec |
| `onError` | ✅ | `{ code, message }` — implemented everywhere |
| `onObjectPlaced` | ✅ | `{ qrId, worldX, worldY, worldZ }` — deprecated but correct |
| `onComboComplete` | ✅ | `{ rewardCardId, xpAwarded }` — matches spec |
| `onFoodDragging` | ✅ | `{ foodModelId }` — matches spec |
| `onFoodFed` | ✅ | `{ foodModelId, xpAwarded, streakCount }` — matches spec |
| `onPetStateChanged` | ✅ | `{ state }` — matches spec |
| `onAnimationComplete` | ⚠️ | Exists in source (AnimationController) but not in RN contract type |
| `onAudioComplete` | ⚠️ | Exists in source (ARAudioPlayer) but not in RN contract type |
| `onInteraction` | ⚠️ | Exists in ARGestureHandler + ARExperienceHandler; in arMessages ARMessageType |
| `onPlaneDetected` | ✅ | Exists in source (PlaneDetection); correctly excluded from active contract |
| `onImagePoseUpdated` | ⚠️ | Emitted by ARSessionManager; not in arMessages.ts type union |

---

## FINDING 9 — ✅ `initSession`, `pauseSession`, `resumeSession`, `destroySession`, `setPlaneDetection`, `triggerCombo` fully conformant

RN stubs exist and C# implementations are correct. `loadARExperience` correct.
`startImageTracking` correct (legacy single-card). `startImageTrackingMulti` C#
done; RN native wiring is KNOWN GAP deferred to M3B.

---

## Gap Summary (by severity)

| Severity | Count | Items |
|----------|-------|-------|
| 🔴 Critical | 2 | `onImageDetected` missing `qrId`; `onImageTrackingLost` wrong field name |
| 🟡 Medium | 3 | `onModelLoaded` wrong field; `onMultiImageDetected` missing `qrIds`; `onProximityNear` missing `arTag` |
| 🟡 Low (contract hygiene) | 3 | `onComboTriggered` missing `arTag`; `onAnimationComplete` not typed; `onImagePoseUpdated` not typed |
| ✅ OK | 15 | all other methods/events |

---

## ⚠️ P3 Chain Gap Found: `OnLibraryReady` → `InitImageTrackingSession` NOT wired

`CardImageLibraryBuilder.BuildLibrary` fires `OnLibraryReady` when the mutable
runtime library is ready and `imageManager.enabled = true` (CardImageLibraryBuilder.cs:229).

But nothing subscribes to `OnLibraryReady`. The chain is broken:
```
StartImageTrackingMulti
  → CardImageLibraryBuilder.BuildLibrary(validCards)
    → downloads images, builds MutableRuntimeReferenceImageLibrary
    → sets imageManager.referenceLibrary = _mutableLibrary
    → sets imageManager.enabled = true
    → fires OnLibraryReady    ← FIRES BUT NO SUBSCRIBER
```

`ARSessionManager` has `InitImageTrackingSession(XRReferenceImageLibrary library)` but it
is never called after the library is built. The AR subsystem may not activate tracking
without `InitImageTrackingSession` being called with the library.

**This is a P3 wiring gap — blocks AR_READY E2E (M3B).**

### ✅ FIXED (2026-08-11)

`ARExperienceHandler` now wires the full P3 chain:

1. `StartImageTrackingMulti` calls `sessionManager?.InitSession()` FIRST — ARSession must be running before `imageManager.referenceLibrary` assignment can take effect.
2. `SubscribeEvents()` subscribes `cardLibraryBuilder.OnLibraryReady += HandleLibraryReady`.
3. `HandleLibraryReady()` emits `onArReady` to RN — tracking is now active.

Complete chain:
```
RN → "startImageTrackingMulti|{cards}"
  → ARExperienceHandler.StartImageTrackingMulti(json)
    → sessionManager.InitSession()                         ← SESSION ACTIVE
    → CardTrackingRequest.Parse(json)
    → cardRegistry.RegisterFlashcard(qrId, payload)
    → cardLibraryBuilder.BuildLibrary(validCards)
      → downloads images
      → MutableRuntimeReferenceImageLibrary created + populated
      → imageManager.referenceLibrary = _mutableLibrary
      → imageManager.enabled = true                        ← TRACKING ACTIVE
      → OnLibraryReady?.Invoke()
        → ARExperienceHandler.HandleLibraryReady()
          → RNEventEmitter.SendEvent("onArReady", { version: "1.0" })   ← AR_READY
```

Note: `InitImageTrackingSession` (ARSessionManager) is NOT needed here — `CardImageLibraryBuilder` already assigns the library directly to `imageManager.referenceLibrary` and sets `imageManager.enabled = true`, which is sufficient for AR Foundation to start tracking.

## Not Verified (requires Unity editor)

- Runtime: do events actually emit correct payloads when AR detects/tracks a card?
- Runtime: does `cardRegistry.TryResolveQrId` return the correct qrId at the point
  `onImageDetected` fires in ARSessionManager?
- Runtime: does the multi-card flow (`StartImageTrackingMulti` → `BuildLibrary` →
  `OnLibraryReady` → `OnTrackedImageAdded` → `SpawnModelForTrackable`) work end-to-end?
- Compilation: fresh compile after today's `HandleTrackedImageAdded`/`HandleTrackedImageRemoved`
  additions — needs Unity editor to verify (last verified compile: 2026-08-10 P0 pass).

---

## Blockers raised

None — M1B is a verification task. The findings above should become fix tasks.

---

## Specs touched

`docs/unity_ar/spec/bridge-contract.md` — findings referenced but no changes made.
Contract remains authoritative.

---

## Fixes Applied (2026-08-11)

All 3 critical fixes are now committed to source.

### E1 ✅ — `onImageDetected` + `onImageTrackingLost` in ARSessionManager
- Injected `CardImageLibraryBuilder` (`[SerializeField]` + AutoWire) into `ARSessionManager`
- `qrId` resolved via `cardLibraryBuilder.TryResolveQrId(refName)` on every detection/removal
- Falls back to `refName` if no library builder (legacy pre-multi-card path)
- `onImageDetected`: now sends `{ imageId, imageName, qrId, trackableId, trackingState, transform }`
- `onImageTrackingLost`: now sends `{ qrId, reason: "CARD_REMOVED" }` (not `imageId`/`trackableId`)

### E2 ✅ — `onImageTrackingLost` in ARExperienceHandler
- Renamed `imageId = qrId` → `qrId = qrId` in `HandleTrackedImageRemoved`
- Added `reason = "CARD_REMOVED"` (TRACK-REQ-011 compliant — fires only on trackable removal)
- NOTE: `ARSessionManager` now ALSO emits `onImageTrackingLost` with the correct payload.
  Both emitters are kept; `ARSessionManager` fires at the subsystem layer, `ARExperienceHandler`
  fires after model cleanup. This is intentional — `ARExperienceHandler` fires after the model
  is destroyed, giving RN a signal to clean up UI. `ARSessionManager` fires at the subsystem
  level.

### E3 ✅ — `onModelLoaded` in both paths
- `SpawnModelForTrackable`: `modelName = modelPrefab.name` → `qrId = qrId`
- `SpawnModelAtImage` (legacy): `modelName = modelPrefab.name` → `qrId = payload.QrId`

## Remaining Fix Tasks

| # | Event | Status | Notes |
|---|---|---|---|
| E4 | `onMultiImageDetected` | ✅ Done | Emit `qrIds[]` alongside `imageIds[]` via `cardRegistry.TryResolveQrId` |
| E5 | `onProximityNear` | ✅ Done | Add `arTag` from `ComboDefinition` via lookup |
| E6 | `onComboTriggered` | ✅ Done | Add `arTag` from `combo.ArTag` |
| — | `onAnimationComplete` | OPEN | Add to `arMessages.ts` ARMessageType union |
| — | `onImagePoseUpdated` | OPEN | Add to `arMessages.ts` ARMessageType union |

Tasks 1-4 directly unblock M3B (AR_READY E2E). Task 5 (E5/E6) is UX quality — DONE.
