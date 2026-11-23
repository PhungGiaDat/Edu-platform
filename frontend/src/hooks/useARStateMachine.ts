/**
 * useARStateMachine.ts
 * 
 * Task 3.1: State Machine for AR flow
 * States: IDLE -> SCANNING -> QR_DETECTED -> FETCHING_ASSET -> NFT_LOADED -> ERROR
 * 
 * Uses reducer pattern for predictable state transitions
 */

import { useReducer, useCallback, useEffect } from 'react';
import { eventBus } from '@/runtime/EventBus';
import { AREvent } from '@/core/types/AREvents';

// ========== TYPES ==========
export type ARState =
    | 'IDLE'           // Initial state, AR not started
    | 'SCANNING'       // Camera active, scanning for QR
    | 'QR_DETECTED'    // QR detected, about to fetch
    | 'FETCHING_ASSET' // API call in progress
    | 'NFT_LOADED'     // NFT loaded and visible
    | 'ERROR';         // Something went wrong

export type ARAction =
    | { type: 'START_SCANNING' }
    | { type: 'QR_DETECTED'; payload: { qrId: string; allDetected?: string[] } }
    | { type: 'FETCH_START' }
    | { type: 'FETCH_SUCCESS'; payload: { markerId: string; descriptorUrl: string; modelUrl: string } }
    | { type: 'FETCH_ERROR'; payload: { error: string; qrId?: string } }
    | { type: 'NFT_CREATED'; payload: { markerId: string } }
    | { type: 'NFT_FOUND'; payload: { markerId: string } }
    | { type: 'NFT_LOST'; payload: { markerId: string } }
    | { type: 'RESET' }
    | { type: 'SET_ERROR'; payload: { error: string } };

export interface ARStateMachineState {
    state: ARState;
    currentQrId: string | null;
    activeNFTs: Set<string>;
    visibleNFTs: Set<string>; // NFTs currently in view
    error: string | null;
    lastAction: string | null;
}

// ========== INITIAL STATE ==========
const initialState: ARStateMachineState = {
    state: 'IDLE',
    currentQrId: null,
    activeNFTs: new Set(),
    visibleNFTs: new Set(),
    error: null,
    lastAction: null
};

// ========== REDUCER ==========
function arReducer(state: ARStateMachineState, action: ARAction): ARStateMachineState {
    console.log('[ARStateMachine] 🔄', state.state, '->', action.type);

    switch (action.type) {
        case 'START_SCANNING':
            return {
                ...state,
                state: 'SCANNING',
                error: null,
                lastAction: 'START_SCANNING'
            };

        case 'QR_DETECTED':
            if (state.state !== 'SCANNING') {
                console.warn('[ARStateMachine] QR_DETECTED ignored in state:', state.state);
                return state;
            }
            return {
                ...state,
                state: 'QR_DETECTED',
                currentQrId: action.payload.qrId,
                lastAction: 'QR_DETECTED'
            };

        case 'FETCH_START':
            return {
                ...state,
                state: 'FETCHING_ASSET',
                lastAction: 'FETCH_START'
            };

        case 'FETCH_SUCCESS':
            return {
                ...state,
                state: 'NFT_LOADED',
                activeNFTs: new Set(state.activeNFTs).add(action.payload.markerId),
                lastAction: 'FETCH_SUCCESS'
            };

        case 'FETCH_ERROR':
            return {
                ...state,
                state: 'ERROR',
                error: action.payload.error,
                lastAction: 'FETCH_ERROR'
            };

        case 'NFT_CREATED':
            return {
                ...state,
                activeNFTs: new Set(state.activeNFTs).add(action.payload.markerId),
                lastAction: 'NFT_CREATED'
            };

        case 'NFT_FOUND':
            return {
                ...state,
                visibleNFTs: new Set(state.visibleNFTs).add(action.payload.markerId),
                lastAction: 'NFT_FOUND'
            };

        case 'NFT_LOST': {
            const newVisible = new Set(state.visibleNFTs);
            newVisible.delete(action.payload.markerId);
            return {
                ...state,
                visibleNFTs: newVisible,
                lastAction: 'NFT_LOST'
            };
        }

        case 'SET_ERROR':
            return {
                ...state,
                state: 'ERROR',
                error: action.payload.error,
                lastAction: 'SET_ERROR'
            };

        case 'RESET':
            return {
                ...initialState,
                lastAction: 'RESET'
            };

        default:
            return state;
    }
}

// ========== HOOK ==========
export interface UseARStateMachineOptions {
    autoStart?: boolean;
    onQRDetected?: (qrId: string) => void;
    onError?: (error: string) => void;
    onNFTLoaded?: (markerId: string) => void;
}

export function useARStateMachine(options: UseARStateMachineOptions = {}) {
    const [state, dispatch] = useReducer(arReducer, initialState);
    const { autoStart = true, onQRDetected, onError, onNFTLoaded } = options;

    // ========== ACTIONS ==========
    const startScanning = useCallback(() => {
        dispatch({ type: 'START_SCANNING' });
    }, []);

    const handleQRDetected = useCallback((qrId: string, allDetected?: string[]) => {
        dispatch({ type: 'QR_DETECTED', payload: { qrId, allDetected } });
        onQRDetected?.(qrId);
    }, [onQRDetected]);

    const startFetching = useCallback(() => {
        dispatch({ type: 'FETCH_START' });
    }, []);

    const handleFetchSuccess = useCallback((data: { markerId: string; descriptorUrl: string; modelUrl: string }) => {
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
        onNFTLoaded?.(data.markerId);
    }, [onNFTLoaded]);

    const handleFetchError = useCallback((error: string, qrId?: string) => {
        dispatch({ type: 'FETCH_ERROR', payload: { error, qrId } });
        onError?.(error);
    }, [onError]);

    const handleNFTCreated = useCallback((markerId: string) => {
        dispatch({ type: 'NFT_CREATED', payload: { markerId } });
    }, []);

    const handleNFTFound = useCallback((markerId: string) => {
        dispatch({ type: 'NFT_FOUND', payload: { markerId } });
    }, []);

    const handleNFTLost = useCallback((markerId: string) => {
        dispatch({ type: 'NFT_LOST', payload: { markerId } });
    }, []);

    const reset = useCallback(() => {
        dispatch({ type: 'RESET' });
        // Also tell iframe to clear NFTs
        eventBus.emit('CLEAR_NFT_REQUEST' as any, {});
    }, []);

    const setError = useCallback((error: string) => {
        dispatch({ type: 'SET_ERROR', payload: { error } });
        onError?.(error);
    }, [onError]);

    // ========== EVENTBUS SUBSCRIPTIONS ==========
    useEffect(() => {
        if (autoStart) {
            startScanning();
        }

        // Listen for AR events from ARContainer/iframe
        const handleMarkerFound = (payload: { markerId: string }) => {
            if (state.state === 'SCANNING') {
                handleQRDetected(payload.markerId);
            } else {
                handleNFTFound(payload.markerId);
            }
        };

        const handleMarkerLost = (payload: { markerId: string }) => {
            handleNFTLost(payload.markerId);
        };

        const handleARError = (payload: { error: Error; context?: string }) => {
            setError(payload.error.message || 'Unknown AR error');
        };

        eventBus.on(AREvent.MARKER_FOUND, handleMarkerFound);
        eventBus.on(AREvent.MARKER_LOST, handleMarkerLost);
        eventBus.on(AREvent.AR_ERROR, handleARError);

        return () => {
            eventBus.off(AREvent.MARKER_FOUND, handleMarkerFound);
            eventBus.off(AREvent.MARKER_LOST, handleMarkerLost);
            eventBus.off(AREvent.AR_ERROR, handleARError);
        };
    }, [autoStart, state.state, startScanning, handleQRDetected, handleNFTFound, handleNFTLost, setError]);

    return {
        // State
        ...state,
        isScanning: state.state === 'SCANNING',
        isLoading: state.state === 'FETCHING_ASSET',
        isReady: state.state === 'NFT_LOADED',
        hasError: state.state === 'ERROR',

        // Actions
        startScanning,
        handleQRDetected,
        startFetching,
        handleFetchSuccess,
        handleFetchError,
        handleNFTCreated,
        handleNFTFound,
        handleNFTLost,
        reset,
        setError
    };
}

export default useARStateMachine;
