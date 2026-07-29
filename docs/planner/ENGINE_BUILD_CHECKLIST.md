# AR Food Education App — Engine Build Checklist

**Date:** 2026-07-25 · **Day:** 1 of 22 · **Target:** Local iOS demo only
**Workspace:** `e:\University\Graduted Project\Edu-platform`

---

## 1. Executive Summary

This plan delivers a **7-day working engine** (RN ↔ Unity ↔ ARKit) plus a **15-day polish + iOS-build path** for a 22-working-day graduation project. The engine is the *minimum viable vertical slice* — elephant model + jungle scene spawn on detected image, audio plays, RN overlay shows word + translation, gestures work — proven on-device in the Windows editor *and* on a real iPhone before the single Mac day. **We do not** rebuild code we already have; we fix the 6 C# scripts that need Unity 6 / ARFoundation 6.x patches, create the 3 missing components Unity references but cannot find (`GLBLoader.cs`, `ModelSpawner.cs`, `AnimationController.cs`), write the missing iOS Swift bridge + RN TurboModule glue, and harden the message contract so the demo cannot crash mid-defense. The plan is **actionable end-to-end** — every task lists the exact file, the exact fix, and the exact deliverable.

---

## 2. User Inputs Required (BLOCKERS)

Fill these in **today (Day 1)** before any code is touched. The plan assumes them; if any are wrong, several tasks shift.

| # | Question | Why we need it | Default if unanswered |
|---|----------|---------------|----------------------|
| **U-1** | **Web API base URL** (HTTPS) — e.g. `https://edu-platform.example.com` | All `services/api.ts` requests and GLB/audio URLs come from here | `https://localhost:3000` (demo will fail) |
| **U-2** | **Auth: skip or real?** JWT in AsyncStorage, or skip login screen? | `useAuth.ts` + `AuthScreen.tsx` already exist | **Skip auth** (demo mode) — fastest path |
| **U-3** | **Tracking mode: image-tracking or plane-tap-to-place?** | Affects which C# scripts are real vs. stub | **Image-tracking** (uses existing `RuntimeImageTrackingPOC.cs` + elephant printed target) |
| **U-4** | **Elephant model + jungle scene: where on disk?** Full path to `.fbx` / `.glb` / `.unity` scene | `ModelSpawner.cs` needs the prefab reference; `POCBootstrap.cs` needs scene name | Assume `mobile/unity/Assets/Models/Elephant/Elephant.prefab` |
| **U-5** | **Audio file for elephant** + an audio file URL accessible from API? | `ARAudioPlayer.cs` downloads via `UnityWebRequest` | Hardcode `https://example.com/elephant.mp3` for Day 3 test |
| **U-6** | **Apple ID for Mac-day signing** — free dev account, team ID, device UDID | Final `.ipa` install + run on iPhone | Required by Day 20 — block Mac day if missing |
| **U-7** | **Demo lesson content** — list of 3–5 flashcards (word, translation, model, audio, image target) | `ARExperienceMapper.ts` and `services/api.ts` consume these | Use placeholder content; demo just needs 1 card to work |
| **U-8** | **iPhone model + iOS version** for the demo device? (e.g. iPhone 12, iOS 17) | ARKit feature availability (image tracking works on A12+) | Any iPhone 11+ with iOS 15+ works |
| **U-9** | **Print the elephant image target on paper** before Day 7 testing? | Camera must see the printed image for tracking | **Yes — required by Day 6** |
| **U-10** | **Demo day date** + presentation slides/poster requirements? | Drives "Demo Day Checklist" timeline | Assume 22 working days from today → ~Aug 22, 2026 |

---

## 3. Daily Breakdown — 7-Day Engine Sprint

> Each day has a single, verifiable deliverable. The "Verify" step is non-negotiable; if it fails, you do not advance.

### Day 1 (Sat Jul 25) — Foundation Audit & Inputs

**Goal:** Stop guessing. Inventory the actual repo state. Capture inputs U-1…U-10. Free fixes that cost zero.

| # | Task | File / Tool | Est. | Output |
|---|------|------------|------|--------|
| 1.1 | Run `git status` + capture exact commit hash | `git` | 5 min | Baseline commit |
| 1.2 | Read `docs/superpowers/plans/2026-07-23-unity-rn-mobile-ar-migration-plan.md` end-to-end | file | 10 min | Context loaded |
| 1.3 | Confirm Unity **6.x (6000.3.20f1)** is installed locally; if not, install via Unity Hub (background, ~2 GB) | Unity Hub | 0 min (passive) | Unity ready |
| 1.4 | Confirm `mobile/unity/Packages/manifest.json` matches ARFoundation 6.x requirements (✅ already on `6.3.5`) | `manifest.json` | 2 min | Confirmed |
| 1.5 | **Get U-1…U-10 answers** from the user (this document's §2) | user | 30 min | Filled table |
| 1.6 | Create `./docs/engine-build-log.md` for daily diary (commit at end of each day) | new file | 5 min | Diary file |
| 1.7 | Decide **single tracking mode** (image-tracking vs plane-tap) — write decision in diary | diary | 5 min | Decision recorded |

**Verify:** `git status` clean; inputs table complete; Unity Hub shows 6000.3.20f1. **Commit diary.**

---

### Day 2 (Mon Jul 27) — Fix Unity 6.x / ARFoundation 6.x API Patches

**Goal:** Update the 6 C# scripts that reference obsolete AF5 APIs. Make the project compile in Unity Editor on Windows.

| # | Task | File | Est. | Specific Fix |
|---|------|------|------|--------------|
| 2.1 | Patch `RuntimeImageTrackingPOC.cs` — already on AF6 API; verify `trackablesChanged.AddListener` signature | `Assets/AR/RuntimeImageTrackingPOC.cs` | 20 min | No change likely; verify lines 54-56 use `UnityAction<ARTrackablesChangedEventArgs<ARTrackedImage>>` |
| 2.2 | Patch `ARSessionManager.cs` — verify `FindFirstObjectByType<T>()` (already used ✅), check `args.removed` is now `KeyValuePairList` (line 105) | `Assets/AR/ARSessionManager.cs` | 15 min | Already on AF6 API ✅ — just verify |
| 2.3 | Patch `AnchorManager.cs` — already uses `TryAddAnchorAsync` and `TryRemoveAnchor` ✅ | `Assets/AR/AnchorManager.cs` | 10 min | Verify `TrackableType.PlaneWithinBounds` is still valid in AF 6.3.5 |
| 2.4 | Patch `PlaneDetection.cs` — already handles `HorizontalUp`/`HorizontalDown` split ✅ | `Assets/AR/PlaneDetection.cs` | 10 min | Verify `PlaneAlignment` enum has those two values in AF 6.3 |
| 2.5 | Patch `ARGestureHandler.cs` — uses legacy `EventSystems` interfaces; add `[SerializeField]` for `ARPlaneManager` if needed for hit-tests | `Assets/Gestures/ARGestureHandler.cs` | 30 min | Add null-safe pattern; consider swapping to `UnityEngine.InputSystem` if time permits |
| 2.6 | Patch `RNEventEmitter.cs` — verify `UnitySendMessage` still works for AF6 (it does ✅) | `Assets/Bridge/RNEventEmitter.cs` | 10 min | Verify line 45 `TARGET_OBJECT = "RNMessageReceiver"` matches the GameObject name in the scene |
| 2.7 | **Create missing `GLBLoader.cs`** (referenced by `ARExperienceHandler.cs` line 19, does not exist!) | `Assets/Models/GLBLoader.cs` (new) | 90 min | See §4.1 for full code |
| 2.8 | **Create missing `ModelSpawner.cs`** (referenced line 20, does not exist!) | `Assets/Models/ModelSpawner.cs` (new) | 60 min | See §4.2 |
| 2.9 | **Create missing `AnimationController.cs`** (referenced line 21, does not exist!) | `Assets/Models/AnimationController.cs` (new) | 60 min | See §4.3 |
| 2.10 | Open `Assets/Scenes/ARScene.unity` in Unity; ensure scripts compile (no red squiggles in Console) | Unity Editor | 30 min | Console clean |

**Verify:** Unity Editor → Console shows **zero errors**. Scripts auto-wire via `FindFirstObjectByType`. **Commit: `chore: unity-6.3.5 api compatibility + missing scripts`.**

---

### Day 3 (Tue Jul 28) — Build iOS-Ready Library on Windows

**Goal:** Produce a clean Unity → iOS Xcode export on Windows (just the project, no .ipa yet). Confirm `POCBuildScript.BuildIOS()` runs end-to-end without the editor crashing.

| # | Task | File / Tool | Est. | Output |
|---|------|------------|------|--------|
| 3.1 | Verify `POCBuildScript.cs` targets `iOS` with `IL2CPP` and `cameraUsageDescription` | `Assets/Editor/POCBuildScript.cs` | 5 min | ✅ already correct |
| 3.2 | Set `Player Settings → iOS → Other Settings → Architecture = ARM64` | Unity Editor | 5 min | Set |
| 3.3 | Set `Minimum iOS Version = 15.0` (or 16.0 if U-8 says iPhone X) | Unity Editor | 5 min | Set |
| 3.4 | Enable `XR Plug-in Management → iOS → ARKit` provider | Unity Editor | 5 min | Provider on |
| 3.5 | Run `POCBuildScript.BuildIOS` from menu; expect `build/ios/` Xcode project | Unity | 30 min | Xcode project generated |
| 3.6 | Zip `build/ios/` (typically 500 MB) → `build/ios-windows-prebuild.zip` (artifact, do **not** commit binary) | Windows | 10 min | Zip |
| 3.7 | Sanity-test RN app boots on Android emulator / Expo Go (skip iOS for now since Mac unavailable) | `npm run android` | 20 min | RN shell launches |

**Verify:** Xcode project exists; no build errors in Unity Console. **Commit: `chore: ios player settings + arkit provider`.**

---

### Day 4 (Wed Jul 29) — Swift Native Bridge (Code Complete on Windows)

**Goal:** Write the iOS Swift bridge + ObjC RN event emitter + RN TurboModule wrapper. **Do not compile** (Mac-only). Verify by static review.

| # | Task | File | Est. | Notes |
|---|------|------|------|-------|
| 4.1 | Write `RNMessageReceiverBridge.swift` — Swift class that bridges `UnitySendMessage` (in) ↔ RN `NativeEventEmitter` (out) | `mobile/unity/Assets/Plugins/iOS/RNMessageReceiverBridge.swift` (new) | 120 min | See §4.4 |
| 4.2 | Write `RNMessageReceiverBridge.h` — ObjC interface for Swift↔Unity interop | same folder, new | 15 min | Header exposing `- (void)sendToUnity:(NSString*)json` |
| 4.3 | Write `UnityBridge.podspec` | `mobile/rn/ios/LocalPods/UnityBridge/UnityBridge.podspec` (new) | 20 min | CocoaPods spec |
| 4.4 | Write `UnityBridgeModule.swift` (RN TurboModule) — exposes `initSession`, `loadARExperience`, `setPlaneDetection`, `pauseSession`, `resumeSession`, `destroySession` | same folder, new | 90 min | TurboModule spec |
| 4.5 | Write `UnityBridgeModule.m` — ObjC RCT_EXTERN_MODULE bridge | same folder, new | 15 min | Macro |
| 4.6 | Update `mobile/rn/ios/Podfile` to include the local pod | `mobile/rn/ios/Podfile` | 10 min | Add `pod 'UnityBridge', :path => './LocalPods/UnityBridge'` |
| 4.7 | Write `mobile/rn/src/bridge/UnityBridgeModule.ts` typed wrapper | new | 30 min | Already exists at `mobile/rn/src/bridge/UnityBridgeModule.ts` — **verify it matches Swift method signatures** |
| 4.8 | Update `mobile/rn/src/bridge/arMessages.ts` with the event payload types | new | 30 min | Already exists — **verify against §5 message contract** |

**Verify:** Static review — every Swift method has a matching RN TypeScript signature. Every C# event has a matching Swift → RN relay. **Commit: `feat: ios swift bridge + rn turbomodule wrappers`.**

---

### Day 5 (Thu Jul 30) — RN ↔ Unity Wire-Up + API Integration

**Goal:** Verify the RN shell calls UnityBridgeModule and reacts to events. Test on Android emulator (no Unity yet; module is stubbed).

| # | Task | File | Est. | Notes |
|---|------|------|------|-------|
| 5.1 | Verify `useARSession.ts` handles all events: `onArReady`, `onPlaneDetected`, `onImageDetected`, `onObjectPlaced`, `onInteraction`, `onError`, `onAudioComplete` | `mobile/rn/src/hooks/useARSession.ts` | 20 min | ✅ exists |
| 5.2 | Verify `ARExperienceMapper.ts` maps API → Unity payload | `mobile/rn/src/bridge/ARExperienceMapper.ts` | 20 min | ✅ exists |
| 5.3 | Add `getArExperience(qrId)` endpoint to `services/api.ts` | `mobile/rn/src/services/api.ts` | 30 min | Use U-1 base URL |
| 5.4 | Add `ARKitCameraPermission` config to `app.json` for iOS | `mobile/rn/app.json` | 10 min | `ios.infoPlist.NSCameraUsageDescription` |
| 5.5 | Stub `UnityBridgeModule.ts` on Android — return mock events so app is testable without Mac | `mobile/rn/src/bridge/UnityBridgeModule.ts` | 30 min | Platform check `Platform.OS === 'ios'` |
| 5.6 | Add `ARKitUsageDescription` to `Info.plist` placeholder (created by Expo prebuild) | `mobile/rn/ios/` | 10 min | Will regenerate on Mac |
| 5.7 | Wire `ARScreen.tsx` to call `useARSession().initSession()` on mount; show event log | `mobile/rn/src/screens/ARScreen.tsx` | 60 min | Already exists — verify it logs events |
| 5.8 | Add `__DEV__` console overlay that shows last 20 events received | `ARScreen.tsx` | 30 min | Debug aid for Day 7 |

**Verify:** `npm run android` boots; `ARScreen` shows mock events from stub. **Commit: `feat: rn ar session wiring + api stub`.**

---

### Day 6 (Fri Jul 31) — Pre-Mac Stress Test (Windows-only)

**Goal:** Catch every Windows-fixable bug before the 24-hour Mac window. No more Unity C# changes after this day.

| # | Task | Tool / Method | Est. | Output |
|---|------|--------------|------|--------|
| 6.1 | Static analysis pass on all C#: run grep for `Object.FindObjectOfType` (deprecated in U6) → should be `FindFirstObjectByType` everywhere | `rg "FindObjectOfType" mobile/unity/Assets/` | 15 min | Migration patch if any |
| 6.2 | Static analysis: grep for `trackedImagesChanged` (AF5 obsolete) → should be `trackablesChanged` | `rg "trackedImagesChanged" mobile/unity/Assets/` | 10 min | Migration patch if any |
| 6.3 | Static analysis: grep for `maxNumberOfTrackedImages` (removed in AF6) | `rg "maxNumberOfTrackedImages" mobile/unity/Assets/` | 10 min | Comment already exists at line 149 ✅ |
| 6.4 | Test RN app end-to-end on Android emulator with API stub (skip auth, simulate QR scan, verify all overlays render) | Expo / Android | 90 min | All RN flows verified |
| 6.5 | Print the elephant image target on paper (U-9) and laminate it | physical | 10 min | Printout ready for Day 7 |
| 6.6 | Document known issues + open questions in `docs/engine-build-log.md` | diary | 15 min | Issues logged |

**Verify:** Grep outputs show no deprecated API references; Android demo runs the full flow; printout is high-contrast B/W. **Commit: `chore: pre-mac stress test fixes`.**

---

### Day 7 (Sat Aug 1) — Engine Cut-Over: Windows → Mac Prep

**Goal:** Final code freeze. Bundle everything the Mac needs onto a USB stick + cloud upload. Review checklist with the user.

| # | Task | Tool | Est. | Output |
|---|------|------|------|--------|
| 7.1 | Git tag: `git tag -a v0.7-engine -m "Engine ready for Mac build"` | `git` | 5 min | Tag |
| 7.2 | Run `expo prebuild --platform ios --no-install` on Windows to generate the iOS native projects | `npx` | 30 min | `mobile/rn/ios/` populated |
| 7.3 | Verify the generated Xcode project opens (look at `mobile/rn/ios/*.xcodeproj` on disk) | `ls` | 5 min | Confirmed |
| 7.4 | Copy `mobile/unity/Assets/` (C# + scenes) onto USB stick for Mac | USB | 10 min | USB stick ready |
| 7.5 | Upload `mobile/` repo as ZIP to cloud (Drive/iCloud) as backup | cloud | 10 min | Cloud backup |
| 7.6 | Write `mobile/MAC-DAY-RUNBOOK.md` (1 page, copy-paste-able for Mac) | new file | 30 min | See §6 |
| 7.7 | Review §6 Mac Day Schedule with user; confirm timing (start time, breaks, end time) | meeting | 30 min | User-confirmed schedule |

**Verify:** USB stick has: `mobile/unity/Assets/`, `mobile/MAC-DAY-RUNBOOK.md`, elephant printout. **Commit: `chore: engine v0.7 tag + mac runbook`.**

**🎯 END OF 7-DAY ENGINE SPRINT.** From here on, polish + Mac build.

---

### Days 8–13 (Mon Aug 3 – Sat Aug 8) — Polish & Demo Prep

Per-day detail is beyond engine scope, but the priorities are:

- **Day 8–9:** Mac day execution (see §6 for schedule)
- **Day 10:** First device run on iPhone; log all bugs
- **Day 11–12:** Bug fixes (Windows → Mac rebuild cycle, ~4-hour Mac borrow for each fix pass)
- **Day 13:** Second device run; sign off on demo flow

### Days 14–21 (Mon Aug 10 – Mon Aug 17) — Demo Hardening

- **Day 14–15:** Polish RN overlay UI (claymorphic styling already exists in `mobile/rn/src/components/`)
- **Day 16:** Offline mode — bundle one GLB + one audio into the app so demo works without Wi-Fi
- **Day 17:** Rehearsal demo (3 takes, recorded)
- **Day 18:** Final bug fix pass
- **Day 19–20:** Buffer days / poster / slides
- **Day 21:** Demo day

---

## 4. Critical Files to Fix (Full Code for Missing/Stub Scripts)

> The repo is **missing 3 scripts** that `ARExperienceHandler.cs` references by name (`glbLoader`, `modelSpawner`, `animationController`). Without these, Unity will throw `MissingComponentException` on first scene load. **These are the highest-priority code.**

### 4.1 `Assets/Models/GLBLoader.cs` (NEW — Day 2 task)

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace EduAR.Models
{
    /// <summary>
    /// Downloads a .glb from URL, caches to Application.temporaryCachePath,
    /// and loads via Unity's built-in GLB importer (Unity 2022+ has GLTFast-style
    /// support via UnityEditor.GLTF, but for runtime we use AssetBundles or
    /// a simple primitive fallback).
    ///
    /// MVP: Use a placeholder primitive mesh (cube/sphere) if GLB fails.
    /// v1.1: Replace with GLTFast (com.atteneder.gltfast) package.
    /// </summary>
    public class GLBLoader : MonoBehaviour
    {
        [SerializeField] private string cacheSubfolder = "glb_cache";

        private readonly Dictionary<string, GameObject> _cache = new();
        private string _pendingUrl;
        private bool _cancelRequested;

        public async Task<GameObject> LoadGLB(string url)
        {
            if (string.IsNullOrEmpty(url))
            {
                UnityEngine.Debug.LogWarning("[GLBLoader] Empty URL, returning placeholder.");
                return CreatePlaceholder("missing-url");
            }

            if (_cache.TryGetValue(url, out var cached) && cached != null)
            {
                return cached;
            }

            _cancelRequested = false;
            _pendingUrl = url;

            try
            {
                var localPath = await DownloadToCache(url);
                if (_cancelRequested || string.IsNullOrEmpty(localPath))
                {
                    return CreatePlaceholder(Path.GetFileName(url));
                }

                // MVP: For demo day, we don't actually parse the GLB at runtime.
                // Instead, instantiate the elephant prefab from the scene if the URL contains "elephant".
                // Otherwise, return a labeled primitive so the demo is visible.
                GameObject loaded;
                if (url.Contains("elephant", StringComparison.OrdinalIgnoreCase))
                {
                    var prefab = Resources.Load<GameObject>("Elephant");
                    loaded = prefab != null
                        ? Instantiate(prefab)
                        : CreatePlaceholder("Elephant");
                }
                else
                {
                    loaded = CreatePlaceholder(Path.GetFileNameWithoutExtension(url));
                }

                _cache[url] = loaded;
                DontDestroyOnLoad(loaded);
                loaded.SetActive(false);
                return loaded;
            }
            catch (Exception ex)
            {
                UnityEngine.Debug.LogError($"[GLBLoader] Failed: {ex.Message}");
                return CreatePlaceholder(Path.GetFileName(url));
            }
        }

        public void CancelLoad()
        {
            _cancelRequested = true;
        }

        private async Task<string> DownloadToCache(string url)
        {
            var cacheDir = Path.Combine(Application.temporaryCachePath, cacheSubfolder);
            Directory.CreateDirectory(cacheDir);
            var fileName = Path.GetFileName(new Uri(url).LocalPath);
            if (string.IsNullOrEmpty(fileName)) fileName = "model.glb";
            var localPath = Path.Combine(cacheDir, fileName);

            if (File.Exists(localPath) && new FileInfo(localPath).Length > 0)
            {
                return localPath;
            }

            using var request = UnityWebRequest.Get(url);
            var op = request.SendWebRequest();
            while (!op.isDone)
            {
                if (_cancelRequested) { request.Abort(); return null; }
                await Task.Delay(50);
            }
            if (request.result != UnityWebRequest.Result.Success)
            {
                UnityEngine.Debug.LogWarning($"[GLBLoader] Download failed: {request.error}");
                return null;
            }
            File.WriteAllBytes(localPath, request.downloadHandler.data);
            return localPath;
        }

        private GameObject CreatePlaceholder(string name)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = $"Placeholder_{name}";
            go.transform.localScale = Vector3.one * 0.2f;
            var renderer = go.GetComponent<Renderer>();
            if (renderer != null)
            {
                var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"))
                          ?? new Material(Shader.Find("Standard"));
                mat.color = new Color(0.6f, 0.4f, 0.2f);
                renderer.material = mat;
            }
            return go;
        }
    }
}
```

### 4.2 `Assets/Models/ModelSpawner.cs` (NEW — Day 2 task)

```csharp
using System.Collections.Generic;
using UnityEngine;

namespace EduAR.Models
{
    /// <summary>
    /// Spawns a model prefab at a world position, applies rotation/scale,
    /// and tracks all spawned instances for later cleanup.
    /// </summary>
    public class ModelSpawner : MonoBehaviour
    {
        private readonly List<GameObject> _spawned = new();

        public GameObject Spawn(GameObject prefab, Vector3 position, Vector3 rotation, Vector3 scale)
        {
            if (prefab == null) return null;
            var instance = Instantiate(prefab, position, Quaternion.Euler(rotation));
            instance.transform.localScale = scale == Vector3.zero ? Vector3.one : scale;
            instance.SetActive(true);
            _spawned.Add(instance);
            return instance;
        }

        public void Clear()
        {
            foreach (var go in _spawned)
            {
                if (go != null) Destroy(go);
            }
            _spawned.Clear();
        }

        public void SetScale(Vector3 scale)
        {
            if (_spawned.Count == 0) return;
            _spawned[^1].transform.localScale = scale;
        }

        public void SetRotation(Vector3 rotation)
        {
            if (_spawned.Count == 0) return;
            _spawned[^1].transform.rotation = Quaternion.Euler(rotation);
        }
    }
}
```

### 4.3 `Assets/Models/AnimationController.cs` (NEW — Day 2 task)

```csharp
using System.Collections.Generic;
using UnityEngine;

namespace EduAR.Models
{
    /// <summary>
    /// Discovers animation clips on a spawned model and plays the requested one.
    /// MVP: synthetic animations (rotate / bounce / idle) applied via transform.
    /// Real implementation would use Animator + AnimationClip array.
    /// </summary>
    public class AnimationController : MonoBehaviour
    {
        public enum Mode { Idle, Rotate, Bounce }

        private Mode _mode = Mode.Idle;
        private GameObject _target;

        public void DiscoverClips()
        {
            // Find the most recently spawned model
            var spawner = FindFirstObjectByType<ModelSpawner>();
            if (spawner != null)
            {
                var spawnedField = spawner.GetType()
                    .GetField("_spawned", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                if (spawnedField?.GetValue(spawner) is List<GameObject> list && list.Count > 0)
                {
                    _target = list[^1];
                }
            }
        }

        public void PlayAnimation(string animationType)
        {
            _mode = animationType?.ToLowerInvariant() switch
            {
                "rotate" => Mode.Rotate,
                "bounce" => Mode.Bounce,
                _        => Mode.Idle,
            };
        }

        private void Update()
        {
            if (_target == null) return;
            switch (_mode)
            {
                case Mode.Rotate:
                    _target.transform.Rotate(Vector3.up, 30f * Time.deltaTime);
                    break;
                case Mode.Bounce:
                    var p = _target.transform.position;
                    p.y += Mathf.Sin(Time.time * 2f) * 0.005f;
                    _target.transform.position = p;
                    break;
                case Mode.Idle:
                default:
                    break;
            }
        }
    }
}
```

### 4.4 `Assets/Plugins/iOS/RNMessageReceiverBridge.swift` (NEW — Day 4 task)

```swift
import Foundation
import UnityFramework

@objc(RNMessageReceiverBridge)
public class RNMessageReceiverBridge: NSObject {

    @objc public static let shared = RNMessageReceiverBridge()

    private var unityFramework: UnityFramework?

    // MARK: - RN → Unity

    @objc public func sendToUnity(_ json: String) {
        guard let fw = unityFramework else { return }
        fw.sendMessageToGO(withName: "RNMessageReceiver",
                           functionName: "OnMessageFromRN",
                           message: json)
    }

    // MARK: - Unity → RN (called from UnitySendMessage target)

    @objc public func onNativeEvent(_ message: String) {
        guard let data = message.data(using: .utf8) else { return }
        // message format: "eventName|jsonPayload"
        guard let pipeIdx = message.firstIndex(of: "|") else { return }
        let eventName = String(message[..<pipeIdx])
        let payload = String(message[message.index(after: pipeIdx)...])

        NotificationCenter.default.post(
            name: Notification.Name("UnityToRN_\(eventName)"),
            object: nil,
            userInfo: ["payload": payload]
        )
    }

    // MARK: - Unity lifecycle

    @objc public func startUnity() {
        guard unityFramework == nil else { return }
        let path = Bundle.main.bundlePath
        unityFramework = UnityFramework.load(path)
        unityFramework?.setDataBundleId("com.eduplatform.ar")
        unityFramework?.run(withEntrypoint: "",
                            argc: CommandLine.argc,
                            argv: CommandLine.unsafeArgv,
                            launchOptions: nil)
    }

    @objc public func pauseUnity() {
        unityFramework?.pause(true)
    }

    @objc public func resumeUnity() {
        unityFramework?.pause(false)
    }

    @objc public func unloadUnity() {
        unityFramework?.unloadApplication()
        unityFramework = nil
    }
}
```

> The ObjC `RNMessageReceiverBridge.m` (1 file, ~10 lines) wraps this for UnitySendMessage to call. The `UnityBridgeModule.swift` TurboModule exposes the same APIs to RN via `RCT_EXTERN_MODULE`. Both are stubbed on Windows — compiled on Mac Day 8.

---

## 5. RN ↔ Unity Message Contract (Authoritative)

### 5.1 RN → Unity (`UnityBridgeModule.<method>` → Swift → `RNMessageReceiverBridge.sendToUnity` → `RNMessageReceiver.OnMessageFromRN`)

| Method | Payload (JSON string after the `\|`) | Effect |
|--------|---------------------------------------|--------|
| `initSession` | none | Starts AR session; Unity emits `onArReady` when ready |
| `loadARExperience` | `{qrId, word, translationVi, audioUrl, modelUrl, animationType, glbSize, position:"0 0 0", rotation:"0 0 0", scale:"1 1 1"}` | Sets current payload, starts tracking |
| `startImageTracking` | none | Begins tracking from `RuntimeImageTrackingPOC` library |
| `setPlaneDetection` | `{enabled: true}` | Enable/disable plane visualization |
| `pauseSession` | none | Pause AR |
| `resumeSession` | none | Resume AR |
| `destroySession` | none | Tear down all spawned models and stop AR |
| `triggerCombo` | `{cardA, cardB}` | Trigger a hardcoded combo |

### 5.2 Unity → RN (events emitted via `RNEventEmitter.SendEvent` → `UnitySendMessage("RNMessageReceiver","OnNativeEvent", "name|json")` → `RNMessageReceiverBridge.onNativeEvent` → `NotificationCenter` → `NativeEventEmitter`)

| Event | Payload (after the `\|`) | When |
|-------|--------------------------|------|
| `onArReady` | `{version:"1.0"}` | Session initialized |
| `onImageDetected` | `{imageId, imageName, transform:{x,y,z}}` | Image tracker fires |
| `onImageTrackingLost` | `{imageId}` | Tracking lost |
| `onPlaneDetected` | `{planeId, bounds:{x,y}}` | First horizontal plane |
| `onObjectPlaced` | `{qrId, worldX, worldY, worldZ}` | Anchor + model placed |
| `onInteraction` | `{type:"tap\|rotate\|pinch\|double_tap", qrId}` | Gesture |
| `onAudioComplete` | `{url}` | Audio finished |
| `onModelLoaded` | `{modelUrl, modelName}` | GLB ready |
| `onFoodFed` | `{foodModelId, xpAwarded, streakCount}` | Food hits pet proximity |
| `onPetStateChanged` | `{state:"idle\|anticipating\|eating\|satisfied"}` | Pet state machine |
| `onComboTriggered` | `{cardIdA, cardIdB, comboId}` | Combo started |
| `onComboComplete` | `{rewardCardId, xpAwarded}` | Combo reward spawned |
| `onError` | `{code, message}` | Any error |

---

## 6. Mac Day Schedule (8 Working Hours)

> Single Mac day is **the** risk. Below is the exact minute-by-minute runbook. Save as `mobile/MAC-DAY-RUNBOOK.md` on Day 7.

### Block 0 — Setup (08:00–08:30, 30 min)
1. Pull latest repo: `git clone <repo-url>` or `git pull`
2. Open `mobile/unity/` in **Unity 6000.3.20f1** (Unity Hub → Open)
3. Wait for package import (~5 min)
4. **Confirm Console is error-free.** If red squiggles appear, STOP — fix on Windows next day.

### Block 1 — Unity → Xcode Export (08:30–10:00, 90 min)
1. `Edit → Project Settings → Player → iOS → Other Settings → Architecture = ARM64` ✅
2. `Edit → Project Settings → Player → iOS → Minimum iOS Version = 15.0` ✅
3. `Window → Package Manager → XR Plug-in Management → iOS tab → ARKit ✅`
4. `File → Build Settings → iOS → Switch Platform` (wait ~10 min)
5. `Build → name = EduAR → path = build/ios`. **Wait — this generates the Xcode project, ~30 min.**
6. Open `build/ios/Unity-iPhone.xcworkspace` in Xcode

### Block 2 — RN Pod Install + Bridge Integration (10:00–11:30, 90 min)
1. `cd mobile/rn && npm install` (5 min)
2. `cd mobile/rn && npx expo prebuild --platform ios --clean` (10 min) → generates `mobile/rn/ios/`
3. `cd mobile/rn/ios && pod install` (5 min) — verify `UnityBridge` pod resolves
4. **If pod install fails on `UnityFramework`:** zip `mobile/unity/build/ios/Classes/UI/UnityFramework.xcframework` and add it as a local pod in the Podfile
5. Open `mobile/rn/ios/<app>.xcworkspace` in Xcode
6. Set **Signing & Capabilities → Team** = Apple ID dev account (U-6)
7. Edit `Info.plist`: add `NSCameraUsageDescription = "AR food education requires camera access."`

### Block 3 — First Build to Device (11:30–13:00, 90 min) — **includes lunch break**
1. Plug iPhone into Mac via USB. Trust the computer on iPhone.
2. Xcode → select iPhone as target → click Run (▶). **First build takes 10–15 min.**
3. **If build fails:** read the error, fix on the spot if obvious (typo, missing file), else revert to Windows fix.
4. App installs on iPhone. **Lunch while it builds.**
5. After install, open the app → grant camera permission → AR session should initialize.

### Block 4 — On-Device Smoke Test (13:00–14:00, 60 min)
1. Launch app → tap "Start AR" → verify `onArReady` event in Xcode console
2. Point camera at the printed elephant image (U-9) → verify `onImageDetected` fires
3. Verify elephant model appears, rotates
4. Verify audio plays
5. Verify RN overlay shows the word + translation
6. **If any step fails:** screenshot, log to `docs/engine-build-log.md`, mark for next-day fix

### Block 5 — Archive + IPA Export (14:00–15:30, 90 min)
1. Xcode → Product → Archive (wait ~5 min)
2. Window → Organizer → Distribute App → Development → Export
3. Save `.ipa` to USB stick
4. Verify `.ipa` installable via Xcode → Devices → "+" → drag-drop

### Block 6 — Demo Run-through + Documentation (15:30–16:30, 60 min)
1. Disconnect iPhone, run demo flow end-to-end on battery (no USB)
2. Note any instability → log to `docs/engine-build-log.md`
3. Copy `build/EduAR.ipa` + `docs/engine-build-log.md` to USB stick
4. Eject, backup to cloud

**Total: 8 hours.** If Block 4 reveals major issues, the rest of the day is **debugging only** — not polish.

---

## 7. Fast-Track Shortcuts (Time Savers)

| # | Shortcut | Risk | Saves |
|---|----------|------|-------|
| **F-1** | **Skip real GLB parsing** — instantiate `Elephant.prefab` from `Resources/` instead of downloading | Low for demo (one model) | 1 day of GLTFast integration |
| **F-2** | **Skip `startImageTracking` flow** — `loadARExperience` alone is enough if ARScene has runtime image lib pre-loaded | Low | 1 day of `CreateRuntimeLibrary` work |
| **F-3** | **Skip auth entirely** — `AuthScreen` is bypassed via `__DEV__` flag | Zero for demo (no real users) | 4 hours |
| **F-4** | **Skip Android branch in Swift bridge** — Android branch is `UNITY_ANDROID`-guarded; safe to no-op | Zero (iOS-only) | 2 hours |
| **F-5** | **Use `UnityEngine.JsonUtility` everywhere** (already used) — no Newtonsoft.Json dependency | Zero | 1 hour |
| **F-6** | **Hardcode 1 demo lesson** in `services/api.ts` as a fallback when API is unreachable | Low (demo only) | 1 day of API contract work |
| **F-7** | **Skip offline GLB cache** in `glbCache.ts` for v1 — fetch every time | Low (Wi-Fi at demo) | 4 hours |
| **F-8** | **Skip combo system** in `ComboManager.cs` for demo (still keep the file, don't trigger) | Low (combo not in demo script) | 1 day |
| **F-9** | **Skip pet food drag interaction** (`FoodInteraction.cs` + `PetController.cs`) — focus on elephant only | Medium (kills one feature) | 2 days |
| **F-10** | **Use `expo prebuild` instead of bare RN init** — saves Xcode project setup time | Low | 4 hours |
| **F-11** | **Replace TurboModule with legacy NativeModule** — simpler on Mac build day, no codegen | Low | 1 day |

> **Recommendation:** Apply F-1, F-3, F-4, F-6, F-7, F-10. Skip F-2, F-9, F-11. Conditional on U-3.

---

## 8. Risks & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| **R-1** | **Mac day runs out before `.ipa` is built** | Medium | Critical (no demo) | Pre-build Xcode project on Windows (Day 3); bring Unity project on USB + cloud backup; have a known-good iPhone app ID pre-registered on Apple Developer portal |
| **R-2** | **`CreateRuntimeLibrary()` fails on device** (ARKit provider doesn't support mutable library) | Medium | High (no tracking) | F-2 shortcut: pre-bake image lib at build time; keep POC path tested Day 7 |
| **R-3** | **GLBLoader can't find `Resources/Elephant`** | Medium | High (no model) | Day 4 task: create `Assets/Resources/Elephant.prefab` (cube primitive) as guaranteed fallback |
| **R-4** | **Swift bridge ObjC `UnitySendMessage` signature mismatch** | High | Critical (no events) | Use the *exact* `UnitySendMessage(GameObject, Method, Msg)` call from `RNEventEmitter.cs` line 45 → verify Swift method name matches `OnNativeEvent` |
| **R-5** | **CocoaPods fails to install `UnityBridge` pod due to Swift version mismatch** | Medium | High (Mac only) | Add `s.swift_version = "5.0"` to `UnityBridge.podspec`; have `pod install --repo-update` fallback ready |
| **R-6** | **iOS signing fails** (no provisioning profile, wrong team ID) | Medium | Critical | U-6 input required by Day 15; verify Apple ID works in Xcode → Settings → Accounts on Mac Day Block 0 |
| **R-7** | **Image target not recognized** (wrong size, low contrast) | High | Medium | Print target at ≥10cm physical width; use the official ARKit reference image (the `QRCode.png` URL already in `RuntimeImageTrackingPOC.cs` line 26); measure and set `physicalWidthMeters = 0.1f` accurately |
| **R-8** | **AR session crashes on launch** (camera permission denied) | Medium | High | Test permission flow Day 10; have a "permission denied" screen in RN that explains how to enable in Settings |
| **R-9** | **Demo iPhone not available / dead battery** | Low | Critical | Bring 2 devices if possible; have laptop with iPhone-as-tethered-device option via Xcode 15+ |
| **R-10** | **API URL is wrong** (U-1 wrong or CORS-blocked) | Medium | High (no data) | F-6 fallback (hardcoded lesson); verify URL responds from mobile-network Day 10 |

---

## 9. Demo Day Checklist

**Print this checklist. Tick items 24h before defense.**

### Pre-Demo (T-24h)

- [ ] iPhone charged to 100%
- [ ] iPhone has the `.ipa` installed and launches in <3 seconds
- [ ] Printed elephant image target is in good condition (no folds, high contrast)
- [ ] Wi-Fi hotspot ready (mobile data fallback if venue Wi-Fi blocks ports)
- [ ] Demo lesson content confirmed in API (U-7)
- [ ] Backup `.ipa` on USB stick
- [ ] Backup laptop with `.ipa` loaded
- [ ] Demo script printed (5-minute talking points)

### Pre-Demo (T-1h)

- [ ] Test the entire flow once, on battery, on the demo iPhone
- [ ] Restart the app to clear any leaked AR session state
- [ ] Grant camera permission (so the prompt doesn't appear live)
- [ ] Volume at 70% (audio plays)
- [ ] iPhone in landscape? portrait? — decide and lock orientation
- [ ] Have a printed fallback QR code (in case camera struggles with the live image)

### During Demo

- [ ] Open app → Home screen loads (5 sec)
- [ ] Tap lesson → AR session starts (3 sec)
- [ ] Camera permission already granted
- [ ] Point at image → tracking fires (2 sec)
- [ ] Elephant appears + rotates (1 sec)
- [ ] Audio plays the word (2 sec)
- [ ] RN overlay shows word + Vietnamese translation (instant)
- [ ] Tap elephant → interaction event (1 sec)
- [ ] **If anything fails:** have a screen recording of a successful run as fallback

### Post-Demo

- [ ] Backup all logs from Xcode console
- [ ] Note any questions the committee asked → these are improvements for v2

---

## 10. Definition of Done — Engine v1 Milestone

- [ ] **Code:** All 6 patched C# scripts compile clean; 3 new scripts (`GLBLoader`, `ModelSpawner`, `AnimationController`) exist and are referenced
- [ ] **Bridge:** Swift bridge + ObjC glue + RN TurboModule written and statically reviewed; message contract matches §5
- [ ] **RN:** All `mobile/rn/src/` files compile; `ARScreen` boots and shows mock events on Android
- [ ] **iOS:** `.ipa` builds, installs, and launches on the demo iPhone
- [ ] **AR:** Camera → image detection → model spawn → animation + audio → RN overlay all work on-device
- [ ] **Demo:** Full 30-second flow runs without crash
- [ ] **Docs:** `mobile/MAC-DAY-RUNBOOK.md` exists; `docs/engine-build-log.md` has 7 days of entries

---

## 11. Open Questions / Out of Scope (v2)

These are intentionally deferred:

- **OOS-1:** Combo system (`ComboManager.cs`) — coded but not triggered in demo flow
- **OOS-2:** Pet + food drag interaction (`PetController.cs`, `FoodInteraction.cs`) — out of scope per F-9
- **OOS-3:** Plane detection UI (`PlaneDetection.cs`) — used internally; plane visualization skipped for clarity
- **OOS-4:** Real GLB parsing via GLTFast — placeholder elephant primitive for v1
- **OOS-5:** Android build (`UNITY_ANDROID` branch in `RNEventEmitter.cs` is compiled out)
- **OOS-6:** Auth — bypassed per F-3
- **OOS-7:** Offline cache (`glbCache.ts`) — skipped per F-7
- **OOS-8:** Xcode Cloud / Codemagic CI — out of scope, Mac day is manual

---

## 12. References

- Migration plan: `docs/superpowers/plans/2026-07-23-unity-rn-mobile-ar-migration-plan.md`
- Unity AR Foundation 6.3 docs: `https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@6.3`
- React Native + Swift TurboModule: `https://reactnative.dev/docs/the-new-architecture/pure-cxx-modules`
- Unity 6.0 + iOS bridge: `https://docs.unity3d.com/Manual/UnityasaLibrary-iOS.html`
- Expo SDK 57: `https://docs.expo.dev/versions/v57.0.0/`

---

**Plan version:** 1.0 · **Last updated:** 2026-07-25 · **Author:** Planner (SDLC orchestrator subagent)
