// src/components/Gamification/Buddy3D.tsx
// 3D Buddy Character using GLB model from Kenney Blocky Characters
// Uses safe GLTF loading to prevent crashes when model fails to load

import React, { Suspense, useRef, useEffect, useState, ErrorInfo, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSafeGLTF, preloadGLTFSafe } from '@/hooks/useSafeGLTF';

interface Buddy3DProps {
    modelPath?: string; // Default: /assets/models/buddy.glb
    visible?: boolean;
    onClick?: () => void;
    autoRotate?: boolean;
    bounceSpeed?: number;
}

// Error Boundary for Canvas errors
interface CanvasErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface CanvasErrorBoundaryState {
    hasError: boolean;
}

class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
    constructor(props: CanvasErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_error: Error): CanvasErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[Buddy3D] Canvas error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}

// GLB Model Loader Component - Uses safe GLTF loading
function BuddyModel({
    modelPath = '/assets/models/buddy.glb',
    bounceSpeed = 2,
    onLoad,
    onError,
}: {
    modelPath: string;
    bounceSpeed: number;
    onLoad?: () => void;
    onError?: (error: string) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const hasNotifiedLoad = useRef(false);
    const hasNotifiedError = useRef(false);

    // Use safe GLTF loading - will never throw during render
    const { gltf, state, error } = useSafeGLTF(modelPath);

    // Notify parent of load success
    useEffect(() => {
        if (state === 'loaded' && gltf && !hasNotifiedLoad.current) {
            hasNotifiedLoad.current = true;
            onLoad?.();
        }
    }, [state, gltf, onLoad]);

    // Notify parent of errors
    useEffect(() => {
        if (state === 'error' && error && !hasNotifiedError.current) {
            hasNotifiedError.current = true;
            console.error('[Buddy3D] Model load error:', error);
            onError?.(error);
        }
    }, [state, error, onError]);

    // Clone the scene to avoid sharing issues
    const clonedScene = React.useMemo(() => {
        if (!gltf?.scene) return null;

        const clone = gltf.scene.clone();
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
    }, [gltf?.scene]);

    // Idle animation - gentle bounce and sway
    useFrame((frameState) => {
        if (!groupRef.current) return;

        // Gentle bounce
        const bounce = Math.sin(frameState.clock.elapsedTime * bounceSpeed) * 0.05;
        groupRef.current.position.y = bounce;

        // Subtle rotation sway
        groupRef.current.rotation.y = Math.sin(frameState.clock.elapsedTime * 0.5) * 0.1;
    });

    // Show nothing while loading (Suspense fallback will show)
    if (state === 'loading' || state === 'idle') {
        return null;
    }

    // Show nothing on error
    if (state === 'error' || !clonedScene) {
        return null;
    }

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

// Simple fallback display for when 3D fails completely
function Fallback2D() {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #4ECDC4 0%, #556270 100%)',
                borderRadius: '50%',
                fontSize: '2rem',
            }}
        >
            🤖
        </div>
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
    const [hasError, setHasError] = useState(false);

    if (!visible) return null;

    // If 3D completely failed, show fallback
    if (hasError) {
        return (
            <div
                onClick={onClick}
                style={{
                    width: '100%',
                    height: '100%',
                    cursor: onClick ? 'pointer' : 'default',
                }}
            >
                <Fallback2D />
            </div>
        );
    }

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
            <CanvasErrorBoundary fallback={<Fallback2D />}>
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
                                onError={() => setHasError(true)}
                            />
                        </Suspense>
                    </Float>
                </Canvas>
            </CanvasErrorBoundary>
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

// Safe preload that won't throw
preloadGLTFSafe('/assets/models/buddy.glb');

export default Buddy3D;
