# AR Food Education Engine — Execution Checklist

> **Project**: AR food education platform (React Native + Unity + ARKit)
> **Workspace**: `e:\University\Graduted Project\Edu-platform`
> **Timeline**: 1 month / 22 working days
> **Start date**: Saturday, July 25, 2026
> **Target**: Local iOS demo only
> **Mac window**: 1 day (Day 7, reserved for final iOS build)
> **Skip**: Firebase, Android, auth, CI/CD, App Store submission

---

## How to Use This Document

1. Work top-to-bottom. Each day has its own section.
2. Check items off with `[x]` as you complete them.
3. Every task has: time estimate, file paths, expected output, verification step.
4. Update the **Progress Tracking Table** at the bottom daily.
5. If blocked > 30 min on a single task → move it to Day 6 (bug fixes) and continue with the next task.
6. Commit to git at the end of every day with the message `Day N: <summary>`.

---

## Day 0 — Pre-Flight (Saturday, July 25, 2026)

> Complete these checks **before** starting Day 1.

- [ ] **Verify the workspace opens cleanly** — 15 min
  - Open `e:\University\Graduted Project\Edu-platform` in Cursor.
  - Confirm `package.json`, `unity/`, and `ios/` directories are visible.
  - Run `git status` — should show clean working tree or expected untracked assets.

- [ ] **Confirm Unity + RN versions** — 10 min
  - Read `unity/Packages/manifest.json` → note Unity version (must be 2022.3 LTS or newer).
  - Read `package.json` → note React Native version (must be ≥ 0.73).
  - Write versions into a sticky note for reference.

- [ ] **Locate existing assets** — 15 min
  - Confirm elephant `.fbx` / `.glb` and jungle scene `.unity` exist.
  - Paths to verify:
    - `unity/Assets/Models/Animals/Elephant.fbx`
    - `unity/Assets/Scenes/Jungle.unity`
  - Open each in Unity Editor (if accessible) — confirm they import without errors.

- [ ] **Identify the web API** — 20 min
  - Find existing web API endpoint URL in `docs/FRONTEND_API_DOCUMENTATION.md` or `.env`.
  - Test it locally: `curl https://<your-api>/api/foods` → expect JSON array.
  - Save base URL into a scratch file:
    ```json
    {
      "API_BASE_URL": "https://localhost:3000/api",
      "FOODS_ENDPOINT": "/foods",
      "CATEGORIES_ENDPOINT": "/categories"
    }
    ```

- [ ] **Schedule the Mac Day** — 10 min
  - Book Day 7 (Friday, July 31, 2026) for full-day Mac access.
  - Confirm Xcode 15+ and Unity Hub with iOS Build Support module installed on the Mac.
  - Confirm Apple Developer account is signed in (free tier is fine for local install).

- [ ] **Initialize progress table** — 5 min
  - Scroll to the bottom of this file and fill in Day 0 row.

**Day 0 deliverable**: A working understanding of the starting state, confirmed asset locations, working API endpoint, and Mac day booked.

---

## Day 1 — Project Setup & Fix Build Issues
**Goal**: Clean build on Windows + clear path to Unity integration.

### 1.1 React Native Bootstrap
- [ ] **Install dependencies** — 30 min
  - `cd e:\University\Graduted Project\Edu-platform`
  - Run: `npm install`
  - **Expected**: `node_modules/` populated, no peer-dependency errors that block install.
  - **Verify**: `ls node_modules/react-native/package.json` exists.

- [ ] **Run Metro bundler smoke test** — 10 min
  - Run: `npx react-native start`
  - **Expected**: Metro starts on port 8081, shows "Welcome to React Native".
  - **Verify**: Open `http://localhost:8081/status` in browser → see "packager-status:running".

- [ ] **Verify TypeScript compiles** — 15 min
  - Run: `npx tsc --noEmit`
  - **Expected**: 0 errors (warnings are OK for now).
  - **Verify**: Exit code 0, no red squiggles in `src/`.

### 1.2 iOS Project Health (Windows-side validation only)
- [ ] **Inspect iOS folder structure** — 20 min
  - Files to check:
    - `ios/Podfile`
    - `ios/<ProjectName>.xcworkspace`
    - `ios/<ProjectName>/Info.plist`
  - **Verify**: No `BUILD FAILED` markers in `ios/Podfile.lock` history.

- [ ] **Document iOS-known-issues** — 15 min
  - Create file: `docs/documenter/IOS_BUILD_NOTES.md`
  - Content template:
    ```markdown
    # iOS Build Notes (Windows-side)
    ## Known Issues
    - Pod install requires Mac (deferred to Day 7)
    - <any existing build flags worth remembering>
    ## Deferred Steps
    - Code signing: skipped (local install only)
    - Provisioning profile: skipped
    ```

### 1.3 Unity Project Bootstrap
- [ ] **Open Unity project on Windows** — 30 min
  - Open Unity Hub → Add project from disk → select `unity/`.
  - **Expected**: Unity 2022.3 LTS+ opens without red errors.
  - **Verify**: Console shows 0 errors on first compile.

- [ ] **Install AR Foundation + ARKit XR Plugin** — 20 min
  - Window → Package Manager → search and install:
    - `com.unity.xr.arfoundation` (≥ 5.0)
    - `com.unity.xr.arkit` (≥ 5.0)
    - `com.unity.xr.management` (≥ 4.4)
  - **Verify**: `Packages/manifest.json` shows new entries.

- [ ] **Switch Android build target off (free Mac license)** — 10 min
  - File → Build Settings → uncheck Android.
  - **Verify**: Only iOS shows as target platform.

### 1.4 Day 1 Wrap-Up
- [ ] **Git commit** — 5 min
  - Run: `git add -A && git commit -m "Day 1: project bootstrap + Unity AR packages"`
- [ ] **Update progress table** — 2 min
- [ ] **Take a screenshot** of the Unity editor with the jungle scene loaded → save to `docs/documenter/screenshots/day1-unity.png`.

**Day 1 deliverable**: Clean RN project boots, Unity project has AR packages, iOS build notes documented.

---

## Day 2 — Unity Image Tracking Core
**Goal**: Detect a printed card (food marker) in camera feed and spawn the elephant.

### 2.1 Image Library Setup
- [ ] **Pick a reference image** — 15 min
  - Choose a food card image (e.g., apple, banana, mango).
  - Save to `unity/Assets/StreamingAssets/ReferenceImages/apple.jpg`.
  - Image requirements: ≥ 300px square, high contrast, not too repetitive.

- [ ] **Create XR Reference Image Library** — 20 min
  - In Unity Project window: right-click `Assets/` → Create → XR → Reference Image Library.
  - Name: `FoodMarkerLibrary`.
  - Drag `apple.jpg` into the library; set `Specify Size: 0.1m (10cm)`.
  - **Verify**: Inspector shows the image with tracked dimensions.

- [ ] **Update `Jungle.unity` scene** — 30 min
  - Open `unity/Assets/Scenes/Jungle.unity`.
  - Add GameObject → XR → AR Session.
  - Add GameObject → XR → AR Session Origin (set Tracking Mode: `Image Tracking`).
  - On AR Session Origin → Add Component → `AR Tracked Image Manager`.
  - Assign `FoodMarkerLibrary` to the manager's `Serialized Library` field.
  - **Verify**: Save scene → no red errors in Console.

### 2.2 Spawn Logic
- [ ] **Create `MarkerSpawner.cs`** — 45 min
  - Path: `unity/Assets/Scripts/MarkerSpawner.cs`
  - Expected skeleton:
    ```csharp
    using UnityEngine;
    using UnityEngine.XR.ARFoundation;

    public class MarkerSpawner : MonoBehaviour {
        [SerializeField] private GameObject elephantPrefab;
        private ARTrackedImageManager manager;

        void Awake() {
            manager = GetComponent<ARTrackedImageManager>();
            manager.trackedImagesChanged += OnTrackedImagesChanged;
        }

        void OnTrackedImagesChanged(ARTrackedImagesChangedEventArgs args) {
            foreach (var img in args.added) Spawn(img);
            foreach (var img in args.updated) img.transform.rotation = Quaternion.identity;
            foreach (var img in args.removed) Destroy(img.transform.GetChild(0).gameObject);
        }

        private void Spawn(ARTrackedImage img) {
            var go = Instantiate(elephantPrefab, img.transform);
            go.transform.localPosition = Vector3.zero;
            go.transform.localRotation = Quaternion.identity;
        }
    }
    ```
  - Attach to the AR Session Origin GameObject.
  - Drag elephant prefab into the `Elephant Prefab` field.

- [ ] **First build test (Editor play mode only)** — 20 min
  - Press Play in Unity. AR Session will log "AR Session not supported in Editor" — that's OK.
  - **Verify**: No NullReferenceException in Console.
  - **Verify**: Script compiles (no red errors in Console after domain reload).

### 2.3 Visual Polish
- [ ] **Add ambient lighting fix** — 15 min
  - On elephant prefab, ensure it uses `Unlit/Texture` shader OR add a Directional Light to the AR Session Origin.
  - **Verify**: Elephant visible against dark camera background.

- [ ] **Add "found" debug log** — 5 min
  - In `MarkerSpawner.Spawn()`, add `Debug.Log("[AR] Spawned for: " + img.referenceImage.name);`
  - **Verify**: Will log when image detected on real iOS device.

### 2.4 Day 2 Wrap-Up
- [ ] **Git commit** — 5 min
  - `git add -A && git commit -m "Day 2: Unity image tracking + elephant spawn"`
- [ ] **Update progress table** — 2 min
- [ ] **Take screenshot** of the scene hierarchy → `docs/documenter/screenshots/day2-ar-session.png`.

**Day 2 deliverable**: Unity scene detects food markers (in iOS device build) and spawns the elephant model on top.

---

## Day 3 — RN ↔ Unity Bridge
**Goal**: React Native loads Unity as a view, passes food data into Unity, Unity sends back interaction events.

### 3.1 React Native Side — Unity View Wrapper
- [ ] **Install `react-native-unity-view`** — 20 min
  - Run: `npm install react-native-unity-view`
  - **Expected**: Native modules link automatically (RN ≥ 0.60 autolinking).
  - **Verify**: `node_modules/react-native-unity-view/` exists.

- [ ] **Create `<UnityARView />` component** — 45 min
  - Path: `src/components/UnityARView.tsx`
  - Expected skeleton:
    ```tsx
    import React, { useEffect, useRef } from 'react';
    import UnityView from 'react-native-unity-view';
    import { NativeEventEmitter, NativeModules } from 'react-native';

    type Props = {
      foodId: string;
      onAREvent: (event: { type: string; payload: any }) => void;
    };

    export const UnityARView: React.FC<Props> = ({ foodId, onAREvent }) => {
      const viewRef = useRef<any>(null);

      useEffect(() => {
        const emitter = new NativeEventEmitter(NativeModules.UnityView);
        const sub = emitter.addListener('onUnityMessage', onAREvent);
        return () => sub.remove();
      }, [onAREvent]);

      useEffect(() => {
        viewRef.current?.postMessage?.('SetFoodId', foodId);
      }, [foodId]);

      return <UnityView ref={viewRef} style={{ flex: 1 }} />;
    };
    ```
  - **Verify**: TypeScript compiles with `npx tsc --noEmit`.

- [ ] **Wire into a placeholder screen** — 30 min
  - Path: `src/screens/ARScreen.tsx`
  - Expected content:
    ```tsx
    import React from 'react';
    import { View, Text } from 'react-native';
    import { UnityARView } from '../components/UnityARView';

    export const ARScreen = () => (
      <View style={{ flex: 1 }}>
        <UnityARView foodId="apple" onAREvent={(e) => console.log('[AR]', e)} />
        <Text style={{ position: 'absolute', bottom: 20 }}>AR Demo</Text>
      </View>
    );
    ```
  - Register `ARScreen` as a route in your navigator (no nav library yet — just keep it as the default export of `App.tsx`).
  - **Verify**: App shows a black view (Unity placeholder).

### 3.2 Unity Side — Message Receiver
- [ ] **Create `RNBridge.cs`** — 30 min
  - Path: `unity/Assets/Scripts/RNBridge.cs`
  - Expected skeleton:
    ```csharp
    using UnityEngine;
    using System.Runtime.InteropServices;

    public class RNBridge : MonoBehaviour {
        #if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void _SendMessageToRN(string json);
        #endif

        public void ReceiveFromRN(string message) {
            // message format: "SetFoodId|apple"
            var parts = message.Split('|');
            if (parts[0] == "SetFoodId") {
                PlayerPrefs.SetString("currentFoodId", parts[1]);
                Debug.Log("[RN→Unity] SetFoodId: " + parts[1]);
            }
        }

        public static void SendToRN(string type, string payload) {
            string json = $"{{\"type\":\"{type}\",\"payload\":{payload}}}";
            #if UNITY_IOS && !UNITY_EDITOR
            _SendMessageToRN(json);
            #endif
            Debug.Log("[Unity→RN] " + json);
        }
    }
    ```
  - Attach to a new empty GameObject `RNBridge` in `Jungle.unity`.

- [ ] **Hook RNBridge into marker detection** — 15 min
  - In `MarkerSpawner.cs`, inside `Spawn(ARTrackedImage img)`:
    ```csharp
    var id = img.referenceImage.name;
    var go = Instantiate(elephantPrefab, img.transform);
    go.transform.localPosition = Vector3.zero;
    RNBridge.SendToRN("MarkerFound", $"\"{id}\"");
    ```
  - **Verify**: Script compiles cleanly.

### 3.3 iOS Native Bridge
- [ ] **Add Objective-C bridge method** — 30 min
  - File: `ios/<ProjectName>/UnityMessageManager.mm` (create if missing).
  - Content template:
    ```objc
    #import <React/RCTBridgeModule.h>
    #import <React/RCTEventEmitter.h>

    @interface UnityMessageManager : RCTEventEmitter <RCTBridgeModule>
    @end

    @implementation UnityMessageManager
    RCT_EXPORT_MODULE();

    - (NSArray<NSString *> *)supportedEvents { return @[@"onUnityMessage"]; }

    RCT_EXPORT_METHOD(SendMessage:(NSString *)gameObject method:(NSString *)method message:(NSString *)message) {
        UnitySendMessage([gameObject UTF8String], [method UTF8String], [message UTF8String]);
    }
    @end
    ```
  - **Verify**: File added to Xcode project (on Mac Day).

### 3.4 Day 3 Wrap-Up
- [ ] **Git commit** — 5 min
  - `git add -A && git commit -m "Day 3: RN-Unity bridge (Windows-stubbed)"`
- [ ] **Update progress table** — 2 min
- [ ] **Document any deferred Mac steps** — 5 min
  - Add to `docs/documenter/IOS_BUILD_NOTES.md`:
    - "RNBridge.mm needs to be added to Xcode project on Mac day".

**Day 3 deliverable**: Code-level RN↔Unity bridge exists; only iOS Xcode linking remains (deferred to Mac day).

---

## Day 4 — Backend API Integration
**Goal**: RN fetches food data from existing web API and passes it into Unity.

### 4.1 API Client Setup
- [ ] **Create typed API client** — 45 min
  - Path: `src/api/foods.ts`
  - Expected content:
    ```ts
    export type Food = {
      id: string;
      name: string;
      category: string;
      description: string;
      nutrition: { calories: number; protein: number; carbs: number; fat: number };
      arMarkerImageUrl: string;
      modelAssetName: string;
    };

    const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

    export async function fetchFoods(): Promise<Food[]> {
      const r = await fetch(`${BASE}/foods`);
      if (!r.ok) throw new Error(`fetchFoods failed: ${r.status}`);
      return r.json();
    }

    export async function fetchFoodById(id: string): Promise<Food> {
      const r = await fetch(`${BASE}/foods/${id}`);
      if (!r.ok) throw new Error(`fetchFoodById failed: ${r.status}`);
      return r.json();
    }
    ```
  - **Verify**: `npx tsc --noEmit` passes.

- [ ] **Add `.env` support** — 15 min
  - Install (already should be present): `npm install react-native-dotenv`.
  - Create `.env` at project root:
    ```
    API_BASE_URL=http://localhost:3000/api
    ```
  - **Verify**: Add `import { API_BASE_URL } from '@env';` works without TS error.

### 4.2 Fetch Hook
- [ ] **Create `useFood(id)` hook** — 30 min
  - Path: `src/hooks/useFood.ts`
  - Expected content:
    ```ts
    import { useEffect, useState } from 'react';
    import { fetchFoodById, Food } from '../api/foods';

    export function useFood(id: string | null) {
      const [food, setFood] = useState<Food | null>(null);
      const [error, setError] = useState<string | null>(null);
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        fetchFoodById(id)
          .then((f) => { if (!cancelled) setFood(f); })
          .catch((e) => { if (!cancelled) setError(String(e)); })
          .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
      }, [id]);

      return { food, error, loading };
    }
    ```
  - **Verify**: Hook compiles; manual test in `App.tsx` returns mock data.

### 4.3 Pass Food Data to Unity
- [ ] **Update `<UnityARView />` to accept food payload** — 30 min
  - Modify `src/components/UnityARView.tsx`:
    ```tsx
    import { useEffect } from 'react';
    import { Food } from '../api/foods';

    type Props = {
      food: Food | null;
      onAREvent: (event: { type: string; payload: any }) => void;
    };

    export const UnityARView: React.FC<Props> = ({ food, onAREvent }) => {
      useEffect(() => {
        if (!food) return;
        const json = JSON.stringify(food);
        // RN-Unity bridge payload format: "MethodName|payload"
        viewRef.current?.postMessage?.('ReceiveFromRN', `SetFoodData|${json}`);
      }, [food]);
      // ... rest of component
    };
    ```
  - **Verify**: TS still compiles.

- [ ] **Unity side parses JSON payload** — 20 min
  - Modify `RNBridge.cs` `ReceiveFromRN`:
    ```csharp
    public void ReceiveFromRN(string message) {
        if (message.StartsWith("SetFoodData|")) {
            string json = message.Substring("SetFoodData|".Length);
            PlayerPrefs.SetString("currentFoodJson", json);
            Debug.Log("[RN→Unity] SetFoodData: " + json);
        }
    }
    ```
  - **Verify**: Compiles in Unity.

### 4.4 Mock Offline Mode
- [ ] **Add fallback food list** — 20 min
  - Path: `src/api/foods.mock.ts`
  - Include 3 hard-coded foods (apple, banana, carrot) so demo works offline.
  - In `fetchFoods()` catch block: `console.warn('[API] using mock data'); return MOCK_FOODS;`
  - **Verify**: When API is down, app still loads with mock data.

### 4.5 Day 4 Wrap-Up
- [ ] **Git commit** — 5 min
  - `git add -A && git commit -m "Day 4: API client + food data flow into Unity"`
- [ ] **Update progress table** — 2 min
- [ ] **Write `docs/documenter/API_INTEGRATION.md`** — 30 min
  - Document base URL, endpoints used, mock fallback, env vars.

**Day 4 deliverable**: Food data flows from web API → RN → Unity (JSON payload ready for Unity to parse).

---

## Day 5 — UI Polish + Navigation
**Goal**: Production-feel screens — food list, food detail, AR screen — with clean navigation.

### 5.1 Install Navigation Library
- [ ] **Add React Navigation** — 30 min
  - `npm install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context`
  - **Verify**: `package.json` shows the new deps.

### 5.2 Screen Inventory
- [ ] **Create `FoodListScreen.tsx`** — 60 min
  - Path: `src/screens/FoodListScreen.tsx`
  - Requirements:
    - Fetches list from `fetchFoods()`.
    - Renders flat list of cards (name, image, category badge).
    - Tap → navigate to detail with `food.id`.
    - Pull-to-refresh.
    - Loading + error states.
  - **Verify**: Visible in simulator, taps navigate.

- [ ] **Create `FoodDetailScreen.tsx`** — 60 min
  - Path: `src/screens/FoodDetailScreen.tsx`
  - Requirements:
    - Shows nutrition facts (calories, protein, carbs, fat).
    - Description text block.
    - Big "Start AR Lesson" button → navigates to `ARScreen` with `food.id`.
    - Hero image at top.
  - **Verify**: All four nutrition values visible, button navigates.

- [ ] **Update `ARScreen.tsx` to receive foodId via route** — 30 min
  - Replace the hard-coded `foodId="apple"` with route param: `route.params.foodId`.
  - Use `useFood(foodId)` hook to fetch the food.
  - Show a loading spinner until food arrives.
  - **Verify**: Navigating from detail with different IDs loads different food data.

### 5.3 Navigation Stack
- [ ] **Wire navigation in `App.tsx`** — 30 min
  - Path: `App.tsx`
  - Expected skeleton:
    ```tsx
    import { NavigationContainer } from '@react-navigation/native';
    import { createNativeStackNavigator } from '@react-navigation/native-stack';
    import { FoodListScreen } from './src/screens/FoodListScreen';
    import { FoodDetailScreen } from './src/screens/FoodDetailScreen';
    import { ARScreen } from './src/screens/ARScreen';

    const Stack = createNativeStackNavigator();

    export default function App() {
      return (
        <NavigationContainer>
          <Stack.Navigator initialRouteName="FoodList">
            <Stack.Screen name="FoodList" component={FoodListScreen} />
            <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
            <Stack.Screen name="AR" component={ARScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      );
    }
    ```
  - **Verify**: App opens on list, taps navigate through the stack.

### 5.4 Visual Polish
- [ ] **Pick a color palette** — 15 min
  - Define 4 colors in `src/theme.ts`:
    ```ts
    export const theme = {
      bg: '#FAFAF7',
      card: '#FFFFFF',
      primary: '#2E7D32',
      accent: '#FF8F00',
      text: '#1B1B1B',
      muted: '#6B6B6B',
    };
    ```
  - Use `primary` for buttons, `accent` for AR CTA, `muted` for nutrition labels.
  - **Verify**: All screens share consistent colors.

- [ ] **Add food card image** — 20 min
  - Use a simple `<Image source={{ uri: food.thumbnailUrl }} />` with rounded corners.
  - **Verify**: Images load (or fall back gracefully).

- [ ] **Polish AR loading state** — 20 min
  - While `food` is loading on `ARScreen`, show centered `<ActivityIndicator />` with "Preparing AR lesson…" text.
  - **Verify**: Spinner shows for ~500ms then disappears.

### 5.5 Day 5 Wrap-Up
- [ ] **Git commit** — 5 min
  - `git add -A && git commit -m "Day 5: navigation + UI polish"`
- [ ] **Update progress table** — 2 min
- [ ] **Screenshot all three screens** → `docs/documenter/screenshots/day5-*.png`.

**Day 5 deliverable**: Three polished screens with smooth navigation and shared visual language.

---

## Day 6 — Test + Bug Fixes
**Goal**: Find and fix every blocking bug before Mac day.

### 6.1 Smoke Test Pass
- [ ] **Cold-start app from `npm start` + simulator** — 15 min
  - Run: `npx react-native start --reset-cache`
  - Boot simulator.
  - **Verify**: App opens to FoodList within 5 seconds.

- [ ] **Walk full happy path** — 30 min
  - [ ] FoodList loads with ≥ 3 foods.
  - [ ] Tap a food → detail loads with image and nutrition.
  - [ ] Tap "Start AR Lesson" → AR screen loads.
  - [ ] AR screen shows loading spinner, then `<UnityARView />`.
  - [ ] Back button returns to detail.
  - [ ] Back from detail returns to list with scroll position preserved.
  - **Verify**: Each step works without red error overlays.

### 6.2 Edge Case Tests
- [ ] **Offline mode** — 10 min
  - Disable Wi-Fi, kill and restart app.
  - **Verify**: Mock food list still loads, no crash.

- [ ] **Bad food ID** — 10 min
  - Manually navigate to `FoodDetail` with `food.id = "does-not-exist"`.
  - **Verify**: Error UI shows "Food not found" with retry button.

- [ ] **Long food name overflow** — 10 min
  - Temporarily set a food with 60-character name.
  - **Verify**: Text wraps or truncates with ellipsis — no layout breakage.

- [ ] **Rapid back-tap** — 10 min
  - Tap "Start AR" then immediately back-tap 3×.
  - **Verify**: No "navigation state malformed" warning in console.

### 6.3 Bug Fixes
- [ ] **Bug 1**: <describe> — <time>
- [ ] **Bug 2**: <describe> — <time>
- [ ] **Bug 3**: <describe> — <time>
- [ ] **Bug 4**: <describe> — <time>
- [ ] **Bug 5**: <describe> — <time>
- (Add more as discovered. Aim for ≤ 5 — anything bigger should be a Day 7 emergency.)

### 6.4 Performance Check
- [ ] **Measure FoodList render time** — 15 min
  - Add `console.time('FoodList render')` at top of component.
  - **Verify**: Initial render < 200ms for 20 items.

- [ ] **Verify no console warnings** — 10 min
  - Scan Metro logs for any yellow warnings.
  - **Verify**: 0 warnings related to keys, deprecated APIs, or missing dependencies.

### 6.5 Day 6 Wrap-Up
- [ ] **Git commit** — 5 min
  - `git add -A && git commit -m "Day 6: smoke tests + bug fixes"`
- [ ] **Update progress table** — 2 min
- [ ] **Write `docs/documenter/BUG_LOG.md`** with all bugs found and their resolutions.

**Day 6 deliverable**: App is stable on the iOS simulator, ≥ 80% of happy path works, no critical bugs.

---

## Day 7 — Mac Day: Final iOS Build
**Goal**: Real iOS device build that runs Unity AR with the elephant.

> ⚠️ This is the **only Mac day**. Every step matters. Budget 10 hours.

### Hour-by-Hour Schedule

#### 08:00–09:00 — Setup & Sync (1 hr)
- [ ] **08:00** — Open terminal, navigate to cloned repo on Mac.
- [ ] **08:05** — `git pull` → verify latest commit is Day 6.
- [ ] **08:15** — `npm install` (fresh install on Mac).
  - **Verify**: 0 errors.
- [ ] **08:30** — `cd ios && pod install`.
  - **Verify**: Pod install completes, `Pods/` folder created.
- [ ] **08:50** — `cd .. && npx react-native start` in background terminal.
  - **Verify**: Metro starts on 8081.

#### 09:00–10:00 — Unity iOS Build (1 hr)
- [ ] **09:00** — Open Unity Hub, open `unity/` project.
  - **Verify**: Unity opens, scripts compile.
- [ ] **09:10** — File → Build Settings → Switch platform to iOS.
  - **Verify**: Target list updates, iOS icon appears as current.
- [ ] **09:15** — Player Settings → Other Settings → set:
  - Bundle Identifier: `com.<yourname>.arfood`
  - Camera Usage Description: "Used for AR food education"
  - Target iOS Version: 15.0
- [ ] **09:25** — Build → save to `unity/Builds/iOS/`.
  - **Verify**: Xcode project generated, no errors in Unity Console.
- [ ] **09:50** — Open generated `unity/Builds/iOS/Unity-iPhone.xcodeproj` in Xcode.
  - **Verify**: Xcode opens, target shown.

#### 10:00–11:30 — Xcode Integration (1.5 hr)
- [ ] **10:00** — Add `UnityMessageManager.mm` to Xcode target (drag from `ios/<ProjectName>/`).
  - **Verify**: File listed under "Compile Sources" in Build Phases.
- [ ] **10:20** — Verify bridging header exists at `ios/<ProjectName>/-<ProjectName>-Bridging-Header.h`.
  - Content must include:
    ```objc
    #import <React/RCTBridgeModule.h>
    #import <React/RCTEventEmitter.h>
    ```
- [ ] **10:40** — In Info.plist, add `NSCameraUsageDescription`:
  - Key: `Privacy - Camera Usage Description`
  - Value: "Used for AR food education"
- [ ] **11:00** — Connect iPhone via USB, trust computer.
  - **Verify**: iPhone appears in Xcode device list.
- [ ] **11:20** — Select iPhone as build target, sign with personal team.
  - **Verify**: No signing errors in Xcode.

#### 11:30–12:30 — First Build & Deploy (1 hr)
- [ ] **11:30** — Press ⌘B to build.
  - **Verify**: Build succeeds (may take 15–25 min first time).
- [ ] **12:15** — Press ⌘R to run on device.
  - **Verify**: App launches, Unity AR camera feed shows.
- [ ] **12:25** — Point iPhone at printed apple image.
  - **Verify**: Elephant appears within 2 seconds, "MarkerFound" log appears.

> ☕ Take a 30-min lunch break here.

#### 13:00–14:00 — End-to-End Test (1 hr)
- [ ] **13:00** — Test full happy path on real device:
  - [ ] Cold-launch app.
  - [ ] Browse FoodList (use mock data if API down).
  - [ ] Tap a food → see detail.
  - [ ] Tap "Start AR Lesson" → camera launches.
  - [ ] Point at marker → elephant spawns.
  - [ ] Take photo / screenshot for demo.
- [ ] **13:45** — Verify food data shows up in Unity via JSON.
  - Look at Xcode console for `[RN→Unity] SetFoodData:` log.
- [ ] **13:55** — Document any device-only bugs.

#### 14:00–15:00 — Bug Fix Round 2 (1 hr)
- [ ] **14:00** — Fix any device-specific issues (most likely: camera permission flow, AR session re-init).
- [ ] **14:30** — Rebuild + redeploy if needed.
- [ ] **14:55** — Final smoke test on device.

#### 15:00–16:00 — Archive Demo Build (1 hr)
- [ ] **15:00** — Product → Archive → wait for archive to complete.
- [ ] **15:20** — Distribute App → Development → Export.
  - Save `.ipa` to `~/Desktop/ARFoodDemo.ipa`.
- [ ] **15:30** — Verify `.ipa` installs via Xcode → Devices on a clean test device.
- [ ] **15:45** — Take device screenshots:
  - `docs/documenter/screenshots/day7-food-list.png`
  - `docs/documenter/screenshots/day7-detail.png`
  - `docs/documenter/screenshots/day7-ar-elephant.png`

#### 16:00–17:00 — Documentation Sprint (1 hr)
- [ ] **16:00** — Write `docs/documenter/USER_GUIDE.md`:
  - How to launch the demo
  - How to print the marker image
  - Expected behavior per screen
- [ ] **16:20** — Write `docs/documenter/ARCHITECTURE.md`:
  - Diagram: RN ↔ Unity ↔ Web API
  - Component responsibilities
  - Data flow
- [ ] **16:40** — Update `README.md` with quick-start instructions.
- [ ] **16:55** — Git commit Day 7 work.

#### 17:00–18:00 — Defense Rehearsal (1 hr)
- [ ] **17:00** — Walk through demo script (see Demo Day section below).
- [ ] **17:20** — Practice the 3-minute pitch out loud.
- [ ] **17:40** — Time the full demo (target: ≤ 7 minutes).
- [ ] **17:55** — Final progress table update.

#### 18:00 — Mac Day Complete
- [ ] **18:00** — Push everything to remote: `git push origin main`.
- [ ] **18:05** — Copy `.ipa` and source archive to USB drive as backup.

**Day 7 deliverable**: A working `.ipa` installed on iPhone + complete documentation + defense-ready demo script.

---

## Pre-Demo Checklist (Day 8 morning, before defense)

> Run these the morning of your defense presentation.

- [ ] **Charge iPhone to 100%** — 10 min before leaving.
- [ ] **Print 2 copies of the marker image** (apple, 10cm × 10cm, color).
- [ ] **Verify `.ipa` still installs** on iPhone (5 min):
  - Connect iPhone → Xcode → Devices and Simulators → Install App.
  - Launch from home screen.
- [ ] **Test cold-launch on iPhone** — must open to FoodList in < 3 seconds.
- [ ] **Test marker detection** — point iPhone at printed card, elephant appears.
- [ ] **Disable iPhone notifications** (Settings → Notifications → off for demo app).
- [ ] **Disable auto-lock** (Settings → Display → Auto-Lock → Never).
- [ ] **Enable Do Not Disturb** during defense.
- [ ] **Airplane mode OFF** if you need network for API; airplane mode ON if using mock data.
- [ ] **Prepare backup `.ipa`** on USB drive + laptop.
- [ ] **Confirm presentation laptop has the same `.ipa`** (if defense room has different device).
- [ ] **Demo script printed on paper** — see below.

---

## Demo Day Emergency Plan

> Read this section before the defense starts.

### Failure Mode 1: App crashes on launch
**Symptom**: App opens, then closes immediately.
**Backup**:
- Reinstall `.ipa` from USB (2 min).
- If still crashing: switch to **Failure Mode 5** (video demo).

### Failure Mode 2: Unity AR doesn't initialize
**Symptom**: AR screen shows black void, no camera feed.
**Backup**:
- Verify camera permission granted (Settings → AR Food).
- Force-quit and relaunch app.
- If still broken: navigate back to FoodList, show the food detail UI as proof of integration, explain Unity component verbally.

### Failure Mode 3: Marker detection fails
**Symptom**: Pointing at marker, elephant doesn't appear.
**Backup**:
- Hold phone 30–60 cm away from marker, slow tilt.
- Try marker under bright direct light.
- Try the backup printed copy.
- If marker still won't track: open Xcode console on laptop (if projected), show the `[AR] Spawned for: apple` log from a previous test run.

### Failure Mode 4: Backend API unreachable
**Symptom**: FoodList shows error.
**Backup**:
- App already has mock data fallback (Day 4 work) — wait 2 seconds, list should reload with mock foods.
- If even mock fails: hard-coded `FoodDetailScreen` view via direct deep link (if you implement one in Day 6).

### Failure Mode 5: Complete technical failure
**Symptom**: Nothing works. Phone is dead. Mac crashed.
**Backup**:
- Switch to **video demo**: pre-record a 90-second screen recording of the app working on iPhone.
  - Save to USB: `demo_backup.mp4`.
- Show architecture diagram from `docs/documenter/ARCHITECTURE.md`.
- Explain the code components verbally.

### Failure Mode 6: Time pressure
**Symptom**: Demo running long, judges look impatient.
**Backup**:
- Skip FoodList, jump directly to AR screen.
- Say: "I'll demonstrate the AR experience first since it's the centerpiece."
- Save FoodList/Detail for the Q&A if asked.

### Failure Mode 7: Q&A question you can't answer
**Backup**:
- "Great question — I'd need to research that. Based on what I implemented, here's the design choice I made: <explain your actual choice>."
- Never bluff. Reference code on laptop if needed.

---

## Demo Script (Print This)

> **Total time: 7 minutes**

**0:00 — Opening (30 sec)**
> "AR Food Education turns real food packaging into interactive 3D lessons. Today I'll show you a complete pipeline: web API → React Native → Unity → ARKit, with a real elephant model that spawns when you point your phone at a food card."

**0:30 — Food List (1 min)**
- Show FoodList on iPhone.
- Tap apple → FoodDetail loads.
- Tap "Start AR Lesson".

**1:30 — AR Experience (3 min)**
- iPhone launches camera, scanning mode.
- Point at printed apple card.
- **Elephant appears in 3D over the card.**
- Slowly tilt phone — elephant stays anchored.

**4:30 — Architecture (1.5 min)**
- Open `docs/documenter/ARCHITECTURE.md` on laptop.
- Walk through the data flow diagram: Web API → RN → Unity → ARKit.
- Show `MarkerSpawner.cs` and `RNBridge.cs` in editor.

**6:00 — Code Tour (1 min)**
- One file per layer: `src/api/foods.ts`, `src/components/UnityARView.tsx`, `unity/Assets/Scripts/MarkerSpawner.cs`.

**7:00 — Closing**
> "That's AR Food Education — built in 7 days on React Native + Unity + ARKit. Questions?"

---

## Progress Tracking Table

Update this daily. Use `✅` for done, `🟡` for partial, `❌` for skipped/blocked.

| Day | Date | Focus | Status | Hours Spent | Blockers | Commit Hash |
|-----|------|-------|--------|-------------|----------|-------------|
| 0 | Sat Jul 25 | Pre-flight checks | ⬜ Not started | – | – | – |
| 1 | Sun Jul 26 | RN bootstrap + Unity AR pkgs | ⬜ Not started | – | – | – |
| 2 | Mon Jul 27 | Unity image tracking | ⬜ Not started | – | – | – |
| 3 | Tue Jul 28 | RN ↔ Unity bridge | ⬜ Not started | – | – | – |
| 4 | Wed Jul 29 | Backend API integration | ⬜ Not started | – | – | – |
| 5 | Thu Jul 30 | UI polish + navigation | ⬜ Not started | – | – | – |
| 6 | Fri Jul 31 | Test + bug fixes | ⬜ Not started | – | – | – |
| 7 | Sat Aug 1 (Mac day) | Final iOS build | ⬜ Not started | – | – | – |
| 8 | Defense day | Presentation | ⬜ Not started | – | – | – |

### Status Codes
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- ❌ Skipped or blocked

---

## Definition of Done (Project-wide)

The project is "done" when **all** of these are true:

- [ ] iOS `.ipa` installs on a fresh iPhone and launches successfully.
- [ ] FoodList, FoodDetail, AR screens all render without errors.
- [ ] Unity scene detects at least one printed marker and spawns the elephant.
- [ ] RN ↔ Unity bridge passes food data both directions (verified in console logs).
- [ ] Backend API OR mock fallback serves food data.
- [ ] `docs/documenter/USER_GUIDE.md` and `docs/documenter/ARCHITECTURE.md` exist.
- [ ] Demo rehearsed at least twice end-to-end.
- [ ] Backup `.ipa` + backup video demo on USB drive.
- [ ] All tasks in this checklist checked off.

---

## Quick Reference — File Paths

```
e:\University\Graduted Project\Edu-platform\
├── App.tsx                              ← Day 5 navigation root
├── package.json                         ← Day 1 deps
├── .env                                 ← Day 4 API base URL
├── src/
│   ├── api/
│   │   ├── foods.ts                     ← Day 4 typed client
│   │   └── foods.mock.ts                ← Day 4 mock fallback
│   ├── components/
│   │   └── UnityARView.tsx              ← Day 3 + Day 4 bridge wrapper
│   ├── hooks/
│   │   └── useFood.ts                   ← Day 4 fetch hook
│   ├── screens/
│   │   ├── FoodListScreen.tsx           ← Day 5 list
│   │   ├── FoodDetailScreen.tsx         ← Day 5 detail
│   │   └── ARScreen.tsx                 ← Day 3 + Day 5 AR view
│   └── theme.ts                         ← Day 5 colors
├── ios/
│   └── <ProjectName>/
│       ├── UnityMessageManager.mm       ← Day 3 (Mac day adds to Xcode)
│       └── Info.plist                   ← Mac day adds Camera permission
├── unity/
│   ├── Assets/
│   │   ├── Models/Animals/Elephant.fbx  ← Day 2 (existing)
│   │   ├── Scenes/Jungle.unity         ← Day 2 modified
│   │   ├── StreamingAssets/ReferenceImages/apple.jpg  ← Day 2
│   │   └── Scripts/
│   │       ├── MarkerSpawner.cs         ← Day 2 spawn logic
│   │       └── RNBridge.cs              ← Day 3 RN ↔ Unity
│   └── Builds/iOS/                      ← Mac day Unity export
└── docs/
    └── documenter/
        ├── ENGINE_BUILD_EXECUTION_CHECKLIST.md  ← This file
        ├── IOS_BUILD_NOTES.md                    ← Day 1
        ├── API_INTEGRATION.md                    ← Day 4
        ├── BUG_LOG.md                            ← Day 6
        ├── USER_GUIDE.md                         ← Day 7
        ├── ARCHITECTURE.md                       ← Day 7
        └── screenshots/                          ← Days 1, 2, 5, 7
```

---

## Commit Message Convention

Use this format every day:

```
Day N: <one-line summary>

- <bullet 1>
- <bullet 2>
- <bullet 3>
```

Examples:
- `Day 1: project bootstrap + Unity AR packages`
- `Day 4: API client + food data flow into Unity`
- `Day 6: smoke tests + bug fixes`

---

## Notes & Decisions Log

> Use this space for in-flight decisions.

- **Decision 1**: <date> — <decision>
- **Decision 2**: <date> — <decision>
- **Decision 3**: <date> — <decision>

---

**Last updated**: Day 0 (Sat Jul 25, 2026)
**Owner**: <Your Name>
**Defense date**: <TBD>