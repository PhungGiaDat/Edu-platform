/**
 * ARContainerV2.tsx
 *
 * AR container with iframe swapping for MindAR + PiP multi-scanner.
 * Optimized for stability: iframe is not recreated on every property change.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
    textureUrl?: string;
    modelUrl2?: string;
    imageUrl2?: string;
    textureUrl2?: string;
    word?: string;
    word2?: string;
    cardCount?: number;
    comboModelUrl?: string;
    comboTextureUrl?: string;
    comboPhrase?: string;
    enableBackgroundScanner?: boolean;
    deferQrTransition?: boolean;
    onPhaseChange?: (phase: ARPhase) => void;
    onQRDetected?: (qrId: string) => void;
    onTargetFound?: (targetIndex: number) => void;
    onTargetLost?: (targetIndex: number) => void;
    onModelClick?: (modelId: string, targetIndex?: number) => void;
    onComboDetected?: (targets: number[]) => void;
    children?: React.ReactNode;
}

export const ARContainerV2: React.FC<ARContainerV2Props> = ({
    initialPhase = 'SCANNING',
    mindUrl,
    modelUrl,
    imageUrl,
    textureUrl,
    modelUrl2,
    imageUrl2,
    textureUrl2,
    word,
    word2,
    cardCount,
    comboModelUrl,
    comboTextureUrl,
    comboPhrase,
    enableBackgroundScanner = false,
    deferQrTransition = false,
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
    const pipRef = useRef<HTMLIFrameElement>(null);

    // Refs for props to ensure handleMessage always has the latest callbacks without being recreated
    const callbacksRef = useRef({
        onQRDetected,
        onTargetFound,
        onTargetLost,
        onModelClick,
        onComboDetected,
        onPhaseChange
    });

    useEffect(() => {
        callbacksRef.current = {
            onQRDetected,
            onTargetFound,
            onTargetLost,
            onModelClick,
            onComboDetected,
            onPhaseChange
        };
    }, [onQRDetected, onTargetFound, onTargetLost, onModelClick, onComboDetected, onPhaseChange]);

    const transitionTo = useCallback((newPhase: ARPhase) => {
        if (newPhase === phase) return;
        console.log(`[ARContainerV2] Phase: ${phase} → ${newPhase}`);
        setPhase(newPhase);
        callbacksRef.current.onPhaseChange?.(newPhase);
        eventBus.emit('AR_PHASE_CHANGED' as any, { phase: newPhase });
    }, [phase]);

    // ========== VIEWER SRC ==========
    const viewerSrc = useMemo(() => {
        if (!mindUrl) return null;
        const params = new URLSearchParams();
        params.set('mind', mindUrl);
        if (modelUrl) params.set('model', modelUrl);
        if (imageUrl) params.set('image', imageUrl);
        if (textureUrl) params.set('textureUrl', textureUrl);
        if (modelUrl2) params.set('model2', modelUrl2);
        if (imageUrl2) params.set('image2', imageUrl2);
        if (textureUrl2) params.set('textureUrl2', textureUrl2);
        if (word) params.set('word', word);
        if (word2) params.set('word2', word2);
        if (typeof cardCount === 'number') {
            params.set('cardCount', String(cardCount));
            params.set('maxTrack', String(Math.max(2, Math.min(cardCount, 5))));
        }
        if (comboModelUrl) params.set('comboModel', comboModelUrl);
        if (comboTextureUrl) params.set('comboTextureUrl', comboTextureUrl);
        if (comboPhrase) params.set('comboPhrase', comboPhrase);
        return `/ar-viewer.html?${params.toString()}`;
    }, [mindUrl, modelUrl, imageUrl, textureUrl, modelUrl2, imageUrl2, textureUrl2, word, word2, cardCount, comboModelUrl, comboTextureUrl, comboPhrase]);

    const mainSrc = useMemo(() => {
        switch (phase) {
            case 'SCANNING': return '/ar-scanner.html';
            case 'VIEWING': return viewerSrc;
            default: return null;
        }
    }, [phase, viewerSrc]);

    // ========== SEND TO IFRAME HELPERS ==========
    const sendToMain = useCallback((type: string, data: any = {}) => {
        iframeRef.current?.contentWindow?.postMessage({ type, ...data }, '*');
    }, []);

    const sendToPiP = useCallback((type: string, data: any = {}) => {
        pipRef.current?.contentWindow?.postMessage({ type, ...data }, '*');
    }, []);

    const sendToScanner = useCallback((type: string, data: any = {}) => {
        if (phase === 'SCANNING') sendToMain(type, data);
        else sendToPiP(type, data);
    }, [phase, sendToMain, sendToPiP]);

    const sendTypedMessage = useCallback(<K extends ARMessageType>(
        type: K,
        payload: K extends keyof ARMessagePayloadMap ? ARMessagePayloadMap[K] : unknown
    ) => {
        if (!iframeRef.current?.contentWindow) return;
        if (!isReady && type !== 'INITIAL_STATE') return;
        const message = createMessage(type, payload);
        iframeRef.current.contentWindow.postMessage(message, '*');
    }, [isReady]);

    // ========== MESSAGE HANDLING ==========
    const handleMessage = useCallback((event: MessageEvent) => {
        const msg = normalizeMessage(event.data);
        if (!msg) return;

        const { type, payload } = msg as ARMessage;
        const fromPiP = event.source === pipRef.current?.contentWindow;

        // Use callbacks from ref to ensure stability and freshness
        const {
            onQRDetected: cbQR,
            onTargetFound: cbFound,
            onTargetLost: cbLost,
            onModelClick: cbClick,
            onComboDetected: cbCombo
        } = callbacksRef.current;

        switch (type) {
            case 'SYSTEM_READY':
            case 'SCANNER_READY':
                if (!fromPiP) {
                    setIsReady(true);
                    eventBus.emit(AREvent.SCENE_READY, payload as any);
                }
                break;

            case 'QR_DETECTED': {
                const data = payload as ARMessagePayloadMap['QR_DETECTED'];
                cbQR?.(data.qrId);
                eventBus.emit(AREvent.MARKER_FOUND, { markerId: data.qrId, target: null } as any);
                if (!fromPiP && phase === 'SCANNING' && !deferQrTransition) {
                    transitionTo('LOADING');
                }
                break;
            }

            case 'SCANNER_ERROR': {
                const data = payload as ARMessagePayloadMap['SCANNER_ERROR'];
                if (!fromPiP) {
                    setError(data.error);
                    transitionTo('ERROR');
                }
                break;
            }

            case 'AR_READY':
                setIsReady(true);
                transitionTo('VIEWING');
                eventBus.emit(AREvent.SCENE_READY, { scene: 'viewer' } as any);
                break;

            case 'TARGET_FOUND': {
                const data = payload as ARMessagePayloadMap['TARGET_FOUND'];
                cbFound?.(data.targetIndex);
                eventBus.emit(AREvent.MARKER_FOUND, { markerId: `target-${data.targetIndex}`, target: null } as any);
                break;
            }

            case 'TARGET_LOST': {
                const data = payload as ARMessagePayloadMap['TARGET_LOST'];
                cbLost?.(data.targetIndex);
                eventBus.emit(AREvent.MARKER_LOST, { markerId: `target-${data.targetIndex}` } as any);
                break;
            }

            case 'MODEL_CLICKED': {
                const data = payload as ARMessagePayloadMap['MODEL_CLICKED'] & { targetIndex?: number };
                cbClick?.(data.modelId, data.targetIndex);
                eventBus.emit('AR_MODEL_CLICKED' as any, { modelId: data.modelId, targetIndex: data.targetIndex });
                break;
            }

            case 'COMBO_DETECTED': {
                const data = payload as ARMessagePayloadMap['COMBO_DETECTED'];
                cbCombo?.(data.targets);
                eventBus.emit(AREvent.COMBO_ACTIVATED, {
                    tag1: `target-${data.targets[0]}`,
                    tag2: `target-${data.targets[1]}`
                } as any);
                break;
            }

            case 'ANIMATION_COMPLETE':
                eventBus.emit('ANIMATION_COMPLETE' as any, payload);
                break;

            case 'SYSTEM_ERROR':
            case 'AR_ERROR' as any: {
                const data = payload as { error?: string; message?: string };
                const errorMsg = data.error || data.message || 'Unknown error';
                setError(errorMsg);
                eventBus.emit(AREvent.AR_ERROR, { error: new Error(errorMsg) } as any);
                break;
            }
        }
    }, [phase, transitionTo, deferQrTransition]);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    // ========== EXTERNAL CONTROLS ==========
    useEffect(() => {
        const handleSwitchToViewer = () => setTimeout(() => transitionTo('VIEWING'), 100);
        const handleSwitchToScanner = () => transitionTo('SCANNING');
        const handleSetMode = (data: any) => sendToMain('SET_MODE', { mode: data.mode });
        const handleARCommand = (data: { type: ARMessageType; payload: any }) => sendTypedMessage(data.type, data.payload);
        const handleResumeScan = () => sendToScanner('RESUME_SCANNING');

        eventBus.on('AR_SWITCH_TO_VIEWER' as any, handleSwitchToViewer);
        eventBus.on('AR_SWITCH_TO_SCANNER' as any, handleSwitchToScanner);
        eventBus.on('AR_SET_MODE' as any, handleSetMode);
        eventBus.on('AR_COMMAND' as any, handleARCommand);
        eventBus.on('AR_RESUME_SCAN' as any, handleResumeScan);

        return () => {
            eventBus.off('AR_SWITCH_TO_VIEWER' as any, handleSwitchToViewer);
            eventBus.off('AR_SWITCH_TO_SCANNER' as any, handleSwitchToScanner);
            eventBus.off('AR_SET_MODE' as any, handleSetMode);
            eventBus.off('AR_COMMAND' as any, handleARCommand);
            eventBus.off('AR_RESUME_SCAN' as any, handleResumeScan);
        };
    }, [transitionTo, sendToMain, sendToScanner, sendTypedMessage]);

    // ========== AUTO TRANSITIONS ==========
    useEffect(() => {
        if (phase === 'LOADING' && mindUrl) {
            const t = setTimeout(() => transitionTo('VIEWING'), 100);
            return () => clearTimeout(t);
        }
    }, [phase, mindUrl, transitionTo]);

    return (
        <div
            className="ar-container-v2"
            style={{
                position: 'fixed', inset: 0, width: '100vw', height: '100vh',
                background: '#000', overflow: 'hidden', zIndex: 99999,
            }}
        >
            {/* Error Overlay */}
            {phase === 'ERROR' && (
                <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, color: '#FF6B6B', flexDirection: 'column' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    <p style={{ marginTop: 16 }}>{error || 'An error occurred'}</p>
                    <button onClick={() => transitionTo('SCANNING')} style={{ marginTop: 24, padding: '12px 24px', background: '#4ECDC4', border: 'none', borderRadius: 20, color: '#fff', cursor: 'pointer', minHeight: 48, minWidth: 120 }}>Try Again</button>
                </div>
            )}

            {/* Main Iframe - Stabilized Key */}
            {mainSrc && (
                <iframe
                    ref={iframeRef}
                    key={`main-${phase}`} // ONLY use phase as key to avoid constant reload on model/image change
                    src={mainSrc}
                    allow="camera; microphone; autoplay; fullscreen"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', zIndex: 1 }}
                />
            )}

            {/* Background Scanner */}
            {enableBackgroundScanner && phase === 'VIEWING' && (
                <iframe
                    ref={pipRef}
                    key="pip-scanner"
                    src="/ar-scanner.html"
                    allow="camera; microphone; autoplay"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', zIndex: 0, opacity: 0, pointerEvents: 'none' }}
                />
            )}

            {/* Overlays */}
            <div style={{ position: 'relative', zIndex: 100 }}>{children}</div>
        </div>
    );
};

export default ARContainerV2;
