## Status
draft

## Target spec
- `docs/unity_ar/spec/mobile-ar-product-spec.md`
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md`
- `docs/unity_ar/spec/architecture-specification.md`
- `docs/unity_ar/spec/bridge-contract.md`
- `docs/unity_ar/spec/backend-contract.md`

---

## Overview

This plan governs React Native mobile product behavior for native Unity AR. It is separate from the Unity engine migration plan. Both plans must be coordinated via the master orchestration plan.

**Core principle:** React Native owns navigation, permissions UX, session lifecycle, and authenticated backend mutations. Unity owns AR session, image tracking, spatial rendering, and gameplay events. Backend owns persistent state.

---

## Phase Summary

| Phase | Title | Mobile Deliverable | Unity Gate | Backend Gate |
|-------|-------|-------------------|-----------|-------------|
| M0 | Reconnaissance & Contract Baseline | Feature parity matrix | P0 (stabilization) | — |
| M1 | Bridge Contract Stabilization | RN ↔ Unity message contract finalized | P1 (XR sim) | — |
| M2 | Native AR Screen / Host Shell | AR screen navigable, Unity loads | P0 complete | — |
| M3 | QR → Experience → Unity | Experience load flow + loading UX | P1 (XR sim) | — |
| M4 | Permissions & AR Readiness UX | Permission states + AR_READY UX | P1 (XR sim) | — |
| M5 | Tracking Guidance UX | Target state → guidance text | P3 (runtime library) | — |
| M6 | Multi-Card UX | N-card guidance + combo overlay | P4 (multi-card) | — |
| M7 | Gamification / Reward | XP flow + reward celebration | P5 (combo) | — |
| M8 | Session Lifecycle | AppState + pause/resume wiring | P5 (combo) | — |
| M9 | Error, Recovery & WebAR Fallback | Error taxonomy + fallback routing | P7 (animation) | — |
| M10 | Android E2E | Full native AR on Android | P9 (Android) | — |
| M11 | iOS E2E | Full native AR on iOS | P10 (iOS) | — |
| M12 | Feature Parity & Cutover | MindAR → Unity AR default | P9 + P10 | — |

---

## M0 — Reconnaissance & Feature Parity Baseline

### Goal
Establish ground-truth understanding of current mobile behavior and document the feature parity matrix.

### Prerequisites
None.

### Scope
- Inspect actual RN flow: navigation, AR entry, Unity bridge, state machine, loading UX
- Inspect Unity bridge scripts: all RN→Unity methods, all Unity→RN events
- Inspect web AR behavior as parity reference
- Inspect backend AR contracts
- Document Mobile Feature Parity Matrix
- Document Mobile AR Product Specification

### Deliverables
- `docs/unity_ar/spec/mobile-ar-product-spec.md` ✅ (this spec)
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md` ✅

### Dependencies
None.

### Acceptance Gate
Mobile Feature Parity Matrix has all 28+ features classified (KEEP/ADAPT/WEB_ONLY/LEGACY_REMOVE_LATER/DECISION_REQUIRED). Mobile AR Product Spec covers all required domains (A through K).

### What MUST NOT happen early
Do not implement any RN features before M1 contract stabilization.

---

## M1 — Bridge Contract Stabilization

### Goal
Finalize the RN ↔ Unity message contract before any implementation work begins.

### Prerequisites
- M0 complete
- Unity P0 (stabilization) complete (AC-BUILD-001 ✓)

### Scope
- Finalize RN → Unity method list: which methods exist, which are new
- Finalize Unity → RN event list: which events exist, which are semantic corrections
- Resolve contract drift (stale `onObjectPlaced`, `onPlaneDetected`, plane-tap semantics)
- Finalize `CardDescriptorRN` payload type
- Finalize `UnityARExperiencePayload` with native AR additive fields
- Document error code taxonomy

### Deliverables
- Updated `bridge-contract.md` with final message taxonomy
- RN type definitions aligned with Unity payload types
- Error code mapping table approved

### Dependencies

Contract specification and freeze can proceed from repository ground truth (existing Unity scripts and Unity AR specification). Only the **runtime conformance verification** step requires Unity P1 gates:

- **M1A — Contract specification (can proceed now):** Inspect existing Unity scripts (`RNMessageReceiver.cs`, `RNEventEmitter.cs`, `CardImageLibraryBuilder.cs`, `ARExperienceHandler.cs`), existing bridge events in `arMessages.ts`, and `bridge-contract.md`. Finalize the contract document from current evidence. No Unity source changes needed.

- **M1B — Runtime conformance verification:** After Unity P0 (AC-BUILD-001 ✓) is verified, confirm the finalized contract matches actual Unity runtime behavior. This step depends on Unity compilation being clean.

### Acceptance Gate
- `CardDescriptorRN` includes `qrId`, `imageUrl`, `physicalWidthMeters`
- `UnityARExperiencePayload` does NOT include `referenceImageUrl` / `physicalWidthMeters` (those go in `CardDescriptor`)
- Error codes cover all AR subsystem failure modes
- Stale plane-detection and object-placement semantics are removed from native image-tracking contract
- Contract document is approved (M1A) before any RN implementation begins
- Runtime conformance confirmed after Unity P0 (M1B)

### Risks
- Contract changes during implementation create integration rework
- Semantic drift between RN types and Unity payloads

### What MUST NOT happen early
Do not implement RN loading states or AR UX before the bridge contract is frozen.

---

## M2 — Native AR Screen / Host Shell

### Goal
Verify the AR screen is navigable and Unity loads as a native host without AR features.

### Prerequisites
- M1 complete (contract frozen)
- Unity P0 (stabilization) complete
- RN native module integration verified

### Scope
- Verify `AR` route in `AppNavigator` accepts `{ lessonId, lessonTitle }`
- Verify Unity loads and renders without crashes when `UnityBridge.checkAvailability()` returns `true`
- Verify `startSession()` and `stopSession()` lifecycle calls execute
- Verify `destroySession()` cleanup works
- Implement placeholder Unity host view that renders without tracking

### Deliverables
- `ARScreen` navigates from `LessonPlayerScreen`
- `UnityView` renders as host (even if AR not yet active)
- Session lifecycle: `startSession` → `destroySession` verified
- No camera crash on host-only render

### Dependencies
- Unity AC-BUILD-001 (Unity compiles)
- Native module integration verified in RN

### Acceptance Gate
- MOB-GATE-001: AR screen navigates with correct `{ lessonId, lessonTitle }` params
- Unity renders in host mode without crash
- Session lifecycle calls execute cleanly

### What MUST NOT happen early
Do not wire loading states, AR states, or Unity events before M3.

---

## M3 — QR → Experience → Unity

### Goal
Verify the full experience load flow from QR/lesson resolution through Unity load.

### Prerequisites
- M2 complete (AR screen navigable)
- Unity P1 (XR sim) complete (AC-TRACK-001 ✓)
- Backend BACKEND-T001 (native AR fields) complete

### Scope
- Implement `ARExperienceMapper` to map backend `GET /api/v1/flashcard/{qrId}` to `UnityARExperiencePayload` and `CardDescriptorRN[]`
- Implement single-card `loadExperience()` bridge call
- Wire `ARLoadingOverlay` states for experience preparation
- Verify `onArReady` fires from Unity
- Verify `onModelLoaded` fires from Unity
- Implement `ClayProgressBar` progress tracking for model load

### Deliverables
- Backend resolution → Unity load → `onModelLoaded` verified
- Loading overlay shows: "Preparing..." → "Starting AR..." → "Loading model..." → dismiss
- 10-second initialization timeout wired

### Dependencies

M3 has two separable concerns:

- **M3A — Backend/DTO/experience preparation (blocked on BACKEND-T001):** `ARExperienceMapper` maps backend response to `UnityARExperiencePayload` + `CardDescriptorRN[]`. This data mapping step can be verified independently of Unity runtime once backend native AR fields exist.

- **M3B — Native AR_READY E2E (blocked on Unity P3, AC-TRACK-003):** The AR_READY state semantically means the AR Foundation runtime image library is actually built and tracking is active. This requires Unity P3 (runtime reference-image library) to complete — NOT merely the earlier XR baseline. AR_READY E2E verification must wait for AC-TRACK-003.

MOB-GATE-004 (loading overlay states) can use `UNITY_EDITOR` environment for overlay/UX verification. MOB-GATE-004 for AR_READY E2E requires `XR_SIMULATION` after P3 gates.

### Acceptance Gate
- MOB-GATE-004: AR loading overlay shows all preparation states (RN component behavior — RN_TEST or UNITY_EDITOR)
- Experience load flow E2E: QR → backend → Unity → model loaded (XR_SIMULATION or ANDROID_DEVICE)
- Timeout transitions to error state correctly
- **Note:** Native AR_READY E2E verification requires Unity P3 gates (AC-TRACK-003). Loading overlay UX can be verified earlier; actual AR_READY tracking state requires P3.

### Risks
- Backend migration not complete blocks native AR fields
- Network latency on experience resolution affects perceived UX

### What MUST NOT happen early
Do not implement multi-card before single-card is verified.

---

## M4 — Permissions & AR Readiness UX

### Goal
Verify all permission states and AR readiness states are handled with appropriate UX.

### Prerequisites
- M3 complete (experience load works)
- Unity P1 (XR sim) complete

### Scope
- Implement camera permission denial UX (from Unity `onError` code `CAMERA_PERMISSION_DENIED`)
- Implement AR capability unsupported UX (from `onError` code `AR_CAPABILITY_UNSUPPORTED`)
- Implement AR ready UX (from `onArReady` event)
- Verify AR initialization states in `ARLoadingOverlay`
- Implement reference image loading progress in overlay

### Deliverables
- Permission denied message with "Open Settings" button
- AR unsupported message with WebAR fallback option
- `AR_READY` state shows tracking hint
- Progress bar reflects reference image download + library build

### Dependencies
- Unity AC-TRACK-003 (library build verified)
- Unity AR subsystem error codes implemented

### Acceptance Gate
- MOB-GATE-002: QR state machine transitions correctly
- MOB-GATE-003: Permission states map to Unity events
- MOB-GATE-004: AR loading overlay shows all preparation states

### What MUST NOT happen early
Do not implement tracking guidance before AR_READY state is verified.

---

## M5 — Tracking Guidance

### Goal
Verify all target states have appropriate guidance UX and the flashcard overlay displays correctly.

### Prerequisites
- M4 complete (AR_READY UX)
- Unity P3 (runtime image library) complete (AC-TRACK-003 ✓)
- Unity P4 (multi-card wiring) gate

### Scope
- Implement `TARGET_FOUND` guidance: flashcard word + translation + audio button (`FlashcardOverlay`)
- Implement `TARGET_LOST` guidance: "Looking for [card]..."
- Implement `TARGET_REACQUIRED`: flashcard overlay re-displays
- Implement waiting guidance: "Point camera at [cardName]" with card preview image
- Implement multi-card first found guidance: "Now find the [second card]"
- Implement all-cards-found guidance: "Both cards found!"

### Deliverables
- `FlashcardOverlay` shows word + translation + audio
- Tracking guidance text updates per state
- Card preview image shown in waiting state

### Dependencies
- Unity AC-TRACK-002 (card identity verified)
- Unity AC-TRACK-003 (library build verified)

### Acceptance Gate
- MOB-GATE-005: Tracking guidance shows for all target states
- Card preview renders in waiting state
- Flashcard overlay displays on target found

### Risks
- Guidance strings require UX/i18n decisions (open: MQ-4)

### What MUST NOT happen early
Do not implement combo overlay before multi-card UX is verified.

---

## M6 — Multi-Card & Combo UX

### Goal
Verify multi-card state guidance and combo overlay activation.

### Prerequisites
- M5 complete (single-card tracking UX)
- Unity P4 (multi-card registry) complete (AC-MULTI-001 ✓)
- Unity P5 (combo refinement) gates
- Unity P6 (backend combo consumption) complete — backend combo definitions from `related_combos` needed before combo UX can be fully functional

### Scope
- Implement `MULTI_CARD_ACTIVE` guidance when 2+ cards tracked
- Implement `ComboOverlay` with "COMBO!" button
- Implement combo proximity hint: "Move the cards closer"
- Wire `onProximityNear` → proximity feedback
- Wire `onComboTriggered` → combo animation trigger
- Wire `onComboComplete` → reward flow

### Deliverables
- `ComboOverlay` visible when 2+ valid cards tracked
- Proximity hint shown when cards far apart
- Combo button visible when combo valid
- Combo triggered via proximity dwell (not just button press)

### Dependencies
- Unity AC-MULTI-001 (multi-card coexistence verified)
- Unity AC-COMBO-001 (combo proximity + dwell verified)
- Unity P6 (AC-COMBO-003, backend combo consumption) — backend `related_combos` definitions needed for combo UX to be functional
- Backend BACKEND-T001 (native AR fields available)

### Acceptance Gate
- MOB-GATE-005: Multi-card guidance for 1/N and N/N states
- MOB-GATE-006: Multi-card state guidance displays correctly
- MOB-GATE-007: Combo overlay activates at correct state

### What MUST NOT happen early
Do not implement gamification persistence before combo flow is verified.

---

## M7 — Gamification / Reward Integration

### Goal
Verify Unity → RN → Backend gamification flow with appropriate reward UX.

### Prerequisites
- M6 complete (combo UX)
- Unity P5 (combo refinement) gates
- Unity P8 (gamification bridge) gates

### Scope
- Wire `onComboComplete` → `POST /gamification/add-xp`
- Implement `REWARD_PENDING` state during API call
- Implement `REWARD_CONFIRMED` → reward celebration overlay
- Implement `REWARD_RETRYABLE_FAILURE` with retry logic
- Implement idempotency for XP calls (max 3 retries, 2s backoff)
- Implement `RewardCelebration` overlay: confetti, badge, sticker, level-up
- Wire `onFoodFed` → XP flow

### Deliverables
- XP awarded on combo trigger via authenticated backend call
- Reward celebration UI on XP award
- Streak counter updates in `PetStatusOverlay`
- XP persisted to backend at session end

### Dependencies
- Unity AC-GAME-001 (gamification bridge verified)
- Backend `/gamification/add-xp` available

### Acceptance Gate
- MOB-GATE-008: `onComboComplete` triggers RN gamification call
- Reward celebration overlay renders on XP award
- Streak counter updates correctly

### Risks
- XP retry loop must not create duplicate awards (idempotency critical)
- Backend `/gamification/add-xp` must handle concurrent calls

---

## M8 — Session Lifecycle

### Goal
Wire app lifecycle events to AR session pause/resume and verify session cleanup.

### Prerequisites
- M3 complete (experience load works)
- Unity P5 (combo) gates

### Scope
- Wire `AppState` change → `UnityBridge.pauseSession()` on background
- Wire `AppState` change → `UnityBridge.resumeSession()` on foreground
- Wire phone interruption → pause
- Implement graceful cleanup on `destroySession()`
- Verify no zombie Unity processes on exit
- Implement session end → backend session PATCH call

### Deliverables
- App background pauses Unity AR session
- App foreground resumes Unity AR session
- Session cleanup is clean
- Backend session lifecycle tracked

### Dependencies
- Unity pause/resume methods functional

### Acceptance Gate
- MOB-GATE-009: App lifecycle pause/resume is wired
- Session cleanup verified
- Backend session lifecycle tracked

### Risks
- RN app lifecycle hooks vary by Expo/RN version
- Unity session pause may not restore tracking state cleanly on all devices

---

## M9 — Error, Recovery & WebAR Fallback

### Goal
Verify all error states map to appropriate UX and WebAR fallback routing works.

### Prerequisites
- M3 complete (experience load)
- Unity P7 (animation) gates

### Scope
- Implement full error taxonomy mapping
- Implement retry logic for network and load failures
- Implement WebAR fallback routing
- Implement "Having trouble? Try web AR" prompt
- Verify fallback navigates to WebAR screen
- Implement error logging to backend debug endpoint

### Deliverables
- All error codes map to kid-friendly messages
- Retry button re-runs failed step
- WebAR fallback offered for AR capability failures
- Error telemetry logged

### Dependencies
- Unity error code taxonomy implemented
- WebAR fallback screen available (LEGACY path retained)

### Acceptance Gate
- MOB-GATE-010: All error codes map to user messages
- MOB-GATE-011: WebAR fallback routing is wired
- Retry behavior verified

### What MUST NOT happen early
Do not merge WebAR fallback into native AR flow without feature parity gate.

---

## M10 — Android E2E

### Goal
Verify full native AR experience on physical Android device with ARCore.

### Prerequisites
- M9 complete (error/recovery)
- Unity P9 (Android/ARCore device validation) complete

### Scope
- Physical ARCore-certified Android device
- Full entry flow: lesson → AR screen → QR resolution → Unity load → AR tracking → combo → XP
- All MOB-GATE acceptance criteria verified on Android
- Performance acceptable on target device tier

### Deliverables
- Full AR flow works on physical Android device
- All acceptance gates verified on Android

### Dependencies
- Unity AC-ANDROID-001 (Android model spawn + track + animate)
- Unity AC-ANDROID-002 (mutable library on ARCore)

### Acceptance Gate
- MOB-GATE-012: Full AR entry E2E on Android
- All MOB-GATE-001 through MOB-GATE-011 verified on physical Android

### Risks
- ARCore version fragmentation across OEM devices
- Camera permission UX differs by Android version

---

## M11 — iOS E2E

### Goal
Verify full native AR experience on physical iOS device with ARKit.

### Prerequisites
- M10 complete (Android E2E)
- Unity P10 (iOS/ARKit device validation) complete

### Scope
- Physical ARKit iOS device
- Repeat all M10 scenarios on iOS
- All MOB-GATE acceptance criteria verified on iOS

### Deliverables
- Full AR flow works on physical iOS device
- All acceptance gates verified on iOS

### Dependencies
- Unity AC-IOS-001 (iOS model spawn + track + animate)

### Acceptance Gate
- MOB-GATE-013: Full AR entry E2E on iOS
- All MOB-GATE-001 through MOB-GATE-011 verified on physical iOS

---

## M12 — Feature Parity & Cutover Approval

### Goal
Confirm native Unity AR has reached sufficient feature parity with legacy WebAR. Approve MindAR → Unity AR as default.

### Prerequisites
- M10 (Android E2E) complete
- M11 (iOS E2E) complete
- Feature parity checklist reviewed and approved

### Scope
- Review Mobile Feature Parity Matrix
- Verify all KEEP and ADAPT items are implemented
- Verify all WEB_ONLY items are intentionally excluded
- Approve cutover: Unity AR becomes default, MindAR behind feature flag
- Document cutover approval in progress evidence

### Deliverables
- Feature parity checklist signed off
- Default routing: Unity AR for supported content
- MindAR retained behind feature flag for edge cases
- Progress evidence updated

### Dependencies
- LEGACY-REQ-002 violation check
- All AC-ANDROID-001, AC-ANDROID-002, AC-IOS-001 gates verified

### Acceptance Gate
- All MOB-GATE-012 and MOB-GATE-013 acceptance criteria verified
- Product owner signs off on feature parity
- Mobile AR cutover approved

---

## Cross-System Dependencies

```
M1 (contract) ──────────────────────────────────────────────
  ↓ requires Unity P0
M2 (host shell) ───────────────────────────────────────────
  ↓ requires Unity P0
M3 (experience load) ───┬─── requires Unity P1 ──────────────
  │                      └─── requires BACKEND-T001 ─────────
M4 (permissions UX) ──── requires Unity P1 ──────────────────
M5 (tracking UX) ─────── requires Unity P3 (library) + P4 ───
M6 (combo UX) ────────── requires Unity P4 + P5 + P6 ──────
  ↑ P6 provides backend combo definitions (related_combos)
M7 (gamification) ───── requires Unity P5 + P8 ──────────────
M8 (lifecycle) ────────── requires Unity P5 ───────────────────
M9 (errors/fallback) ─── requires Unity P7 ───────────────────
M10 (Android E2E) ───── requires Unity P9 ───────────────────
M11 (iOS E2E) ───────── requires Unity P10 ──────────────────
M12 (cutover) ────────── requires M10 + M11 ──────────────────
```

---

## What MUST NOT Happen Early

1. **Never wire loading states before bridge contract is frozen (M1).**
2. **Never implement multi-card before single-card load is verified (M3).**
3. **Never implement combo overlay before multi-card guidance is verified (M6).**
4. **Never call backend for XP before combo flow is verified (M7).**
5. **Never wire app lifecycle before AR session is stable (M8).**
6. **Never use `glb_size` as `physicalWidthMeters` — they are distinct (TRACK-REQ-002).**
7. **Never use MindAR .mind files for native AR tracking (AR-REQ-002).**
8. **Never let Unity call backend directly for gamification (GAME-REQ-002).**
9. **Never assume `LessonPlayerScreen` navigates to AR — it currently shows "AR coming soon" placeholder (verified 2026-08-09). Navigation wiring is M2 scope.**
10. **Never assume `useARSession` calls the XP API on combo — `onComboComplete` currently only updates local `currentStreak` (verified 2026-08-09). This is M7 scope.**
11. **Never assume Unity bridge methods call native code — all methods in `UnityBridgeModule.ts` are stubs with no-op bodies (verified 2026-08-09). Native wiring is M2 scope.**
12. **Never wire XP persistence to backend in M2 or M3 — `useARSession` has no `addXp` call yet (verified 2026-08-09). This is M7 scope.**

---

## Risks

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|-----------|
| Backend native AR fields not available | M3 | High | M3 blocked on BACKEND-T001 |
| Camera permission UX differs by OS version | M4 | Medium | Test on multiple OS versions |
| WebAR fallback screen not available | M9 | Medium | Fallback only offered when available |
| Duplicate XP awards on retry | M7 | High | Idempotency key per combo event |
| App lifecycle pause/resume breaks on some devices | M8 | Medium | Test on target device tier |
| ARCore fragmentation across OEMs | M10 | High | Test on minimum ARCore-certified tier |
| Guidance strings not localized | M5 | Medium | i18n framework in place |

---

## Open Questions

| # | Question | Blocks Phase | Owner |
|---|----------|------------|-------|
| MQ-1 | `startImageTrackingMulti` replace or parallel? | M3 | Mobile architect |
| MQ-2 | WebAR fallback — separate screen or mode flag? | M9 | Mobile architect |
| MQ-3 | XP persisted continuously or at session end? | M7 | Product |
| MQ-4 | Tracking guidance string wording? | M5 | UX / i18n |
| MQ-5 | Camera permission pre-requested by RN or delegated to Unity? | M4 | Mobile architect |
| MQ-6 | AR capability detection by Unity or RN? | M4 | Unity / Mobile |
