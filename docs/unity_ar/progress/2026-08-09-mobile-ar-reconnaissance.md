## Session
2026-08-09 14:30, agent: opus-4.8, branch: MindAR-Update

## Goal
Extend existing Unity/AR planning system with dedicated Mobile AR domain. Reconcile existing mobile specs and plan against actual React Native codebase. Audit for gaps.

## Changed
- `docs/unity_ar/spec/mobile-ar-product-spec.md` — appended Evidence Reconciliation section (20 items verified against `mobile/rn/src/`)
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md` — added 2 rows (XP on card detected, XP on combo); corrected count (52 features, ADAPT: 24)
- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` — appended 4 items to "What MUST NOT Happen Early" section

## Verified

### Mobile Spec (already existed)
- `mobile-ar-product-spec.md` ✅ already comprehensive (MOB-AR through MOB-ERR, MOB-LIFE, bridge contract, error taxonomy, fallback)
- `mobile-feature-parity-matrix.md` ✅ already classifies 52 features (23 KEEP, 24 ADAPT, 3 WEB_ONLY, 1 LEGACY_REMOVE_LATER, 1 DECISION_REQUIRED)
- `mobile-ar-migration-plan.md` ✅ already has 13 phases (M0-M12) with gate dependencies
- Master spec `000-index.md` ✅ already references mobile specs and mobile phases
- Master Unity plan ✅ already has cross-system dependency table

### React Native source verified (`mobile/rn/src/`)
- `ARScreen.tsx` ✅ navigation params `{lessonId, lessonTitle}`; `UnityView`, `ARLoadingOverlay`, `ComboOverlay`, `PetStatusOverlay` all rendered
- `useARSession.ts` ✅ 8-state machine (IDLE through AR_ERROR); 15 Unity event subscriptions; `trackedImages: Map<string, TrackedImage>`; `canCombo`; `currentStreak` local state
- `UnityBridgeModule.ts` ✅ all methods stubbed (`startARSession`, `loadExperience`, `pauseSession`, `resumeSession`, `destroySession`, `triggerCombo`, `playAudio`, `closeExperience`); `subscribe()` via `NativeEventEmitter`
- `ARExperienceMapper.ts` ✅ `mapToUnityPayload()` maps backend → Unity payload; lacks native AR additive fields
- `types/ar.ts` ✅ `UnityARExperiencePayload` confirmed; no `referenceImageUrl` / `physicalWidthMeters`
- `bridge/arMessages.ts` ✅ 26 event types defined (core + combo + pet + legacy)
- `AppNavigator.tsx` ✅ `AR` route defined with `{lessonId, lessonTitle}`; `LessonPlayerScreen` → AR navigation NOT wired
- `LessonPlayerScreen.tsx` ✅ shows "AR coming soon" placeholder; no AR navigation
- `QRScanPrompt.tsx` ✅ static placeholder UI; `expo-camera` NOT imported anywhere
- `ARLoadingOverlay.tsx` ✅ 4 states: `initializing`, `loading_model`, `error`, `cached`; `ClayProgressBar` wired
- `ComboOverlay.tsx` ✅ button + hint text; floating animation via `translateY`
- `api.ts` ✅ `coursesApi.addXp()` calls `POST /gamification/add-xp`; `flashcardApi.getFlashcard(qrId)` calls `GET /flashcard/{qrId}`; bearer token interceptor; session endpoints
- `gamificationService.ts` ✅ `awardXp()` exists (separate import)

### Key gaps identified (NOT verified = not implemented)
| Gap | Evidence | Phase |
|-----|---------|-------|
| `LessonPlayerScreen` → AR navigation | Shows "AR coming soon" placeholder | M2 |
| `AppState` → `pauseSession`/`resumeSession` | No `AppState` in `ARScreen.tsx` | M8 |
| `RewardCelebration` overlay | No component in `src/components/` | M7 |
| `currentStreak` → backend persistence | `useARSession` only local state | M7 |
| `flashcard_viewed` XP on detection | No `addXp` call in `onImageDetected` handler | M7 |
| `combo_discovered` XP on combo | No `addXp` call in `onComboComplete` handler | M7 |
| `startImageTrackingMulti` bridge method | Only `startImageTracking` stub exists | M3 |
| Native Unity calls | All `UnityBridgeModule` methods are stubs | M2 |
| QR camera scanning | `expo-camera` in `package.json` but never imported | M0 |
| WebAR fallback screen | No MindAR/WebView rendering in RN | M9 |
| `referenceImageUrl`/`physicalWidthMeters` in payload | `UnityARExperiencePayload` lacks these fields | M3 |
| Backend `reference_image_url`/`physical_width_m` | Backend contract missing; grep confirmed zero matches | P2 |

## Specs touched
- `docs/unity_ar/spec/mobile-ar-product-spec.md` (Evidence Reconciliation appended)
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md` (2 rows added, count corrected)
- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` (What MUST NOT Happen Early extended)

## Audit findings

1. **Master artifacts already integrated**: `000-index.md` and Unity plan already reference mobile specs and phases. No structural changes needed.

2. **Minor cross-system table gap**: Unity plan's cross-system table omits P6 (backend combo consumption) → mobile dependency. P6 affects Mobile M6 (combo UX) — backend-driven combos needed before combo UX is fully functional. Not critical for sequencing.

3. **Stale evidence references**: Mobile spec evidence field has `MOB-AR-REQ-REQ` typo in MQ-1 — already corrected to `MOB-LOAD-REQ-011`.

4. **Stale plane-detection semantics**: `UnityBridgeModule.ts` and `useARSession.ts` still have `onObjectPlaced` / `onPlaneDetected` events (classified LEGACY_REMOVE_LATER in parity matrix). Correct per spec — these are being phased out.

5. **No duplicate ownership**: All Unity scripts confirmed owned by Unity plan; all RN components confirmed owned by Mobile plan.

6. **No RN → Unity multi-card contract**: `ARExperienceMapper` lacks multi-card mapping; `UnityBridgeModule` lacks `startImageTrackingMulti`. These are M3-phase items per the plan.

7. **Parity matrix accurate**: 52 features classified correctly. ADAPT count updated from 22 to 24 (added 2 XP-gap rows). All evidence verified against actual source.

8. **Reward/idempotency**: `MOB-GAME-REQ-003` requires idempotency for XP retries. No idempotency key implementation found in `useARSession` or `api.ts`. This is correctly captured as a M7-phase gap per the plan.

9. **LEGACY_REMOVE_LATER correctly classified**: MindAR + A-Frame path in frontend-web is correctly marked LEGACY_REMOVE_LATER. WebAR fallback in mobile is correctly marked ADAPT (separate WebView path needed).

10. **Backend cross-dependency**: Mobile M3 blocked on BACKEND-T001 (native AR fields). This dependency is already captured in the Unity plan's cross-system table.

## Active blockers

- `docs/unity_ar/blockers/2026-08-09-native-ar-backend-missing-fields.md` (P0, open) — `reference_image_url` and `physical_width_m` missing from backend. Blocks Mobile M3.

## Active decisions required (from spec)

| # | Decision | Phase | Owner |
|---|---------|-------|-------|
| MQ-1 | `startImageTrackingMulti` replace or parallel? | M3 | Mobile architect |
| MQ-2 | WebAR fallback — separate screen or mode flag? | M9 | Mobile architect |
| MQ-3 | XP persisted continuously or at session end? | M7 | Product |
| MQ-4 | Tracking guidance string wording? | M5 | UX / i18n |
| MQ-5 | Camera permission pre-requested by RN or delegated to Unity? | M4 | Mobile architect |
| MQ-6 | AR capability detection by Unity or RN? | M4 | Unity / Mobile |

## Not changed (no action needed)
- `docs/unity_ar/spec/000-index.md` — already references mobile specs; no update needed
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md` — already has cross-system table; minor gap (P6 not listed) but not critical
- `docs/unity_ar/spec/acceptance-gates.md` — MOB-GATE-001–013 already present; no update needed
- `docs/unity_ar/spec/requirements-baseline.md` — MOB-* requirement IDs already present
- No Unity scripts, scenes, RN runtime, backend runtime, or tooling configuration modified

## Recommended next task
M1 — Bridge Contract Stabilization (pending Unity P0 + P1 gates)

Evidence: Bridge contract is the first gate before any RN implementation. Current contract has 4 confirmed gaps (see `bridge-contract.md`):
- Gap 1: Single-payload vs. multi-card routing (Unity side)
- Gap 2: `CardDescriptor` not flowing from RN to `CardImageLibraryBuilder`
- Gap 3: `ARExperienceHandler` doesn't reference `CardImageLibraryBuilder`
- Gap 4: Backend `reference_image_url` / `physical_width_m` not in RN payload

M1 requires Unity P0 (stabilization) + P1 (XR sim) gates first per the plan. Next executable Unity task: `docs/unity_ar/tasks/2026-08-09-p0-t001-verify-gltfast-resolvable.md`.
