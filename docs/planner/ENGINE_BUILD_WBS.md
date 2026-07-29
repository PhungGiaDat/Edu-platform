# Work Breakdown Structure — Engine Build Sprint

**Project:** AR Food Education Platform — Engine Build & iOS Demo
**Document Type:** PM Work Breakdown Structure (WBS) with Milestones
**Status:** Draft v1.0 — Awaiting Sponsor Sign-off
**Classification:** Graduation Capstone — Internal Use Only

---

## 1. Project Header

| Field | Value |
|-------|-------|
| **Project Name** | AR Food Education Platform — Engine Build Sprint |
| **Project ID** | AR-FEP-2026-S1 |
| **Project Manager** | [Lead Student / PM Role] |
| **Sponsor** | University Capstone Committee |
| **Start Date** | Saturday, 25 July 2026 |
| **Finish Date** | Saturday, 22 August 2026 |
| **Duration** | 22 working days (≈ 4 calendar weeks) |
| **Sprint Window** | 7-day engine build: Day 0 → Day 7 (25 Jul → 1 Aug) |
| **Target Platform** | iOS (local demo only — no App Store, no TestFlight distribution) |
| **Budget** | $0 cash (student-owned Mac loan for 1 day + existing dev environment) |
| **Methodology** | Agile-Lite (1-week sprint + integration buffer) |
| **Reporting Cadence** | Daily standup (15 min) + Weekly status report (Friday) |

### 1.1 Scope Statement

#### In Scope
- Unity 6 + AR Foundation 6.3.5 engine layer (image tracking, anchors, plane detection)
- New Unity runtime scripts: `GLBLoader.cs`, `ModelSpawner.cs`, `AnimationController.cs`
- React Native ↔ Unity bridge (UnityMessageManager + RNEventEmitter)
- iOS native Swift bridge to expose AR view to RN
- RN application shell (3 screens: marker scan, AR view, lesson card)
- Integration with **existing web API** for content (food/lesson metadata)
- 3D content: elephant + jungle scene reuse + 1 GLB food asset
- 1 local iOS device install + smoke test (Mac day)
- Demo video (60–90s) + defense slides

#### Out of Scope (Explicitly Excluded)
- Android build (deferred — no Mac time, no Android device)
- Firebase / cloud backend (using existing web API only)
- User authentication / login / sign-up
- Multi-user, real-time sync, social features
- Push notifications, analytics, crash reporting
- App Store submission, TestFlight external testing
- CI/CD pipeline (manual builds only)
- Localization beyond English
- Production-grade error handling / observability stack
- Cross-platform abstraction layer for Android

### 1.2 Success Criteria

| # | Criterion | Measure | Target |
|---|-----------|---------|--------|
| SC-1 | iOS app installs on local iPhone via Xcode | Cold install succeeds | 100% |
| SC-2 | Camera opens and detects printed marker in <3s | Stopwatch from tap | ≤ 3.0 s |
| SC-3 | 3D elephant appears on marker with no jitter | Visual + Unity stats | Stable 30 fps |
| SC-4 | Lesson card displays food info from web API | DOM contains expected text | 100% hit rate |
| SC-5 | RN → Unity message round-trip works | Tap "Spawn" → model appears | ≤ 500 ms |
| SC-6 | Demo video recorded and uploaded | File exists | 1 video |
| SC-7 | Defense slides approved by advisor | Sign-off email | 1 approval |
| SC-8 | No P0/P1 bugs at demo time | Bug triage list | 0 open blockers |

---

## 2. Milestone Schedule (Gantt-Style)

Legend: ✅ Complete · 🟡 In Progress · ⚪ Not Started · 🔴 Blocked · 🔵 Deferred

| ID | Milestone | Date | Day | Owner | Deliverable | Acceptance Criteria | Status | Depends On |
|----|-----------|------|-----|-------|-------------|---------------------|--------|------------|
| **M0** | Project Kickoff & Audit | 25 Jul | Day 0 | PM / Lead | Kickoff note + repo audit log | Repo state captured, baseline scripts confirmed | ⚪ | — |
| **M1** | Foundation Complete | 27 Jul | Day 2 | Unity Dev | Working Unity project + RN shell boots in iOS sim | `npm start` + `Unity` editor play mode both run without errors | ⚪ | M0 |
| **M2** | Unity AR Working | 29 Jul | Day 4 | Unity Dev | Image tracking + anchor placement + 3 missing scripts merged | Camera detects marker → anchor placed → elephant GLB spawned in editor | ⚪ | M1 |
| **M3** | Bridge Functional | 31 Jul | Day 6 | Bridge Dev | RN↔Unity bidirectional message passing verified | `RNEventEmitter` event "model_spawned" received by RN after Unity spawn | ⚪ | M2 |
| **M4** | API Integrated | 2 Aug | Day 8 | RN Dev | Lesson card pulls from web API | `/api/lessons/:id` response renders in card; offline fallback works | ⚪ | M3 |
| **M5** | UI Complete | 4 Aug | Day 10 | RN Dev | All 3 screens built + navigation works | Scan → AR → Card flow walk-through passes | ⚪ | M4 |
| **M6** | Code Freeze | 6 Aug | Day 12 | PM / All | Branch tagged `v1.0-rc1`, no further features | All in-scope features merged; only bug fixes allowed | ⚪ | M5 |
| **M7** | Demo Ready | 22 Aug | Day 22 | PM / Lead | iOS build installed on device, demo video, slides approved | Defense rehearsal passes; iPhone runs full flow end-to-end | ⚪ | M6 + Mac Day |

### 2.1 Sprint-Phase Mapping

| Phase | Days | Calendar | Focus |
|-------|------|----------|-------|
| **Engine Build (intense)** | Day 0 → Day 7 | 25 Jul – 1 Aug | M0–M3 (Unity, scripts, bridge) |
| **App & API Integration** | Day 7 → Day 12 | 1 Aug – 6 Aug | M4–M6 (UI, screens, freeze) |
| **Stabilization Buffer** | Day 12 → Day 16 | 6 Aug – 10 Aug | Bug bash + perf tuning |
| **Mac Day + iOS Build** | Day 16 → Day 17 | 10 Aug – 11 Aug | One-day Mac loan — produce IPA |
| **On-Device Polish** | Day 17 → Day 20 | 11 Aug – 14 Aug | Smoke test on real iPhone |
| **Demo Prep** | Day 20 → Day 22 | 14 Aug – 22 Aug | Video, slides, defense rehearsal |

---

## 3. WBS Dictionary (Hierarchical Breakdown)

Format legend: `[ ]` = pending, `[x]` = complete, `[~]` = in progress

### 1.0 Project Foundation

#### 1.1 Environment Setup

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 1.1.1 | Install Unity Hub + Unity 6 LTS | Download Unity Hub, install Unity 6 LTS matching `Packages/manifest.json` (ARFoundation 6.3.5) | Unity Dev | 0.5 d | 25 Jul | 25 Jul | — | Unity Hub installed | Editor opens existing project without errors | 4 | ⚪ |
| 1.1.2 | Verify RN dependencies | Run `npm install` in `mobile/`, confirm React Native 0.7x + react-native-unity-view packages | RN Dev | 0.25 d | 25 Jul | 25 Jul | — | `node_modules` populated | `npm start` boots Metro bundler | 2 | ⚪ |
| 1.1.3 | Provision Mac loan day | Reserve a Mac (1 day, target Day 16) for Xcode + iOS build. Confirm Xcode 15+ installed | PM | 0.25 d | 25 Jul | 25 Jul | — | Mac reservation ticket | Calendar block + owner confirmation | 1 | ⚪ |
| 1.1.4 | Confirm iOS device + SDK | iPhone (A12 Bionic+) with iOS 16+ on hand for final install | PM | 0.25 d | 25 Jul | 25 Jul | — | Device list | iPhone charged, signed into Apple ID | 1 | ⚪ |

#### 1.2 Repository Audit

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 1.2.1 | Audit existing Unity scripts | Confirm `RuntimeImageTrackingPOC`, `ARSessionManager`, `AnchorManager`, `PlaneDetection`, `ARGestureHandler`, `RNEventEmitter` exist and target AF6 API | Unity Dev | 0.5 d | 25 Jul | 25 Jul | 1.1.1 | Audit log markdown | Each script compiles, no missing references | 3 | ⚪ |
| 1.2.2 | Identify missing Unity scripts | Confirm `GLBLoader.cs`, `ModelSpawner.cs`, `AnimationController.cs` are referenced by `ARExperienceHandler.cs` but absent | Unity Dev | 0.25 d | 25 Jul | 25 Jul | 1.2.1 | TODO list | 3 gaps explicitly listed | 1 | ⚪ |
| 1.2.3 | Audit iOS Swift bridge | Confirm `Plugins/iOS/` exists but Swift bridge file is missing | Bridge Dev | 0.25 d | 25 Jul | 25 Jul | 1.1.1 | TODO list | Gap documented | 1 | ⚪ |
| 1.2.4 | Verify 3D asset inventory | Confirm `Elephant.fbx` and `Jungle.unity` load without warnings | Unity Dev | 0.25 d | 25 Jul | 25 Jul | 1.1.1 | Asset report | Both load in editor | 2 | ⚪ |
| 1.2.5 | Confirm web API endpoints | Document endpoints used by mobile app (e.g., `GET /api/lessons/:id`) from existing web project | RN Dev | 0.5 d | 26 Jul | 26 Jul | — | API contract doc | Endpoint URLs + response shapes captured | 4 | ⚪ |

#### 1.3 Input Capture

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 1.3.1 | Print AR marker | Export reference image (e.g., Vuforia/NFT marker) and print at A5 size for camera testing | PM | 0.25 d | 26 Jul | 26 Jul | — | Printed marker | Marker readable by phone camera at 30 cm | 1 | ⚪ |
| 1.3.2 | Capture food photos for GLB reference | Take 3 reference photos of target food item to model after | RN Dev | 0.25 d | 26 Jul | 26 Jul | — | Reference photos | At least 3 angles | 2 | ⚪ |
| 1.3.3 | Stakeholder interview (advisor) | Sync with advisor on demo flow + grading rubric | PM | 0.5 d | 27 Jul | 27 Jul | — | Meeting notes | Advisor approval of scope | 2 | ⚪ |

**Subtotal 1.0:** ~25 person-hours

---

### 2.0 Unity Engine Layer

#### 2.1 AR Foundation (existing scripts — verify & harden)

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 2.1.1 | Validate `RuntimeImageTrackingPOC.cs` | Confirm image tracking on AF6 API; add addReferenceImage at runtime | Unity Dev | 0.5 d | 26 Jul | 26 Jul | 1.2.1 | Patched script | Marker tracked in editor Play mode | 4 | ⚪ |
| 2.1.2 | Validate `ARSessionManager.cs` | Confirm session init/pause/resume works on iOS build target | Unity Dev | 0.25 d | 26 Jul | 26 Jul | 2.1.1 | Patched script | No console errors in iOS sim | 2 | ⚪ |
| 2.1.3 | Validate `AnchorManager.cs` | Confirm anchor attach on tracked image | Unity Dev | 0.25 d | 26 Jul | 26 Jul | 2.1.1 | Patched script | Anchor placed within 1s of detection | 2 | ⚪ |
| 2.1.4 | Validate `PlaneDetection.cs` | Disable horizontal plane UI (not needed for image tracking demo) | Unity Dev | 0.25 d | 26 Jul | 26 Jul | 2.1.3 | Patched script | No plane overlay drawn | 2 | ⚪ |
| 2.1.5 | Validate `ARGestureHandler.cs` | Confirm pinch/rotate/tap gestures route correctly | Unity Dev | 0.25 d | 27 Jul | 27 Jul | 2.1.3 | Patched script | Tap on spawned model fires event | 2 | ⚪ |

#### 2.2 Model Loading — NEW Scripts

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 2.2.1 | Write `GLBLoader.cs` | Async GLB/glTF loader using `UnityWebRequest` + GLTFUtility package; caches loaded model | Unity Dev | 1.0 d | 27 Jul | 27 Jul | 1.2.4 | Script file + meta | Loads Elephant.fbx and 1 GLB food model in <2 s | 6 | ⚪ |
| 2.2.2 | Write `ModelSpawner.cs` | Instantiates loaded model at anchor position; applies scale/rotation offset | Unity Dev | 0.75 d | 27 Jul | 28 Jul | 2.2.1 | Script file + meta | Model appears at anchor, no Z-fighting | 5 | ⚪ |
| 2.2.3 | Write `AnimationController.cs` | Plays idle + tapped animations; routes gesture events from `ARGestureHandler` | Unity Dev | 0.75 d | 28 Jul | 28 Jul | 2.2.2, 2.1.5 | Script file + meta | Tap triggers bounce animation | 5 | ⚪ |
| 2.2.4 | Integrate new scripts into `ARExperienceHandler.cs` | Replace placeholder references with new scripts; wire up message flow | Unity Dev | 0.5 d | 28 Jul | 28 Jul | 2.2.3 | Patched script | Unity compiles, marker → model flow works | 4 | ⚪ |

#### 2.3 Unity Build Pipeline

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 2.3.1 | Configure iOS build target | Player Settings → iOS, IL2CPP, ARM64 | Unity Dev | 0.25 d | 29 Jul | 29 Jul | 2.2.4 | Build settings | No platform switch errors | 2 | ⚪ |
| 2.3.2 | Export UnityFramework | Build Unity → `Builds/iOS/UnityFramework` for embedding in Xcode project | Unity Dev | 0.5 d | 29 Jul | 29 Jul | 2.3.1 | UnityFramework folder | `UnityFramework.framework` produced | 3 | ⚪ |
| 2.3.3 | Configure Unity ↔ RN package | Install + link `react-native-unity-view` (or equivalent) in `mobile/` | Bridge Dev | 0.5 d | 29 Jul | 29 Jul | 2.3.1 | RN package wired | RN can embed Unity view | 3 | ⚪ |

**Subtotal 2.0:** ~41 person-hours

---

### 3.0 Bridge Layer

#### 3.1 Unity → RN

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 3.1.1 | Validate `RNEventEmitter.cs` | Confirm UnityMessageManager sends events to RN side; emit `onModelSpawned`, `onAnchorDetected`, `onError` | Bridge Dev | 0.5 d | 29 Jul | 29 Jul | 2.2.4 | Patched script | Events emitted with correct payload schema | 4 | ⚪ |
| 3.1.2 | RN-side event listener | Implement `NativeEventEmitter` subscriber in `mobile/src/bridge/` | RN Dev | 0.5 d | 30 Jul | 30 Jul | 3.1.1 | JS module | Listener receives `model_spawned` event | 4 | ⚪ |

#### 3.2 RN → Unity

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 3.2.1 | RN → Unity message API | Implement `UnityView.sendMessage(type, payload)` wrapper using UnityMessageManager.PostMessage | Bridge Dev | 0.5 d | 30 Jul | 30 Jul | 3.1.1 | JS module | `sendMessage('spawn', {assetId})` reaches Unity | 4 | ⚪ |
| 3.2.2 | Type-safe message contracts | Codify message schemas in shared `types/bridge.ts` | Bridge Dev | 0.25 d | 30 Jul | 30 Jul | 3.2.1 | TS types file | Both sides import same types | 2 | ⚪ |

#### 3.3 iOS Swift Bridge

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 3.3.1 | Create `UnityBridge.swift` | Swift class wrapping UnityFramework; exposes `startUnity`, `pauseUnity`, `sendMessage` | Bridge Dev | 0.75 d | 31 Jul | 31 Jul | 2.3.2 | Swift file | Bridging header configured | 5 | ⚪ |
| 3.3.2 | Create `UnityBridge.m` Objective-C bridge | Bridge header + ObjC wrapper for RN module registration | Bridge Dev | 0.5 d | 31 Jul | 31 Jul | 3.3.1 | ObjC file | RN can call `NativeModules.UnityBridge` | 3 | ⚪ |
| 3.3.3 | Register `UnityBridge` as RN module | Use `RCT_EXPORT_MODULE` macro + Promise-based API | Bridge Dev | 0.5 d | 31 Jul | 31 Jul | 3.3.2 | RN module spec | `NativeModules.UnityBridge.start()` resolves | 3 | ⚪ |

**Subtotal 3.0:** ~28 person-hours

---

### 4.0 Application Layer (React Native)

#### 4.1 RN UI Screens

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 4.1.1 | Scan screen | Camera permission prompt + "Point camera at marker" hint + auto-launch Unity on grant | RN Dev | 1.0 d | 1 Aug | 2 Aug | 3.3.3 | Screen component | Permission flow works in iOS sim | 6 | ⚪ |
| 4.1.2 | AR view screen | Hosts `UnityView` component; overlay HUD with "Tap to spawn" button | RN Dev | 1.0 d | 2 Aug | 3 Aug | 3.3.3, 4.1.1 | Screen component | Unity view embedded, HUD visible | 6 | ⚪ |
| 4.1.3 | Lesson card screen | Bottom sheet showing food name, nutrition, fun fact; pull-to-dismiss | RN Dev | 1.0 d | 3 Aug | 4 Aug | 4.2.1 | Screen component | Card renders API data, dismissible | 6 | ⚪ |
| 4.1.4 | Navigation flow | Wire scan → AR → card with React Navigation; back gesture handling | RN Dev | 0.5 d | 4 Aug | 4 Aug | 4.1.1, 4.1.2, 4.1.3 | Router config | Full walkthrough passes | 3 | ⚪ |

#### 4.2 API Service

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 4.2.1 | API client module | `src/api/lessons.ts` with `fetchLesson(id)`; retries + offline cache | RN Dev | 0.5 d | 1 Aug | 1 Aug | 1.2.5 | TS module | Returns typed lesson object | 4 | ⚪ |
| 4.2.2 | Offline fallback | If API fails, show cached lesson from `AsyncStorage` | RN Dev | 0.25 d | 4 Aug | 4 Aug | 4.2.1 | Cache module | App usable with airplane mode after first load | 2 | ⚪ |

#### 4.3 State Management

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 4.3.1 | Zustand (or Redux) store | Track `currentMarker`, `spawnedAsset`, `lessonData`, `appState` | RN Dev | 0.5 d | 1 Aug | 2 Aug | 3.1.2 | Store module | All screens read/write same state | 4 | ⚪ |
| 4.3.2 | Bridge event reducers | Map Unity events (`onModelSpawned`, etc.) to store actions | RN Dev | 0.5 d | 2 Aug | 3 Aug | 3.1.2, 4.3.1 | Reducer module | Events update UI in real time | 3 | ⚪ |

**Subtotal 4.0:** ~36 person-hours

---

### 5.0 Integration & Test

#### 5.1 Unit Tests

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 5.1.1 | Unity EditMode tests | Test `GLBLoader` cache, `AnimationController` state machine | Unity Dev | 0.5 d | 28 Jul | 28 Jul | 2.2.x | Test assembly | ≥ 80% pass on scripts under test | 4 | ⚪ |
| 5.1.2 | RN unit tests | Test reducers, API client, navigation guards (Jest) | RN Dev | 0.5 d | 4 Aug | 4 Aug | 4.3.x | Jest suite | ≥ 80% pass | 4 | ⚪ |

#### 5.2 Integration Tests

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 5.2.1 | Bridge round-trip test | Tap "Spawn" in RN → Unity spawns → event returns to RN | Bridge Dev | 0.5 d | 1 Aug | 1 Aug | 3.x complete | Test script | <500ms round-trip | 3 | ⚪ |
| 5.2.2 | API integration test | App fetches lesson on cold start, renders without error | RN Dev | 0.25 d | 4 Aug | 4 Aug | 4.2.1 | Test script | Network call succeeds, UI populated | 2 | ⚪ |

#### 5.3 Device Tests

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 5.3.1 | iOS simulator smoke test | Run app on iPhone 14 sim, walk through full flow | RN Dev | 0.5 d | 5 Aug | 5 Aug | 4.1.4 | Test log | Flow completes, no crashes | 3 | ⚪ |
| 5.3.2 | On-device smoke test (Mac Day) | Install on physical iPhone, verify camera, marker detect, model spawn, lesson card | All | 0.5 d | 11 Aug | 11 Aug | 6.1.x | Test report | All 5 SC items pass | 4 | ⚪ |

**Subtotal 5.0:** ~20 person-hours

---

### 6.0 iOS Build & Deploy

#### 6.1 Mac Day Build

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 6.1.1 | Mac Day prep (pre-visit) | Pre-build Unity iOS framework on Windows/Linux PC; zip all source | Unity Dev | 0.5 d | 9 Aug | 9 Aug | 2.3.2 | Pre-built zip | Zip < 500 MB, includes UnityFramework | 4 | ⚪ |
| 6.1.2 | Mac visit — open Xcode project | Clone repo, run `pod install`, open `.xcworkspace` | Bridge Dev | 0.25 d | 10 Aug | 10 Aug | 6.1.1 | Xcode open | Project loads, no signing errors | 2 | ⚪ |
| 6.1.3 | Mac visit — code signing | Personal team signing; auto-sign cert; provisioning profile | Bridge Dev | 0.25 d | 10 Aug | 10 Aug | 6.1.2 | Signing identity | "Run" button enabled | 2 | ⚪ |
| 6.1.4 | Mac visit — build to device | Connect iPhone, build & install on physical device | Bridge Dev | 0.5 d | 10 Aug | 10 Aug | 6.1.3 | App on iPhone | Icon appears on springboard | 4 | ⚪ |
| 6.1.5 | Mac visit — export IPA (backup) | Archive build → export dev IPA for reinstall | Bridge Dev | 0.25 d | 10 Aug | 10 Aug | 6.1.4 | IPA file | IPA installs via Xcode | 2 | ⚪ |

#### 6.2 On-Device Install & Verify

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 6.2.1 | Cold-launch test | Re-install IPA, launch from cold, time to AR view | All | 0.25 d | 11 Aug | 11 Aug | 6.1.5 | Cold-launch metric | < 8s | 1 | ⚪ |
| 6.2.2 | Marker detection test | With printed marker, verify detection within 3s | All | 0.25 d | 11 Aug | 11 Aug | 6.2.1 | Test video | Detection < 3s | 1 | ⚪ |
| 6.2.3 | 10-minute soak | Leave app open 10 min, watch for thermal throttling / crashes | RN Dev | 0.25 d | 11 Aug | 11 Aug | 6.2.2 | Stability log | No crashes, FPS stays > 25 | 1 | ⚪ |

#### 6.3 Smoke Test

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 6.3.1 | Full-flow rehearsal (2x) | Scan → AR view → model spawn → tap model → lesson card → back | PM / Lead | 0.5 d | 14 Aug | 14 Aug | 6.2.x | Rehearsal report | Both runs succeed, no fallback | 3 | ⚪ |
| 6.3.2 | Bug triage + P0/P1 sweep | Open the bug list, classify P0–P3, fix P0 immediately | All | 1.0 d | 15 Aug | 15 Aug | 6.3.1 | Bug list w/ status | All P0 fixed or waived | 6 | ⚪ |

**Subtotal 6.0:** ~29 person-hours

---

### 7.0 Demo Readiness

#### 7.1 Documentation

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 7.1.1 | README.md rewrite | Setup steps, run commands, architecture diagram | Documenter | 0.5 d | 16 Aug | 16 Aug | 6.x complete | README | Advisor can clone + run from README | 4 | ⚪ |
| 7.1.2 | Architecture doc | C4 model (Context + Container) for engine + app layers | Documenter | 0.5 d | 16 Aug | 16 Aug | 7.1.1 | `docs/architecture.md` | Diagram renders in markdown | 4 | ⚪ |
| 7.1.3 | Known limitations | List deferred items (Android, auth, Firebase) with rationale | PM | 0.25 d | 17 Aug | 17 Aug | — | Limitations doc | 5+ items listed | 2 | ⚪ |

#### 7.2 Demo Video

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 7.2.1 | Record demo on iPhone | Capture full flow (60–90 s) at 1080p | PM | 0.5 d | 18 Aug | 18 Aug | 6.3.x | Raw footage | Single continuous take | 3 | ⚪ |
| 7.2.2 | Edit + narrate | Add title cards, narration, captions | PM | 0.5 d | 19 Aug | 19 Aug | 7.2.1 | Final MP4 | Under 90 s, clear audio | 4 | ⚪ |
| 7.2.3 | Upload to portfolio | Upload to YouTube unlisted / Drive share | PM | 0.25 d | 19 Aug | 19 Aug | 7.2.2 | Share link | Link tested | 1 | ⚪ |

#### 7.3 Defense Slides

| WBS ID | Task | Description | Owner | Duration | Start | Finish | Predecessors | Deliverable | Acceptance | Effort (h) | Status |
|--------|------|-------------|-------|----------|-------|--------|--------------|-------------|------------|------------|--------|
| 7.3.1 | Outline slide deck | ~15 slides: problem, solution, architecture, demo, results, future work | PM | 0.5 d | 20 Aug | 20 Aug | 7.1.2 | Outline | Advisor approves structure | 4 | ⚪ |
| 7.3.2 | Fill slides + visuals | Screenshots from app, architecture diagram, metrics | PM | 1.0 d | 21 Aug | 21 Aug | 7.3.1, 7.2.2 | Deck | All slides populated | 6 | ⚪ |
| 7.3.3 | Rehearsal (timed, 10 min) | Run through deck + demo video live | PM | 0.5 d | 22 Aug | 22 Aug | 7.3.2, 7.2.2 | Rehearsal score | < 10 min, Q&A handled | 3 | ⚪ |

**Subtotal 7.0:** ~34 person-hours

---

### WBS Effort Summary

| WBS Section | Effort (h) | Effort (days @ 6 h/d) |
|-------------|------------|------------------------|
| 1.0 Project Foundation | 25 | 4.2 |
| 2.0 Unity Engine Layer | 41 | 6.8 |
| 3.0 Bridge Layer | 28 | 4.7 |
| 4.0 Application Layer | 36 | 6.0 |
| 5.0 Integration & Test | 20 | 3.3 |
| 6.0 iOS Build & Deploy | 29 | 4.8 |
| 7.0 Demo Readiness | 34 | 5.7 |
| **TOTAL** | **213 h** | **~35.5 person-days** |

---

## 4. Milestone Summary (Key Dates)

| Milestone | Date | Day | Gate Criteria | Decision at Gate |
|-----------|------|-----|---------------|------------------|
| **M0** Kickoff | 25 Jul 2026 | Day 0 | Repo audited, Mac day reserved, scope signed | GO / NO-GO on full plan |
| **M1** Foundation | 27 Jul 2026 | Day 2 | RN shell + Unity project both boot | GO / NO-GO on Unity work |
| **M2** AR Working | 29 Jul 2026 | Day 4 | Image tracking + 3 new scripts merged | GO / NO-GO on bridge |
| **M3** Bridge | 31 Jul 2026 | Day 6 | RN↔Unity round-trip <500ms | GO / NO-GO on app layer |
| **M4** API | 2 Aug 2026 | Day 8 | Lesson card renders web API data | GO / NO-GO on full UI |
| **M5** UI Complete | 4 Aug 2026 | Day 10 | All 3 screens + nav pass walkthrough | GO / NO-GO on freeze |
| **M6** Code Freeze | 6 Aug 2026 | Day 12 | `v1.0-rc1` tagged, no features | GO / NO-GO on stabilization |
| **M7** Demo Ready | 22 Aug 2026 | Day 22 | Rehearsal passes, iPhone live, slides approved | Defense submission |

**Mac Day Critical Path:** Day 16 (10 Aug 2026) — single day to produce installable iOS build. Pre-Mac preparation (6.1.1) MUST complete by Day 14 to leave buffer for source transfer.

---

## 5. Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|----|------|-------------|--------|------------|-------|
| **R-01** | Mac Day cancellation — loan Mac unavailable | Low | High | Pre-build UnityFramework on Windows (6.1.1); identify 2 backup Macs (university lab, library); have signing identity cached | PM |
| **R-02** | New Unity scripts (`GLBLoader`, `ModelSpawner`, `AnimationController`) miss deadline | Medium | High | Write smallest viable versions first; pair-program on Day 3; cut AnimationController if blocked (graceful degrade) | Unity Dev |
| **R-03** | Web API endpoint schema differs from RN expectation | Medium | Medium | Read existing web code in audit (1.2.5); define TS contract (3.2.2) before integration; build offline cache (4.2.2) | RN Dev |
| **R-04** | ARFoundation 6.3.5 incompat with iOS deployment target | Low | High | Verify Xcode + iOS SDK match Unity requirement before Mac Day; have downgrade path to AF 5.x as fallback | Unity Dev |
| **R-05** | Swift bridge registration fails (RN cannot find module) | Medium | High | Test on iOS simulator before Mac Day; use proven `RCT_EXPORT_MODULE` template; document fix in `docs/bridge-troubleshooting.md` | Bridge Dev |
| **R-06** | iPhone not provisioned for development | Low | High | Confirm Apple ID + device UDID registered in signing identity on Day 1; test build on simulator as proxy | PM |
| **R-07** | Marker detection unreliable under demo lighting | Medium | Medium | Print high-contrast marker on matte paper; pre-test detection under demo-room lighting; bring backup markers (3 copies) | PM |
| **R-08** | Unity iOS framework too large for Xcode build (>30 min) | Medium | Medium | Strip unused Unity packages in Player Settings; use IL2CPP only; disable Deep Profiling | Unity Dev |
| **R-09** | Cross-team integration breaks (RN + Unity + Bridge) | High | Medium | Daily integrated builds (1.2.1); "demo every day" rule from M3 onward; freeze scope at M6 | Bridge Dev |
| **R-10** | Demo video environment noisy / no audio | Low | Low | Record with lavalier mic; record audio separately as backup; narrate in post | PM |
| **R-11** | Code freeze slip (M6 missed) | Medium | High | Trim UI polish features; treat M6 as hard gate; push M7 buffer to absorb | PM |
| **R-12** | Advisor rubric changes mid-sprint | Low | Medium | Sync with advisor at M0 (1.3.3); re-validate scope at M4 gate | PM |

---

## 6. RACI Matrix

Legend: **R** = Responsible (does the work) · **A** = Accountable (signs off) · **C** = Consulted · **I** = Informed

| WBS | Work Package | PM | Unity Dev | RN Dev | Bridge Dev | Documenter | Advisor |
|-----|--------------|----|-----------|--------|------------|------------|---------|
| 1.0 | Project Foundation | A | R | R | R | I | C |
| 2.0 | Unity Engine Layer | I | A/R | I | C | — | I |
| 3.0 | Bridge Layer | I | C | C | A/R | — | I |
| 4.0 | Application Layer | I | I | A/R | C | — | I |
| 5.0 | Integration & Test | A | R | R | R | — | I |
| 6.0 | iOS Build & Deploy | A/R | C | C | R | — | I |
| 7.0 | Demo Readiness | A/R | I | I | I | R | C |
| Gates | Milestone reviews | A | R | R | R | C | C |

**Notes:**
- A single person can hold **only one A** per cell. For 1.0–7.0, the section lead holds A.
- "R" appears next to whoever actually executes; multiple R's allowed.
- PM is **always A** at milestone gates and demo deliverables.

---

## 7. Status Reporting

### 7.1 Daily Standup Template (15 min, async OK)

```
Date: YYYY-MM-DD    Day: N    Reporter: [Name]

✅ Yesterday (done)
- [WBS-ID] brief outcome
- [WBS-ID] brief outcome

🎯 Today (planned)
- [WBS-ID] expected deliverable
- [WBS-ID] expected deliverable

🚧 Blockers
- [blocker 1 + who can unblock + by when]
- [blocker 2 + who can unblock + by when]

📊 Burn-down
- Effort completed: X / Y h
- Open P0 bugs: N
- Open P1 bugs: N

🔔 Asks for PM
- [decision needed, deadline]
```

### 7.2 Weekly Status Report Template (Friday EOD)

```markdown
# Weekly Status Report — Week of [Date]

## Executive Summary
[2–3 sentences: did we hit our milestones this week?]

## Milestone Status
| Milestone | Target | Actual | Status |
|-----------|--------|--------|--------|
| M0–M2 | ...    | ...    | ✅ / ⚪ / 🔴 |

## WBS Progress
- Completed this week: [list of WBS IDs]
- In progress: [list]
- Deferred to next week: [list with rationale]

## Risks Update
- New risks identified: [ID + description]
- Risks closed: [ID + why mitigated]

## Decisions Needed
1. [Decision + options + recommendation + deadline]

## Next Week Plan
- Top 3 priorities
```

### 7.3 Definition of Done (DoD)

A work package is **DONE** only when **all** of the following hold:

- [ ] Code merged to `main` (or appropriate branch)
- [ ] Unit / integration test written (if applicable) and passing
- [ ] Acceptance criteria from WBS row are met (verified, not assumed)
- [ ] Status field updated to `Complete`
- [ ] No new P0/P1 bugs introduced
- [ ] Demoed to PM or peer at standup
- [ ] Documentation updated (if user-facing change)

A milestone is **DONE** when:
- [ ] All child work packages meet DoD
- [ ] Gate criteria from Milestone Summary are met
- [ ] PM signs off in standup / weekly report

---

## 8. Change Control

### 8.1 Change Request Process

Any scope, schedule, or quality change **must** go through this process:

1. **Raise** — Anyone can file a change request (CR) in `docs/changes/CR-NNN.md` using template below.
2. **Triage** — PM reviews within 24 h, classifies as:
   - **Cosmetic** (PM approves, no gate)
   - **Minor** (PM + affected lead approve, ≤ 4 h impact)
   - **Major** (PM + sponsor/advisor approve, > 4 h impact OR affects milestone gate)
3. **Decide** — Approve / Defer / Reject with rationale.
4. **Update** — PM edits this WBS, marks change in change log section below.
5. **Communicate** — All informed via standup next morning.

### 8.2 Change Request Template

```markdown
## CR-NNN: [Short Title]

**Filed by:** [Name]    **Date:** YYYY-MM-DD
**Type:** Scope / Schedule / Quality / Risk

### Description
[What is changing and why]

### Impact
- Effort: +X h
- Schedule: +Y days (affects milestone M_Z)
- Risk: [new or changed]
- Quality: [improved / degraded]

### Alternatives Considered
1. [Option A — rejected because ...]
2. [Option B — rejected because ...]

### Recommendation
[Approve / Defer / Reject, with rationale]

### Approval
- [ ] PM
- [ ] Affected Lead
- [ ] Sponsor (if Major)
```

### 8.3 Scope Freeze Rules

- After **M6 Code Freeze (Day 12)**: no new features. Only bug fixes (P0/P1) accepted.
- New work discovered after M6 must be either (a) deferred to "Future Work" list, or (b) traded against an in-progress item of equal effort.
- Advisor can override freeze only for grading-critical changes (requires 24 h notice + written rationale).

### 8.4 Change Log

| CR ID | Date | Description | Decision | Impact |
|-------|------|-------------|----------|--------|
| (none yet) | — | Initial WBS v1.0 baseline | Approved | — |

---

## Appendix A — WBS ID Quick Reference

```
1.0 Project Foundation
  1.1 Environment Setup    → 1.1.1, 1.1.2, 1.1.3, 1.1.4
  1.2 Repository Audit     → 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5
  1.3 Input Capture        → 1.3.1, 1.3.2, 1.3.3

2.0 Unity Engine Layer
  2.1 AR Foundation        → 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5
  2.2 Model Loading (NEW)  → 2.2.1, 2.2.2, 2.2.3, 2.2.4
  2.3 Unity Build Pipeline → 2.3.1, 2.3.2, 2.3.3

3.0 Bridge Layer
  3.1 Unity → RN           → 3.1.1, 3.1.2
  3.2 RN → Unity           → 3.2.1, 3.2.2
  3.3 iOS Swift Bridge     → 3.3.1, 3.3.2, 3.3.3

4.0 Application Layer
  4.1 RN UI Screens        → 4.1.1, 4.1.2, 4.1.3, 4.1.4
  4.2 API Service          → 4.2.1, 4.2.2
  4.3 State Management     → 4.3.1, 4.3.2

5.0 Integration & Test
  5.1 Unit Tests           → 5.1.1, 5.1.2
  5.2 Integration Tests    → 5.2.1, 5.2.2
  5.3 Device Tests         → 5.3.1, 5.3.2

6.0 iOS Build & Deploy
  6.1 Mac Day Build        → 6.1.1, 6.1.2, 6.1.3, 6.1.4, 6.1.5
  6.2 On-Device Install    → 6.2.1, 6.2.2, 6.2.3
  6.3 Smoke Test           → 6.3.1, 6.3.2

7.0 Demo Readiness
  7.1 Documentation        → 7.1.1, 7.1.2, 7.1.3
  7.2 Demo Video           → 7.2.1, 7.2.2, 7.2.3
  7.3 Defense Slides       → 7.3.1, 7.3.2, 7.3.3
```

---

## Appendix B — Day-by-Day Critical Path

| Day | Date | Phase | Critical Tasks | Gate |
|-----|------|-------|----------------|------|
| 0 | 25 Jul (Sat) | Foundation | 1.1.1, 1.1.2, 1.1.3, 1.2.1, 1.2.2, 1.2.3, 1.3.1 | M0 |
| 1 | 26 Jul (Sun) | Foundation | 1.2.4, 1.2.5, 1.3.2, 2.1.1–2.1.4 | — |
| 2 | 27 Jul (Mon) | Foundation | 2.1.5, 2.2.1, 1.3.3 | **M1** |
| 3 | 28 Jul (Tue) | Unity | 2.2.2, 2.2.3, 2.2.4, 5.1.1 | — |
| 4 | 29 Jul (Wed) | Unity | 2.3.1, 2.3.2, 2.3.3, 3.1.1 | **M2** |
| 5 | 30 Jul (Thu) | Bridge | 3.1.2, 3.2.1, 3.2.2 | — |
| 6 | 31 Jul (Fri) | Bridge | 3.3.1, 3.3.2, 3.3.3 | **M3** |
| 7 | 1 Aug (Sat) | App | 4.1.1, 4.2.1, 4.3.1, 5.2.1 | — |
| 8 | 2 Aug (Sun) | App | 4.1.1, 4.3.1 | **M4** |
| 9 | 3 Aug (Mon) | App | 4.1.2, 4.3.2 | — |
| 10 | 4 Aug (Tue) | App | 4.1.3, 4.1.4, 4.2.2, 5.1.2, 5.2.2 | **M5** |
| 11 | 5 Aug (Wed) | Test | 5.3.1 | — |
| 12 | 6 Aug (Thu) | Freeze | Tag `v1.0-rc1`, stop features | **M6** |
| 13 | 7 Aug (Fri) | Buffer | Bug bash | — |
| 14 | 8 Aug (Sat) | Buffer | Bug bash | — |
| 15 | 9 Aug (Sun) | Mac prep | 6.1.1 (pre-build zip) | — |
| **16** | **10 Aug (Mon)** | **MAC DAY** | **6.1.2–6.1.5** | — |
| 17 | 11 Aug (Tue) | Device | 5.3.2, 6.2.1–6.2.3 | — |
| 18 | 12 Aug (Wed) | Buffer | Fix P0 from device test | — |
| 19 | 13 Aug (Thu) | Buffer | Fix P1 | — |
| 20 | 14 Aug (Fri) | Rehearsal | 6.3.1 (2x) | — |
| 21 | 15 Aug (Sat) | Bug sweep | 6.3.2 | — |
| 22 | 16 Aug (Sun) | Docs | 7.1.1, 7.1.2 | — |
| 23 | 17 Aug (Mon) | Docs | 7.1.3 | — |
| 24 | 18 Aug (Tue) | Video | 7.2.1 | — |
| 25 | 19 Aug (Wed) | Video | 7.2.2, 7.2.3 | — |
| 26 | 20 Aug (Thu) | Slides | 7.3.1 | — |
| 27 | 21 Aug (Fri) | Slides | 7.3.2 | — |
| 28 | 22 Aug (Sat) | **DEMO** | 7.3.3 — final rehearsal | **M7** |

*Note: Day numbering uses the milestone table convention; full calendar day count runs 0 → 28 for the M7 date 22 Aug.*

---

**End of WBS — Engine Build Sprint v1.0**
*Next action: PM presents this WBS to advisor for sign-off, then baselines the plan and opens Day 0.*