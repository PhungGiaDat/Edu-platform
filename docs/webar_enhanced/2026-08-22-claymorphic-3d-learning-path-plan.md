# Claymorphic 3D Learning Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 3D Duolingo-style learning path where the user's active pet walks along a winding claymorphic path through a playful landscape, with lesson nodes that can be tapped to start lessons.

**Architecture:** React Three Fiber (R3F) scene with React UI overlays. Pet follows a CatmullRom spline along the path. Lesson nodes positioned at intervals along the spline. Claymorphic materials with high roughness, warm colors.

**Tech Stack:** React + React Router, React Three Fiber + Drei, Zustand, Tailwind CSS, Framer Motion

**Spec:** `docs/webar_enhanced/2026-08-22-claymorphic-3d-learning-path-design.md`

---

## Global Constraints

- Must use existing `usePets()` hook for pet data
- Must reuse `PetViewer3D` model loading logic
- Materials must match claymorphic design system colors
- Performance target: 60fps on iPhone 14 Pro
- No fallback to 2D — full 3D commitment

---

## File Structure

```
frontend/src/
├── pages/
│   └── LearningPath3D.tsx          # Main page (entry point)
├── components/
│   └── learning-path-3d/
│       ├── index.ts                # Barrel export
│       ├── LearningPathScene.tsx   # R3F Canvas wrapper
│       ├── ClayPath.tsx            # Path geometry + material
│       ├── LessonNode.tsx          # 3D lesson node sphere
│       ├── PetGuide.tsx            # Pet walking on path
│       ├── Landscape.tsx           # Background environment
│       ├── PathCamera.tsx          # Follow camera logic
│       ├── LessonModal.tsx         # UI overlay modal
│       ├── PathControls.tsx        # Camera controls UI
│       └── sceneUtils.ts            # Shared 3D utilities
├── hooks/
│   ├── useLearningPath3D.ts        # Path data + state (Zustand)
│   └── usePathSpline.ts            # Spline position utilities
├── lib/
│   └── pathSpline.ts               # CatmullRom spline utilities
└── types/
    └── learning-path.ts             # TypeScript interfaces
```

---

## Task Right-Sizing

Each task produces a self-contained deliverable that can be tested independently.

---

## Tasks

### Task 1: Project Setup & Types

**Files:**
- Create: `frontend/src/types/learning-path.ts`
- Create: `frontend/src/lib/pathSpline.ts`

**Interfaces:**
```typescript
// learning-path.ts
export interface LessonNode {
  lesson_id: string;
  title: string;
  status: 'completed' | 'available' | 'locked';
  type: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
  xp_reward: number;
  icon: string;
  position: number; // 0-1 along path spline
  unlock_condition?: {
    type: 'xp' | 'streak' | 'lesson';
    value: number;
    prerequisite_id?: string;
  };
}

export interface LearningPath3DState {
  nodes: LessonNode[];
  currentProgress: number; // 0-1 position on path
  selectedNode: LessonNode | null;
  isModalOpen: boolean;
  setSelectedNode: (node: LessonNode | null) => void;
  openModal: (node: LessonNode) => void;
  closeModal: () => void;
  completeLesson: (lessonId: string) => void;
}
```

- [ ] **Step 1: Create type definitions**

```typescript
// frontend/src/types/learning-path.ts
export interface LessonNode {
  lesson_id: string;
  title: string;
  status: 'completed' | 'available' | 'locked';
  type: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
  xp_reward: number;
  icon: string;
  position: number;
  unlock_condition?: {
    type: 'xp' | 'streak' | 'lesson';
    value: number;
    prerequisite_id?: string;
  };
}

export interface Unit {
  unit_id: string;
  title: string;
  lessons: LessonNode[];
}

export interface LearningPath3DProps {
  courseId?: string;
  units?: Unit[];
}
```

- [ ] **Step 2: Create spline utilities**

```typescript
// frontend/src/lib/pathSpline.ts
import * as THREE from 'three';

export function createPathSpline(nodes: { position: number }[]): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = Math.sin(t * Math.PI * 2) * 4; // S-curve amplitude
    const y = Math.sin(t * Math.PI) * 0.5;   // Subtle hills
    const z = -t * 40;                        // Path depth
    points.push(new THREE.Vector3(x, y, z));
  }

  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

export function getPointOnSpline(
  spline: THREE.CatmullRomCurve3,
  progress: number
): THREE.Vector3 {
  return spline.getPointAt(Math.max(0, Math.min(1, progress)));
}

export function getTangentOnSpline(
  spline: THREE.CatmullRomCurve3,
  progress: number
): THREE.Vector3 {
  return spline.getTangentAt(Math.max(0, Math.min(1, progress)));
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/learning-path.ts frontend/src/lib/pathSpline.ts
git commit -m "feat(3d-path): add types and spline utilities

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Zustand Store

**Files:**
- Create: `frontend/src/hooks/useLearningPath3D.ts`

**Interfaces:**
- Consumes: `LessonNode[]` from props
- Produces: `LearningPath3DState` store

- [ ] **Step 1: Create Zustand store**

```typescript
// frontend/src/hooks/useLearningPath3D.ts
import { create } from 'zustand';
import type { LessonNode, LearningPath3DState } from '@/types/learning-path';

export const useLearningPath3DStore = create<LearningPath3DState>((set) => ({
  nodes: [],
  currentProgress: 0,
  selectedNode: null,
  isModalOpen: false,

  setNodes: (nodes: LessonNode[]) => set({ nodes }),
  
  setCurrentProgress: (progress: number) => set({ currentProgress: progress }),

  setSelectedNode: (node: LessonNode | null) => set({ selectedNode: node }),

  openModal: (node: LessonNode) => set({
    selectedNode: node,
    isModalOpen: true
  }),

  closeModal: () => set({
    selectedNode: null,
    isModalOpen: false
  }),

  completeLesson: (lessonId: string) => set((state) => ({
    nodes: state.nodes.map((node) =>
      node.lesson_id === lessonId
        ? { ...node, status: 'completed' as const }
        : node
    )
  })),
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useLearningPath3D.ts
git commit -m "feat(3d-path): add Zustand store for path state

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Learning Path Scene (Canvas Wrapper)

**Files:**
- Create: `frontend/src/components/learning-path-3d/LearningPathScene.tsx`

- [ ] **Step 1: Create scene wrapper**

```tsx
// frontend/src/components/learning-path-3d/LearningPathScene.tsx
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { ClayPath } from './ClayPath';
import { LessonNode3D } from './LessonNode';
import { PetGuide } from './PetGuide';
import { Landscape } from './Landscape';
import { PathCamera } from './PathCamera';
import type { LessonNode } from '@/types/learning-path';
import type { Pet } from '@/hooks/usePets';

interface LearningPathSceneProps {
  nodes: LessonNode[];
  currentProgress: number;
  activePet: Pet | null;
  onNodeSelect: (node: LessonNode) => void;
}

function SceneContent({
  nodes,
  currentProgress,
  activePet,
  onNodeSelect,
}: LearningPathSceneProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#87CEEB', '#B8E6B8', 0.4]} />

      {/* Environment */}
      <Landscape />

      {/* Path */}
      <ClayPath nodes={nodes} currentProgress={currentProgress} />

      {/* Lesson Nodes */}
      {nodes.map((node) => (
        <LessonNode3D
          key={node.lesson_id}
          node={node}
          onClick={() => onNodeSelect(node)}
        />
      ))}

      {/* Pet Guide */}
      {activePet && <PetGuide pet={activePet} progress={currentProgress} />}

      {/* Camera */}
      <PathCamera petProgress={currentProgress} />

      {/* Environment for reflections */}
      <Environment preset="sunset" />
    </>
  );
}

export const LearningPathScene: React.FC<LearningPathSceneProps> = (props) => {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 3, 8], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/LearningPathScene.tsx
git commit -m "feat(3d-path): add R3F scene wrapper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Clay Path Component

**Files:**
- Create: `frontend/src/components/learning-path-3d/ClayPath.tsx`

**Interfaces:**
- Consumes: `nodes: LessonNode[]`, `currentProgress: number`
- Produces: 3D clay brick path

- [ ] **Step 1: Create clay path**

```tsx
// frontend/src/components/learning-path-3d/ClayPath.tsx
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createPathSpline } from '@/lib/pathSpline';
import type { LessonNode } from '@/types/learning-path';

interface ClayPathProps {
  nodes: LessonNode[];
  currentProgress: number;
}

export const ClayPath: React.FC<ClayPathProps> = ({ nodes, currentProgress }) => {
  const { spline, pathPoints } = useMemo(() => {
    const spline = createPathSpline(nodes);
    const pathPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 100; i++) {
      pathPoints.push(spline.getPointAt(i / 100));
    }
    return { spline, pathPoints };
  }, [nodes]);

  // Create path geometry from spline
  const pathGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const width = 1.2;
    const halfWidth = width / 2;

    // Rounded rectangle cross-section
    shape.moveTo(-halfWidth + 0.2, 0);
    shape.lineTo(halfWidth - 0.2, 0);
    shape.quadraticCurveTo(halfWidth, 0, halfWidth, 0.2);
    shape.lineTo(halfWidth, 0.3);
    shape.quadraticCurveTo(halfWidth, 0.5, halfWidth - 0.2, 0.5);
    shape.lineTo(-halfWidth + 0.2, 0.5);
    shape.quadraticCurveTo(-halfWidth, 0.5, -halfWidth, 0.3);
    shape.lineTo(-halfWidth, 0.2);
    shape.quadraticCurveTo(-halfWidth, 0, -halfWidth + 0.2, 0);

    const extrudeSettings = {
      steps: 100,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Bend geometry along spline
    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      // Map vertex z to spline t
      const t = (vertex.z + 5) / 50; // Normalize
      const point = spline.getPointAt(Math.max(0, Math.min(1, t)));
      const tangent = spline.getTangentAt(Math.max(0, Math.min(1, t)));

      // Calculate offset perpendicular to tangent
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Apply position
      vertex.x = point.x + right.x * vertex.x + up.x * vertex.y * 0.3;
      vertex.z = point.z;
      vertex.y = point.y + 0.25 + vertex.y * 0.3;

      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [pathPoints]);

  return (
    <mesh geometry={pathGeometry} receiveShadow>
      <meshStandardMaterial
        color="#FFF0D9"
        roughness={0.75}
        metalness={0}
        flatShading={false}
      />
    </mesh>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/ClayPath.tsx
git commit -m "feat(3d-path): add clay path component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Lesson Node Component

**Files:**
- Create: `frontend/src/components/learning-path-3d/LessonNode.tsx`

- [ ] **Step 1: Create lesson node**

```tsx
// frontend/src/components/learning-path-3d/LessonNode.tsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { createPathSpline, getPointOnSpline } from '@/lib/pathSpline';
import type { LessonNode as LessonNodeType } from '@/types/learning-path';

interface LessonNodeProps {
  node: LessonNodeType;
  onClick: () => void;
}

const NODE_COLORS = {
  available: '#5B8DEF',
  completed: '#FFD700',
  locked: '#9CA3AF',
};

const NODE_EMISSIVE = {
  available: '#5B8DEF',
  completed: '#FFD700',
  locked: '#000000',
};

export const LessonNode3D: React.FC<LessonNodeProps> = ({ node, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  const { position, scale } = useMemo(() => {
    const spline = createPathSpline([node]);
    const point = getPointOnSpline(spline, node.position);
    return {
      position: [point.x, point.y + 1.2, point.z],
      scale: node.status === 'available' && hovered ? 1.15 : 1,
    };
  }, [node, hovered]);

  // Pulse animation for available nodes
  useFrame((state) => {
    if (meshRef.current && node.status === 'available') {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1;
      meshRef.current.scale.setScalar(pulse * scale);
    }
    if (glowRef.current) {
      const glowPulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.5;
      glowRef.current.material.opacity = glowPulse;
    }
  });

  const color = NODE_COLORS[node.status];
  const emissive = NODE_EMISSIVE[node.status];

  return (
    <group position={position}>
      {/* Glow sphere (for available/completed) */}
      {node.status !== 'locked' && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Main node */}
      <mesh
        ref={meshRef}
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={node.status === 'locked' ? 0 : 0.3}
          roughness={0.6}
          metalness={0}
          flatShading={true}
        />
      </mesh>

      {/* Icon label */}
      <Html center position={[0, 0, 0.6]} style={{ pointerEvents: 'none' }}>
        <div className="text-2xl select-none">
          {node.status === 'locked' ? '🔒' : node.icon}
        </div>
      </Html>

      {/* XP badge */}
      {node.status !== 'locked' && (
        <Html center position={[0, 0.8, 0]} style={{ pointerEvents: 'none' }}>
          <div className="bg-white/90 px-2 py-1 rounded-full text-xs font-bold shadow">
            +{node.xp_reward} XP
          </div>
        </Html>
      )}
    </group>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/LessonNode.tsx
git commit -m "feat(3d-path): add lesson node component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Pet Guide Component

**Files:**
- Create: `frontend/src/components/learning-path-3d/PetGuide.tsx`

- [ ] **Step 1: Create pet guide**

```tsx
// frontend/src/components/learning-path-3d/PetGuide.tsx
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { createPathSpline, getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';
import type { Pet } from '@/hooks/usePets';

interface PetGuideProps {
  pet: Pet;
  progress: number;
}

export const PetGuide: React.FC<PetGuideProps> = ({ pet, progress }) => {
  const groupRef = useRef<THREE.Group>(null);
  const isMoving = useRef(false);

  const { position, rotation } = useMemo(() => {
    const nodes = [{ position: progress }];
    const spline = createPathSpline(nodes);
    const point = getPointOnSpline(spline, progress);
    const tangent = getTangentOnSpline(spline, progress);
    
    // Face direction of travel
    const angle = Math.atan2(tangent.x, -tangent.z);
    
    return {
      position: new THREE.Vector3(point.x, point.y + 0.5, point.z),
      rotation: new THREE.Euler(0, angle, 0),
    };
  }, [progress]);

  // Update position and rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth position interpolation
      groupRef.current.position.lerp(position, 0.1);
      
      // Smooth rotation
      const targetQuat = new THREE.Quaternion().setFromEuler(rotation);
      groupRef.current.quaternion.slerp(targetQuat, 0.1);

      // Walking bob animation
      const bobSpeed = 8;
      const bobAmount = 0.08;
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * bobSpeed) * bobAmount * delta * 10;
    }
  });

  // Load pet model if available
  const { scene: petModel } = useGLTF(pet.model_url || '');

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef} position={position} rotation={rotation} scale={0.8}>
        {pet.model_url && petModel ? (
          <primitive object={petModel.clone()} />
        ) : (
          // Fallback clay blob
          <mesh castShadow>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial
              color="#FFB347"
              roughness={0.8}
              metalness={0}
            />
          </mesh>
        )}
      </group>
    </Float>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/PetGuide.tsx
git commit -m "feat(3d-path): add pet guide component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Landscape Component

**Files:**
- Create: `frontend/src/components/learning-path-3d/Landscape.tsx`

- [ ] **Step 1: Create landscape**

```tsx
// frontend/src/components/learning-path-3d/Landscape.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Cloud component
const Cloud: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x += 0.01;
      if (groupRef.current.position.x > 30) {
        groupRef.current.position.x = -30;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.8, 0.2, 0]}>
        <sphereGeometry args={[0.7, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={1} flatShading />
      </mesh>
      <mesh position={[-0.6, 0.1, 0.2]}>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshStandardMaterial color="#FFFFFF" roughness={1} flatShading />
      </mesh>
    </group>
  );
};

// Tree component
const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      {/* Foliage */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <coneGeometry args={[0.5, 1.2, 8]} />
        <meshStandardMaterial color="#7CB342" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <coneGeometry args={[0.35, 0.9, 8]} />
        <meshStandardMaterial color="#8BC34A" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
};

export const Landscape: React.FC = () => {
  // Ground plane
  const groundGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(100, 100, 32, 32);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      // Add hills
      const z = Math.sin(x * 0.1) * 0.5 + Math.cos(y * 0.15) * 0.3;
      positions.setZ(i, z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -20]} receiveShadow>
        <primitive object={groundGeometry} />
        <meshStandardMaterial
          color="#B8E6B8"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Hills in background */}
      {[-15, -8, 0, 10, 20].map((z, i) => (
        <mesh
          key={i}
          position={[i % 2 === 0 ? -20 : 20, 2, -z * 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <sphereGeometry args={[8 + i, 16, 16, 0, Math.PI]} />
          <meshStandardMaterial
            color="#8FBC8F"
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}

      {/* Clouds */}
      {[
        [-8, 8, -10],
        [5, 10, -15],
        [-3, 7, -5],
        [10, 9, -20],
        [-12, 11, -25],
      ].map((pos, i) => (
        <Cloud key={i} position={pos as [number, number, number]} scale={0.8 + i * 0.2} />
      ))}

      {/* Trees along path */}
      {[
        [-3, -0.3, -2],
        [3, -0.3, -5],
        [-2, -0.3, -8],
        [4, -0.3, -12],
        [-4, -0.3, -15],
        [2, -0.3, -18],
      ].map((pos, i) => (
        <Tree key={i} position={pos as [number, number, number]} />
      ))}

      {/* Sky gradient sphere */}
      <mesh position={[0, 0, -50]}>
        <sphereGeometry args={[60, 32, 32]} />
        <meshBasicMaterial color="#E0F4FF" side={THREE.BackSide} />
      </mesh>
    </group>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/Landscape.tsx
git commit -m "feat(3d-path): add landscape component with clouds and trees

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Path Camera Component

**Files:**
- Create: `frontend/src/components/learning-path-3d/PathCamera.tsx`

- [ ] **Step 1: Create follow camera**

```tsx
// frontend/src/components/learning-path-3d/PathCamera.tsx
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createPathSpline, getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';

interface PathCameraProps {
  petProgress: number;
}

export const PathCamera: React.FC<PathCameraProps> = ({ petProgress }) => {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    // Get point slightly behind the pet
    const behindProgress = Math.max(0, petProgress - 0.05);
    const spline = createPathSpline([{ position: petProgress }]);
    
    const petPos = getPointOnSpline(spline, petProgress);
    const behindPos = getPointOnSpline(spline, behindProgress);
    const tangent = getTangentOnSpline(spline, petProgress);

    // Camera position: behind and above the pet
    targetPosition.current.set(
      behindPos.x + tangent.x * 3,
      petPos.y + 4,
      behindPos.z + 6
    );

    // Look at point: ahead of pet
    const aheadProgress = Math.min(1, petProgress + 0.1);
    const aheadPos = getPointOnSpline(spline, aheadProgress);
    targetLookAt.current.set(aheadPos.x, aheadPos.y + 1, aheadPos.z);

    // Smooth camera movement
    camera.position.lerp(targetPosition.current, 0.05);
    
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.add(camera.position);
    currentLookAt.lerp(targetLookAt.current, 0.05);
    camera.lookAt(targetLookAt.current);
  });

  return null;
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/PathCamera.tsx
git commit -m "feat(3d-path): add follow camera component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Lesson Modal UI

**Files:**
- Create: `frontend/src/components/learning-path-3d/LessonModal.tsx`

- [ ] **Step 1: Create lesson modal**

```tsx
// frontend/src/components/learning-path-3d/LessonModal.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LessonNode } from '@/types/learning-path';

interface LessonModalProps {
  node: LessonNode | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
}

const LESSON_TYPE_LABELS = {
  flashcard: 'Flashcard',
  quiz: 'Quiz',
  ar_session: 'AR Lesson',
  lesson: 'Lesson',
};

export const LessonModal: React.FC<LessonModalProps> = ({
  node,
  isOpen,
  onClose,
  onStart,
}) => {
  if (!node) return null;

  return (
    <AnimatePresence>
      {isOpen && node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-[32px] border-4 border-white bg-white p-6 shadow-[0_12px_0_rgba(91,141,239,0.18),0_24px_48px_rgba(0,0,0,0.15)] md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
          >
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-4xl shadow-lg">
              {node.status === 'locked' ? '🔒' : node.icon}
            </div>

            {/* Title */}
            <h2 className="mb-2 text-center text-2xl font-black text-slate-800">
              {node.title}
            </h2>

            {/* Type badge */}
            <div className="mb-4 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
                {LESSON_TYPE_LABELS[node.type]}
              </span>
            </div>

            {/* XP reward */}
            <div className="mb-6 text-center text-lg font-black text-amber-500">
              ⚡ +{node.xp_reward} XP
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {node.status !== 'locked' ? (
                <button
                  onClick={onStart}
                  className="w-full min-h-[52px] rounded-[24px] border-b-4 border-orange-600 bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4 text-base font-black text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start Lesson
                </button>
              ) : (
                <div className="rounded-[24px] bg-slate-100 p-4 text-center">
                  <p className="font-bold text-slate-600">
                    Complete previous lessons to unlock
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full min-h-[44px] rounded-[24px] border-4 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/LessonModal.tsx
git commit -m "feat(3d-path): add lesson modal UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Main Page Component

**Files:**
- Create: `frontend/src/pages/LearningPath3D.tsx`
- Create: `frontend/src/components/learning-path-3d/index.ts`
- Modify: `frontend/src/App.tsx` (add route)

- [ ] **Step 1: Create barrel export**

```tsx
// frontend/src/components/learning-path-3d/index.ts
export { LearningPathScene } from './LearningPathScene';
export { ClayPath } from './ClayPath';
export { LessonNode3D } from './LessonNode';
export { PetGuide } from './PetGuide';
export { Landscape } from './Landscape';
export { PathCamera } from './PathCamera';
export { LessonModal } from './LessonModal';
```

- [ ] **Step 2: Create main page**

```tsx
// frontend/src/pages/LearningPath3D.tsx
import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearningPathScene, LessonModal } from '@/components/learning-path-3d';
import { useLearningPath3DStore } from '@/hooks/useLearningPath3D';
import { usePets } from '@/hooks/usePets';
import { useAuth } from '@/contexts/AuthContext';
import type { LessonNode, Unit } from '@/types/learning-path';

interface LearningPath3DProps {
  units?: Unit[];
}

// Demo data for development
const DEMO_UNITS: Unit[] = [
  {
    unit_id: 'unit-1',
    title: 'Getting Started',
    lessons: [
      { lesson_id: 'l1', title: 'Hello!', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '👋', position: 0.1 },
      { lesson_id: 'l2', title: 'Colors', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '🎨', position: 0.2 },
      { lesson_id: 'l3', title: 'Numbers', status: 'available', type: 'quiz', xp_reward: 75, icon: '🔢', position: 0.35 },
      { lesson_id: 'l4', title: 'Animals', status: 'available', type: 'ar_session', xp_reward: 100, icon: '🐱', position: 0.5 },
      { lesson_id: 'l5', title: 'Food', status: 'locked', type: 'flashcard', xp_reward: 50, icon: '🍎', position: 0.65 },
      { lesson_id: 'l6', title: 'Family', status: 'locked', type: 'quiz', xp_reward: 75, icon: '👨‍👩‍👧', position: 0.8 },
    ],
  },
];

export default function LearningPath3D({ units = DEMO_UNITS }: LearningPath3DProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { activePet } = usePets(userId);
  
  const {
    nodes,
    selectedNode,
    isModalOpen,
    currentProgress,
    setNodes,
    openModal,
    closeModal,
    setCurrentProgress,
  } = useLearningPath3DStore();

  // Convert units to flat nodes array
  const flatNodes = useMemo(() => {
    return units.flatMap((unit) => unit.lessons);
  }, [units]);

  // Initialize nodes on mount
  useEffect(() => {
    if (flatNodes.length > 0) {
      setNodes(flatNodes);
      
      // Set initial progress to furthest completed node
      const completedNodes = flatNodes.filter((n) => n.status === 'completed');
      if (completedNodes.length > 0) {
        const furthest = completedNodes.reduce((max, n) =>
          n.position > max.position ? n : max
        );
        setCurrentProgress(furthest.position);
      } else {
        // Start at first available
        const firstAvailable = flatNodes.find((n) => n.status === 'available');
        setCurrentProgress(firstAvailable?.position ?? 0);
      }
    }
  }, [flatNodes, setNodes, setCurrentProgress]);

  const handleNodeSelect = (node: LessonNode) => {
    if (node.status === 'available') {
      openModal(node);
    }
  };

  const handleStartLesson = () => {
    if (selectedNode) {
      closeModal();
      
      // Navigate based on lesson type
      if (selectedNode.type === 'ar_session') {
        navigate('/learn-ar');
      } else if (selectedNode.type === 'flashcard') {
        navigate('/flashcards');
      } else {
        navigate('/courses');
      }
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-sky-100">
      {/* 3D Scene */}
      <LearningPathScene
        nodes={nodes}
        currentProgress={currentProgress}
        activePet={activePet}
        onNodeSelect={handleNodeSelect}
      />

      {/* Header overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4">
        <div className="mx-auto max-w-md rounded-[24px] border-4 border-white bg-white/80 px-4 py-2 text-center backdrop-blur-sm shadow-lg">
          <h1 className="text-lg font-black text-slate-800">Learning Path</h1>
          <div className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-600">
            <span>⚡ 1250 XP</span>
            <span>🔥 12 Day Streak</span>
          </div>
        </div>
      </div>

      {/* Lesson Modal */}
      <LessonModal
        node={selectedNode}
        isOpen={isModalOpen}
        onClose={closeModal}
        onStart={handleStartLesson}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add route to App.tsx**

```tsx
// In App.tsx, add:
// import LearningPath3D from '@/pages/LearningPath3D';

// Add route:
// <Route path="/learning-path-3d" element={<LearningPath3D />} />
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LearningPath3D.tsx frontend/src/components/learning-path-3d/index.ts
git commit -m "feat(3d-path): add main page and barrel export

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Progress Trail (Golden Path)

**Files:**
- Modify: `frontend/src/components/learning-path-3d/ClayPath.tsx`

- [ ] **Step 1: Add progress trail to clay path**

```tsx
// Add to ClayPath.tsx after the main path mesh
// Progress trail (golden path behind completed lessons)
{currentProgress > 0 && (
  <mesh>
    <tubeGeometry args={[spline, 100, 0.3, 8, false]} />
    <meshStandardMaterial
      color="#FFD700"
      emissive="#FFD700"
      emissiveIntensity={0.2}
      roughness={0.5}
      transparent
      opacity={0.6}
    />
  </mesh>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/ClayPath.tsx
git commit -m "feat(3d-path): add progress trail to clay path

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Completion Celebration

**Files:**
- Modify: `frontend/src/components/learning-path-3d/PetGuide.tsx`

- [ ] **Step 1: Add celebration animation**

```tsx
// Add to PetGuide.tsx
interface PetGuideProps {
  pet: Pet;
  progress: number;
  isCelebrating?: boolean;
}

// In useFrame, add celebration bounce:
useFrame((state, delta) => {
  if (groupRef.current) {
    // ... existing position/rotation code
    
    // Celebration jump
    if (isCelebrating) {
      const jumpHeight = Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.5;
      groupRef.current.position.y += jumpHeight;
    }
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/learning-path-3d/PetGuide.tsx
git commit -m "feat(3d-path): add celebration animation to pet guide

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: Integration with Real Data

**Files:**
- Modify: `frontend/src/pages/LearningPath3D.tsx`

- [ ] **Step 1: Connect to existing API**

```tsx
// Replace demo data with API call
import { apiClient } from '@/services/apiClient';

export default function LearningPath3D() {
  const [units, setUnits] = React.useState<Unit[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    apiClient.get('/api/v1/learning-paths/user')
      .then((data) => {
        // Transform API response to Unit[]
        setUnits(transformLearningPathData(data));
      })
      .catch((error) => {
        console.error('Failed to load learning path:', error);
        setUnits(DEMO_UNITS); // Fallback to demo
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-6xl">🐾</div>
          <p className="mt-4 font-bold text-slate-600">Loading your path...</p>
        </div>
      </div>
    );
  }

  // ... rest of component
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LearningPath3D.tsx
git commit -m "feat(3d-path): connect to real learning path API

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: Performance Optimization

**Files:**
- Modify: Various components

- [ ] **Step 1: Add instancing for trees and clouds**

```tsx
// In Landscape.tsx, use instanced meshes:
const treeCount = 20;
const treeRef = useRef<THREE.InstancedMesh>(null);

useMemo(() => {
  const tempMatrix = new THREE.Matrix4();
  for (let i = 0; i < treeCount; i++) {
    const x = (Math.random() - 0.5) * 40;
    const z = -Math.random() * 40;
    tempMatrix.setPosition(x, -0.3, z);
    treeRef.current?.setMatrixAt(i, tempMatrix);
  }
  treeRef.current?.instanceMatrix.needsUpdate = true;
}, []);
```

- [ ] **Step 2: Add LOD for distant nodes**

```tsx
// In LessonNode.tsx, reduce detail for distant nodes:
// Use simple sphere for distant nodes, full geometry for close ones
const useLowDetail = position[2] < -20;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/learning-path-3d/*.tsx
git commit -m "perf(3d-path): add instancing and LOD optimizations

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Types & Spline Utils | ⬜ |
| 2 | Zustand Store | ⬜ |
| 3 | Scene Wrapper | ⬜ |
| 4 | Clay Path | ⬜ |
| 5 | Lesson Node | ⬜ |
| 6 | Pet Guide | ⬜ |
| 7 | Landscape | ⬜ |
| 8 | Path Camera | ⬜ |
| 9 | Lesson Modal | ⬜ |
| 10 | Main Page | ⬜ |
| 11 | Progress Trail | ⬜ |
| 12 | Celebration | ⬜ |
| 13 | Real Data | ⬜ |
| 14 | Optimization | ⬜ |

**Total: 14 tasks**
