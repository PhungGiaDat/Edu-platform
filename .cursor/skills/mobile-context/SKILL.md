---
name: mobile-context
description: Project-specific mobile stack context — React Native (Expo) + Unity ARFoundation + RN↔Unity bridge contract, MVP scope, and known limitations. Use when discussing mobile/, mobile/rn/, mobile/unity/, or anything about the AR education app's client architecture.
user-invocable: true
---

# Mobile Context — AR Education Platform

Project-specific context for `mobile/`. **Authoritative sources**: `mobile/README.md` (full architecture), `mobile/rn/README.md`, `mobile/unity/README.md`. This skill is the **compact pointer** — read those files only when this skill does not answer.

---

## 1. Stack at a glance

| Layer | Tech | Location | Role |
|---|---|---|---|
| RN UI | Expo ~57 + React Navigation (stack) | `mobile/rn/` | Auth, course nav, AR placeholder |
| Native bridge | Phase 1 placeholder (Phase 2 = Swift + `UnitySendMessage`) | `mobile/rn/src/bridge/` | RN ↔ Unity transport |
| AR runtime | Unity 2022.3 LTS / Unity 6 LTS + ARFoundation 6 + GLTFast | `mobile/unity/` | Plane detect, anchor, GLB, audio |
| Transport | `UnitySendMessage("RNMessageReceiver", "OnNativeEvent", msg)` (iOS) | Unity side `Assets/Bridge/` | RN→Unity and Unity→RN |

**Backend assumption**: `EXPO_PUBLIC_API_URL` (default `http://localhost:8000`). API endpoints `/api/v1/auth/login`, `/api/v1/courses/`, `/api/v1/courses/{id}/lessons/`, `/api/v1/flashcard/{qrId}`, `/api/v1/ar/config`. Auth = JWT in `expo-secure-store` (key `'jwt_token'`).

---

## 2. RN ↔ Unity bridge contract

**Message format** (both directions): `"eventName|{jsonPayload}"`

**RN → Unity** (handled by `RNMessageReceiver.cs`):
- `initSession` → `ARExperienceHandler.InitSession()`
- `loadARExperience|{...}` → `ARExperienceHandler.LoadARExperience(json)`
- `setPlaneDetection|{"enabled":true}` → `SetPlaneDetection(bool)`
- `pauseSession` / `resumeSession` / `destroySession`

**Unity → RN** (via `RNEventEmitter.cs` singleton, `Instance.SendEvent(...)`):
- `onArReady`, `onPlaneDetected`, `onObjectPlaced`, `onAudioComplete`, `onInteraction`, `onError`

**Event payload example** (`onObjectPlaced`):
```json
{ "anchorId": "...", "position": "0 0 -1.5", "modelUrl": "..." }
```

**RN side singleton**: `unityBridge` from `mobile/rn/src/bridge/UnityBridgeModule.ts`. Methods: `checkAvailability()`, `loadExperience(payload)`, `playAudio(url)`, `closeExperience()`, `subscribe(eventType, cb)`.

---

## 3. Unity AR pipeline (load → place → audio)

```
LoadARExperience(json)
  → ARPayloadMapper.Parse(json)         → ARExperiencePayload struct
  → PlaneDetection.SetEnabled(true)     → horizontal plane detection
  → (wait for onPlaneDetected)
  → HandleScreenTap(screenPos)
      → AnchorManager.TryPlaceAnchorAt()      // raycast → ARAnchor
      → GLBLoader.LoadGLB(url)                // GLTFast + cache in tempCachePath/GLBCache/
      → ModelSpawner.Spawn(transform)
      → AnimationController.PlayAnimation()   // rotate | bounce | idle
      → ARAudioPlayer.PlayAudio(url)          // UnityWebRequest.GetAudioClip
      → RNEventEmitter.SendEvent("onObjectPlaced", {...})
```

**ARFoundation 6 API choices** (project-wide):
- `FindFirstObjectByType<T>()` — NOT deprecated `FindObjectOfType<T>()`
- `ARSession.stateChanged` event — NOT polling `ARSession.State`
- `ARPlaneManager.planesChanged`, `ARAnchorManager.AddAnchor()`

---

## 4. MVP scope and known limitations

**In scope (Phase 1)**: JWT auth + SecureStore, course/lesson nav, placeholder AR view, GLB cache utility, all Unity scripts written and Unity-buildable.

**NOT in scope yet (Phase 2)**:
- **Real Swift ↔ Unity bridge** — `UnityBridgeModule.ts` is a Phase 1 simulator; Swift native module not written. Will need `npx expo prebuild`.
- **QR scanning** — `QRScanPrompt` and `expo-camera` wired but no detection logic.
- **No real 3D content** — ARScene.unity is skeleton; no GLB models loaded by default.
- **GLBLoader + ModelSpawner** — referenced in `mobile/README.md` flow but actual `.cs` files may not be present in current implementation log.
- **Android not targeted** — iOS / ARKit is MVP focus.
- **No logout UI** — `clearToken()` exists in `App.tsx` but no button rendered.

**When implementing mobile work**: assume iOS-only MVP, Phase 1 placeholder bridge. Do not propose Android paths unless asked. Do not assume Swift bridge exists.

---

## 5. When to load deeper context

Read these only when this skill does not answer:

| Need | Read |
|---|---|
| RN-side details (file layout, auth flow, API client patterns) | `mobile/rn/README.md` |
| Unity-side details (script responsibilities, iOS build, ARFoundation notes) | `mobile/unity/README.md` |
| Architecture diagrams + bridge state machine | `mobile/README.md` |
| Generic RN patterns (navigation, performance, native modules) | `.cursor/skills/react-native-patterns/SKILL.md` |
| Unity tool routing (REST / MCP / CLI) | `.cursor/rules/unity-tool-routing.mdc` |
| Unity cold-start / progress / write-evidence protocol | `.cursor/rules/unity-ar-evidence.mdc` |

**Anti-pattern**: do not load all of these at once. Load the single file that answers the specific question.

---

## 6. Hard rules for mobile work

1. **Do not silently rewrite the bridge contract.** Message format `"eventName|{json}"` and event names are frozen. Any change is a breaking change for the Unity C# side.
2. **JWT lives in `expo-secure-store` only.** Never `AsyncStorage` for tokens.
3. **`EXPO_PUBLIC_API_URL` is the only env var** consumed by RN. No others.
4. **ARFoundation 6 APIs only.** No `FindObjectOfType`, no `ARSession.State` polling.
5. **Don't claim Swift bridge exists.** If a task needs real RN↔Unity traffic, the answer is "Phase 2, needs Swift native module" — not "wire it up".
6. **MVP is iOS-only.** Don't propose Android-specific paths.