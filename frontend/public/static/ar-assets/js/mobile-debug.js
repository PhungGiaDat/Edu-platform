/**
 * Mobile Debug Logger
 * public/static/ar-assets/js/mobile-debug.js
 * 
 * Hiển thị console.log trực tiếp trên màn hình điện thoại
 * Bật bằng cách thêm ?debug=true vào URL
 */

(function () {
    'use strict';

    // Check if debug mode enabled via URL param
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('debug') === 'true';
    const isARPage = window.location.pathname === '/learn-ar' || urlParams.get('mobileDebug') === 'all';

    if (!isDebugMode || !isARPage) {
        console.log('[MobileDebug] Debug mode disabled. Add ?debug=true to URL to enable.');
        return;
    }

    // ========== CREATE DEBUG OVERLAY ==========
    const debugPanel = document.createElement('div');
    debugPanel.id = 'mobile-debug-panel';
    debugPanel.innerHTML = `
        <style>
            #mobile-debug-panel {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 35vh;
                background: rgba(0, 0, 0, 0.75);
                color: #0f0;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                /* Must sit above .ar-container-v2 (z-index: 99999) without
                   changing the AR iframe's dimensions or camera lifecycle. */
                z-index: 1000000;
                display: flex;
                flex-direction: column;
                border-top: 2px solid #0f0;
                pointer-events: auto;
            }
            #debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 10px;
                background: #111;
                border-bottom: 1px solid #333;
            }
            #debug-header span {
                color: #0f0;
                font-weight: bold;
            }
            #debug-controls button {
                background: #333;
                color: #fff;
                border: 1px solid #555;
                padding: 3px 8px;
                margin-left: 5px;
                border-radius: 3px;
                font-size: 10px;
                touch-action: manipulation;
            }
            #debug-logs {
                flex: 1;
                overflow-y: auto;
                padding: 5px 10px;
            }
            .log-entry {
                margin: 2px 0;
                padding: 2px 5px;
                border-left: 3px solid #0f0;
                word-break: break-all;
            }
            .log-entry.warn {
                color: #ff0;
                border-left-color: #ff0;
            }
            .log-entry.error {
                color: #f55;
                border-left-color: #f55;
            }
            .log-entry.info {
                color: #5af;
                border-left-color: #5af;
            }
            .log-entry .timestamp {
                color: #888;
                font-size: 10px;
            }
            #debug-toggle {
                position: fixed;
                bottom: calc(env(safe-area-inset-bottom) + 6rem);
                right: calc(env(safe-area-inset-right) + 12px);
                width: 50px;
                height: 50px;
                background: rgba(0, 255, 0, 0.8);
                border: none;
                border-radius: 50%;
                color: #000;
                font-size: 20px;
                z-index: 1000001;
                display: none;
            }
            #mobile-debug-panel.minimized {
                height: auto;
            }
            #mobile-debug-panel.minimized #debug-logs {
                display: none;
            }
        </style>
	        <div id="debug-header">
	            <span>📱 AR Debug Console</span>
	            <div id="debug-controls">
	                <button onclick="window.MobileDebug.clear()">Clear</button>
	                <button onclick="window.MobileDebug.copy()">Copy</button>
	                <button onclick="window.MobileDebug.toggle()">Min</button>
	                <button onclick="window.MobileDebug.hide()">Hide</button>
	            </div>
	        </div>
        <div id="debug-logs"></div>
    `;

    // Toggle button when hidden
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'debug-toggle';
    toggleBtn.textContent = '🔧';
    toggleBtn.onclick = () => {
        debugPanel.style.display = 'flex';
        toggleBtn.style.display = 'none';
    };

    document.body.appendChild(debugPanel);
    document.body.appendChild(toggleBtn);

    const logsContainer = debugPanel.querySelector('#debug-logs');
    let logCount = 0;
    const MAX_LOGS = 100;
    const MAX_BUFFERED_LOGS = 1000;
    const logBuffer = [];
    window.MobileDebug = window.MobileDebug || {};
    window.MobileDebug.getLogs = () => logBuffer.map(e => e.plainText).join('\n');
    window.MobileDebug.logBuffer = logBuffer; // For direct access if needed
    
    // Legacy API support for older code
    window.MobileDebug.add = (level, label, message, details) => addLog(level, [label, message, details]);
    window.MobileDebug.clear = () => {
        logsContainer.innerHTML = '';
        logCount = 0;
        logBuffer.length = 0;
    };

    const PERF_LOG_INTERVAL_MS = 5000;
    let lastPerfLogAt = 0;
    let suppressedPerfLogs = 0;
    let isReplayingToEruda = false;
    let erudaAttached = false;
    let activeEngine = 'unknown';

    // ========== LOGGER FUNCTIONS ==========
    function addLog(type, args) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;

        const timestamp = new Date().toLocaleTimeString();
        const message = Array.from(args).map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 1);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        const plainText = `[${timestamp}] ${message}`;

        entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(message)}`;
        logsContainer.appendChild(entry);
        logBuffer.push({ type, plainText, message });
        if (logBuffer.length > MAX_BUFFERED_LOGS) {
            logBuffer.shift();
        }

        logCount++;
        if (logCount > MAX_LOGS) {
            logsContainer.removeChild(logsContainer.firstChild);
            logCount = MAX_LOGS;
        }

        // Auto scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function copyLogsWithSelection(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;padding:0;border:0;opacity:0.01;font-size:16px;';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        let copied = false;
        try {
            copied = typeof document.execCommand === 'function' && document.execCommand('copy');
        } catch (_error) {
            copied = false;
        } finally {
            document.body.removeChild(textarea);
        }
        return copied;
    }

    async function copyLogs() {
        const text = logBuffer.map(entry => entry.plainText).join('\n');
        if (!text) return false;

        // execCommand must run synchronously inside the tap handler on iOS.
        // Trying the asynchronous Clipboard API first can lose user activation
        // before Safari reaches the fallback.
        if (copyLogsWithSelection(text)) return true;

        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_error) {
            // Both copy paths failed. The caller will display failure feedback.
        }
        return false;
    }

    // ========== OVERRIDE CONSOLE ==========
    const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console)
    };

    console.log = function (...args) {
        originalConsole.log(...args);
        if (!isReplayingToEruda) addLog('log', args);
    };

    console.warn = function (...args) {
        originalConsole.warn(...args);
        if (!isReplayingToEruda) addLog('warn', args);
    };

    console.error = function (...args) {
        originalConsole.error(...args);
        if (!isReplayingToEruda) addLog('error', args);
    };

    console.info = function (...args) {
        originalConsole.info(...args);
        if (!isReplayingToEruda) addLog('info', args);
    };

    // ========== GLOBAL ERROR HANDLER ==========
    window.onerror = function (message, source, lineno, colno, error) {
        addLog('error', [`❌ ${message}`, `at ${source}:${lineno}:${colno}`]);
        return false;
    };

    window.onunhandledrejection = function (event) {
        addLog('error', [`❌ Unhandled Promise: ${event.reason}`]);
    };

    // ========== PUBLIC API ==========
    const MobileDebug = {
        clear: function () {
            logsContainer.innerHTML = '';
            logCount = 0;
            logBuffer.length = 0;
        },
        copy: async function () {
            const copied = await copyLogs();
            addLog(copied ? 'info' : 'error', [copied ? '✅ Logs copied to clipboard' : '❌ Unable to copy logs']);
            return copied;
        },
        toggle: function () {
            debugPanel.classList.toggle('minimized');
        },
        hide: function () {
            debugPanel.style.display = 'none';
            toggleBtn.style.display = 'block';
        },
        show: function () {
            debugPanel.style.display = 'flex';
            toggleBtn.style.display = 'none';
        },
        log: function (...args) {
            console.log('[Debug]', ...args);
        },
        getLogs: function() {
            return logBuffer.map(e => e.plainText).join('\n');
        },
        logBuffer: logBuffer,
        activeEngine: activeEngine,
        attachEruda: function () {
            if (erudaAttached) return;
            erudaAttached = true;

            // Snapshot first: the replay itself must not grow the Mobile Debug
            // buffer or duplicate its DOM entries. At this point Eruda has
            // already wrapped console.*, so these calls appear in Eruda too.
            const earlyEntries = logBuffer.slice();
            isReplayingToEruda = true;
            try {
                earlyEntries.forEach(function (entry) {
                    const method = entry.type === 'error'
                        ? 'error'
                        : entry.type === 'warn'
                            ? 'warn'
                            : entry.type === 'info'
                                ? 'info'
                                : 'log';
                    console[method]('[early]', entry.message);
                });
            } finally {
                isReplayingToEruda = false;
            }
            console.info('[AR debug] Eruda attached; early lifecycle replayed:', earlyEntries.length);
        }
    };

    // Update activeEngine on the object whenever it changes
    const originalInferEngine = inferEngine;
    inferEngine = function(data) {
        const engine = originalInferEngine(data);
        if (engine !== 'unknown') MobileDebug.activeEngine = engine;
        return engine;
    };

    window.MobileDebug = MobileDebug;

    function inferEngine(data) {
        const payload = data && data.payload && typeof data.payload === 'object' ? data.payload : {};
        const details = payload.details && typeof payload.details === 'object' ? payload.details : {};
        const candidate = String(
            payload.engine || details.engine || details.iframeSrc || payload.source || ''
        ).toLowerCase();

        if (candidate.includes('ar-xr') || candidate === 'xr' || candidate.includes('8th')) return '8thwall';
        if (candidate.includes('ar-viewer') || candidate.includes('mindar')) return 'mindar';
        if (candidate.includes('ar-scanner') || candidate.includes('scanner')) return 'scanner';
        return activeEngine;
    }

    function viewerConsoleDetails(data) {
        const payload = data && data.payload && typeof data.payload === 'object' ? data.payload : {};
        const label = String(payload.label || '');
        const isForwardedConsole = label.includes('CONSOLE_')
            || label.includes('UNCAUGHT_ERROR')
            || label.includes('UNHANDLED_REJECTION');
        if (!isForwardedConsole) return null;
        const details = payload.details && typeof payload.details === 'object' ? payload.details : {};
        return {
            label: label || 'IFRAME_CONSOLE',
            level: label.includes('ERROR') || label.includes('REJECTION')
                ? 'error'
                : ['error', 'warn', 'info', 'log'].includes(details.level) ? details.level : 'log',
            text: String(details.text || details.message || details.reason || ''),
            engine: inferEngine(data),
        };
    }

    function isNoisyPerformanceLog(text) {
        return /^\[PERF\]/.test(text) || /^\[AR-Viewer\].*FPS:/.test(text);
    }

    function logIframeMessage(typeStr, data) {
        const forwardedConsole = viewerConsoleDetails(data);
        if (forwardedConsole) {
            if (isNoisyPerformanceLog(forwardedConsole.text)) {
                const now = Date.now();
                if (now - lastPerfLogAt < PERF_LOG_INTERVAL_MS) {
                    suppressedPerfLogs++;
                    return;
                }
                const suffix = suppressedPerfLogs > 0
                    ? ` (${suppressedPerfLogs} repetitive PERF/FPS logs suppressed)`
                    : '';
                lastPerfLogAt = now;
                suppressedPerfLogs = 0;
                console.info(`[iframe:${forwardedConsole.engine}]`, forwardedConsole.text + suffix);
                return;
            }

            const method = forwardedConsole.level === 'error'
                ? 'error'
                : forwardedConsole.level === 'warn'
                    ? 'warn'
                    : 'info';
            console[method](`[iframe:${forwardedConsole.engine}] ${forwardedConsole.label}`, forwardedConsole.text);
            return;
        }

        const engine = inferEngine(data);
        if (engine !== 'unknown' && engine !== 'scanner') activeEngine = engine;

        if (typeStr === 'SCANNER_READY') {
            console.info('[AR lifecycle] CAMERA_READY engine=scanner', data.payload || {});
            return;
        }
        if (typeStr === 'AR_READY' || typeStr === 'SYSTEM_READY') {
            console.info(`[AR lifecycle] ${typeStr} engine=${engine}`, data.payload || {});
            return;
        }
        if (typeStr === 'AR_DEBUG' && data.payload && data.payload.label === 'PARENT_VIEWER_IFRAME_LOADED') {
            console.info(`[AR lifecycle] ENGINE_START engine=${engine}`, data.payload.details || {});
            return;
        }

        console.info(`📨 [iframe→parent:${engine}] ${typeStr}`, data.payload || {});
    }

    // ========== INTERCEPT postMessage FROM IFRAMES ==========
    // The React bundle uses drop_console:true in production, stripping all
    // console.* calls. But iframe→parent postMessage events still fire.
    // We intercept them here so the debug panel shows AR iframe communication
    // even when React's own logging is absent.
    window.addEventListener('message', function (event) {
        try {
            const data = event.data;
            if (data && typeof data === 'object' && data.type) {
                const typeStr = String(data.type);

                // Buffer iframe console logs for debug sync
                // VIEWER_CONSOLE_* messages are forwarded from ar-viewer.html console bridge
                if (data.payload && data.payload.label && data.payload.label.startsWith('VIEWER_CONSOLE_')) {
                    const iframeLog = `[iframe] ${data.payload.details && data.payload.details.text ? data.payload.details.text : data.payload.details || ''}`;
                    addLog(data.payload.details && data.payload.details.level === 'error' ? 'error' : 'log', [iframeLog]);
                }

                // Only show AR-related messages to avoid noise
                const arTypes = [
                    'SCANNER_READY', 'QR_DETECTED', 'SCANNER_ERROR',
                    'VIEWER_TARGETS_READY', 'AR_READY', 'TARGET_FOUND', 'TARGET_LOST',
                    'SYSTEM_READY', 'SYSTEM_ERROR', 'AR_ERROR',
                    'MULTI_TARGET_DETECTED', 'AR_TRACKING_STATE',
                    'COMBO_PROXIMITY_DETECTED', 'COMBO_PROXIMITY_UPDATE',
                    'COMBO_PROXIMITY_ENDED', 'COMBO_DETECTED',
                    'TEXTURE_APPLIED', 'MODEL_CLICKED', 'AR_DEBUG',
                ];
                if (arTypes.includes(typeStr)) {
                    // Route through console so both the early buffer and Eruda
                    // receive the same event stream. Repetitive performance
                    // telemetry is throttled before touching either DOM.
                    logIframeMessage(typeStr, data);
                }
            }
        } catch (_e) { /* ignore parse errors */ }
    });

    // Initial log
    console.log('🔧 Mobile Debug Panel Ready (pre-React buffer active)');
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('🌐 URL:', window.location.href);
    console.info('[AR lifecycle] PAGE_BOOT engine=pending');

})();
