// frontend-web/src/__tests__/runtime/PositionCalculator.test.ts
import { describe, test, expect } from 'vitest';
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
    expect(center.y).toBeCloseTo(0.833, 3); // (0+0+1)/3 + 0.5
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
