// src/hooks/useSessionTimer.ts
// Session timer for parental time limits

import { useState, useEffect, useCallback } from 'react';

interface SessionTimerConfig {
    limitMins: number;
    warningMins: number;
    onWarning?: () => void;
    onLimitReached?: () => void;
}

interface SessionTimerState {
    elapsedMins: number;
    remainingMins: number;
    isWarning: boolean;
    isLimitReached: boolean;
    isPaused: boolean;
}

export const useSessionTimer = (config: SessionTimerConfig) => {
    const { limitMins = 30, warningMins = 25, onWarning, onLimitReached } = config;

    const [state, setState] = useState<SessionTimerState>({
        elapsedMins: 0,
        remainingMins: limitMins,
        isWarning: false,
        isLimitReached: false,
        isPaused: false,
    });

    // Start session timer
    useEffect(() => {
        if (state.isPaused || state.isLimitReached) return;

        const interval = setInterval(() => {
            setState((prev) => {
                const newElapsed = prev.elapsedMins + 1;
                const newRemaining = Math.max(0, limitMins - newElapsed);
                const isWarning = newElapsed >= warningMins && newElapsed < limitMins;
                const isLimitReached = newElapsed >= limitMins;

                // Trigger callbacks
                if (isWarning && !prev.isWarning) {
                    onWarning?.();
                }
                if (isLimitReached && !prev.isLimitReached) {
                    onLimitReached?.();
                }

                return {
                    elapsedMins: newElapsed,
                    remainingMins: newRemaining,
                    isWarning,
                    isLimitReached,
                    isPaused: prev.isPaused,
                };
            });
        }, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [limitMins, warningMins, onWarning, onLimitReached, state.isPaused, state.isLimitReached]);

    // Pause/resume
    const pause = useCallback(() => {
        setState((prev) => ({ ...prev, isPaused: true }));
    }, []);

    const resume = useCallback(() => {
        setState((prev) => ({ ...prev, isPaused: false }));
    }, []);

    // Reset session
    const reset = useCallback(() => {
        setState({
            elapsedMins: 0,
            remainingMins: limitMins,
            isWarning: false,
            isLimitReached: false,
            isPaused: false,
        });
    }, [limitMins]);

    // Extend time (parent override)
    const extendTime = useCallback((extraMins: number) => {
        setState((prev) => ({
            ...prev,
            remainingMins: prev.remainingMins + extraMins,
            isWarning: false,
            isLimitReached: false,
        }));
    }, []);

    return {
        ...state,
        pause,
        resume,
        reset,
        extendTime,
        formatRemaining: () => {
            const mins = state.remainingMins;
            return `${mins} min${mins !== 1 ? 's' : ''}`;
        },
    };
};

export default useSessionTimer;
