// frontend-web/src/runtime/ComboDetector.ts
import { getComboByTags, getCombosForTag } from '@/lib/combo';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';
import type { ComboDefinition, ComboResult } from '@/lib/combo/types';

export interface ComboDetectorConfig {
  enablePartialMatch: boolean;  // Allow combo with subset
  minTagsForCombo: number;     // Minimum tags to trigger combo check
}

const DEFAULT_CONFIG: ComboDetectorConfig = {
  enablePartialMatch: false,
  minTagsForCombo: 2,
};

export class ComboDetector {
  private config: ComboDetectorConfig;
  private lastCheckResult: ComboResult | null = null;

  constructor(config: Partial<ComboDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if current active markers form a valid combo
   */
  checkCombo(activeMarkerIds: string[]): ComboResult {
    if (activeMarkerIds.length < this.config.minTagsForCombo) {
      this.lastCheckResult = { found: false };
      return this.lastCheckResult;
    }

    const result = getComboByTags(activeMarkerIds);
    this.lastCheckResult = result;
    
    if (result.found) {
      console.log('🎯 Combo found:', result.combo?.name);
      
      // Update store
      const store = useDualDisplayStore.getState();
      store.setActiveCombo(result.combo!);
    } else {
      console.log('❌ No combo for markers:', activeMarkerIds);
    }
    
    return result;
  }

  /**
   * Get all possible combos for a single marker
   */
  getPossibleCombos(markerId: string): ComboDefinition[] {
    return getCombosForTag(markerId);
  }

  /**
   * Check if adding a new marker would create a combo
   */
  wouldCreateCombo(existingMarkers: string[], newMarkerId: string): ComboResult {
    const allMarkers = [...existingMarkers, newMarkerId];
    return this.checkCombo(allMarkers);
  }

  /**
   * Get combo status
   */
  getStatus(): { hasActiveCombo: boolean; comboName?: string } {
    const store = useDualDisplayStore.getState();
    return {
      hasActiveCombo: store.activeCombo !== null,
      comboName: store.activeCombo?.name,
    };
  }
}

// Export singleton
export const comboDetector = new ComboDetector();
