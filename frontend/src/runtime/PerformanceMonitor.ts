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
      store.markers.forEach((_marker, markerId) => {
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
