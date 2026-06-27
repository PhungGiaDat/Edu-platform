// src/hooks/useSessionTimer.ts
// Session timer for parental time limits with Redis backend support

import { useState, useEffect, useCallback, useRef } from 'react';
import sessionApi, { LockState } from '../services/sessionApi';

interface SessionTimerConfig {
    limitMins: number;
    warningMins: number;
    onWarning?: () => void;
    onLimitReached?: () => void;
    syncWithBackend?: boolean; // Enable Redis sync
}

interface SessionTimerState {
    elapsedMins: number;
    remainingMins: number;
    isWarning: boolean;
    isLimitReached: boolean;
    isPaused: boolean;
    isSynced: boolean;
    lastSyncedAt: number | null;
}

interface UseSessionTimerReturn extends SessionTimerState {
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    reset: () => Promise<void>;
    extendTime: (extraMins: number) => Promise<void>;
    formatRemaining: () => string;
    syncNow: () => Promise<void>;
}

export const useSessionTimer = (config: SessionTimerConfig): UseSessionTimerReturn => {
    const { 
        limitMins = 30, 
        warningMins = 25, 
        onWarning, 
        onLimitReached,
        syncWithBackend = false 
    } = config;

    const [state, setState] = useState<SessionTimerState>({
        elapsedMins: 0,
        remainingMins: limitMins,
        isWarning: false,
        isLimitReached: false,
        isPaused: false,
        isSynced: false,
        lastSyncedAt: null,
    });

    const lockStateRef = useRef<LockState | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const pausedTimeRef = useRef<number>(0);

    // Calculate elapsed time from lock state
    const calculateFromLockState = useCallback((lockState: LockState | null) => {
        if (!lockState) return;

        const remaining = lockState.remaining_seconds || 0;
        const total = lockState.ttl_seconds || (limitMins * 60);
        const elapsed = Math.max(0, total - remaining);
        const elapsedMins = Math.floor(elapsed / 60);

        lockStateRef.current = lockState;

        setState(prev => {
            const isWarning = elapsedMins >= warningMins && elapsedMins < limitMins;
            const isLimitReached = elapsedMins >= limitMins;
            const isPaused = lockState.state === 'paused';

            return {
                ...prev,
                elapsedMins,
                remainingMins: Math.max(0, limitMins - elapsedMins),
                isWarning,
                isLimitReached,
                isPaused,
                isSynced: true,
                lastSyncedAt: Date.now(),
            };
        });

        // Trigger callbacks
        if (isLimitReached && !lockStateRef.current?.state) {
            onLimitReached?.();
        } else if (isWarning && lockStateRef.current?.state !== 'warning') {
            onWarning?.();
        }
    }, [limitMins, warningMins, onWarning, onLimitReached]);

    // Local timer for smooth updates (fallback or supplement to Redis)
    useEffect(() => {
        if (state.isPaused || state.isLimitReached) return;

        const interval = setInterval(() => {
            setState(prev => {
                if (prev.isPaused || prev.isLimitReached) return prev;

                const newElapsed = prev.elapsedMins + 1;
                const newRemaining = Math.max(0, limitMins - newElapsed);
                const isWarning = newElapsed >= warningMins && newElapsed < limitMins;
                const isLimitReached = newElapsed >= limitMins;

                // Trigger callbacks on state change
                if (isWarning && !prev.isWarning) {
                    onWarning?.();
                }
                if (isLimitReached && !prev.isLimitReached) {
                    onLimitReached?.();
                }

                return {
                    ...prev,
                    elapsedMins: newElapsed,
                    remainingMins: newRemaining,
                    isWarning,
                    isLimitReached,
                };
            });
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [limitMins, warningMins, onWarning, onLimitReached, state.isPaused, state.isLimitReached]);

    // Sync with backend when enabled
    useEffect(() => {
        if (!syncWithBackend) return;

        const syncWithBackend = async () => {
            try {
                const lockState = await sessionApi.getLockState();
                calculateFromLockState(lockState);
            } catch (error) {
                console.error('Failed to sync with backend:', error);
            }
        };

        // Initial sync
        syncWithBackend();

        // Periodic sync every 30 seconds
        const syncInterval = setInterval(syncWithBackend, 30000);

        return () => clearInterval(syncInterval);
    }, [syncWithBackend, calculateFromLockState]);

    // Pause
    const pause = useCallback(async () => {
        setState(prev => ({ ...prev, isPaused: true }));
        
        if (syncWithBackend) {
            await sessionApi.pauseLock();
        }
    }, [syncWithBackend]);

    // Resume
    const resume = useCallback(async () => {
        setState(prev => ({ ...prev, isPaused: false }));
        
        if (syncWithBackend) {
            await sessionApi.resumeLock();
        }
    }, [syncWithBackend]);

    // Reset session
    const reset = useCallback(async () => {
        setState({
            elapsedMins: 0,
            remainingMins: limitMins,
            isWarning: false,
            isLimitReached: false,
            isPaused: false,
            isSynced: syncWithBackend,
            lastSyncedAt: syncWithBackend ? Date.now() : null,
        });

        if (syncWithBackend) {
            await sessionApi.startLock(limitMins);
        }
    }, [limitMins, syncWithBackend]);

    // Extend time (parent override)
    const extendTime = useCallback(async (extraMins: number) => {
        setState(prev => ({
            ...prev,
            remainingMins: prev.remainingMins + extraMins,
            isWarning: false,
            isLimitReached: false,
        }));

        if (syncWithBackend) {
            await sessionApi.extendLock(extraMins);
        }
    }, [syncWithBackend]);

    // Manual sync
    const syncNow = useCallback(async () => {
        if (!syncWithBackend) return;

        try {
            const lockState = await sessionApi.getLockState();
            calculateFromLockState(lockState);
        } catch (error) {
            console.error('Manual sync failed:', error);
        }
    }, [syncWithBackend, calculateFromLockState]);

    // Format remaining time
    const formatRemaining = useCallback(() => {
        const mins = state.remainingMins;
        return `${mins} min${mins !== 1 ? 's' : ''}`;
    }, [state.remainingMins]);

    return {
        ...state,
        pause,
        resume,
        reset,
        extendTime,
        formatRemaining,
        syncNow,
    };
};

export default useSessionTimer;
