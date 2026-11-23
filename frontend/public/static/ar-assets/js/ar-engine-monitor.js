/**
 * ar-engine-monitor.js - AR Engine State & Switch Detection
 *
 * Single Responsibility: Manages AR engine lifecycle and state transitions
 * Open/Closed: Easy to add new engine types
 * Dependency Inversion: Abstract engine interface, concrete implementations
 *
 * Supported AR Engines:
 * - 'mindar'   : MindAR image tracking (current primary)
 * - '8thwall'  : 8th Wall engine binary (@8thwall/engine-binary)
 * - 'xr'       : WebXR Device API fallback
 * - 'fallback' : Static 2D image fallback
 * - 'none'     : No AR available
 *
 * 8th Wall Integration:
 *   npm install @8thwall/engine-binary
 *   Copy dist/ to external/xr/ via CopyWebpackPlugin
 *   <script src="./external/xr/xr.js" async data-preload-chunks="slam">
 *   import { XR8Promise } from '@8thwall/engine-binary'
 */

(function(root) {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // Engine Types & Constants
    // ─────────────────────────────────────────────────────────────
    var ENGINE = {
        MINDAR: 'mindar',
        EIGHTHWALL: '8thwall',   // 8th Wall engine binary
        XR: 'xr',                 // WebXR Device API
        FALLBACK: 'fallback',     // Static image fallback
        NONE: 'none'              // No AR available
    };

    var STATE = {
        IDLE: 'idle',
        INITIALIZING: 'initializing',
        READY: 'ready',
        ERROR: 'error',
        SWITCHING: 'switching',
        TIMEOUT: 'timeout'
    };

    // ─────────────────────────────────────────────────────────────
    // Pure Factory - creates engine monitor instance
    // ─────────────────────────────────────────────────────────────
    function createEngineMonitor(options) {
        var emitFn = options.emit || function() {};
        var getLogger = options.getLogger || function() { return function() {}; };

        // ── Private State ─────────────────────────────────────
        var currentEngine = ENGINE.NONE;
        var currentState = STATE.IDLE;
        var switchHistory = [];
        var initStartTime = null;
        var readyTime = null;
        var healthChecks = [];
        var fpsHistory = [];
        var lastFpsWarning = 0;

        // ── Pure Helper Functions ─────────────────────────────
        function createSnapshot() {
            return {
                engine: currentEngine,
                state: currentState,
                initDuration: initStartTime ? Date.now() - initStartTime : null,
                readyDuration: readyTime ? Date.now() - readyTime : null,
                switches: switchHistory.length,
                lastSwitch: switchHistory[switchHistory.length - 1] || null,
                healthStatus: getHealthStatus(),
                fps: getCurrentFps()
            };
        }

        function getHealthStatus() {
            if (healthChecks.length === 0) return 'no-data';
            var recent = healthChecks.slice(-5);
            var healthy = recent.filter(function(h) { return h.status === 'ok'; }).length;
            return healthy / recent.length > 0.6 ? 'healthy' : 'degraded';
        }

        function getCurrentFps() {
            if (fpsHistory.length === 0) return null;
            var sum = fpsHistory.reduce(function(a, b) { return a + b; }, 0);
            return Math.round(sum / fpsHistory.length);
        }

        function emit(label, data) {
            var snapshot = createSnapshot();
            emitFn(label, Object.assign({}, data || {}, {
                engine: currentEngine,
                state: currentState,
                snapshot: snapshot
            }));
        }

        function log() {
            var logger = getLogger();
            logger.apply(null, arguments);
        }

        // ── State Transition Engine ───────────────────────────
        function transition(newState, reason, data) {
            var prevState = currentState;
            var prevEngine = currentEngine;

            if (prevState === newState && !data?.force) {
                return false; // No-op: same state
            }

            currentState = newState;

            // Log state change
            var transitionData = {
                from: prevState,
                to: newState,
                reason: reason,
                engine: currentEngine,
                timestamp: Date.now(),
                duration: initStartTime ? Date.now() - initStartTime : null
            };

            log('🔄', 'Engine state: ' + prevState + ' → ' + newState + ' (' + reason + ')');

            // Emit state change event
            emit('ENGINE_STATE_CHANGE', transitionData);

            // Track switches
            if (prevState !== newState) {
                switchHistory.push({
                    from: prevState,
                    to: newState,
                    engine: currentEngine,
                    reason: reason,
                    timestamp: Date.now()
                });
            }

            return true;
        }

        // ── Public API ──────────────────────────────────────
        return {
            // Engine initialization
            startEngine: function(engineType) {
                if (currentState === STATE.INITIALIZING) {
                    log('⚠️', 'Engine already initializing: ' + currentEngine);
                    return;
                }

                currentEngine = engineType || ENGINE.MINDAR;
                initStartTime = Date.now();
                currentState = STATE.INITIALIZING;

                log('🚀', 'Engine starting: ' + currentEngine);
                emit('ENGINE_INIT', { engine: currentEngine });
            },

            // Called when engine reports ready
            onEngineReady: function(duration) {
                var ms = duration || (initStartTime ? Date.now() - initStartTime : null);
                readyTime = Date.now();
                transition(STATE.READY, 'engine-ready', { initDuration: ms });

                log('✅', 'Engine ready: ' + currentEngine + ' (init: ' + (ms ? ms + 'ms' : 'unknown') + ')');
                emit('ENGINE_READY', {
                    engine: currentEngine,
                    initDuration: ms,
                    switches: switchHistory.length
                });
            },

            // Called on engine error
            onEngineError: function(error, stage) {
                transition(STATE.ERROR, 'engine-error', {
                    error: error,
                    stage: stage
                });

                log('❌', 'Engine error: ' + currentEngine + ' - ' + (error || 'unknown'));
                emit('ENGINE_ERROR', {
                    engine: currentEngine,
                    error: error,
                    stage: stage
                });
            },

            // Called on initialization timeout
            onTimeout: function(timeoutMs) {
                transition(STATE.TIMEOUT, 'init-timeout', {
                    timeoutMs: timeoutMs,
                    engine: currentEngine
                });

                log('⏰', 'Engine timeout: ' + currentEngine + ' after ' + timeoutMs + 'ms');
                emit('ENGINE_TIMEOUT', {
                    engine: currentEngine,
                    timeoutMs: timeoutMs
                });
            },

            // Called when switching to fallback engine
            switchToFallback: function(fallbackType, reason) {
                var prevEngine = currentEngine;
                var prevState = currentState;

                transition(STATE.SWITCHING, 'fallback-triggered', {
                    from: prevEngine,
                    to: fallbackType || ENGINE.FALLBACK,
                    reason: reason
                });

                currentEngine = fallbackType || ENGINE.FALLBACK;

                log('🔀', 'Engine switch: ' + prevEngine + ' → ' + currentEngine + ' (' + reason + ')');
                emit('ENGINE_SWITCH', {
                    from: prevEngine,
                    to: currentEngine,
                    reason: reason,
                    switchCount: switchHistory.length
                });

                // Restart init timer for fallback
                initStartTime = Date.now();
            },

            // Called when switching to XR/WebXR
            switchToXR: function(reason) {
                var prevEngine = currentEngine;
                var prevState = currentState;

                transition(STATE.SWITCHING, 'xr-triggered', {
                    from: prevEngine,
                    to: ENGINE.XR,
                    reason: reason
                });

                currentEngine = ENGINE.XR;

                log('🔀', 'Engine switch: ' + prevEngine + ' → ' + ENGINE.XR + ' (' + reason + ')');
                emit('ENGINE_SWITCH', {
                    from: prevEngine,
                    to: ENGINE.XR,
                    reason: reason,
                    switchCount: switchHistory.length
                });
            },

            // Called when switching to 8th Wall
            // 8th Wall provides superior tracking quality but requires commercial license
            switchTo8thWall: function(reason) {
                var prevEngine = currentEngine;
                var prevState = currentState;

                transition(STATE.SWITCHING, '8thwall-triggered', {
                    from: prevEngine,
                    to: ENGINE.EIGHTHWALL,
                    reason: reason
                });

                currentEngine = ENGINE.EIGHTHWALL;
                initStartTime = Date.now();

                log('🚀', 'Engine switch: ' + prevEngine + ' → ' + ENGINE.EIGHTHWALL + ' (' + reason + ')');
                emit('ENGINE_SWITCH', {
                    from: prevEngine,
                    to: ENGINE.EIGHTHWALL,
                    reason: reason,
                    switchCount: switchHistory.length
                });
            },

            // Check if 8th Wall is available (requires @8thwall/engine-binary loaded)
            is8thWallAvailable: function() {
                return typeof window.XR8 !== 'undefined' || typeof window.XR8Promise !== 'undefined';
            },

            // Record FPS measurement
            recordFps: function(fps) {
                fpsHistory.push(fps);
                if (fpsHistory.length > 60) {
                    fpsHistory.shift();
                }

                // Check for low FPS warning
                var WARNING_FPS = 20;
                var now = Date.now();
                if (fps < WARNING_FPS && now - lastFpsWarning > 30000) {
                    lastFpsWarning = now;
                    log('⚠️', 'Low FPS detected: ' + fps + ' < ' + WARNING_FPS);
                    emit('ENGINE_FPS_WARNING', {
                        fps: fps,
                        threshold: WARNING_FPS,
                        avgFps: getCurrentFps()
                    });
                }
            },

            // Record health check
            recordHealth: function(status, details) {
                healthChecks.push({
                    status: status,
                    details: details || {},
                    timestamp: Date.now()
                });

                // Keep only last 20 checks
                if (healthChecks.length > 20) {
                    healthChecks.shift();
                }
            },

            // Get current state snapshot
            getSnapshot: createSnapshot,

            // Get switch history
            getHistory: function() {
                return switchHistory.slice();
            },

            // Get current engine
            getEngine: function() {
                return currentEngine;
            },

            // Get current state
            getState: function() {
                return currentState;
            },

            // Check if engine is ready
            isReady: function() {
                return currentState === STATE.READY;
            },

            // Get engine types constant
            ENGINE: ENGINE,
            STATE: STATE
        };
    }

    // ─────────────────────────────────────────────────────────────
    // Export
    // ─────────────────────────────────────────────────────────────
    root.AREngineMonitor = {
        create: createEngineMonitor,
        ENGINE: ENGINE,
        STATE: STATE
    };

})(typeof window !== 'undefined' ? window : this);
