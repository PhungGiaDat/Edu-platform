// frontend/src/__tests__/pages/admin/gameEditorPreset.test.ts
/**
 * Preset → config mapping tests (spec §3b — user-approved 2026-09-09).
 * The teacher-facing Dễ/Vừa/Khó presets are a frontend-only transform;
 * these tests pin the exact config values sent to the API.
 */
import { describe, it, expect } from 'vitest';
import { DIFFICULTY_PRESETS } from '../../../pages/admin/GameEditor';

describe('DIFFICULTY_PRESETS mapping (spec §3.2 revised)', () => {
  it('catch_word: fall_speed/spawn_interval per preset', () => {
    expect(DIFFICULTY_PRESETS.catch_word.easy).toEqual({ fall_speed: 0.8, spawn_interval: 1200 });
    expect(DIFFICULTY_PRESETS.catch_word.mid).toEqual({ fall_speed: 1.2, spawn_interval: 800 });
    expect(DIFFICULTY_PRESETS.catch_word.hard).toEqual({ fall_speed: 1.6, spawn_interval: 500 });
  });

  it('drag_match: pair_count/timer_seconds per preset', () => {
    expect(DIFFICULTY_PRESETS.drag_match.easy).toEqual({ pair_count: 4, timer_seconds: 120 });
    expect(DIFFICULTY_PRESETS.drag_match.mid).toEqual({ pair_count: 6, timer_seconds: 90 });
    expect(DIFFICULTY_PRESETS.drag_match.hard).toEqual({ pair_count: 8, timer_seconds: 60 });
  });

  it('memory_match: pair_count/flip_duration_ms per preset', () => {
    expect(DIFFICULTY_PRESETS.memory_match.easy).toEqual({ pair_count: 4, flip_duration_ms: 1500 });
    expect(DIFFICULTY_PRESETS.memory_match.mid).toEqual({ pair_count: 6, flip_duration_ms: 1000 });
    expect(DIFFICULTY_PRESETS.memory_match.hard).toEqual({ pair_count: 8, flip_duration_ms: 600 });
  });

  it('word_scramble: word_count/hint_letters per preset', () => {
    expect(DIFFICULTY_PRESETS.word_scramble.easy).toEqual({ word_count: 5, hint_letters: 3 });
    expect(DIFFICULTY_PRESETS.word_scramble.mid).toEqual({ word_count: 8, hint_letters: 2 });
    expect(DIFFICULTY_PRESETS.word_scramble.hard).toEqual({ word_count: 10, hint_letters: 1 });
  });

  it('every engine defines all three presets with matching config keys', () => {
    (Object.keys(DIFFICULTY_PRESETS) as (keyof typeof DIFFICULTY_PRESETS)[]).forEach((engine) => {
      const presets = DIFFICULTY_PRESETS[engine];
      expect(Object.keys(presets).sort()).toEqual(['easy', 'hard', 'mid']);
      const keySets = Object.values(presets).map(p => Object.keys(p).sort().join(','));
      expect(new Set(keySets).size).toBe(1); // same config keys across presets
    });
  });
});
