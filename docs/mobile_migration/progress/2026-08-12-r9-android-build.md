# R9 — Android EAS Build Configuration

## Session
2026-08-12 22:47, agent: Cursor, branch: MindAR-Update

## Goal
Add reproducible Android build profiles for the Expo React Native app, including an installable preview APK and a production Play Store AAB.

## Changed
- `mobile/rn/eas.json` — added EAS CLI configuration, an internal `preview` Android APK profile, and an auto-incrementing `production` Android app-bundle profile.
- `mobile/rn/package.json` — added `build:android:preview` and `build:android:production` scripts.

## Verified
- `npx eas-cli --version` — passed; EAS CLI `21.7.1` available.
- `npx expo config --type public` — passed; Expo reports Android as a configured platform and preserves package `com.anonymous.rn`.
- `npx expo install --check` — passed; dependencies are aligned with Expo SDK `54`.
- `ReadLints` for `mobile/rn/package.json` and `mobile/rn/eas.json` — no linter errors.

## Not Verified
- Remote EAS build was not started because it requires Expo account authentication and Android signing credentials.
- APK installation and runtime GLB rendering on Android device/emulator remain unverified.
- Production AAB upload to Google Play remains unverified.

## Specs touched
None.

## Blockers raised
None. The first build requires `eas login` or an authenticated `EXPO_TOKEN`, followed by Android signing credential setup when prompted.

## Next
From `mobile/rn/`:

```bash
npm run build:android:preview
npm run build:android:production
```

Use the preview APK for emulator/physical-device validation. Use the production AAB for Google Play internal testing.

## Local Android Device Attempt
- `npx expo run:android --variant release` — failed before native compilation.
- The Android SDK was not found at `C:\Users\LENOVO\AppData\Local\Android\Sdk`, `ANDROID_HOME` is not configured for this terminal, and `adb` is unavailable on `PATH`.
- Consequently, the connected LG K42 could not be detected, built to, or installed on during this session.

### Required environment repair
1. Install Android Studio with Android SDK Platform-Tools, Android SDK Build-Tools, and an Android platform matching the Expo SDK's supported compile SDK.
2. Set `ANDROID_HOME` to the installed SDK directory and add `%ANDROID_HOME%\platform-tools` to `PATH`.
3. Reopen the terminal, run `adb devices -l`, and authorize USB debugging on the LG K42 when prompted.
4. Re-run `npx expo run:android --variant release` from `mobile/rn/`.
