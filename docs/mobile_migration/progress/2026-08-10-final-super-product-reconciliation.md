# Final Super Product Plan Reconciliation — 2026-08-10

## Session
2026-08-10, agent: claude, branch: MindAR-Update

## Goal
FAST SURGICAL CORRECTION PASS on the approved `2026-08-10-final-super-product-plan.md`. Correct architectural inaccuracies, remove unapproved magic numbers, integrate real Blender/MongoDB/Supabase architecture, fix task ownership, and establish implementation→spec/plan feedback rule. No runtime code changes.

## Cold-Start Evidence Read

| Document | Status |
|----------|--------|
| `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` | ✅ existing |
| `docs/mobile_migration/spec/learner-product-spec.md` | ✅ existing |
| `docs/mobile_migration/spec/learner-parity-matrix.md` | ✅ existing |
| `docs/mobile_migration/spec/interactive-3d-model-spec.md` | ✅ existing |
| `docs/mobile_migration/spec/pronunciation-ai-spec.md` | ✅ existing |
| `docs/mobile_migration/plans/pronunciation-ai-ml-plan.md` | ✅ existing |
| `docs/unity_ar/plans/2026-08-09-master-orchestration-plan.md` | ✅ existing |
| `docs/unity_ar/progress/2026-08-10-m3a-rn-native-tracking-dto.md` | ✅ latest |
| `docs/mobile_migration/progress/2026-08-10-super-plan-surgical-corrections.md` | ✅ previous corrections |
| `docs/mobile_migration/spec/game-catalog.md` | ✅ existing |
| Backend ODM (`backend/database/connection.py`) | ✅ Beanie ODM confirmed |
| Supabase URL builders (`backend/core/url_builders.py`) | ✅ confirmed |
| Cat animation skill (`.cursor/skills/cat-quadruped-rig/SKILL.md`) | ✅ Blender cat-agent confirmed |

---

## Corrections Applied to `final-super-product-plan.md`

### 1. Magic Numbers — REMOVED

| Location | Was | Now |
|----------|-----|-----|
| Flashcard animation | `scale 1.0 → 1.1 → 1.0, 300ms` | "configurable animation profile" |
| Cat interaction XP | `head=2, body=1, tail=1, food=3` | "configurable" |
| Gamification XP | hard-coded amounts per hotspot | "backend/config-owned reward values" |
| Pronunciation thresholds | `GREAT ≥ 80, GOOD TRY ≥ 50` | "calibration-required; thresholds from PRON-A6 evidence" |

### 2. Pronunciation Ownership — CORRECTED

**USER_ML owns (NOT Cursor):**
- Dataset research, preparation, phoneme labeling
- Baseline experiments, model adaptation/fine-tuning
- GOP/pronunciation scoring research
- Evaluation, child-friendly calibration
- ONNX export, quantization, optimization
- CPU benchmark, hosting experiment, final deployment
- Model/scoring/calibration versioning

**BACKEND owns:**
- Stable pronunciation scoring API
- Request validation, inference-service integration
- Attempt/idempotency handling
- Model/scoring version exposure
- Privacy/retention enforcement

**CURSOR owns (RN only):**
- Microphone permission UX, recording lifecycle
- Reference pronunciation playback
- Pronunciation practice UI
- PronunciationScoringAdapter + Mock + Remote adapters
- Loading/scoring/cold-start/error UX
- Child-friendly feedback UI, retry UX
- Reward/progress integration, RN tests

### 3. LoRA — NOT PRESELECTED

Changed: `PRON-A4: Fine-tuning (LoRA)` → `PRON-A4: Fine-tuning / Model Adaptation`

Allowed strategies (evidence-dependent):
- Frozen backbone + scoring/CTC head
- Partial fine-tuning
- Full fine-tuning where feasible
- PEFT/LoRA where technically appropriate
- Distillation
- Smaller backbone fallback

### 4. Pronunciation Service Contract — MODEL-AGNOSTIC

RN must NOT know whether service uses mHuBERT, Wav2Vec2, HuBERT, DistilHuBERT, GOP, ONNX Runtime, or PyTorch.

Minimal response contract:
```typescript
interface PronunciationScoreResult {
  attemptId: string;
  normalizedScore: number;      // calibrated 0–100 (PRON-A6 calibration REQUIRED)
  feedbackBand: 'GREAT' | 'GOOD TRY' | 'TRY AGAIN';  // PRON-A6 mapping
  modelVersion: string;
  scoringVersion: string;
  // Optional: calibrationVersion, diagnostics, transcript (ASR output if exposed)
}
```

NOT in stable contract: `transcript` (optional only), `targetWord` (RN knows vocabularyId), `feedback`/`feedbackEmoji`/`stars` (RN layer produces these).

### 5. Pronunciation Privacy Boundary — EXPLICIT

Child audio inference architecturally separate from training-data collection:
- Default: record → inference → result → discard raw audio
- Retention/consent/training-data eligibility: `PRON-B0 = DECISION_REQUIRED`
- Inference recordings are NOT automatically part of the fine-tuning dataset

### 6. Pronunciation Hosting — NOT HARD-CODED

Provider selection is a post-training benchmark decision. Path:
```
trained model → export → optimize → quality re-evaluation
→ actual runtime benchmark → hosting benchmark → deployment decision
```
Metrics measured: loaded memory, peak inference memory, cold start, warm p50/p95 latency, request stability, container size.

Do NOT select Render/Hugging Face/provider based solely on checkpoint file size.

### 7. Blender Cat Animation — REAL ASSET WORKFLOW INTEGRATED

**Fact confirmed:** Cat model is being refined in Blender via `cat-agent/` workstream (`.cursor/skills/cat-quadruped-rig/SKILL.md`). The cat has Blender animation Actions that will be exported to GLB.

**NOT Unity's job:**
- Creating Cat animation Actions
- Rigging the Cat
- Authoring animation clips

**Unity's job (consumers):**
- Loading exported GLB
- Discovering exported animation clips at runtime
- Validating configured animation actions
- Triggering animation actions
- Synchronizing model-local audio
- Runtime interaction state

**Pipeline:**
```
Blender Cat → existing/refined animation Actions → GLB export
→ GLTFast loads → runtime animation discovery/registry
→ ModelInteractionDefinition references verified action names
→ touch hotspot → play VERIFIED existing animation + configured audio
→ MODEL_INTERACTION semantic event
```

### 8. Cat Animation Names — NO INVENTED NAMES

Removed planning-only invented names unless actual exported GLB contains them:
- ❌ `head_bump` (invented)
- ❌ `body_rub` (invented)
- ❌ `tail_swish` (invented)

Interaction config references verified exported Action/clip names. If absent → `ASSET_CONFIG_MISMATCH`, not Unity runtime feature gap.

### 9. ASSET/BLENDER Workstream — EXPLICIT SEPARATION

Owner: ASSET / BLENDER workstream (NOT Cursor)

Responsibilities:
- Cat Action refinement, cleanup
- Loop/non-loop QA
- Rig/deformation QA
- Export verification
- GLB clip-name verification

### 10. MongoDB ODM — BEANIE CONFIRMED

Backend uses **Beanie ODM** (async MongoDB ODM built on Pydantic v2). Confirmed in:
- `backend/database/connection.py` — registers document models with Beanie
- `backend/database/mongodb.py` — "MongoDB Connection using Beanie ODM"
- `backend/database/README.md` — "Beanie is an async ODM for MongoDB built on top of Pydantic"

**No new ODM introduced. No MongoEngine/Beanie redesign needed.**

Existing Beanie Documents for relevant entities:
- `UserDocument`, `Flashcard`, `LearningProgressDocument`, `QuizAttemptDocument`
- `PetDocument`, `PronunciationAttemptDocument`, `LearningPathDocument`
- `SessionLogDocument`, `FeedbackTemplateDocument`
- `CourseLesson`, `UserSession`, `RedisCache`
- `ProfileContentDocument`, `FlashcardEditor`, `ARCombination`

### 11. Supabase Storage — CONFIRMED ARCHITECTURE

Supabase Storage owns binary/media assets. Backend provides centralized URL builders:
- `supabase_base_url()` — canonical Supabase public storage base
- `mind_file_url(path)` — MindAR .mind files
- `model_3d_url(path)` — 3D models (.glb)
- `image_2d_url(path)` — 2D flashcard images
- `supabase_resolve_placeholders(obj)` — replaces `__SUPABASE_BASE__` in seed JSON

**Rules:**
- RN/Unity must NOT hard-code Supabase URLs
- Product data stores: asset reference/path OR backend-resolved URL
- Backend resolves usable asset URLs
- Keep current public-asset compatibility where required

### 12. Data-Driven Content Architecture — INTEGRATED

MongoDB → ODM/Repository → Domain/Content Service
→ structured metadata + asset references
→ Supabase Storage
→ Backend resolver/API
→ typed DTO
→ RN/Unity mapping

Dynamic content != Record<string, any>. Core contracts remain strongly typed.

### 13. 3D Config + Blender Actions — INTEGRATED

```
MongoDB interaction config
↓
interactionId + animationAction (verified exported Action/clip) + audioAsset
↓
Backend DTO → Unity
↓
GLTFast loads GLB → discover actual available animation clips
↓
validate configured action exists → interaction enabled
↓
If absent: ASSET_CONFIG_MISMATCH (explicit error, not silent fallback)
```

### 14. Unity Queue — SEPARATED AR-DEPENDENT vs GENERIC 3D

Generic 3D tasks (implementable in non-AR test scene, Unity P0 baseline):
| Task | Can Start Before P3? |
|------|---------------------|
| U1: Generic ModelInteractionHotspot | YES |
| U2: Touch raycast | YES |
| U3: Animation mapping | YES |
| U4: Audio mapping | YES |
| U5: MODEL_INTERACTION event | YES |
| U6: Cat fixture in non-AR scene | YES |
| U7: Animation/audio cooldown | YES |

AR runtime-dependent (P4/P5 gates):
| Task | Requires |
|------|----------|
| U8: Multi-card AR tracking | P4 |
| U9: Combo proximity + dwell | P5 |
| U10: Gamification bridge | P5 |

### 15. Cursor READY_NOW Queue — ACCURATE

**TRUE READY_NOW (3 tasks):**
| # | Task | Phase | Reason |
|---|------|-------|--------|
| C14 | Tap-to-hear + bounce primitive | R5 | Can implement with existing audioUrl |
| C26 | XP idempotency hook | R8 | gamificationService exists |
| C27 | XP display in header | R8 | gamificationService exists |

**READY_AFTER_PHASE (22 tasks):** C1–C13, C15–C19, C24–C25

**READY_AFTER_DECISION (3 tasks):**
- C2: Guest mode hook (DQ-9)
- C18: ColorLearn canvas (GAME-DQ-1)
- C32–C35: Session management (DQ-10)

**READY_AFTER_UNITY (1 task):** AR touch (R12)

**DEFERRED:** AI Chat (R11), FeedThePet (bonus), Full AR (R12)

### 16. Gamification — SEMANTIC EVENTS, NO HARDCODED XP

XP amounts are configurable/backend-owned. Unity MUST NOT persist XP directly.

Semantic events:
- `LESSON_COMPLETED`, `FLASHCARD_MASTERED`, `GAME_COMPLETED`
- `PRONUNCIATION_SUCCESS`, `AR_COMBO_DISCOVERED`
- `MODEL_INTERACTION_DISCOVERED`, `STREAK_REACHED`, `PET_CARE_ACTION`

Unity emits `MODEL_INTERACTION` events. RN maps to reward. Backend is persistent source of truth.

### 17. Demo Status Labels — ACCURATE

| Label | Meaning |
|-------|---------|
| IMPLEMENTED | Already exists in codebase (verified) |
| PLANNED | Documented in spec; not yet started |
| BLOCKED | Waiting on external dependency |
| DEMO_MOCKABLE | Demonstrable with mock data (pronunciation = mock, NOT real AI) |

### 18. Cutover Graph — PARALLEL

```
RN Learner Work ───────────────────────────────────────────┐
                                                           │
Pronunciation RN UX ─────────────────────────────┐          │
                                                   │          │
USER_ML workstream ──────────────────────────────┴──→ Pronunciation Real-E2E Gate ──┤
                                                                                      │
Unity/Mobile AR readiness ─────────────────────────────────────────────────────────┤
                                                                                      │
Android E2E ──────────────────────────────────────────────────────────────────────────┤
                                                                                      ▼
                                                               PRODUCT CUTOVER GATE
```

Pronunciation readiness is parallel to learner work, NOT sequential after R15.

### 19. Implementation → Spec/Plan Feedback Rule — ESTABLISHED

**SMALL IMPLEMENTATION DISCOVERY** (reconciled same session):
- Exact file path differs
- Exported clip has verified different name
- Existing backend field name differs
- Local implementation detail needs documentation correction

**ARCHITECTURAL / CROSS-SYSTEM DISCOVERY** (requires STOP + reconciliation):
- Bridge contract must change
- Backend schema semantics change
- New persistent identity needed
- Unity ↔ RN ownership changes
- Reward persistence behavior changes
- Pronunciation service contract changes materially
- Security model changes

Required workflow:
```
IMPLEMENT
    ↓
new evidence / mismatch?
    │
    ├── NO → test → progress → STOP
    │
    └── YES
          → capture concrete evidence
          → identify owning spec/plan
          → update MINIMUM required documentation
          → update task/dependency status
          → record change in progress
          → continue only if contract remains coherent
```

### 20. Decision Hygiene — AUDITED

**CLOSED (verified):**
| ID | Resolution |
|----|------------|
| RQ-3 | `arTag` NOT on CardDescriptorRN. Unity MultiCardRegistry is lookup mechanism. |
| BQ-3 | NO default `physical_width_m`. Mapper returns `unavailable` when missing. |

**Still OPEN (25 decisions):**
DQ-1 through DQ-10, PRON-DQ-1/2/3, GAME-DQ-1/2/3, MQ-1/3/6/7, RQ-4, BQ-1/2, 3D-DQ-1/2/3.

No decisions reopened without evidence.

---

## Files Corrected

| File | Change |
|------|--------|
| `docs/mobile_migration/plans/2026-08-10-final-super-product-plan.md` | Magic numbers removed, pronunciation ownership corrected, LoRA deselected, Blender asset reality integrated, MongoDB ODM (Beanie) confirmed, Supabase architecture documented, data-driven content rules added, Cursor READY_NOW accurate, Unity queue separated, cutover graph parallel, feedback rule established |

## Files NOT Changed

- No runtime implementation occurred
- No spec files changed (only Super Plan corrected)
- Historical progress entries unchanged
- No new planning artifacts created

---

## Progress Entry Path

`docs/mobile_migration/progress/2026-08-10-final-super-product-reconciliation.md`

---

## Confirmations

- ✅ No runtime code modified
- ✅ No Unity source modified
- ✅ No backend runtime modified
- ✅ No frontend-web modified
- ✅ No package manifests modified
- ✅ No Unity scenes/ProjectSettings modified
- ✅ Only documentation/planning files corrected
- ✅ Magic numbers removed (animation, XP, pronunciation thresholds)
- ✅ Pronunciation ownership corrected (USER_ML / BACKEND / CURSOR clear)
- ✅ Pronunciation API contract is minimal and model-agnostic
- ✅ LoRA is NOT mandatory
- ✅ Blender Cat animation workflow integrated (ASSET/BLENDER owns authoring)
- ✅ No invented Cat animation clip names
- ✅ MongoDB ODM is Beanie (existing, not introduced)
- ✅ Supabase Storage architecture documented
- ✅ Data-driven content rules added
- ✅ True READY_NOW queue is accurate (3 tasks)
- ✅ READY_AFTER_* task groups are accurate
- ✅ Unity queue distinguishes AR-dependent from generic 3D infrastructure
- ✅ Gamification uses semantic reward events, not hard-coded XP
- ✅ Pronunciation privacy boundary explicit
- ✅ Pronunciation hosting is a post-training benchmark decision
- ✅ Final cutover graph shows PARALLEL readiness
- ✅ Pronunciation readiness is parallel to learner work
- ✅ Bonus games do not block MVP
- ✅ M1A/M2/M3A completion preserved
- ✅ Demo status labels distinguish IMPLEMENTED / PLANNED / DEMO_MOCKABLE
- ✅ Implementation → spec/plan feedback rule established
- ✅ No decisions reopened without evidence
- ✅ RQ-3 CLOSED, BQ-3 CLOSED preserved

---

## Plan Executability

**Status:** The Super Product Plan is the current approved implementation baseline.

| Workstream | Can Begin | Prerequisites |
|------------|-----------|----------------|
| Cursor READY_NOW tasks (C14, C26, C27) | YES | None |
| Cursor R1–R5 phases | YES | Auth wiring exists |
| Cursor pronunciation mock UX | YES | Mock adapter contract |
| USER_ML PRON-A0 | YES | None |
| Unity U1–U7 (non-AR 3D infra) | YES | Unity P0 baseline |
| Unity U8–U10 (AR runtime) | NO | P4/P5 gates |
| Backend BACKEND-T001 | YES | None |
| Backend pronunciation API | NO | PRON-A7 readiness |

**Blocking Decisions:**
| Decision | Must Resolve By |
|----------|-----------------|
| DQ-9: Guest mode scope | Before R1 complete |
| DQ-10: Session constants | Before R10 |
| GAME-DQ-1: Canvas library | Before ColorLearn |
| PRON-B0: Privacy policy | Before pronunciation cutover |
