// frontend-web/src/context/SessionContext.tsx
/**
 * Session Context
 * Global session and app lock state management with Redis backend.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import sessionApi, { LockState, SessionData } from '../services/sessionApi';

interface SessionContextValue {
    // Lock state
    lockState: LockState | null;
    isLocked: boolean;
    isWarning: boolean;
    remainingSeconds: number;
    
    // Session state
    session: SessionData | null;
    isAuthenticated: boolean;
    
    // Actions
    startSession: (ttlMinutes?: number) => Promise<void>;
    endSession: () => Promise<void>;
    pauseLock: () => Promise<void>;
    resumeLock: () => Promise<void>;
    extendLock: (minutes: number) => Promise<void>;
    recordActivity: () => Promise<void>;
    
    // Loading states
    isLoading: boolean;
    error: string | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface SessionProviderProps {
    children: React.ReactNode;
    autoStart?: boolean;
    defaultTtlMinutes?: number;
    syncIntervalMs?: number;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
    children,
    autoStart = false,
    defaultTtlMinutes = 30,
    syncIntervalMs = 30000,
}) => {
    const [lockState, setLockState] = useState<LockState | null>(null);
    const [session, setSession] = useState<SessionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const syncIntervalRef = useRef<number | null>(null);

    // Derived states
    const isLocked = lockState?.state === 'locked' || lockState?.remaining_seconds === 0;
    const isWarning = lockState?.state === 'warning' || 
        (lockState?.remaining_seconds ?? Infinity) <= 5 * 60;
    const remainingSeconds = lockState?.remaining_seconds ?? 0;
    const isAuthenticated = !!session;

    // Sync lock state from backend
    const syncLockState = useCallback(async () => {
        try {
            const state = await sessionApi.getLockState();
            setLockState(state);
            setError(null);
        } catch (err) {
            console.error('Failed to sync lock state:', err);
            setError('Failed to sync session state');
        }
    }, []);

    // Start session/lock
    const startSession = useCallback(async (ttlMinutes?: number) => {
        setIsLoading(true);
        setError(null);
        
        try {
            const state = await sessionApi.startLock(ttlMinutes || defaultTtlMinutes);
            setLockState(state);
        } catch (err) {
            console.error('Failed to start session:', err);
            setError('Failed to start session');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [defaultTtlMinutes]);

    // End session
    const endSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            await sessionApi.unlock();
            setLockState(null);
            setSession(null);
        } catch (err) {
            console.error('Failed to end session:', err);
            setError('Failed to end session');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Pause lock
    const pauseLock = useCallback(async () => {
        try {
            await sessionApi.pauseLock();
            await syncLockState();
        } catch (err) {
            console.error('Failed to pause lock:', err);
            setError('Failed to pause session');
        }
    }, [syncLockState]);

    // Resume lock
    const resumeLock = useCallback(async () => {
        try {
            await sessionApi.resumeLock();
            await syncLockState();
        } catch (err) {
            console.error('Failed to resume lock:', err);
            setError('Failed to resume session');
        }
    }, [syncLockState]);

    // Extend lock (parent override)
    const extendLock = useCallback(async (minutes: number) => {
        try {
            const newState = await sessionApi.extendLock(minutes);
            if (newState) {
                setLockState(newState);
            }
        } catch (err) {
            console.error('Failed to extend lock:', err);
            setError('Failed to extend session time');
        }
    }, []);

    // Record activity
    const recordActivity = useCallback(async () => {
        try {
            await sessionApi.recordActivity();
        } catch (err) {
            console.error('Failed to record activity:', err);
        }
    }, []);

    // Initialize
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            
            try {
                // Check for existing lock state
                const existingState = await sessionApi.getLockState();
                
                if (existingState) {
                    setLockState(existingState);
                } else if (autoStart) {
                    // Start new session if autoStart is enabled
                    await startSession();
                }
            } catch (err) {
                console.error('Failed to initialize session:', err);
                setError('Failed to initialize session');
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [autoStart, startSession]);

    // Periodic sync
    useEffect(() => {
        if (syncIntervalMs > 0) {
            syncIntervalRef.current = window.setInterval(syncLockState, syncIntervalMs);
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [syncLockState, syncIntervalMs]);

    const value: SessionContextValue = {
        lockState,
        isLocked,
        isWarning,
        remainingSeconds,
        session,
        isAuthenticated,
        startSession,
        endSession,
        pauseLock,
        resumeLock,
        extendLock,
        recordActivity,
        isLoading,
        error,
    };

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = (): SessionContextValue => {
    const context = useContext(SessionContext);
    
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    
    return context;
};

export default SessionContext;
