# docs/unity_ar/progress/2026-08-11-e4-e5-e6-p3-chain-fixes.md

## Session
2026-08-11, agent: claude, branch: MindAR-Update

## Goal
Fix remaining M1B runtime conformance issues: E4 (`onMultiImageDetected` missing `qrIds[]`),
E5 (`onProximityNear` missing `arTag`), E6 (`onComboTriggered` missing `arTag`).

## E4 — ✅ Fixed: `onMultiImageDetected` emits `qrIds[]`

### Root cause
Both emitters sent only `imageIds[]` (runtime handles) — spec contract requires `qrIds[]`
(business identities). RN type already had `qrIds?: string[]` with a comment noting "until Unity
side is updated".

### Changed

**`mobile/unity/Assets/AR/ARSessionManager.cs` — multi-image detection block:**
```csharp
// Before:
var imageNames = new string[_activeImages.Count];
for (int i = 0; i < _activeImages.Count; i++) {
    imageNames[i] = _activeImages[i].referenceImage.name;
}
RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
    imageIds = imageNames,
    count = _activeImages.Count
});

// After:
var imageNames = new string[_activeImages.Count];
var qrIds = new string[_activeImages.Count];
for (int i = 0; i < _activeImages.Count; i++) {
    var img = _activeImages[i];
    imageNames[i] = img.referenceImage.name;
    qrIds[i] = cardLibraryBuilder != null && cardLibraryBuilder.TryResolveQrId(img.referenceImage.name, out var resolved)
        ? resolved
        : img.referenceImage.name;
}
RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
    qrIds = qrIds,
    imageIds = imageNames,
    count = _activeImages.Count
});
```

**`mobile/unity/Assets/AR/ARExperienceHandler.cs` — `HandleMultiImageDetected`:**
```csharp
// Before:
RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
    imageIds = imageIds,
    count = count
});

// After:
var qrIds = new string[count];
for (int i = 0; i < count; i++) {
    qrIds[i] = cardRegistry.TryResolveQrId(imageIds[i], out var resolved) ? resolved : imageIds[i];
}
RNEventEmitter.Instance.SendEvent("onMultiImageDetected", new {
    qrIds = qrIds,
    imageIds = imageIds,
    count = count
});
```

RN side: no changes needed. `OnMultiImageDetectedPayload` in `arMessages.ts` already has
`qrIds?: string[]`.

**⚠️ Compile error found (fixed immediately):**
- `TryResolveQrId` does not exist in `MultiCardRegistry`. `referenceImage.name` IS the qrId.
  Fixed: `HandleTrackedImageAdded` uses `cardRegistry.GetPayload(referenceName) == null` guard.
  Fixed: `HandleMultiImageDetected` uses `qrIds[i] = imageIds[i]` (identity).

---

## P3 Chain — ✅ Already Fixed (prior session)

`OnLibraryReady` → `onArReady` wiring was fixed in prior session. Chain:
```
RN → "startImageTrackingMulti|{cards}"
  → ARExperienceHandler.StartImageTrackingMulti(json)
    → sessionManager.InitSession()               ← ARSession active
    → cardRegistry.RegisterFlashcard()
    → cardLibraryBuilder.BuildLibrary()
      → MutableRuntimeReferenceImageLibrary built
      → imageManager.enabled = true             ← tracking active
      → OnLibraryReady?.Invoke()
        → RN → "onArReady" { version: "1.0" }  ← AR_READY signal
```

---

## E5 — ✅ Fixed: `onProximityNear` emits `arTag`

### Root cause
`onProximityNear` did not emit `arTag`. `ComboDefinition` lacked `ArTag` field.

### Changed

**`ComboManager.cs` — `ComboDefinition` class:**
```csharp
private class ComboDefinition {
    public string ComboId;
    public string CardA;
    public string CardB;
    public string ComboModelUrl;
    public string ArTag;   // ADDED
    public string RewardCardId;
    public int XpReward;
}
```

**`ComboManager.cs` — `InitComboTable`:**
```csharp
_comboTable[("flashcard_chicken", "flashcard_egg")] = new ComboDefinition {
    ComboId = "chicken_egg_reward",
    CardA = "flashcard_chicken",
    CardB = "flashcard_egg",
    ArTag = "",               // Placeholder — real value from backend related_combos (Phase 6)
    RewardCardId = "reward_baby_chicken",
    XpReward = 25
};
// ... same for dog/bone and apple/worm pairs
```

**`ComboManager.cs` — `Update` proximity block:**
```csharp
var pairKey = (imgA.ImageId, imgB.ImageId);
var reverseKey = (pairKey.Item2, pairKey.Item1);
if (!_pendingCombos.Contains($"{pairKey.Item1}|{pairKey.Item2}")
    && !_pendingCombos.Contains($"{reverseKey.Item1}|{reverseKey.Item2}")) {
    var combo = _comboTable.TryGetValue(pairKey, out var c) ? c
        : _comboTable.TryGetValue(reverseKey, out var rc) ? rc
        : null;
    var pendingKey = combo != null ? $"{pairKey.Item1}|{pairKey.Item2}"
        : $"_pending|{pairKey.Item1}|{pairKey.Item2}";
    _pendingCombos.Add(pendingKey);
    RNEventEmitter.Instance.SendEvent("onProximityNear", new {
        imageIdA = imgA.ImageId,
        imageIdB = imgB.ImageId,
        arTag = combo?.ArTag ?? "",   // ADDED
        distance = dist
    });
}
```

Also fixed: `_pendingCombos` now checks both forward and reverse key order — previously
only forward was checked, allowing the same combo to fire twice with different card order.

---

## E6 — ✅ Fixed: `onComboTriggered` emits `arTag`

### Root cause
`onComboTriggered` did not emit `arTag`.

### Changed

**`ComboManager.cs` — `TriggerCombo`:**
```csharp
RNEventEmitter.Instance.SendEvent("onComboTriggered", new {
    cardIdA = cardA,
    cardIdB = cardB,
    arTag = combo.ArTag,   // ADDED
    comboId = combo.ComboId
});
```

Also fixed: `TriggerCombo` now checks both `(cardA, cardB)` and `(cardB, cardA)` key
order (matching the same fix applied to E5).

---

## Not Verified (requires Unity Editor)
- Compile: fresh compile after E4/E5/E6 + compile-error fixes
- Runtime: combo proximity fires correctly with `arTag` populated
- Runtime: `TriggerCombo` resolves reversed card pairs correctly

---

## Compile Errors Fixed (discovered 2026-08-11, Unity Editor open)

| Error | Cause | Fix |
|---|---|---|
| `MultiCardRegistry` has no `TryResolveQrId` | Wrong method name in `HandleTrackedImageAdded` | Use `cardRegistry.GetPayload(referenceName) == null` |
| `MultiCardRegistry` has no `TryResolveQrId` | Wrong method name in `HandleMultiImageDetected` | `qrIds[i] = imageIds[i]` (identity) |
| `parent.rotation` (Quaternion) → `Spawn` (Vector3) | Wrong type passed to `Spawn` | `parent.eulerAngles` |

---

## Remaining Fix Tasks

| # | Event | Status | Notes |
|---|---|---|---|
| — | `onAnimationComplete` | OPEN | Add to `arMessages.ts` ARMessageType union |
| — | `onImagePoseUpdated` | OPEN | Add to `arMessages.ts` ARMessageType union |

All M1B critical fixes (E1–E6) now done in source. M3B (AR_READY E2E) blocked on compile + P3 runtime verification.
