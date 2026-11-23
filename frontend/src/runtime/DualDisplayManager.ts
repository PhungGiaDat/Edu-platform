// frontend-web/src/runtime/DualDisplayManager.ts
import { performanceMonitor } from './PerformanceMonitor';
import { comboDetector } from './ComboDetector';
import { PositionCalculator, type MarkerPosition } from './PositionCalculator';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';
import { useMarkerHealthStore } from '@/stores/markerHealth.store';

export interface DualDisplayConfig {
  enablePerformanceMonitoring: boolean;
  enableComboDetection: boolean;
  defaultDisplayMode: '2D' | '3D';
}

const DEFAULT_CONFIG: DualDisplayConfig = {
  enablePerformanceMonitoring: true,
  enableComboDetection: true,
  defaultDisplayMode: '3D',
};

export class DualDisplayManager {
  private config: DualDisplayConfig;
  private markerPositions: Map<string, MarkerPosition> = new Map();
  private isInitialized: boolean = false;

  constructor(config: Partial<DualDisplayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the manager
   */
  init(): void {
    if (this.isInitialized) return;
    
    console.log('🎯 Initializing DualDisplayManager');
    
    // Start performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      performanceMonitor.start();
      performanceMonitor.onClear((markerId) => {
        this.handleMarkerClear(markerId);
      });
    }
    
    this.isInitialized = true;
    console.log('✅ DualDisplayManager initialized');
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    console.log('🛑 Destroying DualDisplayManager');
    
    performanceMonitor.stop();
    this.markerPositions.clear();
    useDualDisplayStore.getState().reset();
    useMarkerHealthStore.getState().reset();
    
    this.isInitialized = false;
  }

  /**
   * Handle marker found
   */
  onMarkerFound(markerId: string, position?: MarkerPosition): void {
    console.log('✅ Marker found:', markerId);
    
    // Initialize health tracking
    const healthStore = useMarkerHealthStore.getState();
    healthStore.initMarker(markerId);
    
    // Update position if provided
    if (position) {
      this.markerPositions.set(markerId, position);
    }
    
    // Update display store
    const displayStore = useDualDisplayStore.getState();
    displayStore.addMarker(markerId);
    
    // Check for combo
    if (this.config.enableComboDetection) {
      const result = comboDetector.checkCombo(displayStore.activeMarkers);
      
      if (result.found && result.combo) {
        // Calculate combo position
        const positions = Array.from(this.markerPositions.values());
        const centerPos = PositionCalculator.calculateCenter(positions);
        displayStore.setComboPosition(centerPos);
        
        // Emit combo activated event
        window.dispatchEvent(new CustomEvent('COMBO_ACTIVATED', {
          detail: {
            combo: result.combo,
            anchorMarkerId: markerId,
          }
        }));
      }
    }
    
    // Update display mode
    this.updateDisplayMode();
  }

  /**
   * Handle marker lost
   */
  onMarkerLost(markerId: string): void {
    console.log('❌ Marker lost:', markerId);
    
    // Update display store
    const displayStore = useDualDisplayStore.getState();
    displayStore.removeMarker(markerId);
    
    // Remove position
    this.markerPositions.delete(markerId);
    
    // Check if combo should deactivate
    if (this.config.enableComboDetection && displayStore.activeCombo) {
      const result = comboDetector.checkCombo(displayStore.activeMarkers);
      
      if (!result.found) {
        // Combo no longer valid
        window.dispatchEvent(new CustomEvent('COMBO_DEACTIVATED', {
          detail: {
            combo: displayStore.activeCombo,
          }
        }));
        
        displayStore.setActiveCombo(null);
        displayStore.setComboPosition(null);
      }
    }
    
    // Update display mode
    this.updateDisplayMode();
  }

  /**
   * Update marker position
   */
  updateMarkerPosition(markerId: string, position: MarkerPosition): void {
    this.markerPositions.set(markerId, position);
    
    // Recalculate combo position if combo is active
    const displayStore = useDualDisplayStore.getState();
    if (displayStore.activeCombo && displayStore.activeMarkers.length >= 2) {
      const positions = Array.from(this.markerPositions.values());
      const centerPos = PositionCalculator.calculateCenter(positions);
      displayStore.setComboPosition(centerPos);
    }
  }

  /**
   * Record model load
   */
  onModelLoad(markerId: string, loadTime: number): void {
    const healthStore = useMarkerHealthStore.getState();
    healthStore.recordLoadAttempt(markerId, loadTime);
  }

  /**
   * Record model error
   */
  onModelError(markerId: string, error: string): void {
    const healthStore = useMarkerHealthStore.getState();
    healthStore.setError(markerId, error);
  }

  /**
   * Get current display info
   */
  getDisplayInfo(): {
    mode: string;
    markerCount: number;
    hasCombo: boolean;
    comboName?: string;
    comboPosition?: MarkerPosition;
  } {
    const store = useDualDisplayStore.getState();
    return {
      mode: store.displayMode,
      markerCount: store.activeMarkers.length,
      hasCombo: store.activeCombo !== null,
      comboName: store.activeCombo?.name,
      comboPosition: store.comboPosition ? {
        markerId: 'combo-center',
        ...store.comboPosition,
      } : undefined,
    };
  }

  private updateDisplayMode(): void {
    const store = useDualDisplayStore.getState();
    
    if (store.activeMarkers.length === 0) {
      store.setDisplayMode('idle');
    } else if (store.activeMarkers.length === 1) {
      store.setDisplayMode('single');
    } else if (store.activeCombo) {
      store.setDisplayMode('combo');
    } else {
      store.setDisplayMode('dual');
    }
  }

  private handleMarkerClear(markerId: string): void {
    // Emit event for UI cleanup
    window.dispatchEvent(new CustomEvent('MARKER_CLEARED', { detail: { markerId } }));
  }
}

// Export singleton
export const dualDisplayManager = new DualDisplayManager();
