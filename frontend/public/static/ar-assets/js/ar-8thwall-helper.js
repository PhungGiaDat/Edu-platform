/**
 * ar-8thwall-helper.js - 8th Wall Engine Integration Helper
 *
 * Provides helper functions for 8th Wall engine binary integration.
 * Requires @8thwall/engine-binary to be installed and xr.js loaded via <script> tag.
 *
 * Usage:
 *   import { XR8Promise } from '@8thwall/engine-binary'
 *   XR8Promise.then((XR8) => XR8.XrController.configure({ ... }))
 */

(function(root) {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // 8th Wall Availability Check
    // ─────────────────────────────────────────────────────────────

    /**
     * Check if 8th Wall is available and loaded
     */
    function is8thWallAvailable() {
        return typeof window.XR8 !== 'undefined';
    }

    /**
     * Get XR8 promise (resolves when xr.js is loaded)
     * Returns null if 8th Wall is not available
     */
    function getXR8Promise() {
        if (typeof window.XR8Promise !== 'undefined') {
            return window.XR8Promise;
        }
        return null;
    }

    /**
     * Check if WebXR is supported
     */
    function isWebXRSupported() {
        return navigator.xr !== undefined;
    }

    /**
     * Check if 8th Wall can run on this device
     */
    function canRun8thWall() {
        return is8thWallAvailable() && isWebXRSupported();
    }

    // ─────────────────────────────────────────────────────────────
    // 8th Wall Configuration
    // ─────────────────────────────────────────────────────────────

    /**
     * Default 8th Wall configuration for image targets
     */
    function getDefaultConfig() {
        return {
            '8thwall': {
                // World tracking settings
            },
            'imageTargets': {
                // Image target configuration
            },
            'camera': {
                // Camera settings
            }
        };
    }

    /**
     * Configure 8th Wall for image target tracking
     */
    function configureForImageTargets(xr8, imageTargetsConfig) {
        if (!xr8) return Promise.reject(new Error('XR8 not available'));

        try {
            // Configure XrController for image tracking
            xr8.XrController.configure({
                raycast: {
                    enable: true
                }
            });

            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Configure 8th Wall for world tracking (SLAM)
     */
    function configureForWorldTracking(xr8, worldTrackingConfig) {
        if (!xr8) return Promise.reject(new Error('XR8 not available'));

        try {
            // Configure for world tracking with SLAM
            xr8.XrController.configure({
                camera: {
                    direction: xr8.XrController.camera()
                },
                world: {
                    enable: true
                }
            });

            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // 8th Wall Lifecycle
    // ─────────────────────────────────────────────────────────────

    /**
     * Start 8th Wall experience
     */
    function startExperience(canvas, onReady, onError) {
        var xr8Promise = getXR8Promise();

        if (!xr8Promise) {
            var err = new Error('8th Wall not loaded - ensure xr.js is included via <script> tag');
            if (onError) onError(err);
            return Promise.reject(err);
        }

        return xr8Promise.then(function(XR8) {
            // Configure for image tracking
            XR8.XrController.configure({
                // Image tracking config
            });

            // Start the experience
            return XR8.run({
                canvas: canvas,
                onReady: function() {
                    console.log('[8thWall] Experience ready');
                    if (onReady) onReady();
                },
                onError: function(error) {
                    console.error('[8thWall] Error:', error);
                    if (onError) onError(error);
                }
            });
        }).catch(function(error) {
            console.error('[8thWall] Failed to start:', error);
            if (onError) onError(error);
            return Promise.reject(error);
        });
    }

    /**
     * Stop 8th Wall experience
     */
    function stopExperience() {
        var xr8Promise = getXR8Promise();

        if (!xr8Promise) return Promise.resolve();

        return xr8Promise.then(function(XR8) {
            if (XR8.XrController) {
                XR8.XrController.stop();
            }
            return Promise.resolve();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Export
    // ─────────────────────────────────────────────────────────────
    root.AR8thWallHelper = {
        is8thWallAvailable: is8thWallAvailable,
        getXR8Promise: getXR8Promise,
        isWebXRSupported: isWebXRSupported,
        canRun8thWall: canRun8thWall,
        getDefaultConfig: getDefaultConfig,
        configureForImageTargets: configureForImageTargets,
        configureForWorldTracking: configureForWorldTracking,
        startExperience: startExperience,
        stopExperience: stopExperience
    };

})(typeof window !== 'undefined' ? window : this);
