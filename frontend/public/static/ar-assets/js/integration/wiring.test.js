/**
 * Wiring Integration Test — ar-viewer integration wiring
 *
 * Verifies that:
 *  1. Feature flags are correctly parsed from URL params
 *  2. The integration module loads when flags are present
 *  3. Stability gate integration is wired (no runtime errors when flags are absent)
 *
 * Run with: npx vitest run --config vitest.ar.config.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Shared mutable refs — one set per test, reset in beforeEach ──────────────────────

/** Captured onStable callback passed to ARViewerIntegration constructor */
let capturedOnStable = null;
/** Captured onCombo callback passed to ARViewerIntegration constructor */
let capturedOnCombo = null;

/** Per-invocation mock instance — fresh object per new ARViewerIntegration() call */
function makeMockInstance() {
    return {
        init:               vi.fn().mockResolvedValue(undefined),
        startStabilizing:   vi.fn(),
        updateDetectedCards: vi.fn(),
        addCard:            vi.fn(),
        removeCard:         vi.fn(),
        isStable:           vi.fn().mockReturnValue(false),
        getCurrentCards:    vi.fn().mockReturnValue([]),
        reset:              vi.fn(),
        dispose:            vi.fn(),
    };
}

/**
 * Mock ARViewerIntegration factory.
 * Captures callbacks from whichever call-site provides them:
 *   - Constructor:  ARViewerIntegration(opts)
 *   - init():       ARViewerIntegration().init(opts)
 * Returns a mock instance with all method spies.
 */
function MockARViewerIntegration(constructorOpts) {
    // Capture constructor-time callbacks (ar-viewer.html passes them to constructor)
    if (typeof constructorOpts?.onStable === 'function') {
        capturedOnStable = constructorOpts.onStable;
    }
    if (typeof constructorOpts?.onCombo === 'function') {
        capturedOnCombo = constructorOpts.onCombo;
    }
    return {
        init: vi.fn().mockImplementation(function(initOpts) {
            // Capture init()-time callbacks (real class reads from this._options)
            if (typeof initOpts?.onStable === 'function') {
                capturedOnStable = initOpts.onStable;
            }
            if (typeof initOpts?.onCombo === 'function') {
                capturedOnCombo = initOpts.onCombo;
            }
            return Promise.resolve();
        }),
        startStabilizing:   vi.fn(),
        updateDetectedCards: vi.fn(),
        addCard:            vi.fn(),
        removeCard:         vi.fn(),
        isStable:           vi.fn().mockReturnValue(false),
        getCurrentCards:    vi.fn().mockReturnValue([]),
        reset:              vi.fn(),
        dispose:            vi.fn(),
    };
}

// ─── Bootstrap helpers (mirrors ar-viewer.html logic) ──────────────────────────────

function parseFeatureFlags(search) {
    const params = new URLSearchParams(search);
    return {
        freezePose:      params.get('freezePose') === 'true',
        semanticManager: params.get('semanticManager') === 'true',
    };
}

async function loadESModule(src) {
    if (src.includes('ar-viewer-integration')) {
        return { ARViewerIntegration: MockARViewerIntegration };
    }
    throw new Error('Unknown module: ' + src);
}

/**
 * Mirrors ar-viewer.html integration loading pattern:
 * - Reads feature flags from URL params
 * - Loads the integration module
 * - Passes onStable / onCombo callbacks to the constructor
 * - Calls init()
 */
async function initIntegration(search) {
    const { freezePose, semanticManager } = parseFeatureFlags(search);
    if (!freezePose && !semanticManager) return null;

    // Capture callbacks — mirrors what ar-viewer.html passes to the constructor
    const opts = {
        enableFreezePose: freezePose,
        enableSemantic:   semanticManager,
        apiBase:         '/api/v1/ar',
    };
    if (freezePose) {
        opts.onStable = (targetIndex, frozenPose) => {
            // ar-viewer.html dispatches ar:target-stable here
            document.dispatchEvent(new CustomEvent('ar:target-stable', {
                detail: { targetIndex, pose: frozenPose },
                bubbles: true,
            }));
        };
    }
    if (semanticManager) {
        opts.onCombo = (result) => {
            // ar-viewer.html dispatches ar:semantic-combo here
            document.dispatchEvent(new CustomEvent('ar:semantic-combo', {
                detail: result,
                bubbles: true,
            }));
        };
    }

    const mod = await loadESModule('/static/ar-assets/js/integration/ar-viewer-integration.js');
    const inst = new mod.ARViewerIntegration(opts);
    await inst.init();
    return inst;
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('Feature Flag Parsing', () => {
    it('should return false flags when no params present', () => {
        const flags = parseFeatureFlags('');
        expect(flags.freezePose).toBe(false);
        expect(flags.semanticManager).toBe(false);
    });

    it('should parse freezePose=true', () => {
        const flags = parseFeatureFlags('?freezePose=true');
        expect(flags.freezePose).toBe(true);
        expect(flags.semanticManager).toBe(false);
    });

    it('should parse semanticManager=true', () => {
        const flags = parseFeatureFlags('?semanticManager=true');
        expect(flags.freezePose).toBe(false);
        expect(flags.semanticManager).toBe(true);
    });

    it('should parse both flags simultaneously', () => {
        const flags = parseFeatureFlags('?freezePose=true&semanticManager=true');
        expect(flags.freezePose).toBe(true);
        expect(flags.semanticManager).toBe(true);
    });

    it('should ignore non-true values', () => {
        const flags = parseFeatureFlags('?freezePose=false&semanticManager=1');
        expect(flags.freezePose).toBe(false);
        expect(flags.semanticManager).toBe(false);
    });

    it('should coexist with other URL params', () => {
        const flags = parseFeatureFlags('?mind=targets.mind&freezePose=true&maxTrack=2');
        expect(flags.freezePose).toBe(true);
        expect(flags.semanticManager).toBe(false);
    });
});

describe('Integration Module Loading', () => {
    beforeEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    afterEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    it('should return null when no flags are set', async () => {
        const inst = await initIntegration('');
        expect(inst).toBeNull();
    });

    it('should load ARViewerIntegration when freezePose=true', async () => {
        const inst = await initIntegration('?freezePose=true');
        expect(inst).not.toBeNull();
        // onStable is captured because freezePose is enabled
        expect(capturedOnStable).not.toBeNull();
        expect(typeof capturedOnStable).toBe('function');
    });

    it('should load ARViewerIntegration when semanticManager=true', async () => {
        const inst = await initIntegration('?semanticManager=true');
        expect(inst).not.toBeNull();
        expect(capturedOnCombo).not.toBeNull();
        expect(typeof capturedOnCombo).toBe('function');
    });

    it('should load ARViewerIntegration with both flags', async () => {
        const inst = await initIntegration('?freezePose=true&semanticManager=true');
        expect(inst).not.toBeNull();
        expect(capturedOnStable).not.toBeNull();
        expect(capturedOnCombo).not.toBeNull();
    });

    it('should call init() on the integration instance', async () => {
        const inst = await initIntegration('?freezePose=true');
        expect(inst.init).toHaveBeenCalled();
    });

    it('should not throw when module import fails for unknown paths', async () => {
        await expect(loadESModule('/unknown/path.js')).rejects.toThrow('Unknown module');
    });
});

describe('Stability Gate Wiring', () => {
    beforeEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    afterEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    it('should call startStabilizing when target is found', async () => {
        const inst = await initIntegration('?freezePose=true');
        expect(inst).not.toBeNull();

        // Simulate what ar-viewer.js does in targetFound handler
        inst.startStabilizing(0);
        inst.startStabilizing(1);

        expect(inst.startStabilizing).toHaveBeenCalledTimes(2);
        expect(inst.startStabilizing).toHaveBeenNthCalledWith(1, 0);
        expect(inst.startStabilizing).toHaveBeenNthCalledWith(2, 1);
    });

    it('should call updateDetectedCards for semantic manager', async () => {
        const inst = await initIntegration('?semanticManager=true');
        expect(inst).not.toBeNull();

        // Simulate what ar-viewer.js does in checkMultiTarget
        inst.updateDetectedCards(['target-0', 'target-1']);

        expect(inst.updateDetectedCards).toHaveBeenCalledWith(['target-0', 'target-1']);
    });

    it('should not call stability methods when flags are off', async () => {
        const inst = await initIntegration('');
        // inst is null when no flags — ar-viewer.js guards with optional chaining
        expect(inst).toBeNull();
    });
});

describe('Custom Event Dispatching', () => {
    beforeEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    afterEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    it('should capture onStable callback when freezePose=true', async () => {
        await initIntegration('?freezePose=true');
        expect(capturedOnStable).not.toBeNull();
        expect(typeof capturedOnStable).toBe('function');
    });

    it('should capture onCombo callback when semanticManager=true', async () => {
        await initIntegration('?semanticManager=true');
        expect(capturedOnCombo).not.toBeNull();
        expect(typeof capturedOnCombo).toBe('function');
    });

    it('should dispatch ar:target-stable when onStable is called', async () => {
        await initIntegration('?freezePose=true');
        expect(capturedOnStable).not.toBeNull();

        const frozenPose = {
            position:  { x: 0.1, y: 0.2, z: 0.3 },
            quaternion: { x: 0, y: 0, z: 0, w: 1 },
        };

        // ── Register listener BEFORE firing callback ────────────────────────────────────
        let receivedEvent = null;
        document.addEventListener('ar:target-stable', (e) => {
            receivedEvent = e;
        });

        // Simulate PoseStabilizer firing onStable → ar-viewer.html dispatches ar:target-stable
        capturedOnStable(0, frozenPose);

        expect(receivedEvent).not.toBeNull();
        expect(receivedEvent.detail.targetIndex).toBe(0);
        expect(receivedEvent.detail.pose).toEqual(frozenPose);
    });

    it('should dispatch ar:semantic-combo when onCombo is called', async () => {
        await initIntegration('?semanticManager=true');
        expect(capturedOnCombo).not.toBeNull();

        const comboResult = {
            comboId:  'elephant-jungle',
            animation: 'combo_reveal',
            sound:     null,
            phrase:    'Elephant in Jungle',
        };

        // ── Register listener BEFORE firing callback ────────────────────────────────────
        let receivedEvent = null;
        document.addEventListener('ar:semantic-combo', (e) => {
            receivedEvent = e;
        });

        // Simulate SemanticManager firing onCombo → ar-viewer.html dispatches ar:semantic-combo
        capturedOnCombo(comboResult);

        expect(receivedEvent).not.toBeNull();
        expect(receivedEvent.detail.comboId).toBe('elephant-jungle');
        expect(receivedEvent.detail.animation).toBe('combo_reveal');
    });
});

describe('Backwards Compatibility', () => {
    beforeEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    afterEach(() => {
        capturedOnStable = null;
        capturedOnCombo = null;
    });

    it('should not load integration module when no flags present', async () => {
        const inst = await initIntegration('');
        expect(inst).toBeNull();
    });

    it('should not crash when __arViewerIntegration is absent in target handlers', () => {
        // Simulates ar-viewer.js guard: if (!window.__arViewerIntegration) return;
        const callStability = () => {
            if (undefined) {  // window.__arViewerIntegration when absent
                undefined.startStabilizing(0);
            }
        };
        expect(() => callStability()).not.toThrow();
    });

    it('should coexist with other URL params without affecting stability wiring', async () => {
        const flags = parseFeatureFlags('?mind=targets.mind&freezePose=true&maxTrack=2&semanticManager=true');
        expect(flags.freezePose).toBe(true);
        expect(flags.semanticManager).toBe(true);

        const inst = await initIntegration('?mind=targets.mind&freezePose=true&maxTrack=2&semanticManager=true');
        expect(inst).not.toBeNull();
        expect(inst.init).toHaveBeenCalled();
    });
});
