// src/runtime/MarkerStateManager.ts
import type { IMarkerStateManager } from '@/core/interfaces/IMarkerStateManager';
import type { IEventBus } from '@/core/interfaces/IEventBus';
import type { ARCombo } from '@/types';
import { AREvent } from '@/core/types/AREvents';

/**
 * MarkerStateManager Implementation - Singleton Pattern
 * Quản lý trạng thái markers và combo logic
 */
class MarkerStateManager implements IMarkerStateManager {
  private foundMarkers: Set<string> = new Set();
  private combo: ARCombo | null = null;
  private eventBus: IEventBus | null = null;
  private comboActive: boolean = false;

  /**
   * Set EventBus dependency
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Mark a marker as found
   */
  markFound(markerId: string): void {
    if (this.foundMarkers.has(markerId)) {
      return; // Already found
    }

    this.foundMarkers.add(markerId);
    console.log('✅ Marker found:', markerId, 'Total:', this.foundMarkers.size);

    // Check combo activation
    this.checkComboActivation();
  }

  /**
   * Mark a marker as lost
   */
  markLost(markerId: string): void {
    if (!this.foundMarkers.has(markerId)) {
      return; // Already lost
    }

    this.foundMarkers.delete(markerId);
    console.log('❌ Marker lost:', markerId, 'Total:', this.foundMarkers.size);

    // Check combo deactivation
    this.checkComboDeactivation();
  }

  /**
   * Check if a marker is currently found
   */
  isMarkerFound(markerId: string): boolean {
    return this.foundMarkers.has(markerId);
  }

  /**
   * Get all currently found markers
   */
  getFoundMarkers(): Set<string> {
    return new Set(this.foundMarkers); // Return copy
  }

  /**
   * Check if combo is active
   */
  isComboActive(): boolean {
    return this.comboActive;
  }

  /**
   * Set combo configuration
   */
  setCombo(combo: ARCombo | null): void {
    this.combo = combo;
    console.log('🎯 Combo set:', combo?.combo_id || 'null');

    // Re-check combo state
    if (combo) {
      this.checkComboActivation();
    } else {
      this.checkComboDeactivation();
    }
  }

  /**
   * Get current combo
   */
  getCombo(): ARCombo | null {
    return this.combo;
  }

  /**
   * Reset all marker states
   */
  reset(): void {
    this.foundMarkers.clear();
    this.comboActive = false;
    console.log('🔄 MarkerStateManager reset');
  }

  /**
   * Check if combo should be activated
   */
  private checkComboActivation(): void {
    if (!this.combo || this.comboActive) {
      return;
    }

    const requiredTags = this.combo.required_tags;
    const allFound = requiredTags.every(tag => this.foundMarkers.has(tag));

    if (allFound) {
      this.comboActive = true;
      console.log('🎉 COMBO ACTIVATED:', this.combo.combo_id);

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit(AREvent.COMBO_ACTIVATED, {
          combo: this.combo,
          anchorMarkerId: requiredTags[0] // First marker as anchor
        });
      }
    }
  }

  /**
   * Check if combo should be deactivated
   */
  private checkComboDeactivation(): void {
    if (!this.combo || !this.comboActive) {
      return;
    }

    const requiredTags = this.combo.required_tags;
    const anyLost = requiredTags.some(tag => !this.foundMarkers.has(tag));

    if (anyLost) {
      this.comboActive = false;
      console.log('💔 COMBO DEACTIVATED:', this.combo.combo_id);

      // Emit event
      if (this.eventBus) {
        this.eventBus.emit(AREvent.COMBO_DEACTIVATED, {
          combo: this.combo
        });
      }
    }
  }
}

/**
 * Export singleton instance
 */
export const markerStateManager = new MarkerStateManager();

/**
 * Export class for testing
 */
export { MarkerStateManager };