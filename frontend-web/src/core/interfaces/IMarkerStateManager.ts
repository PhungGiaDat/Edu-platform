// src/core/interfaces/IMarkerStateManager.ts
import type { ARCombo } from '@/types';

export interface IMarkerStateManager {
  /**
   * Mark a marker as found
   */
  markFound(markerId: string): void;
  
  /**
   * Mark a marker as lost
   */
  markLost(markerId: string): void;
  
  /**
   * Check if a marker is currently found
   */
  isMarkerFound(markerId: string): boolean;
  
  /**
   * Get all currently found markers
   */
  getFoundMarkers(): Set<string>;
  
  /**
   * Check if combo is active
   */
  isComboActive(): boolean;
  
  /**
   * Set combo configuration
   */
  setCombo(combo: ARCombo | null): void;
  
  /**
   * Get current combo
   */
  getCombo(): ARCombo | null;
  
  /**
   * Reset all marker states
   */
  reset(): void;
}