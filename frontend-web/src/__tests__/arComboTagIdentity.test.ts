// frontend-web/src/__tests__/arComboTagIdentity.test.ts
/**
 * Task 10: Tests for combo resolution by tag sets.
 *
 * Verifies that:
 * - `sameTagSet` correctly compares unordered tag arrays
 * - `resolveComboByTags` activates combos regardless of scan order
 * - Combos do NOT use combo_mind_url or target_order for tracking
 */
import { describe, it, expect } from 'vitest';
import { sameTagSet, resolveComboByTags } from '@/hooks/useMultiFlashcard';

// ─── Test helpers ────────────────────────────────────────────────────────────

// Minimal ActiveViewerTarget shape used by resolveComboByTags
interface TestTarget {
    arTag: string;
    modelUrl?: string;
    word?: string;
}

// Minimal ComboData shape used by resolveComboByTags
interface TestCombo {
    comboId: string;
    requiredTags: string[];
    // These fields should NOT be used by resolveComboByTags
    combo_mind_url?: string;
    target_order?: string[];
    mindUrl?: string;
    modelUrl?: string;
}

// ─── sameTagSet tests ─────────────────────────────────────────────────────────

describe('sameTagSet', () => {
    it('returns true for identical unordered sets', () => {
        expect(sameTagSet(['a', 'b'], ['b', 'a'])).toBe(true);
    });

    it('returns true for single-element identical sets', () => {
        expect(sameTagSet(['x'], ['x'])).toBe(true);
    });

    it('returns true for empty sets', () => {
        expect(sameTagSet([], [])).toBe(true);
    });

    it('returns true for duplicate elements in both sets', () => {
        expect(sameTagSet(['x', 'x'], ['x', 'x'])).toBe(true);
    });

    it('returns false for different lengths', () => {
        expect(sameTagSet(['a'], ['a', 'b'])).toBe(false);
        expect(sameTagSet(['a', 'b'], ['a'])).toBe(false);
    });

    it('returns false for same length different elements', () => {
        expect(sameTagSet(['a', 'b'], ['a', 'c'])).toBe(false);
    });

    it('returns false for same length different order non-matching', () => {
        expect(sameTagSet(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true); // same set, reordered
        expect(sameTagSet(['a', 'b', 'c'], ['c', 'a', 'd'])).toBe(false); // different element
    });

    it('returns false when one set has extra duplicate', () => {
        expect(sameTagSet(['a', 'a'], ['a'])).toBe(false);
        expect(sameTagSet(['a'], ['a', 'a'])).toBe(false);
    });
});

// ─── resolveComboByTags tests ─────────────────────────────────────────────────

describe('resolveComboByTags', () => {
    const elephantTag: TestTarget = {
        arTag: 'elephant_marker_01',
        modelUrl: '/elephant.glb',
        word: 'elephant',
    };
    const jungleTag: TestTarget = {
        arTag: 'jungle_marker_01',
        modelUrl: '/jungle.glb',
        word: 'jungle',
    };
    const fishTag: TestTarget = {
        arTag: 'fish_marker_01',
        modelUrl: '/fish.glb',
        word: 'fish',
    };
    const oceanTag: TestTarget = {
        arTag: 'ocean_marker_01',
        modelUrl: '/ocean.glb',
        word: 'ocean',
    };

    const jungleCombo: TestCombo = {
        comboId: 'jungle_scene_v1',
        requiredTags: ['elephant_marker_01', 'jungle_marker_01'],
    };
    const oceanCombo: TestCombo = {
        comboId: 'ocean_scene_v1',
        requiredTags: ['fish_marker_01', 'ocean_marker_01'],
    };

    it('activates jungle combo when elephant scanned first', () => {
        const result = resolveComboByTags([elephantTag, jungleTag], jungleCombo);
        expect(result).not.toBeNull();
        expect(result?.comboId).toBe('jungle_scene_v1');
    });

    it('activates jungle combo when jungle scanned first', () => {
        const result = resolveComboByTags([jungleTag, elephantTag], jungleCombo);
        expect(result).not.toBeNull();
        expect(result?.comboId).toBe('jungle_scene_v1');
    });

    it.each([
        ['elephant-first', [elephantTag, jungleTag]],
        ['jungle-first', [jungleTag, elephantTag]],
    ] as const)('activates the same combo in %s order', (_label, targets) => {
        expect(resolveComboByTags(targets, jungleCombo)?.comboId).toBe('jungle_scene_v1');
    });

    it('does not activate wrong combo', () => {
        const result = resolveComboByTags([elephantTag, jungleTag], oceanCombo);
        expect(result).toBeNull();
    });

    it('does not activate when only one matching tag present', () => {
        const result = resolveComboByTags([elephantTag], jungleCombo);
        expect(result).toBeNull();
    });

    it('does not activate with extra unrelated tags', () => {
        const extraTag: TestTarget = {
            arTag: 'extra_marker_01',
            modelUrl: '/extra.glb',
            word: 'extra',
        };
        const result = resolveComboByTags([elephantTag, jungleTag, extraTag], jungleCombo);
        expect(result).toBeNull(); // 3 tags vs 2 required — mismatch
    });

    it('does not use combo_mind_url for tracking', () => {
        const comboWithMindUrl: TestCombo = {
            comboId: 'jungle_scene_v1',
            requiredTags: ['elephant_marker_01', 'jungle_marker_01'],
            combo_mind_url: 'https://example.com/combo.mind',
        };
        const result = resolveComboByTags([elephantTag, jungleTag], comboWithMindUrl);
        expect(result).not.toBeNull();
        expect(result).not.toHaveProperty('mindUrl');
        expect(result).not.toHaveProperty('combo_mind_url');
    });

    it('does not use target_order for tracking', () => {
        const comboWithOrder: TestCombo = {
            comboId: 'jungle_scene_v1',
            requiredTags: ['elephant_marker_01', 'jungle_marker_01'],
            target_order: ['elephant_marker_01', 'jungle_marker_01'],
        };
        const result = resolveComboByTags([elephantTag, jungleTag], comboWithOrder);
        expect(result).not.toBeNull();
        expect(result).not.toHaveProperty('targetOrder');
        expect(result).not.toHaveProperty('target_order');
    });

    it('returns only comboId (no MindAR runtime fields)', () => {
        const comboWithAllFields: TestCombo = {
            comboId: 'jungle_scene_v1',
            requiredTags: ['elephant_marker_01', 'jungle_marker_01'],
            combo_mind_url: 'https://example.com/combo.mind',
            target_order: ['elephant_marker_01', 'jungle_marker_01'],
            mindUrl: 'https://example.com/individual.mind',
            modelUrl: '/combo.glb',
        };
        const result = resolveComboByTags([elephantTag, jungleTag], comboWithAllFields);
        expect(result).not.toBeNull();
        expect(result).toEqual({ comboId: 'jungle_scene_v1' });
    });

    it('activates ocean combo regardless of scan order', () => {
        expect(resolveComboByTags([fishTag, oceanTag], oceanCombo)?.comboId).toBe('ocean_scene_v1');
        expect(resolveComboByTags([oceanTag, fishTag], oceanCombo)?.comboId).toBe('ocean_scene_v1');
    });
});
