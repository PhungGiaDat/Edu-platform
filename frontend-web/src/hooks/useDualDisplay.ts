// frontend-web/src/hooks/useDualDisplay.ts
import { useEffect } from 'react';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';
import { dualDisplayManager } from '@/runtime/DualDisplayManager';

export function useDualDisplay() {
  const {
    displayMode,
    activeMarkers,
    activeCombo,
    comboPosition,
    setDisplayMode,
    addMarker,
    removeMarker,
    clearMarkers,
    setActiveCombo,
    setComboPosition,
    reset,
  } = useDualDisplayStore();

  // Initialize manager on mount
  useEffect(() => {
    dualDisplayManager.init();
    
    return () => {
      dualDisplayManager.destroy();
    };
  }, []);

  return {
    // State
    displayMode,
    activeMarkers,
    activeCombo,
    comboPosition,
    
    // Computed
    isIdle: displayMode === 'idle',
    isSingle: displayMode === 'single',
    isDual: displayMode === 'dual',
    isCombo: displayMode === 'combo',
    markerCount: activeMarkers.length,
    
    // Actions
    setDisplayMode,
    addMarker,
    removeMarker,
    clearMarkers,
    setActiveCombo,
    setComboPosition,
    reset,
    
    // Manager methods
    getDisplayInfo: () => dualDisplayManager.getDisplayInfo(),
  };
}
