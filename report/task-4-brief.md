# Task 4: Create React Hooks

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\src`

## Task Overview
Create React hooks for the Dual-Display AR Combo System:
- `hooks/useDualDisplay.ts` - Main hook for dual display state
- `hooks/usePerformanceMonitor.ts` - Performance threshold hook
- `hooks/useComboDetection.ts` - Combo detection hook

## Global Constraints
- Uses Zustand stores from Task 2
- Uses runtime managers from Task 3
- React 18+ patterns

## Files to Create

### 1. `frontend-web/src/hooks/useDualDisplay.ts`
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

### 2. `frontend-web/src/hooks/usePerformanceMonitor.ts`
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

### 3. `frontend-web/src/hooks/useComboDetection.ts`
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

## Steps
1. Create `hooks/useDualDisplay.ts`
2. Create `hooks/usePerformanceMonitor.ts`
3. Create `hooks/useComboDetection.ts`
4. Run TypeScript compilation to verify no errors

## Dependencies
- Task 1 complete: `lib/combo/` imports
- Task 2 complete: `stores/` imports
- Task 3 complete: `runtime/` imports

## Output
- Status: DONE when all files created and TypeScript compiles
- Report file: `report/task-4-report.md`
