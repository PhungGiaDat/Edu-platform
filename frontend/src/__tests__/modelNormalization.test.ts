import { describe, expect, it } from 'vitest';
import { computeGroundedOffset, computeNormalizationScale } from '@/features/learning-path/modelNormalization';

describe('computeNormalizationScale', () => {
  it('shrinks a much-too-large model down to the target height', () => {
    expect(computeNormalizationScale(100, 1.4)).toBeCloseTo(0.014);
  });

  it('grows a much-too-small model up to the target height', () => {
    expect(computeNormalizationScale(0.01, 1.4)).toBeCloseTo(140);
  });

  it('returns scale 1 unchanged when source already equals target', () => {
    expect(computeNormalizationScale(1.4, 1.4)).toBeCloseTo(1);
  });

  it('falls back to scale 1 for a degenerate (zero/negative) source height instead of dividing by zero', () => {
    expect(computeNormalizationScale(0, 1.4)).toBe(1);
    expect(computeNormalizationScale(-3, 1.4)).toBe(1);
  });
});

describe('computeGroundedOffset', () => {
  it('centers horizontally and plants the lowest point at y=0', () => {
    const offset = computeGroundedOffset(2, -0.6, -5);
    expect(offset).toEqual({ x: -2, y: 0.6, z: 5 });
  });

  it('is a no-op when already centered and grounded', () => {
    expect(computeGroundedOffset(0, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });
});
