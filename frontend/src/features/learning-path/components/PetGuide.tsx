/**
 * PetGuide.tsx
 *
 * Renders a pet companion that follows the learning path.
 * Supports both 3D model loading and claymorphic fallback.
 * Pet faces the direction of travel and has walking bob animation.
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createPathSpline, getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';
import { computeGroundedOffset, computeNormalizationScale } from '../modelNormalization';
import type { Pet } from '@/hooks/usePets';

// ========== Constants ==========

/**
 * A real, textured elephant asset ships in the project, but the SOURCE file
 * (frontend/public/assets/models/elephant.glb, ~21 MB / ~526k triangles, a
 * Sketchfab export) is far too heavy for a mobile-first page. This points at
 * a derivative optimized specifically for Learning Path's small on-screen
 * size — see frontend/public/assets/models/README-elephant-optimization.md
 * for the exact gltf-transform pipeline. The original elephant.glb is left
 * untouched for any other consumer. Most pets currently have no
 * `model_url` set, which fell through to a plain white clay sphere — the
 * "unfinished placeholder" problem this replaces.
 */
const DEFAULT_MASCOT_MODEL_URL = '/assets/models/elephant-learning-path.glb';

/**
 * The pet is a GUIDE beside the lesson, not the lesson marker itself — it
 * must never be large enough to cover the current node. Height is a world
 * unit sized relative to the lesson-node platform (LessonNode3D's raised
 * platform radius is ~NODE_RADIUS*1.75 ≈ 0.96, so a companion a little
 * taller than that platform's diameter reads as "standing beside", not
 * "towering over"). The model's AUTHORED scale is never trusted — see
 * modelNormalization.ts.
 */
const PET_TARGET_HEIGHT = 1.35;

/** Small lift so the (now bottom-grounded) model doesn't z-fight the
 * ground plane / stepping stones; grounding itself is handled by
 * computeGroundedOffset, this is just clearance. */
const PET_HEIGHT_OFFSET = 0.03;
const BOB_AMPLITUDE = 0.1;
const BOB_SPEED = 4;
const ROTATION_SMOOTHING = 0.1;

/**
 * Standing exactly on top of the lesson node's own point made pet and node
 * fight for the same spot. The pet now stands beside AND slightly behind
 * the node — a supporting character next to the landmark, not overlapping
 * its footprint (which reaches ~0.96 units from center on the current
 * node's raised platform).
 */
const LATERAL_OFFSET = 1.15;
const BEHIND_OFFSET = 0.4;

/**
 * The GLB's authored "forward" axis is unknown/unverified — this rotates
 * the model relative to whatever forward the artist used, kept deliberately
 * separate from the path-tangent facing computed below so the two concerns
 * (path direction vs. model-authoring quirk) don't get tangled into one
 * magic number. 0 until visually confirmed in a browser.
 */
const MODEL_ROTATION_OFFSET = 0;

// ========== Component Props ==========

export interface PetGuideProps {
  /** Pet to display */
  pet: Pet;
  /** Current progress (0-1) along the path */
  progress: number;
  /** Trigger celebration animation when lesson is completed */
  isCelebrating?: boolean;
}

// ========== Component ==========

export const PetGuide: React.FC<PetGuideProps> = ({ pet, progress, isCelebrating = false }) => {
  // /learning-path-3d is NOT code-split (App.tsx statically imports every
  // route, this module included) — a module-level useGLTF.preload() here
  // would start downloading the elephant for every visitor at app startup,
  // not just Learning Path users. Preloading on mount instead still starts
  // the fetch before PetModel's own useGLTF() suspends, but only once this
  // component actually renders.
  useEffect(() => {
    useGLTF.preload(DEFAULT_MASCOT_MODEL_URL);
  }, []);

  const groupRef = useRef<THREE.Group | null>(null);
  const targetRotation = useRef(0);
  const lastProgress = useRef(progress);
  const distanceTraveled = useRef(0);

  // Create spline from nodes
  const spline = useMemo(() => createPathSpline(), []);

  // Calculate position and rotation based on progress
  const { position, tangent } = useMemo(() => {
    const point = getPointOnSpline(spline, progress);
    const tan = getTangentOnSpline(spline, progress);

    // Sideways + behind offset so the pet reads as a companion beside the
    // lesson node instead of coinciding with (or hiding) it.
    const up = new THREE.Vector3(0, 1, 0);
    const perpendicular = new THREE.Vector3().crossVectors(up, tan).normalize();
    const anchored = point.clone().addScaledVector(perpendicular, LATERAL_OFFSET).addScaledVector(tan, -BEHIND_OFFSET);

    return {
      position: new THREE.Vector3(anchored.x, anchored.y + PET_HEIGHT_OFFSET, anchored.z),
      tangent: tan,
    };
  }, [spline, progress]);

  // Calculate target rotation from tangent (face direction of travel)
  const targetAngle = useMemo(() => {
    return Math.atan2(tangent.x, tangent.z);
  }, [tangent]);

  // Track distance traveled for walking animation speed
  useFrame((state) => {
    if (!groupRef.current) return;

    // Update distance traveled based on progress change
    const progressDelta = Math.abs(progress - lastProgress.current);
    distanceTraveled.current += progressDelta * 100;
    lastProgress.current = progress;

    // Smoothly rotate to face direction of travel
    targetRotation.current += (targetAngle - targetRotation.current) * ROTATION_SMOOTHING;
    groupRef.current.rotation.y = targetRotation.current;

    // Celebration animation
    if (isCelebrating) {
      const jumpHeight = Math.abs(Math.sin(state.clock.elapsedTime * 6)) * 0.4;
      groupRef.current.position.y = position.y + jumpHeight;
      // Wiggle rotation
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.1;
    } else {
      // Bob animation based on movement (walking effect)
      const isMoving = progressDelta > 0.001;
      if (isMoving) {
        const bobPhase = distanceTraveled.current * BOB_SPEED;
        const bobY = Math.sin(bobPhase) * BOB_AMPLITUDE;
        groupRef.current.position.y = position.y + bobY;
      } else {
        // Gentle idle float
        const idleTime = Date.now() / 1000;
        const idleBob = Math.sin(idleTime * 2) * 0.05;
        groupRef.current.position.y = position.y + idleBob;
      }
    }
  });

  // A user's chosen pet always wins when it has a real model; otherwise the
  // shipped elephant mascot replaces the old plain clay-sphere placeholder.
  const modelUrl = pet.model_url || DEFAULT_MASCOT_MODEL_URL;

  return <PetModel position={position} modelUrl={modelUrl} groupRef={groupRef} isCelebrating={isCelebrating} />;
};

// ========== Pet Model Component ==========

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PetModel: React.FC<{ position: THREE.Vector3; modelUrl: string; groupRef: any; isCelebrating?: boolean }> = ({ position, modelUrl, groupRef, isCelebrating }) => {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Bounding-box normalization: never trust the model's authored scale.
  // Measure once raw to find the scale that hits PET_TARGET_HEIGHT, apply
  // it directly to the clone, then measure AGAIN (now already scaled) to
  // get the exact grounding offset — this avoids hand-deriving how the
  // offset itself needs to be scaled.
  const groundedOffset = useMemo(() => {
    const rawBox = new THREE.Box3().setFromObject(clonedScene);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const scale = computeNormalizationScale(rawSize.y, PET_TARGET_HEIGHT);

    clonedScene.scale.setScalar(scale);
    clonedScene.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);

    return computeGroundedOffset(center.x, scaledBox.min.y, center.z);
  }, [clonedScene]);

  // Apply cloned scene materials
  React.useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clonedScene]);

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Contact shadow — a flat dark disc grounds the mascot on the terrain
          instead of it reading as floating. */}
      <mesh position={[0, -PET_HEIGHT_OFFSET + 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PET_TARGET_HEIGHT * 0.3, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>

      {/* Grounded + rotation-corrected: `clonedScene` already carries its
          normalized scale (applied above); this group only translates it to
          local origin and applies the authoring-forward-axis correction,
          kept separate from the outer group's path-tangent facing. */}
      <group position={[groundedOffset.x, groundedOffset.y, groundedOffset.z]} rotation={[0, MODEL_ROTATION_OFFSET, 0]}>
        <primitive object={clonedScene} />
      </group>

      {/* Celebration particles */}
      {isCelebrating && <CelebrationParticles position={[0, PET_TARGET_HEIGHT * 0.5, 0]} />}
    </group>
  );
};

// ========== Celebration Particles Component ==========

interface CelebrationParticlesProps {
  position: [number, number, number];
}

const CelebrationParticles: React.FC<CelebrationParticlesProps> = ({ position }) => {
  // Generate static positions for particles around the pet
  const particlePositions = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      x: Math.cos((i * Math.PI) / 4) * 0.5,
      y: Math.random() * 0.5,
      z: Math.sin((i * Math.PI) / 4) * 0.5,
      color: i % 2 === 0 ? '#FFD700' : '#FF6B6B',
    }));
  }, []);

  return (
    <group position={position}>
      {particlePositions.map((particle, i) => (
        <mesh key={i} position={[particle.x, particle.y, particle.z]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={particle.color} />
        </mesh>
      ))}
    </group>
  );
};

// ========== Export ==========

export default PetGuide;
