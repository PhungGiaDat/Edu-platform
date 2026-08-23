/**
 * PetGuide.tsx
 *
 * Renders a pet companion that follows the learning path.
 * Supports both 3D model loading and claymorphic fallback.
 * Pet faces the direction of travel and has walking bob animation.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createPathSpline, getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';
import type { Pet } from '@/hooks/usePets';

// ========== Constants ==========

const PET_HEIGHT_OFFSET = 0.5;
const BOB_AMPLITUDE = 0.15;
const BOB_SPEED = 4;
const ROTATION_SMOOTHING = 0.1;

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

    return {
      position: new THREE.Vector3(point.x, point.y + PET_HEIGHT_OFFSET, point.z),
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

  // Use model if available, otherwise fallback to clay blob
  if (pet.model_url) {
    return <PetModel position={position} modelUrl={pet.model_url} groupRef={groupRef} isCelebrating={isCelebrating} />;
  }

  return <PetFallback position={position} groupRef={groupRef} isCelebrating={isCelebrating} />;
};

// ========== Pet Model Component ==========

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PetModel: React.FC<{ position: THREE.Vector3; modelUrl: string; groupRef: any; isCelebrating?: boolean }> = ({ position, modelUrl, groupRef, isCelebrating }) => {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(), [scene]);

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
      <primitive object={clonedScene} />
      {/* Celebration particles */}
      {isCelebrating && <CelebrationParticles position={[0, 0, 0]} />}
    </group>
  );
};

// ========== Pet Fallback Component (Claymorphic) ==========

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PetFallback: React.FC<{ position: THREE.Vector3; groupRef: any; isCelebrating?: boolean }> = ({ position, groupRef, isCelebrating }) => {
  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Main body - clay blob */}
      <mesh castShadow>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#FFB347" roughness={0.8} metalness={0} />
      </mesh>

      {/* Eyes for character */}
      <Eyes />

      {/* Float wrapper for idle animation */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
        <group />
      </Float>

      {/* Celebration particles */}
      {isCelebrating && <CelebrationParticles position={[0, 0, 0]} />}
    </group>
  );
};

// ========== Eyes Component ==========

const Eyes: React.FC = () => {
  const eyeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2D1B00',
        roughness: 0.3,
        metalness: 0.1,
      }),
    []
  );

  return (
    <group position={[0, 0.15, 0.35]}>
      {/* Left eye */}
      <mesh position={[-0.15, 0, 0]} material={eyeMaterial}>
        <sphereGeometry args={[0.08, 12, 12]} />
      </mesh>

      {/* Right eye */}
      <mesh position={[0.15, 0, 0]} material={eyeMaterial}>
        <sphereGeometry args={[0.08, 12, 12]} />
      </mesh>

      {/* Eye highlights */}
      <EyeHighlight position={[-0.12, 0.02, 0.06]} />
      <EyeHighlight position={[0.18, 0.02, 0.06]} />
    </group>
  );
};

// ========== Eye Highlight Component ==========

interface EyeHighlightProps {
  position: [number, number, number];
}

const EyeHighlight: React.FC<EyeHighlightProps> = ({ position }) => {
  const highlightMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: '#FFFFFF',
        emissiveIntensity: 0.5,
        roughness: 0.1,
      }),
    []
  );

  return (
    <mesh position={position} material={highlightMaterial}>
      <sphereGeometry args={[0.025, 8, 8]} />
    </mesh>
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
