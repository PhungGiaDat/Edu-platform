## Status
draft

## Target specs
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md`
- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md`
- `docs/unity_ar/spec/backend-contract.md`

## Overview

This is a **thin cross-system orchestration plan**. It does NOT duplicate Unity or Mobile detailed tasks. Its job is to orchestrate the three subsystems (Unity, Mobile, Backend), define cross-system milestones, E2E gates, and the final feature-parity/cutover gate.

```
Master Orchestration Plan
├── Unity AR Migration Plan  (docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md)
│   └── P0–P11 (detailed in that plan)
├── Mobile AR Migration Plan  (docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md)
│   └── M0–M12 (detailed in that plan)
├── React Native Learner Migration Plan  (docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md)
│   └── R0–R15 (detailed in that plan — Web → RN learner features; parallel, not Unity-blocked)
└── Backend Capabilities  (docs/unity_ar/spec/backend-contract.md)
    └── BACKEND-T001 (docs/unity_ar/tasks/2026-08-09-backend-t001-native-ar-fields.md)
```

---

## Ownership Boundaries

| Owner | Responsibility |
|-------|---------------|
| **Unity plan** | Unity AR engine implementation and readiness |
| **Mobile AR plan** | React Native AR product behavior (Unity host, QR, permissions, tracking UX, combo, AR gamification, AR lifecycle, fallback), final routing cutover (M12) |
| **RN Learner plan** | Web → React Native learner product migration (auth/shell, courses, learning path, lesson player, flashcards, mini-games, pronunciation, gamification, profile/progress, pets, session management, AI chat, AR product entry) — `docs/mobile_migration/` |
| **Backend work** | API/schema/security capabilities required by Unity, Mobile AR, and the RN learner product |
| **Master plan** | Cross-system milestones, dependency orchestration, E2E readiness gates, final feature-parity gate |

Unity MUST NOT own React Native routing policy. Mobile owns final routing cutover (M12). The RN Learner plan owns AR **entry/navigation/product integration only**; native AR engine behavior stays with the Unity + Mobile AR plans.

---

## Cross-System Milestones

| Milestone | Unity Gate | Mobile Gate | ML/Backend Capability | E2E Verification |
|-----------|-----------|-------------|----------------------|-------------------|
| M1. Bridge contract frozen | P0 (AC-BUILD-001) | M1 (contract spec) | — | Contract document approved |
| M2. Host shell | P0 (AC-BUILD-001) | M2 | — | RN → Unity session lifecycle works |
| M3. Single-card E2E | P1 (AC-TRACK-001) | M3 | BACKEND-T001 (native AR fields) | AR_READY fires in XR sim |
| M4. Permissions UX | P1 (AC-TRACK-001) | M4 | — | Permission states → UX |
| M5. Tracking guidance | P3 (AC-TRACK-003) | M5 | — | Guidance text shown |
| M6. Multi-card UX | P4 (AC-MULTI-001) + P5 (AC-COMBO-001) | M6 | BACKEND-T001 (fields) | N cards tracked, combo overlay |
| M7. Gamification | P5 (AC-COMBO-001) + P8 (AC-GAME-001) | M7 | `/gamification/add-xp` available | XP awarded on combo |
| M8. Lifecycle | P5 (AC-COMBO-001) | M8 | — | App lifecycle → pause/resume |
| M9. Error/recovery | P7 (AC-GLB-002/003) | M9 | — | Error taxonomy → user messages |
| M10. Android E2E | P9 (AC-ANDROID-001/002) | M10 | All above | Full AR on Android |
| M11. iOS E2E | P10 (AC-IOS-001) | M11 | All above | Full AR on iOS |
| **M12. Cutover** | P11 (all gates) | **M12 (routing)** | All above | Unity AR = default |
| **P-AI-1. Baseline eval** | — | — | P-FT-0/1: WER baseline on frozen child/adult eval sets; WER < 30% child, < 10% adult (post-adaptation gates, not baseline prerequisites) | Reproducible baseline measured |
| **P-AI-2. Score calibration** | — | — | P-FT-4/5: evidence from GOP scoring + calibration; calibrated GREAT/GOOD TRY/TRY AGAIN | Child-friendly feedback verified by evidence, not arbitrary thresholds |
| **P-AI-3. Pronunciation UX** | — | R7 | R7 + P-FT-8: real scoring service when moving beyond mock | Record → evaluate → score → feedback → retry E2E |
| **P-AI-4. Pilot eval** | — | — | P-FT-9: calibrated model/service, real-device UX | Pilot criteria met by evaluation evidence |

---

## E2E Gates

| Gate | Description | Environment |
|------|-------------|-------------|
| E2E-001 | Single-card AR: QR → backend → Unity → model → XP | ANDROID_DEVICE / IOS_DEVICE |
| E2E-002 | Multi-card: N cards tracked simultaneously | ANDROID_DEVICE / IOS_DEVICE |
| E2E-003 | Combo: proximity dwell → combo animation → XP | ANDROID_DEVICE / IOS_DEVICE |
| E2E-004 | Lifecycle: pause → resume → tracking restored | ANDROID_DEVICE / IOS_DEVICE |
| E2E-005 | Feature parity: all KEEP + ADAPT items verified | ANDROID_DEVICE / IOS_DEVICE |
| E2E-006 | Cutover: Unity AR is default, MindAR behind flag | ANDROID_DEVICE / IOS_DEVICE |

---

## Feature Parity Gate

Before M12 cutover, the Mobile Feature Parity Matrix must be reviewed and approved:

- All `KEEP` items: implemented and verified
- All `ADAPT` items: implemented and verified
- All `WEB_ONLY` items: intentionally excluded, documented
- `LEGACY_REMOVE_LATER` items: retained behind feature flag
- `DECISION_REQUIRED` items: decisions recorded (MQ-1 through MQ-6)

Product owner signs off on the parity checklist.

---

## Out of Scope

- This plan does NOT contain Unity detailed phase tasks (P0–P11)
- This plan does NOT contain Mobile detailed phase tasks (M0–M12)
- This plan does NOT contain RN learner detailed phase tasks (R0–R15 — see `docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md`)
- This plan does NOT contain backend implementation details
- This plan does NOT make architectural decisions — those belong to specs

---

## Active Open Decisions (cross-system)

| # | Decision | Owner | Blocks |
|---|----------|-------|--------|
| MQ-3 | XP persistence — immediate (on combo) or session-end? | Product | M7 |
| MQ-6 | AR capability detection — Unity or RN? | Unity / Mobile | M4 |
| BQ-2 | Reference image = `image_2d_url` or separate? | Content / Design | M3 |
| BQ-3 | Default `physical_width_m` for unmapped cards? | Product / Content | M3 |
| PRON-DQ-1 | Canonical `/pronunciation/evaluate` endpoint (pronunciation.py vs pronunciation_enhanced.py)? | Backend / Architect | PRON-A7 |
| PRON-DQ-2 | Child audio data policy — consent, retention, training eligibility? | Product / Legal | PRON-B0 |
| 3D-DQ-1 | Physical hysteresis values for food proximity? | Product / UX | GAME-8 |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backend native AR fields not available for M3 | High | BACKEND-T001 is P2; coordinate timing |
| XP persistence decision delayed | Medium | M7 waits on MQ-3; document both approaches |
| Unity AR features not ready for M10/M11 | High | No compression of P9/P10 gates |
| Cross-system contract drift during implementation | Medium | M1 freeze before any RN/Unity implementation |
