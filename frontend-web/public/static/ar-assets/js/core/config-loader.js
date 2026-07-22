/**
 * ConfigLoader - AR Stability Configuration Manager
 * Loads and caches stability configuration from backend API
 * Used by the AR Stability System for configuring pose detection thresholds
 */

import { MathUtils } from './math-utils.js';

const DEFAULT_CONFIG = {
    positionThreshold: 0.02,   // 2cm
    rotationThreshold: 0.1,     // ~6°
    requiredFrames: 15,
    environment: 'indoor'
};

/**
 * ConfigLoader class for managing AR stability configuration
 * Handles loading from API with caching and fallback to defaults
 */
class ConfigLoader {
    /**
     * Create a new ConfigLoader instance
     */
    constructor() {
        this._cache = new Map();
        this._defaults = { ...DEFAULT_CONFIG };
    }

    /**
     * Load stability configuration from backend API
     * @param {Object} options - Configuration options
     * @param {string} options.environment - Environment type ('indoor' or 'outdoor')
     * @returns {Promise<Object>} Stability configuration object
     */
    async loadStabilityConfig(options = {}) {
        const environment = options.environment || 'indoor';
        const cacheKey = `stability-${environment}`;
        
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }

        try {
            const response = await fetch(`/api/v1/ar/stability-config?environment=${environment}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const config = await response.json();
            const mergedConfig = { ...this._defaults, ...config };
            this._cache.set(cacheKey, mergedConfig);
            return mergedConfig;
        } catch (error) {
            console.warn('[ConfigLoader] Failed to fetch config, using defaults:', error);
            return { ...this._defaults, environment };
        }
    }

    /**
     * Clear all cached configurations
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Get default configuration without making API call
     * @returns {Object} Default stability configuration
     */
    getDefaults() {
        return { ...this._defaults };
    }

    /**
     * Check if a configuration is cached for given environment
     * @param {string} environment - Environment type
     * @returns {boolean} True if cached
     */
    isCached(environment = 'indoor') {
        return this._cache.has(`stability-${environment}`);
    }
}

const ConfigLoaderInstance = new ConfigLoader();

export { ConfigLoader, ConfigLoaderInstance, DEFAULT_CONFIG };
export default ConfigLoader;
