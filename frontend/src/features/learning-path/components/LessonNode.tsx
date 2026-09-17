/**
 * LessonNode.tsx
 *
 * Interactive 3D lesson node for the learning path. Renders the four
 * backend-owned states (completed/current/available/locked) — this
 * component never computes state itself, it only visualizes node.state.
 */

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { LessonNode } from '@/types/learning-path';
import { getPointOnSpline, getTangentOnSpline } from '@/lib/pathSpline';

// ========== Constants ==========

const NODE_RADIUS = 0.4;

// State colors
const STATE_COLORS = {
  current: '#5B8DEF',
  available: '#8FB4F5',
  completed: '#FFD700',
  locked: '#9CA3AF',
} as const;

// Glow intensities
const GLOW_INTENSITIES = {
  current: 0.65,
  available: 0.3,
  completed: 0.5,
  locked: 0,
} as const;

// Clay material properties
const CLAY_COLOR = '#FFF0D9';
const CLAY_ROUGHNESS = 0.75;
const CLAY_METALNESS = 0;

// Hover scale factor
const HOVER_SCALE = 1.2;
/** The current node reads as the strongest focal point — slightly larger
 * even before any hover, per the requested visual hierarchy. */
const CURRENT_BASE_SCALE = 1.12;

// XP badge offset
const XP_BADGE_Y_OFFSET = 0.8;

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
  const [hovered, setHovered] = useState(false);

  // Calculate position and orientation from spline
  const { position, quaternion } = useMemo(() => {
    const point = getPointOnSpline(spline, node.position);
    const tangent = getTangentOnSpline(spline, node.position);

    // Position node slightly above the path
    const pos = point.clone();
    pos.y += NODE_RADIUS + 0.1;

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

  // Get state color
  const stateColor = STATE_COLORS[node.state] || STATE_COLORS.locked;
  const glowIntensity = GLOW_INTENSITIES[node.state] || 0;

  // Create materials based on state
  const materials = useMemo(() => {
    const baseColor = new THREE.Color(CLAY_COLOR);
    const stateColorObj = new THREE.Color(stateColor);

    // Blend clay color with state color
    const blendedColor = baseColor.lerp(stateColorObj, 0.4);

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

  // Animate hover, current-node pulse and shimmer effects
  useFrame((state) => {
    if (meshRef.current) {
      const baseScale = isCurrent ? CURRENT_BASE_SCALE : 1;
      const targetScale = hovered && !isLocked ? HOVER_SCALE : baseScale;
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

    // Restrained pulse ring for the current node — the strongest focal point.
    if (isCurrent && haloRef.current) {
      const pulse = 1.25 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06;
      haloRef.current.scale.setScalar(pulse);
      haloMaterial.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 1.6) * 0.1;
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

      {/* Center badge: order number, or a lock mark when locked — never both,
          they occupy the same spot. */}
      <Html
        center
        position={[0, 0, NODE_RADIUS + 0.01]}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={8}
      >
        {isLocked ? (
          <div style={{ fontSize: '16px', opacity: 0.7 }}>{'\u{1F512}'}</div>
        ) : (
          <div
            style={{
              fontSize: '18px',
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

      {/* XP badge — skipped for locked nodes (nothing to act on yet). */}
      {!isLocked && (
        <Html
          center
          position={[0, XP_BADGE_Y_OFFSET, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          distanceFactor={8}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #FFB347 0%, #FFD700 100%)',
              color: '#1a1a2e',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              boxShadow: '0 2px 8px rgba(255, 179, 71, 0.4)',
              border: '1px solid rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            +{node.xp_reward} XP
          </div>
        </Html>
      )}
    </group>
  );
};

// ========== Export ==========

export default LessonNode3D;
