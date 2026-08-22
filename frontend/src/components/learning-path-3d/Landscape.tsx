/**
 * Landscape.tsx
 *
 * Claymorphic landscape environment for the 3D learning path.
 * Includes hills, clouds, trees, and a gradient sky.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ========== Constants ==========

const COLORS = {
  grassHill: '#B8E6B8',
  grassDark: '#8FBC8F',
  skyTop: '#87CEEB',
  skyBottom: '#E0F4FF',
  cloud: '#FFFFFF',
  treeTrunk: '#8B4513',
  treeLeaves: '#228B22',
};

// ========== Component ==========

export const Landscape: React.FC = () => {
  return (
    <group>
      {/* Sky gradient sphere */}
      <Sky />

      {/* Ground plane with hills */}
      <GroundWithHills />

      {/* Background hills */}
      <BackgroundHills />

      {/* Trees along path edges */}
      <Trees />

      {/* Floating clouds */}
      <CloudGroup />
    </group>
  );
};

// ========== Sky ==========

const Sky: React.FC = () => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(COLORS.skyTop) },
        bottomColor: { value: new THREE.Color(COLORS.skyBottom) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, []);

  return (
    <mesh scale={[100, 100, 100]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} />
    </mesh>
  );
};

// ========== Ground with Hills ==========

const GroundWithHills: React.FC = () => {
  const groundMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(COLORS.grassHill),
    });
  }, []);

  const hillMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(COLORS.grassHill),
    });
  }, []);

  return (
    <group>
      {/* Main ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[100, 100]} />
        <primitive object={groundMaterial} />
      </mesh>

      {/* Small rolling hills */}
      {[
        { pos: [-5, 0.2, -3], scale: [2, 0.8, 2] },
        { pos: [8, 0.3, -5], scale: [3, 1.0, 2.5] },
        { pos: [-10, 0.25, 2], scale: [2.5, 0.9, 2] },
        { pos: [15, 0.35, -2], scale: [3.5, 1.2, 3] },
        { pos: [-8, 0.2, -8], scale: [2, 0.7, 2] },
        { pos: [12, 0.28, 4], scale: [2.8, 1.0, 2.2] },
      ].map((hill, i) => (
        <mesh
          key={`hill-${i}`}
          position={hill.pos as [number, number, number]}
          scale={hill.scale as [number, number, number]}
          receiveShadow
          castShadow
        >
          <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={hillMaterial.clone()} />
        </mesh>
      ))}
    </group>
  );
};

// ========== Background Hills ==========

const BackgroundHills: React.FC = () => {
  const hillMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(COLORS.grassDark),
    });
  }, []);

  const hills = [
    { pos: [-20, 0, -15], scale: [8, 5, 8] },
    { pos: [-8, 0, -18], scale: [10, 6, 10] },
    { pos: [5, 0, -20], scale: [12, 7, 10] },
    { pos: [18, 0, -16], scale: [9, 5.5, 9] },
    { pos: [25, 0, -12], scale: [7, 4, 7] },
    { pos: [-25, 0, -10], scale: [6, 3.5, 6] },
    { pos: [0, 0, -25], scale: [15, 8, 12] },
    { pos: [-15, 0, -22], scale: [11, 6.5, 10] },
    { pos: [12, 0, -22], scale: [10, 6, 9] },
  ];

  return (
    <group>
      {hills.map((hill, i) => (
        <mesh
          key={`bg-hill-${i}`}
          position={hill.pos as [number, number, number]}
          scale={hill.scale as [number, number, number]}
          receiveShadow
        >
          <sphereGeometry args={[1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={hillMaterial.clone()} />
        </mesh>
      ))}
    </group>
  );
};

// ========== Trees ==========

const Trees: React.FC = () => {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const leaves1Ref = useRef<THREE.InstancedMesh>(null);
  const leaves2Ref = useRef<THREE.InstancedMesh>(null);
  const leaves3Ref = useRef<THREE.InstancedMesh>(null);

  // Position trees along the sides of the path area
  const treePositions: Array<[number, number, number]> = [
    // Left side
    [-2, 0, -2],
    [-3.5, 0, 1],
    [-2, 0, 4],
    [-3, 0, 7],
    [-2.5, 0, 10],
    [-3, 0, 13],
    [-2, 0, 16],
    [-3.5, 0, 19],
    // Right side
    [2, 0, 0],
    [3, 0, 3],
    [2.5, 0, 6],
    [3, 0, 9],
    [2, 0, 12],
    [3.5, 0, 15],
    [2, 0, 18],
    [3, 0, 21],
  ];

  // Generate random scales for each tree
  const treeScales = useMemo(() => {
    return treePositions.map(() => 0.8 + Math.random() * 0.4);
  }, []);

  // Materials for instanced meshes
  const trunkMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(COLORS.treeTrunk),
    });
  }, []);

  const leavesMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(COLORS.treeLeaves),
    });
  }, []);

  // Update instance matrices when positions change
  useMemo(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    treePositions.forEach((pos, i) => {
      const s = treeScales[i];
      const trunkHeight = 0.6 * s;
      const trunkRadius = 0.12 * s;

      // Trunk instance
      position.set(pos[0], pos[1] + trunkHeight / 2, pos[2]);
      scale.set(trunkRadius * 0.7, trunkHeight, trunkRadius * 0.7);
      matrix.compose(position, quaternion, scale);
      if (trunkRef.current) {
        trunkRef.current.setMatrixAt(i, matrix);
      }

      // Leaves layer 1
      const leavesRadius = 0.5 * s;
      const leavesHeight = 0.8 * s;
      position.set(pos[0], pos[1] + trunkHeight + leavesHeight * 0.3, pos[2]);
      scale.set(leavesRadius, leavesHeight * 0.6, leavesRadius);
      matrix.compose(position, quaternion, scale);
      if (leaves1Ref.current) {
        leaves1Ref.current.setMatrixAt(i, matrix);
      }

      // Leaves layer 2
      position.set(pos[0], pos[1] + trunkHeight + leavesHeight * 0.6, pos[2]);
      scale.set(leavesRadius * 0.7, leavesHeight * 0.5, leavesRadius * 0.7);
      matrix.compose(position, quaternion, scale);
      if (leaves2Ref.current) {
        leaves2Ref.current.setMatrixAt(i, matrix);
      }

      // Leaves layer 3
      position.set(pos[0], pos[1] + trunkHeight + leavesHeight * 0.85, pos[2]);
      scale.set(leavesRadius * 0.4, leavesHeight * 0.35, leavesRadius * 0.4);
      matrix.compose(position, quaternion, scale);
      if (leaves3Ref.current) {
        leaves3Ref.current.setMatrixAt(i, matrix);
      }
    });

    // Mark all instanced meshes as needing update
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (leaves1Ref.current) leaves1Ref.current.instanceMatrix.needsUpdate = true;
    if (leaves2Ref.current) leaves2Ref.current.instanceMatrix.needsUpdate = true;
    if (leaves3Ref.current) leaves3Ref.current.instanceMatrix.needsUpdate = true;
  }, [treePositions, treeScales]);

  return (
    <group>
      {/* Trunk instanced mesh */}
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, treePositions.length]}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <primitive object={trunkMaterial} attach="material" />
      </instancedMesh>

      {/* Leaves layer 1 instanced mesh */}
      <instancedMesh
        ref={leaves1Ref}
        args={[undefined, undefined, treePositions.length]}
        castShadow
      >
        <coneGeometry args={[1, 1, 8]} />
        <primitive object={leavesMaterial} attach="material" />
      </instancedMesh>

      {/* Leaves layer 2 instanced mesh */}
      <instancedMesh
        ref={leaves2Ref}
        args={[undefined, undefined, treePositions.length]}
        castShadow
      >
        <coneGeometry args={[1, 1, 8]} />
        <primitive object={leavesMaterial} attach="material" />
      </instancedMesh>

      {/* Leaves layer 3 instanced mesh */}
      <instancedMesh
        ref={leaves3Ref}
        args={[undefined, undefined, treePositions.length]}
        castShadow
      >
        <coneGeometry args={[1, 1, 8]} />
        <primitive object={leavesMaterial} attach="material" />
      </instancedMesh>
    </group>
  );
};

// ========== Clouds ==========

const CloudGroup: React.FC = () => {
  const cloudPositions: Array<[number, number, number]> = [
    [-8, 5, -5],
    [5, 6, -8],
    [-3, 4.5, -12],
    [10, 5.5, -6],
    [-15, 6, -3],
    [8, 4, -15],
    [-5, 5, 2],
    [15, 5, -10],
  ];

  return (
    <group>
      {cloudPositions.map((pos, i) => (
        <Cloud
          key={`cloud-${i}`}
          position={pos}
          speed={0.005 + Math.random() * 0.01}
        />
      ))}
    </group>
  );
};

interface CloudProps {
  position: [number, number, number];
  speed?: number;
}

const Cloud: React.FC<CloudProps> = ({ position, speed = 0.01 }) => {
  const groupRef = useRef<THREE.Group>(null);

  const cloudMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(COLORS.cloud),
    });
  }, []);

  // Store initial X position for reset
  const initialX = position[0];

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x += speed;
      if (groupRef.current.position.x > 30) {
        groupRef.current.position.x = -30;
      }
    }
  });

  // Randomize cloud shape slightly
  const blobOffsets = useMemo(() => {
    return Array.from({ length: 4 }, () => ({
      x: (Math.random() - 0.5) * 1.2,
      y: (Math.random() - 0.5) * 0.3,
      z: (Math.random() - 0.5) * 0.5,
      scale: 0.6 + Math.random() * 0.4,
    }));
  }, []);

  return (
    <group ref={groupRef} position={position}>
      {/* Center blob */}
      <mesh scale={[1.5, 0.6, 0.8]}>
        <sphereGeometry args={[0.8, 6, 6]} />
        <primitive object={cloudMaterial} />
      </mesh>

      {/* Surrounding blobs */}
      {blobOffsets.map((offset, i) => (
        <mesh
          key={i}
          position={[offset.x, offset.y, offset.z]}
          scale={[offset.scale, offset.scale * 0.5, offset.scale]}
        >
          <sphereGeometry args={[0.5, 6, 6]} />
          <primitive object={cloudMaterial} />
        </mesh>
      ))}
    </group>
  );
};

// ========== Export ==========

export default Landscape;
