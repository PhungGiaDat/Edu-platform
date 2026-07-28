# Frontend Combo Category Filter + UX Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 
1. Add category filtering to prevent invalid combo checks
2. Optimize `.mind` file loading - same category cards share 1 `.mind` file
3. **UX Enhancement:** 1-shot auto-scanning (like lumio.vn) - no button click needed
4. Handle MongoDB schema migration safely

**Tech Stack:** TypeScript (Frontend MindAR), Python/FastAPI (Backend), MongoDB/Beanie

---

## Global Constraints

- **MongoDB Data Consistency:** When adding new fields, existing documents have `null` values. Use `Field(default=False)` for backward compatibility.
- **Backward Compatibility:** API responses must not break existing clients
- Follow existing code patterns in `useMultiFlashcard.ts`

---

## Scope

| Component | Included |
|-----------|----------|
| `frontend-web/src/hooks/useMultiFlashcard.ts` | ✅ |
| `frontend-web/src/pages/LearnARV2.tsx` | ✅ |
| `backend/models/ar_combination.py` | ✅ |
| `backend/services/ar_service.py` | ✅ |
| Mobile RN / Unity | ❌ |

---

# PART 1: UX ENHANCEMENT - 1-SHOT AUTO SCANNING

---

## Task U1: Update UX Flow

### Current Flow (Button-Based)
```
SCANNING state → Scan QR 1 → VIEWING state → Click "+ Add card" → SCANNING state → Scan QR 2 → Done
```

### New Flow (1-Shot Auto-Scan)
```
SCANNING state → Scan QR 1 → STAY IN SCANNING → Scan QR 2 → Auto-add both → Done
```

**Key Changes:**
- Remove `isAddingCard` button flow
- Keep scanner active after first scan
- Auto-add when 2 cards detected (after cooldown)
- Show "Scanning..." overlay with progress

---

## Task U2: Update LearnARV2 State Flow

**Files:**
- Modify: `frontend-web/src/pages/LearnARV2.tsx`

### State Machine Change

**Before:**
```typescript
type AppState = 'SCANNING' | 'LOADING' | 'VIEWING' | 'QUIZ' | 'GAME' | 'PRONUNCIATION' | 'ERROR';

// Transition: SCANNING → (first QR) → LOADING → VIEWING
// Transition: VIEWING → (click +Add card) → SCANNING → (second QR) → VIEWING
```

**After:**
```typescript
type AppState = 'SCANNING' | 'LOADING' | 'VIEWING' | 'QUIZ' | 'GAME' | 'PRONUNCIATION' | 'ERROR';
type ScanMode = 'IDLE' | 'SCANNING_FOR_SECOND'; // NEW: track scanning mode

// Transition: SCANNING → (first QR, auto-continue) → STAY SCANNING
// Transition: SCANNING → (second QR detected) → LOADING → VIEWING
// Auto-switch to VIEWING when 2 cards ready
```

### Steps:

- [ ] **Step 1: Add ScanMode state**

```typescript
const [scanMode, setScanMode] = useState<ScanMode>('IDLE');
```

- [ ] **Step 2: Update handleQRDetected to auto-continue scanning**

Find `handleQRDetected` (line 1081) and modify:

```typescript
const handleQRDetected = useCallback((qrId: string) => {
    console.log('[LearnARV2] QR Detected:', qrId);
    if (!qrId) return;

    const now = Date.now();
    const lastSeenAt = qrGateRef.current.get(qrId) || 0;
    if (now - lastSeenAt < 2500) {
        console.log('[LearnARV2] QR ignored during cooldown:', qrId);
        return;
    }
    qrGateRef.current.set(qrId, now);

    const isFirstQr = !detectedQrIdRef.current;
    void addFlashcard(qrId).then((flashcardData) => {
        if (!flashcardData) {
            console.warn('[LearnARV2] Ignoring QR without validated flashcard data:', qrId);
            return;
        }

        if (isFirstQr) {
            // First card: switch to loading briefly, then stay in scanning mode
            detectedQrIdRef.current = qrId;
            setDetectedQrId(qrId);
            setAppState('LOADING');
            setScanMode('SCANNING_FOR_SECOND'); // NEW: tell user to scan second card
            
            // Don't switch to VIEWING yet - wait for second card
            // The useEffect will handle transition when flashcardCount === 2
        }
        
        // If second card detected, useEffect will handle auto-transition
        trackFlashcardView();
    });
}, [trackFlashcardView, addFlashcard]);
```

- [ ] **Step 3: Add useEffect for auto-transition to VIEWING**

```typescript
// Auto-switch to VIEWING when 2 cards are detected
useEffect(() => {
    if (flashcardCount === 2 && appState === 'LOADING' && scanMode === 'SCANNING_FOR_SECOND') {
        console.log('[LearnARV2] 2 cards detected, switching to VIEWING');
        setAppState('VIEWING');
        setScanMode('IDLE');
        window.setTimeout(() => {
            eventBus.emit('AR_SWITCH_TO_VIEWER' as any, {});
        }, 100);
    }
}, [flashcardCount, appState, scanMode]);
```

- [ ] **Step 4: Remove "+ Add card" button**

Remove the button at line 1470-1493:

```typescript
// REMOVED: + Add card button
// The scanner now stays active after first scan
```

- [ ] **Step 5: Update SCANNING overlay to show progress**

Replace the `isAddingCard` overlay (line 1532-1569) with new scan progress:

```typescript
// NEW: Show scanning progress when waiting for second card
{scanMode === 'SCANNING_FOR_SECOND' && flashcardCount === 1 && (
    <div
        style={{
            position: 'fixed',
            top: 'max(92px, env(safe-area-inset-top))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100004,
            width: 'min(92vw, 360px)',
            padding: '14px 18px',
            borderRadius: 18,
            background: 'rgba(15,23,42,0.88)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'scanPulse 1.5s ease-in-out infinite'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>📷</span>
            <span>Scanning for second card...</span>
        </div>
        <div style={{ 
            fontSize: 12, 
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 8
        }}>
            Point camera at another flashcard
        </div>
        {/* Card count indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <div style={{
                width: 40, height: 6, borderRadius: 3,
                background: '#22c55e'
            }} />
            <div style={{
                width: 40, height: 6, borderRadius: 3,
                background: flashcardCount >= 2 ? '#22c55e' : 'rgba(255,255,255,0.3)',
                animation: flashcardCount < 2 ? 'dotPulse 1s infinite' : 'none'
            }} />
        </div>
    </div>
)}
```

- [ ] **Step 6: Remove handleAddCardScan handler**

Since we no longer need the button, we can simplify:

```typescript
// handleAddCardScan - NO LONGER NEEDED (removed)
```

- [ ] **Step 7: Add CSS animations**

```typescript
<style>{`
    @keyframes scanPulse {
        0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
        50% { opacity: 0.9; transform: translateX(-50%) scale(1.02); }
    }
    @keyframes dotPulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }
`}</style>
```

---

## Task U3: Update useMultiFlashcard Hook

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

- [ ] **Step 1: Add `scanMode` to state**

```typescript
interface MultiFlashcardState {
    detectedFlashcards: Map<string, FlashcardData>;
    activeCombo: ComboData | null;
    isCheckingCombo: boolean;
    comboMindUrl: string | null;
    mode: 'SINGLE' | 'MULTI' | 'COMBO' | 'PROXIMITY_COMBO';
    proximity: ProximityData;
    comboTriggered: boolean;
    comboResolution: ComboResolutionState;
    scanMode: 'IDLE' | 'SCANNING'; // NEW: track if we're actively scanning
}
```

- [ ] **Step 2: Initialize with scanMode**

```typescript
const [state, setState] = useState<MultiFlashcardState>({
    detectedFlashcards: new Map(),
    activeCombo: null,
    isCheckingCombo: false,
    comboMindUrl: null,
    mode: 'SINGLE',
    proximity: {
        isClose: false,
        distance: Infinity,
        midpoint: null,
        lastDetected: 0
    },
    comboTriggered: false,
    comboResolution: { key: null, status: 'idle' },
    scanMode: 'SCANNING' // NEW: start in scanning mode
});
```

- [ ] **Step 3: Auto-set scanMode based on flashcard count**

```typescript
// When we have 2+ flashcards, exit scanning mode
if (newMap.size >= 2 && state.scanMode === 'SCANNING') {
    // Transition to MULTI mode, stop active scanning
}
```

---

# PART 2: CATEGORY FILTERING

---

## Task F1: Add Category Field to FlashcardData

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:66-75`

- [ ] **Step 1: Add `category` field to FlashcardData interface**

```typescript
interface FlashcardData {
    qrId: string;
    arTag: string;
    word: string;
    category: string; // NEW - from API response
    model3dUrl: string;
    image2dUrl: string;
    textureUrl?: string;
    mindUrl: string;
    detectedAt: number;
}
```

- [ ] **Step 2: Store category from API response (line ~191-201)**

```typescript
const flashcardData: FlashcardData = {
    qrId,
    arTag: arObject?.ar_tag || flashcard.ar_tag || `tag_${qrId}`,
    word: flashcard.word || qrId,
    category: flashcard.category || 'unknown', // NEW
    model3dUrl: buildUrl(arObject?.model_3d_url) || '',
    image2dUrl: buildUrl(arObject?.image_2d_url) || '',
    textureUrl: buildUrl(arObject?.texture_url),
    mindUrl: arObject?.nft_base_url || '',
    detectedAt: Date.now()
};
```

---

## Task F2: Implement Category Filter Logic

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts:294-320`

- [ ] **Step 1: Add category validation before combo check**

After `if (flashcards.length !== 2) return null;`, add:

```typescript
// Check 1: Validate categories match
const [card1, card2] = flashcards;
if (card1.category !== card2.category) {
    console.log('[MultiFlashcard] 🔍 Different categories, skipping combo check:', 
        card1.category, 'vs', card2.category);
    emitArDebug('COMBO_CATEGORY_MISMATCH', {
        arTags,
        category1: card1.category,
        category2: card2.category
    });
    setState(prev => prev.comboResolution.key !== comboKey ? prev : ({
        ...prev,
        isCheckingCombo: false,
        comboResolution: { 
            key: comboKey, 
            status: 'not_found', 
            reason: 'different_categories' 
        }
    }));
    return null;
}
```

---

## Task F3: Optimize Mind File Loading (Same Category = Same Mind File)

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

**Logic:**
- **Same category** (e.g., dog + cat): Use **shared `.mind` file** (pre-built combo)
- **Different category** (e.g., dog + apple): Skip combo check, use individual cards

- [ ] **Step 1: Update shouldUseComboMindUrl logic**

```typescript
shouldUseComboMindUrl: state.detectedFlashcards.size === 2 &&
    state.comboMindUrl !== null,

// Fallback: merge 2 separate .mind files only when no combo_mind_url from backend
shouldPrepareIndependentMulti: state.detectedFlashcards.size === 2 &&
    state.comboResolution.key !== null &&
    state.comboMindUrl === null &&
    ['not_found', 'rejected', 'error'].includes(state.comboResolution.status)
```

- [ ] **Step 2: Add debug logging**

```typescript
emitArDebug('MIND_FILE_DECISION', {
    category1: card1.category,
    category2: card2.category,
    sameCategory: card1.category === card2.category,
    hasComboMindUrl: !!comboMindUrl,
    decision: comboMindUrl ? 'USE_SHARED_MIND' : 'NEED_INDIVIDUAL'
});
```

---

## Task F4: Add Helper Functions

**Files:**
- Modify: `frontend-web/src/hooks/useMultiFlashcard.ts`

- [ ] **Step 1: Add getCategories helper**

```typescript
const getCategories = useCallback((): string[] => {
    const categories = Array.from(state.detectedFlashcards.values()).map(f => f.category);
    return [...new Set(categories)];
}, [state.detectedFlashcards]);
```

- [ ] **Step 2: Add hasSameCategory helper**

```typescript
const hasSameCategory = useCallback((): boolean => {
    const categories = getCategories();
    return categories.length === 1;
}, [getCategories]);
```

- [ ] **Step 3: Export in return object**

```typescript
return {
    // ... existing exports ...
    getCategories,
    hasSameCategory,
    // ... existing exports ...
};
```

---

# PART 3: FRONTEND COMMIT

---

## Task F5: Frontend Commit

- [ ] **Step 1: Stage frontend changes**

```bash
git add frontend-web/src/hooks/useMultiFlashcard.ts frontend-web/src/pages/LearnARV2.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(frontend): 1-shot auto-scan + category filter + shared mind loading

UX Enhancement:
- Remove + Add card button, scanner auto-continues after first scan
- 1-shot flow: scan 2 cards = auto transition to viewing
- Show scanning progress overlay with card count indicator

Category Filter:
- Add category field to FlashcardData
- Skip combo check when categories differ
- Same category = shared .mind file

Debug:
- Add COMBO_CATEGORY_MISMATCH event
- Add MIND_FILE_DECISION event
- Add getCategories and hasSameCategory helpers"
```

---

# PART 4: BACKEND CHANGES (Phase 2)

---

## Task B1: Update ARCombination Model (Safe Migration)

**Files:**
- Modify: `backend/models/ar_combination.py`

- [ ] **Step 1: Add `cross_category_allowed` field with default**

```python
class ArCombination(Document):
    combo_id: Indexed(str, unique=True)
    description: str
    required_tags: List[str] = Field(default_factory=list)
    target_order: Optional[List[str]] = None
    
    # Assets
    model_3d_url: Optional[str] = None
    image_2d_url: Optional[str] = None
    texture_url: Optional[str] = None
    combo_mind_url: Optional[str] = None
    
    # Rewards
    reward_xp: int = Field(default=100)
    
    # Animation & Sound
    animation: Optional[str] = None
    sound: Optional[str] = None
    phrase: Optional[str] = None
    
    # NEW: Allow/disallow cross-category combos
    cross_category_allowed: bool = Field(default=False)
    
    # Metadata
    priority: int = Field(default=0)
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
```

- [ ] **Step 2: Update Pydantic schema**

```python
class ArCombinationSchema(BaseModel):
    # ... existing fields ...
    cross_category_allowed: bool = Field(default=False)
    # ... existing fields ...
```

---

## Task B2: Update ARService with Category Validation

**Files:**
- Modify: `backend/services/ar_service.py`

- [ ] **Step 1: Add category validation in check_combo**

```python
async def check_combo(self, tags: List[str]) -> Optional[Dict]:
    """
    Check if the given tags form a valid combo.
    
    Rules:
    1. Combo must exist with matching required_tags
    2. If cross_category_allowed=False, all flashcards must have same category
    3. Target order must be valid
    4. Combo must be active
    """
    if len(tags) < 2:
        return None
    
    query = {
        "required_tags": {"$all": tags},
        "active": True
    }
    
    combos = await ArCombination.find(query).to_list()
    
    if not combos:
        return None
    
    combos.sort(key=lambda x: x.priority, reverse=True)
    combo = combos[0]
    
    # NEW: Validate categories
    flashcards = await Flashcard.find(
        Flashcard.ar_tag.in_(tags)
    ).to_list()
    
    if not flashcards:
        return None
    
    categories = set(fc.category for fc in flashcards if fc.category)
    
    # Handle None (existing docs) as False
    if len(categories) > 1 and not (combo.cross_category_allowed or False):
        logger.info(f"[ARService] Combo {combo.combo_id} rejected: different categories {categories}")
        return None
    
    return combo.model_dump()
```

---

## Task B3: Backend Migration Script

**Files:**
- Create: `backend/scripts/migrate_cross_category_flag.py`

- [ ] **Step 1: Create migration script**

```python
"""
Migration: Set cross_category_allowed=True for existing cross-category combos
Run: python -m backend.scripts.migrate_cross_category_flag
"""
from models.ar_combination import ArCombination

async def migrate_cross_category_combos():
    """Set cross_category_allowed=True for existing jungle/nature combos."""
    print("[Migration] Starting cross_category_allowed migration...")
    
    target_patterns = ['jungle', 'ecosystem', 'nature', 'eco', 'animal', 'plant']
    
    updated_count = 0
    for pattern in target_patterns:
        query = {
            "$or": [
                {"description": {"$regex": pattern, "$options": "i"}},
                {"combo_id": {"$regex": pattern, "$options": "i"}}
            ],
            "$or": [
                {"cross_category_allowed": {"$exists": False}},
                {"cross_category_allowed": None},
                {"cross_category_allowed": False}
            ]
        }
        
        combos = await ArCombination.find(query).to_list()
        
        for combo in combos:
            combo.cross_category_allowed = True
            await combo.save()
            updated_count += 1
            print(f"  Updated: {combo.combo_id}")
    
    print(f"[Migration] Complete. Updated {updated_count} combos.")
```

---

## Task B4: Backend Tests

**Files:**
- Create: `backend/tests/test_ar_service.py`

- [ ] **Step 1: Write test for same-category combo**

```python
async def test_combo_same_category_allowed():
    """Same category combos should work regardless of cross_category_allowed flag"""
    # Create test flashcards
    fc1 = await Flashcard.create(
        qr_id="test_cat1",
        word="test1",
        category="animals",
        ar_tag="tag_animal_1"
    )
    fc2 = await Flashcard.create(
        qr_id="test_cat2", 
        word="test2",
        category="animals",
        ar_tag="tag_animal_2"
    )
    
    combo = await ArCombination.create(
        combo_id="test_combo_same",
        description="Same category test",
        required_tags=["tag_animal_1", "tag_animal_2"],
        cross_category_allowed=False
    )
    
    result = await ar_service.check_combo(["tag_animal_1", "tag_animal_2"])
    assert result is not None
```

- [ ] **Step 2: Write test for cross-category combo rejected**

```python
async def test_combo_cross_category_rejected():
    """Different categories should be rejected when cross_category_allowed=False"""
    fc1 = await Flashcard.create(
        qr_id="test_dog",
        word="dog",
        category="animals",
        ar_tag="tag_dog"
    )
    fc2 = await Flashcard.create(
        qr_id="test_apple",
        word="apple", 
        category="fruits",
        ar_tag="tag_apple"
    )
    
    combo = await ArCombination.create(
        combo_id="test_combo_cross",
        description="Cross category test",
        required_tags=["tag_dog", "tag_apple"],
        cross_category_allowed=False
    )
    
    result = await ar_service.check_combo(["tag_dog", "tag_apple"])
    assert result is None  # Rejected
```

- [ ] **Step 3: Write test for cross-category combo allowed**

```python
async def test_combo_cross_category_allowed():
    """Different categories should be allowed when cross_category_allowed=True"""
    fc1 = await Flashcard.create(
        qr_id="test_elephant",
        word="elephant",
        category="animals",
        ar_tag="tag_elephant"
    )
    fc2 = await Flashcard.create(
        qr_id="test_palm",
        word="palm",
        category="plants",
        ar_tag="tag_palm"
    )
    
    combo = await ArCombination.create(
        combo_id="test_combo_eco",
        description="Eco system combo",
        required_tags=["tag_elephant", "tag_palm"],
        cross_category_allowed=True
    )
    
    result = await ar_service.check_combo(["tag_elephant", "tag_palm"])
    assert result is not None
```

---

## Task B5: Backend Commit

- [ ] **Step 1: Stage backend changes**

```bash
git add backend/models/ar_combination.py backend/services/ar_service.py
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(backend): add cross_category_allowed field with migration

- Add cross_category_allowed bool field (default False)
- Handle None from MongoDB as False (backward compatibility)
- Validate flashcard categories in check_combo service
- Add migration script for existing combos
- Add 3 test cases"
```

---

# Summary

## UX Flow Comparison

| Aspect | Before (Button) | After (1-Shot) |
|--------|-----------------|----------------|
| First scan | → VIEWING | → STAY SCANNING |
| Add second card | Click button | Auto-detect |
| Transition | Manual button click | Auto when 2 cards |
| User action | 2 clicks + 2 scans | 2 scans only |

## Changes by Component

| Component | File | Changes |
|-----------|------|---------|
| **LearnARV2** | `LearnARV2.tsx` | Remove +Add button, add scanMode, auto-transition |
| **Hook** | `useMultiFlashcard.ts` | Category filter, helper functions |
| **Backend Model** | `ar_combination.py` | `cross_category_allowed` field |
| **Backend Service** | `ar_service.py` | Category validation |
| **Migration** | `migrate_*.py` | Migration for existing combos |

## Implementation Order

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | U1-U3, F1-F4 | **UX + Category (Frontend)** |
| 2 | B1-B5 | Backend changes |

## Debug Events

| Event | When | Data |
|-------|------|------|
| `COMBO_CATEGORY_MISMATCH` | Categories differ | `{category1, category2}` |
| `MIND_FILE_DECISION` | Checking mind file | `{sameCategory, decision}` |
| `LEARNAR_QR_GATE_COOLDOWN` | QR ignored | `{qrId, msSinceLastSeen}` |

---

## Phase 3 (Optional Future Work)

If offline combo validation is needed:

1. Create `frontend-web/src/data/combo-rules.ts` with local combo rules
2. Implement sorted-key lookup for instant local filtering
3. Fall back to backend for unknown combos
