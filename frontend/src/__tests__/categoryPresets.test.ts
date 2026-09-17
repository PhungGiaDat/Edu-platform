import { describe, expect, it } from 'vitest';
import { CATEGORY_PRESETS, DEFAULT_CATEGORY_PRESET, getCategoryPreset } from '@/features/learning-path/categoryPresets';

describe('getCategoryPreset', () => {
  it.each(Object.keys(CATEGORY_PRESETS))('resolves a distinct preset for known category "%s"', (key) => {
    expect(getCategoryPreset(key)).toBe(CATEGORY_PRESETS[key]);
  });

  it('falls back to the default preset for an unknown category_key', () => {
    expect(getCategoryPreset('some_future_category')).toBe(DEFAULT_CATEGORY_PRESET);
  });

  it('falls back to the default preset for null/undefined (never throws)', () => {
    expect(getCategoryPreset(null)).toBe(DEFAULT_CATEGORY_PRESET);
    expect(getCategoryPreset(undefined)).toBe(DEFAULT_CATEGORY_PRESET);
  });

  it('every preset stays presentation-only data (no progression/business fields)', () => {
    for (const preset of Object.values(CATEGORY_PRESETS)) {
      expect(preset).not.toHaveProperty('unlock');
      expect(preset).not.toHaveProperty('progress');
      expect(preset).not.toHaveProperty('state');
      expect(typeof preset.propShape).toBe('string');
    }
  });
});
