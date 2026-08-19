# Blocker: No ARCore-certified Android device available

## ID
`blocker-2026-08-13-android-device`

## Raised
2026-08-13 (updated 2026-08-18)

## Phase
M10 — Android E2E

## Severity
High

## Description

The APK `app-debug.apk` is built for `armeabi-v7a` (32-bit ARM) and IS compatible with LG K42 / LM-K420 (armeabi-v7a). The installation issue from 2026-08-13 (ABI mismatch) has been resolved.

**However**, ARCore (Google's AR runtime for Android) requires **arm64-v8a** architecture. LG K42 is also NOT on Google's ARCore certified device list.

This means:
- APK installs on LG K42 ✅
- AR features do NOT work (ARCore unavailable) ❌

To test native AR on Android, need:
1. `arm64-v8a` APK build
2. ARCore-certified device

## APK Architecture Evidence (2026-08-18)

```
$ unzip -l app-debug.apk | grep lib/armeabi
  lib/armeabi-v7a/libappmodules.so    ✅
  lib/armeabi-v7a/libgame.so          ✅ (Unity game library)
  ...
No arm64-v8a libs found in this APK.
```

## Solution

### Option 1: Build arm64-v8a APK + use certified device
```bash
# Change gradle.properties:
reactNativeArchitectures=arm64-v8a

# Rebuild, install on ARCore-certified device:
# Samsung Galaxy S10/S20/S21/S22, Google Pixel 4/5/6/7, OnePlus 8/9/10
```

### Option 2: Use Expo prebuild + Unity as Library for certified device
- `npx expo prebuild --platform android`
- Build APK with arm64-v8a
- Install on certified device

## Status
Open — needs ARCore-certified 64-bit Android device + arm64-v8a APK rebuild

## Impact
M10 cannot be verified until resolved. All M2–M9 code is complete.
