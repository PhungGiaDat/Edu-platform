/**
 * AR Runtime JavaScript
 * public/static/ar-assets/js/ar-runtime.js
 * 
 * Dynamic NFT Loading System
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
        activeNFTs: new Map(), // markerId -> a-nft element
        activeModels: new Map(), // markerId -> a-entity element
        debug: false,

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

    // ========== UI HELPERS ==========
    function hideLoader() {
        const loader = document.querySelector('.arjs-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    }

    function showNFTLoading(markerId) {
        let indicator = document.querySelector('.nft-loading-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'nft-loading-indicator';
            document.body.appendChild(indicator);
        }
        indicator.textContent = `Loading NFT: ${markerId}...`;
        indicator.classList.add('visible');
    }

    function hideNFTLoading() {
        const indicator = document.querySelector('.nft-loading-indicator');
        if (indicator) {
            indicator.classList.remove('visible');
        }
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

        // Get scene reference
        ARRuntime.scene = document.querySelector('a-scene');

        if (!ARRuntime.scene) {
            console.error('A-Frame scene not found!');
            return;
        }

        // Register custom components
        registerComponents();

        // Listen for AR.js ready
        window.addEventListener('arjs-nft-loaded', () => {
            log('✅', 'AR.js NFT system loaded');
            hideLoader();
            ARRuntime.initialized = true;
            sendToParent('AR_READY', { initialized: true });
        });

        // Fallback: Hide loader after timeout if event doesn't fire
        setTimeout(() => {
            if (!ARRuntime.initialized) {
                log('⚠️', 'AR.js init timeout, forcing ready state');
                hideLoader();
                ARRuntime.initialized = true;
                sendToParent('AR_READY', { initialized: true, fallback: true });
            }
        }, 5000);

        // Listen for messages from parent
        window.addEventListener('message', handleParentMessage);

        log('✅', 'AR Runtime initialized, waiting for AR.js...');
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

})();
