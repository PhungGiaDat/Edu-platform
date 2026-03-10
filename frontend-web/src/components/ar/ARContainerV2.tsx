/**
 * ARContainerV2.tsx
 * 
 * New AR container with iframe swapping for MindAR.
 * States: SCANNING (ar-scanner.html) → LOADING → VIEWING (ar-viewer.html)
 * 
 * Event-driven architecture with postMessage communication.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { AREvent } from '@/core/types/AREvents';
import {
    ARMessage,
    ARMessageType,
    ARMessagePayloadMap,
    createMessage,
    normalizeMessage
} from '@/core/types/ARMessages';

// ========== TYPES ==========
export type ARPhase = 'IDLE' | 'SCANNING' | 'LOADING' | 'VIEWING' | 'ERROR'
    | 'GAME_DRAG' | 'GAME_MEMORY' | 'GAME_COLORING';

interface ARContainerV2Props {
    initialPhase?: ARPhase;
    mindUrl?: string;
    modelUrl?: string;
    imageUrl?: string;
    modelUrl2?: string;
    imageUrl2?: string;
    onPhaseChange?: (phase: ARPhase) => void;
    onQRDetected?: (qrId: string) => void;
    onTargetFound?: (targetIndex: number) => void;
    onTargetLost?: (targetIndex: number) => void;
    onModelClick?: (modelId: string, targetIndex?: number) => void;
    onComboDetected?: (targets: number[]) => void;
    children?: React.ReactNode;
}

// ========== COMPONENT ==========
export const ARContainerV2: React.FC<ARContainerV2Props> = ({
    initialPhase = 'SCANNING',
    mindUrl,
    modelUrl,
    imageUrl,
    modelUrl2,
    imageUrl2,
    onPhaseChange,
    onQRDetected,
    onTargetFound,
    onTargetLost,
    onModelClick,
    onComboDetected,
    children
}) => {
    const [phase, setPhase] = useState<ARPhase>(initialPhase);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // ========== IFRAME SRC ==========
    const getIframeSrc = useCallback(() => {
        switch (phase) {
            case 'SCANNING':
                return '/ar-scanner.html';
            case 'VIEWING':
                if (!mindUrl) return null;
                const params = new URLSearchParams();
                params.set('mind', mindUrl);
                if (modelUrl) params.set('model', modelUrl);
                if (imageUrl) params.set('image', imageUrl);
                if (modelUrl2) params.set('model2', modelUrl2);
                if (imageUrl2) params.set('image2', imageUrl2);
                return `/ar-viewer.html?${params.toString()}`;
            default:
                return null;
        }
    }, [phase, mindUrl, modelUrl, imageUrl, modelUrl2, imageUrl2]);

    const iframeSrc = getIframeSrc();

    // ========== PHASE TRANSITIONS ==========
    const transitionTo = useCallback((newPhase: ARPhase) => {
        console.log(`[ARContainerV2] Phase: ${phase} → ${newPhase}`);
        setPhase(newPhase);
        onPhaseChange?.(newPhase);

        // Emit to EventBus
        eventBus.emit('AR_PHASE_CHANGED' as any, { phase: newPhase });
    }, [phase, onPhaseChange]);

    // ========== SEND TO IFRAME (Legacy) ==========
    const sendToIframe = useCallback((type: string, data: any = {}) => {
        if (!iframeRef.current?.contentWindow) {
            console.warn('[ARContainerV2] Iframe not ready');
            return;
        }
        iframeRef.current.contentWindow.postMessage({ type, ...data }, '*');
        console.log('[ARContainerV2] 📤 Sent (legacy):', type);
    }, []);

    // ========== SEND TYPED MESSAGE (New Protocol) ==========
    const sendTypedMessage = useCallback(<K extends ARMessageType>(
        type: K,
        payload: K extends keyof ARMessagePayloadMap ? ARMessagePayloadMap[K] : unknown
    ) => {
        if (!iframeRef.current?.contentWindow) {
            console.warn('[ARBridge] Iframe not ready');
            return;
        }
        if (!isReady && type !== 'INITIAL_STATE') {
            console.warn('[ARBridge] Waiting for SYSTEM_READY');
            return;
        }
        const message = createMessage(type, payload);
        iframeRef.current.contentWindow.postMessage(message, '*');
        console.log('[ARBridge] 📤', type, payload);
    }, [isReady]);

    // ========== MESSAGE HANDLING ==========
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Normalize to typed message format (backwards compatible)
            const msg = normalizeMessage(event.data);
            if (!msg) return;

            const { type, payload } = msg as ARMessage;
            console.log('[ARBridge] 📥 Received:', type, payload);

            switch (type) {
                // System ready (handshake)
                case 'SYSTEM_READY':
                    setIsReady(true);
                    eventBus.emit(AREvent.SCENE_READY, payload as any);
                    break;

                // Scanner events
                case 'SCANNER_READY':
                    setIsReady(true);
                    eventBus.emit(AREvent.SCENE_READY, { scene: 'scanner' } as any);
                    break;

                case 'QR_DETECTED': {
                    const data = payload as ARMessagePayloadMap['QR_DETECTED'];
                    console.log('[ARBridge] 🎯 QR Detected:', data.qrId);
                    onQRDetected?.(data.qrId);
                    eventBus.emit(AREvent.MARKER_FOUND, {
                        markerId: data.qrId,
                        target: null
                    } as any);
                    transitionTo('LOADING');
                    break;
                }
                case 'SCANNER_ERROR': {
                    const data = payload as ARMessagePayloadMap['SCANNER_ERROR'];
                    setError(data.error);
                    transitionTo('ERROR');
                    break;
                }

                // Viewer events
                case 'AR_READY':
                    setIsReady(true);
                    transitionTo('VIEWING');
                    eventBus.emit(AREvent.SCENE_READY, { scene: 'viewer' } as any);
                    break;

                case 'TARGET_FOUND': {
                    const data = payload as ARMessagePayloadMap['TARGET_FOUND'];
                    onTargetFound?.(data.targetIndex);
                    eventBus.emit(AREvent.MARKER_FOUND, {
                        markerId: `target-${data.targetIndex}`,
                        target: null
                    } as any);
                    break;
                }

                case 'TARGET_LOST': {
                    const data = payload as ARMessagePayloadMap['TARGET_LOST'];
                    onTargetLost?.(data.targetIndex);
                    eventBus.emit(AREvent.MARKER_LOST, {
                        markerId: `target-${data.targetIndex}`
                    } as any);
                    break;
                }

                case 'MULTI_TARGET_DETECTED': {
                    const data = payload as ARMessagePayloadMap['MULTI_TARGET_DETECTED'];
                    eventBus.emit('MULTI_TARGET_DETECTED' as any, data);
                    break;
                }

                case 'MODEL_CLICKED': {
                    const data = payload as ARMessagePayloadMap['MODEL_CLICKED'] & { targetIndex?: number };
                    onModelClick?.(data.modelId, data.targetIndex);
                    eventBus.emit('AR_MODEL_CLICKED' as any, { modelId: data.modelId, targetIndex: data.targetIndex });
                    break;
                }

                case 'COMBO_DETECTED': {
                    const data = payload as ARMessagePayloadMap['COMBO_DETECTED'];
                    onComboDetected?.(data.targets);
                    eventBus.emit(AREvent.COMBO_ACTIVATED, {
                        tag1: `target-${data.targets[0]}`,
                        tag2: `target-${data.targets[1]}`
                    } as any);
                    break;
                }

                case 'ANIMATION_COMPLETE': {
                    const data = payload as ARMessagePayloadMap['ANIMATION_COMPLETE'];
                    eventBus.emit('ANIMATION_COMPLETE' as any, data);
                    break;
                }

                case 'SYSTEM_ERROR':
                case 'AR_ERROR' as any: {
                    const data = payload as { error?: string; message?: string };
                    const errorMsg = data.error || data.message || 'Unknown error';
                    setError(errorMsg);
                    eventBus.emit(AREvent.AR_ERROR, { error: new Error(errorMsg) } as any);
                    break;
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onQRDetected, onTargetFound, onTargetLost, onModelClick, onComboDetected, transitionTo]);

    // ========== EXTERNAL CONTROLS ==========
    const switchToViewer = useCallback((params: { mindUrl: string; modelUrl?: string }) => {
        console.log('[ARContainerV2] Switching to viewer with:', params.mindUrl);
        // Parent should update mindUrl/modelUrl props, then transition
        setTimeout(() => transitionTo('VIEWING'), 100);
    }, [transitionTo]);

    const switchToScanner = useCallback(() => {
        transitionTo('SCANNING');
    }, [transitionTo]);

    const setMode = useCallback((mode: '2D' | '3D') => {
        sendToIframe('SET_MODE', { mode });
    }, [sendToIframe]);

    // Expose methods via ref or eventBus
    useEffect(() => {
        const handleSwitchToViewer = (data: any) => switchToViewer(data);
        const handleSwitchToScanner = () => switchToScanner();
        const handleSetMode = (data: any) => setMode(data.mode);

        // AR_COMMAND - Send typed messages to iframe via EventBus
        const handleARCommand = (data: { type: ARMessageType; payload: any }) => {
            sendTypedMessage(data.type, data.payload);
        };

        eventBus.on('AR_SWITCH_TO_VIEWER' as any, handleSwitchToViewer);
        eventBus.on('AR_SWITCH_TO_SCANNER' as any, handleSwitchToScanner);
        eventBus.on('AR_SET_MODE' as any, handleSetMode);
        eventBus.on('AR_COMMAND' as any, handleARCommand);

        return () => {
            eventBus.off('AR_SWITCH_TO_VIEWER' as any, handleSwitchToViewer);
            eventBus.off('AR_SWITCH_TO_SCANNER' as any, handleSwitchToScanner);
            eventBus.off('AR_SET_MODE' as any, handleSetMode);
            eventBus.off('AR_COMMAND' as any, handleARCommand);
        };
    }, [switchToViewer, switchToScanner, setMode, sendTypedMessage]);

    // ========== AUTO TRANSITION FROM LOADING TO VIEWING ==========
    // When mindUrl becomes available during LOADING phase, transition to VIEWING
    useEffect(() => {
        console.log('[ARContainerV2] 🔍 Auto-transition check:', { phase, mindUrl: mindUrl?.substring(0, 50) });

        if (phase === 'LOADING' && mindUrl) {
            console.log('[ARContainerV2] 🔄 mindUrl ready, transitioning to VIEWING:', mindUrl);
            // Small delay to ensure state is updated
            const timer = setTimeout(() => {
                transitionTo('VIEWING');
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [phase, mindUrl, transitionTo]);

    // ========== RENDER ==========
    return (
        <div
            className="ar-container-v2"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                // @ts-ignore - dvh for mobile
                height: '100dvh',
                background: '#000',
                overflow: 'hidden',
                zIndex: 99999
            }}
        >
            {/* Error State */}
            {phase === 'ERROR' && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100000,
                        color: '#FF6B6B',
                        fontFamily: 'Nunito, sans-serif',
                        flexDirection: 'column'
                    }}
                >
                    {/* Error Icon - SVG */}
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p style={{ marginTop: 16 }}>{error || 'An error occurred'}</p>
                    <button
                        onClick={() => transitionTo('SCANNING')}
                        style={{
                            marginTop: 24,
                            padding: '12px 24px',
                            background: '#4ECDC4',
                            border: 'none',
                            borderRadius: 20,
                            color: '#fff',
                            cursor: 'pointer',
                            minHeight: 48,
                            minWidth: 120
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* AR Iframe - key based only on phase to prevent remounting */}
            {iframeSrc && (
                <iframe
                    ref={iframeRef}
                    key={`${phase}-${mindUrl || ''}-${modelUrl || ''}-${modelUrl2 || ''}`}
                    src={iframeSrc}
                    allow="camera; microphone; autoplay; fullscreen"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        zIndex: 1
                    }}
                />
            )}

            {/* UI Overlays (children) */}
            <div style={{ position: 'relative', zIndex: 100 }}>
                {children}
            </div>
        </div>
    );
};

export default ARContainerV2;
