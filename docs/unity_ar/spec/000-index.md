# Unity AR Memory — Specification Index

**Authority:** All spec topics are authoritative. Code conforms to spec; spec does not bend to code.

## Status key
- `draft` — open design questions
- `approved` — all questions resolved; code must conform
- `superseded` — replaced by a newer spec

## Spec Topics

| ID | File | Status | Summary |
|----|------|--------|---------|
| LEGACY | `legacy-coexistence.md` | approved | MindAR/WebAR legacy path remains until native AR reaches feature parity |
| REQ | `requirements-baseline.md` | draft | Full requirements baseline (all namespaces) |
| ARCH | `architecture-specification.md` | draft | System ownership, runtime sequence, identity model |
| GATES | `acceptance-gates.md` | draft | System-level acceptance criteria |
| TRACK | (covered in `requirements-baseline.md` TRACK-REQ-001–011 and `architecture-specification.md`) | draft | AR Foundation image tracking invariants — consolidated into requirements baseline |
| CONTENT | (covered in `requirements-baseline.md` CONTENT-REQ-001–010 and `architecture-specification.md`) | draft | GLB + GLTFast model delivery contract — consolidated into requirements baseline |
| BRIDGE | `bridge-contract.md` | draft | RN ↔ Unity bridge message contracts and gaps |
| COMBO | `combo-interaction.md` | draft | Multi-card proximity combo logic |
| BACKEND | `backend-contract.md` | draft | Backend AR API contract and native AR additive fields |
| SEC | `entitlement-gap.md` | draft | Private-card entitlement gap (NOT implemented) |
| MOB-SPEC | `mobile-ar-product-spec.md` | draft | React Native mobile product behavior for native Unity AR |
| MOB-PARITY | `mobile-feature-parity-matrix.md` | draft | Web → Native mobile feature classification (KEEP/ADAPT/WEB_ONLY) |

## Orchestration Plans

| Plan | Status | Summary |
|------|--------|---------|
| `master-orchestration-plan.md` | draft | Thin cross-system plan: Unity + Mobile + Backend orchestration, E2E gates, cutover |
| `2026-08-09-unity-ar-migration-plan.md` | draft | Unity engine implementation: P0–P11 |
| `2026-08-09-mobile-ar-migration-plan.md` | draft | React Native product: M0–M12 |

## Subordinate Specs

The **Mobile AR Product Spec** (`mobile-ar-product-spec.md`) is a first-class subordinate spec. It governs:
- React Native entry flows, navigation, and session lifecycle
- QR scanning product states
- Camera/AR permission UX
- AR session preparation UX (loading states)
- Tracking guidance UX
- Multi-card and combo UX
- Gamification presentation ownership
- Error taxonomy and recovery
- WebAR fallback policy
- RN ↔ Unity bridge contract for mobile

The **Mobile Feature Parity Matrix** (`mobile-feature-parity-matrix.md`) classifies every relevant legacy web AR feature for native mobile.

See `bridge-contract.md` for the shared RN ↔ Unity message contract.

## Requirement ID Conventions

| Prefix | Domain |
|--------|--------|
| `LEGACY-REQ-xxx` | Legacy MindAR/WebAR coexistence |
| `AR-REQ-xxx` | AR Foundation core |
| `TRACK-REQ-xxx` | Image tracking |
| `CONTENT-REQ-xxx` | Model/content delivery |
| `BACKEND-REQ-xxx` | Backend AR API contract |
| `BRIDGE-REQ-xxx` | RN ↔ Unity bridge |
| `COMBO-REQ-xxx` | Multi-card combo interaction |
| `GAME-REQ-xxx` | Gamification ownership |
| `SEC-REQ-xxx` | Entitlement/security |
| `TEST-REQ-xxx` | Testing |
| `ANDROID-REQ-xxx` | Android device |
| `IOS-REQ-xxx` | iOS device |
| `MOB-AR-REQ-xxx` | Mobile AR entry |
| `MOB-QR-REQ-xxx` | Mobile QR scanning |
| `MOB-PERM-REQ-xxx` | Mobile permissions |
| `MOB-LOAD-REQ-xxx` | Mobile loading UX |
| `MOB-TRACK-REQ-xxx` | Mobile tracking guidance |
| `MOB-COMBO-REQ-xxx` | Mobile combo UX |
| `MOB-GAME-REQ-xxx` | Mobile gamification |
| `MOB-LIFE-REQ-xxx` | Mobile session lifecycle |
| `MOB-ERR-REQ-xxx` | Mobile error/recovery |

## Anti-pattern Rule
If a progress entry contradicts an approved spec, **spec wins**. Open a blocker instead of rewriting the spec.

## Spec Change Rule
Normal implementation sessions MUST NOT casually rewrite an approved spec to match implementation evidence. If evidence conflicts with approved spec:
1. Stop.
2. Record evidence in a blocker.
3. Propose explicit spec change.
4. Reconcile after approval.

## Naming Conventions
- Files: `<topic>.md`, lowercase, dash-separated
- Requirements IDs: `AR-REQ-xxx`, `BACKEND-REQ-xxx`, `BRIDGE-REQ-xxx`, `MOB-*-REQ-xxx`, etc.
- Acceptance IDs: `AC-BUILD-xxx`, `AC-TRACK-xxx`, `AC-MULTI-xxx`, `MOB-GATE-xxx`, etc.
- Tasks: `P0-Txxx`, `P1-Txxx` (Unity); `M0-Txxx` through `M12-Txxx` (Mobile)
- Mobile phases: `M0` through `M12` (see `plans/2026-08-09-mobile-ar-migration-plan.md`)

## Provenance Notes
- Unity 6000.3.20f1 + AR Foundation 6.3.5 + GLTFast 6.x (embedded)
- 4 runtime scripts (AR/), 5 models/bridge scripts, 5 EditMode tests
- 2 scenes: ARScene (has PLACEHOLDER_GUID), ARTestScene
- `ARScene.unity:274` has `{fileID: 11500000, guid: PLACEHOLDER_GUID, type: 3}` — broken component reference
- FullARBootstrap builds full AR rig at runtime (no hardcoded script GUIDs in scene)
- Backend: MindAR .mind files + (catalog_id + target_index), no native AR reference image fields
- RN bridge: `LOAD_EXPERIENCE` method → `ARPayloadMapper.Parse()` → `ARExperiencePayload`
- Current ARExperienceHandler processes single payload; multi-card routing needs integration with CardImageLibraryBuilder
