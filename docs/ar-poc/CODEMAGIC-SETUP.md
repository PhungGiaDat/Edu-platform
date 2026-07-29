# Runtime Image Tracking POC — Setup & Verification

This POC proves the **runtime image library** architecture (no `.mind` files, no build-time
reference libraries). It downloads a reference image at runtime, builds a
`MutableRuntimeReferenceImageLibrary`, tracks the printed image, and spawns a marker cube.

## What the POC proves (your 5 steps)

| Step | Where | Implemented |
|------|-------|-------------|
| 1. (QR → API → flashcard) | *deferred for POC* | Substituted by a hardcoded `imageUrl` |
| 2. Download image | `RuntimeImageTrackingPOC.DownloadImage` | ✅ `UnityWebRequestTexture` |
| 3. Create runtime library | `RuntimeImageTrackingPOC.Start` | ✅ `CreateRuntimeLibrary()` |
| 4. Add image to library | `RuntimeImageTrackingPOC.AddImageJob` | ✅ `ScheduleAddImageWithValidationJob` + `supportsMutableLibrary` guard |
| 5. Tracking success | `RuntimeImageTrackingPOC.OnTrackablesChanged` | ✅ marker cube on detection |

If the on-screen overlay reaches **"READY. Point the camera at the printed image."** and a cube
snaps onto the printout, ~80% of the architecture is proven.

## Files

- `mobile/unity/Assets/AR/RuntimeImageTrackingPOC.cs` — the POC logic (AR Foundation 6 managed pattern).
- `mobile/unity/Assets/AR/POCBootstrap.cs` — builds the AR rig in code (no scene/.meta needed).
- `mobile/unity/Assets/Editor/POCBuildScript.cs` — headless iOS build entry point for CI.
- `mobile/unity/Packages/manifest.json` — AR Foundation 6.0.7 + ARKit + XR deps.
- `codemagic.yaml` — Unity → iOS device IPA pipeline.

## Honest limitations — read before building

This repo's `mobile/unity/` is a **code scaffold, not a fully materialized Unity project**. Before
Codemagic can build it, the project must be opened **once in the Unity Editor** (6000.x) to generate:

1. **`.meta` files** for every asset (Unity creates these on first import; they are not in the repo).
2. **`ProjectSettings/`** — specifically **XR Plug-in Management** with the **ARKit provider enabled**
   for iOS. This cannot be created from Windows/CLI; it requires the Editor GUI (or a committed
   `ProjectSettings/` from a machine that has it).
3. **At least one scene in Build Settings**, or confirmation that the `RuntimeInitializeOnLoadMethod`
   bootstrap runs on an empty default scene. Add an empty scene to `EditorBuildSettings.scenes`.

**What I could verify from Windows:** the C# uses the correct AR Foundation 6 API surface
(`trackablesChanged`, `descriptor.supportsMutableLibrary`, `CreateRuntimeLibrary`,
`ScheduleAddImageWithValidationJob`, `AddReferenceImageJobState`). Package versions in the manifest
are consistent (AF 6.0.7 / ARKit 6.0.6 / core-utils).

**What I could NOT verify (needs the Editor / a Mac / a device):**
- That the project compiles in Unity 6000.x (no Editor on this Windows box).
- ARKit runtime behavior — **AR only runs on a real iOS device, never the simulator**.
- Code signing / provisioning against a real Apple Developer account.

## Codemagic setup checklist

1. **Connect the repo** in Codemagic and select the `unity-ios-poc` workflow.
2. **Unity license** — create an env group named `unity` with:
   - `UNITY_SERIAL`, `UNITY_USERNAME`, `UNITY_PASSWORD` (Personal license works).
3. **Fix the Unity version** in `codemagic.yaml` (`UNITY_BIN` path) to match the exact editor
   installed on the Codemagic machine (e.g. `6000.0.xxf1`). Check Codemagic's available Unity versions.
4. **Apple signing** — add the App Store Connect API key integration; put credentials in an
   env group named `appstore`. Register `com.eduplatform.arpoc` (or your bundle id) with a
   **development** provisioning profile tied to your test device UDID.
5. **Open the Unity project once** on any machine with the Editor, enable XR Plug-in Management →
   ARKit for iOS, add an empty scene to Build Settings, and commit `ProjectSettings/` + `.meta` files.
6. **Trigger a build.** Install the resulting IPA on your registered device.
7. **Print the reference image** (default is the arfoundation-samples QR image) and point the camera
   at it. Measure the printed width and set `physicalWidthMeters` on `RuntimeImageTrackingPOC` to match.

## If `supportsMutableLibrary` is false

The overlay will show it and stop. Both ARKit 14+ and ARCore support it, so on a modern iPhone this
should be `true`. If false, the device/provider is too old — that is exactly the risk the
`supportsMutableLibrary` guard exists to surface (per Unity's docs).
