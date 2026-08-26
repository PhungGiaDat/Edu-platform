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
    const initializationStartedAt = Date.now();
    const MINDAR_INITIALIZATION_TIMEOUT_MS = 45_000;
    let initializationFailureReported = false;
    const activeTargets = new Map();
    const COMBO_THRESHOLD = 2;
    const targetLostTimers = new Map();
    const TARGET_LOST_GRACE_MS = 900;

    // ── Task 7: AR Target Registry (revisioned slot map) ─────────────────────
    let targetRegistry = null;   // ARTargetRegistry instance
    let currentCatalogId = catalogIdParam || null; // Initialise from URL param if available

    // ── Task 7: Add-card scanner ──────────────────────────────────────────────
    let addCardScanner = null;

    // Proximity detection settings
    let PROXIMITY_THRESHOLD = 0.5; // Distance in 3D units to trigger combo
    const PROXIMITY_CHECK_INTERVAL = 100; // Check every 100ms
    let proximityCheckTimer = null;
    let lastProximityState = false;
    let comboEffectsActive = false;

    // ============ URL PARAMS ============
    const params = new URLSearchParams(window.location.search);

    // Resolve Supabase storage base from parent-provided param; fall back to
    // the project's primary dev bucket so the iframe still works when the
    // parent cannot inject a base URL (e.g. debugging or legacy embed paths).
    const SUPABASE_BASE = (params.get('supabaseBase') || 'https://rofprrtoeyirssfndxag.supabase.co').replace(/\/$/, '');

    // ── Listen for Semantic Manager combo events ───────────────────────────────────
    document.addEventListener('ar:semantic-combo', function(e) {
        var result = e.detail || {};
        console.log('[AR-Viewer] Semantic combo event received:', result);
        if (result.animation || result.sound || result.phrase) {
            console.log('[AR-Viewer] Combo effect:', result.animation, result.sound, result.phrase);
        }
        if (result.model_3d_url) {
            console.log('[AR-Viewer] Loading semantic combo model:', result.model_3d_url);
            // Trigger combo model load at origin (0,0,0) — midpoint will be updated
            loadComboModel(new THREE.Vector3(0, 0, 0));
        }
    });
    const PALM_TREE_MODEL_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/models3d/palm_tree.glb`;
    const PALM_IMAGE_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/model2d/Palm.jpg`;
    const ELEPHANT_IMAGE_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/model2d/Elephant.jpg`;
    const COMBO_MODEL_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/models/combos/cute_elephant_jungle.glb`;
    const COMBO_IMAGE_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/model2d/elephant_tree_combo_layered.png`;
    const FALLBACK_COLORMAP_URL = '/textures/colormap-fallback.png';

    function isLegacySupabaseColormapUrl(url) {
        try {
            const parsed = new URL(url, window.location.href);
            const path = decodeURIComponent(parsed.pathname).replace(/\\/g, '/').toLowerCase();
            return (
                parsed.hostname.endsWith('.supabase.co') &&
                path.includes('/storage/v1/object/public/ar_models/') &&
                path.includes('/textures/') &&
                path.endsWith('/colormap.png')
            );
        } catch {
            return false;
        }
    }

    function installLegacyColormapFallback() {
        const three = window.THREE;
        const manager = three?.DefaultLoadingManager;
        if (!manager || manager.__eduLegacyColormapFallbackInstalled) {
            return;
        }

        const previousModifier = manager.urlModifier;
        manager.setURLModifier((url) => {
            const resolvedUrl = previousModifier ? previousModifier(url) : url;
            if (isLegacySupabaseColormapUrl(resolvedUrl)) {
                log('texture', `Redirecting legacy colormap dependency to ${FALLBACK_COLORMAP_URL}`, {
                    originalUrl: resolvedUrl
                });
                return FALLBACK_COLORMAP_URL;
            }
            return resolvedUrl;
        });
        manager.__eduLegacyColormapFallbackInstalled = true;
    }

    installLegacyColormapFallback();

    function normalizeViewerAssetUrl(url) {
        if (!url) return url;
        const lower = String(url).toLowerCase();
        if (lower.includes('/ar_models/models/palm_tree.glb') || lower.includes('/assets/models/palm_tree.glb')) return PALM_TREE_MODEL_URL;
        if (lower.includes('/assets/model2d/palm.jpg') || lower.endsWith('/palm.jpg')) return PALM_IMAGE_URL;
        if (lower.includes('/frontend/model2d/elephant.jpg') || lower.endsWith('/elephant.jpg')) return ELEPHANT_IMAGE_URL;
        if (lower.endsWith('/jungle_combo.jpg')) return '/assets/model2D/jungle_combo.jpg';
        if (lower.endsWith('/cute_elephant_jungle.glb')) return COMBO_MODEL_URL;
        if (lower.endsWith('/elephant_tree_combo_layered.png')) return COMBO_IMAGE_URL;
        return url;
    }
    const mindUrl = window.__AR_VIEWER_RESOLVED_MIND_URL__ || params.get('mind');
    const modelUrl = normalizeViewerAssetUrl(params.get('model'));
    const imageUrl = normalizeViewerAssetUrl(params.get('image'));
    const modelUrl2 = normalizeViewerAssetUrl(params.get('model2'));
    const imageUrl2 = normalizeViewerAssetUrl(params.get('image2'));
    const textureUrl = normalizeViewerAssetUrl(params.get('textureUrl')); // NEW: Texture for model 0
    const textureUrl2 = normalizeViewerAssetUrl(params.get('textureUrl2')); // NEW: Texture for model 1
    const comboModelUrl = normalizeViewerAssetUrl(params.get('comboModel')); // NEW: combo model URL
    const comboImageUrl = normalizeViewerAssetUrl(params.get('comboImage')); // 2D layered fallback for combo scene
    const comboTextureUrl = normalizeViewerAssetUrl(params.get('comboTextureUrl')); // Texture for combo model
    const comboPhrase = params.get('comboPhrase') || '';
    const catalogIdParam = params.get('catalogId');
    const maxTrack = Math.max(1, Math.min(Number(params.get('maxTrack')) || 1, 5));
    const cardCount = Math.max(1, Math.min(Number(params.get('cardCount') || params.get('targetCount')) || 1, 5));
    const targetCount = Math.max(1, Math.min(Number(params.get('targetCount')) || cardCount, maxTrack, 5));
    const getIndexedParam = (base, index) => params.get(index === 0 ? base : `${base}${index + 1}`);
    const targetConfigs = Array.from({ length: targetCount }, (_, index) => ({
        index,
        modelUrl: normalizeViewerAssetUrl(getIndexedParam('model', index)),
        imageUrl: normalizeViewerAssetUrl(getIndexedParam('image', index)),
        textureUrl: normalizeViewerAssetUrl(getIndexedParam('textureUrl', index)),
        word: getIndexedParam('word', index) || ''
    }));
    // Words for click-to-sound — stored in window globals so SET_WORD can update them too
    targetConfigs.forEach((target) => {
        window[`_arWord${target.index}`] = target.word;
    });

    // ── Fix D: MindAR performance tuning params ────────────────────────────────
    // All have safe defaults; iOS-friendly values are lower than the old 0.001/0.001
    const pFilterMinCF = Math.max(0.001, Math.min(Number(params.get('filterMinCF') || 0.1), 1));
    const pFilterBeta  = Math.max(0.001, Math.min(Number(params.get('filterBeta')  || 0.3), 1));
    const pWarmupTolerance = Number(params.get('warmupTolerance') ?? -1); // -1 = let MindAR decide
    const pLossTimeout     = Math.max(100, Math.min(Number(params.get('lossTimeout') || 1200), 10000));
    const pRenderScale     = Math.max(0.1, Math.min(Number(params.get('renderScale') || 1), 2));
    const pWatchdogDisabled = params.get('adaptiveWatchdogDisabled') === 'true';
    // Dynamic bounding-box target span: fraction of card width the model should occupy.
    // 0.75 = 75% (legacy default). Increase to make models fill more of the card.
    const pTargetSpan = Math.max(0.1, Math.min(Number(params.get('targetSpan') || 0.75), 2));

    // Model position offset for alignment tuning (in AR units, ~1 = 8.5cm)
    // Use negative values to move opposite direction. Typical range: -0.1 to 0.1
    // Unify naming with parent: pModelOffsetX/Y/Z
    let pModelOffsetX = Number(params.get('pModelOffsetX') || params.get('modelOffsetX') || 0);
    let pModelOffsetY = Number(params.get('pModelOffsetY') || params.get('modelOffsetY') || 0);
    let pModelOffsetZ = Number(params.get('pModelOffsetZ') || params.get('modelOffsetZ') || 0);

    // ───────────────────────────────────────────────────────────────────────────

    log('🔧', `Params: mind=${mindUrl}, model=${modelUrl}, texture=${textureUrl}, word=${window._arWord0}`);
    log('⚙️', `FixD tuning: filterMinCF=${pFilterMinCF}, filterBeta=${pFilterBeta}, warmupTolerance=${pWarmupTolerance}, lossTimeout=${pLossTimeout}, renderScale=${pRenderScale}, watchdogDisabled=${pWatchdogDisabled}, targetSpan=${pTargetSpan}`);
    if (pModelOffsetX || pModelOffsetY || pModelOffsetZ) {
        log('⚙️', `Model offset: x=${pModelOffsetX}, y=${pModelOffsetY}, z=${pModelOffsetZ}`);
    }
    log('⚙️', `FixD tuning: filterMinCF=${pFilterMinCF}, filterBeta=${pFilterBeta}, warmupTolerance=${pWarmupTolerance}, lossTimeout=${pLossTimeout}, renderScale=${pRenderScale}, watchdogDisabled=${pWatchdogDisabled}, targetSpan=${pTargetSpan}`);

    log('cards', `Viewer configured for ${cardCount} detected card(s)`);

    function retryModelWithFallback(assetItem, modelEl, originalUrl, label) {
        log('fallback', `${label} failed from source URL. Local model fallback is disabled; verify the Supabase object URL and CORS.`, {
            originalUrl,
            targetId: modelEl?.id,
            assetId: assetItem?.id
        });
        return false;
    }

    function showImageFallbackForTarget(targetIndex, reason) {
        const imageEl = document.getElementById(`mode-2d-${targetIndex}`);
        const modelEl = document.getElementById(`mode-3d-${targetIndex}`);
        if (modelEl) {
            modelEl.dataset.modelLoadFailed = 'true';
            modelEl.setAttribute('visible', 'false');
        }
        if (imageEl && imageEl.getAttribute('src')) {
            imageEl.setAttribute('visible', 'true');
            sendRenderSnapshot('TARGET_IMAGE_FALLBACK_SHOWN', { targetIndex, reason });
            return true;
        }
        sendRenderSnapshot('TARGET_IMAGE_FALLBACK_MISSING', { targetIndex, reason });
        return false;
    }

    // ============ TYPED MESSAGE PROTOCOL ============

    /**
     * Send typed message to parent (ARMessage format)
     */
    function sendToParent(type, payload) {
        if (!window.parent || window.parent === window) {
            log('⚠️', `sendToParent skipped: no valid parent (type=${type})`);
            return;
        }
        try {
            const message = {
                type: type,
                payload: payload,
                timestamp: Date.now(),
                origin: 'child'
            };
            window.parent.postMessage(message, '*');
            log('📤', `Sent ${type}`);
        } catch (err) {
            log('❌', `sendToParent failed for ${type}: ${err && err.message}`);
            sendDebug('SEND_TO_PARENT_ERROR', {
                type: type,
                error: err && err.message,
                payloadType: typeof payload
            });
        }
    }

    function sendTrackingState(reason) {
        const targets = {};
        targetConfigs.forEach((target) => {
            targets[`target${target.index}`] = activeTargets.has(target.index);
        });
        sendToParent('AR_TRACKING_STATE', {
            reason,
            ...targets,
            both: activeTargets.has(0) && activeTargets.has(1),
            activeTargets: Array.from(activeTargets.keys())
        });
    }

    function sendDebug(label, details) {
        sendToParent('AR_DEBUG', {
            label,
            details: details || {},
            phase: isReady ? 'ready' : 'initializing',
            cardCount,
            targetCount,
            maxTrack,
            hasMindUrl: Boolean(mindUrl),
            hasModel0: Boolean(modelUrl),
            hasModel1: Boolean(modelUrl2),
            modelCount: targetConfigs.filter(target => Boolean(target.modelUrl)).length,
            hasComboModel: Boolean(comboModelUrl)
        });
    }

    function getElementDebugState(id) {
        const el = document.getElementById(id);
        if (!el) return { id, exists: false };
        const object3D = el.object3D || {};
        return {
            id,
            exists: true,
            visibleAttr: el.getAttribute('visible'),
            objectVisible: object3D.visible,
            gltfModel: el.getAttribute('gltf-model'),
            src: el.getAttribute('src'),
            position: el.getAttribute('position'),
            scale: el.getAttribute('scale'),
            modelLoadFailed: el.dataset?.modelLoadFailed || null,
            hasMesh: Boolean(el.getObject3D && el.getObject3D('mesh'))
        };
    }

    const dynamicModelScales = new Map();

    function inferModelTargetIndex(modelEl) {
        const match = modelEl?.id?.match(/(?:mode-3d|slot-model)-(\d+)$/);
        return match ? Number(match[1]) : null;
    }

    function readUniformEntityScale(modelEl) {
        const scale = modelEl?.object3D?.scale || modelEl?.getAttribute?.('scale');
        const values = [Number(scale?.x), Number(scale?.y), Number(scale?.z)]
            .filter(value => Number.isFinite(value) && value > 0);
        return values.length > 0 ? Math.max(...values) : 1;
    }

    function parseExplicitUniformScale(value) {
        if (!value) return null;
        if (typeof value === 'object') {
            const firstObjectScale = Number(value.x);
            return Number.isFinite(firstObjectScale) && firstObjectScale > 0
                ? firstObjectScale
                : null;
        }
        const first = Number(String(value).trim().split(/\s+/)[0]);
        return Number.isFinite(first) && first > 0 ? first : null;
    }

    // Fallback scales for when dynamic measurement fails. Calibrated for 6-8.5cm AR cards.
    // Increased from 0.75/1.0 to 1.2/1.5 to ensure models fill the card nicely.
    const FALLBACK_SCALE_PER_TARGET = [1.2, 1.5]; // slot 0, slot 1

    function applyDynamicModelScale(modelEl, options) {
        const settings = options || {};
        const targetIndex = Number.isInteger(settings.targetIndex)
            ? settings.targetIndex
            : inferModelTargetIndex(modelEl);
        const explicitScale = parseExplicitUniformScale(settings.explicitScale);

        if (explicitScale !== null) {
            if (targetIndex !== null) dynamicModelScales.set(targetIndex, explicitScale);
            sendDebug('MODEL_DYNAMIC_SCALE_SKIPPED', {
                modelId: modelEl?.id || null,
                source: settings.source || 'unknown',
                reason: 'explicit-scale',
                scale: explicitScale
            });
            return explicitScale;
        }

        try {
            const scalePolicy = window.ARModelScale;
            // Improved mesh discovery: search recursively for any Object3D that contains geometry
            let mesh = modelEl?.getObject3D?.('mesh');
            if (!mesh && modelEl?.object3D) {
                modelEl.object3D.traverse(function(obj) {
                    if (!mesh && (obj.isMesh || (obj.type === 'Group' && obj.children.length > 0))) {
                        mesh = obj;
                    }
                });
            }

            if (!scalePolicy || !mesh || typeof THREE === 'undefined') {
                // Use fallback scale instead of leaving model un-sized
                const fallbackScale = FALLBACK_SCALE_PER_TARGET[targetIndex] || 0.75;
                log('⚠️', `Dynamic scale unavailable (policy=${!!scalePolicy}, mesh=${!!mesh}, THREE=${typeof THREE}), applying fallback scale ${fallbackScale} to ${modelEl?.id}`);
                modelEl.setAttribute('scale', `${fallbackScale} ${fallbackScale} ${fallbackScale}`);
                if (targetIndex !== null) dynamicModelScales.set(targetIndex, fallbackScale);
                sendDebug('MODEL_DYNAMIC_SCALE_SKIPPED', {
                    modelId: modelEl?.id || null,
                    source: settings.source || 'unknown',
                    reason: !scalePolicy ? 'policy-unavailable' : (!mesh ? 'mesh-unavailable' : 'three-unavailable'),
                    fallbackScale: fallbackScale
                });
                return null;
            }

            if (typeof mesh.updateWorldMatrix === 'function') {
                mesh.updateWorldMatrix(true, true);
            } else if (typeof mesh.updateMatrixWorld === 'function') {
                mesh.updateMatrixWorld(true);
            }

            const box = new THREE.Box3().setFromObject(mesh);
            if (typeof box.isEmpty === 'function' && box.isEmpty()) {
                // Empty bounds — use fallback
                const fallbackScale = FALLBACK_SCALE_PER_TARGET[targetIndex] || 0.75;
                log('⚠️', `Empty bounding box for ${modelEl.id}, applying fallback scale ${fallbackScale}`);
                modelEl.setAttribute('scale', `${fallbackScale} ${fallbackScale} ${fallbackScale}`);
                if (targetIndex !== null) dynamicModelScales.set(targetIndex, fallbackScale);
                sendDebug('MODEL_DYNAMIC_SCALE_SKIPPED', {
                    modelId: modelEl.id,
                    source: settings.source || 'unknown',
                    reason: 'empty-bounds',
                    fallbackScale: fallbackScale
                });
                return null;
            }

            const size = new THREE.Vector3();
            box.getSize(size);
            // Validate size - NaN indicates mesh not fully loaded
            if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z)) {
                const fallbackScale = FALLBACK_SCALE_PER_TARGET[targetIndex] || 1.2;
                log('⚠️', `Invalid bounding box size (${size.x}x${size.y}x${size.z}), applying fallback ${fallbackScale}`);
                modelEl.setAttribute('scale', `${fallbackScale} ${fallbackScale} ${fallbackScale}`);
                if (targetIndex !== null) dynamicModelScales.set(targetIndex, fallbackScale);
                sendDebug('MODEL_DYNAMIC_SCALE_SKIPPED', {
                    modelId: modelEl.id,
                    source: settings.source || 'unknown',
                    reason: 'nan-bounds',
                    fallbackScale: fallbackScale
                });
                return null;
            }
            const displayedMaxDimension = Math.max(size.x, size.y, size.z);
            const previousScale = readUniformEntityScale(modelEl);
            const nextScale = scalePolicy.computeUniformScale(
                displayedMaxDimension,
                previousScale,
                { targetSpan: settings.targetSpan || scalePolicy.DEFAULT_TARGET_SPAN }
            );

            if (nextScale === null) {
                // Could not compute scale — use fallback
                const fallbackScale = FALLBACK_SCALE_PER_TARGET[targetIndex] || 0.75;
                log('⚠️', `Could not compute dynamic scale (invalid bounds: ${size.x?.toFixed(2)}x${size.y?.toFixed(2)}x${size.z?.toFixed(2)}), applying fallback ${fallbackScale}`);
                modelEl.setAttribute('scale', `${fallbackScale} ${fallbackScale} ${fallbackScale}`);
                if (targetIndex !== null) dynamicModelScales.set(targetIndex, fallbackScale);
                sendDebug('MODEL_DYNAMIC_SCALE_SKIPPED', {
                    modelId: modelEl.id,
                    source: settings.source || 'unknown',
                    reason: 'invalid-bounds',
                    fallbackScale: fallbackScale,
                    size: { x: size.x, y: size.y, z: size.z }
                });
                return null;
            }

            const scaleValue = `${nextScale} ${nextScale} ${nextScale}`;
            modelEl.setAttribute('scale', scaleValue);
            if (modelEl.object3D?.scale?.set) {
                modelEl.object3D.scale.set(nextScale, nextScale, nextScale);
            }
            
            // Auto-centering: shift the model so its bounding box center is at (0,0,0) relative to anchor
            // Cache center in the element to avoid re-calculating bounding box during realtime offset tuning
            if (!modelEl.__computedCenter) {
                modelEl.__computedCenter = new THREE.Vector3();
                box.getCenter(modelEl.__computedCenter);
            }
            const center = modelEl.__computedCenter;
            
            // Marker Center Compensation: 
            // Use live manual offset variables updated by parent messages
            let compensationX = pModelOffsetX;
            let compensationY = pModelOffsetY;
            let compensationZ = pModelOffsetZ;
            
            // Manual override logic: use pModelOffset* from URL if present.
            // (Speculative catalog-wide hardcoded offsets removed to avoid conflict with manual tuning)

            // Apply offsets. Note: we negate the center to move it to (0,0,0)
            // but we must scale the center offset by the applied model scale.
            const offsetX = (-center.x * nextScale) + compensationX;
            const offsetY = (-center.y * nextScale) + compensationY;
            const offsetZ = (-center.z * nextScale) + compensationZ;
            
            modelEl.setAttribute('position', `${offsetX} ${offsetY} ${offsetZ}`);
            
            // Log to parent so user can see it in Mobile Debug
            sendDebug('MODEL_POSITION_CALIBRATED', {
                modelId: modelEl.id,
                boxCenter: { x: center.x, y: center.y, z: center.z },
                appliedScale: nextScale,
                finalPosition: { x: offsetX, y: offsetY, z: offsetZ },
                compensation: { x: compensationX, y: compensationY }
            });
            
            if (modelEl.id === 'combo-model' && modelEl.hasAttribute?.('animation__spawn')) {
                modelEl.setAttribute(
                    'animation__spawn',
                    `property: scale; from: 0 0 0; to: ${scaleValue}; dur: 600; easing: easeOutBack`
                );
            }
            modelEl.dataset.dynamicScale = String(nextScale);
            if (targetIndex !== null) dynamicModelScales.set(targetIndex, nextScale);

            log('📐', `Dynamic scale applied to ${modelEl.id}: ${nextScale.toFixed(4)} (mesh: ${displayedMaxDimension.toFixed(3)}, targetSpan: ${settings.targetSpan || 0.75}, offset: ${offsetX.toFixed(3)} ${offsetY.toFixed(3)} ${offsetZ.toFixed(3)})`);
            sendDebug('MODEL_DYNAMIC_SCALE_APPLIED', {
                modelId: modelEl.id,
                targetIndex,
                source: settings.source || 'unknown',
                displayedMaxDimension,
                previousScale,
                targetSpan: settings.targetSpan || scalePolicy.DEFAULT_TARGET_SPAN,
                nextScale,
                size: { x: size.x, y: size.y, z: size.z }
            });
            return nextScale;
        } catch (error) {
            // Catch-all: apply fallback so user still sees a reasonable-sized model
            const fallbackScale = FALLBACK_SCALE_PER_TARGET[targetIndex] || 0.75;
            log('⚠️', `Dynamic scale threw (${error?.message}), applying fallback ${fallbackScale} to ${modelEl?.id}`);
            modelEl.setAttribute('scale', `${fallbackScale} ${fallbackScale} ${fallbackScale}`);
            if (targetIndex !== null) dynamicModelScales.set(targetIndex, fallbackScale);
            sendDebug('MODEL_DYNAMIC_SCALE_FAILED', {
                modelId: modelEl?.id || null,
                source: settings.source || 'unknown',
                message: error?.message || String(error),
                fallbackScale: fallbackScale
            });
            return null;
        }
    }

    function wireDynamicModelScale(modelEl, options) {
        if (!modelEl) return;
        modelEl.__arDynamicScaleOptions = options || {};
        if (modelEl.__arDynamicScaleWired) return;
        modelEl.__arDynamicScaleWired = true;
        modelEl.addEventListener('model-loaded', () => {
            // Poll for mesh availability — A-Frame may fire model-loaded before
            // the mesh is actually accessible via getObject3D('mesh').
            let attempts = 0;
            const MAX_ATTEMPTS = 20;
            const POLL_INTERVAL = 50; // ms
            function tryApplyScale() {
                attempts++;
                const mesh = modelEl?.getObject3D?.('mesh');
                if (mesh || attempts >= MAX_ATTEMPTS) {
                    const result = applyDynamicModelScale(modelEl, modelEl.__arDynamicScaleOptions);
                    if (result === null && attempts < MAX_ATTEMPTS) {
                        log('⏳', `Mesh not ready (attempt ${attempts}/${MAX_ATTEMPTS}), retrying...`);
                        setTimeout(tryApplyScale, POLL_INTERVAL);
                    }
                } else {
                    log('⏳', `Mesh not ready (attempt ${attempts}/${MAX_ATTEMPTS}), retrying...`);
                    setTimeout(tryApplyScale, POLL_INTERVAL);
                }
            }
            tryApplyScale();
        });
    }

    // The bootstrap URL-based combo path lives in ar-viewer.html. Expose the
    // same scaler so it cannot drift from persistent/runtime-created models.
    window.__AR_APPLY_DYNAMIC_MODEL_SCALE__ = applyDynamicModelScale;

    function getTargetModelScale(index) {
        if (dynamicModelScales.has(index)) return dynamicModelScales.get(index);
        // Return calibrated fallback scales (same as FALLBACK_SCALE_PER_TARGET)
        if (index === 0) return 1.2;
        if (index === 1) return 1.5;
        return 1.2;
    }

    function ensureDynamicTargets() {
        targetConfigs.forEach((target) => {
            let targetEl = document.getElementById(`target-${target.index}`);
            if (!targetEl) {
                targetEl = document.createElement('a-entity');
                targetEl.id = `target-${target.index}`;
                targetEl.setAttribute('mindar-image-target', `targetIndex: ${target.index}`);
                targetEl.setAttribute('visible', 'true');

                const imageEl = document.createElement('a-image');
                imageEl.id = `mode-2d-${target.index}`;
                imageEl.classList.add('clickable');
                imageEl.setAttribute('position', '0 0 0');
                imageEl.setAttribute('rotation', '0 0 0');
                imageEl.setAttribute('width', '1');
                imageEl.setAttribute('height', '1');
                imageEl.setAttribute('visible', 'false');
                targetEl.appendChild(imageEl);

                const modelEl = document.createElement('a-entity');
                const modelScale = getTargetModelScale(target.index);
                modelEl.id = `mode-3d-${target.index}`;
                modelEl.classList.add('clickable');
                modelEl.setAttribute('position', `0 ${target.index === 0 ? 0.05 : 0.1} 0`);
                modelEl.setAttribute('rotation', '0 0 0');
                modelEl.setAttribute('scale', `${modelScale} ${modelScale} ${modelScale}`);
                modelEl.setAttribute('visible', 'true');
                targetEl.appendChild(modelEl);

                scene.appendChild(targetEl);
                return;
            }

            if (!document.getElementById(`mode-2d-${target.index}`)) {
                const imageEl = document.createElement('a-image');
                imageEl.id = `mode-2d-${target.index}`;
                imageEl.classList.add('clickable');
                imageEl.setAttribute('position', '0 0 0');
                imageEl.setAttribute('rotation', '0 0 0');
                imageEl.setAttribute('width', '1');
                imageEl.setAttribute('height', '1');
                imageEl.setAttribute('visible', 'false');
                targetEl.appendChild(imageEl);
            }

            if (!document.getElementById(`mode-3d-${target.index}`)) {
                const modelEl = document.createElement('a-entity');
                const modelScale = getTargetModelScale(target.index);
                modelEl.id = `mode-3d-${target.index}`;
                modelEl.classList.add('clickable');
                modelEl.setAttribute('position', `0 ${target.index === 0 ? 0.05 : 0.1} 0`);
                modelEl.setAttribute('rotation', '0 0 0');
                modelEl.setAttribute('scale', `${modelScale} ${modelScale} ${modelScale}`);
                modelEl.setAttribute('visible', 'true');
                targetEl.appendChild(modelEl);
            }
        });
    }

    function sendRenderSnapshot(label, details) {
        const targetStates = {};
        targetConfigs.forEach((target) => {
            targetStates[`target${target.index}`] = getElementDebugState(`target-${target.index}`);
            targetStates[`mode2d${target.index}`] = getElementDebugState(`mode-2d-${target.index}`);
            targetStates[`mode3d${target.index}`] = getElementDebugState(`mode-3d-${target.index}`);
        });
        sendDebug(label, {
            currentMode,
            activeTargets: Array.from(activeTargets.keys()),
            ...targetStates,
            comboModel: getElementDebugState('combo-model'),
            comboImage: getElementDebugState('combo-image-scene'),
            details: details || {}
        });
    }

    /**
     * Handle typed message from parent
     */
    function handleParentMessage(event) {
        const data = event.data;
        if (!data || !data.type) return;

        const type = data.type;
        const payload = data.payload || data;

        // Realtime Offset & Discord Sync Handling
        if (type === 'UPDATE_MANUAL_OFFSET') {
            pModelOffsetX = typeof payload.x === 'number' ? payload.x : pModelOffsetX;
            pModelOffsetY = typeof payload.y === 'number' ? payload.y : pModelOffsetY;
            pModelOffsetZ = typeof payload.z === 'number' ? payload.z : pModelOffsetZ;
            log('🎯', 'Manual Offset Updated Realtime: ' + pModelOffsetX + ', ' + pModelOffsetY);
            
            // Re-apply to all active slot models directly to position
            // Optimization: Update object3D position directly for instant response
            for (var i = 0; i < 2; i++) {
                var modelEl = document.getElementById('slot-model-' + i);
                if (modelEl && modelEl.object3D) {
                    // Get current computed base position (centering offset)
                    // applyDynamicModelScale calculates: offsetX = (-center.x * nextScale) + compensationX
                    // We need to preserve the (-center.x * nextScale) part.
                    // Instead of complex math, we just re-run the full apply logic which is now optimized.
                    applyDynamicModelScale(modelEl, {
                        targetIndex: i,
                        source: 'realtime-update'
                    });
                }
            }
            return;
        }

        if (type === 'SYNC_DISCORD_REQUEST') {
            log('🚀', 'Discord Sync requested by parent');
            if (window.syncToDiscord) {
                window.syncToDiscord();
            } else {
                log('❌', 'Discord sync function not available in iframe');
            }
            return;
        }

        if (data.origin !== 'parent') return;

        log('📥', `Received ${type}`, payload);

        switch (type) {
            // ── Task 7: SET_ACTIVE_TARGETS ────────────────────────────────────
            case 'SET_ACTIVE_TARGETS':
                applyActiveTargets(payload);
                break;
            // ── Task 7: BEGIN_ADD_CARD_SCAN ──────────────────────────────────
            case 'BEGIN_ADD_CARD_SCAN':
                beginAddCardScan(payload);
                break;
            // ── Task 7: CANCEL_ADD_CARD_SCAN ───────────────────────────────
            case 'CANCEL_ADD_CARD_SCAN':
                cancelAddCardScan(payload);
                break;
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

    // ============ TASK 7: PRE-CREATE CATALOG ANCHORS ============
    /**
     * Called before MindAR starts to create anchor entities for every slot.
     *
     * Each anchor gets id="mind-target-{mindTargetIndex}" so the registry's
     * mindTargetIndex lookup keys match the DOM id pattern used everywhere else.
     */
    function ensureCatalogAnchors(count) {
        log('🎯', 'ensureCatalogAnchors: creating ' + count + ' anchor(s)');
        for (var i = 0; i < count; i++) {
            var anchorId = 'mind-target-' + i;
            if (!document.getElementById(anchorId)) {
                var anchor = document.createElement('a-entity');
                anchor.id = anchorId;
                anchor.setAttribute('mindar-image-target', 'targetIndex: ' + i);
                anchor.setAttribute('visible', 'true');
                log('📍', `Created anchor ${anchorId} with mindar-image-target index=${i}`);

                // 2-D image layer
                var img = document.createElement('a-image');
                img.id = 'mode-2d-' + i;
                img.classList.add('clickable');
                img.setAttribute('position', '0 0 0');
                img.setAttribute('rotation', '0 0 0');
                img.setAttribute('width', '1');
                img.setAttribute('height', '1');
                img.setAttribute('visible', 'false');
                anchor.appendChild(img);

                // 3-D model layer
                var modelScale = getTargetModelScale(i);
                var modelEl = document.createElement('a-entity');
                modelEl.id = 'mode-3d-' + i;
                modelEl.classList.add('clickable');
                var legacyY = i === 0 ? '0.05' : '0.1';
                modelEl.setAttribute('position', '0 ' + legacyY + ' 0');
                modelEl.setAttribute('rotation', '0 0 0');
                modelEl.setAttribute('scale', modelScale + ' ' + modelScale + ' ' + modelScale);
                modelEl.setAttribute('visible', 'true');
                anchor.appendChild(modelEl);
                log('📍', `Legacy model mode-3d-${i} position=0 ${legacyY} 0, scale=${modelScale}`);

                scene.appendChild(anchor);
                log('✅', 'Created anchor: ' + anchorId + ' with legacy model at position 0 ' + legacyY + ' 0');
            }
        }
    }

    // ============ TASK 7: SET_ACTIVE_TARGETS HANDLER ============
    /**
     * Apply a revisioned target set sent by the parent.
     *
     * 1. Validate through registry.apply()
     * 2. Load every GLB
     * 3. Place <a-gltf-model> under mind-target-{mindTargetIndex}
     * 4. Remove slot content not in new snapshot
     * 5. Emit ACTIVE_TARGETS_APPLIED only after all loads resolve
     * 6. On asset error: emit ACTIVE_TARGETS_REJECTED with MODEL_LOAD_ERROR
     *    (do NOT call showImageFallbackForTarget)
     */
    function applyActiveTargets(payload) {
        log('📥', 'applyActiveTargets', payload);

        // Lazily initialise the registry on first SET_ACTIVE_TARGETS so catalogId
        // comes from the parent's authoritative payload rather than from URL params.
        if (!targetRegistry || (payload.catalogId && payload.catalogId !== currentCatalogId)) {
            log('🏗️', 'Initialising/Updating Registry with catalogId: ' + payload.catalogId + ' (was: ' + currentCatalogId + ')');
            targetRegistry = window.ARTargetRegistry.create({
                catalogId: payload.catalogId,
                targetCount: targetCount,
            });
            currentCatalogId = payload.catalogId;
        }

        // --- Step 1: validate ---
        try {
            targetRegistry.apply(payload);
        } catch (err) {
            var code = err === 'ACTIVE_TARGETS_STALE' ? 'ACTIVE_TARGETS_STALE' : 'ACTIVE_TARGETS_INVALID';
            sendToParent('ACTIVE_TARGETS_REJECTED', {
                catalogId: payload.catalogId,
                revision: payload.revision,
                code: code,
                stage: 'registry-apply',
                message: String(err),
            });
            return;
        }

        // --- Determine which mindTargetIndices are in the new snapshot ---
        var newMindIndices = new Set(payload.targets.map(function(t) { return t.mindTargetIndex; }));

        // Remove GLB entities for mindTargetIndices no longer in the snapshot
        for (var oldIdx = 0; oldIdx < (currentCatalogId ? (window.__AR_VIEWER_RESOLVED_MAX_TRACK || 2) : 2); oldIdx++) {
            if (!newMindIndices.has(oldIdx)) {
                var staleModel = document.getElementById('slot-model-' + oldIdx);
                if (staleModel) {
                    staleModel.parentNode.removeChild(staleModel);
                    log('🧹', 'Removed stale slot-model-' + oldIdx);
                }
            }
        }

        // --- Step 2 + 3: load GLBs and attach under anchors ---
        var loadPromises = payload.targets.map(function(target) {
            return loadSlotGlb(target);
        });

        // --- Step 5: emit APPLIED only after all loads resolve ---
        Promise.all(loadPromises).then(function() {
            sendToParent('ACTIVE_TARGETS_APPLIED', {
                catalogId: payload.catalogId,
                revision: payload.revision,
                targets: payload.targets.map(function(t) {
                    return {
                        slotIndex: t.slotIndex,
                        mindTargetIndex: t.mindTargetIndex,
                        arTag: t.arTag,
                    };
                }),
            });
            log('✅', 'ACTIVE_TARGETS_APPLIED r' + payload.revision);
        }).catch(function(err) {
            // Step 6: reject — do NOT call showImageFallbackForTarget
            sendToParent('ACTIVE_TARGETS_REJECTED', {
                catalogId: payload.catalogId,
                revision: payload.revision,
                code: 'MODEL_LOAD_ERROR',
                stage: 'glb-load',
                message: err && err.message ? err.message : String(err),
            });
            log('❌', 'ACTIVE_TARGETS_REJECTED MODEL_LOAD_ERROR', err);
        });
    }

    /**
     * Load a GLB asset and place it under the correct anchor.
     * Returns a Promise that resolves when the model is loaded or rejects on error.
     */
    function loadSlotGlb(target) {
        return new Promise(function(resolve, reject) {
            var anchorId = 'mind-target-' + target.mindTargetIndex;
            var anchor = document.getElementById(anchorId);
            if (!anchor) {
                reject(new Error('Anchor not found: ' + anchorId));
                return;
            }

            // Deep cleanup: Remove ANY existing model or asset for this slot
            // and also clear any children of the anchor to prevent duplicate rendering.
            var existing = document.getElementById('slot-model-' + target.slotIndex);
            if (existing) existing.parentNode.removeChild(existing);
            var existingAsset = document.getElementById('slot-asset-' + target.slotIndex);
            if (existingAsset) existingAsset.parentNode.removeChild(existingAsset);
            
            // Clear anchor children just in case something was left behind
            while (anchor.firstChild) {
                anchor.removeChild(anchor.firstChild);
            }

            // Hide the legacy model (mode-3d-{slotIndex}) to prevent duplicate rendering.
            // The legacy model is created by ensureCatalogAnchors but should not display
            // when we're using the persistent slot model path.
            var legacyModel = document.getElementById('mode-3d-' + target.slotIndex);
            if (legacyModel) {
                legacyModel.setAttribute('visible', 'false');
                log('🔒', 'Hidden legacy model: mode-3d-' + target.slotIndex + ' position=' + legacyModel.getAttribute('position'));
            }

            var modelEl = document.createElement('a-entity');
            modelEl.id = 'slot-model-' + target.slotIndex;
            modelEl.classList.add('clickable');
            // Apply position offset for alignment tuning
            var basePos = target.position ? target.position.split(' ').map(Number) : [0, 0, 0];
            
            // Marker Center Compensation: 
            // We rely on dynamic centering + manual offset tuning.
            // Removed hardcoded -0.15/-0.25 to avoid double-compensation during tuning.
            var posX = (basePos[0] || 0) + pModelOffsetX;
            var posY = (basePos[1] || 0) + pModelOffsetY;
            var posZ = (basePos[2] || 0) + pModelOffsetZ;
            
            modelEl.setAttribute('position', posX + ' ' + posY + ' ' + posZ);
            modelEl.setAttribute('rotation', target.rotation || '0 0 0');
            // Use calibrated fallback scale — dynamic scaling will override this once mesh is ready.
            // These values (1.2 for slot 0, 1.5 for slot 1) are tuned for 8.5cm AR cards.
            var initialScale = target.scale || (target.slotIndex === 0 ? '1.2 1.2 1.2' : '1.5 1.5 1.5');
            modelEl.setAttribute('scale', initialScale);

            log('📍', `Slot model ${target.slotIndex} created: anchor=mind-target-${target.mindTargetIndex}, position=${posX+' '+posY+' '+posZ}, scale=${initialScale}, offsetX=${pModelOffsetX}, offsetY=${pModelOffsetY}`);

            wireDynamicModelScale(modelEl, {
                targetIndex: target.slotIndex,
                explicitScale: target.scale,
                targetSpan: pTargetSpan,
                source: 'persistent-slot'
            });

            var assetItem = document.createElement('a-asset-item');
            assetItem.setAttribute('id', 'slot-asset-' + target.slotIndex);
            assetItem.setAttribute('crossorigin', 'anonymous');
            assetItem.setAttribute('timeout', '15000');

            var settled = false;
            var loadTimeout = setTimeout(function() {
                fail(new Error('GLB entity load timed out: ' + target.modelUrl));
            }, 20_000);

            function succeed() {
                if (settled) return;
                settled = true;
                clearTimeout(loadTimeout);
                log('✅', 'Slot model rendered: slot=' + target.slotIndex + ' url=' + target.modelUrl);
                resolve();
            }

            function fail(error) {
                if (settled) return;
                settled = true;
                clearTimeout(loadTimeout);
                reject(error);
            }

            // Register every listener before assigning src/appending. Cached
            // assets on iOS can complete quickly enough to beat late handlers.
            modelEl.addEventListener('model-loaded', succeed, { once: true });
            modelEl.addEventListener('model-error', function(e) {
                log('❌', 'Slot model entity error: ' + target.modelUrl, e);
                fail(new Error('GLB entity failed: ' + target.modelUrl));
            }, { once: true });

            assetItem.addEventListener('loaded', function() {
                log('✅', 'Slot GLB asset ready: slot=' + target.slotIndex + ' url=' + target.modelUrl);
                anchor.appendChild(modelEl);
                log('📍', `Model attached to anchor: slot-model-${target.slotIndex} -> mind-target-${target.mindTargetIndex}, position=${modelEl.getAttribute('position')}`);
                applyTextureWhenModelReady(modelEl, target.textureUrl);
                modelEl.setAttribute('gltf-model', '#slot-asset-' + target.slotIndex);

                // Wire word label
                if (target.word) {
                    window['_arWord' + target.slotIndex] = target.word;
                }
            }, { once: true });

            assetItem.addEventListener('error', function(e) {
                log('❌', 'Slot GLB load error: ' + target.modelUrl, e);
                // Reject — caller handles ACTIVE_TARGETS_REJECTED, not fallback
                fail(new Error('GLB load failed: ' + target.modelUrl));
            }, { once: true });

            assetItem.setAttribute('src', target.modelUrl);
            var assetsEl = document.querySelector('a-assets');
            if (assetsEl) {
                assetsEl.appendChild(assetItem);
            } else {
                document.body.appendChild(assetItem);
            }
        });
    }

    // ============ TASK 7: ADD-CARD SCANNER WIRING ============
    /**
     * Wire BEGIN_ADD_CARD_SCAN to the ARAddCardScanner.
     * Does NOT change MindAR running state.
     */
    function beginAddCardScan(payload) {
        if (!window.ARAddCardScanner) {
            log('⚠️', 'ARAddCardScanner not loaded');
            return;
        }
        if (addCardScanner) {
            addCardScanner.cancel();
        }
        addCardScanner = window.ARAddCardScanner.create({
            getVideo: function() { return document.querySelector('video'); },
            decode: globalThis.jsQR,
            emit: function(evt) {
                // Forward scanner events to parent with sessionId
                sendToParent(evt.type, Object.assign({}, evt, { sessionId: payload.sessionId }));
            },
        });
        addCardScanner.start({
            sessionId: payload.sessionId,
            excludedQrIds: payload.excludedQrIds || [],
            timeoutMs: payload.timeoutMs || 15000,
        });
        // Spec C: Show toast "Point camera at the next card"
        var overlay = document.getElementById('ar-loading-overlay');
        if (overlay) {
            overlay.classList.add('video-ready');
        }
        // Toast is shown via parent HTML toast system
        sendToParent('SHOW_TOAST', { text: 'Point camera at the next card', durationMs: 5000 });
    }

    /**
     * Cancel an in-progress add-card scan.
     * Does NOT change MindAR running state.
     */
    function cancelAddCardScan(payload) {
        if (addCardScanner) {
            addCardScanner.cancel();
            addCardScanner = null;
            log('🛑', 'Add-card scan cancelled');
        }
    }

    // ============ INIT ============
    function init() {
        log('🚀', 'Initializing MindAR Viewer...');
        log('📍', `mind=${mindUrl}`);
        log('📍', `model=${modelUrl}`);
        log('📍', `image=${imageUrl}`);
        log('🌐', `window.location.href=${window.location.href}`);
        log('🔍', `URL params count: ${Array.from(params.keys()).length}`);

        sendDebug('VIEWER_INIT', {
            mindUrl,
            modelUrl,
            modelUrl2,
            imageUrl,
            imageUrl2,
            textureUrl,
            textureUrl2,
            comboModelUrl,
            comboImageUrl,
            search: window.location.search
        });

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
        fetch(mindUrl, mindUrl.startsWith('blob:') ? undefined : { method: 'HEAD' })
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
        
        // Fix D: use URL-params-driven values; warmupTolerance only when explicitly set
        // filterMinCF: higher = faster response; filterBeta: lower = smoother tracking
        const warmupPart = pWarmupTolerance >= 0 ? `; warmupTolerance: ${pWarmupTolerance}` : '';
        const mindArConfig = `imageTargetSrc: ${mindUrl}; maxTrack: ${maxTrack}; uiLoading: no; uiScanning: no; uiError: no; filterMinCF: ${pFilterMinCF}; filterBeta: ${pFilterBeta}${warmupPart}`;
        log('⚙️', `MindAR config: ${mindArConfig}`);
        if (!scene.getAttribute('mindar-image')) {
            scene.setAttribute('mindar-image', mindArConfig);
            log('✅', 'MindAR attribute set on scene element');
        } else {
            log('✅', 'MindAR attribute was already present before A-Frame initialization');
        }

        sendDebug('MINDAR_CONFIG_ACTIVE', {
            expectedConfig: mindArConfig,
            activeConfig: scene.getAttribute('mindar-image')
        });

        // ── Task 7: pre-create every catalog anchor before MindAR starts ──
        if (window.ARTargetRegistry) {
            targetRegistry = window.ARTargetRegistry.create({ catalogId: currentCatalogId, targetCount: targetCount });
        }
        ensureCatalogAnchors(targetCount);

        // The parent can now safely send SET_ACTIVE_TARGETS. Do this before
        // MindAR fires arReady so GLB download/parsing overlaps camera startup.
        log('📤', `▶ VIEWER_TARGETS_READY: parentValid=${!!(window.parent && window.parent !== window)} catalogId=${currentCatalogId} targetCount=${targetCount}`);
        try {
            sendToParent('VIEWER_TARGETS_READY', {
                catalogId: currentCatalogId || '',
                targetCount
            });
            log('📤', `◀ VIEWER_TARGETS_READY done`);
        } catch (e) {
            log('❌', `VIEWER_TARGETS_READY throw: ${e && e.message}`);
        }

        sendDebug('DYNAMIC_TARGETS_READY', {
            targetCount,
            targets: targetConfigs.map(target => ({
                index: target.index,
                hasModel: Boolean(target.modelUrl),
                hasImage: Boolean(target.imageUrl),
                hasTexture: Boolean(target.textureUrl),
                word: target.word
            }))
        });

        // ── Fix D (c): apply renderScale — reduces GPU fill-rate on low-power devices ──
        if (pRenderScale < 1) {
            const applyRenderScale = () => {
                const aframeScene = AFRAME && AFRAME.scenes && AFRAME.scenes[0];
                const canvas = aframeScene && (aframeScene.canvas || aframeScene.el && aframeScene.el.canvas);
                if (!canvas) {
                    log('⚠️', 'renderScale: canvas not found, retrying on next frame');
                    return false;
                }
                const w = Math.round(window.innerWidth  * pRenderScale);
                const h = Math.round(window.innerHeight * pRenderScale);
                canvas.style.width  = w + 'px';
                canvas.style.height = h + 'px';
                canvas.width  = w;
                canvas.height = h;
                log('🎯', `renderScale applied: ${canvas.width}x${canvas.height} (was full-window)`);
                return true;
            };
            // Wait for A-Frame scene to finish loading before scaling
            if (AFRAME && AFRAME.scenes && AFRAME.scenes[0]) {
                AFRAME.scenes[0].addEventListener('loaded', () => {
                    if (!applyRenderScale()) {
                        window.addEventListener('load', applyRenderScale);
                    }
                }, { once: true });
            } else {
                window.addEventListener('load', applyRenderScale);
            }
        }
        // ──────────────────────────────────────────────────────────────────────────────────

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
            const model0El = document.getElementById('mode-3d-0');
            wireDynamicModelScale(model0El, { targetIndex: 0, source: 'legacy-target', targetSpan: pTargetSpan });
            // Update loading text on load events
            assetItem.addEventListener('loaded', () => {
                log('✅', 'Model 0 loaded successfully');
                sendDebug('MODEL_ASSET_0_LOADED', { url: modelUrl });
                if (loadText) loadText.textContent = 'Model ready! Starting AR...';
            });
            assetItem.addEventListener('error', (e) => {
                log('❌', 'Model 0 load error:', e);
                sendDebug('MODEL_ASSET_0_ERROR', { url: modelUrl, message: e?.message || String(e) });
                if (retryModelWithFallback(assetItem, model0El, modelUrl, 'Model 0')) {
                    return;
                }
                showImageFallbackForTarget(0, 'model-0-asset-error');
                if (loadText) loadText.textContent = 'Model unavailable, continuing...';
                sendDebug('MODEL_ASSET_0_RECOVERED_WITH_IMAGE', {
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
            applyTextureWhenModelReady(model0El, textureUrl);
            model0El.addEventListener('model-loaded', () => {
                sendRenderSnapshot('MODEL_ENTITY_0_LOADED', { url: modelUrl });
            });
            model0El.addEventListener('model-error', (e) => {
                sendRenderSnapshot('MODEL_ENTITY_0_ERROR', { url: modelUrl, message: e?.message || String(e) });
                showImageFallbackForTarget(0, 'model-0-entity-error');
            });
            model0El.setAttribute('gltf-model', '#model-asset-0');
            
            // Inject texture if provided
            if (textureUrl) {
                model0El.addEventListener('model-loaded', () => {
                    log('🎨', 'Model 0 loaded, injecting texture:', textureUrl);
                    loadTextureAndApply(model0El, textureUrl);
                });
            }
        } else if (!currentCatalogId) {
            log('⚠️', 'No 3D model URL provided for target 0');
        } else {
            log('⏳', 'Target 0 model deferred to SET_ACTIVE_TARGETS');
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
            imgAsset.addEventListener('load', () => {
                sendDebug('IMAGE_ASSET_0_LOADED', { url: imageUrl });
            });
            imgAsset.addEventListener('error', (e) => {
                sendDebug('IMAGE_ASSET_0_ERROR', { url: imageUrl, message: e?.message || String(e) });
            });
            assetsEl.appendChild(imgAsset);
            document.getElementById('mode-2d-0').setAttribute('src', '#img-asset-0');
        } else if (!currentCatalogId) {
            log('⚠️', 'No 2D image URL provided for target 0');
        }

        if (imageUrl2) {
            log('🖼️', 'Loading 2D image 1:', imageUrl2);
            const imgAsset2 = document.createElement('img');
            imgAsset2.setAttribute('id', 'img-asset-1');
            imgAsset2.setAttribute('src', imageUrl2);
            imgAsset2.setAttribute('crossorigin', 'anonymous');
            imgAsset2.addEventListener('load', () => {
                log('✅', '2D image 1 loaded successfully');
            });
            imgAsset2.addEventListener('error', (e) => {
                log('❌', '2D image 1 load error:', e);
            });
            imgAsset2.addEventListener('load', () => {
                sendDebug('IMAGE_ASSET_1_LOADED', { url: imageUrl2 });
            });
            imgAsset2.addEventListener('error', (e) => {
                sendDebug('IMAGE_ASSET_1_ERROR', { url: imageUrl2, message: e?.message || String(e) });
            });
            assetsEl.appendChild(imgAsset2);
            document.getElementById('mode-2d-1').setAttribute('src', '#img-asset-1');
        } else if (!currentCatalogId) {
            log('⚠️', 'No 2D image URL provided for target 1');
        }

        if (comboImageUrl) {
            log('combo', 'Loading combo fallback image:', comboImageUrl);
            const comboImgAsset = document.createElement('img');
            comboImgAsset.setAttribute('id', 'img-asset-combo');
            comboImgAsset.setAttribute('src', comboImageUrl);
            comboImgAsset.setAttribute('crossorigin', 'anonymous');
            comboImgAsset.addEventListener('load', () => {
                log('combo', 'Combo fallback image loaded successfully');
                sendDebug('COMBO_IMAGE_READY', { url: comboImageUrl });
            });
            comboImgAsset.addEventListener('error', (e) => {
                log('combo', 'Combo fallback image load error:', e);
                sendDebug('COMBO_IMAGE_ERROR', { url: comboImageUrl });
            });
            assetsEl.appendChild(comboImgAsset);
        } else {
            log('combo', 'No combo fallback image URL provided');
        }

        if (modelUrl2) {
            log('📦', 'Loading 3D model 1:', modelUrl2);
            let assetItem2 = null;
            const secondaryModelIsOptional = Boolean(comboModelUrl);
            const model1El = document.getElementById('mode-3d-1');
            wireDynamicModelScale(model1El, { targetIndex: 1, source: 'legacy-target', targetSpan: pTargetSpan });
            assetItem2 = document.createElement('a-asset-item');
            assetItem2.setAttribute('id', 'model-asset-1');
            assetItem2.setAttribute('src', modelUrl2);
            assetItem2.setAttribute('crossorigin', 'anonymous');
            assetItem2.setAttribute('timeout', '15000');
            assetItem2.addEventListener('loaded', () => {
                sendDebug('MODEL_ASSET_1_LOADED', { url: modelUrl2 });
            });
            assetItem2.addEventListener('error', (e) => {
                sendDebug('MODEL_ASSET_1_ERROR', {
                    url: modelUrl2,
                    optional: secondaryModelIsOptional,
                    message: e?.message || String(e)
                });
            });
            assetItem2.addEventListener('loaded', () => {
                log('✅', 'Model 1 loaded successfully');
            });
            assetItem2.addEventListener('error', (e) => {
                log('❌', 'Model 1 load error:', e);
                if (model1El) {
                    model1El.dataset.modelLoadFailed = 'true';
                    model1El.setAttribute('visible', 'false');
                }
                if (secondaryModelIsOptional) {
                    sendDebug('SECONDARY_MODEL_SKIPPED', {
                        reason: 'model-1-load-error',
                        url: modelUrl2,
                        comboModelUrl
                    });
                    return;
                }
                if (retryModelWithFallback(assetItem2, model1El, modelUrl2, 'Model 1')) {
                    return;
                }
                showImageFallbackForTarget(1, 'model-1-asset-error');
                sendDebug('MODEL_ASSET_1_RECOVERED_WITH_IMAGE', {
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
            if (secondaryModelIsOptional) {
                model1El.addEventListener('model-error', (e) => {
                    log('Model 1 entity load error:', e);
                    model1El.dataset.modelLoadFailed = 'true';
                    model1El.setAttribute('visible', 'false');
                    showImageFallbackForTarget(1, 'model-1-entity-error');
                    sendRenderSnapshot('MODEL_ENTITY_1_ERROR', { url: modelUrl2, optional: true, message: e?.message || String(e) });
                    sendDebug('SECONDARY_MODEL_SKIPPED', {
                        reason: 'model-1-entity-error',
                        url: modelUrl2,
                        comboModelUrl
                    });
                });
                model1El.addEventListener('model-loaded', () => {
                    sendRenderSnapshot('MODEL_ENTITY_1_LOADED', { url: modelUrl2, optional: true });
                });
                model1El.setAttribute('gltf-model', modelUrl2);
                sendDebug('SECONDARY_MODEL_OPTIONAL', {
                    url: modelUrl2,
                    comboModelUrl
                });
            } else {
                assetsEl.appendChild(assetItem2);
                model1El.addEventListener('model-loaded', () => {
                    sendRenderSnapshot('MODEL_ENTITY_1_LOADED', { url: modelUrl2, optional: false });
                });
                model1El.addEventListener('model-error', (e) => {
                    showImageFallbackForTarget(1, 'model-1-entity-error');
                    sendRenderSnapshot('MODEL_ENTITY_1_ERROR', { url: modelUrl2, optional: false, message: e?.message || String(e) });
                });
                model1El.setAttribute('gltf-model', '#model-asset-1');
            }
            applyTextureWhenModelReady(model1El, textureUrl2);

            // Inject texture if provided
            if (textureUrl2) {
                model1El.addEventListener('model-loaded', () => {
                    log('🎨', 'Model 1 loaded, injecting texture:', textureUrl2);
                    loadTextureAndApply(model1El, textureUrl2);
                });
            }
        } else if (!currentCatalogId) {
            log('⚠️', 'No 3D model URL provided for target 1 (optional)');
        } else {
            log('⏳', 'Target 1 model deferred to SET_ACTIVE_TARGETS');
        }

        log('🎧', 'Setting up event listeners...');
        targetConfigs.slice(2).forEach((target) => {
            const modelEl = document.getElementById(`mode-3d-${target.index}`);
            const imageEl = document.getElementById(`mode-2d-${target.index}`);

            if (target.imageUrl && imageEl) {
                const imgAsset = document.createElement('img');
                imgAsset.setAttribute('id', `img-asset-${target.index}`);
                imgAsset.setAttribute('src', target.imageUrl);
                imgAsset.setAttribute('crossorigin', 'anonymous');
                imgAsset.addEventListener('load', () => {
                    sendDebug('IMAGE_ASSET_DYNAMIC_LOADED', { targetIndex: target.index, url: target.imageUrl });
                });
                imgAsset.addEventListener('error', (e) => {
                    sendDebug('IMAGE_ASSET_DYNAMIC_ERROR', {
                        targetIndex: target.index,
                        url: target.imageUrl,
                        message: e?.message || String(e)
                    });
                });
                assetsEl.appendChild(imgAsset);
                imageEl.setAttribute('src', `#img-asset-${target.index}`);
            }

            if (target.modelUrl && modelEl) {
                wireDynamicModelScale(modelEl, { targetIndex: target.index, source: 'dynamic-target', targetSpan: pTargetSpan });
                const assetItem = document.createElement('a-asset-item');
                assetItem.setAttribute('id', `model-asset-${target.index}`);
                assetItem.setAttribute('src', target.modelUrl);
                assetItem.setAttribute('crossorigin', 'anonymous');
                assetItem.setAttribute('timeout', '15000');
                assetItem.addEventListener('loaded', () => {
                    sendDebug('MODEL_ASSET_DYNAMIC_LOADED', { targetIndex: target.index, url: target.modelUrl });
                });
                assetItem.addEventListener('error', (e) => {
                    modelEl.dataset.modelLoadFailed = 'true';
                    modelEl.setAttribute('visible', 'false');
                    showImageFallbackForTarget(target.index, 'dynamic-model-asset-error');
                    sendDebug('MODEL_ASSET_DYNAMIC_ERROR', {
                        targetIndex: target.index,
                        url: target.modelUrl,
                        message: e?.message || String(e)
                    });
                });
                assetsEl.appendChild(assetItem);
                modelEl.addEventListener('model-loaded', () => {
                    sendRenderSnapshot('MODEL_ENTITY_DYNAMIC_LOADED', { targetIndex: target.index, url: target.modelUrl });
                });
                modelEl.addEventListener('model-error', (e) => {
                    modelEl.dataset.modelLoadFailed = 'true';
                    showImageFallbackForTarget(target.index, 'dynamic-model-entity-error');
                    sendRenderSnapshot('MODEL_ENTITY_DYNAMIC_ERROR', {
                        targetIndex: target.index,
                        url: target.modelUrl,
                        message: e?.message || String(e)
                    });
                });
                modelEl.setAttribute('gltf-model', `#model-asset-${target.index}`);
                applyTextureWhenModelReady(modelEl, target.textureUrl);
            }
        });

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
            initializationFailureReported = false;
            sendDebug('MINDAR_READY', {
                targetCount
            });
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
                targetCount
            });

            // ── Fix D (d): adaptive watchdog — warns host when FPS drops on mobile ─────
            if (!pWatchdogDisabled) {
                (function startAdaptiveWatchdog() {
                    const WARNING_FPS   = 20;
                    const CONSECUTIVE   = 5;
                    const fpsHistory    = [];
                    let   lastTime      = performance.now();
                    let   frames        = 0;
                    let   consecutiveLow = 0;
                    let   warned         = false;

                    function tick() {
                        frames++;
                        const now = performance.now();
                        if (now - lastTime >= 1000) {
                            const fps = Math.round(frames * 1000 / (now - lastTime));
                            frames = 0;
                            lastTime = now;
                            fpsHistory.push(fps);
                            log('📊', `FPS: ${fps} (low-run: ${consecutiveLow}/${CONSECUTIVE})`);

                            if (fps < WARNING_FPS) {
                                consecutiveLow++;
                            } else {
                                consecutiveLow = 0;
                            }

                            if (!warned && consecutiveLow >= CONSECUTIVE) {
                                warned = true;
                                const msg = `FPS ${fps} < ${WARNING_FPS} for ${CONSECUTIVE}s — suggest reload with renderScale=0.6&filterMinCF=0.2`;
                                sendToParent('AR_PERF_WARNING', {
                                    fps,
                                    suggestion: 'reload with renderScale=0.6&filterMinCF=0.2'
                                });
                                sendDebug('ADAPTIVE_FPS_WARNING', { fps, consecutiveLow, suggestion: msg });
                            }
                        }
                        requestAnimationFrame(tick);
                    }
                    requestAnimationFrame(tick);
                })();
            }
            // ───────────────────────────────────────────────────────────────────────────
        });

        scene.addEventListener('arError', (e) => {
            if (initializationFailureReported) return;
            initializationFailureReported = true;
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
                mindUrl: mindUrl,
                stage: 'mindar-initialization',
                elapsedMs: Date.now() - initializationStartedAt
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

        // A 5MB+ catalog can take well over 12 seconds to initialize on iOS.
        // Keep this below the parent watchdog, but long enough for MindAR to
        // finish downloading and compiling targets on a real mobile network.
        window.setTimeout(() => {
            if (!isReady && !initializationFailureReported) {
                initializationFailureReported = true;
                log('⚠️', `⏰ Timeout reached - AR not ready after ${MINDAR_INITIALIZATION_TIMEOUT_MS}ms`);
                log('⚠️', 'Forcing loading overlay removal');
                const overlay = document.getElementById('ar-loading-overlay');
                if (overlay && overlay.style.display !== 'none') {
                    const txt = document.getElementById('ar-load-text');
                    if (txt) txt.textContent = "AR couldn't start";
                }
                sendToParent('SYSTEM_ERROR', {
                    code: 'MINDAR_INITIALIZATION_TIMEOUT',
                    message: 'AR tracking did not start in time',
                    stage: 'mindar-initialization',
                    elapsedMs: Date.now() - initializationStartedAt
                });
            }
        }, MINDAR_INITIALIZATION_TIMEOUT_MS);

        // Target tracking
        log('🎯', 'Setting up target tracking listeners for target-0 and target-1');
        targetConfigs.forEach(({ index }) => {
            const id = `target-${index}`;
            const target = document.getElementById(id);
            sendDebug('TARGET_LOOKUP', {
                targetId: id,
                targetIndex: index,
                exists: Boolean(target),
                attr: target ? target.getAttribute('mindar-image-target') : null
            });
            if (!target) {
                log('⚠️', `Target element ${id} not found in DOM`);
                return;
            }
            log('✅', `Target element ${id} found, attaching listeners`);

            target.addEventListener('targetFound', () => {
                log('🎯', `✨ TARGET ${index} FOUND! Image detected by MindAR`);
                log('🎯', `Target ${index} is now being tracked`);

                // Log anchor position info for debugging
                var anchorPos = target.getAttribute('position');
                var slotModel = document.getElementById('slot-model-' + index);
                var legacyModel = document.getElementById('mode-3d-' + index);
                log('📍', `TARGET ${index} FOUND - Anchor pos: ${JSON.stringify(anchorPos)}, slot-model-${index} pos: ${slotModel ? slotModel.getAttribute('position') : 'null'}, legacy visible: ${legacyModel ? legacyModel.getAttribute('visible') : 'N/A'}`);

                const lostTimer = targetLostTimers.get(index);
                if (lostTimer) {
                    clearTimeout(lostTimer);
                    targetLostTimers.delete(index);
                }
                activeTargets.set(index, {
                    element: target,
                    timestamp: Date.now()
                });

                // ── Freeze Pose: feed pose sample to stability gate ──────────────────
                if (window.__arViewerIntegration) {
                    window.__arViewerIntegration.startStabilizing(index);
                }

                // ── Task 7: enrich event with registry identity ─────────────────────
                var entry = targetRegistry ? targetRegistry.getByMindIndex(index) : null;
                var parentPayload = {
                    targetIndex: index,
                    confidence: 1.0,
                };
                if (entry) {
                    parentPayload.slotIndex = entry.slotIndex;
                    parentPayload.mindTargetIndex = entry.mindTargetIndex;
                    parentPayload.arTag = entry.arTag;
                    log('📍', `Registry entry: slotIndex=${entry.slotIndex}, mindTargetIndex=${entry.mindTargetIndex}, arTag=${entry.arTag}`);
                }
                sendToParent('TARGET_FOUND', parentPayload);
                sendTrackingState(`target-${index}-found`);
                sendRenderSnapshot('TARGET_RENDER_STATE_FOUND', {
                    targetIndex: index,
                    content2dId: `mode-2d-${index}`,
                    content3dId: `mode-3d-${index}`
                });

                checkMultiTarget();
            });

            target.addEventListener('targetLost', () => {
                log('👋', `Target ${index} lost - image no longer detected`);
                const existingTimer = targetLostTimers.get(index);
                if (existingTimer) clearTimeout(existingTimer);

                const timer = setTimeout(() => {
                    targetLostTimers.delete(index);
                    if (!activeTargets.has(index)) return;

                    activeTargets.delete(index);

                    // ── Task 7: enrich with registry identity ─────────────────────────
                    var lostEntry = targetRegistry ? targetRegistry.getByMindIndex(index) : null;
                    var lostPayload = { targetIndex: index };
                    if (lostEntry) {
                        lostPayload.slotIndex = lostEntry.slotIndex;
                        lostPayload.mindTargetIndex = lostEntry.mindTargetIndex;
                        lostPayload.arTag = lostEntry.arTag;
                    }
                    sendToParent('TARGET_LOST', lostPayload);
                    sendTrackingState(`target-${index}-lost`);
                    sendRenderSnapshot('TARGET_RENDER_STATE_LOST', { targetIndex: index });

                    // Stop proximity checking if not enough targets after the grace period
                    if (activeTargets.size < COMBO_THRESHOLD) {
                        stopProximityCheck();
                    }
                }, TARGET_LOST_GRACE_MS);

                targetLostTimers.set(index, timer);
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

            const targetIndex = Number(el.id.match(/-(\d+)$/)?.[1] || 0);

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
            const wordToSpeak = window[`_arWord${targetIndex}`] || '';

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

            // Notify React parent — enrich with Task 7 registry identity
            var clickEntry = targetRegistry ? targetRegistry.getByMindIndex(targetIndex) : null;
            var clickPayload = {
                modelId: el.id,
                targetIndex: targetIndex,
            };
            if (clickEntry) {
                clickPayload.slotIndex = clickEntry.slotIndex;
                clickPayload.mindTargetIndex = clickEntry.mindTargetIndex;
                clickPayload.arTag = clickEntry.arTag;
            }
            sendToParent('MODEL_CLICKED', clickPayload);
        });

        // ============ TOUCH GESTURE SYSTEM ============
        // Native touch events for mobile compatibility (A-Frame cursor doesn't work on mobile)
        
        // ======== PERFORMANCE: CACHED OBJECTS ========
        // Reuse raycaster and mouse vector to avoid creating new objects on every touch event
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // ======== PERFORMANCE MONITORING ========
        const perf = {
            enabled: new URLSearchParams(window.location.search).get('debug') === 'true',
            raycastTime: 0,
            updateTime: 0,
            frameTime: 0,
            frameCount: 0,
            fps: 0,
            lastFrameTime: Date.now(),
            touchEventCount: 0
        };

        function trackPerf(label, fn) {
            if (!perf.enabled) return fn();
            const start = performance.now();
            const result = fn();
            const duration = performance.now() - start;
            if (label === 'raycast') perf.raycastTime += duration;
            if (label === 'update') perf.updateTime += duration;
            if (label === 'frame') perf.frameTime += duration;
            return result;
        }

        function logPerf() {
            if (!perf.enabled) return;
            if (perf.frameCount++ % 60 === 0) {
                const now = Date.now();
                perf.fps = Math.round(60000 / (now - perf.lastFrameTime));
                perf.lastFrameTime = now;
                console.log('[PERF] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('[PERF] FPS:', perf.fps);
                console.log('[PERF] Touch events/sec:', perf.touchEventCount);
                console.log('[PERF] Raycast avg:', (perf.raycastTime/60).toFixed(2), 'ms');
                console.log('[PERF] Update avg:', (perf.updateTime/60).toFixed(2), 'ms');
                console.log('[PERF] Frame avg:', (perf.frameTime/60).toFixed(2), 'ms');
                perf.raycastTime = 0;
                perf.updateTime = 0;
                perf.frameTime = 0;
                perf.touchEventCount = 0;
            }
        }

        function debugTouch(label, data) {
            if (perf.enabled) console.log(`[TOUCH ${label}]`, data);
        }

        // Start perf loop
        if (perf.enabled) {
            requestAnimationFrame(function perfLoop() {
                logPerf();
                requestAnimationFrame(perfLoop);
            });
        }

        // ======== RAF THROTTLING ========
        let rafPending = false;
        let pendingTouchData = null;
        
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
            startPosition: { x: 0, y: 0 },
            initialRotation: { x: 0, y: 0, z: 0 }, // Store initial rotation for Phase 2 & 4
            initialScale: { x: 1, y: 1, z: 1 }, // Store initial scale for Phase 3
            currentRotation: { x: 0, y: 0, z: 0 }, // Accumulated rotation
            currentScale: 1 // Accumulated scale
        };

        // Gesture detection thresholds
        const DRAG_THRESHOLD = 10; // pixels - movement > 10px = drag, not tap
        const DOUBLE_TAP_TIMEOUT = 300; // ms - taps < 300ms apart = double-tap
        const ROTATION_SPEED = 0.01; // radians per pixel drag (Phase 2)
        const ROTATION_SPEED_Z = 1.5; // multiplier for Z-axis rotation (Phase 4)
        const MIN_SCALE_FACTOR = 0.35; // pinch limit relative to normalized scale
        const MAX_SCALE_FACTOR = 3; // pinch limit relative to normalized scale
        const LERP_FACTOR = 0.15; // Smooth interpolation factor for rotations

        // Default transforms for reset (Phase 5)
        // Updated to use calibrated fallback scales (matching FALLBACK_SCALE_PER_TARGET)
        const DEFAULT_TRANSFORMS = {
            0: {
                position: { x: 0, y: 0.05, z: 0 },
                scale: { x: 1.2, y: 1.2, z: 1.2 },
                rotation: { x: 0, y: 0, z: 0 }
            },
            1: {
                position: { x: 0, y: 0.1, z: 0 },
                scale: { x: 1.5, y: 1.5, z: 1.5 },
                rotation: { x: 0, y: 0, z: 0 }
            }
        };

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
                
                // Store initial rotation and scale for gesture tracking
                const rotation = touchState.targetedModel.getAttribute('rotation');
                const scale = touchState.targetedModel.getAttribute('scale');
                
                touchState.initialRotation = { 
                    x: rotation ? rotation.x : 0, 
                    y: rotation ? rotation.y : 0, 
                    z: rotation ? rotation.z : 0 
                };
                touchState.currentRotation = { ...touchState.initialRotation };
                
                touchState.initialScale = { 
                    x: scale ? scale.x : 1, 
                    y: scale ? scale.y : 1, 
                    z: scale ? scale.z : 1 
                };
                touchState.currentScale = scale ? scale.x : 1;
                
                log('👆', `Touch started on model ${touchState.targetIndex}`);
                
                // Debug logging for touch coordinates
                debugTouch('START', {
                    count: touches.length,
                    x: touches[0].clientX,
                    y: touches[0].clientY,
                    dpr: window.devicePixelRatio,
                    model: touchState.targetedModel?.id
                });
                
                // Haptic feedback on touch start
                if (navigator.vibrate) {
                    navigator.vibrate(40);
                }
            } else {
                touchState.targetedModel = null;
                touchState.targetIndex = null;
            }

            // For multi-touch gestures (Phase 3 & 4)
            if (touches.length === 2 && touchState.targetedModel) {
                const dx = touches[1].clientX - touches[0].clientX;
                const dy = touches[1].clientY - touches[0].clientY;
                touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
                touchState.initialAngle = Math.atan2(dy, dx);
                touchState.gestureType = 'pinch'; // Will be refined in touchmove
                
                log('🤏', `Two-finger gesture started on model ${touchState.targetIndex}`);
            } else {
                touchState.gestureType = 'tap'; // Assume tap until proven otherwise
            }
        }

        /**
         * Handle touch move - detect drag/pinch/twist gestures
         */
        function handleTouchMove(evt) {
            evt.preventDefault();

            if (!touchState.active || !touchState.targetedModel) return;

            perf.touchEventCount++;
            
            // Store latest touch data
            pendingTouchData = {
                touches: Array.from(evt.touches),
                timestamp: Date.now()
            };
            
            // Throttle to 60fps via RAF
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(() => {
                    if (pendingTouchData) {
                        trackPerf('update', () => {
                            applyTouchTransform(pendingTouchData);
                        });
                        pendingTouchData = null;
                    }
                    rafPending = false;
                });
            }
        }

        /**
         * Apply touch transformations using direct object3D manipulation (10x faster than setAttribute)
         */
        function applyTouchTransform(data) {
            const touches = data.touches;
            
            // ============ PHASE 2: SINGLE-FINGER DRAG TO ROTATE (Y-AXIS) ============
            if (touches.length === 1 && touchState.gestureType !== 'pinch') {
                const deltaX = touches[0].clientX - touchState.startPosition.x;
                const deltaY = touches[0].clientY - touchState.startPosition.y;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // If moved more than threshold, it's a drag not a tap
                if (distance > DRAG_THRESHOLD) {
                    touchState.isDragging = true;
                    touchState.gestureType = 'drag';
                    
                    // Calculate rotation based on horizontal drag
                    const rotationDelta = deltaX * ROTATION_SPEED;
                    touchState.currentRotation.y = touchState.initialRotation.y + rotationDelta;
                    
                    // ✅ PERFORMANCE: Direct object3D manipulation (10x faster than setAttribute)
                    const obj = touchState.targetedModel.object3D;
                    obj.rotation.set(
                        THREE.MathUtils.degToRad(touchState.currentRotation.x),
                        THREE.MathUtils.degToRad(touchState.currentRotation.y),
                        THREE.MathUtils.degToRad(touchState.currentRotation.z)
                    );
                    
                    debugTouch('DRAG', { deltaX, rotationY: touchState.currentRotation.y });
                }
            }

            // ============ PHASE 3 & 4: MULTI-FINGER GESTURES (PINCH + TWIST) ============
            if (touches.length === 2 && touchState.targetedModel) {
                const dx = touches[1].clientX - touches[0].clientX;
                const dy = touches[1].clientY - touches[0].clientY;
                const currentDistance = Math.sqrt(dx * dx + dy * dy);
                const currentAngle = Math.atan2(dy, dx);

                // ---- PHASE 3: PINCH-TO-ZOOM ----
                const scaleFactor = currentDistance / touchState.initialDistance;
                const baseScale = touchState.initialScale.x;
                let newScale = baseScale * scaleFactor;
                
                // Clamp relative to the normalized model scale so very large
                // source models do not jump back to the old hard-coded range.
                const normalizedScale = getTargetModelScale(touchState.targetIndex);
                const minScale = normalizedScale * MIN_SCALE_FACTOR;
                const maxScale = normalizedScale * MAX_SCALE_FACTOR;
                newScale = Math.max(minScale, Math.min(maxScale, newScale));
                touchState.currentScale = newScale;
                
                // ✅ PERFORMANCE: Direct object3D manipulation
                const obj = touchState.targetedModel.object3D;
                obj.scale.set(newScale, newScale, newScale);

                // ---- PHASE 4: TWO-FINGER TWIST (Z-AXIS ROTATION) ----
                const angleDelta = (currentAngle - touchState.initialAngle) * ROTATION_SPEED_Z;
                touchState.currentRotation.z = touchState.initialRotation.z + (angleDelta * (180 / Math.PI));
                
                // ✅ PERFORMANCE: Direct object3D manipulation
                obj.rotation.set(
                    THREE.MathUtils.degToRad(touchState.currentRotation.x),
                    THREE.MathUtils.degToRad(touchState.currentRotation.y),
                    THREE.MathUtils.degToRad(touchState.currentRotation.z)
                );
                
                debugTouch('PINCH+TWIST', { scale: newScale, rotationZ: touchState.currentRotation.z });
            }

            touchState.lastTouch = touches[0];
        }

        /**
         * Handle touch end - trigger tap actions (audio + animation) or reset
         */
        function handleTouchEnd(evt) {
            evt.preventDefault();

            if (!touchState.active) return;

            const now = Date.now();
            const timeSinceLastTap = now - touchState.lastTapTime;

            // If it was a tap (not drag) and a model was targeted
            if (!touchState.isDragging && touchState.targetedModel && touchState.gestureType === 'tap') {
                
                // ============ PHASE 5: DOUBLE-TAP RESET ============
                if (timeSinceLastTap < DOUBLE_TAP_TIMEOUT) {
                    log('👆👆', `Double-tap detected - resetting model ${touchState.targetIndex} to defaults`);
                    resetModelTransform(touchState.targetIndex);
                    
                    // Haptic feedback for reset
                    if (navigator.vibrate) {
                        navigator.vibrate([30, 50, 30]);
                    }
                } else {
                    // Single tap - play audio and animate
                    handleModelTap(touchState.targetedModel, touchState.targetIndex);
                }

                touchState.lastTapTime = now;
            }

            // Debug logging for touch end
            debugTouch('END', {
                wasDragging: touchState.isDragging,
                gesture: touchState.gestureType,
                model: touchState.targetedModel?.id
            });

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
            return trackPerf('raycast', () => {
                try {
                    const camera = scene.camera;
                    if (!camera) return null;

                    // DPR Safety Check
                    if (perf.enabled) {
                        debugTouch('RAYCAST', {
                            touchX, touchY,
                            dpr: window.devicePixelRatio,
                            screenW: window.innerWidth,
                            screenH: window.innerHeight
                        });
                    }

                    // Convert to NDC (clientX/clientY are already DPI-corrected by browser)
                    mouse.x = (touchX / window.innerWidth) * 2 - 1;
                    mouse.y = -(touchY / window.innerHeight) * 2 + 1;
                    
                    raycaster.setFromCamera(mouse, camera);

                    // Get models
                    const models = targetConfigs
                        .map(target => document.getElementById(`mode-3d-${target.index}`))
                        .filter(m => m && m.object3D);

                    // Raycast
                    const intersects = [];
                    models.forEach((modelEl) => {
                        const hits = raycaster.intersectObjects(modelEl.object3D.children, true);
                        if (hits.length > 0) {
                            intersects.push({
                                element: modelEl,
                                targetIndex: Number(modelEl.id.match(/-(\d+)$/)?.[1] || 0),
                                distance: hits[0].distance
                            });
                        }
                    });

                    if (intersects.length > 0) {
                        intersects.sort((a, b) => a.distance - b.distance);
                        return intersects[0];
                    }

                    return null;
                } catch (error) {
                    log('❌', 'Raycast error:', error);
                    return null;
                }
            });
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
            const baseScale = readUniformEntityScale(modelEl);
            const pulseScale = baseScale * 1.12;
            
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
            const wordToSpeak = window[`_arWord${targetIndex}`] || '';

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

        /**
         * Reset model transform to defaults (Phase 5: Double-tap reset)
         * Uses RAF-based smooth animation with direct object3D manipulation
         */
        function resetModelTransform(targetIndex) {
            const modelEl = document.getElementById(`mode-3d-${targetIndex}`);
            if (!modelEl) return;

            const configuredDefaults = DEFAULT_TRANSFORMS[targetIndex] || {
                position: { x: 0, y: targetIndex === 0 ? 0.05 : 0.1, z: 0 },
                rotation: { x: 0, y: 0, z: 0 }
            };
            const normalizedScale = getTargetModelScale(targetIndex);
            const defaults = {
                ...configuredDefaults,
                scale: { x: normalizedScale, y: normalizedScale, z: normalizedScale }
            };

            log('🔄', `Resetting model ${targetIndex} to default transform`);

            // ✅ PERFORMANCE: Use RAF-based smooth animation with object3D
            const obj = modelEl.object3D;
            const startPos = { ...obj.position };
            const startScale = { ...obj.scale };
            const startRot = { 
                x: THREE.MathUtils.radToDeg(obj.rotation.x),
                y: THREE.MathUtils.radToDeg(obj.rotation.y),
                z: THREE.MathUtils.radToDeg(obj.rotation.z)
            };

            const targetPos = defaults.position;
            const targetScale = defaults.scale;
            const targetRot = defaults.rotation;

            const duration = 500; // ms
            const startTime = Date.now();

            function animateReset() {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                
                // Ease-in-out quad easing
                const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

                // Interpolate position
                obj.position.set(
                    startPos.x + (targetPos.x - startPos.x) * eased,
                    startPos.y + (targetPos.y - startPos.y) * eased,
                    startPos.z + (targetPos.z - startPos.z) * eased
                );

                // Interpolate scale
                obj.scale.set(
                    startScale.x + (targetScale.x - startScale.x) * eased,
                    startScale.y + (targetScale.y - startScale.y) * eased,
                    startScale.z + (targetScale.z - startScale.z) * eased
                );

                // Interpolate rotation
                const currentRotX = startRot.x + (targetRot.x - startRot.x) * eased;
                const currentRotY = startRot.y + (targetRot.y - startRot.y) * eased;
                const currentRotZ = startRot.z + (targetRot.z - startRot.z) * eased;
                obj.rotation.set(
                    THREE.MathUtils.degToRad(currentRotX),
                    THREE.MathUtils.degToRad(currentRotY),
                    THREE.MathUtils.degToRad(currentRotZ)
                );

                if (t < 1) {
                    requestAnimationFrame(animateReset);
                } else {
                    // Update touch state with final values
                    touchState.currentRotation = { ...targetRot };
                    touchState.currentScale = targetScale.x;
                    
                    // Notify React parent
                    sendToParent('MODEL_RESET', {
                        modelId: modelEl.id,
                        targetIndex
                    });
                }
            }

            requestAnimationFrame(animateReset);
        }

        // ── Attach touch event listeners to scene ─────────────────────────────
        scene.addEventListener('touchstart', handleTouchStart, { passive: false });
        scene.addEventListener('touchmove', handleTouchMove, { 
            passive: false, 
            capture: true // ✅ Process at capture phase (faster)
        });
        scene.addEventListener('touchend', handleTouchEnd, { passive: false });

        log('✅', 'Touch gesture system initialized (Phase 1-5: all gestures active + performance optimized)');
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

        // ── Semantic Manager: update detected cards for combo matching ─────────────
        if (window.__arViewerIntegration) {
            var cardIds = Array.from(activeTargets.keys()).map(function(idx) { return 'target-' + idx; });
            window.__arViewerIntegration.updateDetectedCards(cardIds);
        }

        log('🔗', `Multi-target detected - ${activeTargets.size} targets active`);

        const targetIndices = Array.from(activeTargets.keys());

        sendToParent('MULTI_TARGET_DETECTED', {
            targets: targetIndices,
            arTags: targetIndices.map(i => `target-${i}`),
            comboType: 'pair'
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

                sendToParent('COMBO_DETECTED', {
                    targets: [0, 1],
                    distance: distance,
                    phrase: getComboPhrase()
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
            updateComboModelPosition(midpoint);
        }
    }

    function getComboPhrase() {
        const words = [window._arWord0, window._arWord1].filter(Boolean);
        return comboPhrase || (words.length === 2 ? `${words[0]} in ${words[1]}` : 'Combo discovered!');
    }

    function escapeAttribute(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
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

        const phrase = escapeAttribute(getComboPhrase());

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
                value="${phrase}"
                align="center" 
                color="#FFFFFF"
                scale="0.15 0.15 0.15"
                position="0 0.2 0"
                animation="property: position; to: 0 0.25 0; dur: 500; easing: easeOutQuad; loop: true; dir: alternate"
            ></a-text>
        `;

        const comboLabel = comboEntity.querySelector('a-text');
        if (comboLabel) {
            comboLabel.setAttribute('value', getComboPhrase());
        }

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
    function showComboImageFallback(midpoint, reason) {
        if (!comboImageUrl) {
            sendDebug('COMBO_IMAGE_FALLBACK_MISSING', { reason });
            return false;
        }
        hideOriginalModelsForCombo('combo-image-fallback');

        let comboImage = document.getElementById('combo-image-scene');
        if (!comboImage) {
            comboImage = document.createElement('a-image');
            comboImage.id = 'combo-image-scene';
            const comboImageAsset = document.getElementById('img-asset-combo');
            comboImage.setAttribute('src', comboImageAsset && comboImageAsset.complete ? '#img-asset-combo' : comboImageUrl);
            comboImage.setAttribute('width', '1.25');
            comboImage.setAttribute('height', '0.85');
            comboImage.setAttribute('look-at', '[camera]');
            comboImage.setAttribute('animation__spawn', 'property: scale; from: 0.2 0.2 0.2; to: 1 1 1; dur: 500; easing: easeOutBack');
            scene.appendChild(comboImage);
        }

        comboImage.setAttribute('position', `${midpoint.x} ${midpoint.y + 0.08} ${midpoint.z}`);
        comboImage.setAttribute('visible', 'true');
        sendDebug('COMBO_IMAGE_FALLBACK_SHOWN', { reason, url: comboImageUrl });
        sendRenderSnapshot('COMBO_IMAGE_FALLBACK_RENDER_STATE', { reason, url: comboImageUrl });
        return true;
    }

    function restoreOriginalModels(reason) {
        const show3d = currentMode === '3D';

        targetConfigs.forEach((target) => {
            const model = document.getElementById(`mode-3d-${target.index}`);
            const image = document.getElementById(`mode-2d-${target.index}`);

            if (model && model.dataset.modelLoadFailed !== 'true') {
                model.setAttribute('visible', show3d);
            }
            if (image) image.setAttribute('visible', !show3d);
        });

        sendRenderSnapshot('ORIGINAL_MODELS_RESTORED', { reason });
    }

    function hideOriginalModelsForCombo(reason) {
        targetConfigs.forEach((target) => {
            const model = document.getElementById(`mode-3d-${target.index}`);
            const image = document.getElementById(`mode-2d-${target.index}`);

            if (model) model.setAttribute('visible', 'false');
            if (image) image.setAttribute('visible', 'false');
        });

        sendRenderSnapshot('ORIGINAL_MODELS_HIDDEN_FOR_COMBO', { reason });
    }

    function loadComboModel(midpoint) {
        // Only load combo model if we have a combo model URL
        if (!comboModelUrl) {
            restoreOriginalModels('no-combo-model-url');
            sendDebug('COMBO_MODEL_MISSING_ORIGINAL_FALLBACK', {
                comboImageUrl,
                midpoint
            });
            log('⚠️', 'No combo model URL provided, skipping combo model load');
            return;
        }

        log('🎆', 'Loading combo model!');
        
        sendRenderSnapshot('COMBO_LOAD_START', {
            comboModelUrl,
            comboImageUrl,
            comboTextureUrl,
            midpoint
        });

        // Create combo model entity if it doesn't exist
        let comboModel = document.getElementById('combo-model');
        if (!comboModel) {
            comboModel = document.createElement('a-entity');
            comboModel.id = 'combo-model';
            wireDynamicModelScale(comboModel, { source: 'combo-model', targetSpan: 1 });
            comboModel.setAttribute('gltf-model', comboModelUrl);
            comboModel.setAttribute('scale', '0.4 0.4 0.4'); // Bigger for impact!
            comboModel.setAttribute('visible', 'false');
            comboModel.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 4000; easing: linear; loop: true');
            comboModel.setAttribute('animation__spawn', 'property: scale; from: 0 0 0; to: 0.4 0.4 0.4; dur: 600; easing: easeOutBack');
            comboModel.addEventListener('model-error', (event) => {
                log('combo', 'Combo model entity load error:', event);
                comboModel.dataset.modelLoadFailed = 'true';
                comboModel.setAttribute('visible', 'false');
                if (!showComboImageFallback(midpoint, 'combo-model-error')) {
                    restoreOriginalModels('combo-model-error');
                }
                sendDebug('COMBO_MODEL_ERROR_ORIGINAL_FALLBACK', {
                    comboModelUrl,
                    comboImageUrl,
                    message: event?.message || String(event)
                });
            });
            scene.appendChild(comboModel);
            applyTextureWhenModelReady(comboModel, comboTextureUrl);
            comboModel.addEventListener('model-loaded', () => {
                comboModel.dataset.modelLoaded = 'true';
                hideOriginalModelsForCombo('combo-model-loaded');
                comboModel.setAttribute('visible', 'true');
                sendRenderSnapshot('COMBO_MODEL_LOADED', { comboModelUrl });
            });
            log('✨', 'Combo model entity created');
        }
        
        // Position at midpoint
        comboModel.setAttribute('position', `${midpoint.x} ${midpoint.y} ${midpoint.z}`);
        if (comboModel.dataset.modelLoaded === 'true') {
            hideOriginalModelsForCombo('combo-model-visible');
            comboModel.setAttribute('visible', 'true');
        } else {
            restoreOriginalModels('combo-model-loading');
        }
        sendRenderSnapshot('COMBO_MODEL_VISIBLE', { comboModelUrl, midpoint });
        
        // Speak combo name
        if ('speechSynthesis' in window) {
            const comboWords = [window._arWord0, window._arWord1].filter(Boolean);
            const comboName = comboPhrase || (comboWords.length === 2 ? `${comboWords[0]} in ${comboWords[1]}` : comboWords.join(' ')) || 'Combo scene';
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

    function updateComboModelPosition(midpoint) {
        const position = `${midpoint.x} ${midpoint.y} ${midpoint.z}`;
        const comboModel = document.getElementById('combo-model');
        const comboImage = document.getElementById('combo-image-scene');
        const comboEntity = document.getElementById('combo-effect');

        if (comboModel && comboModel.getAttribute('visible') !== false) {
            comboModel.setAttribute('position', position);
        }
        if (comboImage && comboImage.getAttribute('visible') !== false) {
            comboImage.setAttribute('position', `${midpoint.x} ${midpoint.y + 0.08} ${midpoint.z}`);
        }
        if (comboEntity) {
            comboEntity.setAttribute('position', position);
        }
    }

    /**
     * Remove combo model and restore individual models
     */
    function removeComboModel() {
        const comboModel = document.getElementById('combo-model');
        const comboImage = document.getElementById('combo-image-scene');
        
        if (comboModel) {
            comboModel.setAttribute('visible', 'false');
            log('🧹', 'Combo model hidden');
        }
        if (comboImage) {
            comboImage.setAttribute('visible', 'false');
            log('combo', 'Combo image fallback hidden');
        }
        sendRenderSnapshot('COMBO_REMOVED_RESTORE_STATE', {});
        restoreOriginalModels('combo-model-removed');
        
        log('🧹', 'Combo model removed, individual models restored');
    }

    // ============ MODE SWITCHING ============
    function setMode(mode) {
        currentMode = mode;
        if (modeIndicator) {
            modeIndicator.textContent = `Mode: ${mode}`;
        }

        const is3D = mode === '3D';
        setTimeout(() => sendRenderSnapshot('MODE_APPLIED', { mode }), 0);

        targetConfigs.forEach((target) => {
            const mode2d = document.getElementById(`mode-2d-${target.index}`);
            const mode3d = document.getElementById(`mode-3d-${target.index}`);

            if (mode2d) mode2d.setAttribute('visible', !is3D);
            if (mode3d) mode3d.setAttribute('visible', is3D);
        });

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

                let appliedCount = 0;
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

    /**
     * Helper to load an external texture and apply it to all meshes in a GLTF model
     * This is the fix for split-file textures on Supabase
     */
    function loadTextureAndApply(modelEl, url, attempt = 0) {
        if (!url || !modelEl) return;

        if (!getLoadedModelRoot(modelEl)) {
            if (attempt < 20) {
                setTimeout(() => loadTextureAndApply(modelEl, url, attempt + 1), 120);
            } else {
                log('texture', `Model root unavailable for ${modelEl.id}; texture was not applied`);
                sendToParent('SYSTEM_ERROR', {
                    code: 'TEXTURE_APPLY_ERROR',
                    message: 'Loaded model root was not available for texture application',
                    targetId: modelEl.id,
                    url
                });
            }
            return;
        }

        const loader = new THREE.TextureLoader();
        if (loader.setCrossOrigin) {
            loader.setCrossOrigin('anonymous');
        } else {
            loader.crossOrigin = 'anonymous';
        }

        loader.load(
            url,
            (texture) => {
                log('✅', 'Texture loaded successfully:', url);
                
                // GLTF specific settings
                texture.flipY = false;
                if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
                if (THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
                
                // Sharp pixel filtering for Cube Pets
                texture.minFilter = THREE.NearestFilter;
                texture.magFilter = THREE.NearestFilter;
                texture.needsUpdate = true;
                
                const mesh = getLoadedModelRoot(modelEl);
                if (!mesh) {
                    log('⚠️', 'Mesh not found on model element yet');
                    return;
                }

                let appliedCount = 0;
                mesh.traverse((node) => {
                    if (node.isMesh) {
                        log('🎨', `Applying texture to mesh node: ${node.name}`);
                        if (node.material) {
                            // Support for single or multiple materials
                            const materials = Array.isArray(node.material) ? node.material : [node.material];
                            materials.forEach(mat => {
                                if (mat) {
                                    if (mat.color) mat.color.set(0xffffff);
                                    mat.map = texture;
                                    mat.vertexColors = false;
                                    mat.metalness = mat.metalness ?? 0;
                                    mat.roughness = mat.roughness ?? 0.8;
                                    mat.needsUpdate = true;
                                    appliedCount += 1;
                                }
                            });
                        }
                    }
                });
                
                if (appliedCount === 0) {
                    sendToParent('SYSTEM_ERROR', {
                        code: 'TEXTURE_APPLY_ERROR',
                        message: 'No mesh materials were found for texture application',
                        targetId: modelEl.id,
                        url
                    });
                    return;
                }

                sendToParent('TEXTURE_APPLIED', { targetId: modelEl.id, url, materialCount: appliedCount });
            },
            undefined,
            (err) => {
                log('❌', 'Texture load failed:', err);
                sendToParent('SYSTEM_ERROR', {
                    code: 'TEXTURE_LOAD_ERROR',
                    message: 'Failed to load external texture',
                    targetId: modelEl.id,
                    url
                });
            }
        );
    }

    function getLoadedModelRoot(modelEl) {
        if (!modelEl) return null;
        const namedRoot = modelEl.getObject3D?.('mesh')
            || modelEl.getObject3D?.('model')
            || modelEl.getObject3D?.('gltf-model')
            || null;
        if (namedRoot) return namedRoot;
        return modelEl.object3D?.children?.length ? modelEl.object3D : null;
    }

    function applyTextureWhenModelReady(modelEl, url) {
        if (!url || !modelEl) return;

        const apply = () => {
            log('🎨', `Applying texture to ${modelEl.id}:`, url);
            loadTextureAndApply(modelEl, url);
        };

        modelEl.addEventListener('model-loaded', apply, { once: true });
        if (getLoadedModelRoot(modelEl)) {
            apply();
        }
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
     *
     * Spec C: Enhanced — scans for first 5 seconds, then disconnects
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

    // Spec C: Also run when AR is ready and hide overlay
    scene.addEventListener('arReady', function onArReady() {
        hideMindARUI();
        // Signal to parent HTML to hide overlay
        window.parent.postMessage({ type: 'AR_READY', payload: {} }, '*');
        scene.removeEventListener('arReady', onArReady);
    });

    // Spec C: Enhanced MutationObserver — watch for first 5 seconds, then disconnect
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

    // Spec C: Disconnect observer after 5 seconds to save CPU
    let observerScans = 0;
    const observerInterval = setInterval(function() {
        hideMindARUI();
        if (++observerScans >= 10) {
            clearInterval(observerInterval);
            observer.disconnect();
            log('🧹', 'MindAR UI observer disconnected after 5s');
        }
    }, 500);

    // ============ START ============
    init();
})();

