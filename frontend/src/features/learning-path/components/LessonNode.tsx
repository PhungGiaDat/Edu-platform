/**
 * LessonNode.tsx
 *
 * Interactive 3D lesson node for the learning path. Renders the four
 * backend-owned states (completed/current/available/locked) — this
 * component never computes state itself, it only visualizes node.state.
 *
 * Progressive disclosure: only the CURRENT node shows title+XP text. Other
 * states show a single compact glyph (number/check/lock) — a permanent wall
 * of HTML labels over every node was the "visual clutter" failure; the
 * detailed information belongs in LessonModal.
 */

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LessonNode } from '@/types/learning-path';
import { getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';

// ========== Constants ==========

/** Base sphere radius before per-state scale is applied. Small nodes on a
 * mobile screen were unreadable — this is deliberately large. */
const NODE_RADIUS = 0.55;

// State colors — saturated so nodes read as the brightest thing in the
// scene, clearly above the more desaturated terrain/props behind them.
const STATE_COLORS = {
  current: '#3D6FE0',
  available: '#7FB0FF',
  completed: '#FFCF33',
  locked: '#9CA3AF',
} as const;

// Glow intensities
const GLOW_INTENSITIES = {
  current: 0.7,
  available: 0.3,
  completed: 0.45,
  locked: 0,
} as const;

/** Relative size hierarchy: current is the unmistakable landmark; locked is
 * visibly the least important. Understandable even with all text hidden. */
const STATE_SCALE = {
  current: 1.35,
  available: 1.0,
  completed: 0.95,
  locked: 0.85,
} as const;

// Clay material properties
const CLAY_COLOR = '#FFF0D9';
const CLAY_ROUGHNESS = 0.75;
const CLAY_METALNESS = 0;

// Hover scale bump, applied on top of the state's base scale.
const HOVER_SCALE_BUMP = 1.12;

// ========== Component Props ==========

export interface LessonNode3DProps {
  /** Lesson node data */
  node: LessonNode;
  /** Callback when node is clicked */
  onClick: () => void;
  /** Spline curve to calculate position from */
  spline: THREE.CatmullRomCurve3;
}

// ========== Component ==========

export const LessonNode3D: React.FC<LessonNode3DProps> = ({ node, onClick, spline }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate position and orientation from spline
  const { position, quaternion } = useMemo(() => {
    const point = getPointOnSpline(spline, node.position);
    const tangent = getTangentOnSpline(spline, node.position);

    // Position node slightly above the path
    const pos = point.clone();
    pos.y += NODE_RADIUS + 0.15;

    // Create quaternion to orient node to face along path
    const quat = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(tangent))));
    if (axis.length() > 0.001) {
      quat.setFromAxisAngle(axis, angle);
    }

    return { position: pos, quaternion: quat };
  }, [spline, node.position]);

  const isLocked = node.state === 'locked';
  const isCurrent = node.state === 'current';
  const isCompleted = node.state === 'completed';
  const baseScale = STATE_SCALE[node.state] ?? 1;

  // Get state color
  const stateColor = STATE_COLORS[node.state] || STATE_COLORS.locked;
  const glowIntensity = GLOW_INTENSITIES[node.state] || 0;

  // Create materials based on state
  const materials = useMemo(() => {
    const baseColor = new THREE.Color(CLAY_COLOR);
    const stateColorObj = new THREE.Color(stateColor);

    // Blend clay color with state color
    const blendedColor = baseColor.lerp(stateColorObj, 0.55);

    // Main clay material
    const mainMaterial = new THREE.MeshStandardMaterial({
      color: blendedColor,
      roughness: CLAY_ROUGHNESS,
      metalness: CLAY_METALNESS,
      emissive: new THREE.Color(stateColor),
      emissiveIntensity: glowIntensity * 0.5,
    });

    return { main: mainMaterial };
  }, [stateColor, glowIntensity]);

  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(STATE_COLORS.current),
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  const beaconMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(STATE_COLORS.current),
        transparent: true,
        opacity: 0.35,
      }),
    [],
  );

  // Animate hover, current-node pulse and shimmer effects
  useFrame((state) => {
    if (meshRef.current) {
      const targetScale = hovered && !isLocked ? baseScale * HOVER_SCALE_BUMP : baseScale;
      const currentScale = meshRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
      meshRef.current.scale.setScalar(newScale);
    }

    // Shimmer effect for completed nodes
    if (isCompleted) {
      const shimmer = Math.sin(state.clock.elapsedTime * 3) * 0.5 + 0.5;
      materials.main.emissiveIntensity = glowIntensity * (0.3 + shimmer * 0.4);
    }

    // Subtle floating animation for available nodes
    if (node.state === 'available' && !hovered && meshRef.current) {
      const float = Math.sin(state.clock.elapsedTime * 2 + node.position * 10) * 0.05;
      meshRef.current.position.y = position.y + float;
    }

    // Restrained pulse ring + light beacon for the current node — the single
    // strongest landmark, understandable even with labels hidden.
    if (isCurrent) {
      const t = state.clock.elapsedTime;
      const pulse = 1.25 + Math.sin(t * 1.6) * 0.06;
      if (haloRef.current) haloRef.current.scale.setScalar(pulse);
      haloMaterial.opacity = 0.35 + Math.sin(t * 1.6) * 0.1;
      if (beaconRef.current) {
        beaconMaterial.opacity = 0.22 + Math.sin(t * 1.6) * 0.08;
      }
    }
  });

  // Pointer handlers
  const handlePointerOver = () => {
    if (!isLocked) {
      setHovered(true);
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = 'default';
  };

  return (
    <group position={[position.x, position.y, position.z]} quaternion={quaternion}>
      {/* Raised platform — only the current node stands on one, so it reads
          as a landmark stop on the journey rather than just a floating ball. */}
      {isCurrent && (
        <mesh position={[0, -NODE_RADIUS - 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[NODE_RADIUS * 1.4, NODE_RADIUS * 1.55, 0.22, 16]} />
          <meshStandardMaterial color="#FFE8B8" roughness={0.8} />
        </mesh>
      )}

      {/* Vertical light beacon — visible from far away, even when the node
          itself is small on screen or its label is hidden. */}
      {isCurrent && (
        <mesh ref={beaconRef} position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.05, 0.12, 3.2, 8, 1, true]} />
          <primitive object={beaconMaterial} attach="material" />
        </mesh>
      )}

      {/* Current-node halo ring — the single strongest visual cue that this
          is where the child should go next. */}
      {isCurrent && (
        <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[NODE_RADIUS * 1.1, NODE_RADIUS * 1.3, 24]} />
          <primitive object={haloMaterial} />
        </mesh>
      )}

      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!isLocked) {
            onClick();
          }
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        {/* LOD: lower detail geometry for distant nodes */}
        <icosahedronGeometry args={position.z < -15 ? [NODE_RADIUS, 1] : [NODE_RADIUS, 2]} />
        <primitive object={materials.main} attach="material" />
      </mesh>

      {/* Soft glow for interactable states */}
      {!isLocked && (
        <mesh scale={1.15}>
          <icosahedronGeometry args={position.z < -15 ? [NODE_RADIUS, 1] : [NODE_RADIUS, 2]} />
          <meshBasicMaterial
            color={stateColor}
            transparent
            opacity={glowIntensity * 0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Center badge: order number, check, or lock — never more than one,
          they occupy the same spot. */}
      <Html
        center
        position={[0, 0, NODE_RADIUS + 0.01]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={8}
      >
        {isLocked ? (
          <div style={{ fontSize: '18px', opacity: 0.7 }}>{'\u{1F512}'}</div>
        ) : (
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              lineHeight: 1,
              color: '#1a1a2e',
              textShadow: '0 1px 2px rgba(0,0,0,0.15)',
            }}
          >
            {isCompleted ? '✓' : node.order}
          </div>
        )}
      </Html>

      {/* Title + XP — CURRENT node only. Progressive disclosure: everything
          else stays a clean icon; full details live in LessonModal. */}
      {isCurrent && (
        <Html
          center
          position={[0, NODE_RADIUS * 1.4 + 1.1, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          distanceFactor={8}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                color: '#1a1a2e',
                padding: '2px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {node.title}
            </div>
            <div
              style={{
                background: 'linear-gradient(135deg, #FFB347 0%, #FFD700 100%)',
                color: '#1a1a2e',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(255, 179, 71, 0.4)',
                border: '1px solid rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              +{node.xp_reward} XP
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// ========== Export ==========

export default LessonNode3D;
