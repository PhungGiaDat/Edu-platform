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

    if (!isDebugMode) {
        console.log('[MobileDebug] Debug mode disabled. Add ?debug=true to URL to enable.');
        return;
    }

    console.log('[MobileDebug] 🔧 Debug mode ENABLED');

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
                background: rgba(0, 0, 0, 0.9);
                color: #0f0;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                border-top: 2px solid #0f0;
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
                bottom: 10px;
                right: 10px;
                width: 50px;
                height: 50px;
                background: rgba(0, 255, 0, 0.8);
                border: none;
                border-radius: 50%;
                color: #000;
                font-size: 20px;
                z-index: 100000;
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
            <span>📱 Mobile Debug</span>
            <div id="debug-controls">
                <button onclick="window.MobileDebug.clear()">Clear</button>
                <button onclick="window.MobileDebug.toggle()">Toggle</button>
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

        entry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${escapeHtml(message)}`;
        logsContainer.appendChild(entry);

        logCount++;
        if (logCount > MAX_LOGS) {
            logsContainer.removeChild(logsContainer.firstChild);
        }

        // Auto scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        addLog('log', args);
    };

    console.warn = function (...args) {
        originalConsole.warn(...args);
        addLog('warn', args);
    };

    console.error = function (...args) {
        originalConsole.error(...args);
        addLog('error', args);
    };

    console.info = function (...args) {
        originalConsole.info(...args);
        addLog('info', args);
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
    window.MobileDebug = {
        clear: function () {
            logsContainer.innerHTML = '';
            logCount = 0;
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
        }
    };

    // Initial log
    console.log('🔧 Mobile Debug Panel Ready');
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('🌐 URL:', window.location.href);

})();
