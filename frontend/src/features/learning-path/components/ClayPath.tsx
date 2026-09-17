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
const STONE_RADIUS = 0.2;
const STONE_HEIGHT = 0.1;
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
      quaternion: THREE.Quaternion;
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
      position.y -= STONE_HEIGHT / 2 + 0.01;

      const quaternion = new THREE.Quaternion();
      const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(tangent))));
      if (axis.length() > 0.001) {
        quaternion.setFromAxisAngle(axis, angle);
      }

      stoneData.push({
        position,
        quaternion,
        scale: 0.8 + Math.abs(Math.sin(i * 2.3)) * 0.25,
        colorMix: (i % 3) / 3,
        spin: (i * 0.6) % (Math.PI * 2),
      });
    });

    return { stones: stoneData };
  }, [nodes]);

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

  return (
    <group>
      {stones.map((stone, index) => {
        const rotation = new THREE.Euler().setFromQuaternion(stone.quaternion);
        return (
          <mesh
            key={index}
            geometry={stoneGeometry}
            material={stoneMaterials[Math.round(stone.colorMix * 2)]}
            position={[stone.position.x, stone.position.y, stone.position.z]}
            rotation={[rotation.x, rotation.y + stone.spin * 0.15, rotation.z]}
            scale={[stone.scale, 1, stone.scale]}
            castShadow
            receiveShadow
          />
        );
      })}

      {/* Golden progress trail - shows completed portion of path. No
          separate "progress marker" sphere here anymore — LessonNode3D's
          own current-node halo/platform/beacon already marks that spot;
          a second glowing ball on top of it was redundant clutter. */}
      {currentProgress > 0 && (
        <ProgressTrail nodes={nodes} progress={currentProgress} />
      )}
    </group>
  );
};

// ========== Golden Progress Trail ==========

interface ProgressTrailProps {
  nodes: LessonNode[];
  progress: number;
}

const ProgressTrail: React.FC<ProgressTrailProps> = ({ nodes, progress }) => {
  const trailGeometry = useMemo(() => {
    const fullSpline = createPathSpline();
    const length = fullSpline.getLength();

    // Create a spline from start to current progress
    const points: THREE.Vector3[] = [];
    const numPoints = Math.max(20, Math.floor(length * 10)); // At least 20 points

    for (let i = 0; i <= numPoints; i++) {
      const pointProgress = (i / numPoints) * progress;
      const point = fullSpline.getPointAt(pointProgress);
      points.push(point);
    }

    // Create spline from points
    const trailSpline = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(trailSpline, 100, 0.2, 8, false);
  }, [nodes, progress]);

  const trailMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#FFD700'),
      emissive: new THREE.Color('#FFD700'),
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.2,
      transparent: true,
      opacity: 0.7,
    });
  }, []);

  return (
    <mesh geometry={trailGeometry} position={[0, 0.02, 0]}>
      <primitive object={trailMaterial} />
    </mesh>
  );
};

// ========== Export ==========

export default ClayPath;
