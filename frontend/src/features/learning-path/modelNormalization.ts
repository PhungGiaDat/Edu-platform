/**
 * modelNormalization.ts
 *
 * Loaded GLB models have whatever dimensions their author gave them — a
 * hardcoded `scale = 0.55` is a guess that breaks the moment the model
 * changes. These are pure, unit-testable helpers; the Three.js-specific
 * caller (PetGuide's PetModel) measures a THREE.Box3 and passes plain
 * numbers in.
 */

/** Scale factor that makes `sourceHeight` become `targetHeight`. */
export function computeNormalizationScale(sourceHeight: number, targetHeight: number): number {
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) return 1;
  return targetHeight / sourceHeight;
}

/**
 * Offset to apply (in the same, already-scaled space the box was measured
 * in) so the model's horizontal center sits at the local origin and its
 * lowest point sits at y = 0 ("feet on the ground").
 */
export function computeGroundedOffset(centerX: number, minY: number, centerZ: number): { x: number; y: number; z: number } {
  // `|| 0` normalizes -0 to 0 (e.g. -centerX when centerX is exactly 0) so
  // equality checks/snapshots don't trip over a sign bit nobody cares about.
  return { x: -centerX || 0, y: -minY || 0, z: -centerZ || 0 };
}
