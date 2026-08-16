## Session
2026-08-13 12:40, agent: codex, branch: MindAR-Update

## Goal
Resolve the Android RN host `INSTALL_FAILED_NO_MATCHING_ABIS`, then verify embedded Unity, direct PING/PONG, lifecycle, and ARCore camera on the physical device.

## Changed
- `mobile/rn/android/gradle.properties` — set `reactNativeArchitectures=armeabi-v7a` to match the connected device.
- `mobile/unity/ProjectSettings/ProjectSettings.asset` — set Android target architecture to ARMv7 through the live Unity Editor API and read back `ARMv7` / raw value `1`.
- `mobile/unity/ProjectSettings/EditorBuildSettings.asset` — added `Assets/Scenes/ARScene.unity` as an enabled Android build scene through the Unity build API.
- `docs/unity_ar/blockers/2026-08-13-lg-k42-android-device-gate.md` — recorded the incompatible/unsupported physical-device gate.

## ABI evidence
- Device: `armeabi-v7a`; ABI list `armeabi-v7a,armeabi`.
- RN before correction: `arm64-v8a`.
- Unity export: only `arm64-v8a` JNI libraries.
- Final APK: only `lib/arm64-v8a/*.so`.
- Root cause: a 32-bit-only Android userspace was used with an arm64-only RN + Unity APK.
- Exact install result: `INSTALL_FAILED_NO_MATCHING_ABIS`, `res=-113`.

## Unity export and bridge inspection
- Current export: `mobile/unity/Builds/Android/unityLibrary`.
- Export freshness: `CURRENT UNITY EXPORT STALE`; source/scene changes are newer than exported Player data.
- RN Gradle already includes `:unityLibrary`; the final host architecture is same-package Unity-as-a-Library Activity hosting.
- Active RN to Unity transport is file polling (`rn_to_unity_command`), despite a generated `UnityPlayer.UnitySendMessage` entry point.
- Android Unity to RN code currently logs but does not emit through React Native's event emitter.
- `UnityView.tsx` remains a placeholder and no acceptance-ready engineering screen exists.
- No file-polling cleanup or direct bridge implementation was claimed in this session.

## Verified
- ADB: connected `LMK420EUWG7DEQQ8KN` in `device` state.
- Device: LGE `LM-K420`, Android 11 / API 30.
- ABI diagnosis: pass; all four ABI facts were enumerated.
- APK inspection: pass; arm64 Unity and RN native libraries enumerated.
- Unity Editor: Unity 6000.3.20f1 was connected and initially compile-idle with no console errors.
- Unity PlayerSettings readback: ARMv7 after correction.
- Unity build scenes readback: `Assets/Scenes/ARScene.unity`, enabled.
- Physical install: fail with the expected ABI mismatch because the on-disk export/APK remained arm64.
- ARCore certification: fail for acceptance device; LG K42 / LM-K420 is absent from Google's certified-device list.

## Not Verified
- Fresh ARMv7 Unity export — scheduled job timed out/staled and did not update output.
- RN Gradle ARMv7 APK build — blocked by missing verified ARMv7 Unity export.
- APK install success.
- Unity rendering inside RN.
- `UNITY_READY`, direct PING/PONG, matching request IDs, or duplicate-listener behavior.
- Background/resume, close/reopen lifecycle.
- ARCore loader configuration, real camera feed, or `AR_READY`.
- `CODE_VERIFIED`, `EMBEDDED_RUNTIME_VERIFIED`, and `ANDROID_DEVICE_VERIFIED` were not reached.

## Specs touched
- None. The approved architecture and acceptance gates were not changed.

## Blockers raised
- `docs/unity_ar/blockers/2026-08-13-lg-k42-android-device-gate.md` — current handset is 32-bit-only and not an ARCore-certified acceptance device.

## Next
- Connect an ADB-authorized, ARCore-certified ARM64 Android device; restore the development pipeline to ARM64 for that device, then implement and verify the direct in-process bridge before the ARBootstrap camera gate.
