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

// Warm stone tones — two shades lerped per-stone for organic variation
// instead of one flat, obviously-repeated material.
const STONE_COLOR_A = '#D98A4E';
const STONE_COLOR_B = '#C77A3E';
const CLAY_ACCENT = '#FFB347';
const STONE_RADIUS = 0.55;
const STONE_HEIGHT = 0.16;
const STONE_SPACING = 0.62;
/** Alternating left/right offset so stones read as a playful stepping
 * path rather than a single straight paved strip. */
const SWAY_AMOUNT = 0.32;

// ========== Component Props ==========

export interface ClayPathProps {
  /** Array of lesson nodes along the path */
  nodes: LessonNode[];
  /** Current progress (0-1) along the path */
  currentProgress: number;
}

// ========== Component ==========

export const ClayPath: React.FC<ClayPathProps> = ({ nodes, currentProgress }) => {
  // Generate stone data along the spline
  const { stones } = useMemo(() => {
    const spline = createPathSpline();
    const length = spline.getLength();

    const stoneData: Array<{
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      scale: number;
      colorMix: number;
      spin: number;
    }> = [];

    const numStones = Math.floor(length / STONE_SPACING);

    for (let i = 0; i < numStones; i++) {
      const progress = i / numStones;
      const point = spline.getPointAt(progress);
      const tangent = spline.getTangentAt(progress);

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
        scale: 0.85 + Math.abs(Math.sin(i * 2.3)) * 0.3,
        colorMix: (i % 3) / 3,
        spin: (i * 0.6) % (Math.PI * 2),
      });
    }

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

      {/* Golden progress trail - shows completed portion of path */}
      {currentProgress > 0 && (
        <ProgressTrail nodes={nodes} progress={currentProgress} />
      )}

      {/* Progress indicator - brighter accent color at current position */}
      {currentProgress > 0 && (
        <ProgressMarker
          nodes={nodes}
          progress={currentProgress}
          accentColor={CLAY_ACCENT}
        />
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

// ========== Progress Marker ==========

interface ProgressMarkerProps {
  nodes: LessonNode[];
  progress: number;
  accentColor: string;
}

const ProgressMarker: React.FC<ProgressMarkerProps> = ({ nodes, progress, accentColor }) => {
  const { position, quaternion } = useMemo(() => {
    const spline = createPathSpline();
    const point = spline.getPointAt(progress);
    const tangent = spline.getTangentAt(progress);

    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const angle = Math.acos(up.dot(tangent));
    if (axis.length() > 0.001) {
      quat.setFromAxisAngle(axis, angle);
    }

    return { position: point, quaternion: quat };
  }, [nodes, progress]);

  const accentMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.3,
    });
  }, [accentColor]);

  return (
    <mesh
      position={[position.x, position.y + 0.1, position.z]}
      quaternion={quaternion}
      castShadow
    >
      <sphereGeometry args={[0.25, 16, 16]} />
      <primitive object={accentMaterial} />
    </mesh>
  );
};

// ========== Export ==========

export default ClayPath;
