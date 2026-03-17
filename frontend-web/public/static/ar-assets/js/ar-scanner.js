/**
 * ar-scanner.js - QR Scanner Logic
 * Uses jsQR for lightweight QR detection
 */
(function () {
    'use strict';

    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let scanning = true;
    let lastDetectedCode = null;
    let detectionCooldown = false;

    // ============ STATUS OVERLAY HELPER ============
    const statusEl = document.getElementById('scanner-status');
    function setStatus(msg, color) {
        if (statusEl) {
            statusEl.textContent = msg;
            if (color) statusEl.style.color = color;
        }
    }

    // ============ CAMERA INIT ============
    async function initCamera() {
        setStatus('⏳ Requesting camera...', '#0f0');
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            setStatus('📸 Camera granted, waiting for video...', '#0f0');

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                log('📷', `Camera ready: ${video.videoWidth}x${video.videoHeight}`);
                setStatus('✅ Camera ready - scan a QR code', '#0f0');
                // Hide status after 3s once camera is confirmed working
                setTimeout(function() { if (statusEl) statusEl.style.display = 'none'; }, 3000);
                startScanning();

                sendToParent('SCANNER_READY', {
                    width: video.videoWidth,
                    height: video.videoHeight
                });
            };
        } catch (err) {
            log('❌', 'Camera error: ' + err.message);
            setStatus('❌ Camera error: ' + err.message, '#f55');
            sendToParent('SCANNER_ERROR', { error: err.message });
        }
    }

    // ============ QR SCANNING ============
    function startScanning() {
        setInterval(scanFrame, 200);
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

        log('🎯', 'QR Detected: ' + data);

        if (navigator.vibrate) navigator.vibrate(100);

        sendToParent('QR_DETECTED', {
            qrId: data,
            timestamp: Date.now()
        });

        setTimeout(() => {
            detectionCooldown = false;
        }, 2000);
    }

    // ============ PARENT COMMUNICATION ============
    function sendToParent(type, data) {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type, ...data }, '*');
            log('📤', `Sent ${type} to parent`);
        }
    }

    window.addEventListener('message', (event) => {
        const { type } = event.data || {};

        switch (type) {
            case 'PAUSE_SCANNING':
                scanning = false;
                break;
            case 'RESUME_SCANNING':
                scanning = true;
                lastDetectedCode = null;
                break;
            case 'RESET_SCANNER':
                lastDetectedCode = null;
                detectionCooldown = false;
                break;
        }
    });

    // ============ LOGGING ============
    function log(emoji, message) {
        console.log(`[AR-Scanner] ${emoji} ${message}`);
    }

    // ============ START ============
    initCamera();
})();
