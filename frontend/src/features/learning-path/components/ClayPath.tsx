/**
 * ClayPath.tsx
 *
 * Renders an extruded clay brick path along the learning journey spline.
 * Bricks are positioned along a CatmullRomCurve3 spline with a warm cream clay material.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createPathSpline } from '@/lib/pathSpline';
import type { LessonNode } from '@/types/learning-path';

// ========== Constants ==========

const CLAY_COLOR = '#FFF0D9';
const CLAY_ACCENT = '#FFB347';
const BRICK_WIDTH = 0.6;
const BRICK_HEIGHT = 0.15;
const BRICK_DEPTH = 0.4;
const BRICK_SPACING = 0.5;
const BRICK_ROWS = 2; // Number of parallel brick rows

// ========== Component Props ==========

export interface ClayPathProps {
  /** Array of lesson nodes along the path */
  nodes: LessonNode[];
  /** Current progress (0-1) along the path */
  currentProgress: number;
}

// ========== Component ==========

export const ClayPath: React.FC<ClayPathProps> = ({ nodes, currentProgress }) => {
  // Generate brick data along the spline
  const { bricks } = useMemo(() => {
    const spline = createPathSpline();
    const length = spline.getLength();

    const brickData: Array<{
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      progress: number;
    }> = [];

    // Calculate number of bricks needed
    const numBricks = Math.floor(length / BRICK_SPACING);

    for (let i = 0; i < numBricks; i++) {
      const progress = i / numBricks;
      const point = spline.getPointAt(progress);
      const tangent = spline.getTangentAt(progress);

      // Create quaternion to orient brick along path
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
      const angle = Math.acos(up.dot(tangent));
      if (axis.length() > 0.001) {
        quaternion.setFromAxisAngle(axis, angle);
      }

      brickData.push({
        position: point.clone(),
        quaternion,
        progress,
      });
    }

    return { bricks: brickData, totalLength: length };
  }, [nodes]);

  // Create clay material
  const clayMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(CLAY_COLOR),
      roughness: 0.75,
      metalness: 0,
    });
  }, []);

  // Create brick geometry
  const brickGeometry = useMemo(() => {
    return new THREE.BoxGeometry(BRICK_WIDTH, BRICK_HEIGHT, BRICK_DEPTH);
  }, []);

  // Offset positions for multiple brick rows (staggered)
  const getRowOffsets = (row: number): THREE.Vector3 => {
    const offset = (row - (BRICK_ROWS - 1) / 2) * BRICK_WIDTH * 0.6;
    return new THREE.Vector3(offset, 0, 0);
  };

  // Stagger pattern for natural clay look
  const getStagger = (index: number): number => {
    return (index % 2) * 0.15; // Alternate slight offset
  };

  return (
    <group>
      {bricks.map((brick, index) => (
        <React.Fragment key={index}>
          {Array.from({ length: BRICK_ROWS }).map((_, row) => {
            const rowOffset = getRowOffsets(row);
            rowOffset.applyQuaternion(brick.quaternion);

            const position = brick.position.clone().add(rowOffset);
            position.y -= BRICK_HEIGHT / 2 + 0.01; // Slight offset below surface

            const stagger = getStagger(index);
            const staggerOffset = new THREE.Vector3(stagger, 0, 0);
            staggerOffset.applyQuaternion(brick.quaternion);
            position.add(staggerOffset);

            return (
              <mesh
                key={`${index}-${row}`}
                geometry={brickGeometry}
                material={clayMaterial}
                position={[position.x, position.y, position.z]}
                quaternion={brick.quaternion}
                castShadow
                receiveShadow
              />
            );
          })}
        </React.Fragment>
      ))}

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
    return new THREE.TubeGeometry(trailSpline, 100, 0.25, 8, false);
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
    <mesh geometry={trailGeometry}>
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
