# AR State Machine Skill

## Overview
This skill provides patterns and implementations for managing AR experience lifecycles using state machine architecture. Learn how to build robust state management for marker tracking, handle state transitions, create React hooks for AR states, and implement persistence patterns.

## When to Use This Skill
- Building AR experiences with complex interaction flows
- Managing marker detection lifecycle (idle, scanning, detected, tracking, lost)
- Creating React hooks for AR state management
- Implementing state persistence across sessions
- Handling error recovery and state cleanup
- Coordinating state across multiple markers

## Prerequisites
- Completion of `mindar-integration` skill (MindAR setup basics)
- Understanding of finite state machines (FSM) concepts
- React hooks knowledge (useState, useEffect, useReducer)
- Familiarity with event-driven architecture

## Core Concepts

### AR State Lifecycle
AR experiences follow a predictable state progression:

```
IDLE → SCANNING → DETECTED → TRACKING → LOST → (IDLE or TRACKING)
  ↓                                        ↓
ERROR ←──────────────────────────────────┘
```

**State Definitions:**
- **IDLE**: AR system initialized but not actively scanning
- **SCANNING**: Camera active, searching for markers
- **DETECTED**: Marker first recognized (transition state)
- **TRACKING**: Actively tracking marker with stable position
- **LOST**: Marker was tracking but lost from view
- **ERROR**: Critical failure (camera access denied, initialization failed)

### Why State Machines for AR?

**Benefits:**
1. **Predictable Transitions**: Clear rules for moving between states
2. **Error Recovery**: Well-defined paths back to stable states
3. **UI Synchronization**: React components update based on state changes
4. **Debugging**: Easy to trace state history and identify issues
5. **Multi-Marker Coordination**: Each marker has independent state machine

**Common Pitfalls Without State Management:**
- Race conditions between marker events
- UI flickering during rapid detection/loss cycles
- Memory leaks from unhandled event listeners
- Inconsistent behavior after errors
- Lost context when switching between markers

## Implementation Patterns

### Pattern 1: Basic Marker State Machine

#### State Type Definition
```typescript
// src/types/ar-state.ts
export type MarkerState = 
  | 'idle' 
  | 'scanning' 
  | 'detected' 
  | 'tracking' 
  | 'lost' 
  | 'error';

export interface MarkerStateData {
  markerId: string;
  state: MarkerState;
  timestamp: number;
  lastSeen?: number;
  trackingDuration?: number;
  errorMessage?: string;
}

export type StateTransition = {
  from: MarkerState;
  to: MarkerState;
  trigger: string;
  timestamp: number;
};
```

#### State Machine Implementation
```typescript
// src/lib/ar-state-machine.ts
export class MarkerStateMachine {
  private state: MarkerState = 'idle';
  private markerId: string;
  private stateHistory: StateTransition[] = [];
  private listeners: Map<MarkerState, Set<(data: MarkerStateData) => void>> = new Map();

  constructor(markerId: string) {
    this.markerId = markerId;
  }

  // Get current state
  getState(): MarkerState {
    return this.state;
  }

  // Transition to new state with validation
  transition(to: MarkerState, trigger: string): boolean {
    const from = this.state;

    // Validate transition
    if (!this.isValidTransition(from, to)) {
      console.warn(`Invalid transition: ${from} → ${to}`);
      return false;
    }

    // Record transition
    this.stateHistory.push({
      from,
      to,
      trigger,
      timestamp: Date.now()
    });

    // Update state
    this.state = to;

    // Notify listeners
    this.notifyListeners(to);

    return true;
  }

  // Validate state transition rules
  private isValidTransition(from: MarkerState, to: MarkerState): boolean {
    const validTransitions: Record<MarkerState, MarkerState[]> = {
      idle: ['scanning', 'error'],
      scanning: ['detected', 'idle', 'error'],
      detected: ['tracking', 'lost', 'error'],
      tracking: ['lost', 'tracking', 'error'],
      lost: ['scanning', 'detected', 'tracking', 'idle'],
      error: ['idle', 'scanning']
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  // Subscribe to state changes
  on(state: MarkerState, callback: (data: MarkerStateData) => void) {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, new Set());
    }
    this.listeners.get(state)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(state)?.delete(callback);
    };
  }

  // Notify listeners of state change
  private notifyListeners(state: MarkerState) {
    const stateData: MarkerStateData = {
      markerId: this.markerId,
      state,
      timestamp: Date.now()
    };

    this.listeners.get(state)?.forEach(callback => {
      callback(stateData);
    });
  }

  // Get state history for debugging
  getHistory(): StateTransition[] {
    return [...this.stateHistory];
  }

  // Reset to initial state
  reset() {
    this.transition('idle', 'reset');
    this.stateHistory = [];
  }
}
```

### Pattern 2: React Hook for Marker State

#### useMarkerState Hook
```typescript
// src/hooks/useMarkerState.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { MarkerStateMachine } from '../lib/ar-state-machine';
import type { MarkerState, MarkerStateData } from '../types/ar-state';

interface UseMarkerStateOptions {
  markerId: string;
  autoStart?: boolean;
  onStateChange?: (state: MarkerState) => void;
}

export function useMarkerState({ 
  markerId, 
  autoStart = true,
  onStateChange 
}: UseMarkerStateOptions) {
  const [currentState, setCurrentState] = useState<MarkerState>('idle');
  const [stateData, setStateData] = useState<MarkerStateData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  
  const stateMachineRef = useRef<MarkerStateMachine | null>(null);

  // Initialize state machine
  useEffect(() => {
    stateMachineRef.current = new MarkerStateMachine(markerId);

    if (autoStart) {
      stateMachineRef.current.transition('scanning', 'auto-start');
    }

    return () => {
      stateMachineRef.current?.reset();
      stateMachineRef.current = null;
    };
  }, [markerId, autoStart]);

  // Listen to AR events and trigger state transitions
  useEffect(() => {
    const handleMarkerFound = (event: CustomEvent) => {
      if (event.detail.markerId === markerId) {
        stateMachineRef.current?.transition('detected', 'marker-found');
        
        // Transition to tracking after brief detected state
        setTimeout(() => {
          stateMachineRef.current?.transition('tracking', 'stabilized');
        }, 300);
      }
    };

    const handleMarkerLost = (event: CustomEvent) => {
      if (event.detail.markerId === markerId) {
        stateMachineRef.current?.transition('lost', 'marker-lost');
        
        // Return to scanning after brief lost state
        setTimeout(() => {
          stateMachineRef.current?.transition('scanning', 'resume-scan');
        }, 1000);
      }
    };

    const handleARError = (event: CustomEvent) => {
      stateMachineRef.current?.transition('error', 'ar-error');
    };

    window.addEventListener('ar:markerFound', handleMarkerFound as EventListener);
    window.addEventListener('ar:markerLost', handleMarkerLost as EventListener);
    window.addEventListener('ar:error', handleARError as EventListener);

    return () => {
      window.removeEventListener('ar:markerFound', handleMarkerFound as EventListener);
      window.removeEventListener('ar:markerLost', handleMarkerLost as EventListener);
      window.removeEventListener('ar:error', handleARError as EventListener);
    };
  }, [markerId]);

  // Subscribe to all state changes
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const states: MarkerState[] = ['idle', 'scanning', 'detected', 'tracking', 'lost', 'error'];
    
    states.forEach(state => {
      const unsubscribe = stateMachineRef.current?.on(state, (data) => {
        setCurrentState(data.state);
        setStateData(data);
        setIsTracking(data.state === 'tracking' || data.state === 'detected');
        onStateChange?.(data.state);
      });
      
      if (unsubscribe) {
        unsubscribes.push(unsubscribe);
      }
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [onStateChange]);

  // Manual state control functions
  const startScanning = useCallback(() => {
    stateMachineRef.current?.transition('scanning', 'manual-start');
  }, []);

  const stopScanning = useCallback(() => {
    stateMachineRef.current?.transition('idle', 'manual-stop');
  }, []);

  const reset = useCallback(() => {
    stateMachineRef.current?.reset();
  }, []);

  return {
    state: currentState,
    stateData,
    isTracking,
    isScanning: currentState === 'scanning',
    isDetected: currentState === 'detected',
    isLost: currentState === 'lost',
    isError: currentState === 'error',
    isIdle: currentState === 'idle',
    startScanning,
    stopScanning,
    reset,
    getHistory: () => stateMachineRef.current?.getHistory() ?? []
  };
}
```

#### Usage Example
```typescript
// src/components/ARFlashcard.tsx
import { useMarkerState } from '../hooks/useMarkerState';

export function ARFlashcard({ flashcardId }: { flashcardId: string }) {
  const { 
    state, 
    isTracking, 
    isScanning,
    startScanning, 
    stopScanning 
  } = useMarkerState({
    markerId: flashcardId,
    autoStart: true,
    onStateChange: (newState) => {
      console.log(`Flashcard ${flashcardId} state:`, newState);
    }
  });

  return (
    <div className="ar-flashcard">
      {/* State-dependent UI */}
      {state === 'scanning' && (
        <div className="scanning-overlay">
          <p>Scanning for flashcard...</p>
          <button onClick={stopScanning}>Stop</button>
        </div>
      )}
      
      {isTracking && (
        <div className="flashcard-content">
          <h2>Flashcard Detected!</h2>
          <p>Marker ID: {flashcardId}</p>
        </div>
      )}
      
      {state === 'lost' && (
        <div className="lost-overlay">
          <p>Marker lost - please keep card in view</p>
        </div>
      )}
      
      {state === 'error' && (
        <div className="error-overlay">
          <p>AR Error - please check camera permissions</p>
          <button onClick={startScanning}>Retry</button>
        </div>
      )}
      
      {state === 'idle' && (
        <div className="idle-overlay">
          <button onClick={startScanning}>Start AR</button>
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Global AR State Management (useReducer)

#### State Reducer Implementation
```typescript
// src/reducers/ar-reducer.ts
import type { MarkerState } from '../types/ar-state';

export interface ARGlobalState {
  markers: Record<string, {
    state: MarkerState;
    lastSeen: number | null;
    trackingDuration: number;
  }>;
  activeMarkerId: string | null;
  isARReady: boolean;
  error: string | null;
}

export type ARAction =
  | { type: 'AR_READY' }
  | { type: 'AR_ERROR'; payload: string }
  | { type: 'MARKER_STATE_CHANGE'; payload: { markerId: string; state: MarkerState } }
  | { type: 'SET_ACTIVE_MARKER'; payload: string | null }
  | { type: 'UPDATE_TRACKING_DURATION'; payload: { markerId: string; duration: number } }
  | { type: 'RESET' };

export const initialARState: ARGlobalState = {
  markers: {},
  activeMarkerId: null,
  isARReady: false,
  error: null
};

export function arReducer(state: ARGlobalState, action: ARAction): ARGlobalState {
  switch (action.type) {
    case 'AR_READY':
      return { ...state, isARReady: true, error: null };

    case 'AR_ERROR':
      return { ...state, isARReady: false, error: action.payload };

    case 'MARKER_STATE_CHANGE':
      const { markerId, state: markerState } = action.payload;
      return {
        ...state,
        markers: {
          ...state.markers,
          [markerId]: {
            ...state.markers[markerId],
            state: markerState,
            lastSeen: markerState === 'tracking' ? Date.now() : state.markers[markerId]?.lastSeen ?? null
          }
        },
        // Auto-set active marker when tracking starts
        activeMarkerId: markerState === 'tracking' ? markerId : state.activeMarkerId
      };

    case 'SET_ACTIVE_MARKER':
      return { ...state, activeMarkerId: action.payload };

    case 'UPDATE_TRACKING_DURATION':
      return {
        ...state,
        markers: {
          ...state.markers,
          [action.payload.markerId]: {
            ...state.markers[action.payload.markerId],
            trackingDuration: action.payload.duration
          }
        }
      };

    case 'RESET':
      return initialARState;

    default:
      return state;
  }
}
```

#### Global AR State Provider
```typescript
// src/providers/ARStateProvider.tsx
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { arReducer, initialARState, ARGlobalState, ARAction } from '../reducers/ar-reducer';

interface ARStateContextValue {
  state: ARGlobalState;
  dispatch: React.Dispatch<ARAction>;
}

const ARStateContext = createContext<ARStateContextValue | null>(null);

export function ARStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(arReducer, initialARState);

  // Listen to global AR events
  useEffect(() => {
    const handleARReady = () => {
      dispatch({ type: 'AR_READY' });
    };

    const handleARError = (event: CustomEvent) => {
      dispatch({ type: 'AR_ERROR', payload: event.detail.message || 'Unknown AR error' });
    };

    const handleMarkerFound = (event: CustomEvent) => {
      dispatch({
        type: 'MARKER_STATE_CHANGE',
        payload: { markerId: event.detail.markerId, state: 'tracking' }
      });
    };

    const handleMarkerLost = (event: CustomEvent) => {
      dispatch({
        type: 'MARKER_STATE_CHANGE',
        payload: { markerId: event.detail.markerId, state: 'lost' }
      });
    };

    window.addEventListener('ar:ready', handleARReady as EventListener);
    window.addEventListener('ar:error', handleARError as EventListener);
    window.addEventListener('ar:markerFound', handleMarkerFound as EventListener);
    window.addEventListener('ar:markerLost', handleMarkerLost as EventListener);

    return () => {
      window.removeEventListener('ar:ready', handleARReady as EventListener);
      window.removeEventListener('ar:error', handleARError as EventListener);
      window.removeEventListener('ar:markerFound', handleMarkerFound as EventListener);
      window.removeEventListener('ar:markerLost', handleMarkerLost as EventListener);
    };
  }, []);

  return (
    <ARStateContext.Provider value={{ state, dispatch }}>
      {children}
    </ARStateContext.Provider>
  );
}

// Custom hook to use AR state
export function useARContext() {
  const context = useContext(ARStateContext);
  if (!context) {
    throw new Error('useARContext must be used within ARStateProvider');
  }
  return context;
}
```

### Pattern 4: State Persistence

#### Local Storage Persistence
```typescript
// src/lib/ar-persistence.ts
import type { MarkerStateData } from '../types/ar-state';

const STORAGE_KEY = 'ar-state-history';
const MAX_HISTORY_SIZE = 100;

export interface PersistedARState {
  sessionId: string;
  timestamp: number;
  markers: MarkerStateData[];
}

export class ARStatePersistence {
  // Save current state to localStorage
  static saveState(markers: MarkerStateData[]) {
    try {
      const history = this.loadHistory();
      
      const newState: PersistedARState = {
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        markers
      };

      history.unshift(newState);
      
      // Limit history size
      const trimmedHistory = history.slice(0, MAX_HISTORY_SIZE);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to save AR state:', error);
    }
  }

  // Load state history from localStorage
  static loadHistory(): PersistedARState[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load AR state:', error);
      return [];
    }
  }

  // Get most recent state
  static loadLastState(): PersistedARState | null {
    const history = this.loadHistory();
    return history[0] || null;
  }

  // Clear all persisted state
  static clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Generate or retrieve session ID
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('ar-session-id');
    
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('ar-session-id', sessionId);
    }
    
    return sessionId;
  }

  // Get statistics from history
  static getStats() {
    const history = this.loadHistory();
    
    const markerStats: Record<string, {
      totalDetections: number;
      totalTrackingTime: number;
      lastSeen: number;
    }> = {};

    history.forEach(state => {
      state.markers.forEach(marker => {
        if (!markerStats[marker.markerId]) {
          markerStats[marker.markerId] = {
            totalDetections: 0,
            totalTrackingTime: 0,
            lastSeen: 0
          };
        }

        if (marker.state === 'tracking') {
          markerStats[marker.markerId].totalDetections++;
          markerStats[marker.markerId].totalTrackingTime += marker.trackingDuration || 0;
          markerStats[marker.markerId].lastSeen = Math.max(
            markerStats[marker.markerId].lastSeen,
            marker.timestamp
          );
        }
      });
    });

    return markerStats;
  }
}
```

#### Usage with useMarkerState
```typescript
// src/hooks/useMarkerState.ts (extended with persistence)
export function useMarkerState({ markerId, persistState = true }: UseMarkerStateOptions) {
  // ... previous hook code ...

  // Persist state on changes
  useEffect(() => {
    if (persistState && stateData) {
      ARStatePersistence.saveState([stateData]);
    }
  }, [stateData, persistState]);

  // Load persisted state on mount
  useEffect(() => {
    if (persistState) {
      const lastState = ARStatePersistence.loadLastState();
      const markerData = lastState?.markers.find(m => m.markerId === markerId);
      
      if (markerData) {
        console.log(`Restored state for ${markerId}:`, markerData);
      }
    }
  }, [markerId, persistState]);

  // ... rest of hook ...
}
```

## Best Practices

### State Transition Rules
1. **Validate Transitions**: Always validate state changes are valid
2. **Debounce Rapid Changes**: Add delays between detected→tracking and lost→scanning
3. **Cleanup on Unmount**: Reset state machines when components unmount
4. **Error Recovery Paths**: Always provide path from error back to operational state
5. **History Tracking**: Keep transition history for debugging

### Performance Optimization
1. **Memoize Callbacks**: Use `useCallback` for state change handlers
2. **Limit History Size**: Cap state history to prevent memory growth
3. **Throttle Persistence**: Don't save to localStorage on every state change
4. **Selective Re-renders**: Only update components when relevant state changes

### Debugging State Issues
```typescript
// Enable state machine logging
const DEBUG_AR_STATE = true;

if (DEBUG_AR_STATE) {
  stateMachine.on('*', (state) => {
    console.log(`[AR State] ${markerId}:`, state);
    console.log('History:', stateMachine.getHistory());
  });
}
```

## Troubleshooting

### States Stuck or Not Transitioning
- Check transition validation logic
- Verify event listeners are properly attached
- Confirm events are being fired from AR engine
- Add logging to trace state changes

### Memory Leaks from State Listeners
- Always return cleanup functions from useEffect
- Unsubscribe from state machine listeners on unmount
- Clear event listeners when marker IDs change

### State Desync Between UI and AR Engine
- Use event-driven architecture (see `event-driven-ar` skill)
- Don't rely on polling - use events for state updates
- Ensure single source of truth (state machine)

## Additional Resources

- **XState Library**: https://xstate.js.org/ (advanced state machine library)
- **React Reducer Pattern**: https://react.dev/reference/react/useReducer
- **Finite State Machines**: https://kentcdodds.com/blog/implementing-a-simple-state-machine-library-in-javascript

---

**Next Steps:**
- Load `event-driven-ar` skill for connecting state machine to AR events
- Load `multi-target-tracking` skill for managing multiple marker state machines
- Explore XState for more complex state orchestration needs
