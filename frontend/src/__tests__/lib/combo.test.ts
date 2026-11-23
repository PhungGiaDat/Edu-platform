// frontend-web/src/__tests__/lib/combo.test.ts
import { describe, test, expect } from 'vitest';
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
