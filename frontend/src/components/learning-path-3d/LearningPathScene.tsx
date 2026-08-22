/**
 * LearningPathScene.tsx
 *
 * React Three Fiber Canvas wrapper for the 3D learning path scene.
 * Sets up the scene with lighting, camera, and all 3D components.
 */

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { LessonNode } from '@/types/learning-path';
import type { Pet } from '@/hooks/usePets';
import { createPathSpline } from '@/lib/pathSpline';
import ClayPath from './ClayPath';
import LessonNode3D from './LessonNode';
import PetGuide from './PetGuide';
import Landscape from './Landscape';
import PathCamera from './PathCamera';

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
}

// ========== Component ==========

export const LearningPathScene: React.FC<LearningPathSceneProps> = ({
  nodes,
  currentProgress,
  activePet,
  onNodeSelect,
}) => {
  // Create path spline
  const spline = useMemo(() => createPathSpline(), []);

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 20, 10]} intensity={0.8} />
          <hemisphereLight args={['#87CEEB', '#B8E6B8', 0.4]} />

          {/* Landscape background */}
          <Landscape />

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
              nodes={nodes}
              progress={currentProgress}
              pet={activePet}
            />
          )}

          {/* Follow camera */}
          <PathCamera spline={spline} petProgress={currentProgress} />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  );
};

// ========== Export ==========

export default LearningPathScene;
