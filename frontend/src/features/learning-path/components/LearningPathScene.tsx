/**
 * LearningPathScene.tsx
 *
 * React Three Fiber Canvas wrapper for the 3D learning path scene.
 * Sets up the scene with lighting, camera, and all 3D components.
 */

import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { LessonNode } from '@/types/learning-path';
import type { Pet } from '@/hooks/usePets';
import { createPathSpline } from '@/lib/pathSpline';
import { useResponsiveFov } from '../useResponsiveFov';
import ClayPath from './ClayPath';
import { LessonNode3D } from './LessonNode';
import PetGuide from './PetGuide';
import Landscape from './Landscape';
import PathCamera from './PathCamera';

/**
 * Canvas's `camera={{ fov }}` prop only sets the INITIAL fov — R3F does not
 * reactively re-apply it when the prop changes on a later render. This tiny
 * component lives inside the Canvas and pushes fov updates onto the live
 * camera object (only when `fov` actually changes, so it never runs a
 * per-frame loop).
 */
const FovSync: React.FC<{ fov: number }> = ({ fov }) => {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, fov]);

  return null;
};

// ========== Component Props ==========

export interface LearningPathSceneProps {
  /** Array of lesson nodes along the path */
  nodes: LessonNode[];
  /** Current progress (0-1) along the path */
  currentProgress: number;
  /** Currently active pet companion */
  activePet: Pet | null;
  /** Callback when a node is selected */
  onNodeSelect: (node: LessonNode) => void;
  /** selectedCourse.category_key — presentation-only environment preset */
  categoryKey?: string | null;
  /** selectedCourseId — remounts only PetGuide's transient walk-animation
   * refs on course switch, never the Canvas itself. */
  courseKey?: string | null;
}

// ========== Component ==========

export const LearningPathScene: React.FC<LearningPathSceneProps> = ({
  nodes,
  currentProgress,
  activePet,
  onNodeSelect,
  categoryKey,
  courseKey,
}) => {
  // Create path spline
  const spline = useMemo(() => createPathSpline(), []);

  // A narrower viewport needs a wider field of view to keep the current
  // lesson + a useful section of path in frame (a portrait phone otherwise
  // sees a much narrower horizontal slice than the desktop tuning assumed).
  // Responsive to live resize/orientation change, not just the value at mount.
  const fov = useResponsiveFov();

  return (
    <div className="absolute inset-0 touch-none">
      <Canvas
        camera={{ position: [0, 6, 12], fov }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <FovSync fov={fov} />
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={0.9} />
          <hemisphereLight args={['#87CEEB', '#B8E6B8', 0.5]} />

          {/* Landscape background */}
          <Landscape categoryKey={categoryKey} />

          {/* Learning path */}
          <ClayPath nodes={nodes} currentProgress={currentProgress} />

          {/* Lesson nodes */}
          {nodes.map((node) => (
            <LessonNode3D
              key={node.lesson_id}
              node={node}
              spline={spline}
              onClick={() => onNodeSelect(node)}
            />
          ))}

          {/* Pet guide */}
          {activePet && (
            <PetGuide
              key={courseKey ?? undefined}
              progress={currentProgress}
              pet={activePet}
            />
          )}

          {/* Follow camera (only when there are nodes) */}
          {nodes.length > 0 && (
            <PathCamera spline={spline} petProgress={currentProgress} />
          )}
        </Suspense>
        {/*
          PathCamera owns `target` (primed + followed each frame). No static
          `target` prop here — a hardcoded value would only be visible for a
          single frame before PathCamera overwrites it, and would be wrong
          for any path shorter/longer than the one it was tuned for.
        */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={16}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.15}
          makeDefault
        />
      </Canvas>
    </div>
  );
};

// ========== Export ==========

export default LearningPathScene;
