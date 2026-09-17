/**
 * categoryPresets.ts
 *
 * PRESENTATION-ONLY visual presets keyed by selectedCourse.category_key.
 * Never put progression/business rules here — this only decides colors and
 * which low-poly prop shape decorates the environment.
 */

export type PropShape = 'tree' | 'house' | 'schoolBlock' | 'flower';

export interface CategoryPreset {
  /** Sky gradient */
  skyTop: string;
  skyBottom: string;
  /** Ground/hills */
  grassHill: string;
  grassDark: string;
  /** Decorative prop color + shape scattered along the path edges */
  propColor: string;
  propAccent: string;
  propShape: PropShape;
}

export const CATEGORY_PRESETS: Record<string, CategoryPreset> = {
  animals: {
    skyTop: '#8FD3FF',
    skyBottom: '#F2FBE8',
    grassHill: '#C8EAA0',
    grassDark: '#9FCB6E',
    propColor: '#FF9F6B',
    propAccent: '#FFD166',
    propShape: 'flower',
  },
  home_family: {
    skyTop: '#FBD9A5',
    skyBottom: '#FFF3DE',
    grassHill: '#CFE4A8',
    grassDark: '#A9C97F',
    propColor: '#E8927C',
    propAccent: '#F6C87A',
    propShape: 'house',
  },
  nature: {
    skyTop: '#87CEEB',
    skyBottom: '#E0F4FF',
    grassHill: '#B8E6B8',
    grassDark: '#8FBC8F',
    propColor: '#8B4513',
    propAccent: '#228B22',
    propShape: 'tree',
  },
  school_food: {
    skyTop: '#BFE3FF',
    skyBottom: '#FFF7E6',
    grassHill: '#D7EAA6',
    grassDark: '#AECB78',
    propColor: '#6FA8DC',
    propAccent: '#FFB6C1',
    propShape: 'schoolBlock',
  },
};

export const DEFAULT_CATEGORY_PRESET: CategoryPreset = CATEGORY_PRESETS.nature;

export function getCategoryPreset(categoryKey: string | undefined | null): CategoryPreset {
  if (!categoryKey) return DEFAULT_CATEGORY_PRESET;
  return CATEGORY_PRESETS[categoryKey] ?? DEFAULT_CATEGORY_PRESET;
}
