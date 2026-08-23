import * as THREE from 'three';

/**
 * Creates a CatmullRom spline curve for the 3D learning path.
 * Generates an S-curve path with amplitude 4 and depth -40 units.
 */
export function createPathSpline(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];

  // Generate S-curve control points
  // Amplitude: 4 units lateral, Depth: -40 units
  const amplitude = 4;
  const depth = -40;
  const numSegments = 20;

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const x = Math.sin(t * Math.PI * 2) * amplitude;
    const y = 0; // Flat path at y=0
    const z = t * depth;
    points.push(new THREE.Vector3(x, y, z));
  }

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

/**
 * Gets a point on the spline at the given progress (0-1).
 */
export function getPointOnSpline(
  spline: THREE.CatmullRomCurve3,
  progress: number
): THREE.Vector3 {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return spline.getPointAt(clampedProgress);
}

/**
 * Gets the tangent vector on the spline at the given progress (0-1).
 * The tangent points in the direction of travel along the path.
 */
export function getTangentOnSpline(
  spline: THREE.CatmullRomCurve3,
  progress: number
): THREE.Vector3 {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return spline.getTangentAt(clampedProgress);
}
