/**
 * LessonNode.tsx
 *
 * Interactive 3D lesson node for the learning path. Renders the four
 * backend-owned states (completed/current/available/locked) — this
 * component never computes state itself, it only visualizes node.state.
 *
 * Every node stands on a small toy platform — a bare floating sphere reads
 * as a debug placeholder; a platform reads as a deliberate level marker,
 * even for locked/distant nodes.
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

/** Base "head" radius before per-state scale — smaller than earlier passes
 * because the platform now carries the marker's visual footprint. */
const NODE_RADIUS = 0.4;

// State colors — saturated so nodes read as the brightest thing in the
// scene, clearly above the more desaturated terrain/props behind them.
// Warm orange owns "you are here"; cool blue = open next; soft green = done;
// grey = not yet. Completed must never out-shine current.
const STATE_COLORS = {
  current: '#FF7A2F',
  available: '#4F9BEA',
  completed: '#58BE84',
  locked: '#AEB4BF',
} as const;

// Glow intensities
const GLOW_INTENSITIES = {
  current: 0.6,
  available: 0.25,
  completed: 0.15,
  locked: 0,
} as const;

/** Relative size hierarchy: current is the unmistakable landmark; locked is
 * visibly the least important. Understandable even with all text hidden. */
const STATE_SCALE = {
  current: 1.45,
  available: 1.0,
  completed: 0.9,
  locked: 0.72,
} as const;

// Clay material properties
const CLAY_COLOR = '#FFF0D9';
const CLAY_ROUGHNESS = 0.75;
const CLAY_METALNESS = 0;

// Hover scale bump, applied on top of the state's base scale.
const HOVER_SCALE_BUMP = 1.12;

const PLATFORM_HEIGHT = 0.16;

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

  const isLocked = node.state === 'locked';
  const isCurrent = node.state === 'current';
  const isCompleted = node.state === 'completed';
  const baseScale = STATE_SCALE[node.state] ?? 1;
  const platformRadius = NODE_RADIUS * baseScale * 1.5;

  // Grounded + yaw-only. The old up->tangent quaternion tipped every
  // platform onto its edge (a big vertical disc in front of the node).
  const { position, yaw } = useMemo(() => {
    const point = getPointOnSpline(spline, node.position);
    const tangent = getTangentOnSpline(spline, node.position);
    const pos = point.clone();
    pos.y += PLATFORM_HEIGHT + NODE_RADIUS * baseScale + 0.04;
    return { position: pos, yaw: Math.atan2(tangent.x, tangent.z) };
  }, [spline, node.position, baseScale]);

  // Get state color
  const stateColor = STATE_COLORS[node.state] || STATE_COLORS.locked;
  const glowIntensity = GLOW_INTENSITIES[node.state] || 0;

  // Create materials based on state
  const materials = useMemo(() => {
    const baseColor = new THREE.Color(CLAY_COLOR);
    const stateColorObj = new THREE.Color(stateColor);

    // Blend clay color with state color
    const blendedColor = baseColor.lerp(stateColorObj, isLocked ? 0.55 : 0.8);

    // Main clay material
    const mainMaterial = new THREE.MeshStandardMaterial({
      color: blendedColor,
      roughness: CLAY_ROUGHNESS,
      metalness: CLAY_METALNESS,
      emissive: new THREE.Color(stateColor),
      emissiveIntensity: glowIntensity * 0.5,
    });

    // Every node's platform — a quieter tint of the same state color, so
    // even locked/available nodes look like a designed marker, not a bare
    // sphere floating in space.
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(CLAY_COLOR).lerp(stateColorObj, isLocked ? 0.15 : 0.3),
      roughness: 0.85,
    });

    return { main: mainMaterial, platform: platformMaterial };
  }, [stateColor, glowIntensity, isLocked]);

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
        opacity: 0.45,
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
      const pulse = 1 + Math.sin(t * 1.6) * 0.06;
      if (haloRef.current) haloRef.current.scale.setScalar(pulse);
      haloMaterial.opacity = 0.55 + Math.sin(t * 1.6) * 0.15;
      if (beaconRef.current) {
        beaconMaterial.opacity = 0.32 + Math.sin(t * 1.6) * 0.1;
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
    <group position={[position.x, position.y, position.z]} rotation={[0, yaw, 0]}>
      {/* Toy platform — every node stands on one, sized by state. This is
          what turns a "gray placeholder sphere" into a deliberate level
          marker even when it's small/distant/locked. */}
      <mesh position={[0, -NODE_RADIUS * baseScale - PLATFORM_HEIGHT / 2, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[platformRadius, platformRadius * 1.08, PLATFORM_HEIGHT, 16]} />
        <primitive object={materials.platform} attach="material" />
      </mesh>

      {/* Current node gets a second, brighter inner rim on its platform —
          the strongest focal point in the scene. */}
      {isCurrent && (
        <mesh position={[0, -NODE_RADIUS * baseScale + PLATFORM_HEIGHT / 2 - 0.01, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[platformRadius * 0.72, platformRadius * 0.82, PLATFORM_HEIGHT, 16]} />
          <meshStandardMaterial color={STATE_COLORS.current} roughness={0.6} />
        </mesh>
      )}

      {/* Vertical light beacon — visible from far away, even when the node
          itself is small on screen or its label is hidden. */}
      {isCurrent && (
        <mesh ref={beaconRef} position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.04, 0.1, 2.8, 8, 1, true]} />
          <primitive object={beaconMaterial} attach="material" />
        </mesh>
      )}

      {/* Current-node halo ring — the single strongest visual cue that this
          is where the child should go next. */}
      {isCurrent && (
        <mesh ref={haloRef} position={[0, -NODE_RADIUS * baseScale - PLATFORM_HEIGHT + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[platformRadius * 1.1, platformRadius * 1.3, 32]} />
          <primitive object={haloMaterial} />
        </mesh>
      )}

      {/* Main node "head" */}
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
        {/* Cheap silhouette per state: faceted pebble when locked, smooth
            orb when open. */}
        <icosahedronGeometry args={[NODE_RADIUS, isLocked ? 0 : 2]} />
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
        zIndexRange={[20, 0]}
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

      {/* Thin signpost stem connecting the node to its label — without it
          the label reads as pasted-on text floating disconnected in space. */}
      {isCurrent && (
        <mesh position={[0, NODE_RADIUS + 0.26, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.52, 6]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
        </mesh>
      )}

      {/* Title + XP — CURRENT node only. Progressive disclosure: everything
          else stays a clean icon; full details live in LessonModal. */}
      {isCurrent && (
        <Html
          center
          position={[0, NODE_RADIUS + 0.6, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          distanceFactor={8}
          zIndexRange={[20, 0]}
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
