## Status
draft

## Goal
Lock in the RN ↔ Unity bridge message contracts and identify integration gaps.

---

## Bridge Direction

```
React Native → Unity: native module calls (UnityBridge)
Unity → React Native: UnitySendMessage (via RNEventEmitter)
```

---

## React Native → Unity Methods

All dispatched via `RNMessageReceiver.OnMessageFromRN("methodName|{json}")`.

| Method | Payload | Current state | Native AR needed |
|--------|---------|---------------|----------------|
| `initSession` | none | ✅ Implemented | No change |
| `loadARExperience` | `ARExperiencePayloadDto` | ✅ Implemented | ⚠️ Only single payload |
| `startImageTracking` | none or `List<CardDescriptor>` | ⚠️ Only calls `InitSession()` | **New: multi-card** |
| `triggerCombo` | `{ cardA, cardB }` | ✅ Implemented | No change |
| `setPlaneDetection` | `{ enabled: bool }` | ✅ Implemented | No change |
| `pauseSession` | none | ✅ Implemented | No change |
| `resumeSession` | none | ✅ Implemented | No change |
| `destroySession` | none | ✅ Implemented | No change |

---

## ARExperiencePayloadDto (current single-card)

```typescript
// mobile/rn/src/types/ar.ts
interface UnityARExperiencePayload {
  qrId: string;
  word: string;
  translationVi: string;
  audioUrl: string;
  modelUrl: string;
  animationType: 'rotate' | 'bounce' | 'idle';
  glbSize: number;
  position: string;    // "x y z"
  rotation: string;    // "x y z"
  scale: string;       // "x y z"
}
```

---

## CardDescriptor (for multi-card)

```csharp
// mobile/unity/Assets/AR/CardImageLibraryBuilder.cs (nested class)
[Serializable]
public class CardDescriptor {
    public string qrId;                    // maps to backend qr_id
    public string imageUrl;                // reference_image_url (download for AR library)
    public float physicalWidthMeters = 0.08f;  // physical width in meters
}
```

---

## Multi-Card Bridge Contract (needed)

For multi-card native AR, RN must send a list of `CardDescriptor` to Unity.

Proposed new RN method:
```
startImageTrackingMulti | { cards: CardDescriptor[] }
```

Where `CardDescriptor` is the TypeScript equivalent:
```typescript
interface CardDescriptorRN {
  qrId: string;
  imageUrl: string;   // reference_image_url
  physicalWidthMeters: number;
}
```

On Unity side:
```csharp
public void StartImageTrackingMulti(string json) {
    var cards = JsonUtility.FromJson<CardDescriptorList>(json);
    cardLibraryBuilder.BuildLibrary(cards.cards);
}
```

---

## Unity → React Native Events

All sent via `RNEventEmitter.Instance.SendEvent("eventName", payload)`.

| Event | Payload | Current state | Native AR needed |
|-------|---------|---------------|----------------|
| `onArReady` | `{ version }` | ✅ Implemented | No change |
| `onError` | `{ code, message }` | ✅ Implemented | No change |
| `onImageDetected` | `{ imageId, imageName, transform }` | ✅ Implemented | ⚠️ Needs qrId |
| `onImageTrackingLost` | `{ qrId, reason }` | ✅ Implemented | ⚠️ Needs qrId + semantic reason |
| `onMultiImageDetected` | `{ imageIds, count }` | ✅ Implemented | ✅ OK |
| `onObjectPlaced` | `{ qrId, worldX, worldY, worldZ }` | ✅ Implemented | No change |
| `onModelLoaded` | `{ modelUrl, modelName }` | ✅ Implemented | No change |
| `onProximityNear` | `{ imageIdA, imageIdB, distance }` | ✅ Implemented | ⚠️ Needs arTag |
| `onComboTriggered` | `{ cardIdA, cardIdB, comboId }` | ✅ Implemented | ⚠️ Needs arTag |
| `onComboComplete` | `{ rewardCardId, xpAwarded }` | ✅ Implemented | ✅ OK |
| `onFoodDragging` | `{ foodModelId }` | ✅ Implemented | ✅ OK |
| `onFoodFed` | `{ foodModelId, xpAwarded, streakCount }` | ✅ Implemented | ✅ OK |
| `onPetStateChanged` | `{ state }` | ✅ Implemented | ✅ OK |

### Tracking State vs. Trackable Removal — Semantic Distinction

AR Foundation image tracking transitions through states. These are NOT the same event and must NOT be conflated:

**A. Tracking state change** — `ARTrackedImage.trackingState` transitions between `Tracking`, `Limited`, and `None`. This is an ongoing quality adjustment while the physical card remains in the environment. The `ARTrackedImage` still exists in the runtime registry.

**B. Trackable removal** — The `ARTrackedImage` is removed from `ARTrackedImageManager`'s tracked image list. This fires the `removed` path of `HandleTrackedImagesChanged`. The tracked image is no longer registered.

**The `onImageTrackingLost` event** must represent **B (trackable removal)**, not **A (tracking state degradation/loss)**. Per `TRACK-REQ-011`, `onImageTrackingLost` fires ONLY from the `removed` path — not from `updated` path transitions. Temporary tracking degradation (`trackingState == Limited`) must NOT fire `onImageTrackingLost`.

This distinction matters for UX: a card briefly occluded by a hand should NOT clear the flashcard overlay if the trackable is still registered. Only actual removal clears the overlay.

**DECISION_REQUIRED (RQ-4):** Should `onImageTrackingLost` payload include a `reason` field distinguishing `CARD_REMOVED` from `TEMPORARY_OCCLUSION`? This affects RN UX decision-making.

---

## Bridge Integration Gaps

### Gap 1: Single-payload vs. multi-card routing
**Current:** `ARExperienceHandler._currentPayload` holds ONE payload; `HandleImageDetected` only processes one card.
**Needed:** `MultiCardRegistry` holds N payloads; `HandleImageDetected` looks up by `qrId`.
**Status:** `MultiCardRegistry` exists but `ARExperienceHandler` doesn't wire it up for multi-card.
**Blocks:** `AC-BRIDGE-003`

### Gap 2: CardDescriptor not flowing from RN to CardImageLibraryBuilder
**Current:** `CardImageLibraryBuilder` is standalone; no RN method calls it with a list of `CardDescriptor`.
**Needed:** New `startImageTrackingMulti` method that deserializes list and calls `BuildLibrary()`.
**Blocks:** `AC-TRACK-003`, `AC-BRIDGE-003`

### Gap 3: ARExperienceHandler doesn't reference CardImageLibraryBuilder
**Current:** `ARExperienceHandler` has `GLBLoader`, `ModelSpawner`, `AnimationController`, `PlaneDetection` wired but NOT `CardImageLibraryBuilder`.
**Needed:** Add `CardImageLibraryBuilder` field and wire it into the session start flow.
**Blocks:** `AC-TRACK-001`, `AC-TRACK-003`

### Gap 4: Backend `reference_image_url` / `physical_width_m` not in RN payload
**Current:** `UnityARExperiencePayload` has no fields for these.
**Needed:** Add `referenceImageUrl: string` and `physicalWidthMeters: number` to RN payload type.
**Blocks:** `AC-BRIDGE-002`, native AR backend migration

---

## Open questions

| # | Question | Blocks approval? |
|---|----------|-----------------|
| RQ-1 | Should `startImageTracking` be replaced with `startImageTrackingMulti` (breaking change) or added as a parallel method? | Yes |
| RQ-2 | Should `onImageDetected` payload include `qrId` (from `MultiCardRegistry`) or only `imageId`? | Yes |
| RQ-3 | Should `CardDescriptor` include `ar_tag` for combo lookup, or should that stay on the Unity side via registry? | No |
| RQ-4 | Should `onImageTrackingLost` payload include a `reason` field distinguishing `CARD_REMOVED` from `TEMPORARY_OCCLUSION`? | No (affects UX quality) |
