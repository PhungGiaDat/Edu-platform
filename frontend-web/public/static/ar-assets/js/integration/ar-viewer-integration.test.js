/**
 * ARViewerIntegration Test Suite
 * Tests for the main integration module
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { ARViewerIntegration } from './ar-viewer-integration.js';

vi.mock('../stability/pose-stabilizer.js', () => ({
    PoseStabilizer: vi.fn().mockImplementation(function MockPoseStabilizer() {
        this._targetStates = new Map();
        this.init = vi.fn().mockResolvedValue(undefined);
        this.start = vi.fn();
        this.processFrame = vi.fn().mockReturnValue(null);
        this.isStable = vi.fn().mockReturnValue(false);
        this.dispose = vi.fn();
    })
}));

vi.mock('../semantic/semantic-manager.js', () => ({
    SemanticManager: vi.fn().mockImplementation(function MockSemanticManager() {
        this._currentCards = new Set();
        this._rules = [];
        this.init = vi.fn().mockResolvedValue(undefined);
        this.updateCards = vi.fn();
        this.addCard = vi.fn();
        this.removeCard = vi.fn();
        this.getCurrentCards = vi.fn().mockReturnValue([]);
        this.reset = vi.fn();
    })
}));

vi.mock('../semantic/combo-spawner.js', () => ({
    ComboSpawner: vi.fn().mockImplementation(function MockComboSpawner() {
        this.spawn = vi.fn();
        this.dispose = vi.fn();
    })
}));

describe('ARViewerIntegration', () => {
    let integration;
    let originalLocation;

    beforeEach(() => {
        originalLocation = window.location;
        delete window.location;
        window.location = { search: '' };
    });

    afterEach(() => {
        window.location = originalLocation;
        if (integration) {
            integration.dispose();
        }
    });

    describe('constructor', () => {
        it('should create instance with empty options', () => {
            integration = new ARViewerIntegration();
            expect(integration._options).toEqual({});
            expect(integration._enabled.freezePose).toBe(false);
            expect(integration._enabled.semanticManager).toBe(false);
            expect(integration._initialized).toBe(false);
        });

        it('should create instance with custom options', () => {
            integration = new ARViewerIntegration({ testOption: true });
            expect(integration._options.testOption).toBe(true);
        });
    });

    describe('_parseFeatureFlags', () => {
        it('should return false flags when no params', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            const flags = integration._parseFeatureFlags();
            expect(flags.freezePose).toBe(false);
            expect(flags.semanticManager).toBe(false);
        });

        it('should parse freezePose=true', () => {
            window.location.search = '?freezePose=true';
            integration = new ARViewerIntegration();
            const flags = integration._parseFeatureFlags();
            expect(flags.freezePose).toBe(true);
        });

        it('should parse semanticManager=true', () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            const flags = integration._parseFeatureFlags();
            expect(flags.semanticManager).toBe(true);
        });

        it('should parse multiple flags', () => {
            window.location.search = '?freezePose=true&semanticManager=true';
            integration = new ARViewerIntegration();
            const flags = integration._parseFeatureFlags();
            expect(flags.freezePose).toBe(true);
            expect(flags.semanticManager).toBe(true);
        });

        it('should handle other URL params', () => {
            window.location.search = '?other=value&freezePose=true&another=test';
            integration = new ARViewerIntegration();
            const flags = integration._parseFeatureFlags();
            expect(flags.freezePose).toBe(true);
            expect(flags.semanticManager).toBe(false);
        });

        it('should return false for non-true values', () => {
            window.location.search = '?freezePose=false';
            integration = new ARViewerIntegration();
            const flags = integration._parseFeatureFlags();
            expect(flags.freezePose).toBe(false);
        });
    });

    describe('init', () => {
        it('should initialize without features when no flags', async () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            await integration.init();
            expect(integration._initialized).toBe(true);
            expect(integration._stabilizer).toBeNull();
            expect(integration._semanticManager).toBeNull();
        });

        it('should initialize freeze pose when flag is set', async () => {
            window.location.search = '?freezePose=true';
            integration = new ARViewerIntegration();
            await integration.init();
            expect(integration._stabilizer).not.toBeNull();
            expect(integration._enabled.freezePose).toBe(true);
        });

        it('should initialize semantic manager when flag is set', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            expect(integration._semanticManager).not.toBeNull();
            expect(integration._comboSpawner).not.toBeNull();
            expect(integration._enabled.semanticManager).toBe(true);
        });

        it('should merge options with constructor options', async () => {
            window.location.search = '';
            integration = new ARViewerIntegration({ base: true });
            await integration.init({ extra: true });
            expect(integration._options.base).toBe(true);
            expect(integration._options.extra).toBe(true);
        });

        it('should call PoseStabilizer.init', async () => {
            window.location.search = '?freezePose=true';
            const { PoseStabilizer } = await import('../stability/pose-stabilizer.js');
            integration = new ARViewerIntegration();
            await integration.init();
            expect(PoseStabilizer).toHaveBeenCalled();
        });
    });

    describe('startStabilizing', () => {
        it('should return early when freezePose disabled', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            integration.startStabilizing(1);
            expect(integration._stabilizer).toBeNull();
        });

        it('should call stabilizer.start when enabled', async () => {
            window.location.search = '?freezePose=true';
            const { PoseStabilizer } = await import('../stability/pose-stabilizer.js');
            integration = new ARViewerIntegration();
            await integration.init();
            integration.startStabilizing(1);
            expect(integration._stabilizer.start).toHaveBeenCalled();
        });
    });

    describe('processFrame', () => {
        it('should return null when freezePose disabled', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            const result = integration.processFrame(1);
            expect(result).toBeNull();
        });

        it('should delegate to stabilizer when enabled', async () => {
            window.location.search = '?freezePose=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            const frozenPose = { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } };
            integration._stabilizer.processFrame.mockReturnValueOnce(frozenPose);
            
            const result = integration.processFrame(1);
            expect(result).toEqual(frozenPose);
        });
    });

    describe('updateDetectedCards', () => {
        it('should return early when semanticManager disabled', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            integration.updateDetectedCards(['card1']);
            expect(integration._semanticManager).toBeNull();
        });

        it('should call semanticManager.updateCards when enabled', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration.updateDetectedCards(['card1', 'card2']);
            expect(integration._semanticManager.updateCards).toHaveBeenCalledWith(['card1', 'card2']);
        });
    });

    describe('addCard', () => {
        it('should return early when semanticManager disabled', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            integration.addCard('card1');
            expect(integration._semanticManager).toBeNull();
        });

        it('should call semanticManager.addCard when enabled', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration.addCard('card1');
            expect(integration._semanticManager.addCard).toHaveBeenCalledWith('card1');
        });
    });

    describe('removeCard', () => {
        it('should return early when semanticManager disabled', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            integration.removeCard('card1');
            expect(integration._semanticManager).toBeNull();
        });

        it('should call semanticManager.removeCard when enabled', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration.removeCard('card1');
            expect(integration._semanticManager.removeCard).toHaveBeenCalledWith('card1');
        });
    });

    describe('isStable', () => {
        it('should return false when no stabilizer', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            expect(integration.isStable(1)).toBe(false);
        });

        it('should delegate to stabilizer when enabled', async () => {
            window.location.search = '?freezePose=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration._stabilizer.isStable.mockReturnValueOnce(true);
            expect(integration.isStable(1)).toBe(true);
        });
    });

    describe('getCurrentCards', () => {
        it('should return empty array when no semanticManager', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            expect(integration.getCurrentCards()).toEqual([]);
        });

        it('should delegate to semanticManager when enabled', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration._semanticManager.getCurrentCards.mockReturnValue(['card1', 'card2']);
            expect(integration.getCurrentCards()).toEqual(['card1', 'card2']);
        });
    });

    describe('reset', () => {
        it('should call semanticManager.reset when enabled', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration.reset();
            expect(integration._semanticManager.reset).toHaveBeenCalled();
        });

        it('should not throw when semanticManager is null', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            expect(() => integration.reset()).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should cleanup stabilizer when enabled', async () => {
            window.location.search = '?freezePose=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration.dispose();
            expect(integration._stabilizer.dispose).toHaveBeenCalled();
            expect(integration._initialized).toBe(false);
        });

        it('should cleanup comboSpawner when enabled', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            integration.dispose();
            expect(integration._comboSpawner.dispose).toHaveBeenCalled();
        });

        it('should be safe to call when no systems enabled', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            expect(() => integration.dispose()).not.toThrow();
        });
    });

    describe('isFeatureEnabled', () => {
        it('should return correct state for freezePose', async () => {
            window.location.search = '?freezePose=true';
            integration = new ARViewerIntegration();
            await integration.init();
            expect(integration.isFeatureEnabled('freezePose')).toBe(true);
            expect(integration.isFeatureEnabled('semanticManager')).toBe(false);
        });

        it('should return correct state for semanticManager', async () => {
            window.location.search = '?semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            expect(integration.isFeatureEnabled('semanticManager')).toBe(true);
            expect(integration.isFeatureEnabled('freezePose')).toBe(false);
        });

        it('should return undefined for unknown features', () => {
            window.location.search = '';
            integration = new ARViewerIntegration();
            expect(integration.isFeatureEnabled('unknown')).toBe(false);
        });
    });

    describe('integration scenarios', () => {
        it('should support both features simultaneously', async () => {
            window.location.search = '?freezePose=true&semanticManager=true';
            integration = new ARViewerIntegration();
            await integration.init();
            
            expect(integration._enabled.freezePose).toBe(true);
            expect(integration._enabled.semanticManager).toBe(true);
            expect(integration._stabilizer).not.toBeNull();
            expect(integration._semanticManager).not.toBeNull();
            expect(integration._comboSpawner).not.toBeNull();
        });

        it('should handle callback options', async () => {
            window.location.search = '?freezePose=true&semanticManager=true';
            const onStable = vi.fn();
            const onUnstable = vi.fn();
            const onCombo = vi.fn();
            
            integration = new ARViewerIntegration({ onStable, onUnstable, onCombo });
            await integration.init();
            
            expect(integration._options.onStable).toBe(onStable);
            expect(integration._options.onUnstable).toBe(onUnstable);
            expect(integration._options.onCombo).toBe(onCombo);
        });
    });
});
