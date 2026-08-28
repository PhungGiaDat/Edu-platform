# Multi-Flashcard AR — Updated Plan (Architecture Options, MongoDB Schema, Way Forward)

> Reference: `plan/20260706_MULTI_FLASHCARD_FIX_PLAN.md` (v1 — 6-pillar runtime fix)
> Research: `research/20260706_MULTI_FLASHCARD_RESEARCH.md`
> Debug: `report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md`
> Codebase stack: **Frontend**: React + TypeScript + MindAR (iframe-based). **Backend**: FastAPI + Beanie ODM + MongoDB Atlas. **Storage**: Supabase (public buckets for `.mind`, `.glb`, 2D textures).
> Date: 2026-07-06
> Owner: planner
> Status: **AWAITING USER DECISION** on architecture option (A / B / C / D)

---

## 1. Executive Summary

The multi-flashcard AR pipeline **fails because React identity thrashing and iframe recreation race against the multi-stage async prepare**. The existing v1 fix plan (`plan/20260706_MULTI_FLASHCARD_FIX_PLAN.md`, 6 pillars, all runtime fixes in `LearnARV2.tsx`, `useMultiFlashcard.ts`, `ARContainerV2.tsx`) is correct and self-contained, but it does not address the **strategic architecture question**:

> Do we keep the runtime `mergeMindTargetBuffers()` approach forever, or invest in pre-compiled multi-target `.mind` files, or migrate to a different AR stack?

This document **augments** the v1 plan with:
1. A clear **decision matrix** across four architectural options (A / B / C / D).
2. **MongoDB schema recommendations** (Beanie Document + Pydantic) for AR flashcards, combo definitions, and user session tracking — designed to **support all four options** without rework.
3. An **updated implementation phasing** that incorporates the chosen architecture option.
4. A **risk register** and **open questions** list for the user to resolve.

**Current recommendation:** **Option A** (execute the v1 plan) as the immediate fix, with **Option D (Hybrid)** as a 60–90 day roadmap item once the runtime is stable. Option D future-proofs the system and aligns with the existing MongoDB schema proposed below.

---

## 2. State Assessment (What We Have Today)

### 2.1 Working pieces (do NOT touch)

| Subsystem | File | Status |
|-----------|------|--------|
| MindAR iframe viewer | `frontend-web/public/ar-viewer.html`, `frontend-web/public/static/ar-assets/js/ar-viewer.js` | Stable, 15s buffer wait works |
| Typed message protocol | `frontend-web/src/core/types/ARMessages.ts` | Stable (43 message types, full payload map) |
| MindAR target merge utility | `frontend-web/src/utils/mergeMindTargets.ts` | Correct — preserves targetIndex ordering |
| AbortController pattern | `frontend-web/src/hooks/useSafeGLTF.ts:255-429` | Gold-standard precedent |
| Audio cache (ref-held) | `frontend-web/src/hooks/useARAudio.ts:32` | Gold-standard ref-holder pattern |
| Combo detection (combo viewers) | `frontend-web/src/runtime/MultiFlashcardTracker.ts` | Works when combo assets exist |
| MongoDB Beanie flashcard model | `backend/models/flashcard.py` | Has `ar_tag`, ready to extend |

### 2.2 Broken pieces (the bug)

| Symptom | Root cause | v1 fix pillar |
|---------|-----------|---------------|
| 15s `MIND_BUFFER_BOOTSTRAP_ERROR` timeout | iframe `key={main-${phase}-${mainSrc}}` rebuilds on every prop churn, resetting the viewer's 15s poll loop | **Pillar 3** (stable key + ref-held buffer) |
| `MULTI_MIND_OPERATION_STALE` events | `scannedTarget0/1` (Map values) change object identity every render → effect dep array re-fires → `controller.abort()` mid-flight | **Pillars 1, 2** (snapshot ref + cancel-after-stale) |
| `useEffect` infinite loop in prepare | `state` object identity changes on every `setState` even when content is unchanged | **Pillars 1, 5, 6** (snapshots + ref-based debounce) |
| `isMultiViewer` never becomes true | Gate requires `committedMultiKey === comboKey`, but `comboKey` can be `null` mid-prepare | **Pillar 4** (status-only gate) |
| Two `addFlashcard` calls clobber each other | Both read `stateRef.current.size < 2`, both `setState`, second overwrites first | **Pillar 4** (promise chain queue) |

### 2.3 Data currently flowing through the system

From app logs (`activeCombo` log line):

```javascript
activeCombo: {
    comboId: "jungle_scene_v1",
    requiredTags: ["elephant_marker_01", "jungle_marker_01"],
    targetOrder: ["jungle_marker_01", "elephant_marker_01"],
    model3dUrl: ".../cute_elephant_jungi.glb",
    comboMindUrl: ".../combo_targets.mind"
}
```

Flashcard metadata (from `frontend-web/src/hooks/useMultiFlashcard.ts:66-75`):

```typescript
interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    mindUrl: string;
    detectedAt: number;
}
```

**Infra:** MongoDB Atlas (Beanie ODM, Motor) for metadata + state; Supabase storage for `.mind`/`.glb`/image files; React frontend with MindAR iframe.

---

## 3. Architecture Options — Decision Matrix

### Option A — Fix Current Runtime Merge (recommended immediate)

**Scope:** Execute the 6-pillar v1 plan as written. Keep runtime `mergeMindTargetBuffers()` as the only path for multi-target viewing.

| Aspect | Detail |
|--------|--------|
| React stability | Ref-based snapshot via new `useFlashcardSnapshot` hook (Edit A–C of v1 plan) |
| Iframe lifecycle | Phase-only `key` + ref-held `mindBuffer` delivery (Edits H, I) |
| Concurrency | Promise chain queue for `addFlashcard` (Edit J) |
| Combo API | Status-only `isMultiViewer` gate (Edit D) |
| Combo debounce | Ref-snapshot timer (Edit K) |
| Storage | None changed; Supabase buckets still hold single-target `.mind` files |
| Time | 4–6 hours (v1 plan §9) |
| Risk | LOW — patterns exist in codebase; rollback is single commit |
| Future-proof | Leaves door open for Option B/D |

**Pros:**
- Smallest blast radius — no storage migration, no backend changes.
- All patterns have precedent (`useSafeGLTF.ts`, `useRuntimeBridge.ts`, `ARContainer.tsx`).
- Bug fix unlocks the entire combo feature set on day 1.

**Cons:**
- Every new combo pair still requires runtime merge → still slow on cold start.
- The "load two .mind files, concatenate, postMessage to iframe" sequence always costs ~200–500ms.

### Option B — Pre-compiled Multi-target `.mind` Files

**Scope:** Backend build script generates multi-target `.mind` files for known combos; MongoDB stores `comboMindUrl`; runtime falls back to merge only for unknown combos.

| Aspect | Detail |
|--------|--------|
| React stability | Same as Option A (still needed for single-target cases and unknown combos) |
| Iframe lifecycle | Same as Option A |
| Storage | **New** Supabase bucket `assets/mind-combos/<comboId>.mind` |
| Build step | Python script (or admin API) reads N single-target `.mind` files, merges offline, uploads |
| MongoDB | `ComboDocument.comboMindUrl` becomes required; `comboMindSha256` for cache validation |
| Time | 2–3 days (build script + storage setup + 1 day integration test) |
| Risk | MEDIUM — build script is new code; offline merge must match `mergeMindTargetBuffers` byte-for-byte |

**Pros:**
- Cold-start combo latency drops from ~500ms to ~150ms (no runtime merge).
- MindAR initializes directly from a single `.mind` URL — no postMessage handover.
- Storage cost: each combo = (sum of single-target sizes) ≈ 50–200KB. For 50 known combos = ~5MB total.

**Cons:**
- Combinatorial explosion if every pair is pre-compiled. Mitigate by pre-compiling only the **published** combos.
- Build script must be invoked when new flashcards are added to a combo → adds a step to the content pipeline.
- Live editing/combination testing requires a backend round-trip (regenerate + upload).

### Option C — WebXR Native Image Tracking

**Scope:** Replace MindAR entirely with `XRSession.requestImageTrackable()` (Chrome Android, Safari iOS 17+).

| Aspect | Detail |
|--------|--------|
| React stability | The V2 iframe/buffer logic can stay (WebXR runs inside the iframe as a fallback viewer) |
| Iframe lifecycle | Same as Option A |
| Browser support | Chrome Android 88+, Safari iOS 17+ — **no desktop, no Android <13** |
| Detection API | `XRImageTrackingResult` — native confidence scores |
| Multi-target | Native via `trackedImages` array passed to `requestImageTrackable()` |
| Time | 4–6 weeks (new feature-flagged viewer; mind-file generation retired for supported browsers) |
| Risk | HIGH — Vite + Capacitor integration is new territory; some users on unsupported browsers must stay on MindAR |

**Pros:**
- Native, hardware-accelerated image tracking → +30fps headroom, lower battery.
- Native multi-target API removes runtime merge entirely.
- No `.mind` file generation step.

**Cons:**
- Limited browser reach (excludes older Android WebViews, desktop browsers in production).
- Project currently **iOS Safari on iPad** is a target device — Safari 17+ may miss iPad Safari 16 users (common in schools).
- Vite-bundled `ar-viewer.html` becomes a per-browser adaptive shell (complex).

### Option D — Hybrid (recommended future roadmap)

**Scope:** Run Option A immediately; **plan and queue** Option B's pre-compiled infra (build script + bucket); leave WebXR as a research spike for v2.

| Phase | Deliverable |
|-------|-------------|
| **Now (week 1)** | Option A: ship v1 plan (6 pillars). Combo detection works. |
| **Weeks 2–3** | Option B scaffolding: `make_combo_mind.py` script + Supabase bucket + ComboDocument schema migration. Pre-compile published combos. Frontend `useMultiFlashcard` checks for `comboMindUrl` and falls back to runtime merge. |
| **Weeks 4–8** | WebXR spike: proof-of-concept viewer; capability detection (Safari iOS 17+ / Chrome Android 88+); performance comparison vs MindAR. |
| **Weeks 9–12** | Telemetry: track combo load p95 latency. If Option B reduces >40%, deprecate runtime merge. If WebXR is faster + supported ≥80% of traffic, plan migration. |

**Pros:**
- Lowest risk today; concrete migration path to higher-perf options.
- Avoids over-investing in build infra before verifying combo usage patterns.
- Keeps the door open to all future options.

**Cons:**
- Requires discipline to actually progress through phases (otherwise becomes "Option A forever").
- Telemetry work is an additional cost.

### Decision Matrix (Score 1–5; higher = better)

| Criterion | Weight | A (Fix runtime) | B (Pre-compiled) | C (WebXR) | D (Hybrid) |
|-----------|-------:|----------------:|----------------:|----------:|-----------:|
| Bug fix effectiveness | 25% | 5 | 5 | 0 (replaces stack) | 5 |
| Implementation speed | 20% | 5 | 3 | 1 | 5 (phase 1) |
| Runtime performance | 15% | 3 | 4 | 5 | 4 (phased) |
| Future-flexibility | 15% | 2 (does not enable B/C) | 4 | 3 | 5 |
| Browser reach (today) | 15% | 5 | 5 | 2 | 5 |
| Maintenance burden | 10% | 4 | 3 (build pipeline) | 2 (per-browser) | 3 |
| **Weighted score (1–5)** | **100%** | **4.10** | **4.10** | **2.20** | **4.65** |

### Recommended decision for the user

**Option A now, with Option D roadmap.** This ships the bug fix today, leaves a clean migration path, and respects the existing codebase patterns.

---

## 4. MongoDB Schema Recommendations

> The codebase uses **Beanie ODM + Pydantic v2** (`backend/database/mongodb.py` is Motor/Beanie; `backend/models/flashcard.py` shows the convention). All schemas below follow that convention.

### 4.1 Schema design principles

1. **Forward-compatible with all four options** — fields are added without breaking Option A's existing runtime.
2. **Status fields are nullable** so Option A can run while Option B/C/D scaffolds land.
3. **All URLs are Supabase public URLs** (consistent with `useMultiFlashcard.ts:17-22`).
4. **Indexes target the actual query patterns** — by `qr_id`, `ar_tag`, `combo_id`, `(combo_id, target_index)`, and `teacher_id`.

### 4.2 Extend existing `Flashcard` document

**File:** `backend/models/flashcard.py` (modify existing class)

```python
# Add these fields to existing Flashcard class
class Flashcard(Document):
    # ... existing fields ...

    # ========== AR EXTENSION (new) ==========
    # Supabase public URL for the .mind file containing this flashcard's marker
    mind_url: Optional[str] = Field(
        None,
        description="Supabase URL: AR_models/assets/mind-files/<arTag>.mind"
    )

    # Cache-bust / versioning for the .mind file (CDN-friendly)
    mind_version: Optional[str] = None

    # SHA-256 of the .mind file (used to pre-warm CDN + verify uploads)
    mind_sha256: Optional[str] = None

    # 3D model URL — already partially represented by image_url; explicit ar_model_url
    ar_model_url: Optional[str] = None

    # 2D companion image URL (already implicit via image_url)
    ar_image_url: Optional[str] = None

    # AR category: 'object' | 'character' | 'animal' | 'scene'
    ar_category: Optional[str] = None

    # Estimated .mind file size (bytes) — used for telemetry
    mind_size_bytes: Optional[int] = None

    # Allow same ar_tag used in multiple combos (no uniqueness constraint here)
    # but ar_tag IS indexed for combo lookup
    # (already Indexed(str, unique=True) via qr_id; ar_tag needs its own index, see below)

    class Settings:
        name = "flashcards"
        indexes: list = [
            [("qr_id", 1)],                              # exists (unique)
            [("ar_tag", 1)],                             # NEW: lookup by AR marker
            [("category", 1)],
            [("difficulty", 1)],
            [("is_active", 1)],
            [("deck_id", 1), ("created_at", 1)],
            [("teacher_id", 1)],
            [("mind_sha256", 1)],                        # NEW: dedupe pre-compile
        ]
```

**Why these fields:**
- `mind_url`, `mind_version`, `mind_sha256` let Option B **dedup** `.mind` uploads (same SHA → reuse URL).
- `ar_category` enables telemetry dashboards and combo curation.
- Indexes on `ar_tag` and `mind_sha256` are the only NEW indexes; existing indexes are untouched.

### 4.3 NEW Collection: `ARCombo`

**File:** `backend/models/ar_combo.py` (new Beanie Document)

```python
"""
ARCombo — A multi-target AR experience that combines 2+ flashcards.

Designed to support Option A (runtime merge), Option B (pre-compiled .mind),
and Option C (WebXR trackedImages payload) without requiring future migrations.
"""

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class ComboTarget(BaseModel):
    """One slot in a combo."""
    target_index: int = Field(..., ge=0, le=9, description="0-based slot; matches mergeMindTargets ordering")
    ar_tag: str = Field(..., description="Must match Flashcard.ar_tag")
    role: str = Field("primary", description="primary | secondary | terrain")
    position: Optional[Dict[str, float]] = Field(
        None,
        description="[x, y, z] world position offset for this target's 3D model"
    )
    scale: Optional[Dict[str, float]] = Field(
        None,
        description="[x, y, z] scale override"
    )


class ARCombo(Document):
    """A multi-flashcard AR scene.

    Collection: ar_combos

    Status values:
      'draft'        — admin editing, not visible to students
      'pre-compiling'— build script is generating the combo .mind file
      'published'    — runtime / pre-compiled .mind available
      'deprecated'   — soft-deleted, queries filter out
    """

    combo_id: Indexed(str, unique=True)  # e.g. "jungle_scene_v1"
    title: str
    description: Optional[str] = None

    required_tags: List[str] = Field(
        ...,
        min_length=2,
        max_length=8,
        description="Flashcard ar_tags required to activate this combo"
    )

    targets: List[ComboTarget] = Field(
        ...,
        min_length=2,
        max_length=8
    )

    # 3D model + 2D layered image (combo scene assets)
    combo_model_url: Optional[str] = Field(
        None,
        description="Supabase URL of combo .glb file"
    )
    combo_image_url: Optional[str] = Field(
        None,
        description="2D layered combo image"
    )

    # ========== Multi-strategy support ==========

    # Strategy A: runtime merge (current — always required as fallback)
    runtime_merge_enabled: bool = True

    # Strategy B: pre-compiled multi-target .mind file
    combo_mind_url: Optional[str] = Field(
        None,
        description="Supabase URL of pre-compiled <comboId>.mind (Option B)"
    )
    combo_mind_sha256: Optional[str] = None
    combo_mind_size_bytes: Optional[int] = None
    combo_mind_compiled_at: Optional[datetime] = None
    combo_mind_status: str = Field(
        "not_compiled",
        description="not_compiled | pre-compiling | compiled | failed"
    )
    combo_mind_error: Optional[str] = None

    # Strategy C: WebXR image tracking payload
    webxr_tracked_images: Optional[List[Dict]] = Field(
        None,
        description="[{'ar_tag': 'elephant_marker_01', 'width_meters': 0.15}, ...]"
    )

    # ========== UX metadata ==========
    status: Indexed(str) = Field("draft", description="draft | pre-compiling | published | deprecated")
    min_device_tier: str = Field("low", description="low | mid | high — for adaptive quality")
    sort_order: int = 0  # UX: featured combos first
    teacher_id: Optional[Indexed(str)] = None  # for per-teacher scoping

    # Telemetry
    view_count: int = 0
    last_viewed_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "ar_combos"
        indexes: list = [
            [("combo_id", 1)],                            # already unique
            [("status", 1), ("sort_order", 1)],           # gallery listing
            [("required_tags", 1)],                       # NEW: detection lookup
            [("teacher_id", 1), ("status", 1)],           # teacher dashboard
            [("combo_mind_sha256", 1)],                   # NEW: dedupe uploads
            [("status", 1), ("combo_mind_status", 1)],    # NEW: telemetry
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "combo_id": "jungle_scene_v1",
                "title": "Elephant in the Jungle",
                "description": "Combines elephant and jungle markers",
                "required_tags": ["elephant_marker_01", "jungle_marker_01"],
                "targets": [
                    {"target_index": 0, "ar_tag": "jungle_marker_01", "role": "terrain"},
                    {"target_index": 1, "ar_tag": "elephant_marker_01", "role": "primary"}
                ],
                "combo_model_url": ".../cute_elephant_jungi.glb",
                "combo_image_url": ".../elephant_tree_combo_layered.png",
                "runtime_merge_enabled": True,
                "combo_mind_status": "not_compiled",
                "status": "draft",
                "min_device_tier": "mid",
            ]
        }


# ========== Pydantic API Schemas ==========

class ARComboCreate(BaseModel):
    combo_id: str
    title: str
    description: Optional[str] = None
    required_tags: List[str] = Field(..., min_length=2)
    targets: List[ComboTarget]
    combo_model_url: Optional[str] = None
    combo_image_url: Optional[str] = None
    runtime_merge_enabled: bool = True
    min_device_tier: str = "low"


class ARComboResponse(BaseModel):
    combo_id: str
    title: str
    description: Optional[str]
    required_tags: List[str]
    combo_model_url: Optional[str]
    combo_image_url: Optional[str]
    combo_mind_url: Optional[str]
    combo_mind_status: str
    runtime_merge_enabled: bool
    status: str

    class Config:
        from_attributes = True
        populate_by_name = True
```

### 4.4 NEW Collection: `ARSession` (telemetry + crash forensics)

**File:** `backend/models/ar_session.py` (new Beanie Document)

```python
"""
ARSession — Per-session AR usage log (telemetry + crash diagnostics).

Fields are append-only; never UPDATE, only INSERT. This preserves a faithful
timeline for debugging and load-testing.
"""
from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class ARSessionEvent(BaseModel):
    """One event in an AR session timeline."""
    sequence: int                                      # monotonic within session
    event_type: str                                    # 'scan' | 'add_flashcard' | 'combo_detected' | 'multi_prepare_start' | 'multi_prepare_committed' | 'multi_prepare_failed' | 'viewer_ready' | 'mind_buffer_received' | 'mind_buffer_failed' | 'target_found' | 'target_lost' | 'session_end'
    timestamp_ms: int                                  # ms since session start
    duration_ms: Optional[int] = None                  # for events that have duration
    metadata: Dict[str, object] = Field(default_factory=dict)


class ARSession(Document):
    """A single AR page session (user, device, outcome).

    Collection: ar_sessions

    Used for:
      - Cold-start latency p50/p95/p99 (multi_prepare_committed - multi_prepare_start)
      - Failure forensics (mind_buffer_failed carries the error class)
      - Tier-based device capability (min_device_tier vs battery_level)
      - Combo engagement (view_count, view_duration_ms)
    """

    session_id: str = Field(..., description="UUID generated client-side (crypto.randomUUID)")
    user_id: Optional[str] = None                      # if signed in
    teacher_id: Optional[str] = None
    qr_ids_detected: List[str] = Field(default_factory=list, max_length=8)
    combo_id: Optional[str] = None
    strategy: str = Field("runtime_merge", description="runtime_merge | pre_compiled_mind | webxr_future")
    outcome: str = Field("in_progress", description="in_progress | success | failed | abandoned")
    failure_reason: Optional[str] = None               # 'mind_buffer_timeout' | 'abort_error' | ...

    # Device capability
    device_tier: str = Field("unknown", description="low | mid | high | unknown")
    user_agent: Optional[str] = None
    viewport: Optional[str] = None                    # e.g. "390x844"
    is_webview: bool = False

    # Timing
    session_start_ms: int
    session_end_ms: Optional[int] = None
    total_events: int = 0
    events: List[ARSessionEvent] = Field(default_factory=list)

    # Aggregates (denormalized for fast dashboards)
    cards_scanned: int = 0
    combo_detected: bool = False
    viewer_rendered: bool = False
    total_view_duration_ms: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ar_sessions"
        indexes: list = [
            [("session_id", 1)],                                    # unique-ish lookup
            [("user_id", 1), ("created_at", -1)],                    # user history
            [("combo_id", 1), ("created_at", -1)],                   # combo engagement
            [("outcome", 1), ("created_at", -1)],                    # failure investigation
            [("strategy", 1), ("created_at", -1)],                   # A/B analysis
            [("created_at", -1)],                                   # global timeline
            [("session_start_ms", 1)],                                # cold-start slicing
        ]


class ARSessionCreate(BaseModel):
    session_id: str
    session_start_ms: int


class ARSessionEventAppend(BaseModel):
    session_id: str
    event: ARSessionEvent


class ARSessionFinalize(BaseModel):
    session_id: str
    outcome: str
    session_end_ms: int
    failure_reason: Optional[str] = None
```

### 4.5 Pydantic schemas summary

| Schema | Endpoint expected | Source file |
|--------|-------------------|-------------|
| `FlashcardCreate` / `FlashcardUpdate` / `FlashcardResponse` | `POST/PATCH/GET /api/flashcards` | `backend/models/flashcard.py` (existing) |
| `ARComboCreate` / `ARComboResponse` | `POST/GET /api/ar-combos`, `POST /api/ar-combos/:id/compile-mind` | **NEW** `backend/models/ar_combo.py` |
| `ARSessionCreate` / `ARSessionEventAppend` / `ARSessionFinalize` | `POST /api/ar-sessions/start`, `POST /api/ar-sessions/:id/events`, `POST /api/ar-sessions/:id/finalize` | **NEW** `backend/models/ar_session.py` |

### 4.6 Optional: `ARCompileJob` (Option B build pipeline)

**File:** `backend/models/ar_compile_job.py` (new — only for Option B)

```python
"""
ARCompileJob — Tracked job for pre-compiling multi-target .mind files.

Status lifecycle:
  queued → running → succeeded | failed

UI surface: admin dashboard shows progress; failure_reason surfaces to ops.
"""
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ARCompileJob(Document):
    job_id: Indexed(str, unique=True)              # UUID
    combo_id: str                                  # the ARCombo being compiled
    input_tags: List[str]                          # flashcards included
    status: Indexed(str)                           # queued | running | succeeded | failed
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    output_mind_url: Optional[str] = None
    output_mind_sha256: Optional[str] = None
    output_mind_size_bytes: Optional[int] = None
    failure_reason: Optional[str] = None
    retry_count: int = 0
    triggered_by: str = Field("admin_api")         # admin_api | cms_save | manual
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ar_compile_jobs"
        indexes: list = [
            [("job_id", 1)],
            [("combo_id", 1), ("created_at", -1)],
            [("status", 1), ("created_at", 1)],
        ]
```

---

## 5. Implementation Phases (Updated)

The phases below **incorporate the Option A immediate fix** plus the MongoDB schemas that **future-proof for B / C / D**. All API surface area is option-agnostic.

### Phase 0 — Foundational schema (2 hours, junior)

1. Extend `Flashcard` (add `mind_url`, `mind_version`, `mind_sha256`, `ar_model_url`, `ar_image_url`, `ar_category`, `mind_size_bytes`, new indexes).
2. Create `ARCombo` Beanie document + Pydantic schemas.
3. Create `ARSession` Beanie document + Pydantic schemas.
4. Register new documents in `init_mongodb` call site.
5. Add `requirements.txt` pin: `beanie>=1.26.0` (already in use).

**Risk:** LOW. Pure additive schema.

### Phase 1 — Execute Option A (4–6 hours, mid)

This is the v1 plan (`plan/20260706_MULTI_FLASHCARD_FIX_PLAN.md`). Run unchanged.

| Edit | Files | Description |
|------|-------|-------------|
| F | `LearnARV2.tsx` | Add `mindBufferRef` |
| H | `ARContainerV2.tsx:468` | Stable iframe key |
| I | `ARContainerV2.tsx` | Stable message handler + ref-held mindBuffer |
| A–C | new `useFlashcardSnapshot.ts`; `LearnARV2.tsx:709-817` | Snapshot hook + dep array |
| D | `LearnARV2.tsx:845-851` | Status-only gate |
| G | `LearnARV2.tsx:855-870` | Drop cleanup `multiOperationIdRef += 1` |
| J | `useMultiFlashcard.ts` | `addFlashcardChainRef` serialization |
| K | `useMultiFlashcard.ts:421-440` | Ref-snapshot combo debounce |

**Acceptance gate:** All 7 acceptance criteria from v1 plan §8 pass.

### Phase 2 — Telemetry harness (3 hours, mid)

1. Generate `session_id` client-side via `crypto.randomUUID()` at `LearnARV2.tsx` mount; pass to `useMultiFlashcard`.
2. Emit `POST /api/ar-sessions/start` on mount.
3. Append events for: `scan`, `add_flashcard`, `combo_detected`, `multi_prepare_start`, `multi_prepare_committed`, `multi_prepare_failed`, `viewer_ready`, `mind_buffer_received`, `mind_buffer_failed`, `session_end`.
4. Bulk-append via debounced `POST /api/ar-sessions/:id/events` (every 2s or 10 events).
5. `POST /api/ar-sessions/:id/finalize` on unmount or `beforeunload`.

**Acceptance gate:** Test events appear in MongoDB within 5s of emission; p95 multi-prepare latency captured.

### Phase 3 — Option D scaffolding: Combo gallery + admin (1 day, mid)

1. Build admin UI (`/admin/ar-combos` page) for creating `ARCombo` documents.
2. Build combo gallery (`/learn` featured section) showing published `ARCombo.status === 'published'` items.
3. Frontend `useMultiFlashcard` enhancement:
   - After detection, query `GET /api/ar-combos/by-tags?tags=elephant_marker_01,jungle_marker_01`.
   - If match found: use combo's `combo_model_url` / `combo_image_url`.
   - Continue to runtime-merge the `.mind` files (Phase 1 logic).

**Acceptance gate:** Combo gallery loads in <500ms; admin can CRUD combos; combo detection in scene uses combo assets.

### Phase 4 — Option B: Pre-compiled `.mind` build pipeline (3–5 days, mid)

1. `make_combo_mind.py` script: reads N single-target `.mind` files from Supabase, concatenates targets in `ComboTarget.target_index` order, computes SHA-256, uploads to `assets/mind-combos/<comboId>.mind`.
2. FastAPI endpoint `POST /api/ar-combos/:id/compile-mind` enqueues `ARCompileJob`.
3. Worker process (Celery / RQ / APScheduler) picks up the job, runs `make_combo_mind.py`, writes URL + SHA to `ARCombo.combo_mind_url` / `combo_mind_sha256`.
4. Frontend enhancement:
   - `useMultiFlashcard` checks for `ARCombo.combo_mind_url`.
   - If present: pass combo mind URL directly to AR viewer (no runtime merge).
   - If absent: fall through to Option A runtime merge.
5. **Migration script:** populate `ARCombo.combo_mind_url` for all `status='published'` combos (run once).

**Acceptance gate:** Telemetry shows `pre_compiled_mind` strategy achieves >40% lower multi-prepare p95; fallback path still works when `combo_mind_url` is null.

### Phase 5 — Option C: WebXR spike (1 week, research/prototype)

1. Build feature-flagged `ar-viewer-webxr.html` that calls `XRSession.requestImageTrackable()` with `ARCombo.webxr_tracked_images`.
2. Capability detection on `LearnARV2` mount: `navigator.xr?.isImageTrackingSupported`.
3. If supported, redirect to WebXR viewer. Otherwise, use MindAR.
4. Compare metrics: track rendering FPS, time-to-first-frame, frame drops.

**Acceptance gate:** WebXR achieves ≥30fps sustained on test devices; capability detection correctly routes traffic.

### Phase 6 — Documentation + handover (0.5 day, documenter)

1. Update `docs/MULTI_FLASHCARD_AR.md` with:
   - Architecture options A/B/C/D.
   - MongoDB schema reference.
   - Telemetry dashboards + SLOs.
2. Add ADR (architecture decision record) for the chosen option.
3. Update `docs/DEPLOYMENT.md` with combo admin setup.

---

## 6. Testing Strategy

### 6.1 Unit tests (Vitest)

| File | Coverage |
|------|----------|
| `tests/hooks/useFlashcardSnapshot.test.ts` | version increments on qrId change; returns same ref when content unchanged; keys field tracks qrId stably |
| `tests/hooks/useMultiFlashcard.addFlashcard.test.ts` | Two concurrent calls: second awaits first, neither overwrites |
| `tests/hooks/useMultiFlashcard.comboCheck.test.ts` | 500ms debounce survives 5 state updates within window; fires once |
| `tests/utils/mergeMindTargets.test.ts` | existing tests + new: ordering invariant under reorder; sha256 stability |

### 6.2 Integration tests (Vitest + jsdom)

| File | Coverage |
|------|----------|
| `tests/integration/MultiFlashcard.prepare.test.tsx` | Mock fetchMind with 200ms delay; trigger two state changes within window; assert only one prepare completes |
| `tests/integration/MultiFlashcard.iframe.test.tsx` | Render `<ARContainerV2>` with phase=VIEWING; toggle prop; assert iframe DOM element persists |
| `tests/integration/MultiFlashcard.mindBuffer.test.tsx` | Mount ARContainerV2; emit `MIND_BUFFER_REQUEST`; assert reply received even after parent re-renders |
| `tests/integration/ComboApi.test.tsx` | Mock fetch; verify `useMultiFlashcard` consumes `ARCombo.combo_mind_url` vs fallback |

### 6.3 Backend tests (pytest)

| File | Coverage |
|------|----------|
| `backend/tests/models/test_flashcard_extension.py` | Add flashcard with mind_url; round-trip; retrieve by ar_tag |
| `backend/tests/models/test_ar_combo.py` | Create combo with valid/invalid `required_tags` (length 2 min); unique combo_id constraint |
| `backend/tests/models/test_ar_session.py` | Append events; finalize; verify indexes |
| `backend/tests/api/test_ar_combo_endpoints.py` | CRUD on `ARCombo`; auth gating; combo lookup |
| `backend/tests/api/test_ar_session_endpoints.py` | Start / event-append / finalize; bulk-append debounce |

### 6.4 E2E tests (Playwright)

| File | Scenario |
|------|----------|
| `e2e/multi-flashcard-scan.spec.ts` | Scan two cards, verify viewer renders, no 15s timeout, no console errors |
| `e2e/multi-flashcard-refresh.spec.ts` | Scan → refresh page → re-scan → assert viewer still works |
| `e2e/combo-gallery.spec.ts` | Admin creates published combo; gallery shows it; in-app detection uses combo assets |

### 6.5 Manual smoke checklist

- [ ] Scan card A → add card → scan card B → verify 3D model within 5s (p95)
- [ ] Scan card A → add card → scan card B → verify iframe NOT remounted (DevTools Elements panel)
- [ ] Add 3rd card attempt → graceful rejection
- [ ] Refresh mid-prepare → no abort leaks in Network panel
- [ ] Combo detection: scan combo pair → combo viewer (not multi-viewer) takes priority
- [ ] Cold-start latencies recorded in MongoDB `ar_sessions` collection
- [ ] Telemetry dashboard shows combo engagement

### 6.6 Coverage requirements

| Layer | Min coverage | Notes |
|-------|--------------|-------|
| Hooks (useFlashcardSnapshot, useMultiFlashcard) | 90% statements, 80% branches | Critical: identity thrash paths |
| AR components (ARContainerV2, ARContainer) | 85% statements | Critical: iframe lifecycle |
| Backend models (Flashcard, ARCombo, ARSession) | 95% statements | Critical: schema correctness |
| Backend API endpoints | 80% statements | Auth, validation, error paths |

---

## 7. Risk Assessment (Cross-Phase)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MindAR iframe crash mid-prepare | Medium | High | Stable iframe key (Phase 1 Edit H); ref-held buffer (Edit I) |
| MongoDB query latency (combo lookup) | Low | Medium | Cache `GET /api/ar-combos/by-tags` for 60s in-memory; CDN-cache for static combos |
| Supabase cold start (.mind fetch) | Medium | Medium | Pre-warm CDN on backend startup; Mirror to local cache for popular combos |
| React state sync thrash | High (pre-fix) | Critical | Phase 1 Pillar 1+2 (snapshot ref + dep array correction) |
| `addFlashcard` race condition | High (pre-fix) | High | Phase 1 Pillar 4 (promise chain queue) |
| WebXR unsupported on user's device | High today | Low | Feature detection gates fallback to MindAR (no UX break) |
| Option B build script drift vs runtime merge | Medium | Medium | Snapshot `mergeMindTargets.test.ts` to assert byte-identical output of both paths |
| MongoDB `ar_sessions` volume growth | Medium | Low | TTL index after 30 days; aggregate dashboards off materialized view |
| Beanie Document migration (add fields) | Low | High | All changes are additive (new Optional fields); existing data unaffected |
| `multiOperationIdRef` removal (Phase 1 G) breaks cleanup detection | Low | Medium | Keep `ensureCurrent()` check; add `controller.signal.aborted` guard everywhere |

---

## 8. Open Questions for the User

These items must be **answered before implementation begins**:

1. **Architecture choice** — Confirm **Option A** (immediate) and **Option D** (roadmap), OR specify another. ⏸
2. **Existing `Flashcard` extension** — Are `mind_url`, `mind_version`, `mind_sha256` acceptable new fields, or should these live in a separate collection to avoid touching `flashcards` collection? ⏸
3. **MongoDB TTL on `ar_sessions`** — 30-day retention acceptable, or do we need 90 days for trend analysis? ⏸
4. **Pre-compiled `.mind` cadence** — Is building combos **on-publish** enough, or do we want a **nightly cron** that pre-compiles any combo in `published` state? ⏸
5. **WebXR target audience** — Is iPad Safari 17+ a target device? If yes, prioritize WebXR compatibility; if no, deprioritize. ⏸
6. **Combo detection API** — Should `GET /api/ar-combos/by-tags` return only `status='published'` combos, or include `status='draft'` for teacher preview? ⏸
7. **Mind file storage** — Single Supabase bucket (`assets/mind-files/`) or split single-target vs combo (`assets/mind-files/` + `assets/mind-combos/`)? ⏸
8. **Telemetry endpoint rate-limiting** — Should `POST /api/ar-sessions/:id/events` be rate-limited per session (e.g. 100 events/s)? ⏸
9. **`Session` schema vs existing analytics** — Is there an existing analytics pipeline we should integrate with rather than creating `ar_sessions`? ⏸

---

## 9. Acceptance Criteria

### 9.1 Phase 1 (Option A) — Required for "done"

Same as v1 plan §8:

1. Two-flashcard scan reaches viewer within 5s average.
2. `<iframe>` DOM node persists across viewer state updates.
3. No `MULTI_MIND_OPERATION_STALE` events in console after successful commit.
4. No 15s `MIND_BUFFER_BOOTSTRAP_ERROR` errors in production logs.
5. Combo check fires once per (size, status, activeCombo) tuple.
6. Concurrent `addFlashcard` calls produce 2 detected flashcards.
7. All existing tests pass; new tests pass.

### 9.2 Phase 0 (Schema) — Required for "done"

1. `Flashcard`, `ARCombo`, `ARSession`, `ARCompileJob` documents compile cleanly.
2. Round-trip tests pass for all four documents.
3. Indexes are created on first Beanie startup.
4. `/api/ar-combos` and `/api/ar-sessions` endpoints respond.

### 9.3 Phase 2 (Telemetry) — Required for "done"

1. Session lifecycle: start, events, finalize all persist.
2. p50/p95/p99 multi-prepare latency computable from `ar_sessions`.
3. Failure events surface in `ar_sessions.failure_reason` for debugging.

### 9.4 Phase 4 (Option B) — Required for "done"

1. Pre-compiled `.mind` files exist for all `status='published'` combos.
2. `frontend` falls back gracefully when `combo_mind_url` is null.
3. Telemetry: `pre_compiled_mind` strategy p95 multi-prepare ≤ 60% of `runtime_merge` p95.

### 9.5 Phase 5 (Option C) — Required for "done"

1. Capability detection correctly routes to WebXR or MindAR.
2. WebXR viewer achieves ≥30fps sustained on test devices.
3. No regressions on MindAR fallback path.

---

## 10. Timeline & Effort Estimate

| Phase | Description | Time | Skill level |
|-------|-------------|------|-------------|
| **0** | Foundational schema (Beanie + Pydantic) | 2h | Junior |
| **1** | Option A runtime fix (v1 plan verbatim) | 4.5h | Mid |
| **2** | Telemetry harness | 3h | Mid |
| **3** | Combo gallery + admin | 8h | Mid |
| **4** | Option B pre-compiled pipeline | 3–5 days | Mid |
| **5** | Option C WebXR spike | 1 week | Mid-Sr |
| **6** | Documentation + ADR | 4h | Documenter |
| **Total (without spike)** | | **~5 working days** | |
| **Total (with spike)** | | **~2.5 weeks** | |

---

## 11. Decision Sign-off

Please review and answer:

- [ ] Architecture option: **A** / **B** / **C** / **D**?
- [ ] Open questions (§8): all answered?
- [ ] Phase sequencing acceptable, or reorder?

Once approved, this plan replaces the v1 plan as the canonical reference and the 6 SDLC phases (plan / design / dev / review / test / deploy / doc) proceed per the orchestrator's directive.
