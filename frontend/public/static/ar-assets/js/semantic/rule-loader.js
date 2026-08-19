/**
 * RuleLoader - Semantic Rules Fetcher for AR Freeze Pose System
 * Loads and caches semantic rules from the backend API.
 *
 * MIGRATED: Now reads from /combos/by-set endpoint (unified ar_combinations collection)
 * instead of the deprecated /semantic-rules endpoint.
 */
class RuleLoader {
    /**
     * @param {Object} options - Configuration options
     * @param {string} [options.baseUrl='/api/v1'] - Base API URL
     * @param {number} [options.timeout=5000] - Request timeout in milliseconds
     */
    constructor(options = {}) {
        this._baseUrl = options.baseUrl || '/api/v1';
        this._timeout = options.timeout || 5000;
        this._cache = new Map();
        this._currentSet = null;
    }

    /**
     * Load semantic rules for a flashcard set.
     * Calls GET /combos/by-set?flashcard_set=xxx&active_only=true
     *
     * @param {string} flashcardSet - The flashcard set ID
     * @returns {Promise<Array>} Array of normalized rule objects
     */
    async loadRules(flashcardSet) {
        // Return cached rules if available
        if (this._cache.has(flashcardSet)) {
            return this._cache.get(flashcardSet);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this._timeout);

        try {
            // MIGRATED: Use /combos/by-set instead of /ar/semantic-rules
            const url = `${this._baseUrl}/combos/by-set?flashcard_set=${encodeURIComponent(flashcardSet)}&active_only=true`;
            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const rules = await response.json();

            // Normalize rules with defaults
            const normalized = rules.map(rule => ({
                ...rule,
                active: rule.active !== false,
                priority: rule.priority || 0,
                cards: Array.isArray(rule.required_tags) ? rule.required_tags : [],
            }));

            // Sort by priority (higher first)
            normalized.sort((a, b) => b.priority - a.priority);

            // Cache the normalized rules
            this._cache.set(flashcardSet, normalized);
            this._currentSet = flashcardSet;

            return normalized;
        } catch (error) {
            console.error('[RuleLoader] Failed to load rules:', error);
            return [];
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Reload rules for the current flashcard set
     * @returns {Promise<Array>} Array of normalized rule objects
     */
    async reloadRules() {
        if (this._currentSet) {
            this._cache.delete(this._currentSet);
            return this.loadRules(this._currentSet);
        }
        return [];
    }

    /**
     * Get cached rules without fetching
     * @param {string} flashcardSet - The flashcard set ID
     * @returns {Array|null} Cached rules or null if not cached
     */
    getCachedRules(flashcardSet) {
        return this._cache.get(flashcardSet) || null;
    }

    /**
     * Clear all cached rules
     */
    clearCache() {
        this._cache.clear();
        this._currentSet = null;
    }

    /**
     * Check if rules are cached for a flashcard set
     * @param {string} flashcardSet - The flashcard set ID
     * @returns {boolean} True if rules are cached
     */
    hasCachedRules(flashcardSet) {
        return this._cache.has(flashcardSet);
    }

    /**
     * Get list of cached flashcard set IDs
     * @returns {Array<string>} Array of cached set IDs
     */
    getCachedSetIds() {
        return Array.from(this._cache.keys());
    }
}

// ES Module export
export { RuleLoader };
