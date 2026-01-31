// src/components/Gamification/Buddy3D.tsx
// 3D Buddy Character using GLB model from Kenney Blocky Characters
// Alternative to procedural Pet3D - uses actual 3D model file

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Buddy3DProps {
    modelPath?: string; // Default: /assets/models/buddy.glb
    visible?: boolean;
    onClick?: () => void;
    autoRotate?: boolean;
    bounceSpeed?: number;
}

// GLB Model Loader Component
function BuddyModel({ 
    modelPath = '/assets/models/buddy.glb',
    bounceSpeed = 2 
}: { 
    modelPath: string;
    bounceSpeed: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF(modelPath);
    
    // Clone the scene to avoid sharing issues
    const clonedScene = React.useMemo(() => {
        const clone = scene.clone();
        // Ensure materials are properly set up
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                // Make materials double-sided for better visibility
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(mat => {
                            mat.side = THREE.DoubleSide;
                        });
                    } else {
                        mesh.material.side = THREE.DoubleSide;
                    }
                }
            }
        });
        return clone;
    }, [scene]);
    
    // Idle animation - gentle bounce and sway
    useFrame((state) => {
        if (!groupRef.current) return;
        
        // Gentle bounce
        const bounce = Math.sin(state.clock.elapsedTime * bounceSpeed) * 0.05;
        groupRef.current.position.y = bounce;
        
        // Subtle rotation sway
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    });
    
    return (
        <group ref={groupRef}>
            <primitive 
                object={clonedScene} 
                scale={0.8}
                position={[0, -0.5, 0]}
            />
        </group>
    );
}

// Fallback component when model is loading
function LoadingFallback() {
    const meshRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 2;
        }
    });
    
    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#4ECDC4" wireframe />
        </mesh>
    );
}

// Main Buddy3D Component with Canvas
export const Buddy3D: React.FC<Buddy3DProps> = ({
    modelPath = '/assets/models/buddy.glb',
    visible = true,
    onClick,
    autoRotate = false,
    bounceSpeed = 2
}) => {
    if (!visible) return null;
    
    return (
        <div
            onClick={onClick}
            style={{
                width: '100%',
                height: '100%',
                cursor: onClick ? 'pointer' : 'default',
                borderRadius: '50%',
                overflow: 'hidden',
            }}
        >
            <Canvas
                camera={{ position: [0, 0.5, 2.5], fov: 50 }}
                style={{ background: 'transparent' }}
                gl={{ alpha: true, antialias: true }}
            >
                {/* Lighting */}
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <pointLight position={[-5, 5, 5]} intensity={0.3} color="#FFB6C1" />
                <pointLight position={[0, -3, 3]} intensity={0.2} color="#4ECDC4" />
                
                {/* Optional auto-rotate controls */}
                {autoRotate && (
                    <OrbitControls 
                        enableZoom={false}
                        enablePan={false}
                        autoRotate
                        autoRotateSpeed={2}
                    />
                )}
                
                {/* Floating animation wrapper */}
                <Float
                    speed={1.5}
                    rotationIntensity={0.1}
                    floatIntensity={0.3}
                >
                    <Suspense fallback={<LoadingFallback />}>
                        <BuddyModel 
                            modelPath={modelPath}
                            bounceSpeed={bounceSpeed}
                        />
                    </Suspense>
                </Float>
            </Canvas>
        </div>
    );
};

// Mini version for floating button
export const Buddy3DMini: React.FC<Buddy3DProps> = (props) => {
    return (
        <div
            style={{
                position: 'absolute',
                width: '80px',
                height: '80px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: -1,
            }}
        >
            <Buddy3D {...props} />
        </div>
    );
};

// Preload the model for faster initial render
useGLTF.preload('/assets/models/buddy.glb');

export default Buddy3D;
