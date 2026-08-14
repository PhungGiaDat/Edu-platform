# Mobile Product Migration Design

**Date:** 2026-08-09
**Status:** approved (workspace placement superseded 2026-08-09)
**Author:** Brainstorming session (cursor agent)

> **Workspace reconciliation (2026-08-09):** A subsequent scope-expansion decision moved the **general mobile product migration** out of this domain. The authoritative workspace for the Web → React Native learner migration is now **`docs/mobile_migration/`** (this file's planned artifacts `mobile-product-spec.md`, `web-feature-inventory.md`, and `mobile-product-migration-plan.md` are superseded by `docs/mobile_migration/spec/learner-product-spec.md`, `spec/web-feature-inventory.md`, and `plans/2026-08-09-learner-migration-plan.md`). The phase naming M13–M19 in this design is superseded by R0–R15 in that plan. This file remains valid for its **substantive decisions** (dual-mode backend, three-track coexistence, cutover strategy, pet-3D/Unity split), which carry forward. `docs/unity_ar/` retains authority only over the Unity/native-AR domain.

## Context

The project's mobile product (`mobile/rn/`) was scoped tightly around the native Unity AR migration (MindAR → Unity AR cutover, M0–M12). However, the user has paused the web product (`frontend-web/`) and wants to migrate web features (course, sessions, pets, gamification) down to mobile. Unity AR work is currently blocked, so web features become the parallel priority.

This spec defines the **Mobile Product Migration** as a parallel track alongside the in-progress AR migration, not a replacement for it.

## Scope

### In scope
- Web → mobile migration of: course (detail, map, player), session (lifecycle, timer, break), pets (collection page, 3D viewer, grid, selector), gamification (XP UI, reward celebration, streak/daily goal/leaderboard)
- Backend dual-mode: reuse existing web endpoints + opt-in `/mobile/*` prefixed endpoints for state that diverges from web
- Master orchestration plan parallel-track update
- 6 blocker files documenting gaps between current mobile spec and required web-feature scope

### Out of scope
- Replacing or deleting the existing AR migration plan (`mobile-ar-migration-plan.md`, M0–M12) — preserved as-is
- Unity AR engine work (P0–P11) — preserved as-is
- Web product roadmap — web is held as legacy
- Unity 3D pet rendering in AR scene — AR pet still uses Unity model when AR ready; web-feature pet module uses R3F (mobile-local)

## Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| Track ordering | AR-Defer-Later (M1–M12 frozen, M13+ added) | Unity blockers; web features ship first |
| Spec split | Split into `mobile-product-spec.md` (new) + keep `mobile-ar-product-spec.md` | Avoid contaminating approved AR spec |
| Master plan structure | Add "Parallel Track" section, do not rewrite | Both tracks coexist; cross-track dependencies are explicit |
| Pet 3D rendering | react-three-fiber on mobile | Matches web pattern; R3F works in Expo |
| Backend mode | Dual mode (reuse + `/mobile/*` opt-in) | Lowest risk; mobile-specific state isolated |
| Cutover strategy | M18 makes mobile primary, web becomes legacy | User confirmed song-song (parallel) approach |
| Blocker granularity | One file per gap (6 files) | Traceable, linkable from plan |
| Naming | M13–M19 (continues M0–M12 AR sequence in new plan) | Visual continuity in roadmap |

## Architecture

### Three tracks, one workspace

```
docs/unity_ar/
├── Unity AR Migration Track          (status: in-progress)
│   └── unity-ar-migration-plan.md    P0–P11
│
├── Mobile AR Migration Track         (status: in-progress, frozen M0–M12)
│   └── mobile-ar-migration-plan.md   M0–M12
│
└── Mobile Product Migration Track    (status: NEW, parallel to above)
    ├── spec/mobile-product-spec.md
    ├── spec/web-feature-inventory.md
    ├── plans/mobile-product-migration-plan.md  M13–M19
    └── blockers/2026-08-09-{course,session,pet,gamification,mobile-backend,master-plan}-*.md
```

### Cross-track dependencies (M13–M19)

| New phase | Depends on (own track) | Depends on (AR track) | Depends on (Backend) |
|---|---|---|---|
| M13 Shell Foundation | — | — | Auth endpoints |
| M14 Course Migration | M13 | — (LessonPlayer→AR params consumed later by M3) | `/courses/*`, `/lessons/*`, `/mobile/courses/continue` |
| M15 Session Lifecycle | M13 | M8 (shares `useAppStateLifecycle`) | `/sessions/*`, `/mobile/sessions/break` |
| M16 Pets Module | M13 | — (separate from AR pet events) | `/pets/*`, `/mobile/pets/active` |
| M17 Gamification UI | M13, M15 | M7 (XP persistence + idempotency) | `/gamification/*`, `/mobile/gamification/streak` |
| M18 Product Cutover | M14–M17 | M12 (MindAR → Unity cutover independent) | All above |
| M19 Product E2E | M18 | — | All above |

### Component map

| Mobile screen | Source from web | Mobile adaptation |
|---|---|---|
| `CourseListScreen` | `frontend-web/src/pages/CourseList.tsx` | RN screen, same API |
| `CourseDetailScreen` | `frontend-web/src/pages/CourseDetail.tsx` | RN screen + WebView for video |
| `CourseMapScreen` | `frontend-web/src/components/CourseMap.tsx` | RN with react-native-svg |
| `LessonPlayerScreen` | `frontend-web/src/pages/LessonPlayer.tsx` | RN + lesson→AR trigger params |
| `PetsPage` | `frontend-web/src/pages/PetsPage.tsx` | RN page (full module, not in AR scene) |
| `PetViewer3DScreen` | `frontend-web/src/components/pets/PetViewer3D.tsx` | R3F inside Expo GL |
| `PetGrid` | `frontend-web/src/components/pets/PetGrid.tsx` | RN FlatList + filter tabs |
| `StreakBadge` | `frontend-web/src/components/Gamification/StreakBadge.tsx` | RN component |
| `DailyGoalRing` | `frontend-web/src/components/Gamification/DailyGoalRing.tsx` | react-native-svg + Animated |
| `RewardCelebration` | `frontend-web/src/components/Gamification/RewardCelebration.tsx` | RN modal + Lottie |
| `LeaderboardPopup` | (new — referenced in matrix §8) | RN modal |

### Backend dual-mode pattern

```
Web client  ─┐
             ├─→ /api/v1/{courses,sessions,pets,gamification,...}/*  (existing)
Mobile client─┘
             └─→ /api/v1/mobile/{courses,sessions,pets,gamification,...}/*  (mobile-only, opt-in)
```

Mobile client uses existing endpoints as default; mobile-specific endpoints (e.g., `/mobile/gamification/streak` for cross-session state) are added when web state semantics don't fit mobile UX.

### State management

| Concern | Mobile approach | Notes |
|---|---|---|
| Auth | `useAuth` hook (existing from RN auth) | Already migrated |
| Course progress | React Query / SWR (TBD in M14) | Avoid duplicating server state |
| Session timer | `useSessionTimer` hook + `sessionBreakState` | Port from web |
| Pet collection | Local state + React Query | Backend is source of truth |
| XP idempotency | Idempotency key per combo event (3 retries, 2s backoff) | Extends M7 logic |
| Streak cross-session | `/mobile/gamification/streak` endpoint | New — see OQ-2 |

## Risks

| ID | Risk | Phase | Impact | Mitigation |
|---|---|---|---|---|
| R-NEW-1 | Pet 3D R3F on Expo has large bundle size | M16 | High | Lazy load + code splitting; defer 3D to first interaction |
| R-NEW-2 | Master plan parallel track may confuse new agents | M13 | Medium | Parallel Track doc explicit; cold-start links to both |
| R-NEW-3 | M18 cutover timing needs product/marketing alignment | M18 | Medium | Add explicit decision gate (OQ-3) |
| R-NEW-4 | Dual-mode backend doubles surface area | All | High | Contract tests for `/mobile/*` endpoints; document divergence |
| R-NEW-5 | Session lifecycle may conflict with M8 (AR pause/resume) | M15 | Medium | Share `useAppStateLifecycle` hook between tracks |

## Open Questions

| # | Question | Blocks Phase | Owner |
|---|---|---|---|
| OQ-1 | Pet 3D model bundle split strategy — preload vs on-demand? | M16 | Mobile architect |
| OQ-2 | Streak cross-session — shared between web+mobile or reset on device change? | M17 | Product |
| OQ-3 | M18 cutover — auto when parity = 100% or product owner approval? | M18 | Product owner |

## Acceptance Criteria

### For this design to be approved
- [ ] User confirms all 6 sections
- [ ] 6 blocker files created and linked
- [ ] Master plan updated with Parallel Track section
- [ ] `mobile-product-spec.md` and `web-feature-inventory.md` written
- [ ] `mobile-product-migration-plan.md` written (M13–M19) with verification gates per phase

### For M13–M19 to ship
- All MOB-PROD-001 through MOB-PROD-009 verification gates pass
- Backend `/mobile/*` endpoints documented and contract-tested
- Master plan updated to reflect mobile product cutover

## See also

- `docs/unity_ar/spec/mobile-ar-product-spec.md` — AR scope (preserved)
- `docs/unity_ar/plans/mobile-ar-migration-plan.md` — AR M0–M12 (preserved)
- `docs/unity_ar/plans/unity-ar-migration-plan.md` — Unity P0–P11 (preserved)
- `docs/unity_ar/spec/mobile-feature-parity-matrix.md` — 52 features classified
- `docs/unity_ar/plans/2026-08-09-master-orchestration-plan.md` — cross-system orchestration (updated 2026-08-09)
- **`docs/mobile_migration/`** — authoritative workspace for the React Native learner migration (replaces this design's planned M13–M19 artifacts)
