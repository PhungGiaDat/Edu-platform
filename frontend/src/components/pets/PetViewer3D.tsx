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

export type PetViewerMood = 'happy' | 'content' | 'hungry' | 'sad' | 'sleeping' | 'tired';
export type PetViewerInteraction = 'idle' | 'feed' | 'play';

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

    static getDerivedStateFromError(): CanvasErrorBoundaryState {
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
    /** Current care mood for procedural emotion fallback */
    mood?: PetViewerMood;
    /** Current interaction to play as a baked clip or procedural fallback */
    interaction?: PetViewerInteraction;
    /** Increment this value to replay a one-shot interaction */
    interactionKey?: number;
}

interface Pet3DModelProps {
    url: string;
    textureUrl?: string | null;
    scale: number;
    enableAnimation?: boolean;
    mood?: PetViewerMood;
    interaction?: PetViewerInteraction;
    interactionKey?: number;
    onLoad?: () => void;
    onError?: (error: Error) => void;
}

const toCssSize = (value: string | number) => typeof value === 'number' ? `${value}px` : value;

// ========== 3D Model Component ==========

/**
 * Pet3DModel - Safely loads and renders a GLTF model
 * Uses useSafeGLTF to prevent synchronous throws that crash React
 */
function Pet3DModel({
    url,
    textureUrl,
    scale,
    enableAnimation = true,
    mood = 'content',
    interaction = 'idle',
    interactionKey = 0,
    onLoad,
    onError
}: Pet3DModelProps) {
    const groupRef = useRef<THREE.Group>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const activeActionRef = useRef<THREE.AnimationAction | null>(null);
    const reactionStartedAtRef = useRef(0);
    const hasNotifiedLoad = useRef(false);
    const hasNotifiedError = useRef(false);
    
    // Use safe GLTF loading with URL pre-validation
    const { gltf, state, error: loadError } = useSafeGLTF(url, textureUrl);
    
    // Notify parent of errors
    useEffect(() => {
        if (state === 'error' && loadError && !hasNotifiedError.current) {
            hasNotifiedError.current = true;
            console.error('[PetViewer3D] Safe GLTF load error:', loadError);
            onError?.(new Error(loadError));
        }
    }, [state, loadError, onError]);

    // Clone the scene
    // This runs AFTER loading is complete
    const clonedScene = React.useMemo(() => {
        if (!gltf?.scene) return null;
        
        const cloned = gltf.scene.clone();
        
        return cloned;
    }, [gltf?.scene]);

    const selectClip = React.useCallback((animations: THREE.AnimationClip[]) => {
        if (!animations.length) return null;

        const preferredNames = interaction === 'feed'
            ? ['feed', 'eat', 'happy', 'celebrate', 'idle']
            : interaction === 'play'
                ? ['play', 'jump', 'happy', 'celebrate', 'idle']
                : mood === 'hungry'
                    ? ['hungry', 'sad', 'idle']
                    : mood === 'sleeping' || mood === 'tired'
                        ? ['sleep', 'sleeping', 'idle']
                        : mood === 'happy'
                            ? ['happy', 'idle']
                            : ['idle', 'happy'];

        for (const name of preferredNames) {
            const clip = animations.find(animation => animation.name.toLowerCase().includes(name));
            if (clip) return clip;
        }

        return animations[0];
    }, [interaction, mood]);

    // Set up animations if available
    useEffect(() => {
        if (!clonedScene || !gltf?.animations) return;
        
        const animations = gltf.animations;
        
        if (animations.length > 0 && enableAnimation) {
            mixerRef.current = new THREE.AnimationMixer(clonedScene);
            const action = mixerRef.current.clipAction(selectClip(animations) || animations[0]);
            action.reset();
            action.setLoop(interaction === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, interaction === 'idle' ? Infinity : 1);
            action.clampWhenFinished = interaction !== 'idle';
            action.play();
            activeActionRef.current = action;
        }

        // Notify parent that model is loaded (only once)
        if (!hasNotifiedLoad.current) {
            hasNotifiedLoad.current = true;
            onLoad?.();
        }

        return () => {
            mixerRef.current?.stopAllAction();
            activeActionRef.current = null;
        };
    }, [clonedScene, gltf?.animations, enableAnimation, interaction, interactionKey, onLoad, selectClip]);

    useEffect(() => {
        reactionStartedAtRef.current = performance.now();
    }, [interaction, interactionKey]);

    // Update animation mixer
    useFrame((frameState, delta) => {
        mixerRef.current?.update(delta);

        // Add emotion/interaction fallback if no matching baked animation exists.
        if (groupRef.current) {
            const elapsed = frameState.clock.elapsedTime;
            const reactionAge = (performance.now() - reactionStartedAtRef.current) / 1000;
            const hasBakedClips = Boolean(gltf?.animations && gltf.animations.length > 0);
            const shouldProceduralReact = !hasBakedClips || reactionAge < 1.2;
            const breathe = Math.sin(elapsed * 2) * 0.02;
            const hungryDroop = mood === 'hungry' || mood === 'sad' ? -0.05 : 0;
            const sleepySquash = mood === 'sleeping' || mood === 'tired' ? -0.04 : 0;
            const feedPop = interaction === 'feed' && shouldProceduralReact
                ? Math.sin(Math.min(reactionAge, 1) * Math.PI) * 0.16
                : 0;
            const playJump = interaction === 'play' && shouldProceduralReact
                ? Math.abs(Math.sin(Math.min(reactionAge * 2, 1) * Math.PI)) * 0.28
                : 0;

            groupRef.current.scale.setScalar(1 + breathe + feedPop + sleepySquash);
            groupRef.current.position.y = hungryDroop + playJump;
            groupRef.current.rotation.z = interaction === 'play' && shouldProceduralReact
                ? Math.sin(reactionAge * 18) * 0.12
                : 0;
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

const LoadingOverlay: React.FC = () => {

    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{
                background: 'rgba(255,255,255,0.56)',
                backdropFilter: 'blur(6px)',
            }}
        >
            <div className="text-center">
                <div
                    className="w-12 h-12 mx-auto mb-3 rounded-full animate-spin"
                    style={{
                        border: '4px solid rgba(91,141,239,0.22)',
                        borderTopColor: '#5B8DEF',
                    }}
                />
                <p className="text-slate-700 font-bold text-sm">
                    Waking pet...
                </p>
            </div>
        </div>
    );
};

const CareReaction: React.FC<{
    interaction: PetViewerInteraction;
    interactionKey: number;
}> = ({ interaction, interactionKey }) => {
    if (interaction === 'idle') return null;

    return (
        <div
            key={`${interaction}-${interactionKey}`}
            className="pointer-events-none absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-sm font-black text-slate-700 shadow-[0_8px_22px_rgba(91,141,239,0.22)]"
            style={{
                animation: 'petCareReaction 1.1s ease-out both',
            }}
        >
            {interaction === 'feed' ? 'Yum!' : 'Yay!'}
        </div>
    );
};

// ========== Codex-Style Thumbnail Fallback ==========

const CodexPetFallbackLayer: React.FC<{ pet: Pet; transparent?: boolean }> = ({
    pet,
    transparent = false,
}) => {
    const [thumbnailError, setThumbnailError] = React.useState(false);
    const config = rarityConfig[pet.rarity];
    const hasThumbnail = Boolean(pet.thumbnail_url && !thumbnailError);
    const initial = (pet.name || 'P').trim().slice(0, 1).toUpperCase();

    return (
        <div className="absolute inset-0 overflow-hidden">
            {!transparent && (
                <>
                    <div className="absolute inset-x-0 bottom-0 h-2/5 bg-white/35" />
                    <div className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-white/35" />
                </>
            )}

            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="relative flex h-full max-h-[78%] w-full max-w-[78%] items-center justify-center">
                    {!transparent && (
                        <div
                            className="absolute bottom-[4%] h-[12%] w-[58%] rounded-full bg-slate-900/20 blur-sm"
                            style={{ animation: 'codexPetShadow 2.8s ease-in-out infinite' }}
                        />
                    )}
                    <div
                        className="relative z-10 flex h-full w-full items-center justify-center"
                        style={{ animation: 'codexPetIdleBob 2.8s ease-in-out infinite' }}
                    >
                        {hasThumbnail ? (
                            <img
                                src={pet.thumbnail_url!}
                                alt={pet.name}
                                className="h-full max-h-full w-full object-contain"
                                style={{
                                    filter: 'drop-shadow(0 18px 22px rgba(15, 23, 42, 0.24))',
                                    imageRendering: 'auto',
                                }}
                                onError={() => setThumbnailError(true)}
                            />
                        ) : (
                            <div
                                className="flex aspect-square h-[72%] items-center justify-center rounded-[30%] border-4 border-white/80 text-5xl font-black text-white shadow-xl"
                                style={{
                                    background: config.gradientStyle,
                                    boxShadow: `0 16px 36px ${config.glow}`,
                                }}
                                aria-label={pet.name}
                            >
                                {initial}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!transparent && (
                <>
                    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
                        <span className="max-w-full truncate rounded-full bg-white/90 px-4 py-1.5 text-sm font-black text-slate-800 shadow-sm">
                            {pet.name}
                        </span>
                    </div>
                    <div
                        className="pointer-events-none absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm"
                        style={{ filter: 'drop-shadow(0 4px 8px rgba(15, 23, 42, 0.18))' }}
                    >
                        {config.badge}
                    </div>
                </>
            )}

            <style>{`
                @keyframes codexPetIdleBob {
                    0%, 100% { transform: translateY(0) scale(1); }
                    45% { transform: translateY(-7%) scale(1.03); }
                    70% { transform: translateY(-2%) scale(0.99); }
                }

                @keyframes codexPetShadow {
                    0%, 100% { transform: scaleX(1); opacity: 0.18; }
                    45% { transform: scaleX(0.78); opacity: 0.1; }
                    70% { transform: scaleX(0.92); opacity: 0.14; }
                }
            `}</style>
        </div>
    );
};

// ========== Error Display Component ==========

const ErrorDisplay: React.FC<{ message: string; pet?: Pet; transparent?: boolean }> = ({
    message,
    pet,
    transparent = false,
}) => {
    const config = pet ? rarityConfig[pet.rarity] : null;

    if (pet) {
        return <CodexPetFallbackLayer pet={pet} transparent={transparent} />;
    }

    return (
        <div
            className="absolute inset-0 flex flex-col items-center justify-center p-4"
            style={{
                background: config
                    ? `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            }}
        >
            <div className="text-center text-white relative z-10">
                <div className="text-6xl mb-3">🐾</div>
                <p className="font-bold text-lg mb-1">Pet</p>
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
    scale = 1.2,
    mood = 'content',
    interaction = 'idle',
    interactionKey = 0,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const config = rarityConfig[pet.rarity];

    useEffect(() => {
        setIsLoading(true);
        setError(null);
    }, [pet.pet_id, pet.model_url, pet.texture_url]);

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
        onLoad?.();
        _onError?.(err);
    };

    // Validate model URL
    const isValidModelUrl = React.useMemo(() => {
        if (!pet.model_url) return false;
        try {
            const url = new URL(pet.model_url);
            const isRemoteUrl = url.protocol === 'https:' || url.protocol === 'http:';
            const pathname = url.pathname.toLowerCase();
            return isRemoteUrl && (pathname.endsWith('.glb') || pathname.endsWith('.gltf'));
        } catch {
            return false;
        }
    }, [pet.model_url]);

    useEffect(() => {
        if (!isValidModelUrl) {
            setIsLoading(false);
            onLoad?.();
        }
    }, [isValidModelUrl, onLoad, pet.pet_id]);

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

    const viewerClassName = background === 'transparent'
        ? 'relative h-full w-full overflow-visible'
        : 'relative rounded-2xl overflow-hidden';
    const viewerStyle: React.CSSProperties = {
        height: toCssSize(height),
        border: background === 'transparent' ? 'none' : '3px solid rgba(255,255,255,0.2)',
        boxShadow: background === 'transparent' ? 'none' : `0 8px 32px ${config.glow}`,
        ...getBackgroundStyle(),
    };

    if (!isValidModelUrl || error) {
        return (
            <div
                className={viewerClassName}
                style={viewerStyle}
            >
                <ErrorDisplay
                    message={error || 'No model available'}
                    pet={pet}
                    transparent={background === 'transparent'}
                />
                <CareReaction interaction={interaction} interactionKey={interactionKey} />
                <style>{`
                    @keyframes petCareReaction {
                        0% { opacity: 0; transform: translate(-50%, 12px) scale(0.85); }
                        20% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
                        100% { opacity: 0; transform: translate(-50%, -34px) scale(1); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div
            className={viewerClassName}
            style={viewerStyle}
        >
            {/* Loading Overlay */}
            {showLoading && isLoading && !error && (
                <LoadingOverlay />
            )}

            {/* 3D Canvas */}
            <CanvasErrorBoundary onError={handleError}>
                <Canvas
                camera={{
                    position: [0, 1.2, 6],
                    fov: 35,
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
                            textureUrl={pet.texture_url}
                            scale={scale}
                            mood={mood}
                            interaction={interaction}
                            interactionKey={interactionKey}
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
                                textureUrl={pet.texture_url}
                                scale={scale}
                                mood={mood}
                                interaction={interaction}
                                interactionKey={interactionKey}
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
                        minDistance={3}
                        maxDistance={12}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 1.8}
                        autoRotate={autoRotate}
                        autoRotateSpeed={autoRotateSpeed}
                        target={[0, 0.5, 0]}
                    />
                )}
            </Canvas>
            </CanvasErrorBoundary>

            <CareReaction interaction={interaction} interactionKey={interactionKey} />

            {background !== 'transparent' && (
                <>
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
                </>
            )}

            <style>{`
                @keyframes petCareReaction {
                    0% { opacity: 0; transform: translate(-50%, 12px) scale(0.85); }
                    20% { opacity: 1; transform: translate(-50%, 0) scale(1.05); }
                    100% { opacity: 0; transform: translate(-50%, -34px) scale(1); }
                }
            `}</style>
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
// eslint-disable-next-line react-refresh/only-export-components
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
