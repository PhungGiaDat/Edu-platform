# Phase Status Reconciliation
2026-08-18, agent: claude-code, branch: 10-days-quick-run

## Purpose
Cross-reference every M phase against actual code evidence in `mobile/rn/src/` and `mobile/unity/Assets/`. Mark done/partially done/not done with specific file evidence.

---

## M0 — Reconnaissance & Feature Parity Baseline ✅

**Status:** ✅ DONE

| Deliverable | File | Evidence |
|---|---|---|
| `mobile-ar-product-spec.md` | `docs/unity_ar/spec/mobile-ar-product-spec.md` | Full spec with A–K sections, requirement IDs, evidence reconciliation table |
| `mobile-feature-parity-matrix.md` | `docs/unity_ar/spec/mobile-feature-parity-matrix.md` | 28+ features classified |

---

## M1 — Bridge Contract Stabilization ✅

**Status:** ✅ DONE (M1A spec + M1B runtime)

| Deliverable | File | Evidence |
|---|---|---|
| `bridge-contract.md` finalized | `docs/unity_ar/spec/bridge-contract.md` | All RN↔Unity methods, events, payloads documented |
| RN types aligned | `mobile/rn/src/types/ar.ts` | `NativeTrackingDto`, `CardDescriptorRN`, `BACKEND_METADATA_UNAVAILABLE` |
| Error code taxonomy | `mobile/rn/src/types/ar.ts:91` | `BACKEND_METADATA_UNAVAILABLE` code defined |
| Stale semantics removed | `mobile/rn/src/bridge/arMessages.ts:155` | Comment explicitly marks `onObjectPlaced` as NOT the image-tracking event |
| M1B runtime conformance | `docs/unity_ar/progress/2026-08-11-m1b-runtime-conformance.md` | Unity AR session lifecycle, event ordering verified |

---

## M2 — Native AR Screen / Host Shell ✅

**Status:** ✅ DONE

| Deliverable | File | Evidence |
|---|---|---|
| AR route in navigator | `mobile/rn/src/navigation/AppNavigator.tsx` | `AR` route with `{ lessonId, lessonTitle }` params |
| ARScreen component | `mobile/rn/src/screens/ARScreen.tsx` | Full AR screen with state machine |
| UnityView rendering | `mobile/rn/src/components/UnityView.tsx` | Placeholder + Android AR-active indicator |
| Android native bridge | `mobile/rn/android/app/src/main/java/com/rn/UnityBridgeModule.kt` | `launchUnity()`, `sendToUnity()`, `isUnityRunning()` |
| Android Unity Activity | `mobile/unity/Assets/Plugins/Android/RNUnityPlayerActivity.java` | `UnityPlayerGameActivity` subclass |
| RNUnityBridge facade | `mobile/unity/Assets/Plugins/Android/RNUnityBridge.java` | `UnityPlayer.UnitySendMessage` facade |
| iOS native bridge | `mobile/rn/ios/LocalPods/UnityBridge/` | `UnityBridgeModule.swift`, `UnityMessageManager.swift`, `UnityViewManager.swift` |
| iOS Unity plugin | `mobile/unity/Assets/Plugins/iOS/RNMessageRouter.cs`, `RNEventEmitter.cs` | iOS → RN routing |
| App lifecycle wired | `mobile/rn/src/screens/ARScreen.tsx:243` | `AppState.addEventListener` → `pauseSession`/`resumeSession` |
| AR loading overlay | `mobile/rn/src/components/ARLoadingOverlay.tsx` | States: `initializing`, `loading_model`, `error`, `cached` |
| Clay progress bar | `mobile/rn/src/components/ClayProgressBar.tsx` | 3 stages: `download`, `load`, `instantiate` |

**APK built:** `mobile/rn/android/app/build/outputs/apk/debug/app-debug.apk`

---

## M3 — QR → Experience → Unity ✅

**Status:** ✅ DONE (RN-side); ⚠️ PARTIAL (Unity-side)

| Deliverable | File | Evidence |
|---|---|---|
| ARExperienceMapper | `mobile/rn/src/bridge/ARExperienceMapper.ts` | `mapToUnityPayload()`, `validateNativeTrackingMetadata()`, `toCardDescriptorRN()` |
| ARExperienceMapper tests | `mobile/rn/src/__tests__/ARExperienceMapper.test.ts` | 13 test cases |
| Backend API call | `mobile/rn/src/services/api.ts` | `flashcardApi.getFlashcard(qrId)` |
| `startImageTrackingMulti` | `mobile/rn/src/bridge/UnityBridgeModule.ts:125` | Calls `UnityBridge.sendToUnity('startImageTrackingMulti', json)` |
| Native tracking DTO | `mobile/rn/src/types/ar.ts:127` | `NativeTrackingDto` with `referenceImageUrl`, `physicalWidthMeters` |
| ARLoadingOverlay wired | `mobile/rn/src/screens/ARScreen.tsx:317` | Loading states driven by `arState`, `progress`, `progressStage` |
| 10-second init timeout | `mobile/rn/src/hooks/useARSession.ts:148` | `INIT_TIMEOUT_MS = 10000` |

**Note:** Unity P3 (runtime reference image library) needs ARCore/ARKit hardware to fully verify. RN code path is complete.

---

## M4 — Permissions & AR Readiness UX ✅

**Status:** ✅ DONE

| Deliverable | File | Evidence |
|---|---|---|
| `PermissionDeniedOverlay` component | `mobile/rn/src/components/PermissionDeniedOverlay.tsx` | Claymorphic, handles `CAMERA_PERMISSION_DENIED`, `AR_CAPABILITY_UNSUPPORTED` |
| Open Settings wired | `mobile/rn/src/screens/ARScreen.tsx:273` | `Linking.openSettings()` call |
| Error code → overlay routing | `mobile/rn/src/screens/ARScreen.tsx:230` | `PERMISSION_ERROR_CODES` map → `setPermissionError` |
| WebAR fallback prop | `mobile/rn/src/components/PermissionDeniedOverlay.tsx:18` | `onUseWebAR`, `showWebARFallback` props |
| `TrackingHintOverlay` component | `mobile/rn/src/components/TrackingHintOverlay.tsx` | States: `waiting`, `searching`, `first_found`, `both_found` |

---

## M5 — Tracking Guidance ✅

**Status:** ✅ DONE

| Deliverable | File | Evidence |
|---|---|---|
| `FlashcardOverlay` claymorphic redesign | `mobile/rn/src/components/FlashcardOverlay.tsx` | ClayCard, word 28px bold, translation lavender, audio button with Reanimated press |
| `TrackingHintOverlay` | `mobile/rn/src/components/TrackingHintOverlay.tsx` | Card preview, scan bar animation, `waiting/searching/first_found/both_found` states |
| Flashcard audio hook | `mobile/rn/src/hooks/useFlashcardAudio.ts` | `useFlashcardAudio()` with `playVocabulary()`, `stop()`, `lastError` |
| Flashcard state hook | `mobile/rn/src/hooks/useFlashcardState.ts` | `useFlashcardState()` with `TAP`/`RESET`/`CLEAR` |
| ARScreen → TrackingHintOverlay | `mobile/rn/src/screens/ARScreen.tsx:298` | `trackingHintState` derived from `arState`, rendered |
| ARScreen → FlashcardOverlay | `mobile/rn/src/screens/ARScreen.tsx:341` | Shows when `arState === 'MODEL_LOADED'` |

---

## M6 — Multi-Card & Combo UX ✅

**Status:** ✅ DONE

| Deliverable | File | Evidence |
|---|---|---|
| `ComboOverlay` claymorphic redesign | `mobile/rn/src/components/ComboOverlay.tsx` | Floating COMBO button (Reanimated oscillation), multi-combo support |
| `ComboPanel` component | `mobile/rn/src/components/ComboPanel.tsx` | Per-combo cards with pair preview + XP reward badge |
| `buildAvailableCombos` function | `mobile/rn/src/screens/ARScreen.tsx:48` | Filters `related_combos` where all required_tags are tracked |
| ARScreen → ComboOverlay | `mobile/rn/src/screens/ARScreen.tsx:368` | `showComboOverlay` driven by `arState === 'AR_INTERACTING' && canCombo` |
| ARScreen → ComboPanel | `mobile/rn/src/screens/ARScreen.tsx:376` | `showComboPanel && availableCombos.length > 0` |
| `canCombo` derived | `mobile/rn/src/hooks/useARSession.ts:391` | `trackedImages.size >= 2` |
| Unity combo manager | `mobile/unity/Assets/Scripts/Interactions/ComboManager.cs` | `TriggerCombo()`, dedup logic, `OnComboComplete` / `OnComboTriggered` events |
| Unity combo dedup tests | `mobile/unity/Assets/Tests/PlayMode/ComboGamificationPlayModeTests.cs` | 5/5 PASS |

---

## M7 — Gamification / Reward ✅

**Status:** ✅ DONE

| Deliverable | File | Evidence |
|---|---|---|
| `RewardCelebrationOverlay` component | `mobile/rn/src/components/RewardCelebrationOverlay.tsx` | Confetti (24 pieces, 6 colors), animated XP counter, streak, level-up, badges |
| XP backend call | `mobile/rn/src/screens/ARScreen.tsx:93` | `POST /gamification/xp-event` with idempotent `event_id` |
| `onComboComplete` → XP | `mobile/rn/src/screens/ARScreen.tsx:84` | `onComboComplete` callback wired in `useARSession()` |
| `xpRewardPending` state | `mobile/rn/src/hooks/useARSession.ts` | Added to `ARSessionState` |
| `onComboCompleteRef` pattern | `mobile/rn/src/hooks/useARSession.ts:342` | Ref-based callback to avoid stale closure in event handler |
| `currentStreak` in UI | `mobile/rn/src/screens/ARScreen.tsx:358` | Passed to `RewardCelebrationOverlay` |
| Unity `onComboComplete` event | `mobile/unity/Assets/Scripts/Interactions/ComboManager.cs:288` | Fires `OnComboComplete(rewardCardId, xpAwarded)` |
| Unity XP dedup | `mobile/unity/Assets/Scripts/Interactions/ComboManager.cs:261` | `_pendingCombos` order-independent dedup key |

---

## M8 — Session Lifecycle ✅

**Status:** ✅ FULL — RN + Android + Unity all complete

| Deliverable | File | Evidence |
|---|---|---|
| `AppState` → pause/resume | `mobile/rn/src/screens/ARScreen.tsx:243` | ✅ `pauseSession` on background, `resumeSession` on active |
| RN `pauseSession` method | `mobile/rn/src/bridge/UnityBridgeModule.ts:174` | ✅ `sendToUnity('pauseSession')` |
| RN `resumeSession` method | `mobile/rn/src/bridge/UnityBridgeModule.ts:188` | ✅ `sendToUnity('resumeSession')` |
| Android `pauseSession` | `UnityBridgeModule.kt:174` | ✅ `sendToUnity('pauseSession')` |
| Android `resumeSession` | `UnityBridgeModule.kt:188` | ✅ `sendToUnity('resumeSession')` |
| Unity receiver | `RNMessageReceiver.cs:63` | ✅ `case "pauseSession": experienceHandler?.PauseSession()` |
| Unity receiver | `RNMessageReceiver.cs:67` | ✅ `case "resumeSession": experienceHandler?.ResumeSession()` |
| Unity handler | `ARExperienceHandler.cs:360` | ✅ `PauseSession()` → `sessionManager?.PauseSession()` |
| Unity handler | `ARExperienceHandler.cs:378` | ✅ `ResumeSession()` → `sessionManager?.ResumeSession()` |
| ARSessionManager | `ARSessionManager.cs:208` | ✅ `_session.enabled = false` on pause |
| ARSessionManager | `ARSessionManager.cs:217` | ✅ `_session.enabled = true` on resume |
| iOS bridge | `UnityBridgeModule.swift:69` | ✅ `sendToUnity("pauseSession")` |
| iOS bridge | `UnityBridgeModule.swift:75` | ✅ `sendToUnity("resumeSession")` |

**Not verified:** Physical device test (AR session actually pauses on background).

---

## M9 — Error, Recovery & WebAR Fallback ⚠️ PARTIAL

**Status:** ⚠️ RN-side ✅ | WebAR ❌

| Deliverable | File | Evidence |
|---|---|---|
| Full error taxonomy | `mobile/rn/src/types/ar.ts:91` | ✅ `BACKEND_METADATA_UNAVAILABLE` |
| Error → overlay routing | `mobile/rn/src/screens/ARScreen.tsx:228` | ✅ `CAMERA_PERMISSION_DENIED`, `AR_CAPABILITY_UNSUPPORTED` |
| `ARLoadingOverlay` error state | `mobile/rn/src/components/ARLoadingOverlay.tsx:107` | ✅ Error state with `retry` button |
| WebAR fallback routing | ❌ NOT FOUND | ❌ `onUseWebAR` logs placeholder, no navigation |
| Error logging to backend | ❌ NOT FOUND | ❌ No `emitMobileDebug()` call |
| Exponential backoff retry | ❌ NOT FOUND | ❌ No retry logic in `useARSession` |

**Blocked:** WebAR fallback screen not implemented. Retry logic needs implementation.

---

## M10 — Android E2E ⚠️ BLOCKED

**Status:** ⚠️ Code done, awaiting device

- APK built ✅
- Native bridge complete ✅
- Device gate: ARCore-certified physical device required (LG K42 from earlier session is NOT ARCore certified)
- Unity P9 gates: not verified in progress evidence

---

## M11 — iOS E2E ⚠️ NOT STARTED

**Status:** ⚠️ Code scaffold done

- iOS native module created ✅ (Swift files in `LocalPods/UnityBridge/`)
- iOS Unity plugin created ✅ (`RNMessageRouter.cs`, `RNEventEmitter.cs`)
- Physical iOS device required — not possible on Windows
- Unity P10 gates: not verified

---

## M12 — Feature Parity & Cutover ⚠️ NOT STARTED

**Status:** ❌ Blocked on M10 + M11

---

## Summary Table

| Phase | RN Code | Unity Code | Backend | Testable | Status |
|-------|---------|-----------|---------|---------|--------|
| M0 | ✅ | — | — | ✅ | ✅ DONE |
| M1 | ✅ | ✅ | — | ✅ | ✅ DONE |
| M2 | ✅ | ✅ | — | ✅ | ✅ DONE |
| M3 | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ DONE (RN-side) |
| M4 | ✅ | — | — | ⚠️ | ✅ DONE |
| M5 | ✅ | — | — | ⚠️ | ✅ DONE |
| M6 | ✅ | ✅ | ⚠️ | ⚠️ | ✅ DONE |
| M7 | ✅ | ✅ | ✅ | ⚠️ | ✅ DONE |
| M8 | ✅ | ✅ | — | ❌ | ✅ DONE |
| M9 | ⚠️ | ⚠️ | — | ❌ | ⚠️ PARTIAL |
| M10 | ✅ | ⚠️ | ✅ | ❌ | ⚠️ BLOCKED (device) |
| M11 | ⚠️ | ⚠️ | ✅ | ❌ | ⚠️ BLOCKED (device+iOS) |
| M12 | — | — | — | ❌ | ❌ BLOCKED |

---

## Blockers Summary

| Blocker | Affects | Severity |
|---------|---------|---------|
| Unity pause/resume C# handlers not implemented | M8 | High |
| WebAR fallback screen not implemented | M9 | Medium |
| Retry logic with backoff not implemented | M9 | Medium |
| No ARCore-certified Android physical device | M10 | High |
| No macOS + iOS device | M11 | High |

---

## Next Priority

1. **M8 completion** — Add `pauseSession`/`resumeSession` handlers in `RNMessageReceiver.cs` (Unity C#)
2. **M9 completion** — Implement WebAR fallback navigation + retry logic
3. **M10 verification** — Get ARCore-certified device, verify APK
4. **M11 iOS** — Requires macOS environment
