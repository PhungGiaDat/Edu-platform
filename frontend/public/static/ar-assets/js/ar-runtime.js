/**
 * AR Runtime JavaScript
 * public/static/ar-assets/js/ar-runtime.js
 * 
 * Dynamic NFT Loading System + QR Detection
 * - QR detection using ZXing library
 * - Listens for postMessage from parent React app
 * - Dynamically creates <a-nft> elements based on marker data
 * - Sends events back to React via postMessage
 */

(function () {
    'use strict';

    // ========== STATE ==========
    const ARRuntime = {
        initialized: false,
        scene: null,
        video: null,
        activeNFTs: new Map(), // markerId -> a-nft element
        activeModels: new Map(), // markerId -> a-entity element
        debug: false,

        // QR Detection state
        qrDetection: {
            enabled: true,
            scanning: false,
            lastDetected: null,
            detectedMarkers: new Set(), // Track all detected markers for multi-flashcard
            scanInterval: 500, // ms between scans
            scanTimeoutId: null,
            reader: null, // ZXing reader instance
        },

        // Configuration
        config: {
            basePath: './static/ar-assets',
            defaultScale: '5 5 5',
            defaultPosition: '0 0 0',
            smoothing: {
                enabled: true,
                count: 10,
                tolerance: 0.01,
                threshold: 5
            }
        }
    };


    // ========== LOGGING ==========
    function log(emoji, message, data = null) {
        const prefix = `[AR-Runtime] ${emoji}`;
        if (data) {
            console.log(prefix, message, data);
        } else {
            console.log(prefix, message);
        }

        // Update debug panel if visible
        if (ARRuntime.debug) {
            updateDebugPanel(message);
        }
    }

    function updateDebugPanel(message) {
        const panel = document.querySelector('.ar-debug-panel');
        if (panel) {
            const timestamp = new Date().toLocaleTimeString();
            panel.innerHTML = `<strong>${timestamp}</strong><br>${message}<br>Active NFTs: ${ARRuntime.activeNFTs.size}`;
        }
    }

    // ========== VIDEO LAYERING ENFORCEMENT (Task 1.3 + A-Frame 1.2.0 Fix) ==========
    /**
     * Force video element to proper z-index after AR.js injects it
     * AR.js dynamically creates <video id="arjs-video"> - we must catch it
     * With A-Frame 1.2.0, this is critical for camera visibility
     */
    function forceVideoLayering() {
        // Find video element - AR.js with A-Frame 1.2.0 usually creates 'arjs-video'
        const video = document.getElementById('arjs-video') || document.querySelector('video');

        if (!video) {
            log('⏳', 'Video element not found, retrying...');
            requestAnimationFrame(forceVideoLayering);
            return;
        }

        log('✅', 'Video element found!');

        // Force play if paused (fixes black screen on some browsers)
        if (video.paused) {
            video.play()
                .then(() => log('▶️', 'Video playing forced'))
                .catch(e => log('⚠️', 'Play error: ' + e.message));
        }

        // Aggressive style enforcement for A-Frame 1.2.0
        // CRITICAL: NO TRANSFORM - it creates new stacking context and breaks z-index!
        // Use inset:0 for full coverage instead
        video.style.cssText = `
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            height: 100dvh !important;
            object-fit: cover !important;
            z-index: 1 !important;
        `;

        log('🎥', 'Video element layering enforced (inset:0, z-index: 1, NO TRANSFORM)');

        const canvas = document.querySelector('.a-canvas');
        if (canvas) {
            canvas.style.cssText = `
                position: fixed !important;
                inset: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: 2 !important;
                background: transparent !important;
            `;
            log('🖼️', 'Canvas styled (inset:0, z-index: 2, transparent)');
        }

        // Notify parent that video is ready
        sendToParent('AR_VIDEO_READY', {
            width: video.videoWidth,
            height: video.videoHeight
        });
    }

    /**
     * Observe DOM for video element injection by AR.js
     */
    function observeVideoInjection() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.tagName === 'VIDEO' || (node.id && node.id.includes('video'))) {
                        log('👀', 'Detected video element injection');
                        forceVideoLayering();
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        log('👁️', 'DOM observer started for video injection');
    }

// ========== UI HELPERS ==========

    // Loader removed - direct AR experience

    function showNFTLoading(markerId) {
        // Disabled - no loading indicators
        console.log('[AR-Runtime] Loading NFT:', markerId);
    }

    function hideNFTLoading() {
        // Disabled - no loading indicators
    }

    // ========== NFT MANAGEMENT ==========

    /**
     * Create and inject an NFT marker into the scene
     * @param {Object} markerData - { markerId, descriptorUrl, modelUrl, scale, position, rotation }
     */
    function createNFTMarker(markerData) {
        const { markerId, descriptorUrl, modelUrl, scale, position, rotation } = markerData;

        // Check if already exists
        if (ARRuntime.activeNFTs.has(markerId)) {
            log('⚠️', `NFT already exists: ${markerId}`);
            return;
        }

        log('🔨', `Creating NFT marker: ${markerId}`, markerData);
        showNFTLoading(markerId);

        // Create <a-nft> element
        const nftElement = document.createElement('a-nft');
        nftElement.setAttribute('type', 'nft');
        nftElement.setAttribute('url', descriptorUrl);
        nftElement.setAttribute('smooth', ARRuntime.config.smoothing.enabled);
        nftElement.setAttribute('smoothCount', ARRuntime.config.smoothing.count);
        nftElement.setAttribute('smoothTolerance', ARRuntime.config.smoothing.tolerance);
        nftElement.setAttribute('smoothThreshold', ARRuntime.config.smoothing.threshold);
        nftElement.setAttribute('id', `nft-${markerId}`);

        // Create 3D model entity
        const modelEntity = document.createElement('a-entity');
        modelEntity.setAttribute('id', `model-${markerId}`);
        modelEntity.setAttribute('gltf-model', modelUrl);
        modelEntity.setAttribute('scale', scale || ARRuntime.config.defaultScale);
        modelEntity.setAttribute('position', position || ARRuntime.config.defaultPosition);
        if (rotation) {
            modelEntity.setAttribute('rotation', rotation);
        }
        modelEntity.setAttribute('class', 'clickable');
        modelEntity.setAttribute('proxy-click', '');

        // Append model to NFT
        nftElement.appendChild(modelEntity);

        // Listen for NFT found/lost events on this specific marker
        nftElement.addEventListener('markerFound', () => {
            log('✅', `NFT marker found: ${markerId}`);
            sendToParent('AR_NFT_FOUND', { markerId });
        });

        nftElement.addEventListener('markerLost', () => {
            log('❌', `NFT marker lost: ${markerId}`);
            sendToParent('AR_NFT_LOST', { markerId });
        });

        // Append to scene
        ARRuntime.scene.appendChild(nftElement);

        // Store references
        ARRuntime.activeNFTs.set(markerId, nftElement);
        ARRuntime.activeModels.set(markerId, modelEntity);

        log('✅', `NFT marker created: ${markerId}`);

        // Hide loading after a short delay
        setTimeout(hideNFTLoading, 500);

        // Notify parent
        sendToParent('AR_NFT_CREATED', { markerId });
    }

    /**
     * Remove an NFT marker from the scene
     * @param {string} markerId 
     */
    function removeNFTMarker(markerId) {
        const nftElement = ARRuntime.activeNFTs.get(markerId);

        if (!nftElement) {
            log('⚠️', `NFT not found for removal: ${markerId}`);
            return;
        }

        log('🗑️', `Removing NFT marker: ${markerId}`);

        // Remove from DOM
        nftElement.parentNode.removeChild(nftElement);

        // Clear references
        ARRuntime.activeNFTs.delete(markerId);
        ARRuntime.activeModels.delete(markerId);

        log('✅', `NFT marker removed: ${markerId}`);
        sendToParent('AR_NFT_REMOVED', { markerId });
    }

    /**
     * Remove all NFT markers
     */
    function clearAllNFTs() {
        log('🧹', 'Clearing all NFT markers');

        ARRuntime.activeNFTs.forEach((element, markerId) => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });

        ARRuntime.activeNFTs.clear();
        ARRuntime.activeModels.clear();

        sendToParent('AR_ALL_NFTS_CLEARED', {});
    }

    /**
     * Update model properties
     * @param {string} markerId 
     * @param {Object} updates - { scale, position, rotation, visible }
     */
    function updateModel(markerId, updates) {
        const modelEntity = ARRuntime.activeModels.get(markerId);

        if (!modelEntity) {
            log('⚠️', `Model not found for update: ${markerId}`);
            return;
        }

        log('🔄', `Updating model: ${markerId}`, updates);

        if (updates.scale) {
            modelEntity.setAttribute('scale', updates.scale);
        }
        if (updates.position) {
            modelEntity.setAttribute('position', updates.position);
        }
        if (updates.rotation) {
            modelEntity.setAttribute('rotation', updates.rotation);
        }
        if (typeof updates.visible === 'boolean') {
            modelEntity.setAttribute('visible', updates.visible);
        }
    }


    /**
     * Check distances between visible NFT markers
     * If multiple markers are within threshold, trigger combo
     */
    const comboState = {
        enabled: true,
        checkInterval: 1000, // ms
        distanceThreshold: 500, // pixels (screen space)
        activeCombo: null,
        intervalId: null
    };

    /**
     * Get the screen position of a marker
     * Uses the model's world position projected to screen
     */
    function getMarkerScreenPosition(markerId) {
        const modelEntity = ARRuntime.activeModels.get(markerId);
        if (!modelEntity || !modelEntity.object3D) return null;

        const position = modelEntity.object3D.getWorldPosition(new THREE.Vector3());

        // Get camera from scene
        const camera = ARRuntime.scene?.camera?.el?.object3D;
        if (!camera) return null;

        // Project to screen coordinates
        const screenPos = position.clone().project(camera);

        return {
            x: (screenPos.x + 1) / 2 * window.innerWidth,
            y: (-screenPos.y + 1) / 2 * window.innerHeight,
            visible: modelEntity.getAttribute('visible') !== false
        };
    }

    /**
     * Calculate distance between two screen positions
     */
    function calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check all marker combinations for combos
     */
    function checkForCombos() {
        if (!comboState.enabled || ARRuntime.activeModels.size < 2) return;

        const markerIds = Array.from(ARRuntime.activeModels.keys());
        const visibleMarkers = [];

        // Get positions of all visible markers
        for (const markerId of markerIds) {
            const pos = getMarkerScreenPosition(markerId);
            if (pos && pos.visible) {
                visibleMarkers.push({ markerId, ...pos });
            }
        }

        if (visibleMarkers.length < 2) {
            if (comboState.activeCombo) {
                log('💔', 'Combo deactivated - not enough visible markers');
                sendToParent('COMBO_DEACTIVATED', { combo: comboState.activeCombo });
                comboState.activeCombo = null;
            }
            return;
        }

        // Check all pairs for proximity
        for (let i = 0; i < visibleMarkers.length; i++) {
            for (let j = i + 1; j < visibleMarkers.length; j++) {
                const distance = calculateDistance(visibleMarkers[i], visibleMarkers[j]);

                if (distance < comboState.distanceThreshold) {
                    const comboId = [visibleMarkers[i].markerId, visibleMarkers[j].markerId].sort().join('+');

                    if (comboState.activeCombo !== comboId) {
                        log('🎉', `Combo detected: ${comboId} (distance: ${distance.toFixed(0)}px)`);
                        comboState.activeCombo = comboId;
                        sendToParent('COMBO_DETECTED', {
                            markerIds: [visibleMarkers[i].markerId, visibleMarkers[j].markerId],
                            distance: distance,
                            anchorMarkerId: visibleMarkers[i].markerId
                        });
                    }
                    return; // One combo at a time
                }
            }
        }

        // No combo found - deactivate if was active
        if (comboState.activeCombo) {
            log('💔', 'Combo deactivated - markers too far apart');
            sendToParent('COMBO_DEACTIVATED', { combo: comboState.activeCombo });
            comboState.activeCombo = null;
        }
    }

    /**
     * Start combo detection loop
     */
    function startComboDetection() {
        if (comboState.intervalId) return;

        comboState.intervalId = setInterval(checkForCombos, comboState.checkInterval);
        log('🔍', 'Combo detection started');
    }

    /**
     * Stop combo detection loop
     */
    function stopComboDetection() {
        if (comboState.intervalId) {
            clearInterval(comboState.intervalId);
            comboState.intervalId = null;
        }
        log('🛑', 'Combo detection stopped');
    }

    // ========== POSTMESSAGE COMMUNICATION ==========

    /**
     * Send message to parent React app
     */
    function sendToParent(type, payload) {
        window.parent.postMessage({ type, payload }, '*');
        log('📤', `Sent to parent: ${type}`, payload);
    }

    /**
     * Handle messages from parent React app
     */
    function handleParentMessage(event) {
        const { type, payload } = event.data || {};

        if (!type) return;

        log('📥', `Received from parent: ${type}`, payload);

        switch (type) {
            case 'AR_CREATE_NFT':
                // Payload: { markerId, descriptorUrl, modelUrl, scale?, position?, rotation? }
                createNFTMarker(payload);
                break;

            case 'AR_REMOVE_NFT':
                // Payload: { markerId }
                removeNFTMarker(payload.markerId);
                break;

            case 'AR_CLEAR_ALL':
                clearAllNFTs();
                break;

            case 'AR_UPDATE_MODEL':
                // Payload: { markerId, scale?, position?, rotation?, visible? }
                updateModel(payload.markerId, payload);
                break;

            case 'AR_SET_DEBUG':
                ARRuntime.debug = payload.enabled;
                const panel = document.querySelector('.ar-debug-panel');
                if (panel) {
                    panel.classList.toggle('visible', ARRuntime.debug);
                }
                break;

            case 'AR_GET_STATUS':
                sendToParent('AR_STATUS', {
                    initialized: ARRuntime.initialized,
                    activeNFTs: Array.from(ARRuntime.activeNFTs.keys())
                });
                break;

            default:
                log('⚠️', `Unknown message type: ${type}`);
        }
    }

    // ========== QR DETECTION ==========

    /**
     * Initialize ZXing QR reader
     */
    function initQRReader() {
        if (typeof ZXing === 'undefined') {
            log('⚠️', 'ZXing library not loaded');
            return false;
        }

        try {
            const hints = new Map();
            hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.QR_CODE]);
            ARRuntime.qrDetection.reader = new ZXing.BrowserMultiFormatReader(hints);
            log('✅', 'ZXing QR reader initialized');
            return true;
        } catch (e) {
            log('❌', 'Failed to initialize ZXing:', e);
            return false;
        }
    }

    /**
     * Start QR code scanning from video element
     */
    function startQRScanning() {
        if (!ARRuntime.qrDetection.enabled || ARRuntime.qrDetection.scanning) {
            return;
        }

        // Find AR.js video element - try multiple selectors
        // AR.js creates a video element with id "arjs-video" or just a <video> tag
        let video = document.querySelector('#arjs-video');

        if (!video) {
            // Try finding any video element
            video = document.querySelector('video');
        }

        if (!video) {
            // Try finding by class or any video-related element
            video = document.querySelector('.a-grab-cursor video') ||
                document.querySelector('a-scene video') ||
                document.querySelector('[id*="video"]');
        }

        // Log what we found for debugging
        log('🔎', 'Video search result:', {
            found: !!video,
            id: video?.id || 'no-id',
            readyState: video?.readyState,
            videoWidth: video?.videoWidth,
            videoHeight: video?.videoHeight
        });

        if (!video) {
            log('⏳', 'Video element not found, waiting...');
            setTimeout(startQRScanning, 500);
            return;
        }

        if (video.readyState < video.HAVE_CURRENT_DATA) {
            log('⏳', 'Video not ready (state: ' + video.readyState + '), waiting...');
            setTimeout(startQRScanning, 500);
            return;
        }

        ARRuntime.video = video;
        ARRuntime.qrDetection.scanning = true;

        log('🔍', 'QR scanning started', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
        });

        // Send video ready to parent
        sendToParent('AR_VIDEO_READY', {
            width: video.videoWidth,
            height: video.videoHeight
        });

        // Start scan loop
        scanQRCode();
    }

    /**
     * Stop QR scanning
     */
    function stopQRScanning() {
        ARRuntime.qrDetection.scanning = false;
        if (ARRuntime.qrDetection.scanTimeoutId) {
            clearTimeout(ARRuntime.qrDetection.scanTimeoutId);
            ARRuntime.qrDetection.scanTimeoutId = null;
        }
        log('🛑', 'QR scanning stopped');
    }

    /**
     * Scan a single frame for QR codes
     */
    async function scanQRCode() {
        if (!ARRuntime.qrDetection.scanning || !ARRuntime.video) {
            return;
        }

        try {
            const video = ARRuntime.video;

            if (video.readyState >= video.HAVE_CURRENT_DATA) {
                // Create canvas for frame capture
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Decode QR from canvas
                if (ARRuntime.qrDetection.reader) {
                    try {
                        const result = await ARRuntime.qrDetection.reader.decodeFromCanvas(canvas);
                        if (result && result.text) {
                            handleQRDetected(result.text);
                        }
                    } catch (decodeError) {
                        // No QR found in this frame - normal
                    }
                }
            }
        } catch (error) {
            log('❌', 'QR scan error:', error);
        }

        // Schedule next scan (continue for multi-flashcard support)
        if (ARRuntime.qrDetection.scanning) {
            ARRuntime.qrDetection.scanTimeoutId = setTimeout(
                scanQRCode,
                ARRuntime.qrDetection.scanInterval
            );
        }
    }

    /**
     * Handle detected QR code
     */
    function handleQRDetected(qrId) {
        const qr = ARRuntime.qrDetection;

        // Check if this is a new detection
        if (qrId === qr.lastDetected) {
            return; // Same QR, skip duplicate
        }

        log('📱', `QR Code detected: ${qrId}`);

        qr.lastDetected = qrId;
        qr.detectedMarkers.add(qrId);

        // Send to parent React app
        sendToParent('QR_DETECTED', {
            qrId: qrId,
            allDetected: Array.from(qr.detectedMarkers)
        });
    }

    /**
     * Clear QR detection cache (for reset)
     */
    function clearQRCache() {
        ARRuntime.qrDetection.lastDetected = null;
        ARRuntime.qrDetection.detectedMarkers.clear();
        log('🔄', 'QR detection cache cleared');
    }

    // ========== A-FRAME COMPONENTS ==========

    /**
     * Register proxy-click component for model interactions
     */
    function registerComponents() {
        if (typeof AFRAME === 'undefined') {
            console.error('A-Frame not loaded!');
            return;
        }

        AFRAME.registerComponent('proxy-click', {
            init: function () {
                this.el.addEventListener('click', () => {
                    const markerId = this.el.id.replace('model-', '');
                    log('👆', `Model clicked: ${markerId}`);
                    sendToParent('AR_MODEL_CLICK', { markerId });
                });
            }
        });

        log('✅', 'A-Frame components registered');
    }

    // ========== INITIALIZATION ==========

    function init() {
        log('🚀', 'AR Runtime initializing...');

        // Wait for A-Frame to be fully loaded
        if (typeof AFRAME === 'undefined') {
            log('⏳', 'A-Frame not yet loaded, retrying in 100ms...');
            setTimeout(init, 100);
            return;
        }

        // Get scene reference
        ARRuntime.scene = document.querySelector('a-scene');

        if (!ARRuntime.scene) {
            log('⏳', 'A-Frame scene not found, retrying in 100ms...');
            setTimeout(init, 100);
            return;
        }

        // Register custom components
        registerComponents();

        // Initialize ZXing QR reader
        initQRReader();

        // Start observing for video element injection (Task 1.3)
        observeVideoInjection();

        // Wait for scene to be loaded before proceeding
        if (ARRuntime.scene.hasLoaded) {
            onSceneLoaded();
        } else {
            ARRuntime.scene.addEventListener('loaded', onSceneLoaded);
        }

        // Listen for messages from parent
        window.addEventListener('message', handleParentMessage);

        log('✅', 'AR Runtime initialized, waiting for AR.js and starting QR scan...');
    }

    function onSceneLoaded() {
        log('🎬', 'A-Frame scene loaded');

// Listen for AR.js video ready
            window.addEventListener('arjs-video-loaded', () => {
                log('🎥', 'AR.js video loaded event received');
                forceVideoLayering();
                startQRScanning();
            });

            // Listen for AR.js ready
            window.addEventListener('arjs-nft-loaded', () => {
                log('✅', 'AR.js NFT system loaded');
                ARRuntime.initialized = true;
                sendToParent('AR_READY', { initialized: true });
            });

// Fallback: Try to start QR scanning after delay
            setTimeout(() => {
                if (!ARRuntime.qrDetection.scanning) {
                    log('⏳', 'Fallback: Attempting to start QR scanning...');
                    forceVideoLayering();
                    startQRScanning();
                }

                if (!ARRuntime.initialized) {
                    log('⚠️', 'AR.js init timeout, forcing ready state');
                    ARRuntime.initialized = true;
                    sendToParent('AR_READY', { initialized: true, fallback: true });
                }
            }, 3000);
    }

    // ========== BOOTSTRAP ==========

    // Wait for DOM ready, then init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.ARRuntime = ARRuntime;
    window.ARRuntime.createNFT = createNFTMarker;
    window.ARRuntime.removeNFT = removeNFTMarker;
    window.ARRuntime.clearAll = clearAllNFTs;
    window.ARRuntime.startQR = startQRScanning;
    window.ARRuntime.stopQR = stopQRScanning;
    window.ARRuntime.clearQRCache = clearQRCache;

})();

