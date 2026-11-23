// src/core/interfaces/IRuntimeBridge.ts
/**
 * IRuntimeBridge Interface
 * Contract for RuntimeBridge - Central Dependency Injection Container
 */

import type { IEventBus } from './IEventBus';
import type { IMarkerStateManager } from './IMarkerStateManager';
import type { IQRDetectionService } from './IQRDetectionService';
import type { ISceneManager } from './IScenceManager';

export interface IRuntimeBridge {
  // ========== CORE SERVICES (Read-only) ==========
  readonly eventBus: IEventBus;
  readonly markerStateManager: IMarkerStateManager;
  readonly arSceneManager: ISceneManager;
  readonly qrService?: IQRDetectionService;

  // ========== LIFECYCLE METHODS ==========
  /**
   * Initialize all runtime services
   */
  init(): void;

  /**
   * Cleanup all runtime services
   */
  cleanup(): void;

  /**
   * Check if bridge is initialized
   */
  isInitialized(): boolean;

  // ========== QR DETECTION CONTROL ==========
  startQRScanning(): void;
  stopQRScanning(): void;

  // ========== MARKER STATE CONTROL ==========
  resetMarkers(): void;
  markMarkerFound(markerId: string): void;
  markMarkerLost(markerId: string): void;

  // ========== MULTI-FLASHCARD CONTROL ==========
  startMultiFlashcardTracking(requiredTags: string[], timeout?: number): void;
  stopMultiFlashcardTracking(): void;
  getMultiFlashcardProgress(): {
    required: string[];
    found: string[];
    remaining: string[];
    progress: number;
  };

  // ========== STATUS ==========
  getStatus(): {
    initialized: boolean;
    qrScanning: boolean;
    markersFound: number;
    comboActive: boolean;
    combo: string | null;
    multiFlashcardActive: boolean;
  };
}