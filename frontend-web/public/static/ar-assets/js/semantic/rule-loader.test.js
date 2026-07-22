/**
 * RuleLoader Test Suite
 * Tests for the semantic rules fetcher module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RuleLoader } from './rule-loader.js';

describe('RuleLoader', () => {
    let ruleLoader;
    let fetchMock;

    beforeEach(() => {
        // Default baseUrl is now /api/v1 (not /api/v1/ar)
        ruleLoader = new RuleLoader({
            baseUrl: '/api/v1',
            timeout: 5000
        });

        // Mock fetch
        fetchMock = vi.fn();
        global.fetch = fetchMock;
    });

    afterEach(() => {
        ruleLoader.clearCache();
    });

    describe('constructor', () => {
        it('should use default values when no options provided', () => {
            const loader = new RuleLoader();
            expect(loader._baseUrl).toBe('/api/v1');
            expect(loader._timeout).toBe(5000);
        });

        it('should use custom options when provided', () => {
            const loader = new RuleLoader({
                baseUrl: '/custom/api',
                timeout: 10000
            });
            expect(loader._baseUrl).toBe('/custom/api');
            expect(loader._timeout).toBe(10000);
        });

        it('should initialize with empty cache', () => {
            expect(ruleLoader._cache.size).toBe(0);
            expect(ruleLoader._currentSet).toBeNull();
        });
    });

    describe('loadRules', () => {
        // MIGRATED: Response now comes from ar_combinations with these fields:
        // required_tags (not cards), semantic_result (not result), flashcard_set (not flashcardSet)
        const mockRules = [
            {
                combo_id: 'rule1',
                required_tags: ['card1', 'card2'],
                semantic_result: 'combo_jungle',
                animation: 'jungle_entrance',
                sound: '/audio/jungle.mp3',
                phrase: 'Jungle Combo!',
                priority: 10,
                active: true,
                flashcard_set: 'set001'
            },
            {
                combo_id: 'rule2',
                required_tags: ['card3', 'card4'],
                semantic_result: 'spawn_coin',
                animation: 'coin_spawn',
                priority: 5,
                active: false,
                flashcard_set: 'set001'
            }
        ];

        it('should fetch rules from the migrated /combos/by-set endpoint', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockRules)
            });

            const rules = await ruleLoader.loadRules('set001');

            // MIGRATED: calls /combos/by-set with flashcard_set query param
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/v1/combos/by-set?flashcard_set=set001&active_only=true',
                expect.objectContaining({ signal: expect.any(AbortSignal) })
            );
            expect(rules).toHaveLength(2);
        });

        it('should return cached rules on subsequent calls', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockRules)
            });

            await ruleLoader.loadRules('set001');
            await ruleLoader.loadRules('set001');

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('should normalize rules with defaults', async () => {
            // MIGRATED: uses required_tags (from ar_combinations), not cards
            const rulesWithMissingFields = [
                { combo_id: 'rule1', required_tags: ['card1'], semantic_result: 'combo_jungle', animation: 'test' }
            ];

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(rulesWithMissingFields)
            });

            const rules = await ruleLoader.loadRules('set001');

            expect(rules[0].active).toBe(true);
            expect(rules[0].priority).toBe(0);
            expect(rules[0].cards).toEqual(['card1']);  // normalized to cards
        });

        it('should handle non-array required_tags field', async () => {
            // MIGRATED: normalized to cards regardless of source field name
            const rulesWithInvalidTags = [
                { combo_id: 'rule1', required_tags: 'not-an-array', semantic_result: 'combo_jungle', animation: 'test' }
            ];

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(rulesWithInvalidTags)
            });

            const rules = await ruleLoader.loadRules('set001');

            expect(rules[0].cards).toEqual([]);  // normalized to empty array
        });

        it('should sort rules by priority (descending)', async () => {
            // MIGRATED: uses required_tags from ar_combinations
            const unsortedRules = [
                { combo_id: 'rule1', required_tags: ['c1'], semantic_result: 'a', animation: 'a', priority: 5 },
                { combo_id: 'rule2', required_tags: ['c2'], semantic_result: 'b', animation: 'b', priority: 10 },
                { combo_id: 'rule3', required_tags: ['c3'], semantic_result: 'c', animation: 'c', priority: 1 }
            ];
            
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(unsortedRules)
            });

            const rules = await ruleLoader.loadRules('set001');

            expect(rules[0].priority).toBe(10);
            expect(rules[1].priority).toBe(5);
            expect(rules[2].priority).toBe(1);
        });

        it('should return empty array on fetch error', async () => {
            fetchMock.mockRejectedValueOnce(new Error('Network error'));

            const rules = await ruleLoader.loadRules('set001');

            expect(rules).toEqual([]);
        });

        it('should return empty array on non-ok response', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const rules = await ruleLoader.loadRules('set001');

            expect(rules).toEqual([]);
        });

        it('should set currentSet after loading', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockRules)
            });

            await ruleLoader.loadRules('set001');

            expect(ruleLoader._currentSet).toBe('set001');
        });
    });

    describe('reloadRules', () => {
        it('should reload rules for current set', async () => {
            // MIGRATED: uses combo_id from ar_combinations
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ combo_id: 'rule1' }])
            });

            await ruleLoader.loadRules('set001');

            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ combo_id: 'rule2' }])
            });

            const rules = await ruleLoader.reloadRules();

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(rules[0].combo_id).toBe('rule2');  // migrated field name
        });

        it('should return empty array if no current set', async () => {
            const rules = await ruleLoader.reloadRules();
            expect(rules).toEqual([]);
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('getCachedRules', () => {
        it('should return cached rules if available', async () => {
            // MIGRATED: uses combo_id from ar_combinations
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ combo_id: 'cached' }])
            });

            await ruleLoader.loadRules('set001');
            const cached = ruleLoader.getCachedRules('set001');

            expect(cached).toHaveLength(1);
            expect(cached[0].combo_id).toBe('cached');  // migrated field name
        });

        it('should return null if not cached', () => {
            const cached = ruleLoader.getCachedRules('nonexistent');
            expect(cached).toBeNull();
        });
    });

    describe('clearCache', () => {
        it('should clear all cached rules', async () => {
            // MIGRATED: uses combo_id from ar_combinations
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ combo_id: 'rule1' }])
            });

            await ruleLoader.loadRules('set001');
            expect(ruleLoader._cache.size).toBe(1);

            ruleLoader.clearCache();
            expect(ruleLoader._cache.size).toBe(0);
            expect(ruleLoader._currentSet).toBeNull();
        });
    });

    describe('hasCachedRules', () => {
        it('should return true for cached set', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });

            await ruleLoader.loadRules('set001');
            expect(ruleLoader.hasCachedRules('set001')).toBe(true);
        });

        it('should return false for non-cached set', () => {
            expect(ruleLoader.hasCachedRules('nonexistent')).toBe(false);
        });
    });

    describe('getCachedSetIds', () => {
        it('should return all cached set IDs', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([])
            });

            await ruleLoader.loadRules('set001');
            await ruleLoader.loadRules('set002');

            const ids = ruleLoader.getCachedSetIds();
            expect(ids).toContain('set001');
            expect(ids).toContain('set002');
        });
    });
});
