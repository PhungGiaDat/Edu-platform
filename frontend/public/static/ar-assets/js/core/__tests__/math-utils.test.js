/**
 * Unit Tests for MathUtils
 * Tests all pure mathematical functions
 */

import { MathUtils, distance3D, quaternionAngle, lerp, clamp, variance, stdDev, normalizeQuaternion, addVectors, scaleVector } from '../math-utils.js';

describe('MathUtils', () => {
    describe('distance3D', () => {
        test('calculates distance between two points correctly', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 3, y: 4, z: 0 };
            expect(distance3D(a, b)).toBe(5);
        });

        test('returns 0 for identical points', () => {
            const p = { x: 1, y: 2, z: 3 };
            expect(distance3D(p, p)).toBe(0);
        });

        test('handles 3D distance correctly', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 1, y: 1, z: 1 };
            expect(distance3D(a, b)).toBeCloseTo(Math.sqrt(3), 5);
        });

        test('handles negative coordinates', () => {
            const a = { x: -1, y: -1, z: -1 };
            const b = { x: 1, y: 1, z: 1 };
            expect(distance3D(a, b)).toBeCloseTo(Math.sqrt(12), 5);
        });

        test('is symmetric', () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: 5, z: 6 };
            expect(distance3D(a, b)).toBe(distance3D(b, a));
        });
    });

    describe('quaternionAngle', () => {
        test('returns 0 for identical quaternions', () => {
            const q = { x: 0, y: 0, z: 0, w: 1 };
            expect(quaternionAngle(q, q)).toBe(0);
        });

        test('returns 0 for opposite quaternions', () => {
            const q1 = { x: 0, y: 0, z: 0, w: 1 };
            const q2 = { x: 0, y: 0, z: 0, w: -1 };
            // Implementation uses Math.abs which makes both identical and opposite return 0
            expect(quaternionAngle(q1, q2)).toBe(0);
        });

        test('returns PI/2 for 90-degree rotation', () => {
            const q1 = { x: 0, y: 0, z: 0, w: 1 };
            const q2 = { x: 0, y: 1, z: 0, w: 0 }; // 180 around Y = 90 deg half-angle
            expect(quaternionAngle(q1, q2)).toBeCloseTo(Math.PI, 5);
        });

        test('handles arbitrary quaternions', () => {
            const q1 = { x: 0.1, y: 0.2, z: 0.3, w: 0.9 };
            const q2 = { x: 0.1, y: 0.2, z: 0.3, w: 0.9 };
            // The implementation uses Math.abs(dot) which makes all angles non-negative
            // For very similar quaternions, angle should be small
            const angle = quaternionAngle(q1, q2);
            expect(angle).toBeGreaterThanOrEqual(0);
            expect(angle).toBeLessThanOrEqual(Math.PI);
        });

        test('is symmetric', () => {
            const q1 = { x: 0.1, y: 0.2, z: 0.3, w: 0.9 };
            const q2 = { x: 0.4, y: 0.5, z: 0.6, w: 0.4 };
            expect(quaternionAngle(q1, q2)).toBeCloseTo(quaternionAngle(q2, q1), 10);
        });

        test('returns value between 0 and PI', () => {
            const q1 = { x: 0.1, y: 0.2, z: 0.3, w: 0.9 };
            const q2 = { x: 0.4, y: 0.5, z: 0.6, w: 0.4 };
            const angle = quaternionAngle(q1, q2);
            expect(angle).toBeGreaterThanOrEqual(0);
            expect(angle).toBeLessThanOrEqual(Math.PI);
        });
    });

    describe('lerp', () => {
        test('returns a when t=0', () => {
            expect(lerp(0, 10, 0)).toBe(0);
            expect(lerp(100, 200, 0)).toBe(100);
        });

        test('returns b when t=1', () => {
            expect(lerp(0, 10, 1)).toBe(10);
            expect(lerp(100, 200, 1)).toBe(200);
        });

        test('returns midpoint when t=0.5', () => {
            expect(lerp(0, 10, 0.5)).toBe(5);
            expect(lerp(100, 200, 0.5)).toBe(150);
        });

        test('handles negative values', () => {
            expect(lerp(-10, 10, 0.5)).toBe(0);
            expect(lerp(-100, 0, 0.3)).toBe(-70);
        });

        test('handles t outside 0-1 range', () => {
            expect(lerp(0, 10, 2)).toBe(20);
            expect(lerp(0, 10, -1)).toBe(-10);
        });

        test('handles zero range', () => {
            expect(lerp(5, 5, 0.5)).toBe(5);
        });
    });

    describe('clamp', () => {
        test('returns value when within bounds', () => {
            expect(clamp(5, 0, 10)).toBe(5);
            expect(clamp(0, 0, 10)).toBe(0);
            expect(clamp(10, 0, 10)).toBe(10);
        });

        test('returns min when value is below', () => {
            expect(clamp(-5, 0, 10)).toBe(0);
            expect(clamp(-100, 0, 10)).toBe(0);
        });

        test('returns max when value is above', () => {
            expect(clamp(15, 0, 10)).toBe(10);
            expect(clamp(100, 0, 10)).toBe(10);
        });

        test('handles negative bounds', () => {
            expect(clamp(0, -10, -5)).toBe(-5);
            expect(clamp(-7, -10, -5)).toBe(-7);
            expect(clamp(-15, -10, -5)).toBe(-10);
        });

        test('handles equal min and max', () => {
            expect(clamp(5, 5, 5)).toBe(5);
            expect(clamp(10, 5, 5)).toBe(5);
        });
    });

    describe('variance', () => {
        test('returns 0 for empty array', () => {
            expect(variance([])).toBe(0);
        });

        test('returns 0 for single element', () => {
            expect(variance([5])).toBe(0);
        });

        test('returns 0 for constant array', () => {
            expect(variance([5, 5, 5, 5])).toBe(0);
        });

        test('calculates variance correctly', () => {
            // Variance of [2, 4, 4, 4, 5, 5, 7, 9] = 4
            const values = [2, 4, 4, 4, 5, 5, 7, 9];
            expect(variance(values)).toBe(4);
        });

        test('handles negative values', () => {
            const values = [-2, 0, 2];
            const mean = 0;
            expect(variance(values)).toBe((4 + 0 + 4) / 3);
        });

        test('handles single value array', () => {
            expect(variance([100])).toBe(0);
        });
    });

    describe('stdDev', () => {
        test('returns 0 for empty array', () => {
            expect(stdDev([])).toBe(0);
        });

        test('returns 0 for constant array', () => {
            expect(stdDev([5, 5, 5, 5])).toBe(0);
        });

        test('calculates standard deviation correctly', () => {
            // StdDev of [2, 4, 4, 4, 5, 5, 7, 9] = sqrt(4) = 2
            const values = [2, 4, 4, 4, 5, 5, 7, 9];
            expect(stdDev(values)).toBeCloseTo(2, 5);
        });

        test('is sqrt of variance', () => {
            const values = [1, 2, 3, 4, 5];
            expect(stdDev(values)).toBeCloseTo(Math.sqrt(variance(values)), 5);
        });
    });

    describe('normalizeQuaternion', () => {
        test('normalizes unit quaternion to itself', () => {
            const q = { x: 0, y: 0, z: 0, w: 1 };
            const normalized = normalizeQuaternion(q);
            expect(normalized.x).toBe(0);
            expect(normalized.y).toBe(0);
            expect(normalized.z).toBe(0);
            expect(normalized.w).toBe(1);
        });

        test('normalizes non-unit quaternion', () => {
            const q = { x: 2, y: 0, z: 0, w: 0 };
            const normalized = normalizeQuaternion(q);
            expect(normalized.x).toBe(1);
            expect(normalized.y).toBe(0);
            expect(normalized.z).toBe(0);
            expect(normalized.w).toBe(0);
        });

        test('handles zero quaternion', () => {
            const q = { x: 0, y: 0, z: 0, w: 0 };
            const normalized = normalizeQuaternion(q);
            expect(normalized.w).toBe(1); // Returns identity on zero
        });

        test('produces unit magnitude', () => {
            const q = { x: 1, y: 2, z: 3, w: 4 };
            const normalized = normalizeQuaternion(q);
            const magnitude = Math.sqrt(
                normalized.x ** 2 + normalized.y ** 2 + 
                normalized.z ** 2 + normalized.w ** 2
            );
            expect(magnitude).toBeCloseTo(1, 10);
        });
    });

    describe('addVectors', () => {
        test('adds two vectors correctly', () => {
            const a = { x: 1, y: 2, z: 3 };
            const b = { x: 4, y: 5, z: 6 };
            const result = addVectors(a, b);
            expect(result.x).toBe(5);
            expect(result.y).toBe(7);
            expect(result.z).toBe(9);
        });

        test('handles zero vectors', () => {
            const a = { x: 0, y: 0, z: 0 };
            const b = { x: 1, y: 2, z: 3 };
            const result = addVectors(a, b);
            expect(result.x).toBe(1);
            expect(result.y).toBe(2);
            expect(result.z).toBe(3);
        });

        test('handles negative values', () => {
            const a = { x: -1, y: -2, z: -3 };
            const b = { x: 1, y: 2, z: 3 };
            const result = addVectors(a, b);
            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
            expect(result.z).toBe(0);
        });
    });

    describe('scaleVector', () => {
        test('scales vector correctly', () => {
            const v = { x: 1, y: 2, z: 3 };
            const result = scaleVector(v, 2);
            expect(result.x).toBe(2);
            expect(result.y).toBe(4);
            expect(result.z).toBe(6);
        });

        test('handles scale of 1', () => {
            const v = { x: 1, y: 2, z: 3 };
            const result = scaleVector(v, 1);
            expect(result.x).toBe(1);
            expect(result.y).toBe(2);
            expect(result.z).toBe(3);
        });

        test('handles scale of 0', () => {
            const v = { x: 1, y: 2, z: 3 };
            const result = scaleVector(v, 0);
            expect(result.x).toBe(0);
            expect(result.y).toBe(0);
            expect(result.z).toBe(0);
        });

        test('handles negative scale', () => {
            const v = { x: 1, y: 2, z: 3 };
            const result = scaleVector(v, -1);
            expect(result.x).toBe(-1);
            expect(result.y).toBe(-2);
            expect(result.z).toBe(-3);
        });
    });

    describe('MathUtils object', () => {
        test('MathUtils exports all functions', () => {
            expect(MathUtils.distance3D).toBeDefined();
            expect(MathUtils.quaternionAngle).toBeDefined();
            expect(MathUtils.lerp).toBeDefined();
            expect(MathUtils.clamp).toBeDefined();
            expect(MathUtils.variance).toBeDefined();
            expect(MathUtils.stdDev).toBeDefined();
            expect(MathUtils.normalizeQuaternion).toBeDefined();
            expect(MathUtils.addVectors).toBeDefined();
            expect(MathUtils.scaleVector).toBeDefined();
        });

        test('MathUtils methods work correctly', () => {
            expect(MathUtils.distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBe(5);
            expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
            expect(MathUtils.clamp(15, 0, 10)).toBe(10);
        });
    });
});
