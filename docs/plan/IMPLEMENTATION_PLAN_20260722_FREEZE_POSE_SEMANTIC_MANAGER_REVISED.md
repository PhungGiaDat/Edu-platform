# Revised Implementation Plan: Freeze Pose + Semantic Manager

**Date:** July 22, 2026
**Author:** Planner Subagent
**Status:** Draft
**Branch:** main
**Based on:** IMPLEMENTATION_PLAN_20260721_FREEZE_POSE_SEMANTIC_MANAGER.md

---

## Executive Summary

This revised plan addresses critical scalability issues identified in the initial implementation:

1. **Hardcoded semantic rules** → Schema-driven MongoDB configuration
2. **Inline math functions** → Modular `MathUtils` class
3. **Hardcoded thresholds** → Dynamic configuration from API
4. **Monolithic code** → SOLID-compliant modular structure

---

## 1. Key Constraints

- **DO NOT REFACTOR** — Only add new functionality
- **DO NOT BREAK** existing single-flashcard flow
- Games/quizzes must keep working exactly as before
- Work on `main` branch
- Backwards compatibility required

---

## 2. SOLID-Compliant Module Architecture

### 2.1 Directory Structure

```
frontend-web/public/static/ar-assets/js/
├── core/
│   ├── math-utils.js              # Pure math functions (SRP)
│   ├── math-utils.test.js
│   ├── pose-averager.js           # Averaging algorithms (SRP)
│   ├── pose-averager.test.js
│   ├── config-loader.js           # Load config from API (SRP)
│   └── config-loader.test.js
├── stability/
│   ├── stability-gate.js          # Frame counting only (SRP)
│   ├── stability-gate.test.js
│   ├── pose-stabilizer.js          # Orchestrates gate + averager (Facade)
│   └── stability-config.js         # Configuration schema (ISP)
├── semantic/
│   ├── semantic-manager.js         # Rule matching engine (SRP)
│   ├── semantic-manager.test.js
│   ├── combo-spawner.js            # Create combo objects (SRP)
│   ├── combo-spawner.test.js
│   ├── rule-loader.js              # Fetch rules from backend (SRP)
│   └── rule-schema.js              # TypeScript interfaces (ISP)
└── integration/
    └── ar-viewer-integration.js    # Wires everything together (Facade)
```

### 2.2 SOLID Principles Applied

| Principle | Application |
|-----------|-------------|
| **S**ingle Responsibility | Each module does one thing: `MathUtils` for math, `StabilityGate` for counting |
| **O**pen/Closed | New rule types extend without modifying existing code |
| **L**iskov Substitution | Config loaders are swappable (mock ↔ real) |
| **I**nterface Segregation | Small, focused interfaces (e.g., `StabilityConfig`, `SemanticRule`) |
| **D**ependency Inversion | High-level modules depend on abstractions (`IConfigLoader`, `IRuleLoader`) |

---

## 3. Core Module Specifications

### 3.1 Core/MathUtils

**File:** `frontend-web/public/static/ar-assets/js/core/math-utils.js`

```javascript
/**
 * MathUtils - Pure mathematical functions for AR pose calculations
 * No side effects, fully testable
 */
const MathUtils = {
    /**
     * Calculate Euclidean distance between two 3D points
     * @param {Object} a - {x, y, z}
     * @param {Object} b - {x, y, z}
     * @returns {number} Distance in meters
     */
    distance3D(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    /**
     * Calculate angular distance between two quaternions (0 to Pi)
     * @param {Object} q1 - {x, y, z, w} quaternion
     * @param {Object} q2 - {x, y, z, w} quaternion
     * @returns {number} Angle in radians (0 to Pi)
     */
    quaternionAngle(q1, q2) {
        const dot = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        return 2 * Math.acos(Math.min(1, Math.abs(dot)));
    },

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Clamp a value between min and max
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    },

    /**
     * Calculate variance of an array of numbers
     * @param {number[]} values
     * @returns {number} Variance
     */
    variance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    },

    /**
     * Calculate standard deviation
     * @param {number[]} values
     * @returns {number}
     */
    stdDev(values) {
        return Math.sqrt(this.variance(values));
    }
};

export { MathUtils };
```

### 3.2 Core/PoseAverager

**File:** `frontend-web/public/static/ar-assets/js/core/pose-averager.js`

```javascript
/**
 * PoseAverager - Algorithms for averaging pose samples
 * Uses running average with exponential weighting
 */
import { MathUtils } from './math-utils.js';

const PoseAverager = {
    /**
     * Average positions from multiple samples
     * @param {Array<{position: Object, quaternion: Object}>} samples
     * @returns {{position: Object, quaternion: Object}}
     */
    averageSamples(samples) {
        if (samples.length === 0) return null;
        if (samples.length === 1) return samples[0];

        // Average position (simple mean)
        const avgPos = {
            x: samples.reduce((s, s2) => s + s2.position.x, 0) / samples.length,
            y: samples.reduce((s, s2) => s + s2.position.y, 0) / samples.length,
            z: samples.reduce((s, s2) => s + s2.position.z, 0) / samples.length
        };

        // Average quaternion (using rotation matrix method)
        const avgQuat = this._averageQuaternions(samples.map(s => s.quaternion));

        return {
            position: avgPos,
            quaternion: avgQuat
        };
    },

    /**
     * Average quaternions using normalized weighted sum
     * @private
     */
    _averageQuaternions(quaternions) {
        // Build 4x4 matrix for quaternion averaging
        let qx = 0, qy = 0, qz = 0, qw = 0;
        
        for (const q of quaternions) {
            // Ensure shortest path (avoid 180° flips)
            let qx2 = q.x, qy2 = q.y, qz2 = q.z, qw2 = q.w;
            if (q.x * quaternions[0].x + q.y * quaternions[0].y + 
                q.z * quaternions[0].z + q.w * quaternions[0].w < 0) {
                qx2 = -q.x; qy2 = -q.y; qz2 = -q.z; qw2 = -q.w;
            }
            qx += qx2; qy += qy2; qz += qz2; qw += qw2;
        }

        // Normalize
        const len = Math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw);
        return { x: qx / len, y: qy / len, z: qz / len, w: qw / len };
    },

    /**
     * Check if recent samples are within threshold
     * @param {Array} samples
     * @param {number} positionThreshold - meters
     * @param {number} rotationThreshold - radians
     * @returns {boolean}
     */
    isStable(samples, positionThreshold, rotationThreshold) {
        if (samples.length < 3) return false;

        const avg = this.averageSamples(samples);
        if (!avg) return false;

        // Check each sample against average
        for (const sample of samples) {
            const posDist = MathUtils.distance3D(avg.position, sample.position);
            const rotDist = MathUtils.quaternionAngle(avg.quaternion, sample.quaternion);
            
            if (posDist > positionThreshold || rotDist > rotationThreshold) {
                return false;
            }
        }
        return true;
    }
};

export { PoseAverager };
```

### 3.3 Core/ConfigLoader

**File:** `frontend-web/public/static/ar-assets/js/core/config-loader.js`

```javascript
/**
 * ConfigLoader - Loads configuration from backend API
 * Implements dependency inversion with swappable loaders
 */

/**
 * @typedef {Object} StabilityConfig
 * @property {number} positionThreshold - Position variance threshold (meters)
 * @property {number} rotationThreshold - Rotation variance threshold (radians)
 * @property {number} requiredFrames - Number of stable frames required
 * @property {string} environment - Environment type (indoor/outdoor)
 */

const DEFAULT_CONFIG = {
    positionThreshold: 0.02,   // 2cm
    rotationThreshold: 0.1,     // ~6°
    requiredFrames: 15,
    environment: 'indoor'
};

/**
 * Interface for config loaders (Dependency Inversion)
 * @interface IConfigLoader
 */
class ConfigLoader {
    constructor() {
        this._cache = new Map();
        this._defaults = { ...DEFAULT_CONFIG };
    }

    /**
     * Load stability configuration
     * @param {Object} options - { environment }
     * @returns {Promise<StabilityConfig>}
     */
    async loadStabilityConfig(options = {}) {
        const cacheKey = `stability-${options.environment || 'default'}`;
        
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        try {
            const response = await fetch(`/api/v1/ar/stability-config?environment=${options.environment || 'indoor'}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const config = await response.json();
            this._cache.set(cacheKey, { ...this._defaults, ...config });
            return this._cache.get(cacheKey);
        } catch (error) {
            console.warn('[ConfigLoader] Failed to fetch config, using defaults:', error);
            return { ...this._defaults, environment: options.environment || 'indoor' };
        }
    }

    /**
     * Clear cached configuration
     */
    clearCache() {
        this._cache.clear();
    }
}

export { ConfigLoader, DEFAULT_CONFIG };
```

---

## 4. Stability System Specification

### 4.1 StabilityGate

**File:** `frontend-web/public/static/ar-assets/js/stability/stability-gate.js`

```javascript
/**
 * StabilityGate - Frame counting only (Single Responsibility)
 * Does NOT handle averaging or configuration
 */
import { MathUtils } from '../core/math-utils.js';

class StabilityGate {
    constructor() {
        /** @type {Map<number, {count: number, samples: Array}>} */
        this._tracking = new Map();
        this._stableTargets = new Set();
    }

    /**
     * Start tracking a target
     * @param {number} targetIndex
     */
    startTracking(targetIndex) {
        this._tracking.set(targetIndex, { count: 0, samples: [] });
    }

    /**
     * Add a pose sample for a target
     * @param {number} targetIndex
     * @param {{position: Object, quaternion: Object}} pose
     * @returns {boolean} - true if target is now stable
     */
    addSample(targetIndex, pose) {
        const tracking = this._tracking.get(targetIndex);
        if (!tracking) {
            console.warn(`[StabilityGate] Target ${targetIndex} not being tracked`);
            return false;
        }

        tracking.samples.push(pose);

        // Keep only last N samples
        const MAX_SAMPLES = 20;
        if (tracking.samples.length > MAX_SAMPLES) {
            tracking.samples.shift();
        }

        // Check stability after minimum samples
        if (tracking.samples.length >= 3) {
            const avg = this._computeAverage(tracking.samples);
            if (this._isWithinThreshold(tracking.samples, avg, 0.02, 0.1)) {
                tracking.count++;
            } else {
                // Reset counter on instability
                tracking.count = 0;
            }
        }

        // Check if stable
        if (tracking.count >= 15 && !this._stableTargets.has(targetIndex)) {
            this._stableTargets.add(targetIndex);
            return true;
        }

        return false;
    }

    /**
     * Check if target is already stable
     * @param {number} targetIndex
     * @returns {boolean}
     */
    isStable(targetIndex) {
        return this._stableTargets.has(targetIndex);
    }

    /**
     * Stop tracking a target
     * @param {number} targetIndex
     */
    stopTracking(targetIndex) {
        this._tracking.delete(targetIndex);
    }

    /**
     * Reset a target (clear stable status)
     * @param {number} targetIndex
     */
    reset(targetIndex) {
        this._stableTargets.delete(targetIndex);
        const tracking = this._tracking.get(targetIndex);
        if (tracking) {
            tracking.count = 0;
            tracking.samples = [];
        }
    }

    /**
     * Get current frame count for a target
     * @param {number} targetIndex
     * @returns {number}
     */
    getFrameCount(targetIndex) {
        return this._tracking.get(targetIndex)?.count || 0;
    }

    /** @private */
    _computeAverage(samples) {
        const n = samples.length;
        return {
            position: {
                x: samples.reduce((s, p) => s + p.position.x, 0) / n,
                y: samples.reduce((s, p) => s + p.position.y, 0) / n,
                z: samples.reduce((s, p) => s + p.position.z, 0) / n
            },
            quaternion: samples[samples.length - 1].quaternion // Use last for simplicity
        };
    }

    /** @private */
    _isWithinThreshold(samples, avg, posThresh, rotThresh) {
        for (const sample of samples) {
            const posDist = MathUtils.distance3D(avg.position, sample.position);
            if (posDist > posThresh) return false;
        }
        return true;
    }
}

export { StabilityGate };
```

### 4.2 PoseStabilizer

**File:** `frontend-web/public/static/ar-assets/js/stability/pose-stabilizer.js`

```javascript
/**
 * PoseStabilizer - Facade that orchestrates gate + averager
 * Entry point for stability system
 */
import { StabilityGate } from './stability-gate.js';
import { PoseAverager } from '../core/pose-averager.js';
import { ConfigLoader } from '../core/config-loader.js';

/**
 * @typedef {Object} StabilizerOptions
 * @property {string} [environment] - indoor/outdoor
 * @property {Function} onStable - Callback(targetIndex, frozenPose)
 * @property {Function} onUnstable - Callback(targetIndex)
 */

class PoseStabilizer {
    constructor(options = {}) {
        this._gate = new StabilityGate();
        this._averager = new PoseAverager();
        this._configLoader = new ConfigLoader();
        this._config = null;
        this._options = options;
        this._poseGetters = new Map(); // targetIndex -> () => pose
    }

    /**
     * Initialize with configuration
     */
    async init() {
        this._config = await this._configLoader.loadStabilityConfig({
            environment: this._options.environment
        });
        console.log('[PoseStabilizer] Config loaded:', this._config);
    }

    /**
     * Start stabilizing a target
     * @param {number} targetIndex
     * @param {Function} getPose - Returns current pose {position, quaternion}
     */
    start(targetIndex, getPose) {
        this._poseGetters.set(targetIndex, getPose);
        this._gate.startTracking(targetIndex);
    }

    /**
     * Process current frame - call this on each render/update
     * @param {number} targetIndex
     * @returns {Object|null} - Frozen pose if stable, null otherwise
     */
    processFrame(targetIndex) {
        const getPose = this._poseGetters.get(targetIndex);
        if (!getPose) return null;

        const pose = getPose();
        if (!pose) {
            // Lost tracking
            this._gate.reset(targetIndex);
            this._options.onUnstable?.(targetIndex);
            return null;
        }

        const isStable = this._gate.addSample(targetIndex, pose);
        
        if (isStable) {
            // Freeze pose
            const tracking = this._gate._tracking?.get(targetIndex);
            const frozenPose = tracking 
                ? this._averager.averageSamples(tracking.samples)
                : pose;
            
            this._options.onStable?.(targetIndex, frozenPose);
            return frozenPose;
        }

        return null;
    }

    /**
     * Check if target is already stable
     * @param {number} targetIndex
     */
    isStable(targetIndex) {
        return this._gate.isStable(targetIndex);
    }

    /**
     * Stop stabilizing a target
     * @param {number} targetIndex
     */
    stop(targetIndex) {
        this._gate.stopTracking(targetIndex);
        this._poseGetters.delete(targetIndex);
    }
}

export { PoseStabilizer };
```

---

## 5. Semantic System Specification

### 5.1 Rule Schema

**File:** `frontend-web/public/static/ar-assets/js/semantic/rule-schema.js`

```javascript
/**
 * TypeScript-style interfaces for Semantic Rules
 * These match the MongoDB schema
 */

/**
 * @typedef {Object} SemanticRule
 * @property {string} id - Unique rule identifier
 * @property {string[]} cards - Array of qrIds (card identifiers)
 * @property {string} result - Result type (e.g., 'combo_jungle', 'spawn_coin')
 * @property {string} animation - Animation to play (e.g., 'particle_burst', 'model_swap')
 * @property {string} [sound] - Sound effect URL
 * @property {string} [phrase] - Text/phrase to display
 * @property {number} [priority] - Higher = evaluated first (default: 0)
 * @property {boolean} [active] - Whether rule is enabled (default: true)
 * @property {string} flashcardSet - Associated flashcard set
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} ComboResult
 * @property {string} ruleId - The matched rule ID
 * @property {string[]} cardIds - The detected cards
 * @property {string} animation - Animation to trigger
 * @property {string} [sound] - Sound to play
 * @property {string} [phrase] - Text to display
 */

/**
 * @typedef {Object} RuleLoaderOptions
 * @property {string} baseUrl - API base URL
 * @property {number} timeout - Request timeout (ms)
 */

export { SemanticRule, ComboResult, RuleLoaderOptions };
```

### 5.2 RuleLoader

**File:** `frontend-web/public/static/ar-assets/js/semantic/rule-loader.js`

```javascript
/**
 * RuleLoader - Fetches semantic rules from backend API
 * Implements IRuleLoader interface
 */
import { SemanticRule } from './rule-schema.js';

/**
 * @interface IRuleLoader
 * @method loadRules(flashcardSet: string): Promise<SemanticRule[]>
 * @method reloadRules(): Promise<void>
 */

class RuleLoader {
    /**
     * @param {RuleLoaderOptions} options
     */
    constructor(options = {}) {
        this._baseUrl = options.baseUrl || '/api/v1/ar';
        this._timeout = options.timeout || 5000;
        this._cache = new Map();
        this._currentSet = null;
    }

    /**
     * Load rules for a flashcard set
     * @param {string} flashcardSet
     * @returns {Promise<SemanticRule[]>}
     */
    async loadRules(flashcardSet) {
        if (this._cache.has(flashcardSet)) {
            return this._cache.get(flashcardSet);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._timeout);

        try {
            const response = await fetch(
                `${this._baseUrl}/semantic-rules?flashcardSet=${encodeURIComponent(flashcardSet)}`,
                { signal: controller.signal }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const rules = await response.json();
            
            // Normalize rules
            const normalized = rules.map(rule => ({
                ...rule,
                active: rule.active !== false, // Default to true
                priority: rule.priority || 0,
                cards: Array.isArray(rule.cards) ? rule.cards : []
            }));

            this._cache.set(flashcardSet, normalized);
            this._currentSet = flashcardSet;
            
            console.log(`[RuleLoader] Loaded ${normalized.length} rules for "${flashcardSet}"`);
            return normalized;

        } catch (error) {
            console.error('[RuleLoader] Failed to load rules:', error);
            return [];
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Reload rules for current flashcard set
     */
    async reloadRules() {
        if (this._currentSet) {
            this._cache.delete(this._currentSet);
            return this.loadRules(this._currentSet);
        }
        return [];
    }

    /**
     * Get cached rules without fetching
     * @param {string} flashcardSet
     */
    getCachedRules(flashcardSet) {
        return this._cache.get(flashcardSet) || null;
    }

    /**
     * Clear all cached rules
     */
    clearCache() {
        this._cache.clear();
    }
}

export { RuleLoader };
```

### 5.3 SemanticManager

**File:** `frontend-web/public/static/ar-assets/js/semantic/semantic-manager.js`

```javascript
/**
 * SemanticManager - Rule matching engine
 * Detects card combinations and triggers combo effects
 */
import { RuleLoader } from './rule-loader.js';
import { ComboSpawner } from './combo-spawner.js';

/**
 * @typedef {Object} DetectedCard
 * @property {string} qrId - Card identifier
 * @property {number} targetIndex - AR target index
 * @property {Object} pose - Current pose
 */

/**
 * @typedef {Object} SemanticManagerOptions
 * @property {string} flashcardSet - Current flashcard set ID
 * @property {HTMLElement} scene - A-Frame scene element
 * @property {Function} onComboTriggered - Callback(comboResult)
 */

class SemanticManager {
    constructor(options = {}) {
        this._options = options;
        this._ruleLoader = new RuleLoader();
        this._comboSpawner = new ComboSpawner({ scene: options.scene });
        this._rules = [];
        this._detectedCards = new Map(); // qrId -> DetectedCard
        this._activeCombos = new Set(); // Track active combo ruleIds
        this._initialized = false;
    }

    /**
     * Initialize and load rules
     */
    async init() {
        if (!this._options.flashcardSet) {
            console.warn('[SemanticManager] No flashcardSet provided, semantic features disabled');
            return;
        }

        this._rules = await this._ruleLoader.loadRules(this._options.flashcardSet);
        this._initialized = true;
        console.log(`[SemanticManager] Initialized with ${this._rules.length} rules`);
    }

    /**
     * Register a detected card
     * @param {string} qrId
     * @param {number} targetIndex
     * @param {Object} pose
     */
    registerCard(qrId, targetIndex, pose) {
        this._detectedCards.set(qrId, { qrId, targetIndex, pose });
        this._checkCombos();
    }

    /**
     * Unregister a card (lost tracking)
     * @param {string} qrId
     */
    unregisterCard(qrId) {
        this._detectedCards.delete(qrId);
    }

    /**
     * Update card pose
     * @param {string} qrId
     * @param {Object} pose
     */
    updateCardPose(qrId, pose) {
        const card = this._detectedCards.get(qrId);
        if (card) {
            card.pose = pose;
            this._checkCombos();
        }
    }

    /**
     * Check if any combo rules match current detected cards
     * @private
     */
    _checkCombos() {
        if (!this._initialized || this._rules.length === 0) return;

        // Sort rules by priority (highest first)
        const sortedRules = [...this._rules]
            .filter(r => r.active)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const rule of sortedRules) {
            if (this._activeCombos.has(rule.id)) continue; // Already triggered

            const match = this._matchRule(rule);
            if (match) {
                this._triggerCombo(rule, match);
                break; // Only trigger one combo at a time
            }
        }
    }

    /**
     * Check if a rule matches current cards
     * @private
     */
    _matchRule(rule) {
        // Rule requires all cards to be present
        const missingCards = rule.cards.filter(cardId => !this._detectedCards.has(cardId));
        return missingCards.length === 0 ? rule.cards.map(id => this._detectedCards.get(id)) : null;
    }

    /**
     * Trigger a combo
     * @private
     */
    _triggerCombo(rule, matchedCards) {
        this._activeCombos.add(rule.id);
        
        const comboResult = {
            ruleId: rule.id,
            cardIds: rule.cards,
            animation: rule.animation,
            sound: rule.sound,
            phrase: rule.phrase,
            position: this._calculateComboPosition(matchedCards)
        };

        // Spawn combo effect
        this._comboSpawner.spawnCombo(comboResult);

        // Play sound if specified
        if (rule.sound) {
            this._playSound(rule.sound);
        }

        // Log for analytics
        this._logComboTriggered(comboResult);

        // Callback
        this._options.onComboTriggered?.(comboResult);

        console.log(`[SemanticManager] Combo triggered: ${rule.id}`, comboResult);
    }

    /**
     * Calculate center position for combo effect
     * @private
     */
    _calculateComboPosition(cards) {
        if (cards.length === 0) return { x: 0, y: 0, z: -1 };
        
        const sum = cards.reduce((acc, card) => ({
            x: acc.x + (card.pose?.position?.x || 0),
            y: acc.y + (card.pose?.position?.y || 0),
            z: acc.z + (card.pose?.position?.z || 0)
        }), { x: 0, y: 0, z: 0 });

        return {
            x: sum.x / cards.length,
            y: sum.y / cards.length,
            z: sum.z / cards.length
        };
    }

    /**
     * Play sound effect
     * @private
     */
    _playSound(url) {
        const audio = new Audio(url);
        audio.play().catch(e => console.warn('[SemanticManager] Sound play failed:', e));
    }

    /**
     * Log combo trigger for analytics
     * @private
     */
    async _logComboTriggered(comboResult) {
        try {
            await fetch('/api/v1/ar/combo-triggered', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ruleId: comboResult.ruleId,
                    cardIds: comboResult.cardIds,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.warn('[SemanticManager] Analytics log failed:', error);
        }
    }

    /**
     * Clear active combo (allow re-triggering)
     * @param {string} ruleId
     */
    clearCombo(ruleId) {
        this._activeCombos.delete(ruleId);
    }

    /**
     * Clear all active combos
     */
    clearAllCombos() {
        this._activeCombos.clear();
    }
}

export { SemanticManager };
```

### 5.4 ComboSpawner

**File:** `frontend-web/public/static/ar-assets/js/semantic/combo-spawner.js`

```javascript
/**
 * ComboSpawner - Creates combo visual effects
 * Uses existing ComboEffects module
 */
import { ComboResult } from './rule-schema.js';

class ComboSpawner {
    /**
     * @param {{scene: HTMLElement}} options
     */
    constructor(options = {}) {
        this._scene = options.scene || document.querySelector('a-scene');
        this._activeEffects = new Map();
    }

    /**
     * Spawn a combo effect
     * @param {ComboResult} comboResult
     * @returns {HTMLElement} The spawned effect entity
     */
    spawnCombo(comboResult) {
        if (!this._scene) {
            console.warn('[ComboSpawner] No scene available');
            return null;
        }

        // Clean up existing effect for this rule
        this.clearCombo(comboResult.ruleId);

        const position = comboResult.position || { x: 0, y: 0, z: -1 };
        
        // Create effect entity
        const entity = document.createElement('a-entity');
        entity.id = `combo-${comboResult.ruleId}-${Date.now()}`;
        entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        
        // Apply animation based on type
        this._applyAnimation(entity, comboResult.animation);

        // Apply phrase if specified
        if (comboResult.phrase) {
            this._applyPhrase(entity, comboResult.phrase);
        }

        this._scene.appendChild(entity);
        this._activeEffects.set(comboResult.ruleId, entity);

        // Auto-remove after animation
        setTimeout(() => this.clearCombo(comboResult.ruleId), 3000);

        return entity;
    }

    /**
     * Apply animation based on type
     * @private
     */
    _applyAnimation(entity, animationType) {
        switch (animationType) {
            case 'particle_burst':
                entity.setAttribute('combo-particles', '');
                break;
            case 'glow_ring':
                entity.setAttribute('combo-glow', '');
                break;
            case 'full_effect':
                entity.setAttribute('combo-effect', '');
                break;
            case 'model_swap':
                // Handle model swap separately
                break;
            default:
                entity.setAttribute('combo-effect', '');
        }
    }

    /**
     * Apply floating phrase text
     * @private
     */
    _applyPhrase(entity, phrase) {
        const text = document.createElement('a-text');
        text.setAttribute('value', phrase);
        text.setAttribute('align', 'center');
        text.setAttribute('color', '#FFD700');
        text.setAttribute('scale', '0.15 0.15 0.15');
        text.setAttribute('position', '0 0.3 0');
        text.setAttribute('animation', {
            property: 'position',
            to: '0 0.5 0',
            dur: 2000,
            easing: 'easeOutQuad'
        });
        entity.appendChild(text);
    }

    /**
     * Clear a specific combo effect
     * @param {string} ruleId
     */
    clearCombo(ruleId) {
        const entity = this._activeEffects.get(ruleId);
        if (entity && entity.parentNode) {
            entity.parentNode.removeChild(entity);
        }
        this._activeEffects.delete(ruleId);
    }

    /**
     * Clear all active combo effects
     */
    clearAll() {
        for (const [ruleId] of this._activeEffects) {
            this.clearCombo(ruleId);
        }
    }
}

export { ComboSpawner };
```

---

## 6. Backend API Specification

### 6.1 MongoDB Schema

**Collection:** `semantic_rules`

```javascript
{
    _id: ObjectId,
    id: String,           // "rule_jungle_animals"
    cards: [String],      // ["palm_qr", "elephant_qr"]
    result: String,       // "combo_jungle"
    animation: String,   // "particle_burst"
    sound: String,        // Optional: "/sounds/jungle.mp3"
    phrase: String,       // Optional: "🌴 + 🐘 = Jungle!"
    priority: Number,     // Default: 0, higher = checked first
    active: Boolean,       // Default: true
    flashcardSet: String, // "animals", "fruits", etc.
    createdAt: Date,
    updatedAt: Date
}
```

**Collection:** `stability_configs`

```javascript
{
    _id: ObjectId,
    environment: String,     // "indoor", "outdoor"
    positionThreshold: Number, // meters (default: 0.02)
    rotationThreshold: Number, // radians (default: 0.1)
    requiredFrames: Number,    // frame count (default: 15)
    cardOverrides: [{
        qrId: String,
        positionThreshold: Number,
        rotationThreshold: Number,
        requiredFrames: Number
    }],
    createdAt: Date,
    updatedAt: Date
}
```

### 6.2 API Endpoints

#### GET /api/v1/ar/semantic-rules

**Query Parameters:**
- `flashcardSet` (required): The flashcard set identifier

**Response (200):**
```json
{
    "success": true,
    "data": [
        {
            "id": "rule_jungle_animals",
            "cards": ["palm_qr", "elephant_qr"],
            "result": "combo_jungle",
            "animation": "particle_burst",
            "sound": "/sounds/jungle.mp3",
            "phrase": "🌴 + 🐘 = Jungle!",
            "priority": 10,
            "active": true,
            "flashcardSet": "animals"
        }
    ],
    "meta": {
        "count": 1,
        "flashcardSet": "animals"
    }
}
```

**Response (400):**
```json
{
    "success": false,
    "error": {
        "code": "MISSING_PARAMETER",
        "message": "flashcardSet query parameter is required"
    }
}
```

#### GET /api/v1/ar/stability-config

**Query Parameters:**
- `environment` (optional): "indoor" or "outdoor" (default: "indoor")

**Response (200):**
```json
{
    "success": true,
    "data": {
        "environment": "indoor",
        "positionThreshold": 0.02,
        "rotationThreshold": 0.1,
        "requiredFrames": 15
    }
}
```

#### POST /api/v1/ar/combo-triggered

**Request Body:**
```json
{
    "ruleId": "rule_jungle_animals",
    "cardIds": ["palm_qr", "elephant_qr"],
    "timestamp": "2026-07-22T10:00:00.000Z"
}
```

**Response (200):**
```json
{
    "success": true,
    "data": {
        "logged": true
    }
}
```

---

## 7. User Stories with Acceptance Criteria

### Epic 1: Stability System

#### User Story 1.1: Testable Math Functions
**As an AR developer, I want pose calculations extracted into testable functions, so I can debug tracking issues easily.**

- **Tasks:**
  - Create `core/math-utils.js` with pure functions
  - Create `core/math-utils.test.js` with comprehensive tests
  - Cover: distance3D, quaternionAngle, lerp, clamp, variance, stdDev

- **Acceptance Criteria:**
  - [ ] All math operations have unit tests
  - [ ] No inline calculations in StabilityGate or PoseAverager
  - [ ] Tests run with `npm test` without errors

- **Files:**
  - `frontend-web/public/static/ar-assets/js/core/math-utils.js`
  - `frontend-web/public/static/ar-assets/js/core/math-utils.test.js`

---

#### User Story 1.2: Dynamic Configuration
**As an AR developer, I want stability thresholds loaded from config, so I can tune them without code changes.**

- **Tasks:**
  - Create `core/config-loader.js` with fetch capability
  - Create MongoDB `stability_configs` collection
  - Create API endpoint `GET /api/v1/ar/stability-config`
  - Add URL param fallback: `?positionThreshold=0.02`

- **Acceptance Criteria:**
  - [ ] Config loaded from API on init
  - [ ] Falls back to defaults if API unavailable
  - [ ] URL params override API config (if provided)
  - [ ] Console logs loaded config values

- **Files:**
  - `frontend-web/.../js/core/config-loader.js`
  - Backend: `routes/ar/stability-config.js`
  - Backend: `models/StabilityConfig.js`

---

#### User Story 1.3: Stable Model Placement
**As a user, I want objects placed accurately, so they don't jump or shake.**

- **Tasks:**
  - Create `stability/stability-gate.js` (frame counting only)
  - Create `stability/pose-stabilizer.js` (orchestrator)
  - Integrate with ar-viewer.js behind `?freezePose=true` flag

- **Acceptance Criteria:**
  - [ ] Objects placed only after 15 stable frames
  - [ ] No model placement without stability gate (existing behavior)
  - [ ] Visual indicator during stabilization (optional)
  - [ ] Works with single-card mode (backwards compatible)

- **Files:**
  - `frontend-web/.../js/stability/stability-gate.js`
  - `frontend-web/.../js/stability/pose-stabilizer.js`

---

### Epic 2: Semantic System

#### User Story 2.1: Database-Driven Rules
**As a content creator, I want combo rules stored in database, so I can add new combos without code deployment.**

- **Tasks:**
  - Create MongoDB `semantic_rules` collection
  - Create API endpoint `GET /api/v1/ar/semantic-rules`
  - Create `semantic/rule-loader.js` frontend module

- **Acceptance Criteria:**
  - [ ] Rules fetched from `/api/v1/ar/semantic-rules?flashcardSet=<id>`
  - [ ] Frontend caches rules per flashcardSet
  - [ ] Handles API errors gracefully (returns empty array)
  - [ ] Logs number of loaded rules

- **Files:**
  - Backend: `routes/ar/semantic-rules.js`
  - Backend: `models/SemanticRule.js`
  - `frontend-web/.../js/semantic/rule-loader.js`

---

#### User Story 2.2: Combo Animations
**As a user, I want special animations when I scan related cards, so learning is more engaging.**

- **Tasks:**
  - Create `semantic/semantic-manager.js` (rule matching)
  - Create `semantic/combo-spawner.js` (effect creation)
  - Integrate with ar-viewer.js behind `?semanticManager=true` flag

- **Acceptance Criteria:**
  - [ ] Matches 2+ card combinations from rules
  - [ ] Spawns combo effects at card midpoint
  - [ ] Plays sound effects when specified
  - [ ] Logs combo triggers to analytics endpoint

- **Files:**
  - `frontend-web/.../js/semantic/semantic-manager.js`
  - `frontend-web/.../js/semantic/combo-spawner.js`

---

### Epic 3: Integration

#### User Story 3.1: Opt-in Features
**As a developer, I want new features opt-in via URL params, so existing users aren't affected.**

- **Tasks:**
  - Create `integration/ar-viewer-integration.js`
  - Add `?freezePose=true` parameter handling
  - Add `?semanticManager=true` parameter handling
  - Wrap all new code in feature flag checks

- **Acceptance Criteria:**
  - [ ] Default behavior unchanged (no URL params)
  - [ ] `?freezePose=true` enables stability gate
  - [ ] `?semanticManager=true` enables semantic features
  - [ ] Both can be enabled independently
  - [ ] Console logs enabled features

- **Files:**
  - `frontend-web/.../js/integration/ar-viewer-integration.js`

---

## 8. Agent Task Assignments

| Agent | Tasks | Priority |
|-------|-------|----------|
| **AR Specialist** | MathUtils, PoseAverager, StabilityGate, PoseStabilizer | High |
| **Backend Specialist** | MongoDB schemas, API endpoints, ConfigLoader | High |
| **Frontend Specialist** | SemanticManager, RuleLoader, ComboSpawner, Integration | High |
| **QA Specialist** | Unit tests, integration tests, verification matrix | Medium |

---

## 9. Implementation Sequence

### Phase 1: Core Infrastructure (Day 1)
```
1.1 Create directory structure
1.2 Implement MathUtils + tests
1.3 Implement PoseAverager + tests
1.4 Implement ConfigLoader + tests
```

### Phase 2: Stability System (Day 2)
```
2.1 Implement StabilityGate + tests
2.2 Implement PoseStabilizer
2.3 Create backend stability-config API
2.4 Integration testing
```

### Phase 3: Semantic System (Day 3)
```
3.1 Create MongoDB semantic_rules schema
3.2 Create backend semantic-rules API
3.3 Implement RuleLoader
3.4 Implement SemanticManager
3.5 Implement ComboSpawner
```

### Phase 4: Integration (Day 4)
```
4.1 Create ar-viewer-integration.js
4.2 Feature flag implementation
4.3 End-to-end testing
4.4 Documentation
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Module | Test Coverage | Tools |
|--------|--------------|-------|
| MathUtils | 100% (all functions) | Vitest |
| PoseAverager | 100% (all methods) | Vitest |
| StabilityGate | 90% (state transitions) | Vitest |
| RuleLoader | Mock API, error cases | Vitest + fetch mock |

### 10.2 Integration Tests

| Test | Description |
|------|-------------|
| Config Loading | Verify fallback to defaults on API failure |
| Stability Gate | Verify 15-frame count before stable |
| Semantic Matching | Verify combo triggers with correct cards |

### 10.3 Verification Matrix

| Feature | URL Param | Existing Flow | New Flow |
|---------|-----------|---------------|----------|
| Single card scan | None | Works | Works |
| Freeze Pose | `?freezePose=true` | N/A | Stable placement |
| Semantic Manager | `?semanticManager=true` | N/A | Combo triggers |

---

## 11. File Manifest

### New Frontend Files

```
frontend-web/public/static/ar-assets/js/
├── core/
│   ├── math-utils.js
│   ├── math-utils.test.js
│   ├── pose-averager.js
│   ├── pose-averager.test.js
│   ├── config-loader.js
│   └── config-loader.test.js
├── stability/
│   ├── stability-gate.js
│   ├── stability-gate.test.js
│   └── pose-stabilizer.js
├── semantic/
│   ├── rule-schema.js
│   ├── rule-loader.js
│   ├── rule-loader.test.js
│   ├── semantic-manager.js
│   ├── semantic-manager.test.js
│   ├── combo-spawner.js
│   └── combo-spawner.test.js
└── integration/
    └── ar-viewer-integration.js
```

### New Backend Files

```
backend/src/
├── models/
│   ├── SemanticRule.js
│   └── StabilityConfig.js
└── routes/
    └── ar/
        ├── semantic-rules.js
        ├── stability-config.js
        └── combo-triggered.js
```

---

## 12. Dependencies

### External Dependencies
- None required (vanilla JavaScript modules)

### Internal Dependencies
- `combo-effects.js` (existing) - Reused for combo spawning

### API Dependencies
- MongoDB (existing infrastructure)
- Existing AR tracking system

---

## 13. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Config API unavailable | Low | Medium | Fallback to hardcoded defaults |
| Rule matching slow | Medium | Low | Sort by priority, early exit |
| Stability gate too strict | Medium | High | Expose `requiredFrames` in config |
| Combo triggers too often | Medium | Medium | Track active combos, cooldown |
| Break existing single-card | Low | Critical | Feature flags, no refactor |

---

## 14. Backwards Compatibility

### Preserved Behaviors
- Single card scanning works identically
- Existing games/quizzes unaffected
- URL params are additive (not required)
- Default behavior unchanged

### New Behaviors (Opt-in)
- Freeze Pose: `?freezePose=true`
- Semantic Manager: `?semanticManager=true`

---

## 15. Success Criteria

1. ✅ New modules are fully testable (no inline logic)
2. ✅ Semantic rules load from MongoDB, not hardcoded
3. ✅ Stability thresholds configurable via API
4. ✅ All new features gated behind URL params
5. ✅ Existing single-card flow unchanged
6. ✅ Unit tests cover core modules
7. ✅ SOLID principles applied throughout

---

**End of Revised Implementation Plan**
