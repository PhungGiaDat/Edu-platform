# AR Tracking System Analysis - Research Report

**Date:** July 21, 2026  
**Author:** Research Subagent  
**Purpose:** Deep analysis of AR system architecture for "Freeze Pose" and "Semantic Manager" feature implementation

---

## Executive Summary

The AR tracking system uses a **two-iframe architecture** with MindAR for image target tracking and A-Frame for 3D rendering. The system communicates via `postMessage` with a typed message protocol. Currently, `TARGET_FOUND` events fire **immediately** when MindAR detects a marker, with only a 900ms grace period on `TARGET_LOST`. There is **no existing stabilization logic** (no frame counting, no pose smoothing). This is both a risk and an opportunity for implementing the "Freeze Pose" feature.

---

## Current Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LearnARV2.tsx (React)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     ARContainerV2.tsx                               │  │
│  │  ┌──────────────────────────┐    ┌────────────────────────────┐  │  │
│  │  │    SCANNING Phase        │    │    VIEWING Phase            │  │  │
│  │  │  ┌──────────────────┐   │    │  ┌──────────────────────┐  │  │  │
│  │  │  │ ar-scanner.html │   │    │  │    ar-viewer.html    │  │  │  │
│  │  │  │ (jsQR Library)  │   │    │  │   (MindAR + A-Frame)│  │  │  │
│  │  │  │                  │   │    │  │                      │  │  │  │
│  │  │  │ QR Code →        │   │    │  │  ┌──────────────┐   │  │  │
│  │  │  │ postMessage      │───┼────┼─▶│  │ MindAR Engine│   │  │  │
│  │  │  │ (QR_DETECTED)    │   │    │  │  └──────┬───────┘   │  │  │
│  │  │  └──────────────────┘   │    │  │         │            │  │  │
│  │  └──────────────────────────┘    │  │         ▼            │  │  │
│  │                                  │  │  ┌──────────────┐   │  │  │
│  └──────────────────────────────────┴──┼─▶│ A-Frame Scene │   │  │  │
│                                         │  │  (3D Models)  │   │  │  │
│                                         │  └────────────────┘   │  │  │
│                                         └──────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    postMessage Bridge                                 │  │
│  │                                                                      │  │
│  │  IFRAME → PARENT:                                                   │  │
│  │    • QR_DETECTED     { qrId, timestamp }                            │  │
│  │    • TARGET_FOUND    { targetIndex, confidence }                     │  │
│  │    • TARGET_LOST     { targetIndex }                                │  │
│  │    • MODEL_CLICKED  { modelId, targetIndex }                       │  │
│  │    • COMBO_DETECTED { targets[], distance }                         │  │
│  │    • SYSTEM_ERROR   { code, message }                              │  │
│  │                                                                      │  │
│  │  PARENT → IFRAME:                                                   │  │
│  │    • SET_MODE        { mode: '2D' | '3D' }                         │  │
│  │    • TRIGGER_ANIMATION { clip, loop }                               │  │
│  │    • MIND_BUFFER     { buffer: Uint8Array }                         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Research Question 1: How does single-flashcard mode currently work?

### QR Detection Flow

1. **Camera activates** in `ar-scanner.html` via `initCamera()` (line 26-61)
2. **jsQR library** scans frames every 200ms (`scanFrame` interval, line 65)
3. **QR detected** → `handleDetection()` (line 83-101)
4. **postMessage** sends `QR_DETECTED` to parent:
   ```javascript
   // ar-scanner.js:93-96
   sendToParent('QR_DETECTED', {
       qrId: data,
       timestamp: Date.now()
   });
   ```
5. **Parent receives** via `handleARMessage` → `handleQRDetected()` in LearnARV2 (line 1044)
6. **State transitions**: SCANNING → LOADING → VIEWING

### MindAR Initialization

When `ar-viewer.html` loads:
1. **Bootstrap** loads MindAR config (line 120-148)
2. **A-Frame scene** mounts with `mindar-image` attribute (line 29-59)
3. **Filter settings** for stability:
   ```javascript
   // ar-viewer.html:137-138
   'filterMinCF: 0.001',
   'filterBeta: 0.001'
   ```
   - `filterMinCF`: Higher = faster response, lower = more stable
   - `filterBeta`: Lower = smoother tracking

### 3D Model Positioning

Models are positioned as children of `a-entity[mindar-image-target]`:

```html
<!-- ar-viewer.html:39-48 -->
<a-entity id="target-0" mindar-image-target="targetIndex: 0">
    <!-- 2D Image (hidden by default) -->
    <a-image id="mode-2d-0" visible="false" />
    
    <!-- 3D Model (default) -->
    <a-entity id="mode-3d-0" 
        position="0 0.05 0"
        scale="0.25 0.25 0.25"
        visible="true" />
</a-entity>
```

- **Target 0**: `y=0.05`, `scale=0.25` (word cards)
- **Target 1**: `y=0.1`, `scale=0.5` (larger for proximity combos)

### postMessage Events Sent

| Event | Payload | When |
|-------|---------|------|
| `TARGET_FOUND` | `{ targetIndex, confidence }` | Immediately on MindAR detection |
| `TARGET_LOST` | `{ targetIndex }` | After 900ms grace period |
| `MULTI_TARGET_DETECTED` | `{ targets[], arTags[], comboType }` | When 2+ targets visible |
| `COMBO_PROXIMITY_DETECTED` | `{ targets, distance, midpoint }` | When targets within 0.5 units |
| `MODEL_CLICKED` | `{ modelId, targetIndex }` | On user tap/click |

---

## Research Question 2: Where are game/quiz popups triggered?

### Game/Quiz Trigger Points

Games and quizzes are **NOT triggered by AR tracking events**. They are triggered by:

1. **User interaction via Control Panel** (`ARControlPanel`):
   - `handleAppModeChange` in LearnARV2 (line 1261-1272)
   - Mode changes to `'QUIZ'` → `setAppState('QUIZ')` → `QuizOverlay` renders
   - Mode changes to `'GAME'` → `setShowGameSelector(true)` → `GameSelector` renders

2. **Mode Enums**:
   ```typescript
   // LearnARV2.tsx:98
   type AppState = 'SCANNING' | 'LOADING' | 'VIEWING' | 'QUIZ' | 'GAME' | 'PRONUNCIATION' | 'ERROR';
   ```

3. **Rendering Logic**:
   ```tsx
   // LearnARV2.tsx:1577-1581
   {appState === 'QUIZ' && quizData && (
       <Suspense fallback={null}>
           <QuizOverlay quizSession={quizData} onExit={handleExitQuiz} />
       </Suspense>
   )}
   ```

### postMessage Events for Games/Quizzes

**There are NO postMessage events that directly trigger games/quizzes.**

The AR system sends events about tracking state, but game/quiz logic is entirely within React state management:
- `COMBO_DETECTED` → triggers combo animations and haptic feedback, but NOT quiz/game
- `COMBO_PROXIMITY_DETECTED` → similar - combo celebration only

---

## Research Question 3: How does the iframe postMessage bridge work?

### Events SENT from iframe to parent

| Event Name | Payload Structure | Trigger |
|------------|------------------|---------|
| `SYSTEM_READY` | `{ version, capabilities[], scene }` | MindAR ready |
| `AR_READY` | `{ targetCount }` | AR initialized |
| `QR_DETECTED` | `{ qrId, timestamp }` | QR code scanned |
| `SCANNER_READY` | `{ width, height }` | Camera ready |
| `SCANNER_ERROR` | `{ error }` | Camera failed |
| `TARGET_FOUND` | `{ targetIndex, confidence }` | Marker detected |
| `TARGET_LOST` | `{ targetIndex }` | Marker lost (after 900ms) |
| `MODEL_CLICKED` | `{ modelId, targetIndex }` | User tapped model |
| `MULTI_TARGET_DETECTED` | `{ targets[], arTags[], comboType }` | 2+ targets visible |
| `COMBO_DETECTED` | `{ targets[], distance, phrase }` | Proximity combo triggered |
| `COMBO_PROXIMITY_DETECTED` | `{ targets, distance, midpoint, positions }` | Targets close |
| `COMBO_PROXIMITY_ENDED` | `{ targets }` | Targets moved apart |
| `COMBO_PROXIMITY_UPDATE` | `{ targets, distance, midpoint }` | Continuous update |
| `AR_TRACKING_STATE` | `{ reason, target0, target1, both }` | State snapshot |
| `AR_DEBUG` | `{ label, details }` | Debug info |
| `SYSTEM_ERROR` | `{ code, message, url? }` | Error occurred |
| `ANIMATION_COMPLETE` | `{ clip }` | Animation finished |

### Events RECEIVED by iframe from parent

| Event Name | Payload | Action |
|------------|---------|--------|
| `SET_MODE` | `{ mode: '2D' | '3D' }` | Toggle 2D/3D display |
| `TRIGGER_ANIMATION` | `{ clip, loop }` | Play model animation |
| `UPDATE_TEXTURE` | `{ dataUrl, targetMesh? }` | Apply texture |
| `PLAY_AUDIO` | `{ url, volume? }` | Play sound |
| `LOAD_MODEL` | `{ targetIndex, url }` | Load 3D model |
| `PAUSE_TRACKING` | - | Pause MindAR |
| `RESUME_TRACKING` | - | Resume MindAR |
| `SET_WORD` | `{ targetIndex, word }` | Set word for speech |
| `SET_PROXIMITY_THRESHOLD` | `{ threshold }` | Adjust combo distance |
| `ENABLE_COMBO_EFFECTS` | - | Show combo visuals |
| `DISABLE_COMBO_EFFECTS` | - | Hide combo visuals |
| `MIND_BUFFER` | `{ buffer: ArrayBuffer }` | Merged mind file |
| `MIND_BUFFER_REQUEST` | (child sends) | Request buffer delivery |

### Message Format

All messages use this structure:

```typescript
interface ARMessage {
    type: string;           // Event name
    payload: object;        // Event data
    timestamp: number;      // Date.now()
    origin: 'child';        // Always 'child' from iframe
}
```

### Acknowledgment Patterns

**NO explicit acknowledgment pattern exists.** Messages are fire-and-forget:
- Parent never sends `ACK` back to iframe
- No sequence numbers or message IDs
- No retry logic

**Exception:** `MIND_BUFFER_REQUEST` / `MIND_BUFFER` uses a polling pattern:
```javascript
// ar-viewer.html:114-116
var requestBuffer = function () { postToParent('MIND_BUFFER_REQUEST', {}); };
requestIntervalId = window.setInterval(requestBuffer, 300);
```

---

## Research Question 4: Where does MindAR `onTargetFound` fire currently?

### Exact Code Location

**File:** `ar-viewer.js`  
**Lines:** 859-884

```javascript
target.addEventListener('targetFound', () => {
    log('🎯', `✨ TARGET ${index} FOUND! Image detected by MindAR`);
    const lostTimer = targetLostTimers.get(index);
    if (lostTimer) {
        clearTimeout(lostTimer);
        targetLostTimers.delete(index);
    }
    activeTargets.set(index, {
        element: target,
        timestamp: Date.now()
    });

    sendToParent('TARGET_FOUND', {
        targetIndex: index,
        confidence: 1.0
    });
    sendTrackingState(`target-${index}-found`);
    sendRenderSnapshot('TARGET_RENDER_STATE_FOUND', {
        targetIndex: index,
        content2dId: `mode-2d-${index}`,
        content3dId: `mode-3d-${index}`
    });

    checkMultiTarget();
});
```

### What Happens on Target Found

1. **Clear lost timer**: Prevents pending `TARGET_LOST`
2. **Update activeTargets Map**: Tracks which targets are visible
3. **Send `TARGET_FOUND`**: Immediate postMessage to parent
4. **Send tracking state**: Debug snapshot
5. **Check for multi-target**: Triggers combo detection

### Existing Stabilization Logic

**LIMITED stabilization exists only for `TARGET_LOST`:**

```javascript
// ar-viewer.js:886-910
target.addEventListener('targetLost', () => {
    const existingTimer = targetLostTimers.get(index);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
        targetLostTimers.delete(index);
        if (!activeTargets.has(index)) return;

        activeTargets.delete(index);
        sendToParent('TARGET_LOST', { targetIndex: index });
        sendTrackingState(`target-${index}-lost`);
        
        if (activeTargets.size < COMBO_THRESHOLD) {
            stopProximityCheck();
        }
    }, TARGET_LOST_GRACE_MS);  // 900ms

    targetLostTimers.set(index, timer);
});
```

### Current Pose Handling

**No pose handling exists.** The system:
- Accepts MindAR's detected pose directly
- No frame counting or averaging
- No pose smoothing
- Models appear/disappear instantly when tracking toggles

---

## Research Question 5: How are 3D models currently created and positioned?

### A-Frame Entity Creation

Models are created in two ways:

**1. Static (HTML template):**
```html
<!-- ar-viewer.html:39-58 -->
<a-entity id="target-0" mindar-image-target="targetIndex: 0">
    <a-image id="mode-2d-0" visible="false" />
    <a-entity id="mode-3d-0" 
        position="0 0.05 0" 
        scale="0.25 0.25 0.25"
        visible="true" />
</a-entity>
```

**2. Dynamic (JavaScript):**
```javascript
// ar-viewer.js:233-289 - ensureDynamicTargets()
targetConfigs.forEach((target) => {
    let targetEl = document.getElementById(`target-${target.index}`);
    if (!targetEl) {
        // Create target entity
        targetEl = document.createElement('a-entity');
        targetEl.id = `target-${target.index}`;
        targetEl.setAttribute('mindar-image-target', `targetIndex: ${target.index}`);
        
        // Create 2D image
        const imageEl = document.createElement('a-image');
        imageEl.setAttribute('id', `mode-2d-${target.index}`);
        
        // Create 3D model entity
        const modelEl = document.createElement('a-entity');
        modelEl.id = `mode-3d-${target.index}`;
        modelEl.setAttribute('position', `0 ${target.index === 0 ? 0.05 : 0.1} 0`);
        modelEl.setAttribute('scale', `${modelScale} ${modelScale} ${modelScale}`);
        
        targetEl.appendChild(imageEl);
        targetEl.appendChild(modelEl);
        scene.appendChild(targetEl);
    }
});
```

### MindAR Anchor Relationship

The `a-entity[mindar-image-target]` IS the anchor:
- MindAR detects image → positions the `target-*` entity in 3D space
- Child elements (`mode-3d-*`) inherit this position automatically
- No manual pose adjustment occurs

### Model Scale Settings

```javascript
// ar-viewer.js:227-231
function getTargetModelScale(index) {
    if (index === 0) return 0.25;
    if (index === 1) return 0.5;
    return 0.35;
}
```

### No Model Pooling/Reuse

**No pooling exists.** Each target has dedicated entities:
- `target-0` / `target-1` (anchors)
- `mode-2d-0` / `mode-2d-1` (2D images)
- `mode-3d-0` / `mode-3d-1` (3D models)

---

## Research Question 6: Is there existing stabilization logic?

### Existing Stabilization Mechanisms

| Mechanism | Location | Description |
|-----------|----------|-------------|
| `TARGET_LOST_GRACE_MS = 900` | ar-viewer.js:39 | 900ms delay before sending TARGET_LOST |
| `lastTargetEventRef` | LearnARV2.tsx:560 | Tracks last target event timestamp |
| Combo commit delay | LearnARV2.tsx:689-699 | 700ms + 900ms = 1600ms before combo commit |
| `qrGateRef` | LearnARV2.tsx:559 | 2500ms cooldown between same QR detections |

### Key Code References

**1. Target Lost Grace Period (900ms):**
```javascript
// ar-viewer.js:886-910
const TARGET_LOST_GRACE_MS = 900;
const timer = setTimeout(() => {
    // ... send TARGET_LOST
}, TARGET_LOST_GRACE_MS);
```

**2. Last Target Event Tracking:**
```javascript
// LearnARV2.tsx:560
const lastTargetEventRef = useRef(0);

// LearnARV2.tsx:1147-1159
const handleTargetFound = useCallback((idx: number) => {
    lastTargetEventRef.current = Date.now();
    if (idx === 0) setMarkerFound(true);
    // ...
}, [...]);

// LearnARV2.tsx:1161-1165
const handleTargetLost = useCallback((idx: number) => {
    lastTargetEventRef.current = Date.now();
    if (idx === 0) setMarkerFound(false);
}, []);
```

**3. Combo Commit Stabilization:**
```javascript
// LearnARV2.tsx:689-699
const commitWhenTrackingSettles = () => {
    const msSinceTargetEvent = Date.now() - lastTargetEventRef.current;
    if (msSinceTargetEvent < 900) {
        timeoutId = window.setTimeout(commitWhenTrackingSettles, 900 - msSinceTargetEvent);
        return;
    }
    // Commit combo
};
timeoutId = window.setTimeout(commitWhenTrackingSettles, 700);
```

### What Does NOT Exist

- ❌ Frame counting (no 15-frame or similar counter)
- ❌ Pose smoothing/averaging
- ❌ Kalman filters
- ❌ Extended tracking beyond grace period
- ❌ Confidence scoring based on consecutive frames

---

## Research Question 7: How does multi-flashcard mode differ from single?

### Mode Detection

Mode is detected via **URL parameters** and **state tracking**:

```javascript
// ar-viewer.js:117-119
const maxTrack = Math.max(1, Math.min(Number(params.get('maxTrack')) || 1, 5));
const cardCount = Math.max(1, Math.min(Number(params.get('cardCount') || params.get('targetCount')) || 1, 5));
const targetCount = Math.max(1, Math.min(Number(params.get('targetCount')) || cardCount, maxTrack, 5));
```

### Conditional Branches

**1. In ar-viewer.js:**
- `targetConfigs` array length varies (1 vs 2)
- Different scales per target index
- `checkMultiTarget()` only fires when `activeTargets.size >= COMBO_THRESHOLD (2)`

**2. In LearnARV2.tsx:**
- `flashcardCount` determines mode
- `isMultiViewer` state (line 877-884)
- `isComboViewer` state (line 708-712)
- Different UI overlays shown based on mode

### Multi-Card Features

| Feature | Single Card | Multi-Card |
|---------|-------------|------------|
| QR scanning | ✅ | ✅ |
| MindAR tracking | ✅ (maxTrack=1) | ✅ (maxTrack=2+) |
| 3D model display | ✅ | ✅ |
| Proximity detection | ❌ | ✅ |
| Combo effects | ❌ | ✅ |
| Merged mind file | ❌ | ✅ |

### What Breaks in Multi-Card Mode

1. **Mind buffer delivery timing** - documented in `DEBUG_20260706_MULTI_FLASHCARD_LOADING.md`
2. **Proximity threshold** - 0.5 units may need tuning
3. **Combo model loading** - depends on `comboModelUrl` being set
4. **Second card 2D image** - only `imageUrl2` gets loaded, no `textureUrl2` in URL params

---

## Research Question 8: What breaks if we add a 15-frame delay?

### Impact Assessment

Adding a 15-frame stabilization delay (at ~30fps = ~500ms) would affect:

### 1. Game/Quiz Timing

**LOW RISK** - Games/quizzes are NOT triggered by TARGET_FOUND events.
- They're triggered by user clicking control panel buttons
- No direct timing dependency exists

### 2. UX Response

**MEDIUM RISK** - Users may perceive lag:
- Currently: Marker found → model appears instantly
- With 15 frames: Marker found → 500ms delay → model appears
- This is actually the DESIRED behavior for "Freeze Pose"

### 3. Proximity Detection

**MEDIUM RISK** - Proximity checks start from `checkMultiTarget()`:
```javascript
// ar-viewer.js:1560-1578
function checkMultiTarget() {
    if (activeTargets.size < COMBO_THRESHOLD) {
        stopProximityCheck();
        return;
    }
    startProximityCheck();
}
```
- If TARGET_FOUND is delayed, proximity check also delays
- 500ms additional delay for combo detection

### 4. Combo Model Loading

**LOW RISK** - Combo model loads after proximity triggers:
```javascript
// ar-viewer.js:1679
loadComboModel(midpoint);
```
- Depends on `checkTargetProximity()` which uses `activeTargets` map
- Would also be delayed by 500ms

### 5. Timeout Considerations

**Existing timeouts to consider:**
- `TARGET_LOST_GRACE_MS = 900ms` - may need adjustment
- Combo commit delay in LearnARV2 = 1600ms total (700ms + 900ms)
- If adding 500ms stabilization, combo commit becomes ~2100ms

---

## Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| UX lag feels sluggish | Medium | High | Add visual loading indicator during stabilization |
| Proximity detection delayed | Medium | Medium | Adjust `PROXIMITY_CHECK_INTERVAL` timing |
| Combo effects delayed | Low | Low | Acceptable - improves stability |
| TARGET_LOST during stabilization | Medium | Medium | Ensure grace period extends beyond stabilization |
| State inconsistency (found vs stable) | Medium | Low | Track both "detected" and "stable" states |

---

## Recommended Injection Points for New Code

### Option A: In ar-viewer.js (iframe)

**Best for:** Direct MindAR integration, frame-level control

**Injection Points:**
1. **Line 859-884** - Inside `targetFound` event handler
   ```javascript
   // Add frame counter before sendToParent('TARGET_FOUND')
   targetStabilityFrames.set(index, 0);
   startStabilityCheck(index);
   ```

2. **After line 39** - Add stability tracking variables
   ```javascript
   const TARGET_STABLE_FRAMES = 15;
   const targetStabilityFrames = new Map();
   const stabilityCheckInterval = 50; // ms
   ```

3. **After line 910** - Add stability check functions
   ```javascript
   function startStabilityCheck(targetIndex) { ... }
   function onTargetStable(targetIndex) { ... }
   ```

**Pros:**
- Direct access to MindAR events
- Can use requestAnimationFrame for accurate frame counting
- No postMessage latency

**Cons:**
- Modification to static JS file (needs rebuild/deploy)
- Less React integration

### Option B: In ARContainerV2.tsx (React iframe wrapper)

**Best for:** State management, React integration, semantic layer

**Injection Points:**
1. **Around line 358-367** - In `handleMessage` for `TARGET_FOUND`
   ```typescript
   case 'TARGET_FOUND': {
       // Add stabilization logic here
       if (!this.pendingStableTargets.has(data.targetIndex)) {
           this.pendingStableTargets.set(data.targetIndex, {
               frames: 0,
               startTime: Date.now()
           });
       }
       // ...
   }
   ```

2. **Add new state/refs:**
   ```typescript
   const stableTargetsRef = useRef<Map<number, {frames: number, stable: boolean}>>(new Map());
   const STABLE_FRAME_COUNT = 15;
   ```

**Pros:**
- Full React integration
- Can expose "stable" state to parent components
- Easier to add visual feedback (loading indicators)

**Cons:**
- postMessage latency added
- Less direct control over timing

### Option C: Hybrid Approach (Recommended)

**Layer 1 - ar-viewer.js:**
- Add frame counting
- Send `TARGET_STABILITY_UPDATE` events every frame
- Don't delay `TARGET_FOUND`, just track stability

**Layer 2 - ARContainerV2.tsx:**
- Listen for stability updates
- Implement freeze/delay logic
- Track "stable" vs "detected" states

**Layer 3 - LearnARV2.tsx:**
- Use stable state for combo/game logic
- Display "stabilizing" visual feedback

---

## Key Code Locations Reference

### ar-viewer.html
| Line | Description |
|------|-------------|
| 39-48 | Target-0 template definition |
| 50-58 | Target-1 template definition |
| 62-166 | Bootstrap and MindAR initialization |
| 137-138 | Filter settings (stability tuning) |

### ar-viewer.js
| Line | Description |
|------|-------------|
| 34-46 | Global state variables |
| 39 | `TARGET_LOST_GRACE_MS = 900` |
| 859-884 | `targetFound` event handler |
| 886-910 | `targetLost` event handler with grace period |
| 1560-1578 | `checkMultiTarget()` function |
| 1617-1710 | `checkTargetProximity()` for combo detection |
| 1968-1986 | `setMode()` for 2D/3D switching |

### ARContainerV2.tsx
| Line | Description |
|------|-------------|
| 284-436 | `handleMessage()` - all inbound postMessage handling |
| 358-367 | `TARGET_FOUND` case |
| 370-379 | `TARGET_LOST` case |
| 389-396 | `COMBO_DETECTED` case |
| 439-479 | Stable Mind buffer delivery mechanism |

### LearnARV2.tsx
| Line | Description |
|------|-------------|
| 560 | `lastTargetEventRef` - tracks last target event |
| 689-699 | Combo commit with 900ms stabilization |
| 1044-1118 | `handleQRDetected()` - QR processing |
| 1147-1159 | `handleTargetFound()` - target found handler |
| 1161-1165 | `handleTargetLost()` - target lost handler |
| 1261-1272 | `handleAppModeChange()` - quiz/game triggering |

---

## Additional Findings

### postMessage Security Note

All postMessages use `postMessage({...}, '*')` which:
- ✅ Works across all browsers
- ✅ Allows any origin to receive messages
- ⚠️ Consider tightening to specific origin in production

### Debug Infrastructure

The system has extensive debug logging:
- `AR_DEBUG` events sent via postMessage
- `emitMobileDebug()` function for backend logging
- URL param `?debug=true` enables verbose console output

### Performance Considerations

1. **MindAR filter settings** (`filterMinCF: 0.001`, `filterBeta: 0.001`) are tuned for stability
2. **Proximity check interval** is 100ms - could impact battery
3. **No model pooling** - each target has dedicated entities
4. **Touch events throttled** via RAF in `handleTouchMove`

---

## References

- MindAR Documentation: https://github.com/hiukim/mind-ar-js
- A-Frame Documentation: https://aframe.io/docs/
- Project Debug Report: `report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md`
