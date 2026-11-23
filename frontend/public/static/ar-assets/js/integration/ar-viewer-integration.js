/**
 * ARViewerIntegration - Wires together stability + semantic systems
 * Entry point for AR Freeze Pose + Semantic Manager features
 */
import { PoseStabilizer } from '../stability/pose-stabilizer.js';
import { SemanticManager } from '../semantic/semantic-manager.js';
import { ComboSpawner } from '../semantic/combo-spawner.js';

class ARViewerIntegration {
    constructor(options = {}) {
        this._options = options;
        this._stabilizer = null;
        this._semanticManager = null;
        this._comboSpawner = null;
        this._enabled = {
            freezePose: false,
            semanticManager: false
        };
        this._initialized = false;
    }

    /**
     * Parse feature flags from URL
     */
    _parseFeatureFlags() {
        if (typeof window === 'undefined') {
            return { freezePose: false, semanticManager: false };
        }
        
        const params = new URLSearchParams(window.location.search);
        return {
            freezePose: params.get('freezePose') === 'true',
            semanticManager: params.get('semanticManager') === 'true'
        };
    }

    /**
     * Initialize the integration
     * @param {Object} options
     * @param {Object} options.scene - Three.js scene (for combo spawner)
     * @param {Object} options.audioContext - AudioContext (for sounds)
     * @param {Function} options.getPose - (targetIndex) => pose for stability
     * @param {Function} options.onStable - callback when pose freezes
     */
    async init(options = {}) {
        this._options = { ...this._options, ...options };
        
        // Parse feature flags
        this._enabled = this._parseFeatureFlags();
        console.log('[ARViewerIntegration] Feature flags:', this._enabled);

        // Initialize Freeze Pose system
        if (this._enabled.freezePose) {
            await this._initFreezePose();
        }

        // Initialize Semantic Manager system
        if (this._enabled.semanticManager) {
            await this._initSemanticManager();
        }

        this._initialized = true;
        console.log('[ARViewerIntegration] Initialization complete');
    }

    /**
     * Initialize Freeze Pose (stability system)
     */
    async _initFreezePose() {
        console.log('[ARViewerIntegration] Initializing Freeze Pose...');
        
        this._stabilizer = new PoseStabilizer({
            environment: this._options.environment || 'indoor',
            onStable: (targetIndex, frozenPose) => {
                console.log('[ARViewerIntegration] Pose stabilized!', targetIndex, frozenPose);
                this._options.onStable?.(targetIndex, frozenPose);
            },
            onUnstable: (targetIndex) => {
                console.log('[ARViewerIntegration] Pose unstable', targetIndex);
                this._options.onUnstable?.(targetIndex);
            }
        });

        await this._stabilizer.init();
        console.log('[ARViewerIntegration] Freeze Pose ready');
    }

    /**
     * Initialize Semantic Manager
     */
    async _initSemanticManager() {
        console.log('[ARViewerIntegration] Initializing Semantic Manager...');
        
        this._comboSpawner = new ComboSpawner({
            scene: this._options.scene,
            audioContext: this._options.audioContext
        });

        this._semanticManager = new SemanticManager({
            baseUrl: this._options.apiBaseUrl || '/api/v1',
            onCombo: (result) => {
                console.log('[ARViewerIntegration] Combo detected!', result);
                
                // Spawn the combo effect at center position
                this._comboSpawner.spawn(result, { x: 0, y: 0, z: 0 });
                
                // Call external handler if provided
                this._options.onCombo?.(result);
            }
        });

        const flashcardSet = this._options.flashcardSet || 'default';
        await this._semanticManager.init(flashcardSet);
        console.log('[ARViewerIntegration] Semantic Manager ready');
    }

    /**
     * Start stabilizing a target
     * @param {number} targetIndex
     */
    startStabilizing(targetIndex) {
        if (!this._enabled.freezePose || !this._stabilizer) return;
        
        this._stabilizer.start(targetIndex, () => this._options.getPose?.(targetIndex));
    }

    /**
     * Process a frame - call this on each render/update
     * @param {number} targetIndex
     * @returns {Object|null} Frozen pose if stable
     */
    processFrame(targetIndex) {
        if (!this._enabled.freezePose || !this._stabilizer) return null;
        return this._stabilizer.processFrame(targetIndex);
    }

    /**
     * Update detected cards for semantic matching
     * @param {string[]} cardIds
     */
    updateDetectedCards(cardIds) {
        if (!this._enabled.semanticManager || !this._semanticManager) return;
        this._semanticManager.updateCards(cardIds);
    }

    /**
     * Add a single detected card
     * @param {string} cardId
     */
    addCard(cardId) {
        if (!this._enabled.semanticManager || !this._semanticManager) return;
        this._semanticManager.addCard(cardId);
    }

    /**
     * Remove a detected card
     * @param {string} cardId
     */
    removeCard(cardId) {
        if (!this._enabled.semanticManager || !this._semanticManager) return;
        this._semanticManager.removeCard(cardId);
    }

    /**
     * Check if pose is stable
     * @param {number} targetIndex
     */
    isStable(targetIndex) {
        return this._stabilizer?.isStable(targetIndex) ?? false;
    }

    /**
     * Get current detected cards
     */
    getCurrentCards() {
        return this._semanticManager?.getCurrentCards() ?? [];
    }

    /**
     * Reset all systems (call when starting new game)
     */
    reset() {
        this._semanticManager?.reset();
        console.log('[ARViewerIntegration] Reset complete');
    }

    /**
     * Cleanup
     */
    dispose() {
        this._stabilizer?.dispose?.();
        this._comboSpawner?.dispose?.();
        this._initialized = false;
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(feature) {
        return this._enabled[feature] ?? false;
    }
}

export { ARViewerIntegration };
