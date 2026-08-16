// frontend-web/src/runtime/PositionCalculator.ts

export interface MarkerPosition {
  markerId: string;
  x: number;
  y: number;
  z: number;
}

export interface ComboPositionOptions {
  offsetY?: number;      // Vertical offset from markers (default: 0.5)
  scale?: number;         // Scale factor (default: 1.0)
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
