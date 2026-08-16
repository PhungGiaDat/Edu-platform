# Surgical Correction Pass — 2026-08-10

## Session
2026-08-10, agent: claude, branch: MindAR-Update

## Goal
Apply FAST SURGICAL CORRECTION PASS to `2026-08-10-final-super-product-plan.md` per user feedback. Fix magic numbers, pronunciation ownership, queue status, cutover graph, and plan authority. No runtime code changes.

## Issues Corrected

### 1. Magic Numbers Removed

| Location | Was | Now |
|----------|-----|-----|
| Flashcard animation | `scale 1.0 → 1.1 → 1.0, 300ms` | "configurable flashcard bounce (configurable animation profile)" |
| Cat interaction XP | `head=2, body=1, tail=1, food=3` | "configurable" |
| Gamification XP | hard-coded amounts | "configurable" |
| Pronunciation thresholds | `GREAT ≥ 80, GOOD TRY ≥ 50` | "PRON-A6 calibration REQUIRED" |

### 2. Pronunciation Feedback Bands

- Raw model score → calibration layer → normalized product score → feedback band
- Thresholds are NOT approved until PRON-A6 calibration evidence
- Added `PRON-A6 calibration REQUIRED` markers throughout

### 3. LoRA Preselection Removed

| Was | Now |
|-----|-----|
| PRON-A4: Fine-tuning (LoRA) | PRON-A4: Fine-tuning / model adaptation |

USER_ML must evaluate: full/partial fine-tuning, frozen backbone + head, PEFT/LoRA, distillation, smaller backbone. Do NOT pre-select before PRON-A0/A3 evidence.

### 4. Pronunciation Ownership Clarified

**USER_ML owns:**
- dataset, experiments, fine-tuning, evaluation, calibration, ONNX export, hosting

**BACKEND owns:**
- stable pronunciation scoring API, request validation, inference-service integration

**CURSOR owns:**
- pronunciation UX, mock adapter, recording UX, loading/error UX, child-friendly result UI, reward integration

PRON-A7 and PRON-A8 are cross-workstream integration gates, not purely USER_ML.

### 5. Pronunciation Service DTO — Minimal Contract

Removed from stable contract:
- ❌ `transcript` (OPTIONAL only)
- ❌ `targetWord` (product layer knows vocabularyId)
- ❌ `feedback` / `feedbackEmoji` / `stars` (RN layer produces these)

Minimal contract:
```typescript
interface PronunciationScoreResult {
  attemptId: string;
  normalizedScore: number;      // calibrated 0–100
  feedbackBand: 'GREAT' | 'GOOD TRY' | 'TRY AGAIN';
  modelVersion: string;
  scoringVersion: string;
  // Optional: calibrationVersion, diagnostics, transcript
}
```

### 6. Cursor READY_NOW Queue — Accurate Classification

**TRUE READY_NOW (3 tasks):**
- C14: Tap-to-hear + bounce primitive
- C26: XP idempotency hook
- C27: XP display in header

**READY_AFTER_PHASE (22 tasks):** C1–C13, C15–C19, C24–C25
**READY_AFTER_DECISION (4 tasks):** C2 (DQ-9), C18 (GAME-DQ-1), C32–C35 (DQ-10)
**READY_AFTER_UNITY (1 task):** AR touch (R12)
**DEFERRED:** AI Chat (R11), FeedThePet (bonus), Full AR (R12)

### 7. Unity Queue — Separated AR-Dependent vs Generic 3D

| Task | Classification | Can Implement Before P3? |
|------|---------------|--------------------------|
| U1: ModelInteractionHotspot | READY_AFTER_UNITY | YES (non-AR scene) |
| U2: Touch raycast | READY_AFTER_UNITY | YES (non-AR scene) |
| U3: Animation mapping | READY_AFTER_UNITY | YES (non-AR scene) |
| U4: Audio mapping | READY_AFTER_UNITY | YES (non-AR scene) |
| U5: MODEL_INTERACTION event | READY_AFTER_UNITY | YES (bridge) |
| U6: Cat interaction fixture | READY_AFTER_UNITY | YES (non-AR scene) |
| U7: Animation/audio cooldown | READY_AFTER_UNITY | YES (non-AR scene) |
| U8: Multi-card AR tracking | READY_AFTER_PHASE | NO (requires P4) |
| U9: Combo proximity + dwell | READY_AFTER_PHASE | NO (requires P5) |
| U10: Gamification bridge | READY_AFTER_PHASE | NO (requires P5) |

### 8. Gamification Correction

- XP amounts: "configurable" throughout
- Added `rewardEvent` semantic type to ModelInteractionHotspot
- XP owned by product/backend layer, NOT hard-coded
- Added idempotency note: `rewardEventId / attemptId / idempotencyKey`

### 9. Final Cutover Graph — PARALLEL Readiness

```
RN Learner Work ───────────────────────────────────────┐
                                                     │
Pronunciation RN UX ──────────────────────────┐       │
                                              │       │
USER_ML workstream ───────────────────────────┴──→ Pronunciation Real-E2E Gate ──┤
                                                                                 │
Unity/Mobile AR readiness ───────────────────────────────────────────────────┤
                                                                                 │
Android E2E ───────────────────────────────────────────────────────────────────┤
                                                                                 ▼
                                                              PRODUCT CUTOVER GATE

IF pronunciation is CORE/MVP scope → real pronunciation readiness required before cutover
IF pronunciation is explicitly deferred → cutover may proceed without it
```

### 10. Game Catalog States

| Game | State |
|------|-------|
| DragMatch | CORE |
| MemoryPairs | CORE |
| ColorLearn | CORE (DECISION_REQUIRED: GAME-DQ-1) |
| ListenChoose | BONUS_CANDIDATE |
| SoundMatch | BONUS_CANDIDATE |
| QuickTap | BONUS_CANDIDATE |
| FeedThePet | BONUS_CANDIDATE |
| FindIt | BONUS_CANDIDATE |
| WordBuilder | DEFERRED |

Bonus games do NOT block MVP.

### 11. Pronunciation Privacy

- Child audio inference is architecturally separate from training-data collection
- Default: record → inference → result → discard raw audio
- Retention/consent policy is PRON-B0 — DECISION_REQUIRED

### 12. Pronunciation Hosting

- USER_ML/shared planning for visibility
- NOT part of RN architecture
- Required path: train → export → optimize → quality re-evaluation → CPU benchmark → hosting benchmark → deploy
- Do NOT pre-select provider based solely on checkpoint file size

### 13. Demo Status Labels

| Label | Meaning |
|-------|---------|
| IMPLEMENTED | Already exists in codebase (verified) |
| PLANNED | Documented in spec; not yet started |
| BLOCKED | Waiting on external dependency |
| DEMO_MOCKABLE | Can be demonstrated with mock data (pronunciation = mock, NOT real AI) |

### 14. Plan Authority

This plan provides **orchestration only**. Detailed specs live in authority documents. No new planning roots created.

---

## Remaining Decisions (Audit)

### OPEN (must be resolved before blocking work)

| ID | Question | Blocks | Owner |
|----|----------|--------|-------|
| DQ-1 | Animals canonical source | R2 | Product |
| DQ-2 | Lesson player canonical | R4 | Product/Architect |
| DQ-3 | Pronunciation endpoint selection | R7 | Backend |
| DQ-4 | Flashcard systems | R5 | Product |
| DQ-5 | Mini-games per-game | R6 | Product |
| DQ-6 | Pet 3D viewer strategy | R9 | Product/Architect |
| DQ-7 | AI Chat inclusion | R11 | Product |
| DQ-8 | Cutover trigger | R15 | Product |
| DQ-9 | Guest mode scope | C2 (R1) | Product |
| DQ-10 | Session constants | C32–C35 (R10) | Product |
| PRON-DQ-1 | Pronunciation endpoint canonical | PRON-A7 | Backend |
| PRON-DQ-2 | Child audio data policy | PRON-B0 | Product/Legal |
| PRON-DQ-3 | Score band thresholds | R7 | Product |
| GAME-DQ-1 | Canvas library for ColorLearn | C18 | Architect |
| GAME-DQ-2 | Sound assets for SoundMatch | GAME-5 | Content |
| GAME-DQ-3 | Game difficulty auto-adjust | All games | Product |
| MQ-1 | Multi-card replace vs parallel | M6 | Unity |
| MQ-3 | XP persistence timing | M7 | Product |
| MQ-6 | AR capability detection | M4 | Unity/Mobile |
| MQ-7 | Combo identity (arTag vs qrId) | M6 | Unity |
| RQ-4 | onImageTrackingLost.reason | M9 | Unity |
| BQ-1 | AR objects migration | M3B | Backend |
| BQ-2 | Reference image source | M3B | Content |
| 3D-DQ-1 | Food proximity hysteresis | GAME-8 | Product/UX |
| 3D-DQ-2 | Hold interaction duration | 3DINT | Unity |
| 3D-DQ-3 | Drag interaction for food | GAME-8 | Unity |

### CLOSED (verified)

| ID | Resolution |
|----|------------|
| RQ-3 | `arTag` NOT on CardDescriptorRN. Unity MultiCardRegistry is the lookup mechanism. |
| BQ-3 | NO default `physical_width_m`. Mapper returns `unavailable` when missing. |

---

## Files Corrected

- `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md`

## Files NOT Changed

- No runtime code modified
- No spec files changed
- Historical progress entries unchanged
- No new planning artifacts created

---

## Confirmations

- ✅ No runtime implementation occurred
- ✅ Only documentation/planning files corrected
- ✅ Magic numbers removed (animation, XP, pronunciation thresholds)
- ✅ Pronunciation ownership clarified (USER_ML / BACKEND / CURSOR)
- ✅ Pronunciation API contract is minimal and model-agnostic
- ✅ LoRA is NOT mandatory
- ✅ True READY_NOW queue is accurate (3 tasks)
- ✅ READY_AFTER_* task groups are accurate
- ✅ Unity queue distinguishes AR-dependent from generic 3D infrastructure
- ✅ Gamification uses semantic reward events, not hard-coded XP
- ✅ Final cutover graph shows PARALLEL readiness
- ✅ Pronunciation readiness is parallel to learner work
- ✅ Bonus games do not block MVP
- ✅ M1A/M2/M3A completion preserved
- ✅ Pronunciation privacy noted as DECISION_REQUIRED
- ✅ Demo status labels distinguish IMPLEMENTED / PLANNED / DEMO_MOCKABLE
