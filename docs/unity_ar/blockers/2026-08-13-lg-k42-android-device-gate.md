## Status
open

## Blocks
- `docs/unity_ar/spec/acceptance-gates.md` — physical Android embedded-runtime and ARCore camera acceptance.
- `docs/unity_ar/spec/architecture-specification.md` — RN-hosted Unity AR Foundation runtime on Android.

## Symptom
The connected physical device is an LG `LM-K420` (`meh15lm`) running Android 11 / API 30 with a 32-bit userspace only:

- `ro.product.cpu.abi = armeabi-v7a`
- `ro.product.cpu.abilist = armeabi-v7a,armeabi`

The current RN host, Unity export, and APK contain only `arm64-v8a`. Installing the exact current host APK reproduces:

`INSTALL_FAILED_NO_MATCHING_ABIS: Failed to extract native libraries, res=-113`

Google Play Services for AR (`com.google.ar.core`) is installed, but LG K42 / LM-K420 is absent from Google's current ARCore certified-device list. Therefore this handset cannot be used as evidence for the required certified ARCore camera / `AR_READY` gate.

## Hypotheses (ranked)
1. The LG K42 is the wrong acceptance handset — its 32-bit Android userspace conflicts with the existing arm64 pipeline, and the model is not ARCore-certified.
2. An ARMv7 Unity/RN build could prove basic embedded rendering and direct bridge behavior on this handset, but it still cannot provide valid ARCore device acceptance.

## Tried
- Verified ADB authorization and exact device identity/ABI.
- Enumerated Unity export JNI libraries and APK `lib/<abi>/` entries; both are arm64-only.
- Reproduced the install failure with `adb install -r` against the exact APK path.
- Changed Unity Player target architecture to ARMv7 and RN `reactNativeArchitectures` to `armeabi-v7a`.
- Added `Assets/Scenes/ARScene.unity` to Unity Android build scenes.
- Scheduled a fresh Unity Gradle export. The Unity MCP job became stale/timed out and the export timestamps and JNI libraries remained unchanged, so no ARMv7 artifact was produced or claimed.

## Resolution
Provide an ADB-authorized, ARCore-certified ARM64 Android device for final acceptance. If basic bridge diagnostics on LG K42 are still desired, first complete and verify an ARMv7 Unity export and RN host build, while keeping the ARCore gate explicitly blocked.
