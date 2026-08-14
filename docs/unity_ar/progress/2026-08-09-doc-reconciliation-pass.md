## Session
2026-08-09 18:30, agent: opus-4.8, branch: MindAR-Update

## Goal
Documentation correction pass: reconcile Unity AR + Mobile AR planning graph. 18 objectives addressed. No product/runtime implementation.

---

## Files updated

| File | Change |
|------|--------|
| `spec/000-index.md` | Added orchestration plans section; fixed nonexistent `image-tracking.md` and `model-delivery.md` index entries |
| `spec/acceptance-gates.md` | Added AC-BACKEND-001/002; fixed MOB-GATE-004–008 environment from UNITY_EDITOR to RN_TEST/XR_SIMULATION; updated gate counts |
| `spec/architecture-specification.md` | Closed AQ-1/2/3 as resolved; added Status column to open questions |
| `spec/backend-contract.md` | Added Tracking Identity section with qrId/arTag/referenceImage/TrackableId table; clarified required_tags contains ar_tag not qr_id; added naming note on imageUrl |
| `spec/bridge-contract.md` | Added tracking state vs. trackable removal semantic distinction; added RQ-4 open question; updated onImageTrackingLost payload to show qrId + reason |
| `spec/mobile-ar-product-spec.md` | Fixed MOB-AR-REQ-REQ typo to MOB-LIFE-REQ-001; fixed MOB-GATE-004–008 environments; added XP Persistence architectural notes with DECISION_REQUIRED |
| `plans/2026-08-09-unity-ar-migration-plan.md` | P11 renamed "Legacy Cutover" → "Unity Cutover Readiness"; removed RN routing ownership; added P6 → Mobile M6 dependency; fixed CONT-REQ-002 typo; M1 split into M1A/M1B to remove circular P1 dependency; Phase 2 acceptance gate updated to AC-BACKEND-001/002 |
| `plans/2026-08-09-mobile-ar-migration-plan.md` | M1 split into M1A (contract spec) / M1B (runtime conformance); M3 split into M3A (backend/DTO) / M3B (native AR_READY E2E requiring P3 gate); M6 added P6 prerequisite; cross-system table updated |
| `plans/2026-08-09-master-orchestration-plan.md` | **Created** — thin cross-system plan: ownership boundaries, 13-milestone table, 6 E2E gates, feature parity gate |
| `blockers/2026-08-09-arsessionmanager-tracking-lost-regression.md` | Fixed broken AC-TRACK-011 reference to AC-TRACK-001 + TRACK-REQ-011; fixed stale AQ-2 reference to bridge-contract RQ-4 |
| `blockers/2026-08-09-native-ar-backend-missing-fields.md` | Added AC-BACKEND-001/002 to Blocks list; extended resolution steps to 8 items including migration verification |
| `tasks/2026-08-09-p0-t002-repair-arscene-placeholder.md` | Replaced blind .meta-regeneration guidance with 6-step investigation protocol |

---

## Objective resolutions

### 1. Tracking contract — single source of truth
Added explicit "Tracking Identity" section to `backend-contract.md` defining four layers: qrId (business flashcard), arTag (semantic combo), reference image identity (AR tracking definition), TrackableId (runtime instance). Clarified required_tags contains ar_tag values. Named imageUrl consistently across backend/RN/Unity. Required_tags → runtime cards resolved via arTag → MultiCardRegistry.

### 2. Tracking lost vs. trackable removed
Added semantic distinction to `bridge-contract.md`: tracking state change (TRACKING/LIMITED/NONE) vs. trackable removal (removed from ARTrackedImageManager registry). onImageTrackingLost = trackable removal only (TRACK-REQ-011). Temporary degradation must NOT fire onImageTrackingLost. Added RQ-4 decision.

### 3. M1 circular dependency removed
M1 split: M1A = contract specification (can proceed from repository ground truth, no Unity P1 required), M1B = runtime conformance verification (requires Unity P0). Eliminates circular dependency.

### 4. M3 native AR_READY E2E dependency
M3 split: M3A = backend/DTO/experience preparation (blocked on BACKEND-T001), M3B = native AR_READY E2E (blocked on Unity P3/AC-TRACK-003). E2E tracking verification cannot use XR baseline alone.

### 5. P6 → Mobile dependency
Unity plan cross-system table: added P6 (backend combo consumption) → M6 (combo UX). Mobile plan M6 prerequisites added P6. Cross-system dependency graph now connected at P6.

### 6. Unity cutover ownership
P11 renamed "Legacy Cutover" → "Unity Cutover Readiness". Removed all RN routing language. Added explicit note: RN routing cutover owned by Mobile M12, not Unity P11. P11 deliverables = Unity production readiness only.

### 7. Master orchestration plan
Created `plans/2026-08-09-master-orchestration-plan.md` (draft). Thin plan: ownership boundaries table, 13-milestone cross-system table, 6 E2E gates, feature parity gate. Does NOT duplicate Unity/Mobile detailed tasks.

### 8. Backend acceptance gate
Added AC-BACKEND-001 (schema + serialization) and AC-BACKEND-002 (migration populated). Clarified AC-BACKEND ≠ AC-BRIDGE. Phase 2 acceptance gate updated from AC-BRIDGE-002 to AC-BACKEND-001/002.

### 9. Mobile acceptance environments
Fixed MOB-GATE-004 through MOB-GAME-008 from UNITY_EDITOR to RN_TEST/XR_SIMULATION. RN UX cannot be verified by Unity Editor alone. MOB-GATE-001–003, 009–013 already correct.

### 10. XP persistence ambiguity
Added explicit "XP Persistence — Architectural Notes" section to mobile-ar-product-spec.md. Two approaches documented (immediate vs. session-end). Constraint: retry must not require AR replay. DECISION_REQUIRED (MQ-3) preserved. M7 cannot silently implement conflicting behavior.

### 11. Traceability repairs
- Fixed `MOB-AR-REQ-REQ` → `MOB-LIFE-REQ-001` in mobile-ar-product-spec.md
- Fixed `CONT-REQ-002` → `CONTENT-REQ-002` in Unity plan
- Fixed broken `AC-TRACK-011` reference in arsessionmanager-tracking-lost-regression blocker → AC-TRACK-001 + TRACK-REQ-011
- Fixed stale `AQ-2` reference in same blocker → bridge-contract RQ-4
- Fixed nonexistent `image-tracking.md` index entry → consolidated to requirements baseline
- Fixed nonexistent `model-delivery.md` index entry → consolidated to requirements baseline

### 12. P0-T002 scene safety
Replaced "reimport missing scripts" guidance with 6-step investigation protocol: inspect exact broken reference → git history → determine if original asset exists → prefer restoring original .meta/GUID → only remove component if intentionally deleted → do not generate new GUID and assume fix.

### 13. Plan/task approval state
All plans (Unity, Mobile, Master) remain `draft`. All tasks remain `open`. No plans auto-approved. Process reason recorded: architecture questions not fully resolved (backend fields, XP decision, physical width measurement pending).

---

## Contract decisions clarified
- qrId/arTag/referenceImage/TrackableId four-layer identity model documented
- required_tags contains ar_tag values (not qr_id) — resolves combo association question
- onImageTrackingLost = trackable removal, NOT tracking state degradation
- AQ-1/2/3 closed as resolved (already answered by later spec work)
- RQ-4 opened: should onImageTrackingLost include reason field?

---

## Dependency graph corrections
- M1: removed artificial P1 circular dependency (split M1A/M1B)
- M3: separated M3A/M3B (backend/DTO vs. AR_READY E2E)
- P6: connected to Mobile M6 (combo UX)
- P11: removed RN routing ownership; M12 owns routing cutover
- Backend: AC-BACKEND-001/002 gates added before AC-BRIDGE-002

---

## Unresolved DECISION_REQUIRED items

| # | Decision | Owner | Where |
|---|----------|-------|-------|
| MQ-3 | XP persistence — immediate on combo or session-end? | Product | M7, mobile spec |
| MQ-6 | AR capability detection — Unity or RN? | Unity/Mobile | M4 |
| BQ-2 | Reference image = image_2d_url or separate? | Content/Design | P2/M3 |
| BQ-3 | Default physical_width_m for unmapped cards? | Product/Content | P2/M3 |
| RQ-4 | onImageTrackingLost reason field? | Mobile architect | bridge contract |
| MQ-1 | startImageTrackingMulti replace or parallel? | Mobile architect | M3 |
| MQ-2 | WebAR fallback — separate screen or mode flag? | Mobile architect | M9 |
| MQ-4 | Tracking guidance string wording? | UX/i18n | M5 |
| MQ-5 | Camera permission — RN pre-request or Unity delegate? | Mobile architect | M4 |

---

## Tasks currently executable vs. blocked

| Task | Status | Reason |
|------|--------|--------|
| P0-T001 (GLTFast) | open, executable | Needs Unity Editor only |
| P0-T002 (ARScene repair) | open, executable | Needs Unity Editor + investigation protocol |
| BACKEND-T001 (native AR fields) | open, executable | Backend only; blocked on BQ-2/3 decisions |
| P1-T001 (XR sim runtime library) | blocked | P0-T001 must complete |
| M1A (contract specification) | open, executable | Repository ground truth; no Unity gates needed |
| M1B (runtime conformance) | blocked | P0 complete required |

---

## Progress entry
`docs/unity_ar/progress/2026-08-09-doc-reconciliation-pass.md`

## Recommended next executable action
M1A (bridge contract specification) — can proceed immediately from repository ground truth. No Unity gates, no backend changes, no AR hardware. Inspect existing Unity scripts, existing RN types, existing bridge events. Finalize bridge-contract.md. Then P0-T001 (GLTFast verification) in parallel.

## Confirmation
No product/runtime implementation occurred. No Unity scripts, scenes, React Native runtime, backend runtime, packages, ProjectSettings, or tooling configuration modified. Only docs/unity_ar/ planning files changed.
