# Phase Status — Unity AR Integration (Mobile Learner Track)

## Source
`docs/unity_ar/progress/2026-08-18-migration-status-reconciliation.md`

## R0–R7 Learner Migration ✅

All learner RN phases R0–R7 are complete per the learner migration plan.

## R12 — Native AR Product Integration ⚠️ PARTIAL

See `docs/unity_ar/spec/native-ar-integration.md` for ownership boundary.

**RN-side deliverables (this workspace):**
| Item | File | Status |
|------|------|--------|
| AR route `{lessonId, lessonTitle}` | `AppNavigator.tsx` | ✅ Done |
| "Practice in AR" button | `LessonPlayerScreen.tsx` | ⚠️ Still placeholder ("AR coming soon") |
| AR capability gating | `ARScreen.tsx` | ✅ `UnityBridge.checkAvailability()` |
| Product-level fallback | `UnityView.tsx` | ✅ Claymorphic placeholder |

**M2–M7 (owned by AR lane, now ✅ done):**
- M2: AR screen navigable ✅
- M3: Experience load flow ✅
- M4: Permissions UX ✅
- M5: Tracking guidance ✅
- M6: Multi-card & combo UX ✅
- M7: Gamification XP ✅

## M8 — Session Lifecycle ⚠️ RN done, Unity missing

**RN side (done):**
- `AppState` → `pauseSession`/`resumeSession` in `ARScreen.tsx` ✅
- `UnityBridgeModule.ts` `pauseSession`/`resumeSession` methods ✅

**Unity side (MISSING — needs implementation):**
- `RNMessageReceiver.cs` does NOT handle `pauseSession`/`resumeSession` messages
- No `OnApplicationPause` handler in Unity C#
- Blocking: AR session cannot survive app backgrounding

## M9 — Error, Recovery & WebAR Fallback ⚠️ Partial

**Done:**
- Error taxonomy (`BACKEND_METADATA_UNAVAILABLE`) ✅
- Permission error → overlay routing ✅
- `ARLoadingOverlay` error state ✅

**Missing:**
- WebAR fallback navigation (`onUseWebAR` is a no-op) ❌
- Exponential backoff retry logic ❌
- Backend error logging (`emitMobileDebug`) ❌

## M10 — Android E2E ⚠️ Blocked

- APK built (`app-debug.apk`) ✅
- Native bridge complete ✅
- Physical ARCore-certified device required ❌
- LG K42 from prior session is NOT ARCore certified ❌

## M11 — iOS E2E ⚠️ Blocked

- iOS Swift native module scaffolded ✅
- iOS Unity plugin (RNMessageRouter, RNEventEmitter) ✅
- Requires macOS + Xcode + physical iOS device ❌
- Cannot build iOS from Windows ❌

## R12 Next Action

1. Replace `LessonPlayerScreen` "AR coming soon" placeholder with real "Practice in AR" button
   - Check `lesson.arReference?.ar_tag` exists → show AR button
   - Navigate to `AR` route with `{lessonId, lessonTitle}`
2. Implement product-level fallback message when `UnityBridge.checkAvailability()` returns false
3. Wait for M8/M9 completion in AR lane

## Blockers

| Blocker | Affects | Raised |
|---------|---------|--------|
| Unity pause/resume handlers missing | M8 | `docs/unity_ar/blockers/2026-08-18-unity-pause-resume-missing.md` |
| WebAR fallback navigation not wired | M9 | |
| No ARCore-certified Android device | M10 | `docs/unity_ar/blockers/2026-08-13-lg-k42-android-device-gate.md` |
| No macOS + iOS hardware | M11 | |
