# Wiring Audit Report: Freeze Pose + Semantic Manager

**Date:** July 22, 2026  
**Auditor:** SDLC Orchestrator  
**Status:** CRITICAL GAPS FOUND

---

## Executive Summary

**The new stability and semantic manager modules are completely disconnected from the existing AR viewer.** The code exists in isolation but has **zero integration points** with `ar-viewer.html`, `ar-viewer.js`, `LearnARV2.tsx`, or `ARContainerV2.tsx`. Adding `?freezePose=true` or `?semanticManager=true` to any URL will do nothing.

---

## 1. Architecture Wiring Verification

### 1.1 Integration Points Status

| Component | Status | Evidence |
|-----------|--------|----------|
| `ar-viewer.html` | ❌ **NOT WIRED** | Only loads `ar-viewer.js` (line 147) |
| `ar-viewer.js` | ❌ **NOT WIRED** | Zero imports of new modules; grep confirmed |
| `LearnARV2.tsx` | ❌ **NOT WIRED** | Grep found no references to new features |
| `ARContainerV2.tsx` | ❌ **NOT WIRED** | Grep found no references to new features |

### 1.2 Module Dependency Analysis

**New modules created but unused:**

```
frontend-web/public/static/ar-assets/js/
├── core/
│   ├── math-utils.js              ❌ No imports from anywhere
│   ├── pose-averager.js           ❌ No imports from anywhere
│   └── config-loader.js          ❌ No imports from anywhere
├── stability/
│   ├── stability-gate.js         ❌ No imports from anywhere
│   └── pose-stabilizer.js        ❌ No imports from anywhere
├── semantic/
│   ├── semantic-manager.js        ❌ No imports from anywhere
│   ├── combo-spawner.js          ❌ No imports from anywhere
│   └── rule-loader.js            ❌ No imports from anywhere
└── integration/
    └── ar-viewer-integration.js  ❌ COMPLETELY DEAD CODE
```

**Evidence from `ar-viewer.html` (lines 62-167):**

```javascript
// Only loads these scripts:
await loadScript('/static/ar-assets/js/ar-viewer.js');
// NO imports for:
// - core/* modules
// - stability/* modules  
// - semantic/* modules
// - integration/ar-viewer-integration.js
```

**Evidence from `ar-viewer.js` (grep search):**

```
No matches found for:
- freezePose
- semanticManager
- ARViewerIntegration
- PoseStabilizer
- SemanticManager
- stability-gate
- rule-loader
```

---

## 2. Feature Flag Mechanism Verification

### 2.1 URL Parameter Analysis

| Parameter | Expected Usage | Actual Usage |
|-----------|---------------|-------------|
| `?freezePose=true` | Enable stability gate | ❌ **NOT READ** anywhere |
| `?semanticManager=true` | Enable semantic manager | ❌ **NOT READ** anywhere |
| `?maxTrack=2` | Multi-card mode | ✅ Used in `ar-viewer.html:130` |
| `?mind=runtime-buffer` | Runtime Mind file | ✅ Used in `ar-viewer.html:121` |

### 2.2 ES Module Import Issue

The new modules use ES module syntax:

```javascript
// ar-viewer-integration.js (line 1)
import { PoseStabilizer } from '../stability/pose-stabilizer.js';
```

But `ar-viewer.html` has **NO mechanism to import ES modules**. The script loading uses:

```javascript
// ar-viewer.html lines 76-84
function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        // ...
    });
}
```

This loads traditional IIFE scripts, NOT ES modules. The integration module **cannot work** without either:

1. Adding `<script type="module">` imports, OR
2. Converting new modules to IIFE format with global exports

---

## 3. Gap Analysis

### 3.1 Critical Missing Pieces

| Gap | Impact | File Location |
|-----|--------|---------------|
| No URL param reading for feature flags | Features never activate | `ar-viewer.html` |
| No module imports | New code never loads | `ar-viewer.html` |
| No postMessage integration | Parent can't trigger features | `ar-viewer.js` |
| No React state integration | UI never updates with stability progress | `LearnARV2.tsx` |
| No event handlers | TARGET_STABLE events never fire | `ARContainerV2.tsx` |

### 3.2 Required Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                     MISSING INTEGRATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ar-viewer.html                                                  │
│       │                                                          │
│       ├── ❌ Needs: <script type="module" src="...">            │
│       │     OR convert modules to IIFE with global exports      │
│       │                                                          │
│       └── ❌ Needs: Read freezePose/semanticManager params     │
│                                                                  │
│  ar-viewer.js                                                    │
│       │                                                          │
│       ├── ❌ Needs: Import and instantiate ARViewerIntegration │
│       │                                                          │
│       ├── ❌ Needs: Call integration.startStabilizing()       │
│       │                                                          │
│       └── ❌ Needs: Call integration.processFrame() per frame  │
│                                                                  │
│  ARContainerV2.tsx                                               │
│       │                                                          │
│       └── ❌ Needs: Handle new TARGET_STABLE message type       │
│                                                                  │
│  LearnARV2.tsx                                                   │
│       │                                                          │
│       ├── ❌ Needs: Track stability progress state             │
│       └── ❌ Needs: Show stability indicator UI                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Minimal Patch Plan

### 4.1 Option A: Full ES Module Integration (Recommended)

**File: `frontend-web/public/ar-viewer.html`**  
**Change: Add module script import (after line 147)**

```javascript
// Add this block after line 147 (after ar-viewer.js loads)
// Read feature flags
const FREEZE_POSE_ENABLED = params.get('freezePose') === 'true';
const SEMANTIC_MANAGER_ENABLED = params.get('semanticManager') === 'true';

if (FREEZE_POSE_ENABLED || SEMANTIC_MANAGER_ENABLED) {
    // Dynamically import the integration module
    import('/static/ar-assets/js/integration/ar-viewer-integration.js')
        .then(module => {
            window.__arIntegration = new module.ARViewerIntegration();
            window.__arIntegration.init({ /* options */ });
        })
        .catch(err => console.error('[AR-Viewer] Failed to load integration:', err));
}
```

**File: `frontend-web/public/static/ar-assets/js/ar-viewer.js`**  
**Change: Wire stability gate into targetFound handler (around line 859)**

```javascript
// In targetFound handler, after activeTargets.set():
if (window.__arIntegration && window.__arIntegration.isFeatureEnabled('freezePose')) {
    window.__arIntegration.startStabilizing(index);
}
```

### 4.2 Option B: Quick IIFE Wrapper (Faster to implement)

Convert the integration module to IIFE format and add a single script tag:

**File: `frontend-web/public/ar-viewer.html`**  
**Add after line 147:**

```html
<!-- Freeze Pose + Semantic Manager Integration -->
<script src="/static/ar-assets/js/integration/ar-viewer-integration.iife.js"></script>
```

**Note:** This requires creating `ar-viewer-integration.iife.js` as a bundled IIFE version.

---

## 5. `ar_combinations` vs `semantic_rules` Verdict

### 5.1 Schema Comparison

| Aspect | `ar_combinations` (Existing) | `semantic_rules` (New) |
|--------|----------------------------|-----------------------|
| Card identifier field | `required_tags: List[str]` | `cards: List[str]` |
| Visual output | `model_3d_url`, `texture_url` | `animation: str` |
| Audio output | ❌ None | `sound: Optional[str]` |
| Text output | ❌ None | `phrase: Optional[str]` |
| Priority system | ❌ None | `priority: int` |
| Flashcard set association | ❌ None | `flashcardSet: str` |
| Active/enabled flag | ❌ None | `active: bool` |
| Timestamps | ❌ None | `createdAt`, `updatedAt` |
| Layered Mind file | `combo_mind_url` | ❌ None |

### 5.2 Overlap Analysis

**Both collections serve CARD COMBINATIONS:**
- `ar_combinations` → defines what 3D model/visual appears for a combo
- `semantic_rules` → defines what animation/sound/phrase triggers for a combo

**They are complementary but not identical.** Key differences:
- `ar_combinations` is about **displaying a combo model**
- `semantic_rules` is about **triggering effects when combo forms**

### 5.3 Recommendation

**Decision: MERGE into `ar_combinations`, do NOT create new collection.**

**Rationale:**
1. `ar_combinations` already has production data and queries
2. New `semantic_rules` uses in-memory storage (line 13 of `semantic_rules.py`)
3. The `combo_mind_url` field in `ar_combinations` supports the layered Mind file feature
4. Creating two collections for similar data creates maintenance burden

**Migration Path:**

```javascript
// Add new fields to ar_combinations schema:
{
    // Existing fields...
    combo_id: string,
    required_tags: string[],
    model_3d_url: string,
    
    // New fields from semantic_rules:
    animation: string,           // Default: "combo_reveal"
    sound: string | null,         // Default: null
    phrase: string | null,        // Default: null
    priority: number,             // Default: 0
    active: boolean,              // Default: true
}
```

**Code change:** Modify `SemanticManager` to read from `ar_combinations` instead of `semantic_rules`.

---

## 6. Risk Assessment

### 6.1 Production Safety

| Risk | Level | Assessment |
|------|-------|------------|
| Break existing single-card flow | ✅ **SAFE** | No integration = no effect |
| Break existing multi-card flow | ✅ **SAFE** | No integration = no effect |
| Dead code in production | ⚠️ **MEDIUM** | File size increase, no runtime impact |
| API endpoints unused | ⚠️ **MEDIUM** | `semantic_rules.py` uses in-memory storage |

### 6.2 Hidden Dead Code Assessment

**The current state is PRODUCTION-SAFE but PRODUCTION-USELESS.**

- The new modules are **never executed** - zero runtime impact
- Adding URL params does **nothing** - users see no change
- The API endpoints return **empty results** (in-memory storage)

### 6.3 Technical Debt

| Item | Debt Level | Impact |
|------|-----------|--------|
| Unused ES modules | HIGH | Confusing for future developers |
| In-memory API storage | MEDIUM | Data lost on restart |
| No integration tests | MEDIUM | Can't verify features work |
| Duplicate schema concepts | LOW | Confusing but not broken |

---

## 7. Summary of Required Changes

### 7.1 Minimum Viable Integration (MVI)

To make the features actually work, these changes are **mandatory**:

| File | Change | Lines |
|------|--------|-------|
| `ar-viewer.html` | Add ES module import + feature flag reading | ~10 lines |
| `ar-viewer.js` | Wire integration into targetFound/targetLost | ~20 lines |
| `LearnARV2.tsx` | Handle TARGET_STABLE event | ~15 lines |

### 7.2 Recommended Additional Changes

| File | Change | Priority |
|------|--------|----------|
| `semantic_rules.py` | Replace in-memory with MongoDB `ar_combinations` | HIGH |
| `rule-loader.js` | Query `ar_combinations` collection | HIGH |
| Schema migration | Add animation/sound/phrase to `ar_combinations` | MEDIUM |

---

## 8. Conclusion

**The new stability and semantic manager modules are beautiful architecture that exists in isolation.** They will not work without integration work. The good news:

1. ✅ No existing functionality is broken
2. ✅ The modules are well-structured and testable
3. ✅ The API layer is ready (except for persistence)

**The bad news:**

1. ❌ Zero integration with existing viewer
2. ❌ Feature flags are never read
3. ❌ ES modules cannot be loaded by current `ar-viewer.html`
4. ❌ New `semantic_rules` collection duplicates `ar_combinations`

**Recommended Action:** Complete the integration work before claiming these features exist.

---

*Report generated by SDLC Orchestrator Wiring Audit*
