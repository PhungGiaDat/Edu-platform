# Implementation Plan: Freeze Pose + Semantic Manager

**Date:** July 21, 2026  
**Author:** Planner Subagent  
**Status:** Draft  
**Branch:** main  

---

## Overview

This plan implements two new features for the AR tracking system:

1. **Freeze Pose** - A 15-frame stability gate that delays model placement until tracking is stable, preventing jittery/flickering models
2. **Semantic Manager** - A rules engine that triggers combo animations based on detected card combinations

### Key Constraints
- **DO NOT REFACTOR** — Only add new functionality
- **DO NOT BREAK** existing single-flashcard flow
- Games/quizzes must keep working exactly as before
- Work on `main` branch

---

## 1. Feature Flag / Mode Detection

### Mode Detection Strategy

The system will detect multi-card mode using existing URL parameters:

```javascript
// Existing in ar-viewer.js:117-119
const maxTrack = Math.max(1, Math.min(Number(params.get('maxTrack')) || 1, 5));
const cardCount = Math.max(1, Math.min(Number(params.get('cardCount') || params.get('targetCount')) || 1, 5));
const targetCount = Math.max(1, Math.min(Number(params.get('targetCount') || cardCount, maxTrack, 5));
```

### New Feature Flag

Add a new URL parameter `?freezePose=true` to enable the stability gate:

```javascript
// ar-viewer.js - NEW
const freezePoseEnabled = params.get('freezePose') === 'true';
```

### Branch Logic

```javascript
// In targetFound handler (ar-viewer.js:859)
// NEW CODE - wraps existing logic
if (freezePoseEnabled) {
    // Use stability gate - delay model placement
    handleFreezePoseFound(index);
} else {
    // Original behavior - immediate model placement
    sendToParent('TARGET_FOUND', { targetIndex: index, confidence: 1.0 });
    // ... rest of existing code
}
```

---

## 2. Architecture

### Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LearnARV2.tsx (React)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     ARContainerV2.tsx                             │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │                   ar-viewer.html (iframe)                  │   │   │
│  │  │  ┌─────────────────────┐  ┌─────────────────────────┐  │   │   │
│  │  │  │   ar-stability-gate │  │   ar-semantic-manager  │  │   │   │
│  │  │  │   (15-frame gate)   │  │   (combo rules engine) │  │   │   │
│  │  │  └─────────────────────┘  └─────────────────────────┘  │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
MindAR detects target
       ↓
targetFound event fires
       ↓
[freezePoseEnabled ? Freeze Pose Gate : Immediate]
       ↓                    ↓
  Frame counter        sendToParent('TARGET_FOUND')
  (15 frames)                  ↓
       ↓              Parent receives immediately
  Target stable?                ↓
       ↓               Normal processing
    YES ↓ NO
       ↓
sendToParent('TARGET_STABLE')
       ↓
Parent checks semantic rules
       ↓
Trigger combo animation
```

---

## 3. New Files to Create

### 3.1 `frontend-web/public/static/ar-assets/js/ar-stability-gate.js`

**Purpose:** Frame counting and stability detection for Freeze Pose feature

```javascript
/**
 * ar-stability-gate.js - Freeze Pose Stability Gate
 * Implements 15-frame stability detection for AR tracking
 */
(function() {
    'use strict';

    // ============ CONFIGURATION ============
    const STABLE_FRAME_COUNT = 15;           // Frames to count before stable
    const STABILITY_CHECK_INTERVAL = 33;       // ~30fps check rate (ms)
    const POSE_SAMPLE_INTERVAL = 50;           // ms between pose samples

    // ============ STATE ============
    const frameCounters = new Map();           // targetIndex -> frame count
    const stabilityTimers = new Map();         // targetIndex -> interval ID
    const poseSnapshots = new Map();           // targetIndex -> position samples
    const frozenPoses = new Map();             // targetIndex -> {position, quaternion}
    const stableTargets = new Set();           // Set of stable target indices

    // ============ API FUNCTIONS ============

    /**
     * Start tracking a target for stability
     * @param {number} targetIndex - The target index to track
     * @param {Function} onStable - Callback when target becomes stable
     * @param {Function} getCurrentPose - Function to get current pose {position, quaternion}
     */
    function startStabilityTracking(targetIndex, onStable, getCurrentPose) {
        if (stabilityTimers.has(targetIndex)) {
            stopStabilityTracking(targetIndex);
        }

        frameCounters.set(targetIndex, 0);
        poseSnapshots.set(targetIndex, []);

        const timerId = setInterval(() => {
            const pose = getCurrentPose();
            if (!pose) {
                // Lost tracking - reset
                resetStability(targetIndex);
                return;
            }

            // Store pose sample
            const samples = poseSnapshots.get(targetIndex) || [];
            samples.push({
                position: pose.position.clone(),
                quaternion: pose.quaternion.clone(),
                timestamp: Date.now()
            });

            // Keep only last 15 samples for averaging
            if (samples.length > 15) {
                samples.shift();
            }
            poseSnapshots.set(targetIndex, samples);

            // Check stability
            const frames = checkStability(targetIndex, samples);
            frameCounters.set(targetIndex, frames);

            if (frames >= STABLE_FRAME_COUNT && !stableTargets.has(targetIndex)) {
                // Target is now stable - freeze pose
                const frozenPose = computeAveragePose(samples);
                frozenPoses.set(targetIndex, frozenPose);
                stableTargets.add(targetIndex);

                // Stop tracking - pose is frozen
                stopStabilityTracking(targetIndex);

                // Notify callback
                if (onStable) {
                    onStable(targetIndex, frozenPose);
                }
            }
        }, STABILITY_CHECK_INTERVAL);

        stabilityTimers.set(targetIndex, timerId);
    }

    /**
     * Check stability based on pose sample variance
     */
    function checkStability(targetIndex, samples) {
        if (samples.length < 3) return samples.length;

        // Check position variance
        const posVariance = computePositionVariance(samples);
        const rotVariance = computeRotationVariance(samples);

        // Thresholds for stability (tunable)
        const POS_THRESHOLD = 0.02;   // 2cm variance
        const ROT_THRESHOLD = 0.05;    // ~3 degrees variance

        const isPositionStable = posVariance < POS_THRESHOLD;
        const isRotationStable = rotVariance < ROT_THRESHOLD;

        return (isPositionStable && isRotationStable) ? samples.length : 0;
    }

    /**
     * Compute average position from samples
     */
    function computeAveragePose(samples) {
        const count = samples.length;
        if (count === 0) return null;

        let sumX = 0, sumY = 0, sumZ = 0;
        let sumQx = 0, sumQy = 0, sumQz = 0, sumQw = 0;

        for (const sample of samples) {
            sumX += sample.position.x;
            sumY += sample.position.y;
            sumZ += sample.position.z;
            sumQx += sample.quaternion.x;
            sumQy += sample.quaternion.y;
            sumQz += sample.quaternion.z;
            sumQw += sample.quaternion.w;
        }

        return {
            position: {
                x: sumX / count,
                y: sumY / count,
                z: sumZ / count
            },
            quaternion: {
                x: sumQx / count,
                y: sumQy / count,
                z: sumQz / count,
                w: sumQw / count
            }
        };
    }

    function computePositionVariance(samples) {
        if (samples.length < 2) return 0;

        const mean = { x: 0, y: 0, z: 0 };
        for (const s of samples) {
            mean.x += s.position.x;
            mean.y += s.position.y;
            mean.z += s.position.z;
        }
        mean.x /= samples.length;
        mean.y /= samples.length;
        mean.z /= samples.length;

        let variance = 0;
        for (const s of samples) {
            const dx = s.position.x - mean.x;
            const dy = s.position.y - mean.y;
            const dz = s.position.z - mean.z;
            variance += dx*dx + dy*dy + dz*dz;
        }
        return variance / samples.length;
    }

    function computeRotationVariance(samples) {
        if (samples.length < 2) return 0;

        // Use simple angle difference approximation
        let totalDiff = 0;
        for (let i = 1; i < samples.length; i++) {
            const q1 = samples[i-1].quaternion;
            const q2 = samples[i].quaternion;
            // Dot product for angle difference
            const dot = q1.x*q2.x + q1.y*q2.y + q1.z*q2.z + q1.w*q2.w;
            totalDiff += 2 * Math.acos(Math.min(1, Math.abs(dot)));
        }
        return totalDiff / (samples.length - 1);
    }

    /**
     * Stop tracking stability for a target
     */
    function stopStabilityTracking(targetIndex) {
        const timerId = stabilityTimers.get(targetIndex);
        if (timerId) {
            clearInterval(timerId);
            stabilityTimers.delete(targetIndex);
        }
        frameCounters.delete(targetIndex);
        poseSnapshots.delete(targetIndex);
    }

    /**
     * Reset stability tracking for a target
     */
    function resetStability(targetIndex) {
        stopStabilityTracking(targetIndex);
        stableTargets.delete(targetIndex);
        frozenPoses.delete(targetIndex);
    }

    /**
     * Get frozen pose for a target
     */
    function getFrozenPose(targetIndex) {
        return frozenPoses.get(targetIndex) || null;
    }

    /**
     * Check if target is stable
     */
    function isTargetStable(targetIndex) {
        return stableTargets.has(targetIndex);
    }

    /**
     * Check if target is being tracked for stability
     */
    function isTrackingStability(targetIndex) {
        return stabilityTimers.has(targetIndex);
    }

    /**
     * Get stability progress (0-1) for UI feedback
     */
    function getStabilityProgress(targetIndex) {
        const frames = frameCounters.get(targetIndex) || 0;
        return Math.min(1, frames / STABLE_FRAME_COUNT);
    }

    // ============ EXPORT ============
    window.ARStabilityGate = {
        startStabilityTracking,
        stopStabilityTracking,
        resetStability,
        getFrozenPose,
        isTargetStable,
        isTrackingStability,
        getStabilityProgress,
        STABLE_FRAME_COUNT,
        STABILITY_CHECK_INTERVAL,
        POSE_SAMPLE_INTERVAL
    };

})();
```

### 3.2 `frontend-web/public/static/ar-assets/js/ar-semantic-manager.js`

**Purpose:** Rule engine for combo animations based on detected card combinations

```javascript
/**
 * ar-semantic-manager.js - Semantic Manager for Combo Animations
 * Manages combo rules and triggers animations based on card combinations
 */
(function() {
    'use strict';

    // ============ TYPES ============
    /**
     * @typedef {Object} SemanticRule
     * @property {string} id - Unique rule identifier
     * @property {string[]} cards - Array of card identifiers (qrId or arTag patterns)
     * @property {string} result - Result action identifier
     * @property {string} animation - Animation clip name to trigger
     * @property {string} [sound] - Optional sound effect
     * @property {string} [phrase] - Optional phrase to speak
     * @property {number} [proximityThreshold] - Optional max distance between cards
     */

    // ============ DEFAULT RULES ============
    const DEFAULT_SEMANTIC_RULES = [
        // Animal combinations
        {
            id: 'cat_dog_play',
            cards: ['cat_01', 'dog_02'],
            result: 'pet_play',
            animation: 'playTogether',
            sound: '/sounds/animals/play.mp3',
            phrase: 'Look at them playing together!'
        },
        {
            id: 'cat_apple_eat',
            cards: ['cat_01', 'apple_03'],
            result: 'cat_eat_apple',
            animation: 'eat',
            sound: '/sounds/eating/crunch.mp3',
            phrase: 'The cat wants the apple!'
        },
        // Nature combinations
        {
            id: 'tree_bird_nest',
            cards: ['tree_01', 'bird_02'],
            result: 'bird_nest',
            animation: 'flyToNest',
            sound: '/sounds/birds/chirp.mp3',
            phrase: 'The bird found its nest!'
        },
        // Jungle combo (existing elephant + palm tree)
        {
            id: 'jungle_scene',
            cards: ['elephant_01', 'palm_tree_01'],
            result: 'jungle_scene',
            animation: 'celebrate',
            sound: '/sounds/celebration/tada.mp3',
            phrase: 'Amazing jungle scene!'
        }
    ];

    // ============ STATE ============
    let semanticRules = [...DEFAULT_SEMANTIC_RULES];
    let detectedCombos = new Map();            // comboId -> detection timestamp
    let activeCombo = null;                    // Currently active combo
    let comboCooldownTimers = new Map();       // comboId -> timeout ID

    // ============ CONFIGURATION ============
    const COMBO_COOLDOWN_MS = 5000;            // 5 seconds before same combo can trigger
    const PROXIMITY_DEFAULT = 0.5;             // Default proximity threshold

    // ============ API FUNCTIONS ============

    /**
     * Set custom semantic rules
     * @param {SemanticRule[]} rules - Array of semantic rules
     */
    function setRules(rules) {
        if (!Array.isArray(rules)) {
            console.warn('[AR-Semantic] Invalid rules format');
            return;
        }
        semanticRules = [...DEFAULT_SEMANTIC_RULES, ...rules];
        console.log('[AR-Semantic] Loaded', semanticRules.length, 'rules');
    }

    /**
     * Add a single rule
     * @param {SemanticRule} rule - Rule to add
     */
    function addRule(rule) {
        if (!rule.id || !rule.cards || !rule.animation) {
            console.warn('[AR-Semantic] Invalid rule format:', rule);
            return;
        }
        semanticRules.push(rule);
    }

    /**
     * Remove a rule by ID
     * @param {string} ruleId - Rule ID to remove
     */
    function removeRule(ruleId) {
        semanticRules = semanticRules.filter(r => r.id !== ruleId);
    }

    /**
     * Check detected targets against semantic rules
     * @param {string[]} targetIds - Array of detected target identifiers (qrId or arTag)
     * @param {Object[]} positions - Optional array of {targetId, position} for proximity
     * @returns {SemanticRule|null} - Matched rule or null
     */
    function checkCombinations(targetIds, positions = []) {
        if (!targetIds || targetIds.length < 2) {
            return null;
        }

        const sortedTargets = [...targetIds].sort();

        for (const rule of semanticRules) {
            if (rule.cards.length !== sortedTargets.length) {
                continue;
            }

            // Check if all rule cards are present in detected targets
            const ruleCardsSorted = [...rule.cards].sort();
            const allMatch = ruleCardsSorted.every((card, idx) => {
                // Support wildcard patterns
                if (card.includes('*')) {
                    const pattern = card.replace('*', '');
                    return sortedTargets[idx]?.includes(pattern);
                }
                return sortedTargets[idx] === card;
            });

            if (allMatch) {
                // Check proximity if specified
                if (rule.proximityThreshold && positions.length > 0) {
                    const distance = computeMinDistance(rule.cards, positions);
                    if (distance > rule.proximityThreshold) {
                        continue;
                    }
                }

                return rule;
            }
        }

        return null;
    }

    /**
     * Compute minimum distance between rule cards
     */
    function computeMinDistance(ruleCards, positions) {
        let minDistance = Infinity;

        for (let i = 0; i < ruleCards.length; i++) {
            for (let j = i + 1; j < ruleCards.length; j++) {
                const pos1 = positions.find(p => p.targetId === ruleCards[i]);
                const pos2 = positions.find(p => p.targetId === ruleCards[j]);
                if (pos1 && pos2) {
                    const dx = pos1.position.x - pos2.position.x;
                    const dy = pos1.position.y - pos2.position.y;
                    const dz = pos1.position.z - pos2.position.z;
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    minDistance = Math.min(minDistance, dist);
                }
            }
        }

        return minDistance;
    }

    /**
     * Trigger a combo animation
     * @param {SemanticRule} rule - Matched semantic rule
     * @param {Function} onTrigger - Callback to trigger the animation
     */
    function triggerCombo(rule, onTrigger) {
        const now = Date.now();
        const lastTrigger = detectedCombos.get(rule.id) || 0;

        // Check cooldown
        if (now - lastTrigger < COMBO_COOLDOWN_MS) {
            console.log('[AR-Semantic] Combo in cooldown:', rule.id);
            return false;
        }

        // Check if already active
        if (activeCombo && activeCombo.id === rule.id) {
            return false;
        }

        // Record detection
        detectedCombos.set(rule.id, now);
        activeCombo = rule;

        console.log('[AR-Semantic] Triggering combo:', rule.id, rule.result);

        // Execute callbacks
        if (onTrigger) {
            onTrigger({
                ruleId: rule.id,
                result: rule.result,
                animation: rule.animation,
                sound: rule.sound,
                phrase: rule.phrase,
                cards: rule.cards
            });
        }

        // Set cooldown timer
        const timerId = setTimeout(() => {
            if (activeCombo && activeCombo.id === rule.id) {
                activeCombo = null;
            }
            comboCooldownTimers.delete(rule.id);
        }, COMBO_COOLDOWN_MS);

        comboCooldownTimers.set(rule.id, timerId);

        return true;
    }

    /**
     * Get current active combo
     */
    function getActiveCombo() {
        return activeCombo;
    }

    /**
     * Clear active combo
     */
    function clearActiveCombo() {
        activeCombo = null;
    }

    /**
     * Get all loaded rules
     */
    function getRules() {
        return [...semanticRules];
    }

    /**
     * Reset semantic manager state
     */
    function reset() {
        detectedCombos.clear();
        activeCombo = null;
        comboCooldownTimers.forEach(timer => clearTimeout(timer));
        comboCooldownTimers.clear();
    }

    /**
     * Create semantic manager from card data (convenience function)
     * @param {Object[]} cards - Array of {id, word, category} card data
     * @returns {SemanticRule[]} - Generated rules
     */
    function generateRulesFromCards(cards) {
        const rules = [];

        // Generate pairwise rules for cards in same category
        const byCategory = {};
        for (const card of cards) {
            const category = card.category || 'default';
            if (!byCategory[category]) {
                byCategory[category] = [];
            }
            byCategory[category].push(card.id);
        }

        // Create rules for each category
        for (const [category, cardIds] of Object.entries(byCategory)) {
            if (cardIds.length >= 2) {
                for (let i = 0; i < cardIds.length; i++) {
                    for (let j = i + 1; j < cardIds.length; j++) {
                        rules.push({
                            id: `${cardIds[i]}_${cardIds[j]}`,
                            cards: [cardIds[i], cardIds[j]],
                            result: `${category}_combined`,
                            animation: 'celebrate',
                            phrase: `Combined ${cardIds[i]} and ${cardIds[j]}!`
                        });
                    }
                }
            }
        }

        return rules;
    }

    // ============ EXPORT ============
    window.ARSemanticManager = {
        setRules,
        addRule,
        removeRule,
        checkCombinations,
        triggerCombo,
        getActiveCombo,
        clearActiveCombo,
        getRules,
        reset,
        generateRulesFromCards,
        DEFAULT_SEMANTIC_RULES,
        COMBO_COOLDOWN_MS,
        PROXIMITY_DEFAULT
    };

})();
```

---

## 4. Modified Files

### 4.1 `frontend-web/public/ar-viewer.html`

**Changes:** Add script imports for new modules

**Location:** After line 20 (after other script imports)

```html
<!-- Freeze Pose Stability Gate -->
<script src="/static/ar-assets/js/ar-stability-gate.js"></script>

<!-- Semantic Manager for Combo Animations -->
<script src="/static/ar-assets/js/ar-semantic-manager.js"></script>
```

### 4.2 `frontend-web/public/static/ar-assets/js/ar-viewer.js`

**Changes:** Integrate stability gate into targetFound handler

#### 4.2.1 Add Configuration Variables (after line 39)

```javascript
// ============ FREEZE POSE SETTINGS ============
const FREEZE_POSE_ENABLED = params.get('freezePose') === 'true';
const USE_SEMANTIC_MANAGER = params.get('semanticManager') === 'true';
```

#### 4.2.2 Add Integration Functions (after line 910, before line 913)

```javascript
// ============ FREEZE POSE INTEGRATION ============

/**
 * Handle target found with stability gate
 */
function handleFreezePoseFound(targetIndex) {
    log('🎯', `🔒 TARGET ${targetIndex} detected - starting stability tracking`);

    // Initialize semantic manager if enabled
    if (USE_SEMANTIC_MANAGER && window.ARSemanticManager) {
        // Pass detected targets to semantic manager
        const detectedIds = Array.from(activeTargets.keys()).map(k => `target_${k}`);
        window.ARSemanticManager.checkCombinations(detectedIds);
    }

    // Start stability tracking
    if (window.ARStabilityGate) {
        const targetEl = document.getElementById(`target-${targetIndex}`);
        if (!targetEl) return;

        window.ARStabilityGate.startStabilityTracking(
            targetIndex,
            // onStable callback
            (stableIndex, frozenPose) => {
                log('🎯', `✅ TARGET ${stableIndex} STABLE - freezing pose`);

                // Send stable event to parent
                sendToParent('TARGET_STABLE', {
                    targetIndex: stableIndex,
                    frozenPose: frozenPose
                });

                // Continue with normal multi-target check
                checkMultiTarget();
            },
            // getCurrentPose function
            () => {
                const targetEl = document.getElementById(`target-${targetIndex}`);
                if (!targetEl) return null;

                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();

                // Get world position and rotation
                const worldPos = new THREE.Vector3();
                targetEl.object3D.getWorldPosition(worldPos);
                targetEl.object3D.getWorldQuaternion(quaternion);

                return {
                    position: worldPos,
                    quaternion: quaternion
                };
            }
        );

        // Send stability progress updates
        const progressInterval = setInterval(() => {
            if (window.ARStabilityGate && window.ARStabilityGate.isTargetStable(targetIndex)) {
                clearInterval(progressInterval);
                return;
            }
            const progress = window.ARStabilityGate.getStabilityProgress(targetIndex);
            sendToParent('TARGET_STABILITY_UPDATE', {
                targetIndex: targetIndex,
                frames: Math.round(progress * window.ARStabilityGate.STABLE_FRAME_COUNT),
                progress: progress
            });
        }, 100);
    }
}

/**
 * Handle target lost during stability tracking
 */
function handleFreezePoseLost(targetIndex) {
    if (window.ARStabilityGate) {
        window.ARStabilityGate.resetStability(targetIndex);
        log('🎯', `🔓 TARGET ${targetIndex} stability reset`);
    }
}
```

#### 4.2.3 Modify targetFound Handler (line 859-884)

Replace the entire `target.addEventListener('targetFound', ...)` block:

```javascript
target.addEventListener('targetFound', () => {
    log('🎯', `✨ TARGET ${index} FOUND! Image detected by MindAR`);
    log('🎯', `Target ${index} is now being tracked`);
    const lostTimer = targetLostTimers.get(index);
    if (lostTimer) {
        clearTimeout(lostTimer);
        targetLostTimers.delete(index);
    }
    activeTargets.set(index, {
        element: target,
        timestamp: Date.now()
    });

    // ============ FREEZE POSE LOGIC ============
    if (FREEZE_POSE_ENABLED && window.ARStabilityGate) {
        // Use stability gate - delay TARGET_FOUND until stable
        handleFreezePoseFound(index);
    } else {
        // Original behavior - immediate TARGET_FOUND
        sendToParent('TARGET_FOUND', {
            targetIndex: index,
            confidence: 1.0
        });
    }
    // ===========================================

    sendTrackingState(`target-${index}-found`);
    sendRenderSnapshot('TARGET_RENDER_STATE_FOUND', {
        targetIndex: index,
        content2dId: `mode-2d-${index}`,
        content3dId: `mode-3d-${index}`
    });

    // Note: checkMultiTarget() moved inside handleFreezePoseFound callback
    // when using freeze pose, so it's called after stability
});
```

#### 4.2.4 Modify targetLost Handler (line 886-910)

Add stability reset:

```javascript
target.addEventListener('targetLost', () => {
    log('👋', `Target ${index} lost - image no longer detected`);
    const existingTimer = targetLostTimers.get(index);
    if (existingTimer) clearTimeout(existingTimer);

    // ============ FREEZE POSE LOGIC ============
    if (FREEZE_POSE_ENABLED) {
        handleFreezePoseLost(index);
    }
    // ===========================================

    const timer = setTimeout(() => {
        // ... rest of existing code unchanged
    }, TARGET_LOST_GRACE_MS);

    targetLostTimers.set(index, timer);
});
```

### 4.3 `frontend-web/src/components/ar/ARContainerV2.tsx`

**Changes:** Add handlers for new postMessage events

#### 4.3.1 Add New Event Types to Message Handling (around line 358)

Add new case handlers in the `handleMessage` switch:

```typescript
case 'TARGET_STABLE': {
    const data = payload as ARMessagePayloadMap['TARGET_STABLE'];
    emitDebug('PARENT_TARGET_STABLE', {
        targetIndex: data.targetIndex,
        frozenPose: data.frozenPose,
        fromPiP,
        phase
    });
    cbFound?.(data.targetIndex);  // Trigger the onTargetFound callback
    eventBus.emit(AREvent.MARKER_FOUND, { markerId: `target-${data.targetIndex}`, target: data.frozenPose } as any);
    break;
}

case 'TARGET_STABILITY_UPDATE': {
    const data = payload as { targetIndex: number; frames: number; progress: number };
    emitDebug('PARENT_TARGET_STABILITY_UPDATE', {
        targetIndex: data.targetIndex,
        frames: data.frames,
        progress: data.progress,
        fromPiP
    });
    // Could emit a stability progress event for UI feedback
    eventBus.emit(AREvent.MARKER_FOUND, { 
        markerId: `target-stability-${data.targetIndex}`, 
        stabilityProgress: data.progress,
        stabilityFrames: data.frames
    } as any);
    break;
}
```

#### 4.3.2 Add Type Definition for New Events

Add to the `ARMessagePayloadMap` type (in `/src/core/types/ARMessages.ts`):

```typescript
export interface ARMessagePayloadMap {
    // ... existing types ...
    
    TARGET_STABLE: {
        targetIndex: number;
        frozenPose: {
            position: { x: number; y: number; z: number };
            quaternion: { x: number; y: number; z: number; w: number };
        };
    };
    
    TARGET_STABILITY_UPDATE: {
        targetIndex: number;
        frames: number;
        progress: number;
    };
}
```

### 4.4 `frontend-web/src/pages/LearnARV2.tsx`

**Changes:** Integrate semantic manager rules and stability progress UI

#### 4.4.1 Add Semantic Rules Configuration (around line 70)

Add a constant for default semantic rules:

```typescript
// ============ SEMANTIC RULES ============
const DEFAULT_SEMANTIC_RULES = [
    { id: 'cat_dog', cards: ['cat_01', 'dog_02'], result: 'pets_play', animation: 'playTogether' },
    { id: 'apple_cat', cards: ['apple_03', 'cat_01'], result: 'cat_eat', animation: 'eat' },
    { id: 'jungle', cards: ['elephant', 'palm'], result: 'jungle', animation: 'celebrate' }
];
```

#### 4.4.2 Add Stability Progress State (around line 560)

```typescript
// Add new state for stability progress
const [stabilityProgress, setStabilityProgress] = useState<Map<number, number>>(new Map());

// Add ref for semantic manager integration
const semanticManagerRef = useRef<{
    checkCombinations: (targets: string[]) => any;
    triggerCombo: (rule: any, onTrigger: (data: any) => void) => boolean;
} | null>(null);
```

#### 4.4.3 Add Stability Update Handler (around line 1147)

```typescript
const handleStabilityUpdate = useCallback((data: { targetIndex: number; frames: number; progress: number }) => {
    console.log('[LearnARV2] Stability update:', data);
    setStabilityProgress(prev => {
        const next = new Map(prev);
        next.set(data.targetIndex, data.progress);
        return next;
    });
}, []);
```

#### 4.4.4 Modify handleComboDetected (around line 1167)

Integrate semantic manager:

```typescript
const handleComboDetected = useCallback(async (targets: number[]) => {
    console.log('[LearnARV2] 🔗 AR Combo detected - targets:', targets);

    // Check semantic rules if manager is available
    if (semanticManagerRef.current && typeof semanticManagerRef.current.checkCombinations === 'function') {
        const targetIds = targets.map(t => `target_${t}`);
        const matchedRule = semanticManagerRef.current.checkCombinations(targetIds);

        if (matchedRule) {
            console.log('[LearnARV2] 🎯 Semantic match:', matchedRule.result);
            semanticManagerRef.current.triggerCombo(matchedRule, (comboData) => {
                // Trigger animation
                eventBus.emit('AR_COMMAND' as any, {
                    type: 'TRIGGER_ANIMATION',
                    payload: { clip: comboData.animation, loop: false }
                });
                // Speak phrase if available
                if (comboData.phrase) {
                    SpeechService.speak(comboData.phrase);
                }
            });
        }
    }

    // Existing combo logic
    setIsComboActive(true);
    trackComboDiscovered();
    if (hasCombo && activeCombo) {
        HapticService.levelUp();
        SoundEffectService.play('levelUp');
        eventBus.emit('AR_COMMAND' as any, {
            type: 'TRIGGER_ANIMATION',
            payload: { clip: 'celebrate', loop: false }
        });
    }
}, [trackComboDiscovered, hasCombo, activeCombo]);
```

#### 4.4.5 Add handleARMessage Updates (around line 1181)

Update the switch to handle new events:

```typescript
const handleARMessage = useCallback((event: MessageEvent) => {
    const data = event.data;
    if (!data || !data.type) return;
    const { type, payload } = data;
    switch (type) {
        // ... existing cases ...
        
        case 'TARGET_STABILITY_UPDATE':
            handleStabilityUpdate(payload);
            break;
            
        case 'TARGET_STABLE':
            // Clear stability progress when target becomes stable
            setStabilityProgress(prev => {
                const next = new Map(prev);
                next.delete(payload.targetIndex);
                return next;
            });
            handleTargetFound(payload.targetIndex);
            break;
    }
}, [handleStabilityUpdate, handleTargetFound, emitMobileDebug, appState, flashcardCount, handleProximityDetected, handleProximityEnded, handleProximityUpdate, handleComboDetected]);
```

---

## 5. Backwards Compatibility Strategy

### Single-Flashcard Mode (Unchanged)

| Component | Behavior |
|-----------|----------|
| `ar-viewer.js` | `FREEZE_POSE_ENABLED = false` by default, original `TARGET_FOUND` behavior |
| `ARContainerV2.tsx` | No changes to existing handlers |
| `LearnARV2.tsx` | Existing `handleTargetFound` unchanged |
| URL params | No new params required |

### Multi-Card Mode (Optional Enhancement)

| Component | Behavior |
|-----------|----------|
| `ar-viewer.js` | Only activates if `?freezePose=true` in URL |
| `ARContainerV2.tsx` | New events only fire when enabled |
| `LearnARV2.tsx` | `stabilityProgress` state only used when feature enabled |

### Feature Flag Guards

```javascript
// ar-viewer.js - All new code wrapped in checks
if (FREEZE_POSE_ENABLED) {
    // Freeze pose logic only runs when explicitly enabled
}

if (USE_SEMANTIC_MANAGER) {
    // Semantic manager only initializes when enabled
}
```

### No Changes to Existing Handlers

- `handleTargetFound` - EXACTLY same behavior when `freezePose=false`
- `handleComboDetected` - EXACTLY same behavior
- `handleAppModeChange` - UNCHANGED (quiz/game triggers)
- `ARControlPanel` - UNCHANGED

---

## 6. Testing Strategy

### 6.1 Single-Flashcard Regression Tests

**Test Case:** Verify single-flashcard mode works exactly as before

1. **Load page with single card:**
   ```
   http://localhost:3000/learn/ar?flashcardId=123
   ```

2. **Expected behavior (UNCHANGED):**
   - QR code scan → TARGET_FOUND fires immediately
   - 3D model appears instantly
   - Tap model → audio plays

3. **Verification checklist:**
   - [ ] TARGET_FOUND fires on first detection (no delay)
   - [ ] Model appears within 100ms of detection
   - [ ] Tap-to-speak works
   - [ ] Quiz button opens QuizOverlay
   - [ ] Game button opens GameSelector

### 6.2 Freeze Pose Multi-Card Tests

**Test Case:** Verify stability gate works with multi-card

1. **Load page with freeze pose enabled:**
   ```
   http://localhost:3000/learn/ar?flashcardId=123&maxTrack=2&freezePose=true
   ```

2. **Expected behavior:**
   - Scan first card → stability progress shown (0% → 100%)
   - After 15 stable frames (~500ms) → model appears
   - If card moves during stability → counter resets

3. **Verification checklist:**
   - [ ] Stability progress shows (0/15, 5/15, etc.)
   - [ ] Model only appears after 15 stable frames
   - [ ] Moving card resets stability counter
   - [ ] TARGET_STABLE event fires when stable
   - [ ] TARGET_LOST during stability → reset

### 6.3 Semantic Manager Tests

**Test Case:** Verify combo rules trigger correct animations

1. **Setup:**
   - Load page with two specific cards (e.g., cat_01, dog_02)
   - Enable semantic manager: `?semanticManager=true&freezePose=true`

2. **Expected behavior:**
   - Both cards stable → semantic manager checks rules
   - Matching rule found → specific animation triggers
   - Phrase spoken if configured

3. **Verification checklist:**
   - [ ] Rule matching works for exact card IDs
   - [ ] Wildcard patterns work (e.g., `cat_*`)
   - [ ] Animation triggers on combo
   - [ ] Sound plays if configured
   - [ ] Phrase speaks if configured
   - [ ] Cooldown prevents re-trigger

### 6.4 Manual Test Matrix

| Mode | freezePose | semanticManager | Test |
|------|------------|----------------|------|
| Single | false | false | Basic single card flow |
| Single | true | false | Single card with stability gate |
| Multi | false | false | Original multi-card behavior |
| Multi | true | false | Multi-card with stability only |
| Multi | true | true | Full freeze + semantic combo |

### 6.5 Performance Tests

1. **Stability gate overhead:**
   - Measure: 15 frames × 33ms = ~500ms additional latency
   - Acceptable: Additional latency within existing combo commit delays

2. **Semantic manager overhead:**
   - Measure: Rule matching O(n*m) where n=cards, m=rules
   - Acceptable: < 1ms for typical rule sets

---

## 7. Rollback Plan

### Minimal Changeset for Quick Rollback

**Files to revert if issues occur:**

| File | Lines Changed | Rollback Action |
|------|--------------|-----------------|
| `ar-viewer.html` | +2 lines | Remove `<script>` tags |
| `ar-viewer.js` | +50 lines | Remove freeze pose blocks |
| `ARContainerV2.tsx` | +30 lines | Remove new case handlers |
| `LearnARV2.tsx` | +40 lines | Remove stability/semantic code |
| `ARMessages.ts` | +20 lines | Remove new type definitions |

**Total rollback:** ~150 lines across 5 files

### Git Rollback Command

```bash
# Rollback specific files
git checkout HEAD -- \
  frontend-web/public/ar-viewer.html \
  frontend-web/public/static/ar-assets/js/ar-viewer.js \
  frontend-web/src/components/ar/ARContainerV2.tsx \
  frontend-web/src/pages/LearnARV2.tsx

# Or rollback entire commit
git revert <commit-hash>
```

### Feature Toggle Rollback (No Code Change)

Simply remove the feature flags from URLs:

```bash
# Before (with features)
?flashcardId=123&freezePose=true&semanticManager=true

# After (original behavior)
?flashcardId=123
```

---

## 8. Implementation Sequence

### Phase 1: Core Infrastructure (Day 1)

#### Task 1.1: Create ar-stability-gate.js
- **File:** `frontend-web/public/static/ar-assets/js/ar-stability-gate.js`
- **Est:** 2h
- **Priority:** High
- **Dependencies:** None
- **Deliverable:** Frame counting and pose averaging logic

#### Task 1.2: Create ar-semantic-manager.js
- **File:** `frontend-web/public/static/ar-assets/js/ar-semantic-manager.js`
- **Est:** 2h
- **Priority:** High
- **Dependencies:** None
- **Deliverable:** Rule engine for combo detection

#### Task 1.3: Add Type Definitions
- **File:** `frontend-web/src/core/types/ARMessages.ts`
- **Est:** 1h
- **Priority:** High
- **Dependencies:** Tasks 1.1, 1.2
- **Deliverable:** TypeScript types for new events

### Phase 2: Viewer Integration (Day 1-2)

#### Task 2.1: Integrate Stability Gate in ar-viewer.js
- **File:** `frontend-web/public/static/ar-assets/js/ar-viewer.js`
- **Est:** 3h
- **Priority:** Critical
- **Dependencies:** Task 1.1
- **Deliverable:** Freeze pose working in iframe

#### Task 2.2: Add Script Imports to ar-viewer.html
- **File:** `frontend-web/public/ar-viewer.html`
- **Est:** 15min
- **Priority:** Critical
- **Dependencies:** Tasks 1.1, 1.2
- **Deliverable:** Scripts loaded in iframe

### Phase 3: React Integration (Day 2-3)

#### Task 3.1: Add Event Handlers in ARContainerV2.tsx
- **File:** `frontend-web/src/components/ar/ARContainerV2.tsx`
- **Est:** 2h
- **Priority:** High
- **Dependencies:** Task 2.1
- **Deliverable:** New events handled in React

#### Task 3.2: Add Stability State in LearnARV2.tsx
- **File:** `frontend-web/src/pages/LearnARV2.tsx`
- **Est:** 2h
- **Priority:** High
- **Dependencies:** Task 3.1
- **Deliverable:** Stability progress tracking

#### Task 3.3: Integrate Semantic Manager in LearnARV2.tsx
- **File:** `frontend-web/src/pages/LearnARV2.tsx`
- **Est:** 2h
- **Priority:** Medium
- **Dependencies:** Task 1.2, Task 3.2
- **Deliverable:** Combo rules triggering animations

### Phase 4: Testing & Polish (Day 3-4)

#### Task 4.1: Single-Card Regression Testing
- **Est:** 1h
- **Priority:** Critical
- **Deliverable:** Confirmed single-card unchanged

#### Task 4.2: Multi-Card Freeze Pose Testing
- **Est:** 2h
- **Priority:** High
- **Deliverable:** Stability gate working

#### Task 4.3: Semantic Manager Testing
- **Est:** 2h
- **Priority:** Medium
- **Deliverable:** Combo rules working

#### Task 4.4: Performance Testing
- **Est:** 1h
- **Priority:** Medium
- **Deliverable:** No performance regression

### Timeline Summary

| Phase | Tasks | Estimated Time | Key Deliverable |
|-------|-------|----------------|-----------------|
| Phase 1 | 1.1-1.3 | 5h | Core modules created |
| Phase 2 | 2.1-2.2 | 4h | Viewer integration |
| Phase 3 | 3.1-3.3 | 6h | React integration |
| Phase 4 | 4.1-4.4 | 6h | Testing complete |
| **Total** | **11 tasks** | **~21h** | **Feature complete** |

---

## Appendix A: Exact Code Locations

### ar-viewer.js Injection Points

| Line | Purpose | Action |
|------|---------|--------|
| 39 | After `TARGET_LOST_GRACE_MS` | Add freeze pose config |
| 48 | After `params` declaration | Add FREEZE_POSE_ENABLED flag |
| 859-884 | targetFound event handler | Wrap with freeze pose check |
| 886-910 | targetLost event handler | Add stability reset |
| 913 | Before click handler | Add freeze pose functions |

### ARContainerV2.tsx Injection Points

| Line | Purpose | Action |
|------|---------|--------|
| 358 | After TARGET_FOUND case | Add TARGET_STABLE case |
| 365 | After TARGET_STABLE case | Add TARGET_STABILITY_UPDATE case |

### LearnARV2.tsx Injection Points

| Line | Purpose | Action |
|------|---------|--------|
| 70 | After API_BASE | Add DEFAULT_SEMANTIC_RULES |
| 560 | After lastTargetEventRef | Add stabilityProgress state |
| 1147 | handleTargetFound | Add stability update handler |
| 1167 | handleComboDetected | Integrate semantic manager |
| 1181 | handleARMessage switch | Add new event cases |

---

## Appendix B: URL Parameter Reference

| Parameter | Values | Default | Purpose |
|-----------|--------|---------|---------|
| `freezePose` | `true/false` | `false` | Enable stability gate |
| `semanticManager` | `true/false` | `false` | Enable semantic rules |
| `maxTrack` | `1-5` | `1` | Max simultaneous targets |
| `cardCount` | `1-5` | `1` | Total cards in session |
| `targetCount` | `1-5` | `1` | Alias for cardCount |

---

## Appendix C: Event Reference

### New Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `TARGET_STABLE` | iframe → parent | `{targetIndex, frozenPose}` | Target tracking stable |
| `TARGET_STABILITY_UPDATE` | iframe → parent | `{targetIndex, frames, progress}` | Stability progress |

### Modified Events

| Event | Change | Description |
|-------|--------|-------------|
| `TARGET_FOUND` | Now delayed | Only fires when freezePose=false OR after stability |

---

*Plan created by Planner Subagent*  
*Review status: Pending*
