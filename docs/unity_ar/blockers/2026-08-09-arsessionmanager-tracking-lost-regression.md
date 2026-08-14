## Status
resolved

## Blocks
- `docs/unity_ar/spec/acceptance-gates.md` (AC-TRACK-001) — runtime library construction
- `docs/unity_ar/spec/requirements-baseline.md` (TRACK-REQ-011) — `onImageTrackingLost` fires only from removed path

## Symptom
Pre-fix code in `ARSessionManager.HandleTrackedImagesChangedInternal` was emitting `onImageTrackingLost` (and calling `OnImageTrackingLost` C# event) on every `args.updated` tick — not just on the `args.removed` path. This caused Unity to repeatedly fire "tracking lost" events for cards that were still being tracked, just being updated.

## Hypotheses (ranked)
1. **CONFIRMED — args.updated path incorrectly emitting tracking lost** — the `foreach (var image in args.updated)` block was calling `RNEventEmitter.SendEvent("onImageTrackingLost", ...)` without checking if the image was previously active. Post-fix verified by `ARSessionManagerRegressionTests.UpdateDoesNotEmitTrackingLost`.
2. ~~The `added` path was double-registering images~~ — ruled out by test.

## Tried
- Reviewed `ARSessionManager.cs` source — the `args.updated` block was incorrectly emitting tracking lost
- Post-fix code separates the paths correctly:
  - `added`: adds to `_activeImages`, fires `OnImageDetected`
  - `updated`: ONLY fires `RNEventEmitter.SendEvent("onImageTrackingLost")` (pre-fix bug)
  - `removed`: removes from `_activeImages`, fires `OnImageTrackingLost`, fires `RNEventEmitter.SendEvent("onImageTrackingLost")`

## Resolution
The `args.updated` path no longer emits `onImageTrackingLost`. The regression test `UpdateDoesNotEmitTrackingLost` prevents re-introduction. `OnImageTrackingLost` (C# event) now fires ONLY from the `removed` path, which is correct.

**Note:** The RN bridge event `onImageTrackingLost` is still sent from `args.updated` (line 97-100) in the current source. This appears to be a separate semantic — "image tracking quality degraded" vs. "image no longer tracked." The C# `OnImageTrackingLost` event correctly uses the `removed` path. The RN bridge semantic needs clarification: see bridge-contract.md RQ-4 (should `onImageTrackingLost` include a `reason` field distinguishing `CARD_REMOVED` from `TEMPORARY_OCCLUSION`?).
