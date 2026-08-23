/**
 * LessonNode.tsx
 *
 * Interactive 3D lesson node component for the learning path.
 * Renders a sphere/icosahedron with clay material that displays lesson icon,
 * visual state colors, and XP badge.
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
  available: '#5B8DEF',
  completed: '#FFD700',
  locked: '#9CA3AF',
} as const;

// Glow intensities
const GLOW_INTENSITIES = {
  available: 0.4,
  completed: 0.5,
  locked: 0,
} as const;

// Clay material properties
const CLAY_COLOR = '#FFF0D9';
const CLAY_ROUGHNESS = 0.75;
const CLAY_METALNESS = 0;

// Hover scale factor
const HOVER_SCALE = 1.2;

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

  // Get state color
  const stateColor = STATE_COLORS[node.status] || STATE_COLORS.locked;
  const glowIntensity = GLOW_INTENSITIES[node.status] || 0;

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

    // Rim/edge highlight for depth
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CLAY_COLOR).lerp(new THREE.Color(stateColor), 0.2),
      roughness: CLAY_ROUGHNESS * 0.8,
      metalness: CLAY_METALNESS + 0.1,
      transparent: true,
      opacity: 0.8,
    });

    return { main: mainMaterial, rim: rimMaterial };
  }, [stateColor, glowIntensity]);

  // Animate hover and shimmer effects
  useFrame((state) => {
    if (!meshRef.current) return;

    // Smooth hover scale transition
    const targetScale = hovered && node.status !== 'locked' ? HOVER_SCALE : 1;
    const currentScale = meshRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
    meshRef.current.scale.setScalar(newScale);

    // Shimmer effect for completed nodes
    if (node.status === 'completed') {
      const shimmer = Math.sin(state.clock.elapsedTime * 3) * 0.5 + 0.5;
      materials.main.emissiveIntensity = glowIntensity * (0.3 + shimmer * 0.4);
    }

    // Subtle floating animation for available nodes
    if (node.status === 'available' && !hovered) {
      const float = Math.sin(state.clock.elapsedTime * 2 + node.position * 10) * 0.05;
      meshRef.current.position.y = position.y + float;
    }
  });

  // Pointer handlers
  const handlePointerOver = () => {
    if (node.status !== 'locked') {
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
      {/* Main node sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          if (node.status !== 'locked') {
            onClick();
          }
        }}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        {/* LOD: Use lower detail geometry for distant nodes */}
        <icosahedronGeometry args={position.z < -15 ? [NODE_RADIUS, 1] : [NODE_RADIUS, 2]} />
        <primitive object={materials.main} attach="material" />
      </mesh>

      {/* Glow effect for available/completed nodes */}
      {node.status !== 'locked' && (
        <mesh scale={1.15}>
          {/* LOD: Use lower detail geometry for distant nodes */}
          <icosahedronGeometry args={position.z < -15 ? [NODE_RADIUS, 1] : [NODE_RADIUS, 2]} />
          <meshBasicMaterial
            color={stateColor}
            transparent
            opacity={glowIntensity * 0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Icon overlay */}
      <Html
        center
        position={[0, 0, NODE_RADIUS + 0.01]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        distanceFactor={8}
      >
        <div
          style={{
            fontSize: node.icon.length > 2 ? '14px' : '20px',
            lineHeight: 1,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            filter: node.status === 'locked' ? 'grayscale(1) opacity(0.5)' : 'none',
          }}
        >
          {node.icon}
        </div>
      </Html>

      {/* XP Badge */}
      <Html
        center
        position={[0, XP_BADGE_Y_OFFSET, 0]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
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
            opacity: node.status === 'locked' ? 0.5 : 1,
          }}
        >
          +{node.xp_reward} XP
        </div>
      </Html>

      {/* Lock icon for locked nodes */}
      {node.status === 'locked' && (
        <Html
          center
          position={[0, 0, NODE_RADIUS + 0.01]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
          distanceFactor={8}
        >
          <div
            style={{
              fontSize: '12px',
              opacity: 0.7,
            }}
          >
            🔒
          </div>
        </Html>
      )}
    </group>
  );
};

// ========== Export ==========

export default LessonNode;
