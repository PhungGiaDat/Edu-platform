/**
 * ARContainerV2.tsx
 *
 * AR container with iframe swapping for MindAR + PiP multi-scanner.
 * Optimized for stability: iframe is not recreated on every property change.
 *
 * Persistent Viewer flow (Task 8):
 * - viewer URL is built only from mind + catalogId + targetCount + maxTrack=2
 * - mindIdentityKey = catalogId|mindUrl — stable across activeTargets changes
 * - After AR_READY, sends SET_ACTIVE_TARGETS with revision 1
 * - On activeTargets prop change, sends next SET_ACTIVE_TARGETS revision
 * - 7-second ACK timeout triggers rejection with ACTIVE_TARGETS_TIMEOUT
 * - No MIND_BUFFER props in the persistent viewer flow
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { AREvent } from '@/core/types/AREvents';
import {
    ARMessage,
    ARMessageType,
    ARMessagePayloadMap,
    createMessage,
    normalizeMessage,
    ActiveViewerTarget,
} from '@/core/types/ARMessages';
import { useDualDisplay } from '@/hooks/useDualDisplay';
import { useComboDetection } from '@/hooks/useComboDetection';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { dualDisplayManager } from '@/runtime/DualDisplayManager';
import { ComboDefinition } from '@/lib/combo/types';
import { armViewerBootstrapWatchdog } from './viewerBootstrapWatchdog';
import { useAutoQrScan } from './useAutoQrScan';
import {
    requestRevision,
    acknowledgeRevision,
    initialRevisionState,
    ActiveTargetRevisionState,
} from './activeTargetRevision';

// ========== TYPES ==========
export type ARPhase = 'IDLE' | 'SCANNING' | 'LOADING' | 'VIEWING' | 'ERROR'
    | 'GAME_DRAG' | 'GAME_MEMORY' | 'GAME_COLORING';

interface ARContainerV2Props {
    initialPhase?: ARPhase;
    // --- Auto QR-in-scene (Spec A) ---
    autoQrScanEnabled?: boolean;
    // --- Persistent viewer props (Task 8) ---
    catalogId?: string | null;
    mindUrl?: string | null;
    catalogTargetCount?: number;
    activeTargets?: ActiveViewerTarget[];
    onActiveTargetsApplied?: (revision: number) => void;
    onActiveTargetsRejected?: (error: {
        revision: number;
        code: string;
        stage: string;
        message: string;
    }) => void;
    // --- Legacy props (used when catalogId is absent; mindBuffer unused — runtime merge removed) ---
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

const VIEWER_BOOTSTRAP_TIMEOUT_MS = 15_000;
// 7-second ACK timeout for SET_ACTIVE_TARGETS revisions (Task 8)
const ACTIVE_TARGETS_ACK_TIMEOUT_MS = 7_000;
export const ARContainerV2: React.FC<ARContainerV2Props> = ({
    initialPhase = 'SCANNING',
    autoQrScanEnabled,
    catalogId,
    mindUrl,
    catalogTargetCount,
    activeTargets,
    onActiveTargetsApplied,
    onActiveTargetsRejected,
    // --- Legacy props (used when catalogId is absent) ---
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

    // Spec A: Auto QR-in-scene
    const autoQr = useAutoQrScan({
        enabled: autoQrScanEnabled === true,
        maxCards: 2,
    });

    // Get combo info from store
    const comboData = getDisplayInfo();

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const pipRef = useRef<HTMLIFrameElement>(null);
    const cancelViewerBootstrapWatchdogRef = useRef<(() => void) | null>(null);
    // Task 8: revision state machine — kept in a ref so the ACK timeout
    // and message handler can both mutate it without causing re-renders.
    const revisionStateRef = useRef<ActiveTargetRevisionState>(initialRevisionState);
    // Task 8: ACK timeout handle — cleared on each new revision
    const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        onDualDisplayModeChange,
        // Task 8: revision lifecycle callbacks
        onActiveTargetsApplied,
        onActiveTargetsRejected,
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
            onDualDisplayModeChange,
            onActiveTargetsApplied,
            onActiveTargetsRejected,
        };
    }, [onQRDetected, onTargetFound, onTargetLost, onModelClick, onComboDetected, onViewerAssetError, onPhaseChange, onComboActivated, onComboDeactivated, onDualDisplayModeChange, onActiveTargetsApplied, onActiveTargetsRejected]);

    const transitionTo = useCallback((newPhase: ARPhase) => {
        if (newPhase === phase) return;
        console.log(`[ARContainerV2] Phase: ${phase} → ${newPhase}`);
        setPhase(newPhase);
        callbacksRef.current.onPhaseChange?.(newPhase);
        eventBus.emit('AR_PHASE_CHANGED' as any, { phase: newPhase });
    }, [phase]);

    // ========== TASK 8: VIEWER SRC (catalog-only, stable key) ==========
    /**
     * Build the persistent viewer URL.
     *
     * Contains ONLY: mind, catalogId, targetCount, maxTrack=2.
     * Model URLs, words, combo assets, activeTargets, revision
     * are sent via postMessage after AR_READY — they never appear
     * in the URL and never change the iframe key.
     */
    // Fix D: apply MindAR performance tuning to every viewerSrc
    const applyTuningParams = (p: URLSearchParams) => {
        p.set('filterMinCF',     '0.1');
        p.set('filterBeta',      '0.3');
        p.set('lossTimeout',     '1200');
        p.set('warmupTolerance', '0');
        p.set('renderScale',     '0.8');   // reduce GPU load on mobile
        p.set('watchdogDisabled', 'false'); // keep adaptive watchdog active
    };

    const viewerSrc = useMemo(() => {
        // Priority 1: Persistent viewer (catalogId + mindUrl)
        // Model/word/combo assets sent via postMessage after AR_READY.
        // This path requires SET_ACTIVE_TARGETS to activate targets.
        if (catalogId && mindUrl) {
            const params = new URLSearchParams();
            params.set('mind', mindUrl);
            params.set('catalogId', catalogId);
            const targetCount = typeof catalogTargetCount === 'number'
                ? catalogTargetCount
                : 2;
            params.set('targetCount', String(targetCount));
            params.set('maxTrack', '2');
            applyTuningParams(params);
            return `/ar-viewer.html?${params.toString()}`;
        }

        // Priority 2: Legacy path — single mindUrl, models/words via URL params.
        // Falls back to scanner if no mindUrl at all.
        if (!mindUrl) return null;
        const params = new URLSearchParams();
        params.set('mind', mindUrl);

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
            if (target.modelUrl) params.set(`model${suffix}`, target.modelUrl);
            if (target.imageUrl) params.set(`image${suffix}`, target.imageUrl);
            if (target.textureUrl) params.set(`textureUrl${suffix}`, target.textureUrl);
            if (target.word) params.set(`word${suffix}`, target.word);
        });

        params.set('cardCount', String(targetCount));
        params.set('targetCount', String(targetCount));
        params.set('maxTrack', String(Math.max(1, Math.min(targetCount, 5))));

        if (comboModelUrl) params.set('comboModel', comboModelUrl);
        if (comboImageUrl) params.set('comboImage', comboImageUrl);
        if (comboTextureUrl) params.set('comboTextureUrl', comboTextureUrl);
        if (comboPhrase) params.set('comboPhrase', comboPhrase);
        applyTuningParams(params);
        return `/ar-viewer.html?${params.toString()}`;
    }, [mindUrl, catalogId, catalogTargetCount, modelUrl, imageUrl, textureUrl, modelUrl2, imageUrl2, textureUrl2, word, word2, targets, cardCount, comboModelUrl, comboImageUrl, comboTextureUrl, comboPhrase]);

    useEffect(() => {
        emitDebug('PARENT_VIEWER_SRC_READY', {
            hasViewerSrc: Boolean(viewerSrc),
            mindUrl,
            catalogId,
            catalogTargetCount,
        });
    }, [emitDebug, viewerSrc, mindUrl, catalogId, catalogTargetCount]);

    const mainSrc = useMemo(() => {
        switch (phase) {
            case 'SCANNING': return '/ar-scanner.html';
            case 'VIEWING': return viewerSrc;
            default: return null;
        }
    }, [phase, viewerSrc]);

    // ========== TASK 8: STABLE IDENTITY KEY ==========
    /**
     * Identity key for the viewer iframe — MUST NOT change when activeTargets
     * changes, otherwise React remounts the iframe and loses the MindAR session.
     *
     * Persistent viewer: key = catalogId|mindUrl (stable catalog identity)
     * Legacy path: key derived from URL params (mindUrl + models)
     */
    const mindIdentityKey = useMemo(() => {
        if (!mainSrc) return 'none';
        if (catalogId && mindUrl) {
            return `catalog=${catalogId}|mind=${mindUrl}`;
        }
        // Legacy path: stable key from URL params (doesn't include activeTargets)
        if (mainSrc.startsWith('data:') || mainSrc.includes('mind=')) {
            const url = new URL(mainSrc, window.location.origin);
            const modelParams = ['model', 'model2', 'model3', 'model4', 'model5']
                .map(p => `${p}=${url.searchParams.get(p) ?? ''}`)
                .filter(p => !p.endsWith('='))
                .join('|');
            return `legacy|mind=${url.searchParams.get('mind') ?? 'none'}|${modelParams}`;
        }
        return `phase=${phase}|scanner`;
    }, [phase, mainSrc, catalogId, mindUrl]);

    // ========== TASK 8: REVISION TRANSPORT ==========

    /**
     * Arm (or re-arm) the 7-second ACK timeout for the current desired revision.
     * Clears any previously armed timeout to handle revision churn correctly.
     */
    const armAckTimeout = useCallback((_revision: number) => {
        if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current);
        ackTimeoutRef.current = setTimeout(() => {
            const state = revisionStateRef.current;
            if (state.desiredRevision !== state.acknowledgedRevision) {
                // Still waiting on this revision — time out and reject
                callbacksRef.current.onActiveTargetsRejected?.({
                    revision: state.desiredRevision,
                    code: 'ACTIVE_TARGETS_TIMEOUT',
                    stage: 'ACK_WAIT',
                    message: `SET_ACTIVE_TARGETS revision ${state.desiredRevision} was not acknowledged within ${ACTIVE_TARGETS_ACK_TIMEOUT_MS}ms`,
                });
                emitDebug('PARENT_ACTIVE_TARGETS_TIMEOUT', {
                    revision: state.desiredRevision,
                });
            }
        }, ACTIVE_TARGETS_ACK_TIMEOUT_MS);
    }, [emitDebug]);

    /**
     * Send SET_ACTIVE_TARGETS to the viewer iframe.
     * Called after AR_READY and on every activeTargets prop change.
     */
    const sendActiveTargets = useCallback((revision: number, targets: ActiveViewerTarget[]) => {
        if (!iframeRef.current?.contentWindow) return;
        const iframeWindow = iframeRef.current.contentWindow;
        iframeWindow.postMessage(
            createMessage('SET_ACTIVE_TARGETS', {
                catalogId: catalogId ?? '',
                revision,
                targets,
            }),
            '*'
        );
        emitDebug('PARENT_SET_ACTIVE_TARGETS_SENT', {
            catalogId,
            revision,
            targetCount: targets.length,
        });
    }, [catalogId, emitDebug]);

    /**
     * Advance the revision state machine and send the new SET_ACTIVE_TARGETS.
     * Arms the ACK timeout; on acknowledgeRevision the timeout is cleared.
     */
    const requestActiveTargets = useCallback((targets: ActiveViewerTarget[]) => {
        const next = requestRevision(revisionStateRef.current, targets);
        revisionStateRef.current = next;
        sendActiveTargets(next.desiredRevision, targets);
        armAckTimeout(next.desiredRevision);
    }, [sendActiveTargets, armAckTimeout]);

    // When activeTargets prop changes, send a new revision (only after AR_READY
    // has been received so the iframe is ready to receive SET_ACTIVE_TARGETS).
    const hasReceivedARReadyRef = useRef(false);
    useEffect(() => {
        if (!hasReceivedARReadyRef.current) return;
        if (!activeTargets?.length) return;
        requestActiveTargets(activeTargets);
    }, [activeTargets, requestActiveTargets]);

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
                // Spec A: notify auto QR scanner
                autoQr.markQr(data.qrId);
                cbQR?.(data.qrId);
                eventBus.emit(AREvent.MARKER_FOUND, { markerId: data.qrId, target: null } as any);
                // Task 8: forward QR_DETECTED via eventBus for Add-card flow
                eventBus.emit('AR_QR_DETECTED' as any, {
                    sessionId: data.qrId,
                    qrId: data.qrId,
                });
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

            case 'AR_READY': {
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

                // Task 8: mark AR_READY received and send initial SET_ACTIVE_TARGETS
                hasReceivedARReadyRef.current = true;
                // Spec A: notify auto QR scanner that AR is ready
                autoQr.markReady();
                if (activeTargets?.length) {
                    requestActiveTargets(activeTargets);
                }
                break;
            }

            // Task 8: handle SET_ACTIVE_TARGETS acknowledgement
            case 'ACTIVE_TARGETS_APPLIED': {
                const data = payload as ARMessagePayloadMap['ACTIVE_TARGETS_APPLIED'];
                emitDebug('PARENT_ACTIVE_TARGETS_APPLIED', {
                    catalogId: data.catalogId,
                    revision: data.revision,
                });

                // Clear ACK timeout — revision was acknowledged in time
                if (ackTimeoutRef.current) {
                    clearTimeout(ackTimeoutRef.current);
                    ackTimeoutRef.current = null;
                }

                const next = acknowledgeRevision(revisionStateRef.current, data.revision);
                revisionStateRef.current = next;

                callbacksRef.current.onActiveTargetsApplied?.(data.revision);
                break;
            }

            // Task 8: handle SET_ACTIVE_TARGETS rejection
            case 'ACTIVE_TARGETS_REJECTED': {
                const data = payload as ARMessagePayloadMap['ACTIVE_TARGETS_REJECTED'];
                emitDebug('PARENT_ACTIVE_TARGETS_REJECTED', {
                    catalogId: data.catalogId,
                    revision: data.revision,
                    code: data.code,
                    stage: data.stage,
                    message: data.message,
                });

                // Clear ACK timeout
                if (ackTimeoutRef.current) {
                    clearTimeout(ackTimeoutRef.current);
                    ackTimeoutRef.current = null;
                }

                callbacksRef.current.onActiveTargetsRejected?.({
                    revision: data.revision,
                    code: data.code,
                    stage: data.stage,
                    message: data.message,
                });
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

            // Spec A: forward ADD_CARD_SCAN_TIMEOUT from viewer scanner to eventBus
            // so useAutoQrScan can listen for scan timeouts
            case 'ADD_CARD_SCAN_TIMEOUT': {
                const data = payload as { sessionId?: string };
                eventBus.emit('ADD_CARD_SCAN_TIMEOUT' as any, { sessionId: data.sessionId });
                break;
            }

            case 'ADD_CARD_SCAN_STARTED': {
                // Spec A: forward scan start confirmation (optional logging)
                const data = payload as { sessionId?: string };
                emitDebug('PARENT_ADD_CARD_SCAN_STARTED', { sessionId: data.sessionId });
                break;
            }

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
    }, [phase, transitionTo, deferQrTransition, emitDebug, viewerSrc, activeTargets, requestActiveTargets]);

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

            {/* Main Iframe — key is mindIdentityKey (stable across activeTargets changes) */}
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
