# Task 7: Testing & Verification

**Project:** Edu-platform AR Flashcard System
**Location:** `e:\University\Graduted Project\Edu-platform\frontend-web\src`

## Task Overview
Create and run unit tests for the Dual-Display AR Combo System components.

## Global Constraints
- Jest testing framework
- TypeScript strict mode
- Tests must be runnable via `npm test`

## Files to Create

### 1. `frontend-web/src/__tests__/runtime/PositionCalculator.test.ts`
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
  
  test('calculateCenter with 3 markers', () => {
    const markers = [
      { markerId: 'm1', x: 0, y: 0, z: 0 },
      { markerId: 'm2', x: 2, y: 0, z: 2 },
      { markerId: 'm3', x: 4, y: 1, z: 4 },
    ];
    
    const center = PositionCalculator.calculateCenter(markers);
    
    expect(center.x).toBe(2); // (0+2+4)/3
    expect(center.y).toBe(1); // (0+0+1)/3 + 0.5
    expect(center.z).toBe(2); // (0+2+4)/3
  });
  
  test('calculateComboPosition with two markers', () => {
    const marker1 = { markerId: 'm1', x: 0, y: 0, z: 0 };
    const marker2 = { markerId: 'm2', x: 2, y: 0, z: 2 };
    
    const result = PositionCalculator.calculateComboPosition(marker1, marker2);
    
    expect(result.position.x).toBe(1);
    expect(result.position.y).toBe(0.3); // max(0,0) + 0.3
    expect(result.position.z).toBe(1);
    expect(result.scale).toBe(1);
  });
  
  test('interpolate position', () => {
    const from = { markerId: 'm1', x: 0, y: 0, z: 0 };
    const to = { markerId: 'm2', x: 2, y: 4, z: 6 };
    
    const result = PositionCalculator.interpolate(from, to, 0.5);
    
    expect(result.x).toBe(1);
    expect(result.y).toBe(2);
    expect(result.z).toBe(3);
    expect(result.markerId).toBe('m2');
  });
});
```

### 2. `frontend-web/src/__tests__/lib/combo.test.ts`
```typescript
// frontend-web/src/__tests__/lib/combo.test.ts
import { getComboByTags, getCombosForTag, COMBO_DB } from '@/lib/combo';

describe('Combo Database', () => {
  test('COMBO_DB has 5 combos', () => {
    expect(COMBO_DB.length).toBe(5);
  });
  
  test('getComboByTags finds elephant-banana combo', () => {
    const result = getComboByTags(['elephant', 'banana']);
    
    expect(result.found).toBe(true);
    expect(result.combo?.combo_id).toBe('elephant-banana');
    expect(result.combo?.name).toBe('Elephant Eating Banana');
  });
  
  test('getComboByTags finds dog-bone combo', () => {
    const result = getComboByTags(['dog', 'bone']);
    
    expect(result.found).toBe(true);
    expect(result.combo?.combo_id).toBe('dog-bone');
  });
  
  test('getComboByTags returns false for non-combo markers', () => {
    const result = getComboByTags(['elephant', 'tree']);
    
    expect(result.found).toBe(false);
  });
  
  test('getComboByTags is order independent', () => {
    const result1 = getComboByTags(['banana', 'elephant']);
    const result2 = getComboByTags(['elephant', 'banana']);
    
    expect(result1.found).toBe(true);
    expect(result2.found).toBe(true);
    expect(result1.combo?.combo_id).toBe(result2.combo?.combo_id);
  });
  
  test('getCombosForTag returns combos for elephant', () => {
    const combos = getCombosForTag('elephant');
    
    expect(combos.length).toBeGreaterThan(0);
    expect(combos.some(c => c.combo_id === 'elephant-banana')).toBe(true);
  });
  
  test('getCombosForTag returns empty for unknown tag', () => {
    const combos = getCombosForTag('unknown');
    
    expect(combos.length).toBe(0);
  });
});
```

## Steps
1. Create directory `frontend-web/src/__tests__/runtime/`
2. Create directory `frontend-web/src/__tests__/lib/`
3. Create `PositionCalculator.test.ts`
4. Create `combo.test.ts`
5. Run tests with `cd frontend-web && npm test -- --testPathPattern="PositionCalculator|combo"`

## Dependencies
- All previous tasks must be complete

## Output
- Status: DONE when all tests pass
- Report file: `report/task-7-report.md`
