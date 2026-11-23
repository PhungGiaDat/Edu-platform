/**
 * useWebARSession.ts — M9: WebAR state machine + bridge
 *
 * Manages WebAR session state and handles postMessage events from WebView.
 * Does NOT import WebView — WebARScreen manages the WebView ref.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WebARPhase = 'IDLE' | 'SCANNING' | 'LOADING' | 'VIEWING' | 'COMBO' | 'ERROR';

export interface WebARTarget {
  targetIndex: number;
  qrId?: string;
  arTag?: string;
  confidence?: number;
  slotIndex?: number;
}

export interface WebARState {
  phase: WebARPhase;
  isReady: boolean;
  error: string | null;
  trackedTargets: WebARTarget[];
  currentQrId: string | null;
  comboActive: boolean;
  comboTargets: number[];
}

export interface UseWebARSessionOptions {
  lessonId?: string;
  mindUrl?: string;
  catalogId?: string;
  onQRDetected?: (qrId: string) => void;
  onTargetFound?: (target: WebARTarget) => void;
  onTargetLost?: (targetIndex: number) => void;
  onComboDetected?: (targets: number[]) => void;
  onComboProximity?: (targets: number[]) => void;
  onXpAward?: (xp: number, source: string) => void;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export interface WebARMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_READY'; ready: boolean }
  | { type: 'SET_PHASE'; phase: WebARPhase }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'TARGET_FOUND'; target: WebARTarget }
  | { type: 'TARGET_LOST'; targetIndex: number }
  | { type: 'SET_QR'; qrId: string | null }
  | { type: 'SET_COMBO'; active: boolean; targets: number[] }
  | { type: 'RESET' };

const initialState: WebARState = {
  phase: 'IDLE',
  isReady: false,
  error: null,
  trackedTargets: [],
  currentQrId: null,
  comboActive: false,
  comboTargets: [],
};

function reducer(state: WebARState, action: Action): WebARState {
  switch (action.type) {
    case 'SET_READY':
      return { ...state, isReady: action.ready };
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_ERROR':
      return { ...state, error: action.error, phase: action.error ? 'ERROR' : state.phase };
    case 'TARGET_FOUND': {
      const exists = state.trackedTargets.some(t => t.targetIndex === action.target.targetIndex);
      if (exists) return state;
      return {
        ...state,
        trackedTargets: [...state.trackedTargets, action.target],
        phase: state.phase === 'SCANNING' ? 'VIEWING' : state.phase,
      };
    }
    case 'TARGET_LOST':
      return {
        ...state,
        trackedTargets: state.trackedTargets.filter(t => t.targetIndex !== action.targetIndex),
      };
    case 'SET_QR':
      return { ...state, currentQrId: action.qrId };
    case 'SET_COMBO':
      return {
        ...state,
        comboActive: action.active,
        comboTargets: action.targets,
        phase: action.active ? 'COMBO' : 'VIEWING',
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebARSession(options: UseWebARSessionOptions = {}) {
  const {
    lessonId,
    mindUrl,
    catalogId,
    onQRDetected,
    onTargetFound,
    onTargetLost,
    onComboDetected,
    onComboProximity,
    onXpAward,
    onReady,
    onError,
  } = options;

  const [state, dispatch] = useReducer(reducer, initialState);
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Reset on unmount
  useEffect(() => {
    return () => { dispatch({ type: 'RESET' }); };
  }, []);

  // ── Message handler (pass to WebView onMessage) ─────────────────────────────

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const message: WebARMessage = JSON.parse(event.nativeEvent.data);
      const { type, payload } = message;

      console.log('[WebAR] Message:', type, payload);

      switch (type) {
        // System ready
        case 'AR_READY':
        case 'SYSTEM_READY':
          dispatch({ type: 'SET_READY', ready: true });
          dispatch({ type: 'SET_PHASE', phase: 'SCANNING' });
          callbacksRef.current.onReady?.();
          break;

        // System errors
        case 'SYSTEM_ERROR': {
          const err = (payload?.message as string) || (payload?.code as string) || 'Unknown error';
          dispatch({ type: 'SET_ERROR', error: err });
          callbacksRef.current.onError?.(err);
          break;
        }

        // Tracking events
        case 'TARGET_FOUND': {
          const target: WebARTarget = {
            targetIndex: payload?.targetIndex as number ?? 0,
            arTag: payload?.arTag as string | undefined,
            confidence: payload?.confidence as number | undefined,
            slotIndex: payload?.slotIndex as number | undefined,
          };
          dispatch({ type: 'TARGET_FOUND', target });
          callbacksRef.current.onTargetFound?.(target);
          break;
        }

        case 'TARGET_LOST': {
          const targetIndex = payload?.targetIndex as number;
          dispatch({ type: 'TARGET_LOST', targetIndex });
          callbacksRef.current.onTargetLost?.(targetIndex);
          break;
        }

        case 'MULTI_TARGET_DETECTED':
          console.log('[WebAR] Multi-target:', payload?.targets);
          break;

        case 'COMBO_DETECTED': {
          const comboTargets = (payload?.targets as number[]) || [];
          dispatch({ type: 'SET_COMBO', active: true, targets: comboTargets });
          callbacksRef.current.onComboDetected?.(comboTargets);
          break;
        }

        case 'COMBO_PROXIMITY_DETECTED': {
          const targets = (payload?.targets as number[]) || [];
          callbacksRef.current.onComboProximity?.(targets);
          break;
        }

        case 'XP_AWARD': {
          const xp = payload?.xp as number || 0;
          callbacksRef.current.onXpAward?.(xp, 'flashcard_view');
          break;
        }

        default:
          console.log('[WebAR] Unknown message:', type);
      }
    } catch (err) {
      console.error('[WebAR] Parse error:', err);
    }
  }, [state.currentQrId]);

  // ── Build AR viewer URL ────────────────────────────────────────────────────

  const buildARViewerUrl = useCallback(() => {
    const BASE_URL = 'https://edu-platform-phi.vercel.app'; // TODO: from config
    const params = new URLSearchParams();

    if (lessonId) params.set('lessonId', lessonId);
    if (catalogId) params.set('catalogId', catalogId);
    if (mindUrl) params.set('mind', mindUrl);

    params.set('targetCount', '2');
    params.set('maxTrack', '2');
    params.set('mode', 'webview'); // Signal to WebAR we're in RN

    return `${BASE_URL}/ar-viewer.html?${params.toString()}`;
  }, [lessonId, catalogId, mindUrl]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const startScanning = useCallback(() => dispatch({ type: 'SET_PHASE', phase: 'SCANNING' }), []);
  const stopScanning = useCallback(() => dispatch({ type: 'SET_PHASE', phase: 'VIEWING' }), []);

  // ── Inject JS into WebView ────────────────────────────────────────────────

  const injectJS = useCallback((webViewRef: { current?: { injectJavaScript?: (js: string) => Promise<boolean> } }) => {
    return (type: string, payload?: Record<string, unknown>) => {
      const js = `
        window.dispatchEvent(new MessageEvent('message', {
          data: JSON.stringify(${JSON.stringify(JSON.stringify({ type, payload }))})
        }));
      `;
      webViewRef.current?.injectJavaScript?.(js);
    };
  }, []);

  return {
    ...state,
    handleWebViewMessage,
    arViewerUrl: buildARViewerUrl(),
    reset,
    startScanning,
    stopScanning,
    injectJS,
  };
}
