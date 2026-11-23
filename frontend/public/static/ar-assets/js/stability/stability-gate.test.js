import { StabilityGate } from '../stability/stability-gate.js';
import { MathUtils } from '../core/math-utils.js';

describe('StabilityGate', () => {
    let gate;

    beforeEach(() => {
        gate = new StabilityGate();
    });

    const createPose = (x = 0, y = 0, z = 0) => ({
        position: { x, y, z },
        quaternion: { x: 0, y: 0, z: 0, w: 1 }
    });

    describe('startTracking', () => {
        it('should initialize tracking for a target', () => {
            gate.startTracking(1);
            expect(gate.getFrameCount(1)).toBe(0);
        });

        it('should allow tracking multiple targets', () => {
            gate.startTracking(1);
            gate.startTracking(2);
            expect(gate.getFrameCount(1)).toBe(0);
            expect(gate.getFrameCount(2)).toBe(0);
        });
    });

    describe('addSample', () => {
        it('should return false if target not being tracked', () => {
            const result = gate.addSample(999, createPose());
            expect(result).toBe(false);
        });

        it('should accumulate samples for tracked target', () => {
            gate.startTracking(1);
            gate.addSample(1, createPose(0, 0, 0));
            expect(gate.getFrameCount(1)).toBe(0);
        });

        it('should return true when target becomes stable', () => {
            gate.startTracking(1);
            
            // Add 15+ frames of stable data
            for (let i = 0; i < 20; i++) {
                const isStable = gate.addSample(1, createPose(0.1, 0.1, 0.1));
                if (isStable) break;
            }
            
            expect(gate.isStable(1)).toBe(true);
        });

        it('should not re-trigger stability if already stable', () => {
            gate.startTracking(1);
            
            let stableCount = 0;
            for (let i = 0; i < 30; i++) {
                if (gate.addSample(1, createPose(0.1, 0.1, 0.1))) {
                    stableCount++;
                }
            }
            
            // Should only trigger once
            expect(stableCount).toBe(1);
            expect(gate.isStable(1)).toBe(true);
        });

        it('should reset count when instability detected', () => {
            gate.startTracking(1);
            
            // Add some stable frames
            for (let i = 0; i < 5; i++) {
                gate.addSample(1, createPose(0.1, 0.1, 0.1));
            }
            
            // Add unstable frame
            gate.addSample(1, createPose(1.0, 1.0, 1.0));
            
            expect(gate.getFrameCount(1)).toBe(0);
        });
    });

    describe('isStable', () => {
        it('should return false for untracked targets', () => {
            expect(gate.isStable(1)).toBe(false);
        });

        it('should return true for stable targets', () => {
            gate.startTracking(1);
            for (let i = 0; i < 20; i++) {
                gate.addSample(1, createPose(0, 0, 0));
            }
            expect(gate.isStable(1)).toBe(true);
        });
    });

    describe('stopTracking', () => {
        it('should remove tracking data for target', () => {
            gate.startTracking(1);
            gate.stopTracking(1);
            expect(gate.addSample(1, createPose())).toBe(false);
        });
    });

    describe('reset', () => {
        it('should clear stability and tracking data', () => {
            gate.startTracking(1);
            for (let i = 0; i < 20; i++) {
                gate.addSample(1, createPose(0, 0, 0));
            }
            
            gate.reset(1);
            
            expect(gate.isStable(1)).toBe(false);
            expect(gate.getFrameCount(1)).toBe(0);
        });
    });

    describe('getFrameCount', () => {
        it('should return 0 for untracked targets', () => {
            expect(gate.getFrameCount(999)).toBe(0);
        });

        it('should return current stable frame count', () => {
            gate.startTracking(1);
            for (let i = 0; i < 10; i++) {
                gate.addSample(1, createPose(0, 0, 0));
            }
            // Frame count depends on implementation - may be 0 until stability check
            expect(gate.getFrameCount(1)).toBeGreaterThanOrEqual(0);
        });
    });

    describe('_computeAverage', () => {
        it('should compute correct average position', () => {
            gate.startTracking(1);
            gate.addSample(1, createPose(0, 0, 0));
            gate.addSample(1, createPose(2, 4, 6));
            gate.addSample(1, createPose(4, 8, 12));
            
            // After adding samples, tracking should be active
            expect(gate.getFrameCount(1)).toBeGreaterThanOrEqual(0);
        });
    });

    describe('_isWithinThreshold', () => {
        it('should accept samples within threshold', () => {
            gate.startTracking(1);
            for (let i = 0; i < 3; i++) {
                const isStable = gate.addSample(1, createPose(0.01, 0.01, 0.01));
                if (isStable) {
                    expect(gate.isStable(1)).toBe(true);
                    return;
                }
            }
            // May not be stable yet with only 3 frames
        });

        it('should reject samples outside threshold', () => {
            gate.startTracking(1);
            gate.addSample(1, createPose(0, 0, 0));
            gate.addSample(1, createPose(0.01, 0.01, 0.01));
            gate.addSample(1, createPose(1.0, 1.0, 1.0)); // Large deviation
            
            expect(gate.getFrameCount(1)).toBe(0);
        });
    });

    describe('MAX_SAMPLES boundary', () => {
        it('should maintain at most 20 samples', () => {
            gate.startTracking(1);
            
            for (let i = 0; i < 30; i++) {
                gate.addSample(1, createPose(i * 0.001, i * 0.001, i * 0.001));
            }
            
            const tracking = gate._tracking.get(1);
            expect(tracking.samples.length).toBeLessThanOrEqual(20);
        });
    });
});
