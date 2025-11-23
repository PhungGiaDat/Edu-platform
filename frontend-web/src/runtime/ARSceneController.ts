// src/runtime/ARSceneController.ts
import type { IARSceneController } from '@/core/interfaces/IARScenceController';
import type { IEventBus } from '@/core/interfaces/IEventBus';
import type { IMarkerStateManager } from '@/core/interfaces/IMarkerStateManager';
import type { ARTarget, ARCombo } from '@/types';
import { AREvent } from '@/core/types/AREvents';

/**
 * AR Scene Controller - Simplified
 * High-level orchestrator for AR scene configuration
 */
class ARSceneController implements IARSceneController {
  private eventBus: IEventBus;
  private markerStateManager: IMarkerStateManager;
  private targets: ARTarget[] = [];
  private combo: ARCombo | null = null;
  private displayMode: '2D' | '3D' = '2D';

  constructor(eventBus: IEventBus, markerStateManager: IMarkerStateManager) {
    this.eventBus = eventBus;
    this.markerStateManager = markerStateManager;
  }

  /**
   * Initialize (kept for interface compatibility)
   */
  init(eventBus: IEventBus, markerStateManager: IMarkerStateManager): void {
    this.eventBus = eventBus;
    this.markerStateManager = markerStateManager;
    console.log('🎮 ARSceneController initialized');
  }

  /**
   * Setup scene with targets and combo
   */
  setupScene(targets: ARTarget[], combo: ARCombo | null): void {
    this.targets = targets;
    this.combo = combo;

    // Configure marker state manager
    this.markerStateManager.setCombo(combo);

    console.log('🎬 Scene setup:', {
      targets: targets.length,
      combo: combo?.combo_id || 'none'
    });
  }

  /**
   * Change display mode
   */
  setDisplayMode(mode: '2D' | '3D'): void {
    if (this.displayMode === mode) return;

    this.displayMode = mode;
    this.eventBus.emit(AREvent.DISPLAY_MODE_CHANGED, { mode });
    
    console.log('🎨 Display mode:', mode);
  }

  /**
   * Get current display mode
   */
  getDisplayMode(): '2D' | '3D' {
    return this.displayMode;
  }

  /**
   * Check if ready
   */
  isReady(): boolean {
    return true; // Always ready after construction
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      displayMode: this.displayMode,
      targetsCount: this.targets.length,
      combo: this.combo?.combo_id || null,
      foundMarkers: Array.from(this.markerStateManager.getFoundMarkers()),
      comboActive: this.markerStateManager.isComboActive()
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.targets = [];
    this.combo = null;
    console.log('🧹 ARSceneController destroyed');
  }
}

/**
 * Factory function (lazy initialization)
 */
let _instance: ARSceneController | null = null;

export function getARSceneController(
  eventBus: IEventBus,
  markerStateManager: IMarkerStateManager
): ARSceneController {
  if (!_instance) {
    _instance = new ARSceneController(eventBus, markerStateManager);
  }
  return _instance;
}

/**
 * Export class for testing
 */
export { ARSceneController };