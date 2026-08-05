/**
 * ARContainerV2.tsx
 *
 * AR container with iframe swapping for MindAR + PiP multi-scanner.
 * Optimized for stability: iframe is not recreated on every property change.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { AREvent } from '@/core/types/AREvents';
import { getSupabaseStorageBase } from '../../config';
import {
    ARMessage,
    ARMessageType,
    ARMessagePayloadMap,
    createMessage,
    normalizeMessage
} from '@/core/types/ARMessages';
import { useDualDisplay } from '@/hooks/useDualDisplay';
import { useComboDetection } from '@/hooks/useComboDetection';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { dualDisplayManager } from '@/runtime/DualDisplayManager';
import { ComboDefinition } from '@/lib/combo/types';
import { armViewerBootstrapWatchdog } from './viewerBootstrapWatchdog';

// ========== TYPES ==========
export type ARPhase = 'IDLE' | 'SCANNING' | 'LOADING' | 'VIEWING' | 'ERROR'
    | 'GAME_DRAG' | 'GAME_MEMORY' | 'GAME_COLORING';

interface ARContainerV2Props {
    initialPhase?: ARPhase;
    mindUrl?: string | null;
    mindBuffer?: Uint8Array | null;
    modelUrl?: string;
    imageUrl?: string;
    textureUrl?: string;
    modelUrl2?: string;
    imageUrl2?: string;
    textureUrl2?: string;
    word?: string;
    word2?: string;
    targets?: ARViewerTarget[];
    cardCount?: number;
    comboModelUrl?: string;
    comboImageUrl?: string;
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
    onViewerAssetError?: (data: { code?: string; error: string; url?: string }) => void;
    // Dual display props
    onComboActivated?: (combo: ComboDefinition) => void;
    onComboDeactivated?: () => void;
    onDualDisplayModeChange?: (mode: 'single' | 'dual' | 'combo') => void;
    children?: React.ReactNode;
}

interface ARViewerTarget {
    modelUrl?: string;
    imageUrl?: string;
    textureUrl?: string;
    word?: string;
}

const SUPABASE_BASE = getSupabaseStorageBase();
const PALM_TREE_MODEL_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/models3d/palm_tree.glb`;
const PALM_IMAGE_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/model2d/Palm.jpg`;
const ELEPHANT_IMAGE_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/model2d/Elephant.jpg`;
const COMBO_MODEL_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/models/combos/cute_elephant_jungle.glb`;
const COMBO_IMAGE_URL = `${SUPABASE_BASE}/storage/v1/object/public/AR_models/assets/model2d/elephant_tree_combo_layered.png`;
const VIEWER_BOOTSTRAP_TIMEOUT_MS = 15_000;

function normalizeViewerAssetUrl(url?: string): string | undefined {
    if (!url) return undefined;
    const lower = url.toLowerCase();
    if (lower.includes('/ar_models/models/palm_tree.glb') || lower.includes('/assets/models/palm_tree.glb')) return PALM_TREE_MODEL_URL;
    if (lower.includes('/assets/model2d/palm.jpg') || lower.endsWith('/palm.jpg')) return PALM_IMAGE_URL;
    if (lower.includes('/frontend/model2d/elephant.jpg') || lower.endsWith('/elephant.jpg')) return ELEPHANT_IMAGE_URL;
    if (lower.endsWith('/jungle_combo.jpg')) return '/assets/model2D/jungle_combo.jpg';
    if (lower.endsWith('/cute_elephant_jungle.glb')) return COMBO_MODEL_URL;
    if (lower.endsWith('/elephant_tree_combo_layered.png')) return COMBO_IMAGE_URL;
    return url;
}

export const ARContainerV2: React.FC<ARContainerV2Props> = ({
    initialPhase = 'SCANNING',
    mindUrl,
    mindBuffer,
    modelUrl,
    imageUrl,
    textureUrl,
    modelUrl2,
    imageUrl2,
    textureUrl2,
    word,
    word2,
    targets,
    cardCount,
    comboModelUrl,
    comboImageUrl,
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
    onViewerAssetError,
    onComboActivated,
    onComboDeactivated,
    onDualDisplayModeChange,
    children
}) => {
    const [phase, setPhase] = useState<ARPhase>(initialPhase);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Dual display hooks
    const {
        displayMode,
        isCombo,
        getDisplayInfo,
    } = useDualDisplay();

    const {
        hasActiveCombo,
        activeCombo: combo,
    } = useComboDetection();

    const {
        fps,
        isHealthy,
    } = usePerformanceMonitor();

    // Get combo info from store
    const comboData = getDisplayInfo();

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const pipRef = useRef<HTMLIFrameElement>(null);
    const cancelViewerBootstrapWatchdogRef = useRef<(() => void) | null>(null);

    // Ref-held buffer so the long-lived MIND_BUFFER_REQUEST listener (see the
    // stable handler below) can ship the latest merged buffer to the iframe
    // regardless of prop churn. Solves Cause 2 of
    // report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md.
    const mindBufferDeliveryRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        mindBufferDeliveryRef.current = mindBuffer ?? null;
    }, [mindBuffer]);

    const emitDebug = useCallback((label: string, details: Record<string, unknown> = {}) => {
        window.postMessage({
            type: 'AR_DEBUG',
            payload: {
                label,
                details,
                source: 'react-parent',
                phase
            },
            timestamp: Date.now(),
            origin: 'parent'
        }, '*');
    }, [phase]);

    // Refs for props to ensure handleMessage always has the latest callbacks without being recreated
    const callbacksRef = useRef({
        onQRDetected,
        onTargetFound,
        onTargetLost,
        onModelClick,
        onComboDetected,
        onViewerAssetError,
        onPhaseChange,
        onComboActivated,
        onComboDeactivated,
        onDualDisplayModeChange
    });

    useEffect(() => {
        callbacksRef.current = {
            onQRDetected,
            onTargetFound,
            onTargetLost,
            onModelClick,
            onComboDetected,
            onViewerAssetError,
            onPhaseChange,
            onComboActivated,
            onComboDeactivated,
            onDualDisplayModeChange
        };
    }, [onQRDetected, onTargetFound, onTargetLost, onModelClick, onComboDetected, onViewerAssetError, onPhaseChange, onComboActivated, onComboDeactivated, onDualDisplayModeChange]);

    const transitionTo = useCallback((newPhase: ARPhase) => {
        if (newPhase === phase) return;
        console.log(`[ARContainerV2] Phase: ${phase} → ${newPhase}`);
        setPhase(newPhase);
        callbacksRef.current.onPhaseChange?.(newPhase);
        eventBus.emit('AR_PHASE_CHANGED' as any, { phase: newPhase });
    }, [phase]);

    // ========== VIEWER SRC ==========
    const viewerSrc = useMemo(() => {
        if (!mindUrl && !mindBuffer) return null;
        const params = new URLSearchParams();
        params.set('mind', mindBuffer ? 'runtime-buffer' : mindUrl!);
        params.set('supabaseBase', SUPABASE_BASE);

        const viewerTargets = targets?.length
            ? targets.slice(0, 5)
            : [
                { modelUrl, imageUrl, textureUrl, word },
                { modelUrl: modelUrl2, imageUrl: imageUrl2, textureUrl: textureUrl2, word: word2 }
            ].filter(target => target.modelUrl || target.imageUrl || target.textureUrl || target.word);
        const targetCount = typeof cardCount === 'number'
            ? Math.max(1, Math.min(cardCount, 5))
            : Math.max(1, viewerTargets.length);

        viewerTargets.slice(0, targetCount).forEach((target, index) => {
            const suffix = index === 0 ? '' : String(index + 1);
            const normalizedModelUrl = normalizeViewerAssetUrl(target.modelUrl);
            const normalizedImageUrl = normalizeViewerAssetUrl(target.imageUrl);
            const normalizedTextureUrl = normalizeViewerAssetUrl(target.textureUrl);
            if (normalizedModelUrl) params.set(`model${suffix}`, normalizedModelUrl);
            if (normalizedImageUrl) params.set(`image${suffix}`, normalizedImageUrl);
            if (normalizedTextureUrl) params.set(`textureUrl${suffix}`, normalizedTextureUrl);
            if (target.word) params.set(`word${suffix}`, target.word);
        });

        params.set('cardCount', String(targetCount));
        params.set('targetCount', String(targetCount));
        if (typeof cardCount === 'number' || viewerTargets.length) {
            params.set('maxTrack', String(Math.max(1, Math.min(targetCount, 5))));
        }
        const normalizedComboModelUrl = normalizeViewerAssetUrl(comboModelUrl);
        const normalizedComboImageUrl = normalizeViewerAssetUrl(comboImageUrl);
        const normalizedComboTextureUrl = normalizeViewerAssetUrl(comboTextureUrl);
        if (normalizedComboModelUrl) params.set('comboModel', normalizedComboModelUrl);
        if (normalizedComboImageUrl) params.set('comboImage', normalizedComboImageUrl);
        if (normalizedComboTextureUrl) params.set('comboTextureUrl', normalizedComboTextureUrl);
        if (comboPhrase) params.set('comboPhrase', comboPhrase);
        return `/ar-viewer.html?${params.toString()}`;
    }, [mindUrl, mindBuffer, modelUrl, imageUrl, textureUrl, modelUrl2, imageUrl2, textureUrl2, word, word2, targets, cardCount, comboModelUrl, comboImageUrl, comboTextureUrl, comboPhrase]);

    useEffect(() => {
        emitDebug('PARENT_VIEWER_SRC_READY', {
            hasViewerSrc: Boolean(viewerSrc),
            mindUrl,
            hasMindBuffer: Boolean(mindBuffer?.byteLength),
            modelUrl,
            imageUrl,
            textureUrl,
            modelUrl2,
            imageUrl2,
            textureUrl2,
            word,
            word2,
            targets,
            cardCount,
            comboModelUrl,
            comboImageUrl,
            comboTextureUrl,
            comboPhrase
        });
    }, [emitDebug, viewerSrc, mindUrl, mindBuffer, modelUrl, imageUrl, textureUrl, modelUrl2, imageUrl2, textureUrl2, word, word2, targets, cardCount, comboModelUrl, comboImageUrl, comboTextureUrl, comboPhrase]);

    const mainSrc = useMemo(() => {
        switch (phase) {
            case 'SCANNING': return '/ar-scanner.html';
            case 'VIEWING': return viewerSrc;
            default: return null;
        }
    }, [phase, viewerSrc]);

    // Identity key for the viewer iframe that signals a meaningful change
    // (phase flip, or runtime-buffer mode flip, OR the underlying buffer
    // identity changed). Solves Cause 2 — the iframe no longer remounts on
    // every viewerSrc string change, only when the actual source flips.
    const mindIdentityKey = useMemo(() => {
        if (!mainSrc) return 'none';
        // For runtime-buffer mode, key by buffer reference identity so a
        // successful merge re-mounts the iframe exactly once.
        if (mindBuffer && mindBuffer.byteLength > 0) return `mind=runtime-buffer#${mindBuffer.byteLength}#${mainSrc}`;
        if (mainSrc.startsWith('data:') || mainSrc.includes('mind=')) {
            // Use only the mind= param portion — the rest of the querystring
            // (model, image, word params) does NOT require an iframe remount.
            const url = new URL(mainSrc, window.location.origin);
            return `phase=${phase}|mind=${url.searchParams.get('mind') ?? 'none'}`;
        }
        return `phase=${phase}|scanner`;
    }, [phase, mainSrc, mindBuffer]);

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
            onComboDetected: cbCombo,
            onComboActivated: cbComboActivated,
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
                emitDebug('PARENT_QR_DETECTED', {
                    qrId: data.qrId,
                    fromPiP,
                    phase,
                    deferQrTransition
                });
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
                if (fromPiP || phase !== 'VIEWING' || event.source !== iframeRef.current?.contentWindow) break;
                cancelViewerBootstrapWatchdogRef.current?.();
                cancelViewerBootstrapWatchdogRef.current = null;
                emitDebug('PARENT_AR_READY', {
                    payload,
                    fromPiP,
                    phase,
                    viewerSrc
                });
                setIsReady(true);
                transitionTo('VIEWING');
                eventBus.emit(AREvent.SCENE_READY, { scene: 'viewer' } as any);
                break;

            case 'MIND_BUFFER_REQUEST': {
                const iframeWindow = iframeRef.current?.contentWindow;
                if (!fromPiP && mindBuffer && iframeWindow && event.source === iframeWindow) {
                    iframeWindow.postMessage(
                        createMessage('MIND_BUFFER', { buffer: mindBuffer }),
                        '*'
                    );
                    emitDebug('PARENT_MIND_BUFFER_SENT', { bytes: mindBuffer.byteLength });
                }
                break;
            }

            case 'TARGET_FOUND': {
                const data = payload as ARMessagePayloadMap['TARGET_FOUND'];
                emitDebug('PARENT_TARGET_FOUND', {
                    targetIndex: data.targetIndex,
                    fromPiP,
                    phase
                });
                cbFound?.(data.targetIndex);
                eventBus.emit(AREvent.MARKER_FOUND, { markerId: `target-${data.targetIndex}`, target: null } as any);

                // Also notify dual display manager
                dualDisplayManager.onMarkerFound(`target-${data.targetIndex}`);
                break;
            }

            case 'TARGET_LOST': {
                const data = payload as ARMessagePayloadMap['TARGET_LOST'];
                emitDebug('PARENT_TARGET_LOST', {
                    targetIndex: data.targetIndex,
                    fromPiP,
                    phase
                });
                cbLost?.(data.targetIndex);
                eventBus.emit(AREvent.MARKER_LOST, { markerId: `target-${data.targetIndex}` } as any);

                // Also notify dual display manager
                dualDisplayManager.onMarkerLost(`target-${data.targetIndex}`);
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

                // Call dual display manager
                dualDisplayManager.onMarkerFound(`target-${data.targets[0]}`);
                dualDisplayManager.onMarkerFound(`target-${data.targets[1]}`);

                eventBus.emit(AREvent.COMBO_ACTIVATED, {
                    tag1: `target-${data.targets[0]}`,
                    tag2: `target-${data.targets[1]}`
                } as any);

                // Call callback
                if (hasActiveCombo && combo) {
                    cbComboActivated?.(combo);
                }
                break;
            }

            case 'ANIMATION_COMPLETE':
                eventBus.emit('ANIMATION_COMPLETE' as any, payload);
                break;

            case 'SYSTEM_ERROR':
            case 'AR_ERROR' as any: {
                const fromActiveViewer = event.source === iframeRef.current?.contentWindow;
                if (!fromActiveViewer || fromPiP) break;
                const data = payload as { code?: string; error?: string; message?: string; url?: string; stage?: string; elapsedMs?: number };
                const errorMsg = data.error || data.message || 'Unknown error';
                callbacksRef.current.onViewerAssetError?.({
                    code: data.code,
                    error: errorMsg,
                    url: data.url
                });
                emitDebug('PARENT_SYSTEM_ERROR', {
                    errorMsg,
                    payload,
                    fromPiP,
                    phase
                });
                const recoverableCodes = new Set([
                    'MODEL_LOAD_ERROR',
                    'IMAGE_LOAD_ERROR',
                    'TEXTURE_LOAD_ERROR',
                    'TEXTURE_APPLY_ERROR'
                ]);
                if (data.code && recoverableCodes.has(data.code)) {
                    emitDebug('PARENT_RECOVERABLE_ASSET_ERROR', {
                        code: data.code,
                        errorMsg,
                        payload
                    });
                    break;
                }
                cancelViewerBootstrapWatchdogRef.current?.();
                cancelViewerBootstrapWatchdogRef.current = null;
                setError(errorMsg);
                transitionTo('ERROR');
                eventBus.emit(AREvent.AR_ERROR, { error: new Error(errorMsg) } as any);
                break;
            }
        }
    }, [phase, transitionTo, deferQrTransition, emitDebug, viewerSrc, mindBuffer]);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    // ========== STABLE MIND BUFFER DELIVERY (Edit I) ==========
    // Registered once on mount, never re-subscribes. Solves the iframe
    // thrash where React re-renders between the iframe's MIND_BUFFER_REQUEST
    // and the parent's reply — see
    // report/DEBUG_20260706_MULTI_FLASHCARD_LOADING.md, Cause 2.
    //
    // Defensive buffer copy: iOS Safari can neuter ArrayBuffer views during
    // structured-clone-like operations inside postMessage (Constraint
    // Guardian #6). Copying into a fresh Uint8Array detaches from the
    // neuter-prone buffer.
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            const data = event.data;
            if (!data || data.type !== 'MIND_BUFFER_REQUEST') return;
            const iframeWindow = iframeRef.current?.contentWindow;
            if (event.source !== iframeWindow || !iframeWindow) return;
            const buffer = mindBufferDeliveryRef.current;
            if (!buffer || !buffer.byteLength) return;
            const safeBuffer = new Uint8Array(buffer.byteLength);
            safeBuffer.set(buffer);
            try {
                iframeWindow.postMessage(
                    createMessage('MIND_BUFFER', { buffer: safeBuffer }),
                    '*'
                );
                emitDebug('PARENT_MIND_BUFFER_SENT', { bytes: safeBuffer.byteLength });
            } catch (error) {
                emitDebug('PARENT_MIND_BUFFER_POST_FAILED', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    useEffect(() => {
        cancelViewerBootstrapWatchdogRef.current?.();
        cancelViewerBootstrapWatchdogRef.current = null;

        if (phase !== 'VIEWING' || !viewerSrc) return;

        cancelViewerBootstrapWatchdogRef.current = armViewerBootstrapWatchdog({
            timeoutMs: VIEWER_BOOTSTRAP_TIMEOUT_MS,
            onTimeout: () => {
                emitDebug('PARENT_VIEWER_BOOTSTRAP_TIMEOUT', {
                    timeoutMs: VIEWER_BOOTSTRAP_TIMEOUT_MS,
                    viewerSrc
                });
                setError("AR couldn't start. Let's scan the card again.");
                transitionTo('ERROR');
            }
        });

        return () => {
            cancelViewerBootstrapWatchdogRef.current?.();
            cancelViewerBootstrapWatchdogRef.current = null;
        };
    }, [phase, viewerSrc, emitDebug, transitionTo]);

    const handleScanAgain = useCallback(() => {
        cancelViewerBootstrapWatchdogRef.current?.();
        cancelViewerBootstrapWatchdogRef.current = null;
        setError(null);
        setIsReady(false);
        transitionTo('SCANNING');
    }, [transitionTo]);

    // Debug overlay for development
    const debugOverlay = process.env.NODE_ENV === 'development' ? (
        <div style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: 8,
            borderRadius: 8,
            fontSize: 12,
            zIndex: 1000,
        }}>
            <div>FPS: {fps} {isHealthy ? 'OK' : 'WARN'}</div>
            <div>Mode: {displayMode}</div>
            {isCombo && <div>Combo: {combo?.name}</div>}
            <div>Markers: {comboData.markerCount}</div>
        </div>
    ) : null;

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
                    <p style={{ marginTop: 16 }}>{error || "AR couldn't start. Let's scan the card again."}</p>
                    <button onClick={handleScanAgain} style={{ marginTop: 24, padding: '12px 24px', background: '#4ECDC4', border: 'none', borderRadius: 20, color: '#fff', cursor: 'pointer', minHeight: 48, minWidth: 120 }}>Scan Again</button>
                </div>
            )}

            {/* Main Iframe - Stabilized Key */}
            {mainSrc && (
                <iframe
                    ref={iframeRef}
                    key={`main-${mindIdentityKey}`}
                    src={mainSrc}
                    onLoad={() => emitDebug('PARENT_VIEWER_IFRAME_LOADED', {
                        phase,
                        src: phase === 'VIEWING' ? 'viewer' : 'scanner'
                    })}
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

            {/* Debug overlay */}
            {debugOverlay}
        </div>
    );
};

export default ARContainerV2;
