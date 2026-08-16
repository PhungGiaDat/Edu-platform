# Cursor Execution Model — Bounded React Native Tasks

## Status
approved (for planning purposes)

## Target spec
- `docs/mobile_migration/spec/learner-product-spec.md`
- `docs/mobile_migration/spec/learner-parity-matrix.md`
- `docs/mobile_migration/spec/native-ar-integration.md`

## Goal
Define how Cursor executes the React Native learner migration: **ONE TASK / ONE FEATURE SLICE / ONE SESSION / VERIFY / STOP**.

## Lane model

| Lane | Executor | Owns | Evidence target |
|------|----------|------|-----------------|
| **CURSOR / MOBILE LANE** | Cursor (parallel, primary executor of this workspace) | RN screens, navigation, hooks, API adapters, state, learner UX, gamification UI, pets, courses, lessons, sessions, mini-games, tests | `docs/mobile_migration/progress/` + `docs/mobile_migration/tasks/` |
| **CLAUDE / UNITY LANE** | Claude Code (parallel) | AR Foundation, GLTFast, image tracking, runtime image library, CardRegistry, combo spatial engine, Unity animation/content, AR native runtime | `docs/unity_ar/progress/` + `docs/unity_ar/tasks/` |
| **BACKEND** | whoever owns a backend-gap task | new endpoints only via a backend-gap blocker | `docs/mobile_migration/blockers/` + `docs/unity_ar/spec/backend-contract.md` |

**Shared contract:** `docs/unity_ar/spec/bridge-contract.md`. Neither lane alters it unilaterally. If a shared-contract change is required → STOP and raise a spec/contract decision.

## One-task discipline

A good Cursor task is **one feature slice** a single session can take from open to verified:

### Good examples
- Implement CourseList API adapter and loading/error tests.
- Implement CourseDetail screen using the existing course API.
- Implement Learning Path topic selection screen.
- Implement session warning state reducer.
- Implement pet collection API hook and empty/error states.
- Implement flashcard practice result screen.

### Bad examples
- Migrate courses. (multi-slice)
- Build gamification. (multi-slice)
- Rebuild the mobile app. (unbounded)
- Port `LessonPlayer.tsx`. (copies web implementation instead of specifying RN behavior)

## Task template (mandatory per task)

```markdown
## Status
open | in-progress | done | blocked | wontfix

## Parent plan
Link to `docs/mobile_migration/plans/2026-08-09-learner-migration-plan.md` (phase R<n>)

## Objective
<one sentence; exact deliverable>

## Files
- Likely create: `mobile/rn/src/<...>.tsx|ts`
- Likely modify: `mobile/rn/src/<...>.ts`

## Backend endpoints
- <exact method + full path reused from the existing API surface; cite `spec/web-feature-inventory.md`>

## Prerequisites
- <tasks/specs that must exist first — cite task IDs or RN-GATE ids>

## Scope
- <what this task delivers>

## Out of scope
- <what this task explicitly does NOT do — name the boundary>

## Acceptance criteria
- [ ] <binary, verifiable>
- [ ] ...

## Tests
- <test file path + test names + pass criteria>

## Evidence
- <what the next agent can check: tsc pass, test output, screenshot, endpoint trace>

## Stop condition
- <the single check that ends this task; do not gold-plate past it>
```

## Per-task process (mandatory)

1. Read the newest `docs/mobile_migration/progress/` entry (cold start).
2. Read the task file from `docs/mobile_migration/tasks/`.
3. Implement the slice. Do not touch files outside the task's file list.
4. Verify against the acceptance criteria. Run `npx tsc --noEmit` from `mobile/rn/` for any TS task.
5. Write `docs/mobile_migration/progress/YYYY-MM-DD-<slug>.md` (evidence).
6. Mark the task `done` and STOP. Do not start the next task without a new task file.

## Frozen paths (do not modify from this workspace)

- `mobile/unity/**`
- `mobile/rn/src/bridge/**`
- `mobile/rn/src/types/ar.ts`, `mobile/rn/src/bridge/arMessages.ts`
- `mobile/rn/src/screens/ARScreen.tsx`, `mobile/rn/src/hooks/useARSession.ts`
- `mobile/rn/src/components/UnityView.tsx`, `mobile/rn/src/components/PetStatusOverlay.tsx`
- `backend/**` runtime code (read-only; endpoint reuse only)
- `frontend-web/**` (legacy parity source — read-only reference)

## Design system rule (inherited from the courses/pets plan)

All new RN screens/components MUST use the existing claymorphic primitives and tokens (`mobile/rn/src/design/tokens.ts`) — no raw hex colors, no raw shadows, no new visual primitives. See `docs/superpowers/plans/2026-07-25-courses-pets-rn-migration-plan.md` §Design System for the mandatory rules and reviewer checklist.

## Parallelization with the Unity lane

- Phases R1–R11 (learner product) have **no hard dependency on Unity P0/P1** and may run in parallel with the Unity lane.
- R12 (native AR product integration) consumes `docs/unity_ar/` gates; do not start R12 implementation until the AR lane's integration gates are met.
- Do NOT block unrelated mobile product migration on Unity P0/P1.
