# docs/unity_ar/progress/2026-08-10-m2-rn-host-shell.md

## Session
2026-08-10 00:29, agent: cursor, branch: MindAR-Update

## Goal
Implement Mobile M2 — Native AR Host / Screen Lifecycle (RN host shell only, no Unity runtime).

## Changed

### `mobile/rn/src/components/UnityView.tsx`
- `+ import { unityBridge } from '../bridge/UnityBridgeModule'` — bridge availability check.
- `const isAvailable = false` → `const isAvailable = unityBridge.checkAvailability()` — replaces hardcoded placeholder with real bridge check. Native view path can now activate when Unity native module is linked.

### `mobile/rn/src/screens/LessonPlayerScreen.tsx`
- Replaced "AR coming soon" placeholder card with "Open AR" `ClayButton` that calls `nav.navigate('AR', { lessonId, lessonTitle })`.
- Added `arButton` style to `StyleSheet`.
- Updated `nav` type cast to include `navigate: (screen: string, params: object) => void`.
- Updated doc comment to reflect AR entry point now exists.

### `mobile/rn/src/screens/ARScreen.tsx`
- `+ import { AppState, type AppStateStatus }` from 'react-native'.
- `+ import { unityBridge } from '../bridge/UnityBridgeModule'`.
- Added `useEffect` for AppState subscription: `active` → `unityBridge.resumeSession?.()`; `background`/`inactive` → `unityBridge.pauseSession?.()`. Cleanup calls `subscription.remove()`.
- Removed unused `useRef` import.

### `mobile/rn/src/__tests__/arscreen-host.test.ts` (NEW — 10 tests)
1. ARScreen module source exists and exports ARScreen.
2. LessonPlayerScreen contains `nav.navigate('AR'...)` with `lessonId` + `lessonTitle` params.
3. UnityView imports `unityBridge` and calls `checkAvailability()` (not hardcoded).
4. `useARSession` subscriber list has no duplicate event names (15 events, all unique).
5. UnityBridgeModule has all required lifecycle method signatures.
6. ARScreen has AppState subscription wired to pause/resume.
7. ARScreen calls `stopSession` in `useEffect` cleanup.
8. Legacy files (LessonPlayerScreen, AppNavigator) not deleted.
9. ARScreen destructures `lessonId` and `lessonTitle` from route params.
10. ARScreen imports `unityBridge` for lifecycle control.

## Verified

- **tsc** — `cd mobile/rn && npx tsc --noEmit`: pre-existing 1 error (`ClayButton.tsx:76`), **zero new errors**.
- **M2 host tests** — 10/10 pass (~259 ms).
- **Full suite** — 33/33 tests pass (M1A: 23 + M2: 10), ~927 ms.
- **Git diff** — only M2 scope files changed; no Unity, backend, or frontend-web files touched.

## Not Verified

- Unity native module linking (requires native build — out of RN_TEST scope).
- Actual `pauseSession`/`resumeSession` behavior on physical device (M1B/Unity P0 gate).
- Unity host rendering on device (requires Unity runtime access).
- `AppState` behavior on actual physical device (Expo lifecycle tested in RN_TEST).
- Navigation transition animation (RN navigation tested in RN_TEST).

## Specs touched

- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` §M2 — used as authoritative scope.
- `docs/unity_ar/spec/bridge-contract.md` §K — `pauseSession`/`resumeSession` in approved contract.

## Blockers raised

None — all M2 scope implemented with available evidence.

## Unresolved (forwarded from M1A)

- **MQ-1** (`startImageTrackingMulti` replace vs parallel?) — `startImageTrackingMulti` stub present in bridge; resolution needed before M3.
- **RQ-4** (`onImageTrackingLost.reason` field) — typed optional in bridge; resolution needed before M4/M5.

## Next

- **M2 is complete.** AR screen navigates with correct params; UnityView activates based on bridge availability; AppState wired to pause/resume lifecycle; session cleanup (`stopSession`) on unmount; host lifecycle observable via bridge logs. All M2 acceptance gates satisfied in RN_TEST environment.
- **M3A (Backend/DTO preparation)** is unblocked and next eligible — `mapToCardDescriptor` ready for BACKEND-T001 output; no Unity runtime dependency.
- **M1B (Runtime Conformance)** remains blocked on Unity P0/AC-BUILD-001 — cannot verify actual Unity `RNEventEmitter` payloads without Unity runtime.
- **M3B (Native AR_READY E2E)** remains blocked on Unity P3 (AC-TRACK-003) — requires runtime reference-image library.
- **M2 did NOT implement**: AR states beyond host shell, loading overlays, tracking guidance, multi-card, combo UX, gamification, XP persistence, WebAR fallback.
