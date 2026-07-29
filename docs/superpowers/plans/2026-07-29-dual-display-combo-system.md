# Dual-Display AR Combo System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade AR system từ Simple (single marker) lên MVP với dual-display, combo detection, performance monitoring, và animation support.

**Architecture:** System sử dụng event-driven architecture với Zustand stores. MultiFlashcardTracker hiện tại được mở rộng để track per-marker health. ComboDetector check combo vs single display mode. PositionCalculator đặt combo model ở center giữa 2 markers. PerformanceMonitor theo dõi FPS và tự động clear failed models.

**Tech Stack:** TypeScript, Zustand (state), A-Frame animation-mixer (animations), GLTF/GLB models với embedded animations.

---



## Global Constraints

- Deadline: 3 ngày (MVP target)
- MindAR .mind file tracking (image targets, không phải NFT)
- Single animation per combo model (no multiple animation switching)
- Performance: 30+ FPS on mid-range mobile devices
- Combo animals: elephant + dog, elephant + cat, elephant + giraffe, elephant + hippo

---



## File Structure

```
frontend-web/src/
├── lib/
│   └── combo/
│       └── combo-db.json              # Combo definitions (4 elephant combos)
├── stores/
│   ├── dualDisplay.store.ts           # Multi-marker state (Zustand)
│   └── markerHealth.store.ts          # Per-marker tracking health
├── runtime/
│   ├── DualDisplayManager.ts          # Orchestrates all dual-display logic
│   ├── ComboDetector.ts               # Check combo vs single mode
│   ├── PerformanceMonitor.ts          # FPS tracking + auto-clear
│   └── PositionCalculator.ts          # Center position calculation
├── hooks/
│   ├── useDualDisplay.ts             # React hook for components
│   ├── usePerformanceMonitor.ts       # Performance threshold hook
│   └── useComboDetection.ts          # Combo detection hook
├── components/ar/
│   └── ARContainerV2.tsx             # MODIFY: Add dual-display UI
└── ar-viewer.html                    # MODIFY: Support dual-display + animation
```

---



## Task 1: Create Combo Database

**Files:**

- Create: `frontend-web/src/lib/combo/combo-db.json`
- Create: `frontend-web/src/lib/combo/types.ts`

**Interfaces:**

- Produces: `ComboDefinition[]`, `getComboByTags()`, `COMBO_DB`

```typescript
// combo-db.json structure
interface ComboDefinition {
  combo_id: string;
  name: string;
  required_tags: string[]; // Array of 2+ marker tags
  model_url: string;       // GLB model with animation
  image_url: string;      // 2D fallback image
  animation_clip: string;  // Animation name in GLB (e.g., "eating", "idle")
  category: string;        // e.g., "animals", "nature"
  difficulty: 'easy' | 'medium' | 'hard';
}
```

**Steps:**

- [ ] **Step 1: Create combo-db.json with 4 elephant combos**

```json
{
  "combos": [
    {
      "combo_id": "elephant-dog",
      "name": "Elephant and Dog",
      "required_tags": ["elephant", "dog"],
      "model_url": "https://example.com/models/elephant_dog.glb",
      "image_url": "https://example.com/images/elephant_dog_combo.png",
      "animation_clip": "idle",
      "category": "animals",
      "difficulty": "medium"
    },
    {
      "combo_id": "elephant-cat",
      "name": "Elephant and Cat",
      "required_tags": ["elephant", "cat"],
      "model_url": "https://example.com/models/elephant_cat.glb",
      "image_url": "https://example.com/images/elephant_cat_combo.png",
      "animation_clip": "idle",
      "category": "animals",
      "difficulty": "easy"
    },
    {
      "combo_id": "elephant-giraffe",
      "name": "Elephant and Giraffe",
      "required_tags": ["elephant", "giraffe"],
      "model_url": "https://example.com/models/elephant_giraffe.glb",
      "image_url": "https://example.com/images/elephant_giraffe_combo.png",
      "animation_clip": "idle",
      "category": "animals",
      "difficulty": "medium"
    },
    {
      "combo_id": "elephant-hippo",
      "name": "Elephant and Hippo",
      "required_tags": ["elephant", "hippo"],
      "model_url": "https://example.com/models/elephant_hippo.glb",
      "image_url": "https://example.com/images/elephant_hippo_combo.png",
      "animation_clip": "idle",
      "category": "animals",
      "difficulty": "hard"
    }
  ]
}
```

**Note:** MindAR uses `.mind` files for image target tracking. Each animal (elephant, dog, cat, giraffe, hippo) được scan qua flashcard riêng. Khi 2 flashcards (ví dụ elephant + dog) được quét, system sẽ check combo và hiển thị model kết hợp.
```

- [ ] **Step 2: Create types.ts for combo**

```typescript
// frontend-web/src/lib/combo/types.ts
export interface ComboDefinition {
  combo_id: string;
  name: string;
  required_tags: string[];
  model_url: string;
  image_url: string;
  animation_clip: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ComboResult {
  found: boolean;
  combo?: ComboDefinition;
  missing_tags?: string[];
}
```

- [ ] **Step 3: Create combo index.ts with helper functions**

```typescript
// frontend-web/src/lib/combo/index.ts
import comboData from './combo-db.json';
import type { ComboDefinition, ComboResult } from './types';

export const COMBO_DB: ComboDefinition[] = comboData.combos;

export function getComboByTags(tags: string[]): ComboResult {
  const sortedTags = [...tags].sort();
  
  for (const combo of COMBO_DB) {
    const sortedRequired = [...combo.required_tags].sort();
    if (sortedTags.length === sortedRequired.length &&
        sortedTags.every((tag, i) => tag === sortedRequired[i])) {
      return { found: true, combo };
    }
  }
  
  return { found: false };
}

export function getCombosForTag(tag: string): ComboDefinition[] {
  return COMBO_DB.filter(combo => combo.required_tags.includes(tag));
}
```

- [ ] **Step 4: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/src/lib/combo/
git commit -m "feat: add combo database with 4 elephant-based combos"
```

---



## Task 2: Create Zustand Stores

**Files:**

- Create: `frontend-web/src/stores/dualDisplay.store.ts`
- Create: `frontend-web/src/stores/markerHealth.store.ts`

**Interfaces:**

- Produces: `dualDisplayStore`, `markerHealthStore`

**Steps:**

- [ ] **Step 1: Create dualDisplay.store.ts**

```typescript
// frontend-web/src/stores/dualDisplay.store.ts
import { create } from 'zustand';
import type { ComboDefinition } from '@/lib/combo/types';

export type DisplayMode = 'idle' | 'single' | 'dual' | 'combo';

interface DualDisplayState {
  displayMode: DisplayMode;
  activeMarkers: string[];           // Currently visible markers
  activeCombo: ComboDefinition | null;
  comboPosition: { x: number; y: number; z: number } | null;
  
  // Actions
  setDisplayMode: (mode: DisplayMode) => void;
  addMarker: (markerId: string) => void;
  removeMarker: (markerId: string) => void;
  clearMarkers: () => void;
  setActiveCombo: (combo: ComboDefinition | null) => void;
  setComboPosition: (pos: { x: number; y: number; z: number } | null) => void;
  reset: () => void;
}

const initialState = {
  displayMode: 'idle' as DisplayMode,
  activeMarkers: [],
  activeCombo: null,
  comboPosition: null,
};

export const useDualDisplayStore = create<DualDisplayState>((set) => ({
  ...initialState,
  
  setDisplayMode: (mode) => set({ displayMode: mode }),
  
  addMarker: (markerId) => set((state) => ({
    activeMarkers: state.activeMarkers.includes(markerId) 
      ? state.activeMarkers 
      : [...state.activeMarkers, markerId]
  })),
  
  removeMarker: (markerId) => set((state) => ({
    activeMarkers: state.activeMarkers.filter(id => id !== markerId)
  })),
  
  clearMarkers: () => set({ activeMarkers: [], displayMode: 'idle' }),
  
  setActiveCombo: (combo) => set({ 
    activeCombo: combo,
    displayMode: combo ? 'combo' : 'dual'
  }),
  
  setComboPosition: (pos) => set({ comboPosition: pos }),
  
  reset: () => set(initialState),
}));
```

- [ ] **Step 2: Create markerHealth.store.ts**

```typescript
// frontend-web/src/stores/markerHealth.store.ts
import { create } from 'zustand';

interface MarkerHealth {
  markerId: string;
  fps: number;
  isTracking: boolean;
  lastSeen: number;      // timestamp
  loadAttempts: number;
  modelLoadTime: number;  // ms
  hasError: boolean;
  errorMessage?: string;
}

interface MarkerHealthState {
  markers: Map<string, MarkerHealth>;
  
  // Actions
  initMarker: (markerId: string) => void;
  updateFPS: (markerId: string, fps: number) => void;
  setTracking: (markerId: string, isTracking: boolean) => void;
  recordLoadAttempt: (markerId: string, loadTime: number) => void;
  setError: (markerId: string, error: string) => void;
  clearError: (markerId: string) => void;
  removeMarker: (markerId: string) => void;
  getUnhealthyMarkers: () => MarkerHealth[];
  reset: () => void;
}

export const useMarkerHealthStore = create<MarkerHealthState>((set, get) => ({
  markers: new Map(),
  
  initMarker: (markerId) => set((state) => {
    const newMarkers = new Map(state.markers);
    if (!newMarkers.has(markerId)) {
      newMarkers.set(markerId, {
        markerId,
        fps: 0,
        isTracking: false,
        lastSeen: Date.now(),
        loadAttempts: 0,
        modelLoadTime: 0,
        hasError: false,
      });
    }
    return { markers: newMarkers };
  }),
  
  updateFPS: (markerId, fps) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, fps, lastSeen: Date.now() });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  setTracking: (markerId, isTracking) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, isTracking, lastSeen: Date.now() });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  recordLoadAttempt: (markerId, loadTime) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { 
        ...marker, 
        loadAttempts: marker.loadAttempts + 1,
        modelLoadTime: loadTime,
      });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  setError: (markerId, error) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, hasError: true, errorMessage: error });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  clearError: (markerId) => set((state) => {
    const marker = state.markers.get(markerId);
    if (marker) {
      const newMarkers = new Map(state.markers);
      newMarkers.set(markerId, { ...marker, hasError: false, errorMessage: undefined });
      return { markers: newMarkers };
    }
    return state;
  }),
  
  removeMarker: (markerId) => set((state) => {
    const newMarkers = new Map(state.markers);
    newMarkers.delete(markerId);
    return { markers: newMarkers };
  }),
  
  getUnhealthyMarkers: () => {
    const state = get();
    const unhealthy: MarkerHealth[] = [];
    
    state.markers.forEach((marker) => {
      // Unhealthy if: low FPS OR too many load attempts OR has error
      if (marker.fps < 15 || marker.loadAttempts > 3 || marker.hasError) {
        unhealthy.push(marker);
      }
    });
    
    return unhealthy;
  },
  
  reset: () => set({ markers: new Map() }),
}));
```

- [ ] **Step 3: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/src/stores/
git commit -m "feat: add Zustand stores for dual-display state management"
```

---



## Task 3: Create Core Runtime Managers

**Files:**

- Create: `frontend-web/src/runtime/PerformanceMonitor.ts`
- Create: `frontend-web/src/runtime/PositionCalculator.ts`
- Create: `frontend-web/src/runtime/ComboDetector.ts`
- Create: `frontend-web/src/runtime/DualDisplayManager.ts`

**Interfaces:**

- Consumes: `dualDisplayStore`, `markerHealthStore`, `COMBO_DB`
- Produces: `PerformanceMonitor`, `PositionCalculator`, `ComboDetector`, `DualDisplayManager`

**Steps:**

- [ ] **Step 1: Create PerformanceMonitor.ts**

```typescript
// frontend-web/src/runtime/PerformanceMonitor.ts
import { useMarkerHealthStore } from '@/stores/markerHealth.store';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';

export interface PerformanceConfig {
  targetFPS: number;           // Default: 30
  minFPS: number;              // Threshold for unhealthy (default: 15)
  checkInterval: number;        // ms (default: 1000)
  maxLoadAttempts: number;     // Max attempts before clear (default: 3)
  recoveryTime: number;        // ms to wait before retry (default: 5000)
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

- [ ] **Step 2: Create PositionCalculator.ts**

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
  scale?: number;        // Scale factor (default: 1.0)
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

- [ ] **Step 3: Create ComboDetector.ts**

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

- [ ] **Step 4: Create DualDisplayManager.ts**



```typescript
// frontend-web/src/runtime/DualDisplayManager.ts
import { eventBus } from './EventBus';
import { AREvent } from '@/core/types/AREvents';
import { performanceMonitor } from './PerformanceMonitor';
import { comboDetector } from './ComboDetector';
import { PositionCalculator, type MarkerPosition } from './PositionCalculator';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';
import { useMarkerHealthStore } from '@/stores/markerHealth.store';
import type { ComboDefinition } from '@/lib/combo/types';

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
    
    // Setup event listeners
    this.setupEventListeners();
    
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
        
        // Emit combo activated
        eventBus.emit(AREvent.COMBO_ACTIVATED, {
          combo: result.combo,
          anchorMarkerId: markerId,
        });
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
        eventBus.emit(AREvent.COMBO_DEACTIVATED, {
          combo: displayStore.activeCombo,
        });
        
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

  private setupEventListeners(): void {
    // Listen for AR events
    eventBus.on(AREvent.MARKER_FOUND, ((payload: { markerId: string }) => {
      this.onMarkerFound(payload.markerId);
    }) as any);
    
    eventBus.on(AREvent.MARKER_LOST, ((payload: { markerId: string }) => {
      this.onMarkerLost(payload.markerId);
    }) as any);
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
    eventBus.emit('MARKER_CLEARED' as any, { markerId });
  }
}

// Export singleton
export const dualDisplayManager = new DualDisplayManager();
```

- [ ] **Step 5: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/src/runtime/
git commit -m "feat: add dual-display runtime managers (PerformanceMonitor, PositionCalculator, ComboDetector, DualDisplayManager)"
```

---



## Task 4: Create React Hooks

**Files:**

- Create: `frontend-web/src/hooks/useDualDisplay.ts`
- Create: `frontend-web/src/hooks/usePerformanceMonitor.ts`
- Create: `frontend-web/src/hooks/useComboDetection.ts`

**Interfaces:**

- Consumes: `dualDisplayStore`, `markerHealthStore`, `DualDisplayManager`
- Produces: React hooks

**Steps:**

- [ ] **Step 1: Create useDualDisplay.ts**

```typescript
// frontend-web/src/hooks/useDualDisplay.ts
import { useEffect } from 'react';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';
import { dualDisplayManager } from '@/runtime/DualDisplayManager';

export function useDualDisplay() {
  const {
    displayMode,
    activeMarkers,
    activeCombo,
    comboPosition,
    setDisplayMode,
    addMarker,
    removeMarker,
    clearMarkers,
    setActiveCombo,
    setComboPosition,
    reset,
  } = useDualDisplayStore();

  // Initialize manager on mount
  useEffect(() => {
    dualDisplayManager.init();
    
    return () => {
      dualDisplayManager.destroy();
    };
  }, []);

  return {
    // State
    displayMode,
    activeMarkers,
    activeCombo,
    comboPosition,
    
    // Computed
    isIdle: displayMode === 'idle',
    isSingle: displayMode === 'single',
    isDual: displayMode === 'dual',
    isCombo: displayMode === 'combo',
    markerCount: activeMarkers.length,
    
    // Actions
    setDisplayMode,
    addMarker,
    removeMarker,
    clearMarkers,
    setActiveCombo,
    setComboPosition,
    reset,
    
    // Manager methods
    getDisplayInfo: () => dualDisplayManager.getDisplayInfo(),
  };
}
```

- [ ] **Step 2: Create usePerformanceMonitor.ts**

```typescript
// frontend-web/src/hooks/usePerformanceMonitor.ts
import { useState, useEffect, useCallback } from 'react';
import { performanceMonitor } from '@/runtime/PerformanceMonitor';
import { useMarkerHealthStore } from '@/stores/markerHealth.store';

export function usePerformanceMonitor() {
  const [fps, setFps] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { markers, getUnhealthyMarkers } = useMarkerHealthStore();

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(performanceMonitor.getCurrentFPS());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const startMonitoring = useCallback(() => {
    performanceMonitor.start();
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    performanceMonitor.stop();
    setIsMonitoring(false);
  }, []);

  const recordFrame = useCallback(() => {
    performanceMonitor.recordFrame();
  }, []);

  return {
    fps,
    isMonitoring,
    isHealthy: fps >= 15,
    markers: Array.from(markers.entries()).map(([id, m]) => ({ id, ...m })),
    unhealthyMarkers: getUnhealthyMarkers(),
    startMonitoring,
    stopMonitoring,
    recordFrame,
  };
}
```

- [ ] **Step 3: Create useComboDetection.ts**

```typescript
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
```

- [ ] **Step 4: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/src/hooks/useDualDisplay.ts
git add frontend-web/src/hooks/usePerformanceMonitor.ts
git add frontend-web/src/hooks/useComboDetection.ts
git commit -m "feat: add React hooks for dual-display system"
```

---



## Task 5: Integrate with ARContainerV2

**Files:**

- Modify: `frontend-web/src/components/ar/ARContainerV2.tsx`

**Interfaces:**

- Consumes: `useDualDisplay`, `useComboDetection`
- Produces: Updated ARContainerV2 with dual-display support

**Steps:**

- [ ] **Step 1: Add new imports**

```typescript
// Add to existing imports in ARContainerV2.tsx
import { useDualDisplay } from '@/hooks/useDualDisplay';
import { useComboDetection } from '@/hooks/useComboDetection';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
```

- [ ] **Step 2: Add new props for combo detection**

```typescript
// Add to ARContainerV2Props interface
interface ARContainerV2Props {
  // ... existing props ...
  
  // New props
  enableComboDetection?: boolean;      // Default: true
  onComboActivated?: (combo: ComboDefinition) => void;
  onComboDeactivated?: () => void;
  onDualDisplayModeChange?: (mode: 'single' | 'dual' | 'combo') => void;
}
```

- [ ] **Step 3: Add hook usage in component**

```typescript
// Inside ARContainerV2 component
const {
  displayMode,
  isCombo,
  activeCombo,
  comboPosition,
  getDisplayInfo,
} = useDualDisplay();

const {
  hasActiveCombo,
  activeCombo: combo,
} = useComboDetection();

const {
  fps,
  isHealthy,
} = usePerformanceMonitor();

// Get combo info from store
const comboData = getDisplayInfo();
```

- [ ] **Step 4: Handle combo events**

```typescript
// In handleMessage switch case for COMBO_DETECTED:
case 'COMBO_DETECTED': {
  const data = payload as ARMessagePayloadMap['COMBO_DETECTED'];
  cbCombo?.(data.targets);
  
  // Call dual display manager
  dualDisplayManager.onMarkerFound(`target-${data.targets[0]}`);
  dualDisplayManager.onMarkerFound(`target-${data.targets[1]}`);
  
  eventBus.emit(AREvent.COMBO_ACTIVATED, {
    tag1: `target-${data.targets[0]}`,
    tag2: `target-${data.targets[1]}`
  } as any);
  
  // Call callback
  if (hasActiveCombo && combo) {
    onComboActivated?.(combo);
  }
  break;
}
```

- [ ] **Step 5: Add combo position debug overlay (optional)**

```typescript
// Add in render, before children:
{process.env.NODE_ENV === 'development' && (
  <div style={{
    position: 'absolute',
    top: 10,
    left: 10,
    background: 'rgba(0,0,0,0.7)',
    color: 'white',
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
    zIndex: 1000,
  }}>
    <div>FPS: {fps} {isHealthy ? '✅' : '⚠️'}</div>
    <div>Mode: {displayMode}</div>
    {isCombo && <div>Combo: {combo?.name}</div>}
    <div>Markers: {comboData.markerCount}</div>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/src/components/ar/ARContainerV2.tsx
git commit -m "feat: integrate dual-display system with ARContainerV2"
```

---



## Task 6: Update ar-viewer.html for Animation Support

**Files:**

- Modify: `frontend-web/public/ar-viewer.html`

**Interfaces:**

- Consumes: URL params (comboModel, comboAnimation)
- Produces: Combo model with animation

**Steps:**

- [ ] **Step 1: Add animation support in ar-viewer.html**

```javascript
// Add in initialization section
const params = new URLSearchParams(window.location.search);
const comboModel = params.get('comboModel');
const comboAnimation = params.get('comboAnimation') || 'idle';
const comboImage = params.get('comboImage');

// If combo model exists, load it with animation
if (comboModel) {
  loadComboModel(comboModel, comboAnimation);
}

function loadComboModel(url, animationClip) {
  const scene = document.querySelector('a-scene');
  
  // Create combo entity
  const comboEntity = document.createElement('a-entity');
  comboEntity.setAttribute('id', 'combo-model');
  comboEntity.setAttribute('gltf-model', `url(${url})`);
  comboEntity.setAttribute('position', '0 0.5 0');
  comboEntity.setAttribute('scale', '0.5 0.5 0.5');
  
  // Add animation-mixer for GLTF animations
  comboEntity.setAttribute('animation-mixer', `clip: ${animationClip}; loop: repeat`);
  
  // Add to scene
  scene.appendChild(comboEntity);
  
  console.log('✅ Combo model loaded with animation:', animationClip);
}
```

- [ ] **Step 2: Add combo position update based on marker positions**

```javascript
// When markers are tracked, update combo position
function updateComboPosition(marker1Pos, marker2Pos) {
  const comboEntity = document.getElementById('combo-model');
  if (!comboEntity) return;
  
  // Calculate center
  const centerX = (marker1Pos.x + marker2Pos.x) / 2;
  const centerY = Math.max(marker1Pos.y, marker2Pos.y) + 0.3;
  const centerZ = (marker1Pos.z + marker2Pos.z) / 2;
  
  // Update position with animation
  comboEntity.setAttribute('animation', {
    property: 'position',
    to: `${centerX} ${centerY} ${centerZ}`,
    dur: 300,
    easing: 'easeOutQuad'
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/public/ar-viewer.html
git commit -m "feat: add animation support in ar-viewer for combo models"
```

---



## Task 7: Testing & Verification

**Files:**

- Create: `frontend-web/src/__tests__/runtime/DualDisplayManager.test.ts`
- Create: `frontend-web/src/__tests__/runtime/ComboDetector.test.ts`
- Create: `frontend-web/src/__tests__/runtime/PositionCalculator.test.ts`

**Steps:**

- [ ] **Step 1: Test PositionCalculator**

```typescript
// frontend-web/src/__tests__/runtime/PositionCalculator.test.ts
import { PositionCalculator } from '@/runtime/PositionCalculator';

describe('PositionCalculator', () => {
  test('calculateCenter with 2 markers', () => {
    const markers = [
      { markerId: 'm1', x: 0, y: 0, z: 0 },
      { markerId: 'm2', x: 2, y: 0, z: 2 },
    ];
    
    const center = PositionCalculator.calculateCenter(markers);
    
    expect(center.x).toBe(1);
    expect(center.y).toBe(0.5); // +0.5 offset
    expect(center.z).toBe(1);
  });
  
  test('calculateCenter with single marker', () => {
    const markers = [
      { markerId: 'm1', x: 1, y: 0.5, z: 1 },
    ];
    
    const center = PositionCalculator.calculateCenter(markers);
    
    expect(center.x).toBe(1);
    expect(center.y).toBe(1); // 0.5 + 0.5 offset
    expect(center.z).toBe(1);
  });
  
  test('calculateCenter with empty markers', () => {
    const center = PositionCalculator.calculateCenter([]);
    
    expect(center).toEqual({ x: 0, y: 0, z: 0 });
  });
});
```

- [ ] **Step 2: Test ComboDetector**

```typescript
// frontend-web/src/__tests__/runtime/ComboDetector.test.ts
import { comboDetector } from '@/runtime/ComboDetector';

describe('ComboDetector', () => {
  test('checkCombo returns found for valid combo', () => {
    const result = comboDetector.checkCombo(['deer', 'grass']);
    
    expect(result.found).toBe(true);
    expect(result.combo).toBeDefined();
    expect(result.combo?.name).toBe('Deer Eating Grass');
  });
  
  test('checkCombo returns false for non-combo markers', () => {
    const result = comboDetector.checkCombo(['deer', 'tree']);
    
    expect(result.found).toBe(false);
  });
  
  test('checkCombo requires minimum tags', () => {
    const result = comboDetector.checkCombo(['deer']);
    
    expect(result.found).toBe(false);
  });
});
```

- [ ] **Step 3: Test DualDisplayManager**

```typescript
// frontend-web/src/__tests__/runtime/DualDisplayManager.test.ts
import { dualDisplayManager } from '@/runtime/DualDisplayManager';
import { useDualDisplayStore } from '@/stores/dualDisplay.store';

describe('DualDisplayManager', () => {
  beforeEach(() => {
    dualDisplayManager.init();
    useDualDisplayStore.getState().reset();
  });
  
  afterEach(() => {
    dualDisplayManager.destroy();
  });
  
  test('onMarkerFound updates store', () => {
    dualDisplayManager.onMarkerFound('marker-1');
    
    const store = useDualDisplayStore.getState();
    expect(store.activeMarkers).toContain('marker-1');
    expect(store.displayMode).toBe('single');
  });
  
  test('onMarkerFound twice triggers dual mode', () => {
    dualDisplayManager.onMarkerFound('marker-1');
    dualDisplayManager.onMarkerFound('marker-2');
    
    const store = useDualDisplayStore.getState();
    expect(store.activeMarkers.length).toBe(2);
    expect(store.displayMode).toBe('dual');
  });
  
  test('onMarkerLost removes marker', () => {
    dualDisplayManager.onMarkerFound('marker-1');
    dualDisplayManager.onMarkerFound('marker-2');
    dualDisplayManager.onMarkerLost('marker-1');
    
    const store = useDualDisplayStore.getState();
    expect(store.activeMarkers).not.toContain('marker-1');
    expect(store.activeMarkers).toContain('marker-2');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd "e:\University\Graduted Project\Edu-platform\frontend-web"
npm test -- --testPathPattern="DualDisplayManager|ComboDetector|PositionCalculator"
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
cd "e:\University\Graduted Project\Edu-platform"
git add frontend-web/src/__tests__/
git commit -m "test: add unit tests for dual-display system"
```

---



## Verification Checklist

- [ ] Combo database có 4 combos (elephant + dog/cat/giraffe/hippo)
- [ ] Stores update correctly khi markers found/lost
- [ ] PerformanceMonitor tracking FPS
- [ ] Unhealthy markers auto-clear
- [ ] PositionCalculator tính center chính xác
- [ ] ComboDetector check combo đúng
- [ ] DualDisplayManager orchestrate tất cả
- [ ] Hooks work trong React components
- [ ] ARContainerV2 integrate dual-display
- [ ] ar-viewer.html support animation
- [ ] Unit tests pass
- [ ] Manual test: 2 markers scan → combo model appear

---



## Timeline Summary


| Day   | Tasks                                            |
| ----- | ------------------------------------------------ |
| Day 1 | Task 1, 2 (Database + Stores)                    |
| Day 2 | Task 3, 4 (Runtime Managers + Hooks)             |
| Day 3 | Task 5, 6, 7 (Integration + Animation + Testing) |


---

**Plan saved to:** `docs/superpowers/plans/2026-07-29-dual-display-combo-system.md`