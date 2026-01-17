/**
 * ar-viewer.js - MindAR Viewer Logic
 * Handles AR tracking, interactions, and parent communication
 * 
 * Uses typed ARMessage protocol for communication with React parent
 */
(function () {
    'use strict';

    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const modeIndicator = document.getElementById('mode-indicator');
    const scene = document.getElementById('ar-scene');

    let currentMode = '3D';
    let isReady = false;
    const activeTargets = new Map();
    const COMBO_THRESHOLD = 2;

    // ============ URL PARAMS ============
    const params = new URLSearchParams(window.location.search);
    const mindUrl = params.get('mind');
    const modelUrl = params.get('model');
    const imageUrl = params.get('image');
    const modelUrl2 = params.get('model2');

    log('🔧', `Params: mind=${mindUrl}, model=${modelUrl}`);

    // ============ TYPED MESSAGE PROTOCOL ============

    /**
     * Send typed message to parent (ARMessage format)
     */
    function sendToParent(type, payload) {
        if (window.parent && window.parent !== window) {
            const message = {
                type: type,
                payload: payload,
                timestamp: Date.now(),
                origin: 'child'
            };
            window.parent.postMessage(message, '*');
            log('📤', `Sent ${type}`);
        }
    }

    /**
     * Handle typed message from parent
     */
    function handleParentMessage(event) {
        const data = event.data;
        if (!data || !data.type) return;

        // Support both new format { type, payload } and legacy { type, ...data }
        const type = data.type;
        const payload = data.payload || data;

        log('📥', `Received ${type}`, payload);

        switch (type) {
            case 'SET_MODE':
                setMode(payload.mode);
                break;
            case 'TRIGGER_ANIMATION':
                triggerAnimation(payload.clip, payload.loop);
                break;
            case 'UPDATE_TEXTURE':
                updateTexture(payload.dataUrl, payload.targetMesh);
                break;
            case 'PLAY_AUDIO':
                playAudio(payload.url, payload.volume);
                break;
            case 'LOAD_MODEL':
                loadModel(payload.targetIndex, payload.url);
                break;
            case 'PAUSE_TRACKING':
                pauseTracking();
                break;
            case 'RESUME_TRACKING':
                resumeTracking();
                break;
            // Legacy support
            case 'PLAY_ANIMATION':
                playAnimation(payload.targetIndex, payload.animation);
                break;
            case 'UPDATE_MODEL':
                updateModel(payload.targetIndex, payload.modelUrl);
                break;
        }
    }

    window.addEventListener('message', handleParentMessage);

    // ============ INIT ============
    function init() {
        if (!mindUrl) {
            loadingText.textContent = '❌ No mind file specified';
            sendToParent('SYSTEM_ERROR', {
                code: 'NO_MIND_FILE',
                message: 'No mind file URL provided'
            });
            return;
        }

        scene.setAttribute('mindar-image', `imageTargetSrc: ${mindUrl}; maxTrack: 2; uiLoading: no; uiScanning: no; uiError: no`);

        if (modelUrl) {
            document.getElementById('mode-3d-0').setAttribute('gltf-model', modelUrl);
        }

        if (imageUrl) {
            document.getElementById('mode-2d-0').setAttribute('src', imageUrl);
        }

        if (modelUrl2) {
            document.getElementById('mode-3d-1').setAttribute('gltf-model', modelUrl2);
        }

        setupEventListeners();
    }

    // ============ EVENT LISTENERS ============
    function setupEventListeners() {
        scene.addEventListener('arReady', () => {
            log('✅', 'AR Ready');
            isReady = true;
            loadingOverlay.style.display = 'none';

            // Send SYSTEM_READY with capabilities
            sendToParent('SYSTEM_READY', {
                version: '1.0.0',
                capabilities: ['multi-track', 'texture-update', 'animation'],
                scene: 'viewer'
            });

            // Also send AR_READY for backwards compatibility
            sendToParent('AR_READY', {
                targetCount: 2
            });
        });

        scene.addEventListener('arError', (e) => {
            log('❌', 'AR Error: ' + e);
            loadingText.textContent = '❌ AR Error';
            sendToParent('SYSTEM_ERROR', {
                code: 'AR_ERROR',
                message: e.detail || 'Unknown error'
            });
        });

        // Target tracking
        ['target-0', 'target-1'].forEach((id, index) => {
            const target = document.getElementById(id);
            if (!target) return;

            target.addEventListener('targetFound', () => {
                log('🎯', `Target ${index} found`);
                activeTargets.set(index, {
                    element: target,
                    timestamp: Date.now()
                });

                sendToParent('TARGET_FOUND', {
                    targetIndex: index,
                    confidence: 1.0
                });

                checkMultiTarget();
            });

            target.addEventListener('targetLost', () => {
                log('👋', `Target ${index} lost`);
                activeTargets.delete(index);

                sendToParent('TARGET_LOST', {
                    targetIndex: index
                });
            });
        });

        // Clickable models
        document.querySelectorAll('.clickable').forEach((el) => {
            el.addEventListener('click', () => {
                log('👆', `Model clicked: ${el.id}`);

                if (navigator.vibrate) navigator.vibrate(50);

                sendToParent('MODEL_CLICKED', {
                    modelId: el.id,
                    targetIndex: el.id.includes('0') ? 0 : 1
                });
            });
        });
    }

    // ============ MULTI-TARGET DETECTION ============
    function checkMultiTarget() {
        if (activeTargets.size < COMBO_THRESHOLD) return;

        log('🔗', `Multi-target detected - ${activeTargets.size} targets active`);

        const targetIndices = Array.from(activeTargets.keys());

        sendToParent('MULTI_TARGET_DETECTED', {
            targets: targetIndices,
            arTags: targetIndices.map(i => `target-${i}`),
            comboType: 'pair'
        });

        sendToParent('COMBO_DETECTED', {
            targets: targetIndices
        });
    }

    // ============ MODE SWITCHING ============
    function setMode(mode) {
        currentMode = mode;
        if (modeIndicator) {
            modeIndicator.textContent = `Mode: ${mode}`;
        }

        const is3D = mode === '3D';

        const mode2d = document.getElementById('mode-2d-0');
        const mode3d = document.getElementById('mode-3d-0');

        if (mode2d) mode2d.setAttribute('visible', !is3D);
        if (mode3d) mode3d.setAttribute('visible', is3D);

        log('🔄', `Mode changed to ${mode}`);
    }

    // ============ ANIMATION ============
    function triggerAnimation(clipName, loop = false) {
        log('🎬', `Playing animation: ${clipName}`);

        document.querySelectorAll('[gltf-model]').forEach((model) => {
            model.setAttribute('animation-mixer', `clip: ${clipName}; loop: ${loop ? 'repeat' : 'once'}`);
        });

        // Notify parent when animation completes (estimate based on common durations)
        setTimeout(() => {
            sendToParent('ANIMATION_COMPLETE', { clip: clipName });
        }, loop ? 0 : 2000);
    }

    function playAnimation(targetIndex, animationName) {
        const model = document.getElementById(`mode-3d-${targetIndex}`);
        if (model) {
            model.emit(animationName || 'click');
        }
    }

    // ============ TEXTURE UPDATE ============
    function updateTexture(dataUrl, targetMesh) {
        log('🎨', `Updating texture: ${targetMesh || 'all'}`);

        if (!dataUrl) return;

        const img = new Image();
        img.onload = function () {
            document.querySelectorAll('[gltf-model]').forEach((modelEl) => {
                const mesh = modelEl.getObject3D('mesh');
                if (!mesh) return;

                mesh.traverse((node) => {
                    if (node.isMesh) {
                        if (targetMesh && !node.name.includes(targetMesh)) return;

                        const texture = new THREE.Texture(img);
                        texture.needsUpdate = true;
                        node.material.map = texture;
                        node.material.needsUpdate = true;
                    }
                });
            });
            log('✅', 'Texture applied');
        };
        img.src = dataUrl;
    }

    // ============ AUDIO ============
    function playAudio(url, volume = 1.0) {
        log('🔊', `Playing audio: ${url}`);

        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(e => log('⚠️', `Audio error: ${e.message}`));

        audio.onended = () => {
            sendToParent('AUDIO_COMPLETE', { url });
        };
    }

    // ============ MODEL LOADING ============
    function loadModel(targetIndex, modelUrl) {
        const model = document.getElementById(`mode-3d-${targetIndex}`);
        if (model && modelUrl) {
            model.setAttribute('gltf-model', modelUrl);
            log('📦', `Model loaded: ${modelUrl}`);
        }
    }

    function updateModel(targetIndex, newModelUrl) {
        loadModel(targetIndex, newModelUrl);
    }

    // ============ TRACKING CONTROL ============
    function pauseTracking() {
        log('⏸️', 'Tracking paused');
        scene.systems['mindar-image-system']?.pause?.();
    }

    function resumeTracking() {
        log('▶️', 'Tracking resumed');
        scene.systems['mindar-image-system']?.unpause?.();
    }

    // ============ LOGGING ============
    function log(emoji, message, data) {
        if (data) {
            console.log(`[AR-Viewer] ${emoji} ${message}`, data);
        } else {
            console.log(`[AR-Viewer] ${emoji} ${message}`);
        }
    }

    // ============ START ============
    init();
})();
