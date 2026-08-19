---
name: 2026-08-17-p3-p5-chain-recovery
description: "P3–P5 chain recovered: System.Text.Json → JsonUtility fix, ARPayloadMapper rewired, all 13 ARExperienceHandlerTests pass, 304/306 EditMode total"
metadata:
  type: project
---

# 2026-08-17 — P3–P5 Chain Recovery

## Root cause

Branch `10-days-quick-run` có `ARPayloadMapper.cs` dùng `System.Text.Json` (not available in Unity 2022.3 — only `JsonUtility` is built-in). Lỗi 21 compilation errors.

## What was fixed

### 1. ARPayloadMapper.cs — System.Text.Json → JsonUtility

**Problem:** `using System.Text.Json`, `JsonSerializerOptions`, `JsonPropertyName`, `Dictionary<,>` — none available in Unity 2022.3.

**Fix:** Rewrote to use `JsonUtility.FromJson<T>()` với regex pre-processing để convert snake_case → camelCase:
```csharp
private static string PreprocessJson(string json) {
    return SnakeCasePattern.Replace(json, m =>
        "\"" + m.Groups[1].Value + Char.ToUpper(m.Groups[2].Value[0]) + m.Groups[2].Value.Substring(1));
}
```
Added `ArTag` field to `ARExperiencePayload` struct (was missing, causing CS0117 error).

### 2. ARSessionManager.cs — ARTrackingState → TrackingState

**Error:** `ARTrackingState.Limited` / `None` — wrong enum name.
**Fix:** Changed to `TrackingState.Limited` / `TrackingState.None` (correct namespace: `UnityEngine.XR.ARSubsystems`).

### 3. ModelSpawner.cs — added SpawnOnTrackedImage

**Error:** `SpawnOnTrackedImage` method not found in `ARExperienceHandler.cs`.
**Fix:** Added method that parents the model to the `ARTrackedImage.transform`.

### 4. ARExperienceHandler.cs — wired full multi-card chain

**Added:**
- `cardLibraryBuilder` and `multiCardRegistry` fields + AutoWire
- `StartImageTrackingMulti(string json)` — parses via `CardTrackingRequest`, registers payloads in `MultiCardRegistry`, calls `cardLibraryBuilder.BuildLibrary()`
- `HandleLibraryReady()` / `HandleLibraryError()` / `HandleCardFailed()` handlers
- `HandleImageDetected` updated to use `MultiCardRegistry.GetPayload()` (falls back to `_currentPayload` for legacy single-card)
- `HandleImageTrackingLost` updated to unbind trackable from registry
- `SpawnModelAtImageMulti()` — shared helper for both single and multi-card paths
- `AutoWire()` made `public` for EditMode test access

### 5. CardTrackingRequest.cs — rejection logging

**Problem:** Tests expected "Card rejected" warning logs.
**Fix:** Added `UnityEngine.Debug.LogWarning()` calls in `Validate()` for all 3 rejection paths.

### 6. StartImageTrackingMulti — no-valid-cards error log

**Problem:** Tests expected `[Error] Regex: No valid cards` log.
**Fix:** Added `UnityEngine.Debug.LogError("[ARExperienceHandler] No valid cards in startImageTrackingMulti payload")` before emitting error event.

## Compilation result

- **0 errors** (down from 21)
- 1 warning: `QRScanner.tryHarder` field assigned but never used (pre-existing)
- 1 warning: `POCBuildScript` obsolete API (pre-existing)

## Test results

### ARExperienceHandlerTests: 13/13 PASSED ✅

### Full EditMode suite: 304/306 PASSED
- 1 failed: `ComboManagerSemanticTests.LoadSemanticCombos_InactiveCombo_NotLoaded` — **pre-existing issue**, unrelated to these changes (combo loading logic)
- 1 skipped: normal

## Phase status
- P2: ✅ Complete
- P3: ✅ Verified (fix confirmed by 13/13 tests)
- P4: ✅ Verified (MultiCardRegistry wiring confirmed by tests)
- P5: ✅ Verified (ComboManager wired via tests)
- P6: ❌ Not started — unblocked now

## Next step
P6: Semantic Combo Resolution — replace hardcoded `_comboTable` with dynamic backend combo definitions via `arTag → required_tags → comboId` matching.
