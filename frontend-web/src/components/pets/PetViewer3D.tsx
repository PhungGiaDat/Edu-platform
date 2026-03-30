/**
 * PetViewer3D.tsx
 * 
 * 3D Pet Model Viewer component using React Three Fiber
 * Loads GLB/GLTF models from Supabase URLs and renders them with:
 * - Float animation for kid-friendly bobbing effect
 * - OrbitControls for user interaction (rotate, zoom)
 * - Proper lighting setup
 * - Suspense loading state
 * - Support for model animations (if available)
 * 
 * Following patterns from Pet3D.tsx and spec Pet3DPreview example
 */

import React, { Suspense, useRef, useEffect, useState, ErrorInfo, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { rarityConfig } from './PetCard';
import type { Pet } from '@/hooks/usePets';
import { useSafeGLTF, preloadGLTFSafe } from '@/hooks/useSafeGLTF';

// ========== Props Interfaces ==========

// Error Boundary for Canvas errors
interface CanvasErrorBoundaryProps {
    children: React.ReactNode;
    onError?: (error: Error) => void;
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
        // Filter out common THREE.js/WebGL errors that can be ignored
        const errorMessage = error?.message || '';
        const isIgnorableError = 
            errorMessage.includes('WebGL') ||
            errorMessage.includes('body') ||
            errorMessage.includes('Cannot read properties of undefined');
            
        console.error('[CanvasErrorBoundary] 3D Canvas error:', error, errorInfo);
        
        if (!isIgnorableError) {
            this.props.onError?.(error);
        } else {
            // For ignorable errors, still report but don't crash the UI
            console.warn('[CanvasErrorBoundary] Recoverable error, showing fallback');
            this.props.onError?.(new Error('3D model failed to load'));
        }
    }

    render() {
        if (this.state.hasError) {
            return null; // Let parent handle error display
        }
        return this.props.children;
    }
}

export interface PetViewer3DProps {
    /** The pet to display */
    pet: Pet;
    /** Height of the viewer container */
    height?: string | number;
    /** Enable orbit controls for interaction */
    enableControls?: boolean;
    /** Enable auto-rotation */
    autoRotate?: boolean;
    /** Auto-rotation speed */
    autoRotateSpeed?: number;
    /** Show loading indicator */
    showLoading?: boolean;
    /** Called when model finishes loading */
    onLoad?: () => void;
    /** Called on loading error */
    onError?: (error: Error) => void;
    /** Background style - 'transparent' | 'gradient' | 'solid' */
    background?: 'transparent' | 'gradient' | 'solid';
    /** Custom background color (for 'solid' mode) */
    backgroundColor?: string;
    /** Disable float animation */
    disableFloat?: boolean;
    /** Scale multiplier for the model */
    scale?: number;
}

interface Pet3DModelProps {
    url: string;
    scale: number;
    enableAnimation?: boolean;
    onLoad?: () => void;
    onError?: (error: Error) => void;
}

// ========== 3D Model Component ==========

/**
 * Pet3DModel - Safely loads and renders a GLTF model
 * Uses useSafeGLTF to prevent synchronous throws that crash React
 */
function Pet3DModel({ url, scale, enableAnimation = true, onLoad, onError }: Pet3DModelProps) {
    const groupRef = useRef<THREE.Group>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const hasNotifiedLoad = useRef(false);
    const hasNotifiedError = useRef(false);
    
    // Use safe GLTF loading with URL pre-validation
    const { gltf, state, error: loadError } = useSafeGLTF(url);
    
    // Notify parent of errors
    useEffect(() => {
        if (state === 'error' && loadError && !hasNotifiedError.current) {
            hasNotifiedError.current = true;
            console.error('[PetViewer3D] Safe GLTF load error:', loadError);
            onError?.(new Error(loadError));
        }
    }, [state, loadError, onError]);

    // Clone the scene and apply fallback materials for missing textures
    // This runs AFTER loading is complete - textures that failed will have null images
    const clonedScene = React.useMemo(() => {
        if (!gltf?.scene) return null;
        
        const cloned = gltf.scene.clone();
        
        // Generate a random pleasant color for this model (based on URL hash for consistency)
        const getModelColor = () => {
            // Array of pleasant pet-friendly colors
            const colors = [
                0x8b7fbf, // Purple
                0x7fbeeb, // Sky Blue
                0x7feba8, // Mint Green
                0xebcf7f, // Golden Yellow
                0xeb9f7f, // Coral Orange
                0xf5a0c1, // Pink
                0xa0c1f5, // Light Blue
                0xc1f5a0, // Lime Green
                0xf5d6a0, // Peach
                0xd6a0f5, // Lavender
            ];
            // Use URL to pick consistent color for same model
            const urlHash = url.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            return colors[urlHash % colors.length];
        };
        
        const fallbackColor = new THREE.Color(getModelColor());
        let texturesMissing = false;
        
        // Apply fallback materials for any missing textures
        cloned.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                
                // Process all materials on this mesh
                if (mesh.material) {
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    
                    materials.forEach((material, index) => {
                        const stdMaterial = material as THREE.MeshStandardMaterial;
                        
                        // Check various texture types that might be missing
                        const textureTypes: (keyof THREE.MeshStandardMaterial)[] = [
                            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'
                        ];
                        
                        let hasMissingTexture = false;
                        
                        textureTypes.forEach((texType) => {
                            const texture = stdMaterial[texType] as THREE.Texture | null;
                            if (texture) {
                                // Check if texture image failed to load
                                // When texture fails: image is null, undefined, or has no data
                                const hasValidImage = texture.image && 
                                    (texture.image instanceof HTMLImageElement ? 
                                        texture.image.complete && texture.image.naturalWidth > 0 :
                                        texture.image.data || texture.image.width > 0);
                                
                                if (!hasValidImage) {
                                    hasMissingTexture = true;
                                    // Remove the broken texture reference using type-safe assignment
                                    if (texType === 'map') stdMaterial.map = null;
                                    else if (texType === 'normalMap') stdMaterial.normalMap = null;
                                    else if (texType === 'roughnessMap') stdMaterial.roughnessMap = null;
                                    else if (texType === 'metalnessMap') stdMaterial.metalnessMap = null;
                                    else if (texType === 'aoMap') stdMaterial.aoMap = null;
                                    else if (texType === 'emissiveMap') stdMaterial.emissiveMap = null;
                                }
                            }
                        });
                        
                        // If main diffuse map is missing, apply fallback color
                        if (hasMissingTexture || !stdMaterial.map) {
                            texturesMissing = true;
                            // Apply a pleasant fallback color
                            stdMaterial.color = fallbackColor;
                            stdMaterial.metalness = 0.1;
                            stdMaterial.roughness = 0.6;
                            // Make sure material is visible
                            stdMaterial.needsUpdate = true;
                        }
                        
                        // Update the material in the array if needed
                        if (Array.isArray(mesh.material)) {
                            mesh.material[index] = material;
                        }
                    });
                }
            }
        });
        
        if (texturesMissing) {
            console.warn('[PetViewer3D] Some textures failed to load, using fallback colors');
        }
        
        return cloned;
    }, [gltf?.scene, url]);

    // Set up animations if available
    useEffect(() => {
        if (!clonedScene || !gltf?.animations) return;
        
        const animations = gltf.animations;
        
        if (animations.length > 0 && enableAnimation) {
            mixerRef.current = new THREE.AnimationMixer(clonedScene);
            const action = mixerRef.current.clipAction(animations[0]);
            action.play();
        }

        // Notify parent that model is loaded (only once)
        if (!hasNotifiedLoad.current) {
            hasNotifiedLoad.current = true;
            onLoad?.();
        }

        return () => {
            mixerRef.current?.stopAllAction();
        };
    }, [clonedScene, gltf?.animations, enableAnimation, onLoad]);

    // Update animation mixer
    useFrame((_, delta) => {
        mixerRef.current?.update(delta);

        // Add subtle breathing animation if no built-in animations
        if (groupRef.current && (!gltf?.animations || gltf.animations.length === 0)) {
            const breathe = Math.sin(Date.now() * 0.002) * 0.02;
            groupRef.current.scale.setScalar(scale * (1 + breathe));
        }
    });

    // Show nothing while loading (parent will show loading indicator)
    if (state === 'loading' || state === 'idle') {
        return null;
    }
    
    // Show nothing on error (parent will handle error display)
    if (state === 'error' || !clonedScene) {
        return null;
    }

    return (
        <group ref={groupRef}>
            <Center>
                <primitive
                    object={clonedScene}
                    scale={scale}
                    position={[0, 0, 0]}
                    castShadow
                    receiveShadow
                />
            </Center>
        </group>
    );
}

// ========== Loading Fallback Component ==========

function LoadingFallback() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = state.clock.elapsedTime * 2;
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
        }
    });

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial
                color="#60a5fa"
                wireframe
            />
        </mesh>
    );
}

// ========== Loading Overlay Component ==========

const LoadingOverlay: React.FC<{ rarity?: Pet['rarity'] }> = ({ rarity: _rarity = 'common' }) => {

    return (
        <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(4px)',
            }}
        >
            <div className="text-center">
                <div
                    className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
                    style={{
                        border: '4px solid rgba(255,255,255,0.2)',
                        borderTopColor: 'white',
                    }}
                />
                <p
                    className="text-white font-medium text-sm"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                    Loading Pet...
                </p>
            </div>
        </div>
    );
};

// ========== Error Display Component ==========

const ErrorDisplay: React.FC<{ message: string; pet?: Pet }> = ({ message, pet }) => {
    const [thumbnailError, setThumbnailError] = React.useState(false);
    const config = pet ? rarityConfig[pet.rarity] : null;

    return (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center p-4"
            style={{
                background: config
                    ? `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            }}
        >
            {/* Try to show thumbnail if available */}
            {pet?.thumbnail_url && !thumbnailError && (
                <img
                    src={pet.thumbnail_url}
                    alt={pet.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                    onError={() => setThumbnailError(true)}
                />
            )}
            
            <div className="text-center text-white relative z-10">
                <div className="text-6xl mb-3">🐾</div>
                <p className="font-bold text-lg mb-1">{pet?.name || 'Pet'}</p>
                <p className="text-sm opacity-80">3D model loading...</p>
                {message && (
                    <p className="text-xs opacity-60 mt-2">{message}</p>
                )}
            </div>
        </div>
    );
};

// ========== Main Component ==========

export const PetViewer3D: React.FC<PetViewer3DProps> = ({
    pet,
    height = '200px',
    enableControls = true,
    autoRotate = true,
    autoRotateSpeed = 2,
    showLoading = true,
    onLoad,
    onError: _onError,
    background = 'gradient',
    backgroundColor,
    disableFloat = false,
    scale = 2,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const config = rarityConfig[pet.rarity];

    // Handle model load complete
    const handleLoad = () => {
        setIsLoading(false);
        onLoad?.();
    };

    // Handle model load error  
    const handleError = (err: Error) => {
        console.error('[PetViewer3D] Model load error:', err);
        setIsLoading(false);
        // Provide user-friendly error message
        const friendlyMessage = err.message?.includes('body') 
            ? 'Failed to fetch 3D model'
            : err.message || 'Failed to load pet model';
        setError(friendlyMessage);
        _onError?.(err);
    };

    // Validate model URL
    const isValidModelUrl = React.useMemo(() => {
        if (!pet.model_url) return false;
        try {
            const url = new URL(pet.model_url);
            return url.protocol === 'https:' || url.protocol === 'http:';
        } catch {
            return false;
        }
    }, [pet.model_url]);

    // Determine background style
    const getBackgroundStyle = (): React.CSSProperties => {
        switch (background) {
            case 'transparent':
                return { background: 'transparent' };
            case 'solid':
                return { background: backgroundColor || '#1a1a2e' };
            case 'gradient':
            default:
                return {
                    background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
                };
        }
    };

    // Check if model URL is valid
    if (!pet.model_url || !isValidModelUrl) {
        return (
            <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                    height: typeof height === 'number' ? `${height}px` : height,
                    ...getBackgroundStyle(),
                }}
            >
                <ErrorDisplay message="No model available" pet={pet} />
            </div>
        );
    }

    return (
        <div
            className="relative rounded-2xl overflow-hidden"
            style={{
                height: typeof height === 'number' ? `${height}px` : height,
                border: '3px solid rgba(255,255,255,0.2)',
                boxShadow: `0 8px 32px ${config.glow}`,
                ...getBackgroundStyle(),
            }}
        >
            {/* Loading Overlay */}
            {showLoading && isLoading && !error && (
                <LoadingOverlay rarity={pet.rarity} />
            )}

            {/* Error Display */}
            {error && <ErrorDisplay message={error} pet={pet} />}

            {/* 3D Canvas */}
            <CanvasErrorBoundary onError={handleError}>
                <Canvas
                camera={{
                    position: [0, 0.5, 4],
                    fov: 45,
                    near: 0.1,
                    far: 100,
                }}
                style={{ background: 'transparent' }}
                gl={{
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance',
                }}
                shadows
                onCreated={({ gl }) => {
                    gl.setClearColor(0x000000, 0);
                }}
            >
                {/* Lighting Setup */}
                <ambientLight intensity={0.6} />
                <directionalLight
                    position={[5, 5, 5]}
                    intensity={0.8}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <directionalLight
                    position={[-5, 3, -5]}
                    intensity={0.4}
                />
                <pointLight
                    position={[0, 4, 0]}
                    intensity={0.3}
                    color="#fff"
                />
                {/* Colored rim light based on rarity */}
                <pointLight
                    position={[-3, 2, 3]}
                    intensity={0.3}
                    color={config.glow}
                />

                {/* Environment for better reflections */}
                <Environment preset="city" />

                {/* Float wrapper for bobbing animation */}
                {disableFloat ? (
                    <Suspense fallback={<LoadingFallback />}>
                        <Pet3DModel
                            url={pet.model_url}
                            scale={scale}
                            onLoad={handleLoad}
                            onError={handleError}
                        />
                    </Suspense>
                ) : (
                    <Float
                        speed={2}
                        rotationIntensity={0.2}
                        floatIntensity={0.5}
                    >
                        <Suspense fallback={<LoadingFallback />}>
                            <Pet3DModel
                                url={pet.model_url}
                                scale={scale}
                                onLoad={handleLoad}
                                onError={handleError}
                            />
                        </Suspense>
                    </Float>
                )}

                {/* Orbit Controls for interaction */}
                {enableControls && (
                    <OrbitControls
                        enablePan={false}
                        enableZoom={true}
                        minDistance={2}
                        maxDistance={8}
                        minPolarAngle={Math.PI / 4}
                        maxPolarAngle={Math.PI / 1.5}
                        autoRotate={autoRotate}
                        autoRotateSpeed={autoRotateSpeed}
                    />
                )}
            </Canvas>
            </CanvasErrorBoundary>

            {/* Pet Name Label */}
            <div
                className="absolute bottom-2 left-2 right-2 text-center"
                style={{ pointerEvents: 'none' }}
            >
                <p
                    className="text-white font-bold text-sm"
                    style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        display: 'inline-block',
                    }}
                >
                    {pet.name}
                </p>
            </div>

            {/* Rarity Badge */}
            <div
                className="absolute top-2 right-2 text-2xl"
                style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    pointerEvents: 'none',
                }}
            >
                {config.badge}
            </div>
        </div>
    );
};

// ========== Compact Preview Version ==========

export interface PetViewer3DCompactProps {
    /** Model URL to load */
    modelUrl: string;
    /** Size of the viewer (square) */
    size?: number;
    /** Scale multiplier for the model */
    scale?: number;
}

/**
 * Compact version for use in thumbnails or small previews
 * No controls, simple lighting, minimal UI
 * Uses safe GLTF loading to prevent crashes
 */
export const PetViewer3DCompact: React.FC<PetViewer3DCompactProps> = ({
    modelUrl,
    size = 100,
    scale = 1.5,
}) => {
    const [hasError, setHasError] = useState(false);
    
    const handleError = () => {
        setHasError(true);
    };
    
    if (!modelUrl || hasError) {
        return (
            <div
                className="flex items-center justify-center bg-gray-200 rounded-lg"
                style={{ width: size, height: size }}
            >
                <span className="text-2xl">🐾</span>
            </div>
        );
    }

    return (
        <div
            className="rounded-lg overflow-hidden"
            style={{
                width: size,
                height: size,
                background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)',
            }}
        >
            <CanvasErrorBoundary onError={handleError}>
                <Canvas
                    camera={{ position: [0, 0.3, 3], fov: 50 }}
                    style={{ background: 'transparent' }}
                    gl={{ alpha: true, antialias: true }}
                >
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[3, 3, 3]} intensity={0.6} />

                    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
                        <Suspense fallback={null}>
                            <Pet3DModel
                                url={modelUrl}
                                scale={scale}
                                enableAnimation={false}
                                onError={handleError}
                            />
                        </Suspense>
                    </Float>
                </Canvas>
            </CanvasErrorBoundary>
        </div>
    );
};

// Preload helper for better UX - uses safe preloading
export const preloadPetModel = (url: string) => {
    if (!url) return;
    preloadGLTFSafe(url)
        .then((success) => {
            if (success) {
                console.log('[PetViewer3D] Preloaded model:', url);
            } else {
                console.warn('[PetViewer3D] Failed to preload model (URL not accessible):', url);
            }
        })
        .catch((error) => {
            console.warn('[PetViewer3D] Failed to preload model:', url, error);
        });
};

export default PetViewer3D;
