# Native AR Product Integration (Mobile Learner ↔ Unity AR)

## Status
draft

## Goal
Lock the boundary between the mobile learner product (this workspace) and the Unity/native-AR domain (`docs/unity_ar/`): this workspace owns AR **entry, navigation, and product integration only**; `docs/unity_ar/` owns the native AR engine behavior.

## Invariants

1. **Do NOT duplicate Unity/native-AR architecture here.** AR engine behavior (image tracking, runtime image library, CardRegistry, combo spatial engine, model loading, AR UX overlays, AR session pause/resume) is owned by `docs/unity_ar/spec/mobile-ar-product-spec.md`, `spec/bridge-contract.md`, and the Unity/Mobile-AR plans (P0–P11, M0–M12).
2. **This workspace owns**: how the learner product routes a learner into AR ("Practice in AR" entry point, AR capability gating at the product level, AR deep-link params, fallback messaging at the product level), and how AR completion feeds back into learner progress (XP/gamification).
3. **Shared contract** is `docs/unity_ar/spec/bridge-contract.md`. Mobile implementation must not alter Unity contracts to make RN code easier. Shared-contract changes: **STOP and raise a spec/contract decision**.
4. **R12 does not start** until the AR lane's integration gates are met. Product features that do not depend on AR (courses, path, lesson UI, flashcards, games, gamification, pets, session management) are **not blocked** on Unity P0/P1.
5. Requirement IDs for AR product integration use `MOB-ARINT-REQ-xxx`; all native AR behavior keeps its existing AR IDs (`MOB-AR-REQ-*` etc. in `docs/unity_ar/`).

## Components

| Concern | Owner | Evidence / location |
|---|---|---|
| AR screen (Unity host view, AR state machine, overlays) | `docs/unity_ar/` (Mobile AR track M2–M9) | `mobile/rn/src/screens/ARScreen.tsx`, `useARSession.ts`, `UnityView.tsx`, `ARLoadingOverlay`, `ComboOverlay`, `PetStatusOverlay` |
| RN ↔ Unity message contract | `docs/unity_ar/` | `docs/unity_ar/spec/bridge-contract.md`, `mobile/rn/src/bridge/arMessages.ts` |
| QR scanning / camera permission UX | `docs/unity_ar/` (MOB-QR-REQ, MOB-PERM-REQ) | `QRScanPrompt.tsx`, `expo-camera` |
| AR gamification (XP on detect/combo, reward celebration, idempotency) | `docs/unity_ar/` (MOB-GAME-REQ) | AR plan M7 |
| Lesson → AR entry button | **This workspace** (MOB-ARINT-REQ) | `CourseDetailScreen` / `LessonPlayerScreen` navigation; consumes `lesson.arReference?.ar_tag` |
| AR route registration + params | **This workspace** (MOB-ARINT-REQ) | `AppNavigator.tsx` `AR` route `{lessonId, lessonTitle}` (already exists) |
| Product-level fallback messaging ("AR not available on this device") | **This workspace** (MOB-ARINT-REQ) | Lesson player placeholder today; AR lane owns engine-level WebAR fallback (M9) |
| AR completion → XP/gamification handoff | **This workspace** (MOB-GAM-REQ) + AR lane M7 (idempotency) | Shared `addXp` backend contract |

## Requirements

### MOB-ARINT-REQ-001 — AR entry from lesson
Product behavior: a lesson whose `lesson.arReference.ar_tag` exists offers a "Practice in AR" action from the lesson player / course detail; tapping it navigates to the existing `AR` route with `{lessonId, lessonTitle}`. Lessons without an AR reference never route to AR.
Ownership: this workspace (R4 lesson player, R12 integration).
Backend dependency: `GET /courses/{course_id}/lessons/{lesson_id}` (lesson `arReference` field — exists).
Verification: unit test on the navigation gate + manual simulator check.
Status: not started (learner plan R12).

### MOB-ARINT-REQ-002 — AR capability gating at product level
Product behavior: product-level UX must handle "AR not available" (device/build without native module) without crashing — current placeholder copy ("AR coming soon …") remains the fallback until the AR lane ships `UnityBridge.checkAvailability()`.
Ownership: this workspace.
Backend dependency: none.
Verification: run the app on a build without the Unity module; expect fallback copy, no crash.
Status: not started.

### MOB-ARINT-REQ-003 — No cross-lane contract drift
Product behavior: this workspace never proposes bridge-contract changes. Any RN-side DTO change that touches `mobile/rn/src/bridge/**` or `types/ar.ts` requires a STOP + decision in `docs/unity_ar/` per its spec-change rule.
Ownership: both lanes (STOP gate).
Verification: PR review rule; frozen-path guard (the courses/pets plan §7 list is the reference).
Status: in effect.

## See also
- `docs/unity_ar/spec/mobile-ar-product-spec.md` — AR product behavior
- `docs/unity_ar/spec/bridge-contract.md` — shared contract
- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` — AR mobile track M0–M12
- `plans/2026-08-09-learner-migration-plan.md` — R12 phase
