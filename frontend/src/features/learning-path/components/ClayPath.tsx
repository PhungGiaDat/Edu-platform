/**
 * ClayPath.tsx
 *
 * Renders a stepping-stone path along the learning journey spline.
 * Sharp-edged staggered box "bricks" read as rough wooden planks; rounded
 * stone discs with a playful side-to-side rhythm read as an intentional,
 * child-friendly path instead.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createPathSpline } from '@/lib/pathSpline';
import type { LessonNode } from '@/types/learning-path';

// ========== Constants ==========

// Softer, less saturated warm stone tones — two shades lerped per-stone for
// organic variation instead of one flat, obviously-repeated material. The
// LESSON NODES must be the visually loudest thing in the scene, so the path
// stays quiet: muted tan, small, and sparse.
const STONE_COLOR_A = '#C9A27C';
const STONE_COLOR_B = '#B8916C';
const STONE_DONE_COLOR = '#F4C152';
const TRAIL_COLOR = '#D8C08E';
const TRAIL_HALF_WIDTH = 0.55;
const STONE_RADIUS = 0.3;
const STONE_HEIGHT = 0.12;
/** A handful of stones BETWEEN each pair of lesson nodes, not a fixed
 * spacing over the whole spline length — a long path with many lessons
 * should not get proportionally more stones than a short one; each segment
 * gets the same small count regardless of its length. This is what fixes
 * the "caterpillar" look of 40+ closely-packed stones. */
const STONES_PER_SEGMENT = 4;
/** Fallback density (stones per unit progress) when there are fewer than 2
 * nodes to interpolate between. */
const FALLBACK_STONE_COUNT = 6;
/** Alternating left/right offset so stones read as a playful stepping
 * path rather than a single straight paved strip. */
const SWAY_AMOUNT = 0.16;

// ========== Component Props ==========

export interface ClayPathProps {
  /** Array of lesson nodes along the path */
  nodes: LessonNode[];
  /** Current progress (0-1) along the path */
  currentProgress: number;
}

// ========== Component ==========

export const ClayPath: React.FC<ClayPathProps> = ({ nodes, currentProgress }) => {
  // Generate stone data BETWEEN consecutive lesson nodes (not over the raw
  // spline length) — a fixed small count per segment regardless of course
  // length or how far apart the nodes happen to sit.
  const { stones } = useMemo(() => {
    const spline = createPathSpline();

    // Progress values to place stones at: interior points of each
    // [node[i].position, node[i+1].position] segment, excluding the
    // endpoints themselves (the nodes are their own markers).
    const segmentBoundaries =
      nodes.length >= 2
        ? nodes.map((n) => n.position).sort((a, b) => a - b)
        : [0, 1];

    const stoneProgress: number[] = [];
    if (nodes.length >= 2) {
      for (let s = 0; s < segmentBoundaries.length - 1; s++) {
        const start = segmentBoundaries[s];
        const end = segmentBoundaries[s + 1];
        for (let k = 1; k <= STONES_PER_SEGMENT; k++) {
          stoneProgress.push(start + ((end - start) * k) / (STONES_PER_SEGMENT + 1));
        }
      }
    } else {
      for (let k = 1; k <= FALLBACK_STONE_COUNT; k++) {
        stoneProgress.push(k / (FALLBACK_STONE_COUNT + 1));
      }
    }

    const stoneData: Array<{
      position: THREE.Vector3;
      yaw: number;
      done: boolean;
      scale: number;
      colorMix: number;
      spin: number;
    }> = [];

    stoneProgress.forEach((progress, i) => {
      const point = spline.getPointAt(Math.max(0, Math.min(1, progress)));
      const tangent = spline.getTangentAt(Math.max(0, Math.min(1, progress)));

      const up = new THREE.Vector3(0, 1, 0);
      const perpendicular = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const sway = Math.sin(i * 1.7) * SWAY_AMOUNT;
      const position = point.clone().addScaledVector(perpendicular, sway);
      position.y = STONE_HEIGHT / 2;

      // Yaw only: stones lie flat on the ground and turn to follow the path.
      // (Rotating +Y onto the tangent stood every stone on its edge.)
      const yaw = Math.atan2(tangent.x, tangent.z);

      stoneData.push({
        position,
        yaw,
        done: progress <= currentProgress,
        scale: 0.8 + Math.abs(Math.sin(i * 2.3)) * 0.25,
        colorMix: (i % 3) / 3,
        spin: (i * 0.6) % (Math.PI * 2),
      });
    });

    return { stones: stoneData };
  }, [nodes, currentProgress]);

  const stoneGeometry = useMemo(() => new THREE.CylinderGeometry(STONE_RADIUS, STONE_RADIUS * 0.92, STONE_HEIGHT, 14), []);

  const stoneMaterials = useMemo(() => {
    const colorA = new THREE.Color(STONE_COLOR_A);
    const colorB = new THREE.Color(STONE_COLOR_B);
    // Precompute a small palette instead of allocating a material per stone.
    return [0, 0.5, 1].map(
      (t) =>
        new THREE.MeshStandardMaterial({
          color: colorA.clone().lerp(colorB, t),
          roughness: 0.85,
          metalness: 0,
        }),
    );
  }, []);

  // Stones already walked (up to the backend-derived current position) turn
  // warm gold — the "trail behind you" cue, without a separate tube mesh.
  const doneMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: STONE_DONE_COLOR, roughness: 0.6, emissive: STONE_DONE_COLOR, emissiveIntensity: 0.15 }),
    [],
  );

  // Soft earth trail under the stones — makes the path read as worn into
  // the ground instead of stones floating on a flat lawn. One flat strip
  // mesh built once from the spline.
  const trailGeometry = useMemo(() => {
    const spline = createPathSpline();
    const segments = 120;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = spline.getPointAt(t);
      const tan = spline.getTangentAt(t);
      const px = tan.z * TRAIL_HALF_WIDTH;
      const pz = -tan.x * TRAIL_HALF_WIDTH;
      positions.push(p.x - px, 0.004, p.z - pz, p.x + px, 0.004, p.z + pz);
      if (i < segments) {
        const k = i * 2;
        indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <group>
      <mesh geometry={trailGeometry}>
        <meshStandardMaterial color={TRAIL_COLOR} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {stones.map((stone, index) => (
        <mesh
          key={index}
          geometry={stoneGeometry}
          material={stone.done ? doneMaterial : stoneMaterials[Math.round(stone.colorMix * 2)]}
          position={[stone.position.x, stone.position.y, stone.position.z]}
          rotation={[0, stone.yaw + stone.spin * 0.15, 0]}
          scale={[stone.scale, 1, stone.scale * 0.8]}
        />
      ))}
    </group>
  );
};

// ========== Export ==========

export default ClayPath;
