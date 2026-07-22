/**
 * ComboSpawner Test Suite
 * Tests for the combo visual effects spawner
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComboSpawner } from './combo-spawner.js';

describe('ComboSpawner', () => {
    let comboSpawner;
    let mockScene;
    let mockAudioContext;

    beforeEach(() => {
        mockScene = {
            add: vi.fn(),
            remove: vi.fn()
        };
        mockAudioContext = {
            decodeAudioData: vi.fn(),
            createBufferSource: vi.fn().mockReturnValue({
                connect: vi.fn().mockReturnThis(),
                start: vi.fn()
            }),
            destination: {}
        };
        comboSpawner = new ComboSpawner({
            scene: mockScene,
            audioContext: mockAudioContext
        });
    });

    afterEach(() => {
        comboSpawner.dispose();
    });

    describe('constructor', () => {
        it('should initialize with provided scene', () => {
            expect(comboSpawner._scene).toBe(mockScene);
        });

        it('should initialize with provided audio context', () => {
            expect(comboSpawner._audioContext).toBe(mockAudioContext);
        });

        it('should allow null scene', () => {
            const spawner = new ComboSpawner({ audioContext: mockAudioContext });
            expect(spawner._scene).toBeNull();
        });

        it('should allow null audio context', () => {
            const spawner = new ComboSpawner({ scene: mockScene });
            expect(spawner._audioContext).toBeNull();
        });

        it('should initialize empty active effects', () => {
            expect(comboSpawner._activeEffects.size).toBe(0);
        });
    });

    describe('spawn', () => {
        it('should spawn particle_burst animation', () => {
            const combo = { animation: 'particle_burst', phrase: 'Test' };
            const position = { x: 1, y: 2, z: 3 };
            comboSpawner.spawn(combo, position);
            expect(comboSpawner.getActiveEffects().length).toBeGreaterThan(0);
        });

        it('should spawn spawn_coin animation', () => {
            const combo = { animation: 'spawn_coin' };
            const position = { x: 0, y: 0, z: 0 };
            comboSpawner.spawn(combo, position);
            expect(comboSpawner.getActiveEffects().length).toBeGreaterThan(0);
        });

        it('should spawn model_swap animation', () => {
            const combo = { animation: 'model_swap' };
            const position = { x: 1, y: 1, z: 1 };
            comboSpawner.spawn(combo, position);
        });

        it('should spawn combo_jungle animation', () => {
            const combo = { animation: 'combo_jungle', phrase: 'Jungle!' };
            const position = { x: 5, y: 5, z: 5 };
            comboSpawner.spawn(combo, position);
            expect(comboSpawner.getActiveEffects().length).toBeGreaterThan(0);
        });

        it('should warn on unknown animation', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const combo = { animation: 'unknown_animation' };
            comboSpawner.spawn(combo);
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Unknown animation')
            );
            consoleSpy.mockRestore();
        });

        it('should use default position', () => {
            const combo = { animation: 'particle_burst' };
            comboSpawner.spawn(combo);
            expect(comboSpawner.getActiveEffects().length).toBeGreaterThan(0);
        });
    });

    describe('_spawnParticles', () => {
        it('should create particle effect with correct properties', () => {
            const combo = { animation: 'particle_burst', phrase: 'Burst!' };
            const position = { x: 1, y: 2, z: 3 };
            comboSpawner.spawn(combo, position);

            const effects = comboSpawner.getActiveEffects();
            const particleEffect = effects.find(e => e.type === 'particle_burst');
            
            expect(particleEffect).toBeDefined();
            expect(particleEffect.position).toEqual(position);
        });
    });

    describe('_spawnCoin', () => {
        it('should create coin effect', () => {
            const combo = { animation: 'spawn_coin' };
            const position = { x: 0, y: 1, z: 0 };
            comboSpawner.spawn(combo, position);

            const effects = comboSpawner.getActiveEffects();
            const coinEffect = effects.find(e => e.type === 'coin');
            
            expect(coinEffect).toBeDefined();
            expect(coinEffect.position).toEqual(position);
        });
    });

    describe('_spawnJungleEffect', () => {
        it('should create jungle effect with phrase', () => {
            const combo = { animation: 'combo_jungle', phrase: 'Jungle Combo!' };
            const position = { x: 1, y: 1, z: 1 };
            comboSpawner.spawn(combo, position);

            const effects = comboSpawner.getActiveEffects();
            const jungleEffect = effects.find(e => e.type === 'jungle_effect');
            
            expect(jungleEffect).toBeDefined();
            expect(jungleEffect.phrase).toBe('Jungle Combo!');
        });
    });

    describe('getActiveEffects', () => {
        it('should return copy of active effects', () => {
            comboSpawner._activeEffects.set(1, { id: 1, type: 'test' });
            const effects = comboSpawner.getActiveEffects();
            
            expect(effects).toHaveLength(1);
            effects.push({ id: 999 });
            expect(comboSpawner._activeEffects.size).toBe(1);
        });

        it('should return empty array when no effects', () => {
            expect(comboSpawner.getActiveEffects()).toEqual([]);
        });
    });

    describe('dispose', () => {
        it('should dispose all active effects', () => {
            comboSpawner.spawn({ animation: 'particle_burst', phrase: 'Test' });
            comboSpawner.spawn({ animation: 'spawn_coin' });
            expect(comboSpawner.getActiveEffects().length).toBe(2);

            comboSpawner.dispose();
            expect(comboSpawner.getActiveEffects()).toEqual([]);
        });

        it('should be safe to call multiple times', () => {
            comboSpawner.spawn({ animation: 'particle_burst' });
            comboSpawner.dispose();
            expect(() => comboSpawner.dispose()).not.toThrow();
        });

        it('should clear active effects map', () => {
            comboSpawner.spawn({ animation: 'particle_burst' });
            expect(comboSpawner._activeEffects.size).toBe(1);
            comboSpawner.dispose();
            expect(comboSpawner._activeEffects.size).toBe(0);
        });
    });
});
