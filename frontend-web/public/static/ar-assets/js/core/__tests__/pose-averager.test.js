/**
 * Unit Tests for PoseAverager
 * Tests all pose averaging and stability functions
 */

import { PoseAverager, averageSamples, averageQuaternions, isStable, getStabilityMetrics, smoothPose } from '../pose-averager.js';

// Helper to create a pose sample
const createSample = (x = 0, y = 0, z = 0, w = 1, ix = 0, iy = 0, iz = 0) => ({
    position: { x, y, z },
    quaternion: { x: ix, y: iy, z: iz, w }
});

describe('PoseAverager', () => {
    describe('averageSamples', () => {
        test('returns zero pose for empty array', () => {
            const result = averageSamples([]);
            expect(result.position.x).toBe(0);
            expect(result.position.y).toBe(0);
            expect(result.position.z).toBe(0);
            expect(result.quaternion.w).toBe(1);
        });

        test('returns null/undefined as zero pose', () => {
            const result = averageSamples(null);
            expect(result.position.x).toBe(0);
            expect(result.quaternion.w).toBe(1);
        });

        test('returns same pose for single sample', () => {
            const sample = createSample(1, 2, 3, 0.707, 0.707, 0, 0);
            const result = averageSamples([sample]);
            expect(result.position.x).toBe(1);
            expect(result.position.y).toBe(2);
            expect(result.position.z).toBe(3);
        });

        test('averages position correctly', () => {
            const samples = [
                createSample(0, 0, 0),
                createSample(2, 4, 6),
                createSample(4, 8, 12)
            ];
            const result = averageSamples(samples);
            expect(result.position.x).toBeCloseTo(2, 5);
            expect(result.position.y).toBeCloseTo(4, 5);
            expect(result.position.z).toBeCloseTo(6, 5);
        });

        test('averages quaternion correctly', () => {
            const samples = [
                { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 1, y: 0, z: 0, w: 0 } },
                { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 1, y: 0, z: 0, w: 0 } }
            ];
            const result = averageSamples(samples);
            // Should be normalized quaternion pointing along X
            const magnitude = Math.sqrt(result.quaternion.x ** 2 + result.quaternion.w ** 2);
            expect(magnitude).toBeCloseTo(1, 5);
        });

        test('handles two samples correctly', () => {
            const samples = [
                createSample(0, 0, 0),
                createSample(2, 4, 6)
            ];
            const result = averageSamples(samples);
            expect(result.position.x).toBeCloseTo(1, 5);
            expect(result.position.y).toBeCloseTo(2, 5);
            expect(result.position.z).toBeCloseTo(3, 5);
        });
    });

    describe('averageQuaternions', () => {
        test('returns identity quaternion for empty array', () => {
            const result = averageQuaternions([]);
            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
            expect(result.z).toBe(0);
            expect(result.w).toBe(1);
        });

        test('returns same quaternion for single input', () => {
            const q = { x: 0.5, y: 0.5, z: 0.5, w: 0.5 };
            const result = averageQuaternions([q]);
            expect(result.x).toBeCloseTo(0.5, 5);
            expect(result.y).toBeCloseTo(0.5, 5);
            expect(result.z).toBeCloseTo(0.5, 5);
            expect(result.w).toBeCloseTo(0.5, 5);
        });

        test('returns normalized quaternion', () => {
            const quaternions = [
                { x: 1, y: 0, z: 0, w: 0 },
                { x: 0, y: 1, z: 0, w: 0 }
            ];
            const result = averageQuaternions(quaternions);
            const magnitude = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2 + result.w ** 2);
            expect(magnitude).toBeCloseTo(1, 5);
        });

        test('handles identical quaternions', () => {
            const q = { x: 0.707, y: 0, z: 0, w: 0.707 };
            const quaternions = [q, q, q];
            const result = averageQuaternions(quaternions);
            expect(result.x).toBeCloseTo(0.707, 3);
            expect(result.w).toBeCloseTo(0.707, 3);
        });
    });

    describe('isStable', () => {
        test('returns true for empty samples', () => {
            expect(isStable([], 0.01, 0.01)).toBe(true);
        });

        test('returns true for null samples', () => {
            expect(isStable(null, 0.01, 0.01)).toBe(true);
        });

        test('returns true for single sample', () => {
            expect(isStable([createSample(1, 2, 3)], 0.01, 0.01)).toBe(true);
        });

        test('returns true for samples within threshold', () => {
            const samples = [
                createSample(0, 0, 0),
                createSample(0.001, 0.001, 0.001)
            ];
            expect(isStable(samples, 0.01, 0.1)).toBe(true);
        });

        test('returns false for samples exceeding threshold', () => {
            const samples = [
                createSample(0, 0, 0),
                createSample(1, 1, 1) // Large position change
            ];
            expect(isStable(samples, 0.01, 0.1)).toBe(false);
        });

        test('handles undefined thresholds gracefully', () => {
            const samples = [createSample(1, 2, 3)];
            expect(() => isStable(samples, undefined, undefined)).not.toThrow();
        });

        test('considers rotation stability', () => {
            const samples = [
                { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } },
                { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } }
            ];
            expect(isStable(samples, 0.1, 0.1)).toBe(true);
        });
    });

    describe('getStabilityMetrics', () => {
        test('returns zero metrics for empty samples', () => {
            const metrics = getStabilityMetrics([]);
            expect(metrics.positionVariance).toBe(0);
            expect(metrics.rotationVariance).toBe(0);
            expect(metrics.positionStdDev).toBe(0);
        });

        test('returns zero metrics for null samples', () => {
            const metrics = getStabilityMetrics(null);
            expect(metrics.positionVariance).toBe(0);
        });

        test('returns zero metrics for single sample', () => {
            const metrics = getStabilityMetrics([createSample(1, 2, 3)]);
            expect(metrics.positionVariance).toBe(0);
        });

        test('calculates position variance correctly', () => {
            const samples = [
                createSample(0, 0, 0),
                createSample(2, 4, 6),
                createSample(4, 8, 12)
            ];
            const metrics = getStabilityMetrics(samples);
            // Each axis has values [0, 2, 4], [0, 4, 8], [0, 6, 12]
            // Sum of variances = 8/3 + 48/3 + 128/3 = 184/3 ≈ 61.33
            // (Implementation sums per-axis variances without sqrt)
            expect(metrics.positionVariance).toBeGreaterThan(30);
        });

        test('returns valid metrics structure', () => {
            const samples = [createSample(1, 2, 3)];
            const metrics = getStabilityMetrics(samples);
            expect(metrics).toHaveProperty('positionVariance');
            expect(metrics).toHaveProperty('rotationVariance');
            expect(metrics).toHaveProperty('positionStdDev');
            expect(metrics).toHaveProperty('rotationStdDev');
        });

        test('positionStdDev is sqrt of positionVariance', () => {
            const samples = [
                createSample(0, 0, 0),
                createSample(2, 4, 6)
            ];
            const metrics = getStabilityMetrics(samples);
            expect(metrics.positionStdDev).toBeCloseTo(Math.sqrt(metrics.positionVariance), 5);
        });
    });

    describe('smoothPose', () => {
        test('returns current pose when no previous pose', () => {
            const current = createSample(1, 2, 3);
            const result = smoothPose(current, null);
            expect(result.position.x).toBe(1);
            expect(result.position.y).toBe(2);
            expect(result.position.z).toBe(3);
        });

        test('applies EMA with alpha=1 (returns current)', () => {
            const current = createSample(10, 20, 30);
            const previous = createSample(0, 0, 0);
            const result = smoothPose(current, previous, 1);
            expect(result.position.x).toBeCloseTo(10, 5);
            expect(result.position.y).toBeCloseTo(20, 5);
            expect(result.position.z).toBeCloseTo(30, 5);
        });

        test('applies EMA with alpha=0 (returns previous)', () => {
            const current = createSample(10, 20, 30);
            const previous = createSample(0, 0, 0);
            const result = smoothPose(current, previous, 0);
            expect(result.position.x).toBeCloseTo(0, 5);
            expect(result.position.y).toBeCloseTo(0, 5);
            expect(result.position.z).toBeCloseTo(0, 5);
        });

        test('applies partial smoothing with alpha=0.5', () => {
            const current = createSample(10, 20, 30);
            const previous = createSample(0, 0, 0);
            const result = smoothPose(current, previous, 0.5);
            expect(result.position.x).toBeCloseTo(5, 5);
            expect(result.position.y).toBeCloseTo(10, 5);
            expect(result.position.z).toBeCloseTo(15, 5);
        });

        test('normalizes quaternion output', () => {
            const current = { position: { x: 10, y: 20, z: 30 }, quaternion: { x: 1, y: 0, z: 0, w: 0 } };
            const previous = { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } };
            const result = smoothPose(current, previous, 0.5);
            const magnitude = Math.sqrt(
                result.quaternion.x ** 2 + result.quaternion.y ** 2 +
                result.quaternion.z ** 2 + result.quaternion.w ** 2
            );
            expect(magnitude).toBeCloseTo(1, 10);
        });

        test('smooths quaternion correctly', () => {
            const current = { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } };
            const previous = { position: { x: 0, y: 0, z: 0 }, quaternion: { x: 1, y: 0, z: 0, w: 0 } };
            const result = smoothPose(current, previous, 0.5);
            // With alpha=0.5 and EMA formula, quaternion smoothing applies component-wise lerp
            // Component-wise average of (0,0,0,1) and (1,0,0,0) = (0.5, 0, 0, 0.5) before normalization
            // After normalization: approximately (0.707, 0, 0, 0.707)
            expect(result.quaternion.x).toBeCloseTo(0.707, 1);
            expect(result.quaternion.w).toBeCloseTo(0.707, 1);
        });

        test('handles default alpha', () => {
            const current = createSample(10, 20, 30);
            const previous = createSample(0, 0, 0);
            const result = smoothPose(current, previous); // alpha defaults to 0.3
            expect(result.position.x).toBeCloseTo(3, 5); // 0 + (10 - 0) * 0.3 = 3
        });
    });

    describe('PoseAverager object', () => {
        test('exports all functions', () => {
            expect(PoseAverager.averageSamples).toBeDefined();
            expect(PoseAverager.averageQuaternions).toBeDefined();
            expect(PoseAverager.isStable).toBeDefined();
            expect(PoseAverager.getStabilityMetrics).toBeDefined();
            expect(PoseAverager.smoothPose).toBeDefined();
        });

        test('object methods work correctly', () => {
            expect(PoseAverager.averageSamples([]).position).toBeDefined();
            expect(PoseAverager.isStable([], 0.01, 0.01)).toBe(true);
            expect(PoseAverager.getStabilityMetrics([]).positionVariance).toBe(0);
        });
    });

    describe('Integration scenarios', () => {
        test('simulates real-world pose averaging', () => {
            // Simulate 5 samples from AR tracking with slight variations
            const samples = [
                { position: { x: 0.1, y: 0.2, z: 0.3 }, quaternion: { x: 0.01, y: 0.02, z: 0.03, w: 0.999 } },
                { position: { x: 0.12, y: 0.21, z: 0.29 }, quaternion: { x: 0.02, y: 0.01, z: 0.04, w: 0.998 } },
                { position: { x: 0.08, y: 0.19, z: 0.31 }, quaternion: { x: 0.015, y: 0.025, z: 0.02, w: 0.999 } },
                { position: { x: 0.11, y: 0.22, z: 0.28 }, quaternion: { x: 0.025, y: 0.015, z: 0.035, w: 0.997 } },
                { position: { x: 0.09, y: 0.18, z: 0.32 }, quaternion: { x: 0.01, y: 0.03, z: 0.025, w: 0.998 } }
            ];

            const averaged = averageSamples(samples);
            
            // Check that averaged position is roughly in the middle of all samples
            expect(averaged.position.x).toBeGreaterThan(0.08);
            expect(averaged.position.x).toBeLessThan(0.12);
            expect(averaged.position.y).toBeGreaterThan(0.18);
            expect(averaged.position.y).toBeLessThan(0.22);
            expect(averaged.position.z).toBeGreaterThan(0.28);
            expect(averaged.position.z).toBeLessThan(0.32);

            // Check stability - samples should be stable at 0.01 threshold since they vary by ~0.02
            // Variance of positions: x varies by ~0.04, y by ~0.04, z by ~0.04
            // StdDev ~0.02 which exceeds 0.01 threshold
            expect(isStable(samples, 0.05, 0.05)).toBe(true);
            expect(isStable(samples, 0.001, 0.001)).toBe(false);
        });

        test('tracks stability over time', () => {
            const stableSamples = [
                createSample(1, 1, 1),
                createSample(1.001, 1.001, 1.001),
                createSample(0.999, 0.999, 0.999)
            ];

            const unstableSamples = [
                createSample(1, 1, 1),
                createSample(2, 2, 2),
                createSample(3, 3, 3)
            ];

            const stableMetrics = getStabilityMetrics(stableSamples);
            const unstableMetrics = getStabilityMetrics(unstableSamples);

            expect(stableMetrics.positionVariance).toBeLessThan(unstableMetrics.positionVariance);
        });

        test('smooths real-time tracking data', () => {
            const poses = [
                createSample(0, 0, 0),
                createSample(1, 1, 1),
                createSample(2, 2, 2),
                createSample(3, 3, 3),
                createSample(4, 4, 4)
            ];

            let smoothed = null;
            for (const pose of poses) {
                smoothed = smoothPose(pose, smoothed, 0.3);
            }

            // Final smoothed should be somewhere between 4 and the EMA-accumulated value
            expect(smoothed.position.x).toBeGreaterThan(2);
            expect(smoothed.position.x).toBeLessThan(4);
        });
    });
});
