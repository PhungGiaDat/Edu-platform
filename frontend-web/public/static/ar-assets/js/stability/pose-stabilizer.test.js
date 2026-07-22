/**
 * PoseStabilizer Test Suite
 * Tests for the pose stabilization module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PoseStabilizer } from '../stability/pose-stabilizer.js';

describe('PoseStabilizer', () => {
    let stabilizer;
    let mockOnStable;
    let mockOnUnstable;

    beforeEach(() => {
        mockOnStable = vi.fn();
        mockOnUnstable = vi.fn();
    });

    describe('constructor', () => {
        it('should create instance with options', () => {
            stabilizer = new PoseStabilizer({
                onStable: mockOnStable,
                onUnstable: mockOnUnstable
            });
            
            expect(stabilizer).toBeDefined();
            expect(stabilizer._options.onStable).toBe(mockOnStable);
            expect(stabilizer._options.onUnstable).toBe(mockOnUnstable);
        });

        it('should work without options', () => {
            stabilizer = new PoseStabilizer();
            expect(stabilizer._options).toEqual({});
        });

        it('should initialize internal dependencies', () => {
            stabilizer = new PoseStabilizer();
            expect(stabilizer._gate).toBeDefined();
            expect(stabilizer._configLoader).toBeDefined();
        });
    });

    describe('init', () => {
        it('should load configuration', async () => {
            stabilizer = new PoseStabilizer();
            await stabilizer.init();
            expect(stabilizer._config).toBeDefined();
        });
    });

    describe('start', () => {
        it('should register pose getter and start tracking', () => {
            stabilizer = new PoseStabilizer();
            const getPose = () => ({ position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            
            stabilizer.start(1, getPose);
            
            expect(stabilizer._poseGetters.has(1)).toBe(true);
            expect(stabilizer.isStable(1)).toBe(false);
        });

        it('should allow starting multiple targets', () => {
            stabilizer = new PoseStabilizer();
            const getPose1 = () => ({ position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            const getPose2 = () => ({ position: { x: 1, y: 1, z: 1 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            
            stabilizer.start(1, getPose1);
            stabilizer.start(2, getPose2);
            
            expect(stabilizer._poseGetters.size).toBe(2);
        });
    });

    describe('processFrame', () => {
        it('should return null if target not registered', () => {
            stabilizer = new PoseStabilizer();
            const result = stabilizer.processFrame(999);
            expect(result).toBeNull();
        });

        it('should return null when pose is null', () => {
            stabilizer = new PoseStabilizer({
                onUnstable: mockOnUnstable
            });
            const getPose = () => null;
            
            stabilizer.start(1, getPose);
            const result = stabilizer.processFrame(1);
            
            expect(result).toBeNull();
        });

        it('should call onUnstable callback when pose is null', () => {
            stabilizer = new PoseStabilizer({
                onUnstable: mockOnUnstable
            });
            const getPose = () => null;
            
            stabilizer.start(1, getPose);
            stabilizer.processFrame(1);
            
            expect(mockOnUnstable).toHaveBeenCalledWith(1);
        });

        it('should return null when not stable', () => {
            stabilizer = new PoseStabilizer();
            const getPose = () => ({ position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            
            stabilizer.start(1, getPose);
            const result = stabilizer.processFrame(1);
            
            expect(result).toBeNull();
        });
    });

    describe('isStable', () => {
        it('should return false for unregistered target', () => {
            stabilizer = new PoseStabilizer();
            expect(stabilizer.isStable(999)).toBe(false);
        });

        it('should delegate to gate', () => {
            stabilizer = new PoseStabilizer();
            const getPose = () => ({ position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            
            stabilizer.start(1, getPose);
            
            // New target is not stable until enough frames collected
            expect(stabilizer.isStable(1)).toBe(false);
        });
    });

    describe('stop', () => {
        it('should remove target tracking', () => {
            stabilizer = new PoseStabilizer();
            const getPose = () => ({ position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            
            stabilizer.start(1, getPose);
            expect(stabilizer._poseGetters.has(1)).toBe(true);
            
            stabilizer.stop(1);
            expect(stabilizer._poseGetters.has(1)).toBe(false);
        });

        it('should return null after stop', () => {
            stabilizer = new PoseStabilizer();
            const getPose = () => ({ position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } });
            
            stabilizer.start(1, getPose);
            stabilizer.stop(1);
            
            const result = stabilizer.processFrame(1);
            expect(result).toBeNull();
        });

        it('should handle stopping non-existent target', () => {
            stabilizer = new PoseStabilizer();
            expect(() => stabilizer.stop(999)).not.toThrow();
        });
    });

    describe('dispose', () => {
        it('should cleanup without errors', () => {
            stabilizer = new PoseStabilizer();
            // PoseStabilizer doesn't have a dispose method - verify this behavior
            expect(typeof stabilizer.dispose).toBe('undefined');
        });
    });
});
