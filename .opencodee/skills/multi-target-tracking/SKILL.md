# Multi-Target Image Tracking Skill

## Overview
This skill covers advanced techniques for tracking multiple image markers simultaneously in AR applications. Learn to build flashcard systems with unique IDs, handle concurrent marker visibility, implement priority management, optimize performance for multiple targets, and coordinate state across marker sets.

## When to Use This Skill
- Building flashcard-based AR learning systems
- Creating AR experiences with multiple simultaneous markers (3-18+ markers)
- Implementing marker priority and focus management
- Optimizing performance for multi-marker scenarios
- Managing PATT file collections for marker sets
- Coordinating UI updates across multiple tracked markers

## Prerequisites
- Completion of `mindar-integration` skill (MindAR basics and marker compilation)
- Completion of `ar-state-machine` skill (state management patterns)
- Completion of `event-driven-ar` skill (event communication architecture)
- Understanding of performance optimization techniques

## Core Concepts

### Multi-Marker AR Architecture

**Single Marker vs Multi-Marker:**

```
Single Marker:
Camera → Detects ONE marker → Triggers content → User interaction

Multi-Marker:
Camera → Detects MULTIPLE markers → Priority system → Focus marker → Content
                ↓
         Other markers in background (tracked but not focused)
```

**Key Challenges:**
1. **Performance**: More markers = more CPU/GPU load
2. **Priority**: Which marker gets focus when multiple are visible?
3. **State Coordination**: Managing independent state machines for each marker
4. **UI Complexity**: Rendering appropriate content for multiple markers
5. **User Experience**: Avoiding overwhelming users with too much AR content

### MindAR Multi-Target Capabilities

MindAR supports detecting multiple markers through:
- **Combined Mind Files**: Single `.mind` file containing multiple marker patterns
- **Target Indices**: Each marker assigned unique index (0, 1, 2, ...)
- **maxTrack Parameter**: Limit simultaneous tracking (recommended: 3-5)
- **Independent Events**: Each marker fires separate targetFound/targetLost events

**Performance Benchmarks** (based on Connected Environments AR Playing Cards example):
- **18 markers**: Tested successfully, slight performance impact
- **5-10 markers**: Optimal balance of functionality and performance
- **3 markers**: Excellent performance on mid-range mobile devices
- **1 marker**: Maximum performance, lowest latency

## Implementation Patterns

### Pattern 1: Marker Set Configuration

#### Flashcard Marker Registry
```typescript
// src/config/marker-config.ts

export interface MarkerDefinition {
  id: string;              // Unique marker ID (e.g., 'flashcard-01')
  targetIndex: number;     // Index in compiled .mind file
  priority: number;        // Priority level (1-10, higher = more important)
  category: string;        // Grouping (e.g., 'math', 'science')
  contentType: 'flashcard' | '3d-model' | 'video' | 'interactive';
  metadata: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
  };
}

export class MarkerRegistry {
  private markers: Map<string, MarkerDefinition> = new Map();
  private indexToId: Map<number, string> = new Map();

  /**
   * Register a marker definition
   */
  register(marker: MarkerDefinition): void {
    this.markers.set(marker.id, marker);
    this.indexToId.set(marker.targetIndex, marker.id);
  }

  /**
   * Register multiple markers
   */
  registerBatch(markers: MarkerDefinition[]): void {
    markers.forEach(marker => this.register(marker));
  }

  /**
   * Get marker by ID
   */
  getById(id: string): MarkerDefinition | undefined {
    return this.markers.get(id);
  }

  /**
   * Get marker by target index
   */
  getByIndex(targetIndex: number): MarkerDefinition | undefined {
    const id = this.indexToId.get(targetIndex);
    return id ? this.markers.get(id) : undefined;
  }

  /**
   * Get all markers in category
   */
  getByCategory(category: string): MarkerDefinition[] {
    return Array.from(this.markers.values())
      .filter(marker => marker.category === category);
  }

  /**
   * Get markers sorted by priority
   */
  getByPriority(): MarkerDefinition[] {
    return Array.from(this.markers.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all marker IDs
   */
  getAllIds(): string[] {
    return Array.from(this.markers.keys());
  }

  /**
   * Get mapping for AREventBridge
   */
  getIndexToIdMap(): Record<number, string> {
    const map: Record<number, string> = {};
    this.indexToId.forEach((id, index) => {
      map[index] = id;
    });
    return map;
  }
}

// Singleton instance
export const markerRegistry = new MarkerRegistry();

// Example: Register flashcard markers
markerRegistry.registerBatch([
  {
    id: 'flashcard-math-01',
    targetIndex: 0,
    priority: 8,
    category: 'math',
    contentType: 'flashcard',
    metadata: {
      title: 'Pythagorean Theorem',
      description: 'a² + b² = c²',
      difficulty: 'medium',
      tags: ['geometry', 'triangles']
    }
  },
  {
    id: 'flashcard-science-01',
    targetIndex: 1,
    priority: 7,
    category: 'science',
    contentType: 'flashcard',
    metadata: {
      title: 'Water Molecule',
      description: 'H₂O structure and properties',
      difficulty: 'easy',
      tags: ['chemistry', 'molecules']
    }
  },
  {
    id: 'flashcard-history-01',
    targetIndex: 2,
    priority: 6,
    category: 'history',
    contentType: 'flashcard',
    metadata: {
      title: '1776 Declaration',
      description: 'American Independence',
      difficulty: 'easy',
      tags: ['american-history', 'revolution']
    }
  }
  // ... add up to 18 markers
]);
```

### Pattern 2: Multi-Marker State Coordination

#### Centralized Multi-Marker State Manager
```typescript
// src/lib/multi-marker-state.ts
import { MarkerStateMachine } from './ar-state-machine';
import type { MarkerState } from '../types/ar-state';

export interface ActiveMarker {
  id: string;
  state: MarkerState;
  priority: number;
  detectedAt: number;
  lastSeenAt: number;
}

export class MultiMarkerStateManager {
  private stateMachines: Map<string, MarkerStateMachine> = new Map();
  private activeMarkers: Map<string, ActiveMarker> = new Map();
  private focusedMarkerId: string | null = null;
  private listeners: Set<(state: MultiMarkerState) => void> = new Set();

  /**
   * Initialize state machines for all markers
   */
  initializeMarkers(markerIds: string[]): void {
    markerIds.forEach(id => {
      const stateMachine = new MarkerStateMachine(id);
      this.stateMachines.set(id, stateMachine);

      // Listen to state changes
      stateMachine.on('tracking', () => this.handleMarkerTracking(id));
      stateMachine.on('lost', () => this.handleMarkerLost(id));
    });
  }

  /**
   * Handle marker entering tracking state
   */
  private handleMarkerTracking(markerId: string): void {
    const now = Date.now();
    const marker = markerRegistry.getById(markerId);

    if (!marker) return;

    this.activeMarkers.set(markerId, {
      id: markerId,
      state: 'tracking',
      priority: marker.priority,
      detectedAt: now,
      lastSeenAt: now
    });

    this.updateFocus();
    this.notifyListeners();
  }

  /**
   * Handle marker lost
   */
  private handleMarkerLost(markerId: string): void {
    this.activeMarkers.delete(markerId);
    
    // Update focus if lost marker was focused
    if (this.focusedMarkerId === markerId) {
      this.updateFocus();
    }

    this.notifyListeners();
  }

  /**
   * Update focused marker based on priority
   */
  private updateFocus(): void {
    if (this.activeMarkers.size === 0) {
      this.focusedMarkerId = null;
      return;
    }

    // Get highest priority active marker
    const sortedMarkers = Array.from(this.activeMarkers.values())
      .sort((a, b) => {
        // Sort by priority first, then by detection time
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.detectedAt - b.detectedAt;
      });

    this.focusedMarkerId = sortedMarkers[0].id;
  }

  /**
   * Manually set focused marker
   */
  setFocus(markerId: string | null): void {
    if (markerId && !this.activeMarkers.has(markerId)) {
      console.warn(`Cannot focus inactive marker: ${markerId}`);
      return;
    }

    this.focusedMarkerId = markerId;
    this.notifyListeners();
  }

  /**
   * Get current multi-marker state
   */
  getState(): MultiMarkerState {
    return {
      activeMarkers: Array.from(this.activeMarkers.values()),
      focusedMarkerId: this.focusedMarkerId,
      activeCount: this.activeMarkers.size,
      totalMarkers: this.stateMachines.size
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: MultiMarkerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Get specific marker state machine
   */
  getMarkerStateMachine(markerId: string): MarkerStateMachine | undefined {
    return this.stateMachines.get(markerId);
  }

  /**
   * Check if marker is currently active (tracking)
   */
  isMarkerActive(markerId: string): boolean {
    return this.activeMarkers.has(markerId);
  }

  /**
   * Check if marker is currently focused
   */
  isMarkerFocused(markerId: string): boolean {
    return this.focusedMarkerId === markerId;
  }

  /**
   * Get all active marker IDs
   */
  getActiveMarkerIds(): string[] {
    return Array.from(this.activeMarkers.keys());
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.stateMachines.forEach(sm => sm.reset());
    this.activeMarkers.clear();
    this.focusedMarkerId = null;
    this.notifyListeners();
  }
}

export interface MultiMarkerState {
  activeMarkers: ActiveMarker[];
  focusedMarkerId: string | null;
  activeCount: number;
  totalMarkers: number;
}

// Singleton instance
export const multiMarkerStateManager = new MultiMarkerStateManager();
```

### Pattern 3: Multi-Marker React Hooks

#### useMultiMarker Hook
```typescript
// src/hooks/useMultiMarker.ts
import { useState, useEffect, useCallback } from 'react';
import { multiMarkerStateManager, MultiMarkerState } from '../lib/multi-marker-state';
import { markerRegistry } from '../config/marker-config';

export function useMultiMarker() {
  const [state, setState] = useState<MultiMarkerState>(
    multiMarkerStateManager.getState()
  );

  useEffect(() => {
    // Initialize markers
    const markerIds = markerRegistry.getAllIds();
    multiMarkerStateManager.initializeMarkers(markerIds);

    // Subscribe to state changes
    const unsubscribe = multiMarkerStateManager.subscribe(setState);

    return () => {
      unsubscribe();
      multiMarkerStateManager.reset();
    };
  }, []);

  const setFocus = useCallback((markerId: string | null) => {
    multiMarkerStateManager.setFocus(markerId);
  }, []);

  const isMarkerActive = useCallback((markerId: string) => {
    return multiMarkerStateManager.isMarkerActive(markerId);
  }, [state.activeMarkers]); // Re-memoize when active markers change

  const isMarkerFocused = useCallback((markerId: string) => {
    return multiMarkerStateManager.isMarkerFocused(markerId);
  }, [state.focusedMarkerId]);

  return {
    activeMarkers: state.activeMarkers,
    focusedMarkerId: state.focusedMarkerId,
    activeCount: state.activeCount,
    totalMarkers: state.totalMarkers,
    setFocus,
    isMarkerActive,
    isMarkerFocused
  };
}
```

#### useFocusedMarker Hook
```typescript
// src/hooks/useFocusedMarker.ts
import { useState, useEffect } from 'react';
import { multiMarkerStateManager } from '../lib/multi-marker-state';
import { markerRegistry } from '../config/marker-config';
import type { MarkerDefinition } from '../config/marker-config';

/**
 * Hook that returns the currently focused marker definition
 */
export function useFocusedMarker(): MarkerDefinition | null {
  const [focusedMarker, setFocusedMarker] = useState<MarkerDefinition | null>(null);

  useEffect(() => {
    const unsubscribe = multiMarkerStateManager.subscribe((state) => {
      if (state.focusedMarkerId) {
        const marker = markerRegistry.getById(state.focusedMarkerId);
        setFocusedMarker(marker || null);
      } else {
        setFocusedMarker(null);
      }
    });

    return unsubscribe;
  }, []);

  return focusedMarker;
}
```

### Pattern 4: Multi-Marker UI Components

#### Multi-Marker Dashboard
```typescript
// src/components/MultiMarkerDashboard.tsx
import { useMultiMarker, useFocusedMarker } from '../hooks/useMultiMarker';
import { markerRegistry } from '../config/marker-config';

export function MultiMarkerDashboard() {
  const { 
    activeMarkers, 
    focusedMarkerId, 
    activeCount, 
    totalMarkers,
    setFocus 
  } = useMultiMarker();
  
  const focusedMarker = useFocusedMarker();

  return (
    <div className="multi-marker-dashboard">
      {/* Status Overview */}
      <div className="status-bar">
        <span>Active: {activeCount}/{totalMarkers}</span>
        {focusedMarkerId && (
          <span>Focused: {focusedMarker?.metadata.title}</span>
        )}
      </div>

      {/* Focused Marker Content */}
      {focusedMarker && (
        <div className="focused-content">
          <h2>{focusedMarker.metadata.title}</h2>
          <p>{focusedMarker.metadata.description}</p>
          <div className="tags">
            {focusedMarker.metadata.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* Active Markers List */}
      <div className="active-markers-list">
        <h3>Active Markers</h3>
        <ul>
          {activeMarkers.map(marker => {
            const definition = markerRegistry.getById(marker.id);
            const isFocused = marker.id === focusedMarkerId;

            return (
              <li 
                key={marker.id}
                className={isFocused ? 'focused' : ''}
                onClick={() => setFocus(marker.id)}
              >
                <span className="title">{definition?.metadata.title}</span>
                <span className="priority">Priority: {marker.priority}</span>
                {isFocused && <span className="badge">FOCUSED</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {/* No Active Markers State */}
      {activeCount === 0 && (
        <div className="no-markers">
          <p>No markers detected. Point camera at a flashcard.</p>
        </div>
      )}
    </div>
  );
}
```

#### Flashcard Grid with Multi-Marker Support
```typescript
// src/components/FlashcardGrid.tsx
import { useMultiMarker } from '../hooks/useMultiMarker';
import { markerRegistry } from '../config/marker-config';

export function FlashcardGrid({ category }: { category?: string }) {
  const { isMarkerActive, isMarkerFocused } = useMultiMarker();

  const markers = category 
    ? markerRegistry.getByCategory(category)
    : Array.from(markerRegistry.getAllIds()).map(id => markerRegistry.getById(id)!);

  return (
    <div className="flashcard-grid">
      {markers.map(marker => {
        const isActive = isMarkerActive(marker.id);
        const isFocused = isMarkerFocused(marker.id);

        return (
          <div 
            key={marker.id}
            className={`flashcard-card ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
          >
            <h3>{marker.metadata.title}</h3>
            <p>{marker.metadata.description}</p>
            
            <div className="status-indicators">
              {isActive && <span className="badge active">TRACKING</span>}
              {isFocused && <span className="badge focused">FOCUSED</span>}
            </div>

            <div className="difficulty">
              Difficulty: {marker.metadata.difficulty}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Pattern 5: Performance Optimization

#### Marker Pooling Strategy
```typescript
// src/lib/marker-pool.ts

export interface MarkerPoolConfig {
  maxActive: number;        // Maximum markers to track simultaneously
  activationRadius: number; // Distance threshold for activation
  preloadCount: number;     // Number of markers to preload
}

export class MarkerPool {
  private config: MarkerPoolConfig;
  private activeSet: Set<string> = new Set();
  private preloadedSet: Set<string> = new Set();

  constructor(config: MarkerPoolConfig = {
    maxActive: 5,
    activationRadius: 2.0,
    preloadCount: 10
  }) {
    this.config = config;
  }

  /**
   * Determine which markers should be active based on priority and capacity
   */
  updateActiveSet(candidates: string[], priorities: Map<string, number>): string[] {
    // Sort candidates by priority
    const sorted = candidates
      .sort((a, b) => (priorities.get(b) || 0) - (priorities.get(a) || 0))
      .slice(0, this.config.maxActive);

    // Update active set
    this.activeSet.clear();
    sorted.forEach(id => this.activeSet.add(id));

    return sorted;
  }

  /**
   * Check if marker should be tracked
   */
  shouldTrack(markerId: string): boolean {
    return this.activeSet.has(markerId);
  }

  /**
   * Get active marker IDs
   */
  getActiveMarkers(): string[] {
    return Array.from(this.activeSet);
  }

  /**
   * Preload marker assets
   */
  async preloadMarkers(markerIds: string[]): Promise<void> {
    const toPreload = markerIds.slice(0, this.config.preloadCount);
    
    await Promise.all(
      toPreload.map(async id => {
        // Preload marker .mind file and associated assets
        await this.preloadMarkerAssets(id);
        this.preloadedSet.add(id);
      })
    );
  }

  private async preloadMarkerAssets(markerId: string): Promise<void> {
    const marker = markerRegistry.getById(markerId);
    if (!marker) return;

    // Preload logic here (images, 3D models, etc.)
    // Example: fetch and cache marker assets
  }
}

export const markerPool = new MarkerPool();
```

#### Performance Monitoring
```typescript
// src/lib/ar-performance.ts

export interface PerformanceMetrics {
  fps: number;
  activeMarkerCount: number;
  memoryUsage: number;
  trackingQuality: number;
  timestamp: number;
}

export class ARPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private monitoringInterval: number | null = null;

  /**
   * Start performance monitoring
   */
  start(intervalMs: number = 1000): void {
    if (this.monitoringInterval) {
      console.warn('Performance monitoring already started');
      return;
    }

    this.monitoringInterval = window.setInterval(() => {
      this.recordMetrics();
    }, intervalMs);
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Record current performance metrics
   */
  private recordMetrics(): void {
    const scene = document.querySelector('a-scene') as any;
    
    const metrics: PerformanceMetrics = {
      fps: scene?.renderStarted ? (1000 / (scene.renderer?.info?.render?.fps || 60)) : 0,
      activeMarkerCount: multiMarkerStateManager.getState().activeCount,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      trackingQuality: this.calculateTrackingQuality(),
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    // Limit history size
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);
  }

  /**
   * Calculate overall tracking quality
   */
  private calculateTrackingQuality(): number {
    const state = multiMarkerStateManager.getState();
    
    if (state.activeCount === 0) return 1.0;

    // Quality decreases with more active markers
    const markerPenalty = Math.max(0, 1 - (state.activeCount * 0.1));
    
    return markerPenalty;
  }

  /**
   * Check performance thresholds and emit warnings
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    if (metrics.fps < 20) {
      console.warn('Low FPS detected:', metrics.fps);
      this.emitPerformanceWarning('low-fps', metrics);
    }

    if (metrics.activeMarkerCount > 5) {
      console.warn('High marker count:', metrics.activeMarkerCount);
      this.emitPerformanceWarning('high-marker-count', metrics);
    }

    if (metrics.memoryUsage > 500 * 1024 * 1024) { // 500MB
      console.warn('High memory usage:', metrics.memoryUsage);
      this.emitPerformanceWarning('high-memory', metrics);
    }
  }

  /**
   * Emit performance warning event
   */
  private emitPerformanceWarning(type: string, metrics: PerformanceMetrics): void {
    window.dispatchEvent(new CustomEvent('ar:performanceWarning', {
      detail: { type, metrics }
    }));
  }

  /**
   * Get average FPS
   */
  getAverageFPS(): number {
    if (this.metrics.length === 0) return 0;
    
    const sum = this.metrics.reduce((acc, m) => acc + m.fps, 0);
    return sum / this.metrics.length;
  }

  /**
   * Get metrics history
   */
  getHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metrics = [];
  }
}

export const arPerformanceMonitor = new ARPerformanceMonitor();
```

## Best Practices

### Marker Count Recommendations
- **1-3 markers**: Excellent performance, recommended for most use cases
- **4-5 markers**: Good performance, suitable for interactive experiences
- **6-10 markers**: Moderate performance, may require optimization
- **11-18 markers**: Performance-sensitive, thorough testing required
- **18+ markers**: Experimental, not recommended for production

### Priority Management
```typescript
// Priority guidelines
const PRIORITY_LEVELS = {
  CRITICAL: 10,     // Tutorial markers, important instructions
  HIGH: 8-9,        // Core content markers
  MEDIUM: 5-7,      // Supporting content
  LOW: 1-4,         // Optional, supplementary content
  BACKGROUND: 0     // Decorative, non-interactive
};
```

### Performance Optimization Checklist
- [ ] Limit `maxTrack` to 3-5 markers
- [ ] Implement marker pooling for large sets
- [ ] Throttle tracking update events (100ms minimum)
- [ ] Use distance-based culling for distant markers
- [ ] Preload marker assets during initialization
- [ ] Monitor FPS and adjust `maxTrack` dynamically
- [ ] Optimize 3D content per marker (<10k triangles)
- [ ] Compress textures (max 1024x1024px)

### Testing Multi-Marker Systems
```typescript
// Test scenarios
const MULTI_MARKER_TESTS = [
  'Single marker detection',
  '2 markers simultaneously',
  '3 markers simultaneously',
  'Rapid marker switching (1 marker in view at a time)',
  'Priority override (high priority marker enters)',
  'Focus persistence (user manually sets focus)',
  'Performance with maximum markers (stress test)'
];
```

## Troubleshooting

### Multiple Markers Not Detecting
1. Check `maxTrack` parameter is set high enough (3-5)
2. Verify all markers compiled in single .mind file
3. Confirm targetIndex matches marker order in .mind file
4. Test markers individually to verify quality

### Performance Degradation with Multiple Markers
1. Reduce `maxTrack` to 3
2. Implement marker pooling to limit active set
3. Throttle tracking update events more aggressively
4. Simplify 3D content per marker
5. Monitor FPS and adjust dynamically

### Focus Management Not Working
1. Check priority values are correctly set
2. Verify MultiMarkerStateManager is initialized
3. Confirm event listeners are properly attached
4. Test manual focus override functionality

### State Desync Across Markers
1. Ensure each marker has independent state machine
2. Verify event markerId matches registry
3. Check for race conditions in state transitions
4. Add logging to trace state changes

## Additional Resources

- **MindAR Multi-Marker Examples**: https://github.com/hiukim/mind-ar-js/tree/master/examples
- **Connected Environments AR Cards**: https://connected-environments.org/blog/2020-01-13-ar-playing-cards/ (18 marker example)
- **Performance Optimization**: https://aframe.io/docs/1.4.0/introduction/best-practices.html

---

**Congratulations!** You've completed all four AR skills. You now have comprehensive knowledge of:
1. MindAR integration and marker compilation
2. AR state machine patterns
3. Event-driven AR architecture
4. Multi-target tracking systems

You're ready to build sophisticated, performant multi-marker AR experiences for educational flashcard systems and beyond!
