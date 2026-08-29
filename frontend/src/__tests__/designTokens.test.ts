// frontend/src/__tests__/designTokens.test.ts
import { describe, it, expect } from 'vitest';
import { brandColors } from '../design-tokens/claymorphic';

describe('learner brand palette (approved 2026-08-28 spec)', () => {
  it('exposes the exact approved hex values', () => {
    expect(brandColors.primary).toBe('#2563EB');
    expect(brandColors.secondary).toBe('#7C3AED');
    expect(brandColors.accent).toBe('#F59E0B');
    expect(brandColors.background).toBe('#EFF6FF');
    expect(brandColors.foreground).toBe('#0F172A');
  });
});
