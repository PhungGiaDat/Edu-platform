import { create } from 'zustand';

interface MarkerHealth {
  markerId: string;
  fps: number;
  isTracking: boolean;
  lastSeen: number;
  loadAttempts: number;
  modelLoadTime: number;
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
      if (marker.fps < 15 || marker.loadAttempts > 3 || marker.hasError) {
        unhealthy.push(marker);
      }
    });
    
    return unhealthy;
  },
  
  reset: () => set({ markers: new Map() }),
}));
