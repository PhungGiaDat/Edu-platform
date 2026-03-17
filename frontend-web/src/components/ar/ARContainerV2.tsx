/**
 * ARContainerV2.tsx
 *
 * AR container with iframe swapping for MindAR + PiP multi-scanner.
 *
 * Phase flow:
 *   SCANNING  → full-screen ar-scanner.html
 *   LOADING   → blank (waiting for mindUrl)
 *   VIEWING   → full-screen ar-viewer.html  +  PiP ar-scanner.html (top-left, 120px)
 *
 * The PiP scanner keeps running during VIEWING so the user can scan a second
 * flashcard without leaving the AR experience.
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
    /** Number of flashcards already loaded — kept for parent API compatibility */
    cardCount?: number;
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
    cardCount: _cardCount,   // accepted for API compatibility, not used internally
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

    const iframeRef = useRef<HTMLIFrameElement>(null);       // main iframe
    const pipRef    = useRef<HTMLIFrameElement>(null);       // background scanner iframe (invisible)

    // ========== VIEWER SRC ==========
    const getViewerSrc = useCallback(() => {
        if (!mindUrl) return null;
        const params = new URLSearchParams();
        params.set('mind', mindUrl);
        if (modelUrl)  params.set('model',  modelUrl);
        if (imageUrl)  params.set('image',  imageUrl);
        if (modelUrl2) params.set('model2', modelUrl2);
        if (imageUrl2) params.set('image2', imageUrl2);
        return `/ar-viewer.html?${params.toString()}`;
    }, [mindUrl, modelUrl, imageUrl, modelUrl2, imageUrl2]);

    // Main iframe src (only scanner or viewer — not both at once)
    const mainSrc = (() => {
        switch (phase) {
            case 'SCANNING': return '/ar-scanner.html';
            case 'VIEWING':  return getViewerSrc();
            default:         return null;
        }
    })();

    // ========== PHASE TRANSITIONS ==========
    const transitionTo = useCallback((newPhase: ARPhase) => {
        console.log(`[ARContainerV2] Phase: ${phase} → ${newPhase}`);
        setPhase(newPhase);
        onPhaseChange?.(newPhase);
        eventBus.emit('AR_PHASE_CHANGED' as any, { phase: newPhase });

        // When entering VIEWING, background scanner iframe auto-mounts (no state needed)
        if (newPhase === 'VIEWING') {
            // nothing extra — pipRef iframe mounts automatically when phase === 'VIEWING'
        }
    }, [phase, onPhaseChange]);

    // ========== SEND TO IFRAME HELPERS ==========
    const sendToMain = useCallback((type: string, data: any = {}) => {
        iframeRef.current?.contentWindow?.postMessage({ type, ...data }, '*');
    }, []);

    const sendToPiP = useCallback((type: string, data: any = {}) => {
        pipRef.current?.contentWindow?.postMessage({ type, ...data }, '*');
    }, []);

    /** Send to whichever scanner is currently active */
    const sendToScanner = useCallback((type: string, data: any = {}) => {
        if (phase === 'SCANNING') {
            sendToMain(type, data);
        } else {
            sendToPiP(type, data);
        }
    }, [phase, sendToMain, sendToPiP]);

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
            const msg = normalizeMessage(event.data);
            if (!msg) return;

            const { type, payload } = msg as ARMessage;

            // Determine which iframe sent this
            const fromPiP = event.source === pipRef.current?.contentWindow;
            console.log(`[ARBridge] 📥 ${fromPiP ? '[PiP]' : '[Main]'} ${type}`, payload);

            switch (type) {
                // ── Handshake ──
                case 'SYSTEM_READY':
                    if (!fromPiP) {
                        setIsReady(true);
                        eventBus.emit(AREvent.SCENE_READY, payload as any);
                    }
                    break;

                case 'SCANNER_READY':
                    if (!fromPiP) {
                        setIsReady(true);
                        eventBus.emit(AREvent.SCENE_READY, { scene: 'scanner' } as any);
                    }
                    break;

                // ── QR detected ──
                case 'QR_DETECTED': {
                    const data = payload as ARMessagePayloadMap['QR_DETECTED'];
                    console.log(`[ARBridge] 🎯 QR Detected (${fromPiP ? 'PiP' : 'Main'}):`, data.qrId);
                    onQRDetected?.(data.qrId);
                    eventBus.emit(AREvent.MARKER_FOUND, { markerId: data.qrId, target: null } as any);

                    if (!fromPiP && phase === 'SCANNING') {
                        // First scan from the main scanner → transition to viewer
                        transitionTo('LOADING');
                    }
                    // If fromPiP (second scan during VIEWING) → just notify parent via
                    // onQRDetected above; parent will update modelUrl2/imageUrl2 props.
                    break;
                }

                // ── Scanner error ──
                case 'SCANNER_ERROR': {
                    const data = payload as ARMessagePayloadMap['SCANNER_ERROR'];
                    if (!fromPiP) {
                        // Fatal only when the main scanner has the error
                        setError(data.error);
                        transitionTo('ERROR');
                    } else {
                        // Background scanner error is non-fatal — log and ignore
                        console.warn('[ARBridge] Background scanner error (non-fatal):', data.error);
                    }
                    break;
                }

                // ── Viewer events ──
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
                    eventBus.emit(AREvent.MARKER_LOST, { markerId: `target-${data.targetIndex}` } as any);
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
    }, [phase, onQRDetected, onTargetFound, onTargetLost, onModelClick, onComboDetected, transitionTo]);

    // ========== EXTERNAL CONTROLS (EventBus) ==========
    useEffect(() => {
        const handleSwitchToViewer = (data: any) => {
            console.log('[ARContainerV2] Switching to viewer:', data.mindUrl);
            setTimeout(() => transitionTo('VIEWING'), 100);
        };
        const handleSwitchToScanner = () => transitionTo('SCANNING');
        const handleSetMode = (data: any) => sendToMain('SET_MODE', { mode: data.mode });
        const handleARCommand = (data: { type: ARMessageType; payload: any }) => {
            sendTypedMessage(data.type, data.payload);
        };
        const handleResumeScan = () => {
            sendToScanner('RESUME_SCANNING');
        };

        eventBus.on('AR_SWITCH_TO_VIEWER'  as any, handleSwitchToViewer);
        eventBus.on('AR_SWITCH_TO_SCANNER' as any, handleSwitchToScanner);
        eventBus.on('AR_SET_MODE'          as any, handleSetMode);
        eventBus.on('AR_COMMAND'           as any, handleARCommand);
        eventBus.on('AR_RESUME_SCAN'       as any, handleResumeScan);

        return () => {
            eventBus.off('AR_SWITCH_TO_VIEWER'  as any, handleSwitchToViewer);
            eventBus.off('AR_SWITCH_TO_SCANNER' as any, handleSwitchToScanner);
            eventBus.off('AR_SET_MODE'          as any, handleSetMode);
            eventBus.off('AR_COMMAND'           as any, handleARCommand);
            eventBus.off('AR_RESUME_SCAN'       as any, handleResumeScan);
        };
    }, [transitionTo, sendToMain, sendToScanner, sendTypedMessage, phase]);

    // ========== AUTO TRANSITION LOADING → VIEWING ==========
    useEffect(() => {
        if (phase === 'LOADING' && mindUrl) {
            console.log('[ARContainerV2] mindUrl ready → VIEWING');
            const t = setTimeout(() => transitionTo('VIEWING'), 100);
            return () => clearTimeout(t);
        }
    }, [phase, mindUrl, transitionTo]);

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
                zIndex: 99999,
            }}
        >
            {/* ── Error state ── */}
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
                        flexDirection: 'column',
                    }}
                >
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
                            minWidth: 120,
                        }}
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* ── Main iframe (scanner during SCANNING, viewer during VIEWING) ── */}
            {mainSrc && (
                <iframe
                    ref={iframeRef}
                    key={`main-${phase}-${mindUrl || ''}-${modelUrl || ''}-${modelUrl2 || ''}`}
                    src={mainSrc}
                    allow="camera; microphone; autoplay; fullscreen"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        zIndex: 1,
                    }}
                />
            )}

            {/* ── Background scanner (invisible, full-size, behind main viewer) ── */}
            {/* Always mounted during VIEWING so camera stays alive for second-card detection.
                opacity:0 + pointerEvents:none + zIndex:0 keeps it fully hidden behind the viewer. */}
            {phase === 'VIEWING' && (
                <iframe
                    ref={pipRef}
                    key="pip-scanner"
                    src="/ar-scanner.html"
                    allow="camera; microphone; autoplay"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        zIndex: 0,           // behind main viewer (zIndex: 1)
                        opacity: 0,
                        pointerEvents: 'none',
                    }}
                />
            )}

            {/* ── UI Overlays (children) ── */}
            <div style={{ position: 'relative', zIndex: 100 }}>
                {children}
            </div>
        </div>
    );
};

export default ARContainerV2;
