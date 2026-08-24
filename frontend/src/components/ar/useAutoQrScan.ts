/**
 * useAutoQrScan
 *
 * Single-scene QR: starts QR scanning inside the MindAR viewer scene
 * automatically after AR_READY, loops until `maxCards` distinct QR codes
 * have been detected, then shuts the scanner off (near-zero CPU afterwards).
 *
 * Design guarantees:
 * 1. One camera only — reuses the viewer's own <video> element through the
 *    already-shipped `ARAddCardScanner`, which never calls getUserMedia.
 * 2. Already-scanned cards are never re-decoded — each new scan session
 *    carries `excludedQrIds`; the scanner drops QRs in that list.
 * 3. Fail-closed — missing requirements → hook emits nothing, legacy
 *    behaviour preserved exactly.
 * 4. Bridges only through the existing AR_COMMAND eventBus pathway —
 *    no new postMessage contract.
 */

import { useEffect, useRef, useCallback } from 'react';
import { eventBus } from '@/runtime/EventBus';

export interface UseAutoQrScanOptions {
    /** Fail-closed switch. Default false keeps legacy behaviour. */
    enabled?: boolean;
    /** Stop scanning after this many distinct QR codes. Default 2. */
    maxCards?: number;
    /** Max consecutive scan timeouts before giving up. Default 3. */
    maxRetryOnTimeout?: number;
}

export interface AutoQrScanHandle {
    markReady: () => void;   // call once when AR_READY arrives
    markQr: (qrId: string) => void; // call when QR_DETECTED payload arrives
    readonly sessionId: string | null;
}

const FIRST_SCAN_TIMEOUT_MS = 15_000;
const FOLLOW_UP_TIMEOUT_MS = 30_000;
const READY_DEADLINE_MS = 8_000;

let sessionCounter = 0;

export function useAutoQrScan(options: UseAutoQrScanOptions = {}): AutoQrScanHandle {
    const { enabled = false, maxCards = 2, maxRetryOnTimeout = 3 } = options;

    const sessionIdRef = useRef<string | null>(null);
    const scannedRef = useRef<Set<string>>(new Set());
    const readyRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const timeoutsRef = useRef(0);
    const activeRef = useRef(false);

    const clearTimers = useCallback(() => {
        timersRef.current.forEach(t => clearTimeout(t));
        timersRef.current = [];
    }, []);

    const stopScan = useCallback(() => {
        sessionIdRef.current = null;
        activeRef.current = false;
        clearTimers();
        eventBus.emit('AR_COMMAND' as never, {
            type: 'CANCEL_ADD_CARD_SCAN',
            payload: {},
        } as never);
    }, [clearTimers]);

    const startScan = useCallback((excludedQrIds: string[], timeoutMs: number) => {
        if (!enabled) return;
        stopScan();
        const sessionId = `autoqr-${++sessionCounter}-${crypto.randomUUID()}`;
        sessionIdRef.current = sessionId;
        activeRef.current = true;

        const timer = setTimeout(() => {
            // Scanner did not confirm start — soft failure, countdown aborted.
            sessionIdRef.current = null;
        }, 3_000);
        timersRef.current.push(timer);

        eventBus.emit('AR_COMMAND' as never, {
            type: 'BEGIN_ADD_CARD_SCAN',
            payload: { sessionId, excludedQrIds, timeoutMs },
        } as never);
    }, [enabled, stopScan]);

    const markReady = useCallback(() => {
        readyRef.current = true;
        if (!enabled) return;
        if (scannedRef.current.size >= maxCards) return;

        const guard = setTimeout(() => {
            if (sessionIdRef.current) return;
            startScan(Array.from(scannedRef.current), FIRST_SCAN_TIMEOUT_MS);
        }, 800);
        timersRef.current.push(guard);

        const deadline = setTimeout(() => {
            if (!sessionIdRef.current && scannedRef.current.size < maxCards) {
                if (timeoutsRef.current >= maxRetryOnTimeout) return;
                startScan(Array.from(scannedRef.current), FIRST_SCAN_TIMEOUT_MS);
            }
        }, READY_DEADLINE_MS);
        timersRef.current.push(deadline);
    }, [enabled, maxCards, maxRetryOnTimeout, startScan]);

    const markQr = useCallback((qrId: string) => {
        if (!enabled) return;
        if (!qrId || scannedRef.current.has(qrId)) return;
        scannedRef.current.add(qrId);

        if (scannedRef.current.size >= maxCards) {
            stopScan();
            return;
        }

        timeoutsRef.current = 0;
        startScan(Array.from(scannedRef.current), FOLLOW_UP_TIMEOUT_MS);
    }, [enabled, maxCards, startScan, stopScan]);

    useEffect(() => {
        if (!enabled) return;

        const onQrDetected = (data: { sessionId?: string; qrId?: string }) => {
            const qrId = typeof data?.qrId === 'string' ? data.qrId : null;
            if (!qrId) return;
            if (data?.sessionId && data.sessionId !== sessionIdRef.current) return;
            markQr(qrId);
        };

        const onScanTimeout = (data: { sessionId?: string }) => {
            if (data?.sessionId && data.sessionId !== sessionIdRef.current) return;
            if (!sessionIdRef.current) return;
            timeoutsRef.current += 1;
            sessionIdRef.current = null;
            if (timeoutsRef.current >= maxRetryOnTimeout || scannedRef.current.size >= maxCards) return;
            startScan(Array.from(scannedRef.current), FOLLOW_UP_TIMEOUT_MS);
        };

        eventBus.on('AR_QR_DETECTED' as never, onQrDetected as never);
        eventBus.on('ADD_CARD_SCAN_TIMEOUT' as never, onScanTimeout as never);
        return () => {
            eventBus.off('AR_QR_DETECTED' as never, onQrDetected as never);
            eventBus.off('ADD_CARD_SCAN_TIMEOUT' as never, onScanTimeout as never);
            stopScan();
        };
    }, [enabled, maxCards, maxRetryOnTimeout, markQr, startScan, stopScan]);

    useEffect(() => () => stopScan(), [stopScan]);

    return {
        markReady,
        markQr,
        get sessionId() { return sessionIdRef.current; },
    };
}

export default useAutoQrScan;
