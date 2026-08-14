## Status
open

## Blocks
- `docs/unity_ar/spec/requirements-baseline.md` — ANDROID-REQ-001, ANDROID-REQ-002
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` — P9 Android / ARCore device validation

## Symptom
Fresh package inspection on 2026-08-10 found:
- `com.unity.xr.arfoundation`: 6.3.5
- `com.unity.xr.arkit`: 6.3.5
- `com.unity.xr.management`: 4.5.4
- `com.unity.xr.arcore`: **absent** from both `Packages/manifest.json` and `Packages/packages-lock.json`

The approved requirements mandate ARCore support for Android, so the Android provider-specific mutable-library gates cannot be tested until the provider package is present.

## Hypotheses (ranked)
1. ARCore was omitted when ARKit/AR Foundation dependencies were added — package files contain no ARCore reference.
2. Android support may have been deferred during early Editor/iOS setup — P9 has not started.

## Tried
- Static package inspection only. No package installation was attempted during P0 because P1 Editor/XR work does not depend on ARCore and the live Editor was already in a licensing/GC failure loop.

## Resolution
Pending: add the AR Foundation-compatible ARCore provider (expected `com.unity.xr.arcore` 6.3.5), compile, then verify provider support on an ARCore physical device. Editor presence alone cannot satisfy ANDROID-REQ-002.
