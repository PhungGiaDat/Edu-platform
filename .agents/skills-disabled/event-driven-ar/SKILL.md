---
name: event-driven-ar
description: Migrated OpenCode skill `event-driven-ar`. Use when working on event-driven ar architecture skill guidance, patterns, or implementation details.
---

# Event-Driven AR Architecture Skill

## Overview
This skill teaches event-driven architecture patterns for building clean, decoupled communication between AR engines (A-Frame/MindAR) and React UI layers. Master the CustomEvent API, implement the useEvent hook pattern, and create robust pub/sub systems for AR applications.

## When to Use This Skill
- Bridging imperative AR engines with declarative React components
- Avoiding prop drilling and callback chains in AR applications
- Building scalable multi-marker AR systems with independent components
- Implementing real-time AR event notifications (marker found/lost, tracking updates)
- Creating reusable AR event hooks for component libraries
- Coordinating state changes across disconnected component trees

## Prerequisites
- Completion of `mindar-integration` skill (MindAR basics)
- Understanding of browser CustomEvent API
- React hooks proficiency (useState, useEffect, useCallback)
- Basic pub/sub pattern knowledge

## Core Concepts

### Why Event-Driven Architecture for AR?

**The Problem:**
AR engines (A-Frame/MindAR) are imperative systems that directly manipulate DOM and WebGL, while React is declarative. Direct coupling creates:
- Tight dependencies between AR engine and UI components
- Prop drilling through multiple component layers
- Callback chains that are hard to maintain
- Difficulty testing AR interactions in isolation
- Performance issues from unnecessary re-renders

**The Solution:**
Event-driven architecture using browser's native CustomEvent API:
```
AR Engine (A-Frame) → CustomEvent → Event Bus (window) → React Hooks → UI Components
```

**Benefits:**
1. **Decoupling**: AR engine and React components don't know about each other
2. **Scalability**: Easy to add new listeners without modifying AR engine
3. **Testability**: Can mock events for testing without AR hardware
4. **Performance**: Components only re-render when subscribed events fire
5. **Maintainability**: Clear separation of concerns

### Event Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AR Engine Layer                          │
│  (A-Frame Components + MindAR)                              │
│                                                              │
│  • Marker Detection                                         │
│  • Tracking Updates                                         │
│  • Position/Rotation Data                                   │
└──────────────────┬───────────────────────────────────────────┘
                   │ Emits CustomEvents
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Event Bus (window)                        │
│                                                              │
│  • ar:ready                                                 │
│  • ar:markerFound                                           │
│  • ar:markerLost                                            │
│  • ar:trackingUpdate                                        │
│  • ar:error                                                 │
└──────────────────┬───────────────────────────────────────────┘
                   │ Dispatches to Subscribers
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   React Hooks Layer                          │
│  (useEvent, useARMarker, useARScene)                        │
│                                                              │
│  • Subscribe to specific events                             │
│  • Transform event data for components                      │
│  • Manage lifecycle and cleanup                             │
└──────────────────┬───────────────────────────────────────────┘
                   │ Provides State/Callbacks
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                  React Component Layer                       │
│  (UI, Overlays, Flashcard Content)                          │
│                                                              │
│  • Render based on AR state                                 │
│  • Handle user interactions                                 │
│  • Display AR content and feedback                          │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Patterns

### Pattern 1: CustomEvent Foundation

#### Basic Event Publishing
```typescript
// src/lib/ar-event-emitter.ts

export interface AREventDetail<T = any> {
  timestamp: number;
  data: T;
}

export class AREventEmitter {
  /**
   * Emit a custom AR event
   * @param eventName - Name of the event (use namespace prefix like 'ar:')
   * @param data - Event payload data
   */
  static emit<T = any>(eventName: string, data: T): void {
    const event = new CustomEvent(eventName, {
      detail: {
        timestamp: Date.now(),
        data
      } as AREventDetail<T>,
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(event);
  }

  /**
   * Subscribe to AR events
   * @param eventName - Event to listen for
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  static on<T = any>(
    eventName: string,
    handler: (detail: AREventDetail<T>) => void
  ): () => void {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<AREventDetail<T>>;
      handler(customEvent.detail);
    };

    window.addEventListener(eventName, listener);

    // Return cleanup function
    return () => {
      window.removeEventListener(eventName, listener);
    };
  }

  /**
   * One-time event listener
   * @param eventName - Event to listen for
   * @param handler - Callback function
   */
  static once<T = any>(
    eventName: string,
    handler: (detail: AREventDetail<T>) => void
  ): void {
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<AREventDetail<T>>;
      handler(customEvent.detail);
      window.removeEventListener(eventName, listener);
    };

    window.addEventListener(eventName, listener);
  }
}
```

#### Event Type Definitions
```typescript
// src/types/ar-events.ts

export interface MarkerFoundEvent {
  markerId: string;
  targetIndex: number;
  confidence: number;
}

export interface MarkerLostEvent {
  markerId: string;
  targetIndex: number;
  trackingDuration: number;
}

export interface TrackingUpdateEvent {
  markerId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  confidence: number;
}

export interface ARReadyEvent {
  markerCount: number;
  cameraResolution: { width: number; height: number };
}

export interface ARErrorEvent {
  code: string;
  message: string;
  recoverable: boolean;
}

// Event name constants
export const AR_EVENTS = {
  READY: 'ar:ready',
  ERROR: 'ar:error',
  MARKER_FOUND: 'ar:markerFound',
  MARKER_LOST: 'ar:markerLost',
  TRACKING_UPDATE: 'ar:trackingUpdate',
  SCENE_LOADED: 'ar:sceneLoaded',
  CAMERA_PERMISSION: 'ar:cameraPermission'
} as const;
```

### Pattern 2: AR Engine Event Bridge

#### A-Frame to CustomEvent Bridge
```typescript
// src/lib/ar-event-bridge.ts
import { AREventEmitter } from './ar-event-emitter';
import { AR_EVENTS } from '../types/ar-events';
import type { MarkerFoundEvent, MarkerLostEvent, TrackingUpdateEvent } from '../types/ar-events';

export class AREventBridge {
  private markerMap: Map<number, string> = new Map();
  private trackingStartTimes: Map<string, number> = new Map();
  private isInitialized = false;

  /**
   * Initialize the event bridge
   * @param markers - Map of targetIndex to markerId
   */
  initialize(markers: Record<number, string>): void {
    if (this.isInitialized) {
      console.warn('AREventBridge already initialized');
      return;
    }

    // Build marker map
    Object.entries(markers).forEach(([index, id]) => {
      this.markerMap.set(Number(index), id);
    });

    this.attachSceneListeners();
    this.attachMarkerListeners();
    this.isInitialized = true;
  }

  /**
   * Attach listeners to A-Frame scene
   */
  private attachSceneListeners(): void {
    const scene = document.querySelector('a-scene');
    
    if (!scene) {
      console.error('A-Frame scene not found');
      return;
    }

    // AR Ready event
    scene.addEventListener('arReady', () => {
      AREventEmitter.emit(AR_EVENTS.READY, {
        markerCount: this.markerMap.size,
        cameraResolution: this.getCameraResolution()
      });
    });

    // AR Error event
    scene.addEventListener('arError', (event: any) => {
      AREventEmitter.emit(AR_EVENTS.ERROR, {
        code: event.detail?.code || 'UNKNOWN_ERROR',
        message: event.detail?.message || 'An AR error occurred',
        recoverable: event.detail?.recoverable ?? false
      });
    });
  }

  /**
   * Attach listeners to marker entities
   */
  private attachMarkerListeners(): void {
    this.markerMap.forEach((markerId, targetIndex) => {
      const entity = document.querySelector(
        `a-entity[mindar-image-target="targetIndex: ${targetIndex}"]`
      );

      if (!entity) {
        console.warn(`Marker entity not found for targetIndex: ${targetIndex}`);
        return;
      }

      // Marker Found
      entity.addEventListener('targetFound', () => {
        this.trackingStartTimes.set(markerId, Date.now());

        AREventEmitter.emit<MarkerFoundEvent>(AR_EVENTS.MARKER_FOUND, {
          markerId,
          targetIndex,
          confidence: this.getTrackingConfidence(entity)
        });
      });

      // Marker Lost
      entity.addEventListener('targetLost', () => {
        const startTime = this.trackingStartTimes.get(markerId) || Date.now();
        const trackingDuration = Date.now() - startTime;
        this.trackingStartTimes.delete(markerId);

        AREventEmitter.emit<MarkerLostEvent>(AR_EVENTS.MARKER_LOST, {
          markerId,
          targetIndex,
          trackingDuration
        });
      });

      // Tracking Updates (throttled)
      this.setupTrackingUpdates(entity, markerId, targetIndex);
    });
  }

  /**
   * Setup throttled tracking updates
   */
  private setupTrackingUpdates(
    entity: Element,
    markerId: string,
    targetIndex: number
  ): void {
    const THROTTLE_MS = 100; // Update every 100ms
    let lastUpdate = 0;

    const updateTracking = () => {
      const now = Date.now();
      
      if (now - lastUpdate < THROTTLE_MS) {
        return;
      }

      lastUpdate = now;

      const object3D = (entity as any).object3D;
      if (!object3D) return;

      AREventEmitter.emit<TrackingUpdateEvent>(AR_EVENTS.TRACKING_UPDATE, {
        markerId,
        position: {
          x: object3D.position.x,
          y: object3D.position.y,
          z: object3D.position.z
        },
        rotation: {
          x: object3D.rotation.x,
          y: object3D.rotation.y,
          z: object3D.rotation.z
        },
        scale: {
          x: object3D.scale.x,
          y: object3D.scale.y,
          z: object3D.scale.z
        },
        confidence: this.getTrackingConfidence(entity)
      });
    };

    // Update on animation frame when marker is tracking
    const animate = () => {
      if (this.trackingStartTimes.has(markerId)) {
        updateTracking();
      }
      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Get tracking confidence (placeholder - actual implementation depends on MindAR API)
   */
  private getTrackingConfidence(entity: Element): number {
    // In real implementation, get from MindAR tracking data
    return 0.95;
  }

  /**
   * Get camera resolution
   */
  private getCameraResolution(): { width: number; height: number } {
    const video = document.querySelector('video');
    return {
      width: video?.videoWidth || 1280,
      height: video?.videoHeight || 720
    };
  }

  /**
   * Cleanup event bridge
   */
  destroy(): void {
    this.markerMap.clear();
    this.trackingStartTimes.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const arEventBridge = new AREventBridge();
```

### Pattern 3: useEvent Hook

#### Generic useEvent Hook Implementation
```typescript
// src/hooks/useEvent.ts
import { useEffect, useCallback, useRef, useState } from 'react';
import type { AREventDetail } from '../lib/ar-event-emitter';

interface UseEventOptions<T> {
  enabled?: boolean;
  transform?: (data: T) => any;
}

/**
 * React hook for subscribing to CustomEvents
 * 
 * @param eventName - Name of the event to listen for
 * @param handler - Callback function when event fires
 * @param deps - Dependency array for handler
 * @param options - Additional options
 * 
 * @example
 * useEvent('ar:markerFound', (detail) => {
 *   console.log('Marker found:', detail.data.markerId);
 * }, []);
 */
export function useEvent<T = any>(
  eventName: string,
  handler: (detail: AREventDetail<T>) => void,
  deps: React.DependencyList = [],
  options: UseEventOptions<T> = {}
): void {
  const { enabled = true, transform } = options;
  
  // Memoize handler to avoid re-subscription
  const memoizedHandler = useCallback(handler, deps);

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<AREventDetail<T>>;
      const detail = transform 
        ? { ...customEvent.detail, data: transform(customEvent.detail.data) }
        : customEvent.detail;
      
      memoizedHandler(detail);
    };

    window.addEventListener(eventName, listener);

    return () => {
      window.removeEventListener(eventName, listener);
    };
  }, [eventName, memoizedHandler, enabled, transform]);
}

/**
 * Hook that returns event data as state
 * 
 * @param eventName - Name of the event to listen for
 * @param initialValue - Initial state value
 * 
 * @example
 * const markerData = useEventState('ar:markerFound', null);
 * if (markerData) {
 *   console.log('Latest marker:', markerData.markerId);
 * }
 */
export function useEventState<T = any>(
  eventName: string,
  initialValue: T | null = null
): T | null {
  const [data, setData] = useState<T | null>(initialValue);

  useEvent<T>(
    eventName,
    useCallback((detail) => {
      setData(detail.data);
    }, []),
    []
  );

  return data;
}

/**
 * Hook that accumulates event data in an array
 * 
 * @param eventName - Name of the event to listen for
 * @param maxSize - Maximum array size (oldest events removed first)
 * 
 * @example
 * const trackingHistory = useEventHistory('ar:trackingUpdate', 50);
 * console.log('Last 50 tracking updates:', trackingHistory);
 */
export function useEventHistory<T = any>(
  eventName: string,
  maxSize: number = 100
): T[] {
  const [history, setHistory] = useState<T[]>([]);

  useEvent<T>(
    eventName,
    useCallback((detail) => {
      setHistory(prev => {
        const newHistory = [detail.data, ...prev];
        return newHistory.slice(0, maxSize);
      });
    }, [maxSize]),
    [maxSize]
  );

  return history;
}
```

#### AR-Specific Event Hooks
```typescript
// src/hooks/useAREvents.ts
import { useCallback, useState } from 'react';
import { useEvent } from './useEvent';
import { AR_EVENTS } from '../types/ar-events';
import type { MarkerFoundEvent, MarkerLostEvent, TrackingUpdateEvent } from '../types/ar-events';

/**
 * Hook for tracking a specific marker
 */
export function useARMarker(markerId: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  // Listen for marker found
  useEvent<MarkerFoundEvent>(
    AR_EVENTS.MARKER_FOUND,
    useCallback((detail) => {
      if (detail.data.markerId === markerId) {
        setIsTracking(true);
        setLastSeen(detail.timestamp);
      }
    }, [markerId]),
    [markerId]
  );

  // Listen for marker lost
  useEvent<MarkerLostEvent>(
    AR_EVENTS.MARKER_LOST,
    useCallback((detail) => {
      if (detail.data.markerId === markerId) {
        setIsTracking(false);
      }
    }, [markerId]),
    [markerId]
  );

  // Listen for tracking updates
  useEvent<TrackingUpdateEvent>(
    AR_EVENTS.TRACKING_UPDATE,
    useCallback((detail) => {
      if (detail.data.markerId === markerId) {
        setPosition(detail.data.position);
      }
    }, [markerId]),
    [markerId]
  );

  return {
    isTracking,
    lastSeen,
    position,
    markerId
  };
}

/**
 * Hook for monitoring AR system status
 */
export function useARStatus() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEvent(
    AR_EVENTS.READY,
    useCallback(() => {
      setIsReady(true);
      setError(null);
    }, []),
    []
  );

  useEvent(
    AR_EVENTS.ERROR,
    useCallback((detail) => {
      setIsReady(false);
      setError(detail.data.message);
    }, []),
    []
  );

  return { isReady, error };
}
```

### Pattern 4: Event-Driven Component Architecture

#### Example: Flashcard AR Component
```typescript
// src/components/FlashcardAR.tsx
import { useARMarker } from '../hooks/useAREvents';
import { AREventEmitter } from '../lib/ar-event-emitter';

interface FlashcardARProps {
  flashcardId: string;
  content: {
    title: string;
    description: string;
    imageUrl: string;
  };
}

export function FlashcardAR({ flashcardId, content }: FlashcardARProps) {
  const { isTracking, lastSeen, position } = useARMarker(flashcardId);

  // Emit custom events for analytics
  useEffect(() => {
    if (isTracking) {
      AREventEmitter.emit('analytics:flashcardViewed', {
        flashcardId,
        timestamp: Date.now()
      });
    }
  }, [isTracking, flashcardId]);

  if (!isTracking) {
    return null; // Don't render when marker not tracked
  }

  return (
    <div className="flashcard-overlay" style={{
      opacity: isTracking ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div className="flashcard-content">
        <img src={content.imageUrl} alt={content.title} />
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        
        {position && (
          <div className="debug-info">
            Position: ({position.x.toFixed(2)}, {position.y.toFixed(2)}, {position.z.toFixed(2)})
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Example: AR Status Dashboard
```typescript
// src/components/ARDashboard.tsx
import { useARStatus, useEventHistory } from '../hooks/useAREvents';
import { AR_EVENTS } from '../types/ar-events';

export function ARDashboard() {
  const { isReady, error } = useARStatus();
  const recentEvents = useEventHistory(AR_EVENTS.MARKER_FOUND, 10);

  return (
    <div className="ar-dashboard">
      <div className="status">
        <h3>AR Status</h3>
        <p>Ready: {isReady ? '✅' : '❌'}</p>
        {error && <p className="error">Error: {error}</p>}
      </div>

      <div className="recent-events">
        <h3>Recent Detections</h3>
        <ul>
          {recentEvents.map((event, index) => (
            <li key={index}>
              {event.markerId} - Confidence: {(event.confidence * 100).toFixed(1)}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

## Best Practices

### Event Naming Conventions
```typescript
// ✅ GOOD: Namespace with prefix
'ar:markerFound'
'ar:trackingUpdate'
'analytics:flashcardViewed'

// ❌ BAD: No namespace (collisions possible)
'markerFound'
'update'
'viewed'
```

### Event Payload Structure
```typescript
// ✅ GOOD: Consistent structure with metadata
interface EventPayload<T> {
  timestamp: number;
  data: T;
  metadata?: {
    sessionId: string;
    version: string;
  };
}

// ❌ BAD: Inconsistent, no metadata
any
```

### Memory Management
```typescript
// ✅ GOOD: Always cleanup listeners
useEffect(() => {
  const unsubscribe = AREventEmitter.on('ar:markerFound', handler);
  return unsubscribe; // Cleanup on unmount
}, []);

// ❌ BAD: No cleanup (memory leak)
useEffect(() => {
  window.addEventListener('ar:markerFound', handler);
  // Missing cleanup!
}, []);
```

### Throttling High-Frequency Events
```typescript
// ✅ GOOD: Throttle tracking updates
let lastEmit = 0;
const THROTTLE_MS = 100;

if (Date.now() - lastEmit >= THROTTLE_MS) {
  AREventEmitter.emit('ar:trackingUpdate', data);
  lastEmit = Date.now();
}

// ❌ BAD: Emit on every frame (performance hit)
requestAnimationFrame(() => {
  AREventEmitter.emit('ar:trackingUpdate', data); // Too frequent!
});
```

## Testing Event-Driven AR

### Mock Event Emitter for Tests
```typescript
// src/__tests__/utils/mock-ar-events.ts
import { AREventEmitter } from '../../lib/ar-event-emitter';

export class MockAREventEmitter {
  static simulateMarkerFound(markerId: string) {
    AREventEmitter.emit('ar:markerFound', {
      markerId,
      targetIndex: 0,
      confidence: 0.95
    });
  }

  static simulateMarkerLost(markerId: string) {
    AREventEmitter.emit('ar:markerLost', {
      markerId,
      targetIndex: 0,
      trackingDuration: 5000
    });
  }

  static simulateARReady() {
    AREventEmitter.emit('ar:ready', {
      markerCount: 3,
      cameraResolution: { width: 1280, height: 720 }
    });
  }
}
```

### Component Test Example
```typescript
// src/__tests__/components/FlashcardAR.test.tsx
import { render, waitFor } from '@testing-library/react';
import { FlashcardAR } from '../../components/FlashcardAR';
import { MockAREventEmitter } from '../utils/mock-ar-events';

test('renders flashcard when marker tracked', async () => {
  const { container } = render(
    <FlashcardAR 
      flashcardId="flashcard-01"
      content={{ title: 'Test', description: 'Test card', imageUrl: '/test.png' }}
    />
  );

  // Initially not visible
  expect(container.querySelector('.flashcard-overlay')).toHaveStyle({ opacity: 0 });

  // Simulate marker detection
  MockAREventEmitter.simulateMarkerFound('flashcard-01');

  // Wait for component to update
  await waitFor(() => {
    expect(container.querySelector('.flashcard-overlay')).toHaveStyle({ opacity: 1 });
  });
});
```

## Troubleshooting

### Events Not Firing
1. Check event bridge is initialized: `arEventBridge.initialize(markerMap)`
2. Verify A-Frame scene is loaded before attaching listeners
3. Confirm event names match exactly (case-sensitive)
4. Check browser console for errors

### Memory Leaks from Event Listeners
1. Always return cleanup functions from useEffect
2. Use useCallback to memoize handlers
3. Verify listeners are removed on component unmount
4. Monitor memory usage in Chrome DevTools

### Events Firing Too Frequently
1. Implement throttling for high-frequency events (tracking updates)
2. Debounce rapid state changes (found/lost cycles)
3. Use requestAnimationFrame for render-related updates
4. Consider batching multiple events into single emission

## Additional Resources

- **MDN CustomEvent**: https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
- **Event-Driven React Article**: https://dev.to/nicolalc/event-driven-architecture-for-clean-react-component-communication-fph
- **Pub/Sub Pattern**: https://www.patterns.dev/posts/observer-pattern

---

**Next Steps:**
- Load `ar-state-machine` skill to integrate events with state management
- Load `multi-target-tracking` skill for coordinating events across multiple markers
- Explore RxJS for advanced reactive event streams
