import { create } from 'zustand';
import type { ComboDefinition } from '@/lib/combo/types';

export type DisplayMode = 'idle' | 'single' | 'dual' | 'combo';

interface DualDisplayState {
  displayMode: DisplayMode;
  activeMarkers: string[];
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
