# Task 2: Create Zustand Stores

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\src`

## Task Overview
Create Zustand state management stores for the Dual-Display AR Combo System:
- `stores/dualDisplay.store.ts` - Multi-marker state (active markers, display mode, combo info)
- `stores/markerHealth.store.ts` - Per-marker tracking health (FPS, errors, load attempts)

## Global Constraints
- Uses Zustand for state management
- Must work with React hooks
- TypeScript strict mode

## Files to Create

### 1. `frontend-web/src/stores/dualDisplay.store.ts`
```typescript
// frontend-web/src/stores/dualDisplay.store.ts
import { create } from 'zustand';
import type { ComboDefinition } from '@/lib/combo/types';

export type DisplayMode = 'idle' | 'single' | 'dual' | 'combo';

interface DualDisplayState {
  displayMode: DisplayMode;
  activeMarkers: string[];           // Currently visible markers
  activeCombo: ComboDefinition | null;
  comboPosition: { x: number; y: number; z: number } | null;
  
  // Actions
  setDisplayMode: (mode: DisplayMode) => void;
  addMarker: (markerId: string) => void;
  removeMarker: (markerId: string) => void;
  clearMarkers: () => void;
  setActiveCombo: (combo: ComboDefinition | null) => void;
  setComboPosition: (pos: { x: number; y: number; z: number } | null) => void;
  reset: () => void;
}

const initialState = {
  displayMode: 'idle' as DisplayMode,
  activeMarkers: [],
  activeCombo: null,
  comboPosition: null,
};

export const useDualDisplayStore = create<DualDisplayState>((set) => ({
  ...initialState,
  
  setDisplayMode: (mode) => set({ displayMode: mode }),
  
  addMarker: (markerId) => set((state) => ({
    activeMarkers: state.activeMarkers.includes(markerId) 
      ? state.activeMarkers 
      : [...state.activeMarkers, markerId]
  })),
  
  removeMarker: (markerId) => set((state) => ({
    activeMarkers: state.activeMarkers.filter(id => id !== markerId)
  })),
  
  clearMarkers: () => set({ activeMarkers: [], displayMode: 'idle' }),
  
  setActiveCombo: (combo) => set({ 
    activeCombo: combo,
    displayMode: combo ? 'combo' : 'dual'
  }),
  
  setComboPosition: (pos) => set({ comboPosition: pos }),
  
  reset: () => set(initialState),
}));
```

### 2. `frontend-web/src/stores/markerHealth.store.ts`
```typescript
// frontend-web/src/stores/markerHealth.store.ts
import { create } from 'zustand';

interface MarkerHealth {
  markerId: string;
  fps: number;
  isTracking: boolean;
  lastSeen: number;      // timestamp
  loadAttempts: number;
  modelLoadTime: number;  // ms
  hasError: boolean;
  errorMessage?: string;
}

interface MarkerHealthState {
  markers: Map<string, MarkerHealth>;
  
  // Actions
  initMarker: (markerId: string) => void;
  updateFPS: (markerId: string, fps: number) => void;
  setTracking: (markerId: string, isTracking: boolean) => void;
  recordLoadAttempt: (markerId: string, loadTime: number) => void;
  setError: (markerId: string, error: string) => void;
  clearError: (markerId: string) => void;
  removeMarker: (markerId: string) => void;
  getUnhealthyMarkers: () => MarkerHealth[];
  reset: () => void;
}

export const useMarkerHealthStore = create<MarkerHealthState>((set, get) => ({
  markers: new Map(),
  
  initMarker: (markerId) => set((state) => {
    const newMarkers = new Map(state.markers);
    if (!newMarkers.has(markerId)) {
      newMarkers.set(markerId, {
        markerId,
        fps: 0,
        isTracking: false,
        lastSeen: Date.now(),
        loadAttempts: 0,
        modelLoadTime: 0,
        hasError: false,
      });
    }
    return { markers: newMarkers };
  }),
  
  updateFPS: (markerId, fps) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, fps, lastSeen: Date.now() });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  setTracking: (markerId, isTracking) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, isTracking, lastSeen: Date.now() });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  recordLoadAttempt: (markerId, loadTime) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { 
        ...marker, 
        loadAttempts: marker.loadAttempts + 1,
        modelLoadTime: loadTime,
      });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  setError: (markerId, error) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, hasError: true, errorMessage: error });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  clearError: (markerId) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, hasError: false, errorMessage: undefined });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  removeMarker: (markerId) => set((state) => {
    const newMarkers = new Map(state.markers);
    newMarkers.delete(markerId);
    return { markers: newMarkers };
  }),
  
  getUnhealthyMarkers: () => {
    const state = get();
    const unhealthy: MarkerHealth[] = [];
    
    state.markers.forEach((marker) => {
      // Unhealthy if: low FPS OR too many load attempts OR has error
      if (marker.fps < 15 || marker.loadAttempts > 3 || marker.hasError) {
        unhealthy.push(marker);
      }
    });
    
    return unhealthy;
  },
  
  reset: () => set({ markers: new Map() }),
}));
```

## Steps
1. Create `stores/dualDisplay.store.ts`
2. Create `stores/markerHealth.store.ts`
3. Run TypeScript compilation to verify no errors

## Dependencies
- Imports from `@/lib/combo/types` - make sure Task 1 is complete

## Output
- Status: DONE when all files created and TypeScript compiles
- Report file: `report/task-2-report.md`
