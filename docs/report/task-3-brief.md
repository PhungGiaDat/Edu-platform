# Task 3: Create Core Runtime Managers

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\src`

## Task Overview
Create the core runtime managers for the Dual-Display AR Combo System:
- `runtime/PerformanceMonitor.ts` - FPS tracking and auto-clear unhealthy markers
- `runtime/PositionCalculator.ts` - Calculate center position between markers
- `runtime/ComboDetector.ts` - Check combo vs single display mode
- `runtime/DualDisplayManager.ts` - Orchestrates all dual-display logic

## Global Constraints
- Uses Zustand stores from Task 2
- Uses combo database from Task 1
- TypeScript strict mode
- Performance target: 30+ FPS on mid-range mobile devices

## Files to Create

### 1. `frontend-web/src/runtime/PerformanceMonitor.ts`
```typescript
// frontend-web/src/runtime/PerformanceMonitor.ts
import { useMarkerHealthStore } from '@/stores/markerHealth.store';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';

export interface PerformanceConfig {
  targetFPS: number;           // Default: 30
  minFPS: number;              // Threshold for unhealthy (default: 15)
  checkInterval: number;        // ms (default: 1000)
  maxLoadAttempts: number;     // Max attempts before clear (default: 3)
  recoveryTime: number;         // ms to wait before retry (default: 5000)
}

const DEFAULT_CONFIG: PerformanceConfig = {
  targetFPS: 30,
  minFPS: 15,
  checkInterval: 1000,
  maxLoadAttempts: 3,
  recoveryTime: 5000,
};

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private currentFPS: number = 0;
  private onClearCallback: ((markerId: string) => void) | null = null;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    
    // Start FPS counting loop
    this.tick();
    
    // Start health check interval
    this.intervalId = window.setInterval(() => {
      this.checkHealth();
    }, this.config.checkInterval);
    
    console.log('✅ PerformanceMonitor started', this.config);
  }

  stop(): void {
    this.isRunning = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 PerformanceMonitor stopped');
  }

  onClear(callback: (markerId: string) => void): void {
    this.onClearCallback = callback;
  }

  recordFrame(): void {
    this.frameCount++;
  }

  getCurrentFPS(): number {
    return this.currentFPS;
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const elapsed = now - this.lastTime;
    
    if (elapsed >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = now;
      
      // Update store with current FPS for all markers
      const store = useMarkerHealthStore.getState();
      store.markers.forEach((marker, markerId) => {
        store.updateFPS(markerId, this.currentFPS);
      });
    }
    
    requestAnimationFrame(this.tick);
  };

  private checkHealth(): void {
    const healthStore = useMarkerHealthStore.getState();
    const displayStore = useDualDisplayStore.getState();
    
    const unhealthyMarkers = healthStore.getUnhealthyMarkers();
    
    unhealthyMarkers.forEach((marker) => {
      console.warn(`⚠️ Unhealthy marker: ${marker.markerId}`, marker);
      
      // Check if should clear
      if (marker.loadAttempts > this.config.maxLoadAttempts || marker.hasError) {
        console.log(`🗑️ Clearing unhealthy marker: ${marker.markerId}`);
        
        // Remove from display store
        displayStore.removeMarker(marker.markerId);
        
        // Remove from health store
        healthStore.removeMarker(marker.markerId);
        
        // Callback for cleanup
        if (this.onClearCallback) {
          this.onClearCallback(marker.markerId);
        }
      }
    });
  }
}

// Export singleton
export const performanceMonitor = new PerformanceMonitor();
```

### 2. `frontend-web/src/runtime/PositionCalculator.ts`
```typescript
// frontend-web/src/runtime/PositionCalculator.ts

export interface MarkerPosition {
  markerId: string;
  x: number;
  y: number;
  z: number;
}

export interface ComboPositionOptions {
  offsetY?: number;      // Vertical offset from markers (default: 0.5)
  scale?: number;         // Scale factor (default: 1.0)
  animation?: 'center' | 'follow-first' | 'follow-second';
}

export class PositionCalculator {
  /**
   * Calculate center position between 2+ markers
   */
  static calculateCenter(markers: MarkerPosition[]): { x: number; y: number; z: number } {
    if (markers.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }
    
    if (markers.length === 1) {
      return { 
        x: markers[0].x, 
        y: markers[0].y + 0.5, // Slightly above single marker
        z: markers[0].z 
      };
    }
    
    // Calculate average position
    const sum = markers.reduce(
      (acc, marker) => ({
        x: acc.x + marker.x,
        y: acc.y + marker.y,
        z: acc.z + marker.z,
      }),
      { x: 0, y: 0, z: 0 }
    );
    
    return {
      x: sum.x / markers.length,
      y: sum.y / markers.length + 0.5, // Above average height
      z: sum.z / markers.length,
    };
  }

  /**
   * Calculate position for combo model between markers
   */
  static calculateComboPosition(
    marker1: MarkerPosition,
    marker2: MarkerPosition,
    options: ComboPositionOptions = {}
  ): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: number } {
    const { offsetY = 0.3, scale = 1.0 } = options;
    
    // Calculate center point
    const centerX = (marker1.x + marker2.x) / 2;
    const centerY = Math.max(marker1.y, marker2.y) + offsetY; // Above the higher marker
    const centerZ = (marker1.z + marker2.z) / 2;
    
    // Calculate rotation to face between markers
    const dx = marker2.x - marker1.x;
    const dz = marker2.z - marker1.z;
    const rotationY = Math.atan2(dx, dz) * (180 / Math.PI);
    
    return {
      position: { x: centerX, y: centerY, z: centerZ },
      rotation: { x: 0, y: rotationY, z: 0 },
      scale,
    };
  }

  /**
   * Interpolate position smoothly
   */
  static interpolate(
    from: MarkerPosition,
    to: MarkerPosition,
    t: number // 0 to 1
  ): MarkerPosition {
    return {
      markerId: to.markerId,
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      z: from.z + (to.z - from.z) * t,
    };
  }
}
```

### 3. `frontend-web/src/runtime/ComboDetector.ts`
```typescript
// frontend-web/src/runtime/ComboDetector.ts
import { getComboByTags, COMBO_DB, getCombosForTag } from '@/lib/combo';
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
```

### 4. `frontend-web/src/runtime/DualDisplayManager.ts`
```typescript
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
```

## Steps
1. Create directory `frontend-web/src/runtime/`
2. Create `PerformanceMonitor.ts`
3. Create `PositionCalculator.ts`
4. Create `ComboDetector.ts`
5. Create `DualDisplayManager.ts`
6. Run TypeScript compilation to verify no errors

## Dependencies
- Task 1 complete: `lib/combo/` imports
- Task 2 complete: `stores/` imports

## Output
- Status: DONE when all files created and TypeScript compiles
- Report file: `report/task-3-report.md`
