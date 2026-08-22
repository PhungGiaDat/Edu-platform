/**
 * LearningPathScene.tsx
 *
 * React Three Fiber Canvas wrapper for the 3D learning path scene.
 * Sets up the scene with lighting, camera, and placeholder slots for
 * path, nodes, pet, and landscape components.
 */

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { LessonNode } from '@/types/learning-path';
import type { Pet } from '@/hooks/usePets';

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

export const LearningPathScene: React.FC<LearningPathSceneProps> = (props) => {
  const { nodes, currentProgress, activePet } = props;

  // onNodeSelect will be connected in Task 9 (Lesson Modal UI)
  void props.onNodeSelect;

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

          {/* TODO: Add Path component (Task 4) */}
          {/* TODO: Add LessonNode3D components (Task 5) */}
          {/* TODO: Add PetGuide component (Task 6) */}
          {/* TODO: Add Landscape component (Task 7) */}

          {/* Placeholder: Log props for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <DebugProps nodes={nodes} currentProgress={currentProgress} activePet={activePet} />
          )}
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={true} />
      </Canvas>
    </div>
  );
};

// ========== Debug Component (Development Only) ==========

interface DebugProps {
  nodes: LessonNode[];
  currentProgress: number;
  activePet: Pet | null;
}

/**
 * Debug component to log scene props - only renders in development
 */
const DebugProps: React.FC<DebugProps> = ({ nodes, currentProgress, activePet }) => {
  if (process.env.NODE_ENV !== 'development') return null;

  console.log('[LearningPathScene] Props:', {
    nodesCount: nodes.length,
    currentProgress,
    activePet: activePet?.name ?? null,
  });

  return null;
};

// ========== Export ==========

export default LearningPathScene;
