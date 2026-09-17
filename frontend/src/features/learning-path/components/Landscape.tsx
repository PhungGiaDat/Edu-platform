/**
 * Landscape.tsx
 *
 * Claymorphic landscape environment for the 3D learning path.
 * Includes hills, clouds, trees, and a gradient sky.
 */

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { getCategoryPreset, type CategoryPreset } from '../categoryPresets';

// ========== Component ==========

export interface LandscapeProps {
  /** selectedCourse.category_key — presentation only, never a business rule. */
  categoryKey?: string | null;
}

export const Landscape: React.FC<LandscapeProps> = ({ categoryKey }) => {
  const preset = useMemo(() => getCategoryPreset(categoryKey), [categoryKey]);

  return (
    <group>
      {/* Sky gradient sphere */}
      <Sky preset={preset} />

      {/* Ground plane with hills */}
      <GroundWithHills preset={preset} />

      {/* Background hills */}
      <BackgroundHills preset={preset} />

      {/* Category-themed props along path edges */}
      <Props preset={preset} />

      {/* Floating clouds */}
      <CloudGroup />
    </group>
  );
};

// ========== Sky ==========

const Sky: React.FC<{ preset: CategoryPreset }> = ({ preset }) => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(preset.skyTop) },
        bottomColor: { value: new THREE.Color(preset.skyBottom) },
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
  }, [preset.skyTop, preset.skyBottom]);

  return (
    <mesh scale={[100, 100, 100]}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={material} />
    </mesh>
  );
};

// ========== Ground with Hills ==========

const GroundWithHills: React.FC<{ preset: CategoryPreset }> = ({ preset }) => {
  const groundMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(preset.grassHill),
    });
  }, [preset.grassHill]);

  const hillMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(preset.grassHill),
    });
  }, [preset.grassHill]);

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

const BackgroundHills: React.FC<{ preset: CategoryPreset }> = ({ preset }) => {
  const hillMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: new THREE.Color(preset.grassDark),
    });
  }, [preset.grassDark]);

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

// ========== Props (category-themed, along path edges) ==========

/** Shared placement for every prop shape so category switching feels like a
 * re-skin, not a re-arranged scene. */
const PROP_POSITIONS: Array<[number, number, number]> = [
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

const Props: React.FC<{ preset: CategoryPreset }> = ({ preset }) => {
  switch (preset.propShape) {
    case 'schoolBlock':
      return <SchoolWorld />;
    case 'house':
    case 'flower':
      return <SimpleProps preset={preset} />;
    case 'tree':
    default:
      return <NatureClusters preset={preset} />;
  }
};

/**
 * school_food used to route through the same generic box+sphere
 * SimpleProps system as every other category — a "school" that's really
 * just a differently-colored version of "home" isn't a distinct world.
 * This is real school/classroom silhouette language: alphabet blocks
 * (foreground, path edge), book stacks (midground), pencils (background
 * landmarks) and a lunchbox apple accent — all primitives, no new assets.
 */
const ALPHABET_BLOCK_COLORS = ['#E85D5D', '#4C9AE8', '#F2C94C', '#6FCF7A'];
const ALPHABET_BLOCK_POSITIONS: Array<[number, number, number]> = [
  [-1.6, 0, -1],
  [1.5, 0, 2],
  [-1.5, 0, 8],
  [1.6, 0, 13],
];

const BOOK_STACK_POSITIONS: Array<[number, number, number]> = [
  [-2.6, 0, 4],
  [2.7, 0, 9],
  [-2.5, 0, 17],
];

const PENCIL_POSITIONS: Array<[number, number, number]> = [
  [-6, 0, -2],
  [6, 0, 6],
  [-6.5, 0, 15],
];

const LUNCHBOX_POSITIONS: Array<[number, number, number]> = [
  [1.1, 0, -1],
  [-1.2, 0, 10],
];

const SchoolWorld: React.FC = () => {
  const blockRotations = useMemo(() => ALPHABET_BLOCK_POSITIONS.map(() => Math.random() * Math.PI * 2), []);

  return (
    <group>
      {/* Foreground: alphabet blocks hugging the path edge. */}
      {ALPHABET_BLOCK_POSITIONS.map((pos, i) => (
        <mesh key={`block-${i}`} position={[pos[0], 0.22, pos[2]]} rotation={[0, blockRotations[i], 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshStandardMaterial color={ALPHABET_BLOCK_COLORS[i % ALPHABET_BLOCK_COLORS.length]} roughness={0.7} />
        </mesh>
      ))}

      {/* Midground: stacked books, slightly rotated per layer for a
          "just set down" feel instead of a perfect stack. */}
      {BOOK_STACK_POSITIONS.map((pos, i) => (
        <group key={`books-${i}`} position={pos}>
          {[0, 1, 2].map((layer) => (
            <mesh
              key={layer}
              position={[0, 0.08 + layer * 0.16, 0]}
              rotation={[0, layer * 0.25, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[0.7, 0.14, 0.5]} />
              <meshStandardMaterial color={ALPHABET_BLOCK_COLORS[(i + layer) % ALPHABET_BLOCK_COLORS.length]} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Background: tall pencils as landmarks, visible from a distance. */}
      {PENCIL_POSITIONS.map((pos, i) => (
        <group key={`pencil-${i}`} position={pos}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 2, 6]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#F2C94C' : '#6FCF7A'} roughness={0.6} />
          </mesh>
          <mesh position={[0, 2.15, 0]} castShadow>
            <coneGeometry args={[0.16, 0.3, 6]} />
            <meshStandardMaterial color="#EED9B6" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.35, 0]} castShadow>
            <coneGeometry args={[0.05, 0.12, 6]} />
            <meshStandardMaterial color="#3A3A3A" roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* A small lunchbox-apple accent near the path — the "food" half of
          school_food. */}
      {LUNCHBOX_POSITIONS.map((pos, i) => (
        <group key={`apple-${i}`} position={[pos[0], 0.18, pos[2]]}>
          <mesh castShadow>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color="#E85D5D" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 5]} />
            <meshStandardMaterial color="#6FA85C" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Two-instanced-mesh prop (base + accent) — covers house/flower without a
 * bespoke geometry system per category. (school_food has its own SchoolWorld
 * now — a real classroom/schoolyard silhouette needed more than a
 * recolored box+sphere.) */
const SimpleProps: React.FC<{ preset: CategoryPreset }> = ({ preset }) => {
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const accentRef = useRef<THREE.InstancedMesh>(null);

  const scales = useMemo(() => PROP_POSITIONS.map(() => 0.8 + Math.random() * 0.4), []);

  const baseMaterial = useMemo(
    () => new THREE.MeshToonMaterial({ color: new THREE.Color(preset.propColor) }),
    [preset.propColor],
  );
  const accentMaterial = useMemo(
    () => new THREE.MeshToonMaterial({ color: new THREE.Color(preset.propAccent) }),
    [preset.propAccent],
  );

  const shape = preset.propShape;

  useMemo(() => {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    PROP_POSITIONS.forEach((pos, i) => {
      const s = scales[i];

      if (shape === 'house') {
        const bodyHeight = 0.7 * s;
        position.set(pos[0], pos[1] + bodyHeight / 2, pos[2]);
        scale.set(0.7 * s, bodyHeight, 0.6 * s);
        matrix.compose(position, quaternion, scale);
        baseRef.current?.setMatrixAt(i, matrix);

        position.set(pos[0], pos[1] + bodyHeight + 0.25 * s, pos[2]);
        scale.set(0.55 * s, 0.5 * s, 0.55 * s);
        matrix.compose(position, quaternion, scale);
        accentRef.current?.setMatrixAt(i, matrix);
      } else {
        // flower
        const stemHeight = 0.4 * s;
        position.set(pos[0], pos[1] + stemHeight / 2, pos[2]);
        scale.set(0.06 * s, stemHeight, 0.06 * s);
        matrix.compose(position, quaternion, scale);
        baseRef.current?.setMatrixAt(i, matrix);

        position.set(pos[0], pos[1] + stemHeight + 0.12 * s, pos[2]);
        scale.set(0.22 * s, 0.22 * s, 0.22 * s);
        matrix.compose(position, quaternion, scale);
        accentRef.current?.setMatrixAt(i, matrix);
      }
    });

    if (baseRef.current) baseRef.current.instanceMatrix.needsUpdate = true;
    if (accentRef.current) accentRef.current.instanceMatrix.needsUpdate = true;
  }, [scales, shape]);

  return (
    <group>
      <instancedMesh ref={baseRef} args={[undefined, undefined, PROP_POSITIONS.length]} castShadow>
        {shape === 'flower' ? <cylinderGeometry args={[1, 1, 1, 6]} /> : <boxGeometry args={[1, 1, 1]} />}
        <primitive object={baseMaterial} attach="material" />
      </instancedMesh>
      <instancedMesh ref={accentRef} args={[undefined, undefined, PROP_POSITIONS.length]} castShadow>
        {shape === 'flower' ? (
          <sphereGeometry args={[1, 8, 8]} />
        ) : shape === 'house' ? (
          <coneGeometry args={[1, 1, 4]} />
        ) : (
          <sphereGeometry args={[1, 8, 8]} />
        )}
        <primitive object={accentMaterial} attach="material" />
      </instancedMesh>
    </group>
  );
};

/**
 * NatureClusters — the "nature" world (also the fallback for any unmapped
 * category). Real Kenney low-poly nature-kit GLBs already ship in
 * frontend/public/assets/models/ (tiny files, a few KB each); a procedural
 * cream cone-tree read as generic-Three.js-demo. Foreground (flowers near
 * the path edge) / midground (mushroom clusters, procedural rocks) /
 * background (oak tree clusters) layering, plus a shallow stream, is what
 * makes this a "nature world" rather than scattered props on flat ground.
 */
const TREE_MODEL_URL = '/assets/models/tree_oak.glb';
const MUSHROOM_MODEL_URL = '/assets/models/mushroom_red.glb';
const FLOWER_MODEL_URL = '/assets/models/flower_redA.glb';

function useClonedInstances(url: string, count: number) {
  const { scene } = useGLTF(url);
  return useMemo(() => Array.from({ length: count }, () => scene.clone()), [scene, count]);
}

const NatureClusters: React.FC<{ preset: CategoryPreset }> = ({ preset }) => {
  const treeClones = useClonedInstances(TREE_MODEL_URL, PROP_POSITIONS.length);
  const mushroomClones = useClonedInstances(MUSHROOM_MODEL_URL, 6);
  const flowerClones = useClonedInstances(FLOWER_MODEL_URL, 10);

  const treeScales = useMemo(() => PROP_POSITIONS.map(() => 1.1 + Math.random() * 0.6), []);
  const treeRotations = useMemo(() => PROP_POSITIONS.map(() => Math.random() * Math.PI * 2), []);

  // Midground: a small mushroom cluster tucked just inside the tree line.
  const mushroomPositions = useMemo<Array<[number, number, number]>>(
    () => [
      [-1.6, 0, -1],
      [-1.4, 0, 5],
      [-1.7, 0, 11],
      [1.6, 0, 2],
      [1.5, 0, 8],
      [1.8, 0, 14],
    ],
    [],
  );

  // Foreground: flowers hugging the path edge, closer in than the trees.
  const flowerPositions = useMemo<Array<[number, number, number]>>(() => {
    const positions: Array<[number, number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      positions.push([side * (0.9 + Math.random() * 0.3), 0, i * 2.2 - 2]);
    }
    return positions;
  }, []);

  // Rock material shared by every procedural rock instance.
  const rockMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#9C9186', roughness: 0.95 }),
    [],
  );
  const rockPositions = useMemo<Array<[number, number, number]>>(
    () => [
      [-2.6, 0, 2],
      [2.7, 0, -1],
      [-2.4, 0, 9],
      [2.5, 0, 12],
      [-2.8, 0, 17],
    ],
    [],
  );

  const streamMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6FB8D9',
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.75,
      }),
    [],
  );

  return (
    <group>
      {/* Background: oak tree clusters along both edges of the corridor. */}
      {treeClones.map((clone, i) => (
        <primitive
          key={`tree-${i}`}
          object={clone}
          position={PROP_POSITIONS[i]}
          scale={treeScales[i]}
          rotation={[0, treeRotations[i], 0]}
        />
      ))}

      {/* Midground: mushroom clusters + low procedural rocks. */}
      {mushroomClones.map((clone, i) => (
        <primitive key={`mushroom-${i}`} object={clone} position={mushroomPositions[i]} scale={0.6} />
      ))}
      {rockPositions.map((pos, i) => (
        <mesh key={`rock-${i}`} position={[pos[0], 0.14, pos[2]]} scale={[0.35, 0.28, 0.3]} receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <primitive object={rockMaterial} attach="material" />
        </mesh>
      ))}

      {/* Foreground: flowers hugging the path edge. */}
      {flowerClones.map((clone, i) => (
        <primitive key={`flower-${i}`} object={clone} position={flowerPositions[i]} scale={0.5} />
      ))}

      {/* A shallow stream running alongside the corridor — lightweight
          "river" visual idea, a single tinted plane rather than a
          simulated water surface. */}
      <mesh position={[-4.6, 0.02, 9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 24]} />
        <primitive object={streamMaterial} attach="material" />
      </mesh>

      {/* Keep the prop-color/accent from the preset visible too, via the
          grass-edge accent underlining the corridor (ties this category
          system to the shared preset contract, not just hardcoded assets). */}
      <mesh position={[0, 0.005, 9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 26]} />
        <meshBasicMaterial color={preset.grassDark} transparent opacity={0.15} />
      </mesh>
    </group>
  );
};

useGLTF.preload(TREE_MODEL_URL);
useGLTF.preload(MUSHROOM_MODEL_URL);
useGLTF.preload(FLOWER_MODEL_URL);

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
      color: new THREE.Color('#FFFFFF'),
    });
  }, []);

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
