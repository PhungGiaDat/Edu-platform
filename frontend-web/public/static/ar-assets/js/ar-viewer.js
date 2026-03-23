/**
 * ar-viewer.js - MindAR Viewer Logic
 * Handles AR tracking, interactions, and parent communication
 * 
 * Uses typed ARMessage protocol for communication with React parent
 */
(function () {
    'use strict';

    console.log('[AR-Viewer] 🚀 ar-viewer.js script loaded and executing');
    console.log('[AR-Viewer] 📅 Timestamp:', new Date().toISOString());
    console.log('[AR-Viewer] 🌐 User Agent:', navigator.userAgent);

    // Note: Loading overlay was removed for cleaner UX - elements may not exist
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const modeIndicator = document.getElementById('mode-indicator');
    const scene = document.getElementById('ar-scene');

    // Safe helper to hide loading overlay (may not exist)
    function hideLoadingOverlay() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Safe helper to update loading text (may not exist)
    function setLoadingText(text) {
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

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
    const comboModelUrl = params.get('comboModel'); // NEW: combo model URL
    // Words for click-to-sound — stored in window globals so SET_WORD can update them too
    window._arWord0 = params.get('word') || '';
    window._arWord1 = params.get('word2') || '';

    log('🔧', `Params: mind=${mindUrl}, model=${modelUrl}, word=${window._arWord0}`);

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
            // Set the word label for click-to-sound
            case 'SET_WORD':
                if (typeof payload.targetIndex === 'number' && typeof payload.word === 'string') {
                    window[`_arWord${payload.targetIndex}`] = payload.word;
                    log('🔤', `Word set for target ${payload.targetIndex}: "${payload.word}"`);
                }
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
        log('🌐', `window.location.href=${window.location.href}`);
        log('🔍', `URL params count: ${Array.from(params.keys()).length}`);

        if (!mindUrl) {
            log('❌', 'No mind file specified!');
            setLoadingText('❌ No mind file specified');
            const overlay = document.getElementById('ar-loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 400);
            }
            sendToParent('SYSTEM_ERROR', {
                code: 'NO_MIND_FILE',
                message: 'No mind file URL provided'
            });
            return;
        }

        log('⏳', 'Setting up A-Frame scene with MindAR...');
        log('📥', `Attempting to fetch MIND file: ${mindUrl}`);
        
        // Test MIND file accessibility
        fetch(mindUrl, { method: 'HEAD' })
            .then(response => {
                log('✅', `MIND file HEAD response: ${response.status} ${response.statusText}`);
                log('📋', `Content-Type: ${response.headers.get('content-type')}`);
                log('📊', `Content-Length: ${response.headers.get('content-length')} bytes`);
            })
            .catch(error => {
                log('❌', `MIND file fetch error: ${error.message}`);
                sendToParent('SYSTEM_ERROR', {
                    code: 'MIND_FILE_FETCH_ERROR',
                    message: `Failed to fetch MIND file: ${error.message}`,
                    url: mindUrl
                });
            });
        
        // filterMinCF: higher = faster response; filterBeta: lower = smoother tracking
        const mindArConfig = `imageTargetSrc: ${mindUrl}; maxTrack: 2; uiLoading: no; uiScanning: no; uiError: no; filterMinCF: 0.001; filterBeta: 0.001`;
        log('⚙️', `MindAR config: ${mindArConfig}`);
        scene.setAttribute('mindar-image', mindArConfig);
        log('✅', 'MindAR attribute set on scene element');

        const assetsEl = document.querySelector('a-assets') || document.createElement('a-assets');
        if (!document.querySelector('a-assets')) {
            log('📦', 'Creating new a-assets element');
            scene.appendChild(assetsEl);
        } else {
            log('📦', 'Using existing a-assets element');
        }

        if (modelUrl) {
            log('📦', 'Loading 3D model 0:', modelUrl);
            log('🔗', 'Model URL scheme:', new URL(modelUrl).protocol);
            const loadText = document.getElementById('ar-load-text');
            if (loadText) loadText.textContent = 'Loading 3D model...';
            const assetItem = document.createElement('a-asset-item');
            assetItem.setAttribute('id', 'model-asset-0');
            assetItem.setAttribute('src', modelUrl);
            assetItem.setAttribute('crossorigin', 'anonymous');
            // Update loading text on load events
            assetItem.addEventListener('loaded', () => {
                log('✅', 'Model 0 loaded successfully');
                if (loadText) loadText.textContent = 'Model ready! Starting AR...';
            });
            assetItem.addEventListener('error', (e) => {
                log('❌', 'Model 0 load error:', e);
                if (loadText) loadText.textContent = 'Model unavailable, continuing...';
                sendToParent('SYSTEM_ERROR', {
                    code: 'MODEL_LOAD_ERROR',
                    message: 'Failed to load 3D model',
                    url: modelUrl
                });
                // Don't block — AR can still track without the model
                setTimeout(() => {
                    const overlay = document.getElementById('ar-loading-overlay');
                    if (overlay) { overlay.style.opacity = '0'; setTimeout(() => { overlay.style.display = 'none'; }, 400); }
                }, 1000);
            });
            assetItem.setAttribute('timeout', '15000');
            assetsEl.appendChild(assetItem);
            log('🔗', 'Setting gltf-model attribute on mode-3d-0');
            document.getElementById('mode-3d-0').setAttribute('gltf-model', '#model-asset-0');
        } else {
            log('⚠️', 'No 3D model URL provided for target 0');
        }

        if (imageUrl) {
            log('🖼️', 'Loading 2D image 0:', imageUrl);
            const imgAsset = document.createElement('img');
            imgAsset.setAttribute('id', 'img-asset-0');
            imgAsset.setAttribute('src', imageUrl);
            imgAsset.setAttribute('crossorigin', 'anonymous');
            imgAsset.addEventListener('load', () => {
                log('✅', '2D image 0 loaded successfully');
            });
            imgAsset.addEventListener('error', (e) => {
                log('❌', '2D image 0 load error:', e);
            });
            assetsEl.appendChild(imgAsset);
            document.getElementById('mode-2d-0').setAttribute('src', '#img-asset-0');
        } else {
            log('⚠️', 'No 2D image URL provided for target 0');
        }

        if (modelUrl2) {
            log('📦', 'Loading 3D model 1:', modelUrl2);
            const assetItem2 = document.createElement('a-asset-item');
            assetItem2.setAttribute('id', 'model-asset-1');
            assetItem2.setAttribute('src', modelUrl2);
            assetItem2.setAttribute('crossorigin', 'anonymous');
            assetItem2.setAttribute('timeout', '15000');
            assetItem2.addEventListener('loaded', () => {
                log('✅', 'Model 1 loaded successfully');
            });
            assetItem2.addEventListener('error', (e) => {
                log('❌', 'Model 1 load error:', e);
                sendToParent('SYSTEM_ERROR', {
                    code: 'MODEL_LOAD_ERROR',
                    message: 'Failed to load 3D model 1',
                    url: modelUrl2
                });
                const overlay = document.getElementById('ar-loading-overlay');
                if (overlay) {
                    overlay.style.opacity = '0';
                    setTimeout(() => { overlay.style.display = 'none'; }, 400);
                }
            });
            assetsEl.appendChild(assetItem2);
            document.getElementById('mode-3d-1').setAttribute('gltf-model', '#model-asset-1');
        } else {
            log('⚠️', 'No 3D model URL provided for target 1 (optional)');
        }

        log('🎧', 'Setting up event listeners...');
        setupEventListeners();
        log('✅', 'MindAR Viewer initialization complete');
    }

    // ============ EVENT LISTENERS ============
    function setupEventListeners() {
        log('🎧', 'Setting up scene event listeners...');
        
        scene.addEventListener('arReady', () => {
            log('✅', '🎉 AR READY EVENT FIRED - MindAR initialized successfully!');
            log('✅', 'Camera and tracking are now active');
            isReady = true;
            hideLoadingOverlay();

            // Hide the custom loading overlay
            const arLoadingOverlay = document.getElementById('ar-loading-overlay');
            if (arLoadingOverlay) {
                arLoadingOverlay.style.opacity = '0';
                setTimeout(() => { arLoadingOverlay.style.display = 'none'; }, 400);
            }

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
            log('❌', '🚨 AR ERROR EVENT FIRED!');
            log('❌', 'AR Error details:', e.detail);
            log('❌', 'This usually means MindAR failed to initialize or MIND file is invalid');
            setLoadingText('❌ AR Error');
            const overlay = document.getElementById('ar-loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 400);
            }
            sendToParent('SYSTEM_ERROR', {
                code: 'AR_ERROR',
                message: e.detail || 'Unknown error',
                mindUrl: mindUrl
            });
        });
        
        // Log A-Frame scene loaded event
        scene.addEventListener('loaded', () => {
            log('✅', 'A-Frame scene loaded event fired');
            log('📊', 'Scene children count:', scene.children.length);
        });
        
        // Monitor for any render errors
        scene.addEventListener('renderstart', () => {
            log('🎨', 'Scene render started');
        });

        // Failsafe: never leave user blocked by loading overlay
        window.setTimeout(() => {
            if (!isReady) {
                log('⚠️', '⏰ Timeout reached - AR not ready after 10 seconds');
                log('⚠️', 'Forcing loading overlay removal');
                const overlay = document.getElementById('ar-loading-overlay');
                if (overlay && overlay.style.display !== 'none') {
                    const txt = document.getElementById('ar-load-text');
                    if (txt) txt.textContent = 'Starting camera...';
                    overlay.style.opacity = '0';
                    setTimeout(() => { overlay.style.display = 'none'; }, 400);
                }
            }
        }, 10000);

        // Target tracking
        log('🎯', 'Setting up target tracking listeners for target-0 and target-1');
        ['target-0', 'target-1'].forEach((id, index) => {
            const target = document.getElementById(id);
            if (!target) {
                log('⚠️', `Target element ${id} not found in DOM`);
                return;
            }
            log('✅', `Target element ${id} found, attaching listeners`);

            target.addEventListener('targetFound', () => {
                log('🎯', `✨ TARGET ${index} FOUND! Image detected by MindAR`);
                log('🎯', `Target ${index} is now being tracked`);
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
                log('👋', `Target ${index} lost - image no longer detected`);
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

        // ── Click-to-sound + click-to-move via event delegation ──────────────────
        // Use scene-level delegation so it fires even after models load dynamically.
        // A-Frame bubbles 'click' up to the scene element.
        scene.addEventListener('click', (evt) => {
            const el = evt.target;
            if (!el || !el.classList || !el.classList.contains('clickable')) return;

            log('👆', `Model clicked: ${el.id}`);

            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate([40, 20, 40]);

            const targetIndex = el.id.includes('-1') ? 1 : 0;

            // ── Click-to-move: bounce the model up then back ──────────────────
            const modelEl = document.getElementById(`mode-3d-${targetIndex}`);
            if (modelEl) {
                const currentPos = modelEl.getAttribute('position') || { x: 0, y: 0.05, z: 0 };
                const baseY = parseFloat(currentPos.y) || 0.05;
                const jumpY = baseY + 0.15;

                // Jump up
                modelEl.setAttribute('animation__click_up', [
                    'property: position',
                    `from: ${currentPos.x || 0} ${baseY} ${currentPos.z || 0}`,
                    `to: ${currentPos.x || 0} ${jumpY} ${currentPos.z || 0}`,
                    'dur: 200',
                    'easing: easeOutQuad',
                    'startEvents: click-jump-up'
                ].join('; '));

                // Drop back
                modelEl.setAttribute('animation__click_down', [
                    'property: position',
                    `from: ${currentPos.x || 0} ${jumpY} ${currentPos.z || 0}`,
                    `to: ${currentPos.x || 0} ${baseY} ${currentPos.z || 0}`,
                    'dur: 300',
                    'easing: easeInBounce',
                    'startEvents: click-jump-down'
                ].join('; '));

                modelEl.emit('click-jump-up');
                setTimeout(() => modelEl.emit('click-jump-down'), 200);

                // Scale pulse for feedback
                modelEl.setAttribute('animation__click_scale', [
                    'property: scale',
                    'from: 0.25 0.25 0.25',
                    'to: 0.32 0.32 0.32',
                    'dir: alternate',
                    'loop: 1',
                    'dur: 150',
                    'startEvents: click-scale'
                ].join('; '));
                modelEl.emit('click-scale');
            }

            // ── Click-to-sound: speak the word via Web Speech API ────────────────
            const wordToSpeak = targetIndex === 0
                ? (window._arWord0 || '')
                : (window._arWord1 || '');

            if (wordToSpeak && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(wordToSpeak);
                utter.lang = 'en-US';
                utter.rate = 0.85;
                utter.pitch = 1.1;
                utter.volume = 1.0;
                window.speechSynthesis.speak(utter);
                log('🔊', `Speaking: "${wordToSpeak}"`);
            }

            // Notify React parent
            sendToParent('MODEL_CLICKED', {
                modelId: el.id,
                targetIndex
            });
        });

        // ============ TOUCH GESTURE SYSTEM ============
        // Native touch events for mobile compatibility (A-Frame cursor doesn't work on mobile)
        
        const touchState = {
            active: false,
            touchCount: 0,
            startTouch: null,
            lastTouch: null,
            initialDistance: 0,
            initialAngle: 0,
            targetedModel: null,
            targetIndex: null,
            lastTapTime: 0,
            isDragging: false,
            gestureType: null, // 'tap', 'drag', 'pinch', 'twist'
            startPosition: { x: 0, y: 0 }
        };

        // Gesture detection thresholds
        const DRAG_THRESHOLD = 10; // pixels - movement > 10px = drag, not tap
        const DOUBLE_TAP_TIMEOUT = 300; // ms - taps < 300ms apart = double-tap
        const ROTATION_SPEED = 0.01; // radians per pixel drag (for Phase 2)
        const MIN_SCALE = 0.15; // minimum model scale (for Phase 3)
        const MAX_SCALE = 2.5; // maximum model scale (for Phase 3)

        /**
         * Handle touch start - detect which model was touched
         */
        function handleTouchStart(evt) {
            evt.preventDefault();
            
            const touches = evt.touches;
            touchState.touchCount = touches.length;
            touchState.active = true;
            touchState.startTouch = touches[0];
            touchState.lastTouch = touches[0];
            touchState.startPosition = {
                x: touches[0].clientX,
                y: touches[0].clientY
            };
            touchState.isDragging = false;

            // Perform raycast to find which model was touched
            const intersectedModel = performRaycast(touches[0].clientX, touches[0].clientY);
            
            if (intersectedModel) {
                touchState.targetedModel = intersectedModel.element;
                touchState.targetIndex = intersectedModel.targetIndex;
                
                log('👆', `Touch started on model ${touchState.targetIndex}`);
                
                // Haptic feedback on touch start
                if (navigator.vibrate) {
                    navigator.vibrate(40);
                }
            } else {
                touchState.targetedModel = null;
                touchState.targetIndex = null;
            }

            // For multi-touch gestures (Phase 3 & 4)
            if (touches.length === 2) {
                const dx = touches[1].clientX - touches[0].clientX;
                const dy = touches[1].clientY - touches[0].clientY;
                touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
                touchState.initialAngle = Math.atan2(dy, dx);
                touchState.gestureType = 'pinch'; // Will be used in Phase 3
            } else {
                touchState.gestureType = 'tap'; // Assume tap until proven otherwise
            }
        }

        /**
         * Handle touch move - detect drag/pinch/twist gestures
         */
        function handleTouchMove(evt) {
            evt.preventDefault();

            if (!touchState.active) return;

            const touches = evt.touches;
            
            // Single-finger drag detection
            if (touches.length === 1 && touchState.gestureType === 'tap') {
                const deltaX = touches[0].clientX - touchState.startPosition.x;
                const deltaY = touches[0].clientY - touchState.startPosition.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // If moved more than threshold, it's a drag not a tap
                if (distance > DRAG_THRESHOLD) {
                    touchState.isDragging = true;
                    touchState.gestureType = 'drag';
                    
                    // Phase 2: Drag-to-rotate will be implemented here
                    // For now, just log it
                    log('🔄', `Drag detected - Phase 2 will implement rotation`);
                }
            }

            // Multi-finger gestures (Phase 3 & 4)
            if (touches.length === 2 && touchState.targetedModel) {
                const dx = touches[1].clientX - touches[0].clientX;
                const dy = touches[1].clientY - touches[0].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const currentAngle = Math.atan2(dy, dx);

                // Phase 3: Pinch-to-zoom will be implemented here
                const scaleFactor = currentDistance / touchState.initialDistance;
                log('🤏', `Pinch detected - scale factor: ${scaleFactor.toFixed(2)} (Phase 3)`);

                // Phase 4: Two-finger rotation will be implemented here
                const angleDelta = currentAngle - touchState.initialAngle;
                log('🔄', `Twist detected - angle delta: ${angleDelta.toFixed(2)}rad (Phase 4)`);
            }

            touchState.lastTouch = touches[0];
        }

        /**
         * Handle touch end - trigger tap actions (audio + animation)
         */
        function handleTouchEnd(evt) {
            evt.preventDefault();

            if (!touchState.active) return;

            const now = Date.now();
            const timeSinceLastTap = now - touchState.lastTapTime;

            // If it was a tap (not drag) and a model was targeted
            if (!touchState.isDragging && touchState.targetedModel && touchState.gestureType === 'tap') {
                
                // Check for double-tap (Phase 5)
                if (timeSinceLastTap < DOUBLE_TAP_TIMEOUT) {
                    log('👆👆', `Double-tap detected on model ${touchState.targetIndex} (Phase 5 will reset)`);
                    // Phase 5: Reset model transform will be implemented here
                } else {
                    // Single tap - play audio and animate
                    handleModelTap(touchState.targetedModel, touchState.targetIndex);
                }

                touchState.lastTapTime = now;
            }

            // Reset touch state
            touchState.active = false;
            touchState.touchCount = 0;
            touchState.startTouch = null;
            touchState.lastTouch = null;
            touchState.isDragging = false;
            touchState.gestureType = null;
            touchState.targetedModel = null;
            touchState.targetIndex = null;
        }

        /**
         * Perform manual 3D raycast from touch coordinates
         * Returns { element, targetIndex } if a model was hit, null otherwise
         */
        function performRaycast(touchX, touchY) {
            try {
                const camera = scene.camera;
                if (!camera) return null;

                // Convert touch coordinates to normalized device coordinates (NDC)
                // NDC range: -1 to 1 for both X and Y
                const ndcX = (touchX / window.innerWidth) * 2 - 1;
                const ndcY = -(touchY / window.innerHeight) * 2 + 1;

                // Create THREE.js raycaster
                const raycaster = new THREE.Raycaster();
                const mouse = new THREE.Vector2(ndcX, ndcY);
                raycaster.setFromCamera(mouse, camera);

                // Get all clickable models
                const model0 = document.getElementById('mode-3d-0');
                const model1 = document.getElementById('mode-3d-1');
                const models = [model0, model1].filter(m => m && m.object3D);

                // Raycast against all models
                const intersects = [];
                models.forEach((modelEl, idx) => {
                    const hits = raycaster.intersectObjects(modelEl.object3D.children, true);
                    if (hits.length > 0) {
                        intersects.push({
                            element: modelEl,
                            targetIndex: modelEl.id.includes('-1') ? 1 : 0,
                            distance: hits[0].distance
                        });
                    }
                });

                // Return closest intersection
                if (intersects.length > 0) {
                    intersects.sort((a, b) => a.distance - b.distance);
                    return intersects[0];
                }

                return null;
            } catch (error) {
                log('❌', 'Raycast error:', error);
                return null;
            }
        }

        /**
         * Handle model tap - play audio and animate (Phase 1 core functionality)
         */
        function handleModelTap(modelEl, targetIndex) {
            log('👆', `Model tapped: ${modelEl.id}`);

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([40, 20, 40]);
            }

            // ── Bounce animation ──────────────────────────────────────────────
            const currentPos = modelEl.getAttribute('position') || { x: 0, y: 0.05, z: 0 };
            const baseY = parseFloat(currentPos.y) || (targetIndex === 0 ? 0.05 : 0.1);
            const jumpY = baseY + 0.15;

            // Jump up
            modelEl.setAttribute('animation__touch_up', [
                'property: position',
                `from: ${currentPos.x || 0} ${baseY} ${currentPos.z || 0}`,
                `to: ${currentPos.x || 0} ${jumpY} ${currentPos.z || 0}`,
                'dur: 200',
                'easing: easeOutQuad',
                'startEvents: touch-jump-up'
            ].join('; '));

            // Drop back
            modelEl.setAttribute('animation__touch_down', [
                'property: position',
                `from: ${currentPos.x || 0} ${jumpY} ${currentPos.z || 0}`,
                `to: ${currentPos.x || 0} ${baseY} ${currentPos.z || 0}`,
                'dur: 300',
                'easing: easeInBounce',
                'startEvents: touch-jump-down'
            ].join('; '));

            modelEl.emit('touch-jump-up');
            setTimeout(() => modelEl.emit('touch-jump-down'), 200);

            // Scale pulse for feedback
            const baseScale = targetIndex === 0 ? 0.25 : 0.5;
            const pulseScale = baseScale + 0.07;
            
            modelEl.setAttribute('animation__touch_scale', [
                'property: scale',
                `from: ${baseScale} ${baseScale} ${baseScale}`,
                `to: ${pulseScale} ${pulseScale} ${pulseScale}`,
                'dir: alternate',
                'loop: 1',
                'dur: 150',
                'startEvents: touch-scale'
            ].join('; '));
            modelEl.emit('touch-scale');

            // ── Play audio (Web Speech API) ───────────────────────────────────
            const wordToSpeak = targetIndex === 0
                ? (window._arWord0 || '')
                : (window._arWord1 || '');

            if (wordToSpeak && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(wordToSpeak);
                utter.lang = 'en-US';
                utter.rate = 0.85;
                utter.pitch = 1.1;
                utter.volume = 1.0;
                window.speechSynthesis.speak(utter);
                log('🔊', `Speaking: "${wordToSpeak}"`);
            }

            // Notify React parent
            sendToParent('MODEL_CLICKED', {
                modelId: modelEl.id,
                targetIndex,
                eventType: 'touch'
            });
        }

        // ── Attach touch event listeners to scene ─────────────────────────────
        scene.addEventListener('touchstart', handleTouchStart, { passive: false });
        scene.addEventListener('touchmove', handleTouchMove, { passive: false });
        scene.addEventListener('touchend', handleTouchEnd, { passive: false });

        log('✅', 'Touch gesture system initialized (Phase 1: tap-to-audio active)');
    }

    // ── Expose word slots so React parent can push words after QR decode ────────
    // Parent posts: { type: 'SET_WORD', payload: { targetIndex: 0, word: 'Elephant' } }
    // ar-viewer.js stores them in window._arWord0 / _arWord1

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
                
                // NEW: Load combo model to replace individual models
                loadComboModel(midpoint);
            } else {
                log('👋', `Proximity ended. Distance: ${distance.toFixed(3)}`);
                comboEffectsActive = false;

                sendToParent('COMBO_PROXIMITY_ENDED', {
                    targets: [0, 1],
                    distance: distance
                });

                // Remove visual effects
                removeComboEffects();
                
                // NEW: Remove combo model and restore individual models
                removeComboModel();
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

    /**
     * Load combo model at midpoint and hide individual models
     */
    function loadComboModel(midpoint) {
        // Only load combo model if we have a combo model URL
        if (!comboModelUrl) {
            log('⚠️', 'No combo model URL provided, skipping combo model load');
            return;
        }

        log('🎆', 'Loading combo model!');
        
        // Fade out individual models
        const model0 = document.getElementById('mode-3d-0');
        const model1 = document.getElementById('mode-3d-1');
        
        if (model0) model0.setAttribute('visible', 'false');
        if (model1) model1.setAttribute('visible', 'false');
        
        // Create combo model entity if it doesn't exist
        let comboModel = document.getElementById('combo-model');
        if (!comboModel) {
            comboModel = document.createElement('a-entity');
            comboModel.id = 'combo-model';
            comboModel.setAttribute('gltf-model', comboModelUrl);
            comboModel.setAttribute('scale', '0.4 0.4 0.4'); // Bigger for impact!
            comboModel.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 4000; easing: linear; loop: true');
            comboModel.setAttribute('animation__spawn', 'property: scale; from: 0 0 0; to: 0.4 0.4 0.4; dur: 600; easing: easeOutBack');
            scene.appendChild(comboModel);
            log('✨', 'Combo model entity created');
        }
        
        // Position at midpoint
        comboModel.setAttribute('position', `${midpoint.x} ${midpoint.y} ${midpoint.z}`);
        comboModel.setAttribute('visible', 'true');
        
        // Speak combo name
        if ('speechSynthesis' in window) {
            const comboName = 'Elephant in jungle combo!';
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(comboName);
            utter.lang = 'en-US';
            utter.rate = 0.9;
            utter.pitch = 1.1;
            window.speechSynthesis.speak(utter);
            log('🔊', 'Speaking combo name');
        }

        log('🎆', 'Combo model loaded at midpoint');
    }

    /**
     * Remove combo model and restore individual models
     */
    function removeComboModel() {
        const comboModel = document.getElementById('combo-model');
        const model0 = document.getElementById('mode-3d-0');
        const model1 = document.getElementById('mode-3d-1');
        
        if (comboModel) {
            comboModel.setAttribute('visible', 'false');
            log('🧹', 'Combo model hidden');
        }
        if (model0) {
            model0.setAttribute('visible', 'true');
            log('🔄', 'Model 0 restored');
        }
        if (model1) {
            model1.setAttribute('visible', 'true');
            log('🔄', 'Model 1 restored');
        }
        
        log('🧹', 'Combo model removed, individual models restored');
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

    // ============ HIDE MINDAR LOADING UI ============
    /**
     * Aggressively remove any MindAR loading/scanning UI elements
     * MindAR creates these dynamically even with uiLoading: no
     */
    function hideMindARUI() {
        // Remove by class patterns
        const selectors = [
            '[class*="mindar-ui"]',
            '[class*="mindar-loading"]',
            '[class*="loading-overlay"]',
            '[class*="scanning-overlay"]',
            '.a-loader-title',
            '.a-enter-vr',
            '.a-enter-ar'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.opacity = '0';
            });
        });


        // Find and hide elements containing "Loading" text
        document.querySelectorAll('div, span, p').forEach(el => {
            if (el.textContent && el.textContent.includes('Loading')) {
                // Check if it's not our own element
                if (!el.id || !el.id.includes('ar-')) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                }
            }
        });

        log('🧹', 'MindAR UI elements hidden');
    }

    // Run immediately and after short delays to catch dynamic elements
    hideMindARUI();
    setTimeout(hideMindARUI, 100);
    setTimeout(hideMindARUI, 500);
    setTimeout(hideMindARUI, 1000);

    // Also run when AR is ready
    scene.addEventListener('arReady', hideMindARUI);

    // Watch for dynamically added elements
    const observer = new MutationObserver((mutations) => {
        let shouldHide = false;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    const el = node;
                    const className = el.className || '';
                    const textContent = el.textContent || '';
                    if (className.toString().includes('mindar') ||
                        className.toString().includes('loading') ||
                        textContent.includes('Loading')) {
                        shouldHide = true;
                    }
                }
            });
        });
        if (shouldHide) {
            hideMindARUI();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // ============ START ============
    init();
})();
