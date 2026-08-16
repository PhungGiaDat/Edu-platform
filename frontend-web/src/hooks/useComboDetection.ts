// frontend-web/src/hooks/useComboDetection.ts
import { useCallback } from 'react';
import { comboDetector } from '@/runtime/ComboDetector';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';
import { COMBO_DB } from '@/lib/combo';
import type { ComboDefinition } from '@/lib/combo/types';

export function useComboDetection() {
  const { activeMarkers, activeCombo } = useDualDisplayStore();

  const checkCombo = useCallback(() => {
    return comboDetector.checkCombo(activeMarkers);
  }, [activeMarkers]);

  const getPossibleCombos = useCallback((markerId: string) => {
    return comboDetector.getPossibleCombos(markerId);
  }, []);

  const wouldCreateCombo = useCallback((existingMarkers: string[], newMarkerId: string) => {
    return comboDetector.wouldCreateCombo(existingMarkers, newMarkerId);
  }, []);

  const getStatus = useCallback(() => {
    return comboDetector.getStatus();
  }, []);

  const getAllCombos = useCallback((): ComboDefinition[] => {
    return COMBO_DB;
  }, []);

  return {
    // State
    hasActiveCombo: activeCombo !== null,
    activeCombo,
    activeMarkerCount: activeMarkers.length,
    
    // Methods
    checkCombo,
    getPossibleCombos,
    wouldCreateCombo,
    getStatus,
    getAllCombos,
  };
}
