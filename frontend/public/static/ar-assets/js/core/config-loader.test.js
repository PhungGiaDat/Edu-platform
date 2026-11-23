/**
 * ConfigLoader Test Suite
 * Tests for AR stability configuration loading and caching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigLoader, DEFAULT_CONFIG } from './config-loader.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('ConfigLoader', () => {
    let loader;

    beforeEach(() => {
        loader = new ConfigLoader();
        global.fetch.mockReset();
    });

    describe('constructor', () => {
        it('should initialize with empty cache', () => {
            expect(loader._cache.size).toBe(0);
        });

        it('should have default configuration', () => {
            expect(loader._defaults).toEqual(DEFAULT_CONFIG);
        });
    });

    describe('loadStabilityConfig', () => {
        it('should return default config when fetch fails', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));
            
            const config = await loader.loadStabilityConfig({ environment: 'indoor' });
            
            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it('should return default config when response is not ok', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });
            
            const config = await loader.loadStabilityConfig({ environment: 'indoor' });
            
            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it('should merge API response with defaults', async () => {
            const apiConfig = { positionThreshold: 0.03, rotationThreshold: 0.2 };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => apiConfig
            });
            
            const config = await loader.loadStabilityConfig({ environment: 'indoor' });
            
            expect(config.positionThreshold).toBe(0.03);
            expect(config.rotationThreshold).toBe(0.2);
            expect(config.requiredFrames).toBe(DEFAULT_CONFIG.requiredFrames);
            expect(config.environment).toBe('indoor');
        });

        it('should cache configuration after first fetch', async () => {
            const apiConfig = { positionThreshold: 0.04 };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => apiConfig
            });
            
            await loader.loadStabilityConfig({ environment: 'indoor' });
            await loader.loadStabilityConfig({ environment: 'indoor' });
            
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should use indoor as default environment', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });
            
            await loader.loadStabilityConfig();
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/v1/ar/stability-config?environment=indoor'
            );
        });

        it('should fetch with correct environment parameter', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });
            
            await loader.loadStabilityConfig({ environment: 'outdoor' });
            
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/v1/ar/stability-config?environment=outdoor'
            );
        });
    });

    describe('clearCache', () => {
        it('should clear all cached configurations', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });
            
            await loader.loadStabilityConfig({ environment: 'indoor' });
            expect(loader._cache.size).toBe(1);
            
            loader.clearCache();
            expect(loader._cache.size).toBe(0);
        });
    });

    describe('getDefaults', () => {
        it('should return a copy of default config', () => {
            const defaults = loader.getDefaults();
            
            expect(defaults).toEqual(DEFAULT_CONFIG);
            expect(defaults).not.toBe(loader._defaults);
        });
    });

    describe('isCached', () => {
        it('should return false when not cached', () => {
            expect(loader.isCached('indoor')).toBe(false);
        });

        it('should return true after loading', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });
            
            await loader.loadStabilityConfig({ environment: 'indoor' });
            
            expect(loader.isCached('indoor')).toBe(true);
        });
    });
});
