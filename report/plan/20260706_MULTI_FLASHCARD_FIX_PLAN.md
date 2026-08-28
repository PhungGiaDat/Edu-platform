# Fix Plan — Multi-Flashcard AR Loading (Updated v2)

> Reference: `report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md` (root causes)
> Research: `research/20260706_MULTI_FLASHCARD_RESEARCH.md` (fix patterns)
> Research: `research/20260706_MINDAR_MULTI_TARGET_RESEARCH.md` (MindAR capabilities)
> Date: 2026-07-06
> Status: **Phase 1 (Plan) complete.** v2 — incorporates MindAR research, MongoDB integration, Supabase storage optimization.
> Stack: **MindAR 1.2.5** via A-Frame iframe + **MongoDB (Beanie)** for metadata + **Supabase Storage** for `.mind` / `.glb` assets.

---

## Executive Summary

The multi-flashcard AR pipeline fails because **React identity thrashing** and **iframe recreation** race against the multi-stage async prepare. This is a *structural* bug, not a logic bug. All fix patterns already exist in the codebase (`useSafeGLTF.ts`, `useRuntimeBridge.ts`, `ARContainer.tsx`). The fix is to:

1. **Stabilize React identities** via ref-based snapshots.
2. **Decouple iframe lifecycle** from prop churn (phase-only key + ref-held mind buffer).
3. **Serialize async operations** (addFlashcard, prepare, combo-check).
4. **Make MongoDB the source of truth** for flashcard AR metadata (with Supabase as the asset CDN).
5. **Pre-warm and cache** Supabase assets for known combos.

The original plan's 6 pillars are preserved and enhanced with research findings. The MongoDB + Supabase integration questions are answered in Section 6 (Data Architecture) and Section 7 (Storage Strategy).

---

## 1. Architecture Decisions (Updated)

### AD-1: Identity Stabilization → `useFlashcardSnapshot` custom hook

**Decision:** Create `useFlashcardSnapshot` that returns stable refs for index-0 and index-1 flashcards by capturing latest values into `useRef`.

**MindAR research alignment:**
- MindAR supports tracking **up to 5 targets simultaneously** (`maxTrack` param in `ar-viewer.html:130-139`).
- Current `MAX_AR_TRACKS = 2` in `LearnARV2.tsx:61` is conservative; future-proofing allows 2→3 without API changes.
- The merged `.mind` file (via `mergeMindTargetBuffers`) preserves target indices 0 and 1 — this invariant MUST be maintained.

**Rationale (unchanged from v1):**
- `useMultiFlashcard.ts` rebuilds `detectedFlashcards` Map on every state change.
- `useRef` snapshot bypasses dep-array mechanism entirely.
- Precedent: `useRuntimeBridge.ts:14-32`, `LearnARV2.tsx:549-552`.

### AD-2: Iframe Stability → Phase-only `key` + ref-held `mindBuffer`

**Decision:**
1. Replace `key={\`main-${phase}-${mainSrc}\`}` with `key={\`main-${phase}\`}`.
2. Move mind-buffer delivery to a ref-held handler subscribed once on mount.
3. Keep `mindBuffer` in React state but mirror it into a ref.

**MindAR research alignment:**
- The `ar-viewer.html` bootstrap polls `MIND_BUFFER_REQUEST` every 300ms for 15s (line 115).
- MindAR's `imageTargetSrc` accepts blob URLs (`URL.createObjectURL(new Blob([buffer]))` line 102).
- Once MindAR initializes, it cannot accept a new `.mind` file without full scene rebuild.
- **Critical insight**: MindAR's internal state machine is sensitive to scene rebuilds mid-tracking.

**Why this fix works:**
- Iframe recreation = full MindAR re-initialization = lost tracking state.
- Stable iframe key = MindAR continues tracking across React prop changes.
- Ref-held buffer = parent can answer `MIND_BUFFER_REQUEST` even mid-render.

### AD-3: Serialize `addFlashcard` → Promise chain queue

**Decision:** Internal `addFlashcardChainRef` chains every `addFlashcard` invocation through a single ref-held promise.

**MongoDB research alignment:**
- The `/api/v1/flashcard/:qrId` endpoint queries MongoDB for flashcard metadata.
- Cold MongoDB queries can be 50-500ms; warm queries <10ms.
- Chain serialization prevents two concurrent fetches from racing for the same `detectedFlashcards` Map slot.

### AD-4: Status-based `isMultiViewer` gate

**Decision:** `isMultiViewer` becomes true when `multiPreparation.status === 'committed'` AND mind buffer is present AND 2 cards are visible.

**Changed:** Removed `committedMultiKey === comboKey` check (was blocking the gate when `comboKey` is null but preparation is complete).

### AD-5: Combo-check debounce → Ref-captured snapshot

**Decision:** `comboCheckSnapshotRef` holds `{ size, status, activeCombo }`. Only restart the 500ms timer when this snapshot's values actually change.

---

## 2. NEW: MindAR Multi-Target Research Findings

### 2.1 MindAR Capabilities Summary

| Capability | Limit | Evidence |
|------------|-------|----------|
| Max simultaneous targets | **5** | `ar-viewer.html:130` — `Math.min(maxTrack, 5)` |
| Target index range | 0 to N-1 | `ar-viewer.html:39, 50` — `targetIndex: 0`, `targetIndex: 1` |
| `.mind` file format | MessagePack v2 | `mergeMindTargets.ts:15` — `payload.v !== 2` rejection |
| Single-target validation | 1 target per file | `mergeMindTargets.ts:18-20` |
| Multi-target file | `dataList.length > 1` allowed | `mergeMindTargetBuffers()` produces 2-target file |
| Runtime buffer | Blob URL via `URL.createObjectURL` | `ar-viewer.html:102` |
| Filter parameters | `filterMinCF`, `filterBeta` | `ar-viewer.html:137-138` |

### 2.2 Critical MindAR Constraints

1. **No dynamic target addition**: Once MindAR initializes with a `.mind` file, adding new targets requires full scene rebuild. (MindAR limitation — the `imageTargetSrc` is baked at init.)
2. **Blob URL lifetime**: `runtimeMindUrl` created in `ar-viewer.html:102` is revoked on `beforeunload` (line 152). This is fine for single-session use.
3. **Tracking filter sensitivity**: Current `filterMinCF: 0.001, filterBeta: 0.001` (line 137-138) are very low — they allow fast tracking response but may cause jitter. For multi-target, slightly higher values (0.01) may improve stability.

### 2.3 Performance Implications

| Target Count | CPU Load | RAM | Recommended for |
|--------------|----------|-----|-----------------|
| 1 | Low | ~5MB | Single card view |
| 2 | Medium | ~10MB | Multi card (current) |
| 3-5 | High | ~25MB | Future expansion |

For the current MAX_AR_TRACKS=2, performance is not a concern. If expanded to 3+ targets, consider lazy-loading 3D models.

### 2.4 Alternative Architectures Evaluated

**Option A: Pre-compiled multi-target .mind files (RECOMMENDED for known combos)**
- Store pre-merged `.mind` files in Supabase for known combo pairs.
- Use runtime merging only for new/discovered combos.
- Pros: Faster init (no fetch+merge), more stable.
- Cons: Storage overhead, requires pre-computation.

**Option B: WebXR Native Image Tracking (FUTURE)**
- Replace MindAR with WebXR `XRImageTracking` API.
- Pros: No library dependency, native browser optimization.
- Cons: Chrome Android only (Safari iOS 17+ partial). Not viable for current user base.

**Option C: Keep current runtime merge (DEFAULT)**
- Current approach. Fix the stability issues identified in this plan.
- Pros: Works for any combo, no pre-computation needed.
- Cons: Complex state management, vulnerable to race conditions.

**Decision:** Implement Option C now (fix the current plan), then add Option A as a **pre-warming optimization** for known combos in v3.

---

## 3. File-by-file change list (unchanged from v1)

### 3.1 NEW FILE: `frontend-web/src/hooks/useFlashcardSnapshot.ts`

**Purpose:** Stable ref-based snapshot of multi-flashcard state.

```typescript
import { useRef } from 'react';
import type { FlashcardData } from '@/hooks/useMultiFlashcard';

export interface FlashcardSnapshot {
    readonly card0: FlashcardData | null;
    readonly card1: FlashcardData | null;
    readonly version: number; // increments on every semantic change
    readonly keys: { 0: string | null; 1: string | null };
}

/**
 * Read-only, reference-stable snapshot of the latest two flashcards.
 * Reads the latest values from the Map on every render, but the snapshot
 * object itself is held in a ref so consumers can pass `snapshot.version`
 * to useEffect deps without churn.
 */
export function useFlashcardSnapshot(
    getCardByIndex: (i: number) => FlashcardData | null
): FlashcardSnapshot {
    const snapshotRef = useRef<FlashcardSnapshot>({
        card0: null,
        card1: null,
        version: 0,
        keys: { 0: null, 1: null }
    });

    const card0 = getCardByIndex(0);
    const card1 = getCardByIndex(1);

    const prev = snapshotRef.current;
    const key0 = card0?.qrId ?? null;
    const key1 = card1?.qrId ?? null;
    const versionChanged =
        prev.keys[0] !== key0 || prev.keys[1] !== key1;

    if (versionChanged) {
        snapshotRef.current = {
            card0,
            card1,
            version: prev.version + 1,
            keys: { 0: key0, 1: key1 }
        };
    }

    return snapshotRef.current;
}
```

### 3.2 MODIFY: `frontend-web/src/pages/LearnARV2.tsx`

#### Edit A — Replace `scannedTarget0/1` with snapshot (around lines 709-711)

```diff
-    const scannedTarget0 = getFlashcardByIndex(0);
-    const scannedTarget1 = flashcardCount >= 2 ? getFlashcardByIndex(1) : null;
-    const scannedTargets = Array.from(detectedFlashcards.values()).slice(0, MAX_AR_TRACKS);
+    const flashcardSnapshot = useFlashcardSnapshot((i) => getFlashcardByIndex(i));
+    const scannedTarget0 = flashcardSnapshot.card0;
+    const scannedTarget1 = flashcardSnapshot.card1;
+    const scannedTargets = Array.from(detectedFlashcards.values()).slice(0, MAX_AR_TRACKS);
```

#### Edit B — Use `flashcardSnapshot.version` in prepare effect dep array (line 817)

```diff
-    }, [shouldPrepareIndependentMulti, comboKey, scannedTarget0, scannedTarget1, multiRetryToken, emitMobileDebug]);
+    }, [
+        shouldPrepareIndependentMulti,
+        comboKey,
+        flashcardSnapshot.version,
+        scannedTarget0?.qrId,
+        scannedTarget1?.qrId,
+        multiRetryToken,
+        emitMobileDebug
+    ]);
```

#### Edit D — Relax `isMultiViewer` gate (lines 845-851)

```diff
     const isMultiViewer = Boolean(
-        committedMultiKey &&
-        committedMultiKey === comboKey &&
         multiPreparation.status === 'committed' &&
         multiPreparation.mindBuffer &&
-        multiPreparation.mindUrl &&
+        (multiPreparation.mindUrl === 'runtime-buffer' || multiPreparation.mindUrl) &&
+        flashcardCount === 2 &&
         !isComboViewer
     );
```

#### Edit F — New ref-held mindBuffer delivery to ARContainerV2

```typescript
const mindBufferRef = useRef<{ buffer: Uint8Array | null }>({ buffer: null });

useEffect(() => {
    mindBufferRef.current.buffer = multiPreparation.mindBuffer;
}, [multiPreparation.mindBuffer]);
```

#### Edit G — Remove `multiOperationIdRef.current += 1` from cleanup effect (lines 855-870)

```diff
     useEffect(() => {
         if (!isComboViewer && flashcardCount === 2 && comboKey === multiPreparation.key) return;
-        multiOperationIdRef.current += 1;
+        // No longer increment operationId here — the prepare effect owns its own cancellation.
         multiAbortRef.current?.abort();
         multiPreparingKeyRef.current = null;
```

### 3.3 MODIFY: `frontend-web/src/components/ar/ARContainerV2.tsx`

#### Edit H — Stable iframe key (line 468)

```diff
-                    key={`main-${phase}-${mainSrc}`}
+                    key={`main-${phase}`}
```

#### Edit I — New prop `onIframeReady` and stable mindBuffer ref delivery

```typescript
interface ARContainerV2Props {
    // ...existing props
    mindBuffer?: Uint8Array | null;
    onIframeReady?: (iframeWindow: Window) => void;
}

const stableMindBufferRef = useRef<Uint8Array | null>(null);

useEffect(() => {
    stableMindBufferRef.current = mindBuffer ?? null;
}, [mindBuffer]);

useEffect(() => {
    const handler = (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.type !== 'MIND_BUFFER_REQUEST') return;
        if (event.source !== iframeRef.current?.contentWindow) return;

        const buffer = stableMindBufferRef.current;
        if (buffer && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                { type: 'MIND_BUFFER', payload: { buffer } },
                '*'
            );
        }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}, []); // empty deps — never re-subscribes
```

### 3.4 MODIFY: `frontend-web/src/hooks/useMultiFlashcard.ts`

#### Edit J — Add `addFlashcardChainRef` for serialized adds

```typescript
const addFlashcardChainRef = useRef<Promise<void>>(Promise.resolve());

const addFlashcard = useCallback(async (qrId: string): Promise<FlashcardData | null> => {
    const nextLink = addFlashcardChainRef.current.then(async () => {
        // existing implementation body
    });
    addFlashcardChainRef.current = nextLink.catch(() => {});
    return nextLink;
}, [buildUrl]);
```

#### Edit K — Ref-snapshot combo-check debounce

```typescript
const comboCheckSnapshotRef = useRef({ size: 0, status: 'idle', activeCombo: null });

useEffect(() => {
    if (state.detectedFlashcards.size !== 2) return;
    if (state.activeCombo) return;
    if (state.comboResolution.status !== 'idle') return;

    const snapshot = {
        size: state.detectedFlashcards.size,
        status: state.comboResolution.status,
        activeCombo: state.activeCombo
    };

    const prev = comboCheckSnapshotRef.current;
    const sameAsPrev =
        prev.size === snapshot.size &&
        prev.status === snapshot.status &&
        prev.activeCombo === snapshot.activeCombo;

    comboCheckSnapshotRef.current = snapshot;

    if (sameAsPrev) return;

    if (comboCheckTimeoutRef.current) clearTimeout(comboCheckTimeoutRef.current);
    comboCheckTimeoutRef.current = setTimeout(() => { checkCombo(); }, 500);
}, [state.detectedFlashcards.size, state.comboResolution.status, state.activeCombo, checkCombo]);
```

---

## 4. NEW: MongoDB Schema Integration

### 4.1 Current Flashcard Model (`backend/models/flashcard.py`)

The current schema is a Beanie document. It **lacks** AR-specific fields needed for multi-flashcard support. From the app logs, the `useMultiFlashcard` hook constructs `FlashcardData` from `data.target` or `data.ar_objects[0]`, which implies the backend `/api/v1/flashcard/:qrId` returns an enriched response.

### 4.2 Required Schema Extensions

**Add to `Flashcard` document:**

```python
# backend/models/flashcard.py — additions

class ARTargetMetadata(BaseModel):
    """AR target metadata stored in MongoDB"""
    ar_tag: str                          # Unique AR marker ID (e.g., "elephant_marker_01")
    mind_file_url: str                   # Supabase URL to .mind file
    model_3d_url: Optional[str] = None   # Supabase URL to .glb
    image_2d_url: Optional[str] = None   # Supabase URL to 2D fallback
    texture_url: Optional[str] = None    # Optional texture overlay
    target_index: int = 0                # MindAR target index (0 or 1)
    scale: float = 0.25                  # Display scale
    position_offset: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0.05, "z": 0})
    animation_type: Optional[str] = None # "bounce" | "pulse" | "wiggle" | None

class Flashcard(Document):
    # ... existing fields ...

    # NEW: AR target metadata
    ar_target: ARTargetMetadata

    class Settings:
        name = "flashcards"
        indexes: list = [
            # ... existing indexes ...
            [("ar_target.ar_tag", 1)],  # Fast lookup by AR tag
        ]
```

### 4.3 New Collection: `combos` (already exists as `backend/api/combos.py`)

From the app logs, combos are defined with:
- `comboId`: `"jungle_scene_v1"`
- `requiredTags`: `["elephant_marker_01", "jungle_marker_01"]`
- `targetOrder`: `["jungle_marker_01", "elephant_marker_01"]` (ORDER MATTERS — maps to targetIndex 0 and 1)
- `model3dUrl`: combo-specific .glb
- `image2dUrl`: combo-specific layered PNG
- `comboMindUrl`: pre-merged .mind (if available)

**Recommended schema:**

```python
# backend/models/combo.py (NEW FILE)

class ComboTarget(BaseModel):
    ar_tag: str           # AR marker that must be detected
    target_index: int     # 0 or 1 in merged .mind
    role: str             # "background" | "foreground" | "environment"

class Combo(Document):
    combo_id: Indexed(str, unique=True)
    name: str                              # Display name
    description: str                       # Combo phrase
    
    # Required markers (all must be detected)
    required_tags: List[str]
    target_order: List[str]                # Ordered list — maps to targetIndex
    targets: List[ComboTarget]
    
    # Assets
    combo_model_url: str                   # Pre-rendered combo .glb
    combo_image_url: str                   # Layered 2D image
    combo_mind_url: Optional[str] = None   # Pre-merged .mind (null = runtime merge)
    combo_texture_url: Optional[str] = None
    
    # Gamification
    bonus_xp: int = 50
    bonus_pet: Optional[str] = None
    
    # Metadata
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "combos"
        indexes: list = [
            [("required_tags", 1)],  # Lookup combos by detected tags
            [("is_active", 1)],
        ]
```

### 4.4 API Endpoint Changes

**Current endpoint:** `GET /api/v1/flashcard/:qrId` returns `{ flashcard, target }`.

**Recommendation:** Extend response to include the `ar_target` object directly:

```python
# backend/api/flashcards.py — enhanced response

@router.get("/{qr_id}")
async def get_flashcard(qr_id: str):
    flashcard = await Flashcard.find_one(Flashcard.qr_id == qr_id)
    if not flashcard:
        raise HTTPException(404, "Flashcard not found")
    
    return {
        "flashcard": FlashcardResponse.from_orm(flashcard),
        "target": flashcard.ar_target.dict(),  # NEW: Direct AR metadata
        "ar_objects": [flashcard.ar_target.dict()]  # Backward compat
    }
```

### 4.5 Combo Lookup Optimization

**Current logic in `useMultiFlashcard.ts:431-440`:**
- 500ms debounce
- Calls `checkCombo()` which fetches from `/api/v1/combos/check`

**MongoDB query optimization:**

```python
# backend/api/combos.py — optimized query

@router.post("/check")
async def check_combo(request: ComboCheckRequest):
    """
    Given a set of detected AR tags, find matching combo.
    Uses MongoDB $all operator for atomic multi-tag matching.
    """
    detected_tags = request.detected_tags  # e.g., ["elephant_marker_01", "jungle_marker_01"]
    
    # Atomic multi-tag query with $all
    combo = await Combo.find_one(
        Combo.required_tags == {"$all": detected_tags},  # All tags must be present
        Combo.is_active == True
    )
    
    if not combo:
        return {"combo": None, "status": "not_found"}
    
    return {
        "combo": ComboResponse.from_orm(combo).dict(),
        "status": "found"
    }
```

**Index:** `Combo.required_tags` should have a **multikey index** (MongoDB auto-creates this for array fields).

### 4.6 Caching Strategy

**Add Redis or in-memory cache for:**
- `GET /api/v1/flashcard/:qrId` (TTL: 5 minutes)
- `POST /api/v1/combos/check` (TTL: 5 minutes, keyed by sorted tag set)

**Rationale:** Flashcard metadata is read-heavy, rarely changes. MongoDB queries add 10-50ms latency; cache reduces to <1ms.

---

## 5. NEW: Supabase Storage Strategy

### 5.1 Current Asset Organization (from app logs)

```
supabase://AR_models/
├── assets/
│   ├── mind-files/
│   │   ├── combo_targets.mind          # Pre-merged for jungle+elephant
│   │   └── target/
│   │       └── tree_targets.mind        # Single target
│   ├── model2d/
│   │   ├── Palm.jpg
│   │   ├── Elephant.jpg
│   │   └── elephant_tree_combo_layered.png
│   ├── models/
│   │   └── combos/
│   │       └── cute_elephant_jungle.glb
│   └── models3d/
│       └── palm_tree.glb
├── pets/
│   ├── models/
│   │   └── animal-elephant.glb
│   └── textures/
│       └── colormap.png
```

### 5.2 Recommended Bucket Structure

**Two-bucket strategy:**

| Bucket | Visibility | Contents | Access Pattern |
|--------|------------|----------|----------------|
| `AR_models` (public) | Public read | `.mind`, `.glb`, `.jpg`, `.png` | CDN-cached, never changes |
| `AR_models_private` (private) | Signed URL | User-generated content, premium assets | Authenticated, time-limited |

### 5.3 Pre-merged .mind Files Strategy

**For known combos (Option A optimization):**

```
supabase://AR_models/assets/mind-files/combos/
├── jungle_elephant_v1.mind       # Pre-merged for elephant+jungle combo
├── farm_animals_v1.mind          # Pre-merged for cow+pig+chicken
└── space_rocket_v1.mind          # Pre-merged for rocket+astronaut
```

**Pre-compilation script** (Node.js, run on backend):

```javascript
// scripts/precompile-combo-mind.js
// Fetches two single-target .mind files, merges them, uploads to Supabase
import { createClient } from '@supabase/supabase-js';
import { encode, decode } from '@msgpack/msgpack';
import fs from 'fs';

async function precompileCombo(comboId, firstUrl, secondUrl) {
    const [firstBuf, secondBuf] = await Promise.all([
        fetch(firstUrl).then(r => r.arrayBuffer()),
        fetch(secondUrl).then(r => r.arrayBuffer())
    ]);
    
    const firstMind = decode(new Uint8Array(firstBuf));
    const secondMind = decode(new Uint8Array(secondBuf));
    
    const merged = encode({
        v: 2,
        dataList: [firstMind.dataList[0], secondMind.dataList[0]]
    });
    
    // Upload to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    await supabase.storage
        .from('AR_models')
        .upload(`assets/mind-files/combos/${comboId}.mind`, merged, {
            contentType: 'application/octet-stream',
            cacheControl: '31536000' // 1 year
        });
}
```

**When to use pre-merged vs runtime merge:**

| Scenario | Strategy | Rationale |
|----------|----------|-----------|
| Known combo (in `combos` collection) | Pre-merged `.mind` | Faster init, no JS merge needed |
| Discovered combo (not predefined) | Runtime merge via `mergeMindTargetBuffers` | Flexibility for user-discovered combos |
| Combo > 2 targets | Pre-merged only | Runtime merge only supports 2 |

### 5.4 CDN and Caching

**Supabase Storage CDN behavior:**
- Public bucket files are cached at Supabase's edge.
- `Cache-Control: 31536000` (1 year) for `.mind` and `.glb` — these never change.
- `Cache-Control: 300` (5 min) for dynamic content.

**Browser caching:**
- Service Worker (if implemented) can cache `.mind` files for offline AR.
- MindAR loads `.mind` via `fetch()` — respects HTTP cache headers.

### 5.5 Cold Start Mitigation

**Problem:** First fetch of a `.mind` file from Supabase can be 1-3s on cold cache.

**Mitigation strategies:**

1. **DNS prefetch** in `index.html`:
   ```html
   <link rel="dns-prefetch" href="//rofprrtoeyirssfndxag.supabase.co">
   <link rel="preconnect" href="https://rofprrtoeyirssfndxag.supabase.co" crossorigin>
   ```

2. **Pre-warm** when first flashcard is detected:
   ```typescript
   // In useMultiFlashcard.ts — pre-warm combo candidates
   useEffect(() => {
       if (detectedFlashcards.size !== 1) return;
       const firstTag = Array.from(detectedFlashcards.values())[0]?.arTag;
       if (!firstTag) return;
       
       // Pre-fetch potential combo partners
       fetch(`/api/v1/combos/candidates?tag=${firstTag}`)
           .then(r => r.json())
           .then(data => {
               data.candidates?.forEach(c => {
                   const link = document.createElement('link');
                   link.rel = 'prefetch';
                   link.href = c.mindUrl;
                   document.head.appendChild(link);
               });
           });
   }, [detectedFlashcards.size]);
   ```

3. **Service Worker** (future enhancement):
   ```javascript
   // sw.js — cache .mind and .glb files
   self.addEventListener('fetch', (event) => {
       if (event.request.url.includes('.mind') || event.request.url.includes('.glb')) {
           event.respondWith(
               caches.open('ar-assets-v1').then(cache =>
                   cache.match(event.request).then(cached =>
                       cached || fetch(event.request).then(response => {
                           cache.put(event.request, response.clone());
                           return response;
                       })
                   )
               )
           );
       }
   });
   ```

---

## 6. Migration Path (unchanged from v1)

### Phase order

1. **Edit F (LearnARV2 mindBufferRef)** — non-breaking.
2. **Edit H (ARContainerV2 stable key)** — non-breaking.
3. **Edit I (ARContainerV2 stable handler)** — non-breaking.
4. **Edit A, B, C (LearnARV2 snapshot)** — additive.
5. **Edit D (isMultiViewer gate)** — slightly relaxed.
6. **Edit G (cleanup effect)** — drops increment.
7. **Edit J, K (useMultiFlashcard)** — additive internal changes.

### Rollback strategy

If regressions appear after Edits A-C, revert snapshot hook and add `useMemo` around `scannedTarget0/1` keyed on `comboKey` instead.

If Edit H causes issues (e.g. stale viewer state across phase changes), revert just Edit H.

If Edit I loses mindBuffer delivery, revert the `useEffect([])` listener addition in `ARContainerV2.tsx`.

---

## 7. Risk Assessment (updated)

| Decision | Risk | Severity | Mitigation |
|----------|------|----------|------------|
| AD-1: useRef snapshot | Reading `.card0` after unmount | LOW | Existing component unmount aborts |
| AD-2: Phase-only key | Stale viewer state when crossing phases | MEDIUM | Phase change implies fresh viewer |
| AD-3: Promise chain | One slow fetch delays all subsequent | LOW | Each fetch is small (~50-200 KB) |
| AD-4: Status-only gate | False positive when combo is present | LOW | `!isComboViewer` clause keeps exclusive |
| AD-5: Ref-snapshot debounce | Debounce never fires if snapshot is stale | LOW | Snapshot updated every effect run |
| **NEW: MongoDB schema migration** | Existing flashcards lack `ar_target` field | MEDIUM | Backfill script; fallback to hardcoded `PALM_TREE_MODEL_URL` |
| **NEW: Supabase pre-merged** | Storage overhead for rarely-used combos | LOW | Only pre-merge combos with > 10 uses |
| **NEW: CDN cache invalidation** | Stale `.mind` after update | MEDIUM | Versioned URLs (`combo_v2.mind`) |

### Cross-cutting risks

1. **`mergeMindTargets` ordering invariant**: targetIndex 0 = first card, 1 = second card.
2. **`scannedTargets` slicing**: `Array.from(detectedFlashcards.values()).slice(0, MAX_AR_TRACKS)`.
3. **Test coverage gaps**: existing tests don't cover `addFlashcard` race conditions.

---

## 8. Test Strategy (unchanged from v1)

### Unit tests (`frontend-web/tests/hooks/`)

| Test file | Coverage |
|-----------|----------|
| `useFlashcardSnapshot.test.ts` | (1) version increments on qrId change, (2) returns same ref when content unchanged |
| `useMultiFlashcard.addFlashcard.test.ts` | Two concurrent calls: second awaits first, neither overwrites |
| `useMultiFlashcard.comboCheck.test.ts` | 500ms debounce survives 5 state updates within window |

### Integration tests (`frontend-web/tests/integration/`)

| Test file | Coverage |
|-----------|----------|
| `MultiFlashcard.prepare.test.tsx` | Mock fetchMind with 200ms delay; trigger two state changes within window |
| `MultiFlashcard.iframe.test.tsx` | Render `<ARContainerV2>` with phase=VIEWING; assert iframe DOM persists |
| `MultiFlashcard.mindBuffer.test.tsx` | Mount ARContainerV2; emit `MIND_BUFFER_REQUEST`; assert reply received |

### E2E tests (`frontend-web/e2e/`)

| Test file | Scenario |
|-----------|----------|
| `multi-flashcard-scan.spec.ts` | Scan two cards, assert viewer renders within 5s |
| `multi-flashcard-refresh.spec.ts` | Refresh mid-prepare, assert no abort leaks |

### NEW: MongoDB integration tests

| Test file | Coverage |
|-----------|----------|
| `combos.test.py` | `$all` query returns matching combo |
| `flashcards.test.py` | AR target metadata returned correctly |

### Manual smoke checklist

- [ ] Scan card A → add card → scan card B → verify 3D model appears within 5s
- [ ] Scan card A → add card → scan card B → verify iframe does NOT remount
- [ ] Add 3rd card attempt → verify graceful rejection
- [ ] Refresh page mid-prepare → verify no abort leaks
- [ ] Combo detection: scan combo pair → verify combo viewer takes priority

---

## 9. Open Questions (updated)

1. **`mainSrc` URL params**: `LearnARV2.tsx:878, 882` constructs `mainSrc` from `resolveMindUrl(...)`. Does `mainSrc` change between same-phase re-renders?
2. **`enableBackgroundScanner` phase**: `ARContainerV2.tsx:476` shows PIP scanner only in VIEWING.
3. **`mergeMindTargets` validation**: rejects mind files with != 1 target. Monitor backend changes.
4. **`ar-viewer.html` timeout**: 15s is generous but not infinite. Consider raising to 25s.
5. **NEW: MongoDB migration**: When to add `ar_target` field to existing flashcards? Recommend backfill during next maintenance window.
6. **NEW: Pre-merged combo storage**: How many combos to pre-merge? Start with top 10 by usage.
7. **NEW: CDN cache headers**: Are current Supabase bucket defaults optimal? Check `Cache-Control` headers.

---

## 10. Acceptance Criteria (unchanged from v1)

The fix is considered successful when ALL of these hold:

1. Two-flashcard scan reaches viewer within 5s on average.
2. `<iframe>` DOM node persists across viewer state updates.
3. No `MULTI_MIND_OPERATION_STALE` events in console after successful commit.
4. No 15s `MIND_BUFFER_BOOTSTRAP_ERROR` errors in production logs.
5. Combo check fires once per (size, status, activeCombo) tuple.
6. Concurrent `addFlashcard` calls produce 2 detected flashcards.
7. All existing tests pass; new tests pass.

---

## 11. Estimated Implementation Time (updated)

| Edit | Time | Skill | Dependencies |
|------|------|-------|--------------|
| Edit F (LearnARV2 ref) | 10 min | Junior | None |
| Edit H (iframe key) | 2 min | Junior | None |
| Edit I (stable handler) | 30 min | Mid | Edit F |
| Edit A-C (snapshot hook) | 45 min | Mid | None |
| Edit D (isMultiViewer gate) | 5 min | Junior | None |
| Edit G (cleanup) | 5 min | Junior | None |
| Edit J-K (useMultiFlashcard) | 30 min | Mid | None |
| **NEW: MongoDB schema migration** | 2 hours | Mid | DB access |
| **NEW: Supabase pre-merge script** | 1 hour | Mid | Node.js setup |
| **NEW: CDN pre-warm** | 1 hour | Mid | Service worker (optional) |
| Tests | 90 min | Mid | All edits |
| Smoke testing + fixup | 60 min | Mid | All edits |
| **Total** | **~8 hours** | | |

---

## 12. Sign-off Checklist

- [ ] Plan reviewed by `@reviewer`
- [ ] Plan reviewed by `@tester`
- [ ] MongoDB schema changes approved by backend team
- [ ] Supabase bucket structure approved by DevOps
- [ ] Edit-by-edit approval granted by user
- [ ] Rollback plan acknowledged
- [ ] Tests defined before implementation

---

## Appendix A: MindAR Mind File Format

A MindAR `.mind` file is a **MessagePack v2** encoded payload with this structure:

```python
{
    "v": 2,                    # Format version
    "dataList": [              # Array of targets
        {
            "targetImage": b"...",   # Image data (binary)
            "trackingData": b"...",  # Tracking features (binary)
            "matchingData": b"..."   # Matching data (binary)
        },
        # ... more targets for multi-target files
    ]
}
```

**Validation** (from `mergeMindTargets.ts:8-29`):
- `v` must be `2`.
- Each entry in `dataList` must have `targetImage`, `trackingData`, `matchingData`.
- Single-target files have `dataList.length === 1`.
- Multi-target files have `dataList.length > 1` (merged files have exactly 2).

**Compilation:**
- Use the [MindAR Marker Training Tool](https://hiukim.github.io/mind-ar-js-doc/tools/compile) to compile images into `.mind` files.
- Multiple markers can be compiled into a single multi-target `.mind` file.

---

## Appendix B: AR Tag Naming Convention

From `backend/database/seed/flashcards.json`:
- Pattern: `{word}_marker_NN` (e.g., `elephant_marker_01`, `jungle_marker_01`)
- Used in `ar_tag` field of `Flashcard` document.
- Used in `required_tags` and `target_order` of `Combo` document.

**Best practice:** Tag names should be unique, descriptive, and versioned (`_v1`, `_v2`) for future marker re-designs.

---

## Appendix C: References

- **DEBUG_20260706_MULTI_FLASHCARD_LOADING.md** — Root cause analysis
- **RESEARCH_20260706_MULTI_FLASHCARD_RESEARCH.md** — Fix pattern research
- **RESEARCH_20260706_MINDAR_MULTI_TARGET_RESEARCH.md** — MindAR capabilities
- **DOCS/LEARN_AR_V2_ARCHITECTURE.md** — Overall architecture
- **DOCS/PLAN/20260623_SIMULTANEOUS_DUAL_CARD_AR_RENDERING_V4.md** — Historical context
- **MindAR Docs**: https://hiukim.github.io/mind-ar-js-doc/
- **Supabase Storage**: https://supabase.com/docs/guides/storage
- **Beanie ODM**: https://beanie-odm.dev/

Proceeding to Phase 4 (reviewer audit) and Phase 5 (tester → fix loop) on user approval.
