# Task 5: Integrate with ARContainerV2

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\src\components\ar\ARContainerV2.tsx`

## Task Overview
Integrate the Dual-Display AR Combo System with the existing ARContainerV2 component.

## Global Constraints
- Must work with existing ARContainerV2 structure
- Uses existing event bus patterns
- Maintains backward compatibility

## Integration Steps

### Step 1: Add new imports
Add to the imports section (around line 8-17):
```typescript
import { useDualDisplay } from '@/hooks/useDualDisplay';
import { useComboDetection } from '@/hooks/useComboDetection';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { dualDisplayManager } from '@/runtime/DualDisplayManager';
```

### Step 2: Add new props for combo detection
Add to the ARContainerV2Props interface (around line 23-51):
```typescript
// Add new props
enableComboDetection?: boolean;      // Default: true
onComboActivated?: (combo: ComboDefinition) => void;
onComboDeactivated?: () => void;
onDualDisplayModeChange?: (mode: 'single' | 'dual' | 'combo') => void;
```

Note: Import ComboDefinition from '@/lib/combo/types'.

### Step 3: Add hook usage inside component body
Add inside the ARContainerV2 component function body (around line 107):
```typescript
// Dual display hooks
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

### Step 4: Update COMBO_DETECTED handler
Update the existing COMBO_DETECTED case (around line 389-396) to integrate with dual display manager:
```typescript
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

### Step 5: Update TARGET_FOUND handler
Update the existing TARGET_FOUND case (around line 358-367) to integrate with dual display manager:
```typescript
case 'TARGET_FOUND': {
  const data = payload as ARMessagePayloadMap['TARGET_FOUND'];
  emitDebug('PARENT_TARGET_FOUND', {
    targetIndex: data.targetIndex,
    fromPiP,
    phase
  });
  cbFound?.(data.targetIndex);
  eventBus.emit(AREvent.MARKER_FOUND, { markerId: `target-${data.targetIndex}`, target: null } as any);
  
  // Also notify dual display manager
  dualDisplayManager.onMarkerFound(`target-${data.targetIndex}`);
  break;
}
```

### Step 6: Update TARGET_LOST handler
Update the existing TARGET_LOST case (around line 370-379) to integrate with dual display manager:
```typescript
case 'TARGET_LOST': {
  const data = payload as ARMessagePayloadMap['TARGET_LOST'];
  emitDebug('PARENT_TARGET_LOST', {
    targetIndex: data.targetIndex,
    fromPiP,
    phase
  });
  cbLost?.(data.targetIndex);
  eventBus.emit(AREvent.MARKER_LOST, { markerId: `target-${data.targetIndex}` } as any);
  
  // Also notify dual display manager
  dualDisplayManager.onMarkerLost(`target-${data.targetIndex}`);
  break;
}
```

### Step 7: Add debug overlay (optional)
Add before the closing `return (` statement (around line 512):
```typescript
// Debug overlay for development
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

## Dependencies
- Task 1 complete: `lib/combo/`
- Task 2 complete: `stores/`
- Task 3 complete: `runtime/`
- Task 4 complete: `hooks/`

## Output
- Modified ARContainerV2.tsx with dual-display integration
- Report file: `report/task-5-report.md`
