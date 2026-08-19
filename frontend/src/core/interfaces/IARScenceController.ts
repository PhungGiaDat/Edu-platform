// src/core/interfaces/IARSceneController.ts
/**
 * AR Scene Controller Interface
 * Orchestrates AR scene lifecycle và marker management
 */

import type { ARTarget, ARCombo } from '../../types';
import type { IEventBus } from './IEventBus';
import type { IMarkerStateManager } from './IMarkerStateManager';

export interface IARSceneController {
  /**
   * Initialize AR scene with dependencies
   */
  init(eventBus: IEventBus, markerStateManager: IMarkerStateManager): void;
  
  /**
   * Setup scene with targets and combo
   */
  setupScene(targets: ARTarget[], combo: ARCombo | null): void;
  
  /**
   * Change display mode (2D/3D)
   */
  setDisplayMode(mode: '2D' | '3D'): void;
  
  /**
   * Get current display mode
   */
  getDisplayMode(): '2D' | '3D';
  
  /**
   * Check if scene is ready
   */
  isReady(): boolean;
  
  /**
   * Cleanup resources
   */
  destroy(): void;
}