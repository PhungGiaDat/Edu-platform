/**
 * ARContainer.tsx
 * 
 * Iframe-based AR container that isolates AR.js from React lifecycle.
 * Communicates with ar-nft.html via postMessage API.
 * 
 * Architecture:
 * - React (parent) detects QR codes via RuntimeBridge
 * - Sends marker data to iframe via postMessage
 * - Iframe dynamically creates <a-nft> elements
 * - Iframe sends events back (model click, marker found/lost)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { AREvent } from '@/core/types/AREvents';

// ========== TYPES ==========
interface ARContainerProps {
    onReady?: () => void;
    onModelClick?: (markerId: string) => void;
    onNFTFound?: (markerId: string) => void;
    onNFTLost?: (markerId: string) => void;
    debug?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

interface NFTMarkerData {
    markerId: string;
    descriptorUrl: string;
    modelUrl: string;
    scale?: string;
    position?: string;
    rotation?: string;
}

// Message types from iframe
type ARMessageType =
    | 'AR_READY'
    | 'AR_NFT_CREATED'
    | 'AR_NFT_REMOVED'
    | 'AR_NFT_FOUND'
    | 'AR_NFT_LOST'
    | 'AR_MODEL_CLICK'
    | 'AR_ALL_NFTS_CLEARED'
    | 'AR_STATUS';

interface ARMessage {
    type: ARMessageType;
    payload: any;
}

// ========== COMPONENT ==========
const ARContainer: React.FC<ARContainerProps> = ({
    onReady,
    onModelClick,
    onNFTFound,
    onNFTLost,
    debug = false,
    className = '',
    style = {}
}) => {
    // Force remount key to ensure fresh iframe on navigation
    const [remountKey] = useState(Date.now());
    const [isReady, setIsReady] = useState(false);
    const [activeNFTs, setActiveNFTs] = useState<Set<string>>(new Set());
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // ========== IFRAME COMMUNICATION ==========

    /**
     * Send message to iframe
     */
    const sendToIframe = useCallback((type: string, payload: any) => {
        if (!iframeRef.current?.contentWindow) {
            console.warn('[ARContainer] Iframe not ready, cannot send:', type);
            return;
        }

        iframeRef.current.contentWindow.postMessage({ type, payload }, '*');
        console.log('[ARContainer] 📤 Sent to iframe:', type, payload);
    }, []);

    /**
     * Create NFT marker in iframe
     */
    const createNFT = useCallback((data: NFTMarkerData) => {
        sendToIframe('AR_CREATE_NFT', data);
    }, [sendToIframe]);

    /**
     * Remove NFT marker from iframe
     */
    const removeNFT = useCallback((markerId: string) => {
        sendToIframe('AR_REMOVE_NFT', { markerId });
    }, [sendToIframe]);

    /**
     * Clear all NFT markers
     */
    const clearAllNFTs = useCallback(() => {
        sendToIframe('AR_CLEAR_ALL', {});
    }, [sendToIframe]);

    /**
     * Update model properties
     */
    const updateModel = useCallback((markerId: string, updates: {
        scale?: string;
        position?: string;
        rotation?: string;
        visible?: boolean;
    }) => {
        sendToIframe('AR_UPDATE_MODEL', { markerId, ...updates });
    }, [sendToIframe]);

    // ========== MESSAGE HANDLING ==========

    useEffect(() => {
        const handleMessage = (event: MessageEvent<ARMessage>) => {
            const { type, payload } = event.data || {};

            if (!type) return;

            console.log('[ARContainer] � Received from iframe:', type, payload);

            switch (type) {
                case 'AR_READY':
                    setIsReady(true);
                    onReady?.();
                    // Emit to EventBus for other components
                    eventBus.emit(AREvent.SCENE_READY, { scene: 'iframe' });
                    break;

                case 'AR_NFT_CREATED':
                    setActiveNFTs(prev => new Set(prev).add(payload.markerId));
                    break;

                case 'AR_NFT_REMOVED':
                    setActiveNFTs(prev => {
                        const next = new Set(prev);
                        next.delete(payload.markerId);
                        return next;
                    });
                    break;

                case 'AR_NFT_FOUND':
                    onNFTFound?.(payload.markerId);
                    // Emit to EventBus
                    eventBus.emit(AREvent.MARKER_FOUND, {
                        markerId: payload.markerId,
                        target: null
                    });
                    break;

                case 'AR_NFT_LOST':
                    onNFTLost?.(payload.markerId);
                    // Emit to EventBus
                    eventBus.emit(AREvent.MARKER_LOST, {
                        markerId: payload.markerId
                    });
                    break;

                case 'AR_MODEL_CLICK':
                    onModelClick?.(payload.markerId);
                    // Emit custom event for click handling
                    eventBus.emit('AR_MODEL_CLICKED', {
                        markerId: payload.markerId
                    });
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onReady, onModelClick, onNFTFound, onNFTLost]);

    // ========== DEBUG MODE ==========

    useEffect(() => {
        if (isReady) {
            sendToIframe('AR_SET_DEBUG', { enabled: debug });
        }
    }, [debug, isReady, sendToIframe]);

    // ========== EXPOSE API VIA REF ==========

    // Make API available to parent components
    useEffect(() => {
        // Attach methods to a global for debugging/external access
        (window as any).__AR_CONTAINER__ = {
            createNFT,
            removeNFT,
            clearAllNFTs,
            updateModel,
            isReady,
            activeNFTs: Array.from(activeNFTs)
        };

        return () => {
            delete (window as any).__AR_CONTAINER__;
        };
    }, [createNFT, removeNFT, clearAllNFTs, updateModel, isReady, activeNFTs]);

    // ========== EVENTBUS INTEGRATION ==========

    useEffect(() => {
        /**
         * Listen for CREATE_NFT_REQUEST from RuntimeBridge or other components
         * This allows the multi-flashcard system to trigger NFT creation
         */
        const handleCreateNFTRequest = (data: NFTMarkerData) => {
            console.log('[ARContainer] 📨 CREATE_NFT_REQUEST received:', data);
            if (isReady) {
                createNFT(data);
            } else {
                console.warn('[ARContainer] AR not ready, queuing NFT creation');
                // Could implement a queue here if needed
            }
        };

        const handleRemoveNFTRequest = (data: { markerId: string }) => {
            console.log('[ARContainer] 📨 REMOVE_NFT_REQUEST received:', data);
            removeNFT(data.markerId);
        };

        const handleClearNFTRequest = () => {
            console.log('[ARContainer] 📨 CLEAR_NFT_REQUEST received');
            clearAllNFTs();
        };

        // Subscribe to EventBus
        eventBus.on('CREATE_NFT_REQUEST', handleCreateNFTRequest);
        eventBus.on('REMOVE_NFT_REQUEST', handleRemoveNFTRequest);
        eventBus.on('CLEAR_NFT_REQUEST', handleClearNFTRequest);

        return () => {
            eventBus.off('CREATE_NFT_REQUEST', handleCreateNFTRequest);
            eventBus.off('REMOVE_NFT_REQUEST', handleRemoveNFTRequest);
            eventBus.off('CLEAR_NFT_REQUEST', handleClearNFTRequest);
        };
    }, [isReady, createNFT, removeNFT, clearAllNFTs]);

    // ========== RENDER ==========

    return (
        <div
            className={`ar-container ${className}`}
            style={{
                width: '100vw',
                height: '100vh',
                position: 'relative',
                ...style
            }}
        >
            <iframe
                ref={iframeRef}
                key={remountKey}
                src="/ar-nft.html"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                }}
                allow="camera; microphone; accelerometer; gyroscope; autoplay"
                title="AR Context"
            />

            {/* Status indicator for debugging */}
            {debug && (
                <div style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: isReady ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 165, 0, 0.8)',
                    color: '#000',
                    padding: '5px 10px',
                    borderRadius: 5,
                    fontSize: 12,
                    zIndex: 1000,
                    fontFamily: 'monospace'
                }}>
                    {isReady ? '✓ AR Ready' : '⏳ Loading...'}
                    <br />
                    NFTs: {activeNFTs.size}
                </div>
            )}

            {/* Overlay UI slot - children go here with z-index > 1 */}
            {/* Back button, controls, etc. can be added by parent */}
        </div>
    );
};

// ========== HOOKS FOR EXTERNAL USE ==========

/**
 * Hook to interact with ARContainer from other components
 */
export function useARContainer() {
    const createNFT = useCallback((data: NFTMarkerData) => {
        eventBus.emit('CREATE_NFT_REQUEST', data);
    }, []);

    const removeNFT = useCallback((markerId: string) => {
        eventBus.emit('REMOVE_NFT_REQUEST', { markerId });
    }, []);

    const clearAllNFTs = useCallback(() => {
        eventBus.emit('CLEAR_NFT_REQUEST', {});
    }, []);

    return {
        createNFT,
        removeNFT,
        clearAllNFTs
    };
}

export default ARContainer;
export type { ARContainerProps, NFTMarkerData };
