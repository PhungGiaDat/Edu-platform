/**
 * ClayFloat3D — decorative floating clay shapes (Three.js / R3F).
 *
 * Design goals (spec: vocabulary pages claymorphism refresh):
 * - Purely decorative: pointer-events none, aria-hidden, no interaction cost.
 * - Lazy-loaded via React.lazy in consumers (three chunk stays out of the
 *   initial bundle; manualChunks already isolates `three-vendor`).
 * - Honours `prefers-reduced-motion`: renders a static (non-rotating)
 *   arrangement instead of animating.
 * - Cheap: low-poly spheres/torus, MeshToonMaterial-free (plain
 *   meshStandardMaterial), DPR capped at 1.5 for mobile GPUs.
 */
import { Component, memo, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PASTELS = {
  sunshine: '#FFD93D',
  sky: '#6EB9FF',
  mint: '#B4E197',
  coral: '#FF9F9F',
  lavender: '#A78BFA',
  bubble: '#F472B6',
} as const;

/**
 * WebGL can be unavailable (blocked, driver crash, headless env). R3F's
 * Canvas throws in that case — degrade to a static pastel band instead of
 * crashing the page.
 */
class ClayFloat3DBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[ClayFloat3D] WebGL unavailable, using static fallback:', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div
          className="rounded-3xl h-full"
          style={{
            background: `linear-gradient(90deg, ${PASTELS.sunshine}55, ${PASTELS.coral}44, ${PASTELS.mint}55)`,
          }}
          aria-hidden="true"
        />
      );
    }
    return this.props.children;
  }
}

interface FloatShapeProps {
  position: [number, number, number];
  color: string;
  speed: number;
  radius: number;
  kind: 'sphere' | 'torus' | 'capsule';
  animate: boolean;
}

function FloatShape({ position, color, speed, radius, kind, animate }: FloatShapeProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!animate || !ref.current) return;
    const t = clock.getElapsedTime();
    // Gentle bob + slow spin — reads as "floating clay beads".
    ref.current.position.y = position[1] + Math.sin(t * speed + position[0]) * 0.18;
    ref.current.rotation.x = t * speed * 0.35;
    ref.current.rotation.y = t * speed * 0.22;
  });

  const geometry = useMemo(() => {
    switch (kind) {
      case 'torus':
        return new THREE.TorusGeometry(radius, radius * 0.42, 16, 32);
      case 'capsule':
        return new THREE.CapsuleGeometry(radius * 0.75, radius * 0.9, 8, 16);
      default:
        return new THREE.SphereGeometry(radius, 24, 24);
    }
  }, [kind, radius]);

  return (
    <mesh ref={ref} position={position} geometry={geometry} castShadow={false}>
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.05}
        flatShading={false}
      />
    </mesh>
  );
}

export interface ClayFloat3DProps {
  /** Canvas pixel height (width fills its container). */
  height?: number;
  /** Render spinning animation. Defaults to !prefers-reduced-motion. */
  animate?: boolean;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Floating clay pastel shapes. Wrap consumers in Suspense + an error
 * boundary (three chunk loads async); the canvas is pointer-transparent.
 */
export const ClayFloat3D = memo(function ClayFloat3D({
  height = 96,
  animate,
  className = '',
}: ClayFloat3DProps) {
  const shouldAnimate = animate ?? !prefersReducedMotion();

  const shapes = useMemo(
    () =>
      [
        { pos: [-1.6, 0.1, 0] as [number, number, number], color: PASTELS.sunshine, speed: 0.9, radius: 0.5, kind: 'sphere' as const },
        { pos: [-0.5, -0.25, -0.4] as [number, number, number], color: PASTELS.coral, speed: 1.15, radius: 0.34, kind: 'torus' as const },
        { pos: [0.55, 0.2, 0.1] as [number, number, number], color: PASTELS.sky, speed: 0.75, radius: 0.44, kind: 'capsule' as const },
        { pos: [1.6, -0.1, -0.2] as [number, number, number], color: PASTELS.mint, speed: 1.0, radius: 0.4, kind: 'sphere' as const },
        { pos: [0.1, 0.45, -0.6] as [number, number, number], color: PASTELS.lavender, speed: 1.3, radius: 0.24, kind: 'sphere' as const },
        { pos: [-1.05, 0.5, -0.5] as [number, number, number], color: PASTELS.bubble, speed: 0.85, radius: 0.22, kind: 'torus' as const },
      ],
    [],
  );

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{ height, pointerEvents: 'none', userSelect: 'none' }}
    >
      <ClayFloat3DBoundary>
        <Canvas
          camera={{ position: [0, 0, 4], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.85} />
          <directionalLight position={[2, 3, 4]} intensity={0.9} />
          <directionalLight position={[-3, -2, 2]} intensity={0.25} />
          {shapes.map((s, i) => (
            <FloatShape
              key={i}
              position={s.pos}
              color={s.color}
              speed={s.speed}
              radius={s.radius}
              kind={s.kind}
              animate={shouldAnimate}
            />
          ))}
        </Canvas>
      </ClayFloat3DBoundary>
    </div>
  );
});

export default ClayFloat3D;
