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
    
    // Proximity detection settings
    let PROXIMITY_THRESHOLD = 0.5; // Distance in 3D units to trigger combo
    const PROXIMITY_CHECK_INTERVAL = 100; // Check every 100ms
    let proximityCheckTimer = null;
    let lastProximityState = false;
    let comboEffectsActive = false;

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
            // Proximity detection controls
            case 'SET_PROXIMITY_THRESHOLD':
                if (typeof payload.threshold === 'number') {
                    PROXIMITY_THRESHOLD = payload.threshold;
                    log('📏', `Proximity threshold set to ${PROXIMITY_THRESHOLD}`);
                }
                break;
            case 'ENABLE_COMBO_EFFECTS':
                if (lastProximityState) {
                    const target0 = document.getElementById('target-0');
                    const target1 = document.getElementById('target-1');
                    if (target0 && target1) {
                        const pos0 = new THREE.Vector3();
                        const pos1 = new THREE.Vector3();
                        target0.object3D.getWorldPosition(pos0);
                        target1.object3D.getWorldPosition(pos1);
                        const midpoint = new THREE.Vector3().addVectors(pos0, pos1).multiplyScalar(0.5);
                        triggerComboEffects(midpoint);
                    }
                }
                break;
            case 'DISABLE_COMBO_EFFECTS':
                removeComboEffects();
                break;
        }
    }

    window.addEventListener('message', handleParentMessage);

    // ============ INIT ============
    function init() {
        log('🚀', 'Initializing MindAR Viewer...');
        log('📍', `mind=${mindUrl}`);
        log('📍', `model=${modelUrl}`);
        log('📍', `image=${imageUrl}`);

        if (!mindUrl) {
            log('❌', 'No mind file specified!');
            loadingText.textContent = '❌ No mind file specified';
            sendToParent('SYSTEM_ERROR', {
                code: 'NO_MIND_FILE',
                message: 'No mind file URL provided'
            });
            return;
        }

        log('⏳', 'Setting up A-Frame scene with MindAR...');
        scene.setAttribute('mindar-image', `imageTargetSrc: ${mindUrl}; maxTrack: 2; uiLoading: no; uiScanning: no; uiError: no`);
        log('✅', 'MindAR attribute set');

        if (modelUrl) {
            log('📦', 'Loading 3D model 0:', modelUrl);
            document.getElementById('mode-3d-0').setAttribute('gltf-model', modelUrl);
        }

        if (imageUrl) {
            log('🖼️', 'Loading 2D image 0:', imageUrl);
            document.getElementById('mode-2d-0').setAttribute('src', imageUrl);
        }

        if (modelUrl2) {
            log('📦', 'Loading 3D model 1:', modelUrl2);
            document.getElementById('mode-3d-1').setAttribute('gltf-model', modelUrl2);
        }

        log('🎧', 'Setting up event listeners...');
        setupEventListeners();
        log('✅', 'MindAR Viewer initialization complete');
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
                
                // Stop proximity checking if not enough targets
                if (activeTargets.size < COMBO_THRESHOLD) {
                    stopProximityCheck();
                }
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
        if (activeTargets.size < COMBO_THRESHOLD) {
            stopProximityCheck();
            return;
        }

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
        
        // Start proximity checking when multiple targets are visible
        startProximityCheck();
    }

    // ============ PROXIMITY DETECTION ============
    /**
     * Start continuous proximity checking between tracked targets
     */
    function startProximityCheck() {
        if (proximityCheckTimer) return; // Already running
        
        log('📏', 'Starting proximity detection');
        
        proximityCheckTimer = setInterval(() => {
            checkTargetProximity();
        }, PROXIMITY_CHECK_INTERVAL);
    }

    /**
     * Stop proximity checking
     */
    function stopProximityCheck() {
        if (proximityCheckTimer) {
            clearInterval(proximityCheckTimer);
            proximityCheckTimer = null;
            log('📏', 'Stopped proximity detection');
        }
        
        // If combo was active, send end event
        if (lastProximityState) {
            lastProximityState = false;
            comboEffectsActive = false;
            sendToParent('COMBO_PROXIMITY_ENDED', {
                targets: [0, 1]
            });
        }
    }

    /**
     * Check if tracked targets are close to each other in 3D space
     */
    function checkTargetProximity() {
        if (activeTargets.size < 2) {
            if (lastProximityState) {
                lastProximityState = false;
                comboEffectsActive = false;
                sendToParent('COMBO_PROXIMITY_ENDED', { targets: [0, 1] });
            }
            return;
        }

        const target0 = document.getElementById('target-0');
        const target1 = document.getElementById('target-1');

        if (!target0 || !target1) return;

        // Get world positions of both targets
        const pos0 = new THREE.Vector3();
        const pos1 = new THREE.Vector3();

        target0.object3D.getWorldPosition(pos0);
        target1.object3D.getWorldPosition(pos1);

        // Calculate distance
        const distance = pos0.distanceTo(pos1);

        // Calculate midpoint for combo effects
        const midpoint = new THREE.Vector3().addVectors(pos0, pos1).multiplyScalar(0.5);

        const isClose = distance < PROXIMITY_THRESHOLD;

        // State changed - send appropriate event
        if (isClose !== lastProximityState) {
            lastProximityState = isClose;

            if (isClose) {
                log('✨', `Proximity detected! Distance: ${distance.toFixed(3)}`);
                comboEffectsActive = true;

                sendToParent('COMBO_PROXIMITY_DETECTED', {
                    targets: [0, 1],
                    distance: distance,
                    midpoint: {
                        x: midpoint.x,
                        y: midpoint.y,
                        z: midpoint.z
                    },
                    positions: {
                        target0: { x: pos0.x, y: pos0.y, z: pos0.z },
                        target1: { x: pos1.x, y: pos1.y, z: pos1.z }
                    }
                });

                // Trigger visual feedback in scene
                triggerComboEffects(midpoint);
            } else {
                log('👋', `Proximity ended. Distance: ${distance.toFixed(3)}`);
                comboEffectsActive = false;

                sendToParent('COMBO_PROXIMITY_ENDED', {
                    targets: [0, 1],
                    distance: distance
                });

                // Remove visual effects
                removeComboEffects();
            }
        }

        // Send continuous updates while in proximity (for smooth effects)
        if (isClose) {
            sendToParent('COMBO_PROXIMITY_UPDATE', {
                targets: [0, 1],
                distance: distance,
                midpoint: {
                    x: midpoint.x,
                    y: midpoint.y,
                    z: midpoint.z
                }
            });
        }
    }

    /**
     * Trigger visual combo effects at the midpoint
     */
    function triggerComboEffects(midpoint) {
        // Create or update combo effect entity
        let comboEntity = document.getElementById('combo-effect');
        
        if (!comboEntity) {
            comboEntity = document.createElement('a-entity');
            comboEntity.id = 'combo-effect';
            scene.appendChild(comboEntity);
        }

        // Position at midpoint
        comboEntity.setAttribute('position', `${midpoint.x} ${midpoint.y} ${midpoint.z}`);
        
        // Add glowing ring effect
        comboEntity.innerHTML = `
            <a-ring 
                radius-inner="0.08" 
                radius-outer="0.12" 
                color="#FFD700" 
                opacity="0.8"
                animation="property: scale; to: 1.5 1.5 1.5; dur: 500; easing: easeOutQuad; loop: true; dir: alternate"
                animation__rotate="property: rotation; to: 0 0 360; dur: 2000; easing: linear; loop: true"
            ></a-ring>
            <a-ring 
                radius-inner="0.12" 
                radius-outer="0.18" 
                color="#FF6B6B" 
                opacity="0.6"
                animation="property: scale; to: 1.3 1.3 1.3; dur: 700; easing: easeOutQuad; loop: true; dir: alternate"
                animation__rotate="property: rotation; to: 0 0 -360; dur: 3000; easing: linear; loop: true"
            ></a-ring>
            <a-text 
                value="✨ COMBO! ✨" 
                align="center" 
                color="#FFFFFF"
                scale="0.15 0.15 0.15"
                position="0 0.2 0"
                animation="property: position; to: 0 0.25 0; dur: 500; easing: easeOutQuad; loop: true; dir: alternate"
            ></a-text>
        `;

        log('🎆', 'Combo effects triggered');
    }

    /**
     * Remove combo visual effects
     */
    function removeComboEffects() {
        const comboEntity = document.getElementById('combo-effect');
        if (comboEntity) {
            comboEntity.parentNode.removeChild(comboEntity);
            log('🧹', 'Combo effects removed');
        }
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
