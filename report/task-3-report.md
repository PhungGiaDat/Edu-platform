# Task 3 Report: Core Runtime Managers

**Status:** DONE

## Files Created

| File | Description |
|------|-------------|
| `frontend-web/src/runtime/PerformanceMonitor.ts` | FPS tracking, auto-clear unhealthy markers |
| `frontend-web/src/runtime/PositionCalculator.ts` | Calculate center position between markers |
| `frontend-web/src/runtime/ComboDetector.ts` | Check combo vs single display mode |
| `frontend-web/src/runtime/DualDisplayManager.ts` | Orchestrates all dual-display logic |

## TypeScript Compilation Result

```
npx tsc --noEmit
```

**Status:** ✅ PASSED

No TypeScript errors detected.

## Dependencies Verified

- Task 1: `lib/combo/` imports (getComboByTags, getCombosForTag, ComboDefinition, ComboResult)
- Task 2: `stores/` imports (useMarkerHealthStore, useDualDisplayStore)

## Architecture Summary

### PerformanceMonitor
- Tracks FPS via `requestAnimationFrame`
- Updates marker health store every second
- Auto-clears unhealthy markers after max load attempts or errors
- Configurable: targetFPS, minFPS, checkInterval, maxLoadAttempts, recoveryTime

### PositionCalculator
- `calculateCenter()`: Average position for 2+ markers
- `calculateComboPosition()`: Position between two markers with rotation
- `interpolate()`: Smooth position transitions

### ComboDetector
- Checks if active markers form a valid combo using combo database
- Updates dual display store with active combo
- Supports querying possible combos for a single marker

### DualDisplayManager
- Orchestrates all managers
- Handles marker found/lost events
- Manages display mode transitions (idle → single → dual/combo)
- Emits custom events: COMBO_ACTIVATED, COMBO_DEACTIVATED, MARKER_CLEARED

## Concerns

None - all files compile successfully with TypeScript strict mode.
