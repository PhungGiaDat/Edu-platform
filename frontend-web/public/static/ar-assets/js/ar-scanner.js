/**
 * ar-scanner.js - QR Scanner Logic
 * Uses jsQR for lightweight QR detection
 *
 * Runs inside a parent-hosted iframe. All tunables, DOM ids, API
 * message types, and UI strings live in CONFIG below — no magic
 * numbers, no duplicated strings. Edit CONFIG to adjust behavior.
 */
(function () {
    'use strict';

    const CONFIG = Object.freeze({
        // Parent contract -------------------------------------------------------------
        PARENT_ORIGIN: '*',         // wildcard: parent may host under any scheme/origin
        PARENT_MESSAGES: Object.freeze({
            QR_DETECTED: 'QR_DETECTED',
            SCANNER_READY: 'SCANNER_READY',
            SCANNER_ERROR: 'SCANNER_ERROR',
            AR_DEBUG: 'AR_DEBUG'
        }),
        // Debug labels (sent as `label` inside AR_DEBUG payloads)
        DEBUG_LABELS: Object.freeze({
            MEDIA_DEVICES_PROBE: 'SCANNER_MEDIA_DEVICES_PROBE',
            GETUSERMEDIA_START: 'SCANNER_GETUSERMEDIA_START',
            GETUSERMEDIA_OK: 'SCANNER_GETUSERMEDIA_OK',
            VIDEO_ERROR: 'SCANNER_VIDEO_ERROR'
        }),

        // DOM hooks — injected by parent into the hosted iframe HTML
        DOM_IDS: Object.freeze({
            VIDEO: 'video',
            CANVAS: 'canvas',
            STATUS: 'scanner-status'
        }),

        // Camera constraints — overwritten by parent via messages if needed
        CAMERA: Object.freeze({
            FACING_MODE: 'environment',
            WIDTH: { ideal: 1280 },
            HEIGHT: { ideal: 720 },
            INCLUDE_AUDIO: false
        }),

        // Timing (milliseconds) -------------------------------------------------------
        SCAN_INTERVAL_MS: 200,
        DETECTION_COOLDOWN_MS: 2000,
        STATUS_AUTOHIDE_MS: 3000,
        VIBRATE_MS: 100,
        IFRAME_DEPTH_SAFETY_LIMIT: 5,

        // UI ---------------------------------------------------------------------------
        LOG_PREFIX: '[AR-Scanner]',
        COLORS: Object.freeze({
            NEUTRAL: '#0f0',
            ERROR: '#f55'
        }),

        // UI strings (status overlay) --------------------------------------------------
        STATUS: Object.freeze({
            PROBING: '⏳ Probing camera environment...',
            REQUESTING: '⏳ Requesting camera...',
            STREAM_GRABBED: '📸 Camera granted, waiting for video...',
            READY: '✅ Camera ready - scan a QR code',
            CAMERA_GRABBED: '✅ Camera granted'
        }),

        // Error classification map for getUserMedia failures
        ERROR_CLASSIFICATION: Object.freeze({
            NotAllowedError: 'PERMISSION_DENIED',
            PermissionDeniedError: 'PERMISSION_DENIED',
            NotFoundError: 'NO_CAMERA_DEVICE',
            DevicesNotFoundError: 'NO_CAMERA_DEVICE',
            NotReadableError: 'CAMERA_IN_USE',
            TrackStartError: 'CAMERA_IN_USE',
            OverconstrainedError: 'CONSTRAINT_UNSUPPORTED',
            ConstraintNotSatisfiedError: 'CONSTRAINT_UNSUPPORTED',
            SecurityError: 'SECURE_CONTEXT_REQUIRED',
            AbortError: 'ABORTED'
        }),

        // Internal control messages the parent can post back to the scanner
        CONTROL_MESSAGES: Object.freeze({
            PAUSE: 'PAUSE_SCANNING',
            RESUME: 'RESUME_SCANNING',
            RESET: 'RESET_SCANNER'
        })
    });

    const { PARENT_ORIGIN, PARENT_MESSAGES, DEBUG_LABELS, DOM_IDS,
        CAMERA, SCAN_INTERVAL_MS, DETECTION_COOLDOWN_MS, STATUS_AUTOHIDE_MS,
        VIBRATE_MS, IFRAME_DEPTH_SAFETY_LIMIT, LOG_PREFIX, COLORS, STATUS,
        ERROR_CLASSIFICATION, CONTROL_MESSAGES } = CONFIG;

    const video = document.getElementById(DOM_IDS.VIDEO);
    const canvas = document.getElementById(DOM_IDS.CANVAS);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const statusEl = document.getElementById(DOM_IDS.STATUS);

    // ============ STATE ============
    let scanning = true;
    let lastDetectedCode = null;
    let detectionCooldown = false;

    // ============ STATUS OVERLAY ============
    function setStatus(msg, color = COLORS.NEUTRAL) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        if (color) statusEl.style.color = color;
    }

    // ============ LOGGING ============
    function log(emoji, message) {
        console.log(`${LOG_PREFIX} ${emoji} ${message}`);
    }

    // ============ PARENT COMMUNICATION ============
    function sendToParent(messageType, data) {
        if (!window.parent || window.parent === window) return;
        window.parent.postMessage({ type: messageType, ...data }, PARENT_ORIGIN);
        log('📤', `Sent ${messageType} to parent`);
    }

    function sendDebug(label, details) {
        sendToParent(PARENT_MESSAGES.AR_DEBUG, { label, details });
    }

    function sendError(error, code, probe) {
        sendToParent(PARENT_MESSAGES.SCANNER_ERROR, {
            error,
            code,
            probe
        });
    }

    // ============ ENVIRONMENT PROBE ============
    function detectIframeDepth() {
        try {
            let depth = 0;
            let w = window;
            while (w && w.parent && w.parent !== w) {
                depth += 1;
                w = w.parent;
                if (depth > IFRAME_DEPTH_SAFETY_LIMIT) return IFRAME_DEPTH_SAFETY_LIMIT;
            }
            return depth;
        } catch {
            return 'unknown';
        }
    }

    async function probeMediaDevices() {
        const report = {
            hasMediaDevices: Boolean(navigator.mediaDevices),
            hasGetUserMedia: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            hasEnumerate: Boolean(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
            secureContext: window.isSecureContext,
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            iframeDepth: detectIframeDepth(),
            userAgent: navigator.userAgent,
            isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
            isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
            webkitAppearance: typeof window.webkitMediaDevices !== 'undefined'
        };

        try {
            if (navigator.permissions && navigator.permissions.query) {
                const status = await navigator.permissions.query({ name: 'camera' });
                report.cameraPermissionState = status.state;
                report.cameraPermissionSupported = true;
            } else {
                report.cameraPermissionSupported = false;
                report.cameraPermissionState = 'unavailable';
            }
        } catch (err) {
            // Some browsers (Safari iOS) throw on 'camera' permissions query
            report.cameraPermissionSupported = false;
            report.cameraPermissionState = 'query_rejected';
            report.cameraPermissionError = err && err.name ? `${err.name}: ${err.message}` : String(err);
        }

        log('🔬', `MediaDevices probe: ${JSON.stringify(report)}`);
        sendDebug(DEBUG_LABELS.MEDIA_DEVICES_PROBE, report);
        return report;
    }

    // ============ ERROR CLASSIFICATION ============
    function classifyError(err) {
        if (!err) return 'UNKNOWN';
        return ERROR_CLASSIFICATION[err.name] || `UNKNOWN(${err.name})`;
    }

    function mediaUnavailableReason(probe) {
        if (!probe.hasMediaDevices) {
            return 'navigator.mediaDevices is undefined (insecure context?)';
        }
        return 'navigator.mediaDevices.getUserMedia is not a function';
    }

    // ============ CAMERA INIT ============
    async function initCamera() {
        setStatus(STATUS.PROBING);

        const probe = await probeMediaDevices();

        if (!probe.hasMediaDevices || !probe.hasGetUserMedia) {
            const reason = mediaUnavailableReason(probe);
            log('❌', reason);
            setStatus(`❌ Camera API unavailable: ${reason}`, COLORS.ERROR);
            sendError(reason, 'MEDIA_DEVICES_UNAVAILABLE', probe);
            return;
        }

        setStatus(STATUS.REQUESTING);

        try {
            const constraints = {
                video: {
                    facingMode: CAMERA.FACING_MODE,
                    width: CAMERA.WIDTH,
                    height: CAMERA.HEIGHT
                },
                audio: CAMERA.INCLUDE_AUDIO
            };

            log('📞', `Calling getUserMedia with constraints: ${JSON.stringify({
                video: constraints.video,
                audio: CAMERA.INCLUDE_AUDIO
            })}`);
            sendDebug(DEBUG_LABELS.GETUSERMEDIA_START, {
                constraints: { video: constraints.video, audio: CAMERA.INCLUDE_AUDIO }
            });

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            log('✅', `getUserMedia resolved — stream tracks: ${stream.getTracks().map(t => `${t.kind}(${t.id || 'no-id'})`).join(', ')}`);
            sendDebug(DEBUG_LABELS.GETUSERMEDIA_OK, {
                trackCount: stream.getTracks().length,
                trackKinds: stream.getTracks().map(t => t.kind)
            });

            video.srcObject = stream;
            setStatus(STATUS.STREAM_GRABBED);

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                log('📷', `Camera ready: ${video.videoWidth}x${video.videoHeight}, readyState=${video.readyState}`);
                setStatus(STATUS.READY);
                setTimeout(() => {
                    if (statusEl) statusEl.style.display = 'none';
                }, STATUS_AUTOHIDE_MS);
                startScanning();

                sendToParent(PARENT_MESSAGES.SCANNER_READY, {
                    width: video.videoWidth,
                    height: video.videoHeight
                });
            };

            video.onerror = (e) => {
                const message = e && e.message ? e.message : String(e);
                log('⚠️', `video.onerror fired: ${message}`);
                sendDebug(DEBUG_LABELS.VIDEO_ERROR, { message });
            };
        } catch (err) {
            const classification = classifyError(err);
            const message = err && err.message ? err.message : String(err);

            log('❌', `Camera error (${classification}): ${message}`);
            setStatus(`❌ ${classification}: ${message}`, COLORS.ERROR);
            sendError(message, classification, probe);
        }
    }

    // ============ QR SCANNING ============
    function startScanning() {
        setInterval(scanFrame, SCAN_INTERVAL_MS);
    }

    function scanFrame() {
        if (!scanning || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
            handleDetection(code.data);
        }
    }

    function handleDetection(data) {
        if (detectionCooldown || data === lastDetectedCode) return;

        lastDetectedCode = data;
        detectionCooldown = true;

        log('🎯', `QR Detected: ${data}`);

        if (navigator.vibrate) navigator.vibrate(VIBRATE_MS);

        sendToParent(PARENT_MESSAGES.QR_DETECTED, {
            qrId: data,
            timestamp: Date.now()
        });

        setTimeout(() => {
            detectionCooldown = false;
        }, DETECTION_COOLDOWN_MS);
    }

    // ============ PARENT CONTROL CHANNEL ============
    window.addEventListener('message', (event) => {
        const type = event.data && event.data.type;

        switch (type) {
            case CONTROL_MESSAGES.PAUSE:
                scanning = false;
                break;
            case CONTROL_MESSAGES.RESUME:
                scanning = true;
                lastDetectedCode = null;
                break;
            case CONTROL_MESSAGES.RESET:
                lastDetectedCode = null;
                detectionCooldown = false;
                break;
        }
    });

    // ============ START ============
    initCamera();
})();
