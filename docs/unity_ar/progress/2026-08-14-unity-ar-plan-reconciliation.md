## Session
2026-08-14, agent: claude, branch: MindAR-Update

## Goal
Reconcile Unity AR migration plan with corrected architecture for card/combo identity, backend-driven combo definitions, persistent ARScene, In-AR Game Mode, and GameModeManager. Planning/documentation task only — no production code.

## Changed

### 1. `docs/unity_ar/spec/combo-interaction.md`
- Added **CURRENT/TARGET status markers** to Card Identity section
- Clarified the hardcoded `_comboTable` is CURRENT technical debt, not target architecture
- Renamed "Card Identity in Combo Context" → "CURRENT: Card Identity in Combo Context"
- Added "TARGET: Semantic Combo Resolution" section describing arTag → comboId path
- Clarified ComboManager responsibility boundary (does NOT own AR session, camera, navigation, backend mutation)
- Added explicit non-goal: Game Mode is not Combo Mode

### 2. `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md`
- **Phase 6 renamed** (descriptive title only): "Backend Combo Consumption" → "Semantic Combo Resolution"
- **Scope clarified** in P6: the core task is replacing hardcoded pair lookup with arTag → required_tags → comboId resolution
- **Hardcoded table** described as CURRENT technical debt to be removed, not target state
- **Added new Phase 6A**: "Hardcoded Combo Table Retirement" — remove `_comboTable` after dynamic consumption verified
- **Added new future-phase placeholder**: Phase "TBD" (between P8 and P9) for In-AR Game Mode foundation
- **Added explicit Game Mode non-expansion rule** to P9 dependencies: In-AR Game Mode is not a prerequisite for AR camera verification
- **Updated dependency graph** to show Game Mode as future/non-blocking
- **New acceptance gates** added: AC-GAME-002 (In-AR Game Mode), AC-GAME-003 (game lifecycle)
- **New future tasks** added covering: dynamic combo ingestion, semantic combo matching, hardcoded retirement, In-AR Game Mode foundation, game lifecycle, game result events, RN/backend reward integration

### 3. `docs/unity_ar/spec/architecture-specification.md`
- **Added In-AR Game Mode section** (Section: In-AR Game Mode Architecture)
- **Added GameModeManager component** to Unity Component Responsibilities table
- **Clarified ARScene lifecycle** — persistent runtime container, not game state
- **Added Game → RN event boundary** for semantic game results
- **Updated Unity Component Responsibilities table** with GameModeManager (planned, not implemented)

## NOT Changed (intentionally)
- `docs/unity_ar/spec/backend-contract.md` — `required_tags` correctly uses `ar_tag` values; no contradiction found
- `docs/unity_ar/spec/bridge-contract.md` — multi-card contract already planned; no Game Mode events required yet
- `docs/unity_ar/plans/2026-08-09-mobile-ar-migration-plan.md` — Game Mode is Unity-owned presentation; RN owns navigation/backend; no contradiction
- `docs/unity_ar/spec/acceptance-gates.md` — AC-GAME-001 already exists; new gates added to migration plan
- Requirements baseline — COMBO-REQ-009 [CURRENT][MUST] already correctly labels hardcoded pairs as current

## Stale Assumptions Reconciled

1. **combo-interaction.md "Card Identity in Combo Context"** — described hardcoded qrId pairs as if normative. Updated to CURRENT technical debt with TARGET section.

2. **Plan Phase 6 title** — "Backend Combo Consumption" was accurate but scope was implicit. Now explicit: semantic resolution = arTag → required_tags → comboId.

3. **Plan Phase numbering** — No "Game Mode" phase existed. Now added as explicit future placeholder between P8 and P9.

4. **No GameModeManager** in any spec — added to architecture spec Component Responsibilities and Unity plan as planned component.

5. **No In-AR Game Mode acceptance** — added to plan as explicit future acceptance gates.

## Verified
- Architecture spec AQ-3 already **Resolved** (backend consumption)
- Backend-contract `required_tags` already uses `ar_tag` ✓
- Bridge contract already has `startImageTrackingMulti` ✓
- No "game scene" or "BridgeSmokeScene is production AR" in target specs ✓
- No "Unity directly posts XP" in target specs ✓
- `qrId ≠ arTag` already documented in architecture spec ✓

## Not Verified (no runtime changes)
- Nothing — this was a documentation planning task

## Specs Touched
- `docs/unity_ar/spec/combo-interaction.md`
- `docs/unity_ar/spec/architecture-specification.md`
- `docs/unity_ar/plans/2026-08-09-unity-ar-migration-plan.md`

## Blockers Raised
None — this was a documentation task.

## Next
- Continue with current Unity implementation tasks (camera/bridge verification)
- Game Mode implementation is a future phase, not a prerequisite for AR camera gate
