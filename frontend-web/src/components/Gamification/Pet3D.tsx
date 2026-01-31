// src/components/Gamification/Pet3D.tsx
// 3D Virtual Pet using React Three Fiber
// Renders a cute procedural 3D pet that appears behind the chatbot button

import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshWobbleMaterial, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { PetType, EvolutionStage, PetMood } from './VirtualPetEvolved';

interface Pet3DProps {
    petType: PetType;
    stage: EvolutionStage;
    mood: PetMood;
    happiness: number;
    visible?: boolean;
    onClick?: () => void;
}

// Color palettes for different pet types
const PET_COLORS: Record<PetType, { body: string; accent: string; cheek: string }> = {
    bunny: { body: '#F5F5F5', accent: '#FFB6C1', cheek: '#FFB6C1' },
    cat: { body: '#FFA500', accent: '#FF8C00', cheek: '#FFB6C1' },
    dog: { body: '#D2691E', accent: '#8B4513', cheek: '#FFB6C1' },
    panda: { body: '#FFFFFF', accent: '#000000', cheek: '#FFB6C1' },
};

// Scale factors for evolution stages
const STAGE_SCALES: Record<EvolutionStage, number> = {
    baby: 0.6,
    child: 0.8,
    teen: 1.0,
    adult: 1.2,
};

// Procedural 3D Pet Model
function PetModel({ petType, stage, mood, happiness }: Omit<Pet3DProps, 'visible' | 'onClick'>) {
    const groupRef = useRef<THREE.Group>(null);
    const eyeLeftRef = useRef<THREE.Mesh>(null);
    const eyeRightRef = useRef<THREE.Mesh>(null);
    
    const colors = PET_COLORS[petType];
    const scale = STAGE_SCALES[stage];
    
    // Animate the pet
    useFrame((state) => {
        if (!groupRef.current) return;
        
        // Gentle idle breathing animation
        const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.02;
        groupRef.current.scale.y = scale * (1 + breathe);
        
        // Blink animation
        if (eyeLeftRef.current && eyeRightRef.current) {
            const blinkCycle = Math.sin(state.clock.elapsedTime * 0.5);
            const shouldBlink = blinkCycle > 0.95;
            const blinkScale = shouldBlink ? 0.1 : 1;
            eyeLeftRef.current.scale.y = blinkScale;
            eyeRightRef.current.scale.y = blinkScale;
        }
        
        // Happy bounce when happiness is high
        if (happiness > 70) {
            const bounce = Math.abs(Math.sin(state.clock.elapsedTime * 4)) * 0.05;
            groupRef.current.position.y = bounce;
        }
    });
    
    // Eye shape based on mood
    const eyeScaleY = useMemo(() => {
        switch (mood) {
            case 'happy': return 1.2;
            case 'content': return 1;
            case 'sad': return 0.6;
            case 'sleeping': return 0.1;
            default: return 1;
        }
    }, [mood]);
    
    return (
        <group ref={groupRef} scale={scale}>
            {/* Main body - rounded cube */}
            <RoundedBox args={[1, 1, 0.8]} radius={0.2} smoothness={4} position={[0, 0, 0]}>
                <MeshWobbleMaterial 
                    color={colors.body} 
                    factor={0.1} 
                    speed={2}
                />
            </RoundedBox>
            
            {/* Head - slightly larger rounded cube */}
            <RoundedBox args={[0.9, 0.8, 0.7]} radius={0.2} smoothness={4} position={[0, 0.7, 0.1]}>
                <meshStandardMaterial color={colors.body} />
            </RoundedBox>
            
            {/* Ears - different based on pet type */}
            {petType === 'bunny' && (
                <>
                    {/* Long bunny ears */}
                    <RoundedBox args={[0.15, 0.6, 0.1]} radius={0.05} position={[-0.2, 1.3, 0]}>
                        <meshStandardMaterial color={colors.body} />
                    </RoundedBox>
                    <RoundedBox args={[0.15, 0.6, 0.1]} radius={0.05} position={[0.2, 1.3, 0]}>
                        <meshStandardMaterial color={colors.body} />
                    </RoundedBox>
                    {/* Inner ear */}
                    <RoundedBox args={[0.08, 0.4, 0.05]} radius={0.02} position={[-0.2, 1.3, 0.03]}>
                        <meshStandardMaterial color={colors.accent} />
                    </RoundedBox>
                    <RoundedBox args={[0.08, 0.4, 0.05]} radius={0.02} position={[0.2, 1.3, 0.03]}>
                        <meshStandardMaterial color={colors.accent} />
                    </RoundedBox>
                </>
            )}
            
            {petType === 'cat' && (
                <>
                    {/* Triangle cat ears */}
                    <mesh position={[-0.25, 1.15, 0]} rotation={[0, 0, -0.3]}>
                        <coneGeometry args={[0.15, 0.3, 3]} />
                        <meshStandardMaterial color={colors.body} />
                    </mesh>
                    <mesh position={[0.25, 1.15, 0]} rotation={[0, 0, 0.3]}>
                        <coneGeometry args={[0.15, 0.3, 3]} />
                        <meshStandardMaterial color={colors.body} />
                    </mesh>
                </>
            )}
            
            {petType === 'dog' && (
                <>
                    {/* Floppy dog ears */}
                    <RoundedBox args={[0.2, 0.4, 0.1]} radius={0.05} position={[-0.35, 0.85, 0]} rotation={[0, 0, 0.5]}>
                        <meshStandardMaterial color={colors.accent} />
                    </RoundedBox>
                    <RoundedBox args={[0.2, 0.4, 0.1]} radius={0.05} position={[0.35, 0.85, 0]} rotation={[0, 0, -0.5]}>
                        <meshStandardMaterial color={colors.accent} />
                    </RoundedBox>
                </>
            )}
            
            {petType === 'panda' && (
                <>
                    {/* Round panda ears */}
                    <mesh position={[-0.3, 1.1, 0]}>
                        <sphereGeometry args={[0.15, 16, 16]} />
                        <meshStandardMaterial color={colors.accent} />
                    </mesh>
                    <mesh position={[0.3, 1.1, 0]}>
                        <sphereGeometry args={[0.15, 16, 16]} />
                        <meshStandardMaterial color={colors.accent} />
                    </mesh>
                </>
            )}
            
            {/* Eyes */}
            <mesh ref={eyeLeftRef} position={[-0.2, 0.75, 0.35]} scale={[1, eyeScaleY, 1]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh ref={eyeRightRef} position={[0.2, 0.75, 0.35]} scale={[1, eyeScaleY, 1]}>
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color="#333333" />
            </mesh>
            
            {/* Eye highlights */}
            <mesh position={[-0.17, 0.78, 0.42]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            <mesh position={[0.23, 0.78, 0.42]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#FFFFFF" />
            </mesh>
            
            {/* Nose */}
            <mesh position={[0, 0.6, 0.4]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color={petType === 'panda' ? '#000000' : '#333333'} />
            </mesh>
            
            {/* Cheeks */}
            <mesh position={[-0.3, 0.55, 0.3]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color={colors.cheek} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0.3, 0.55, 0.3]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color={colors.cheek} transparent opacity={0.6} />
            </mesh>
            
            {/* Mouth - smile based on mood */}
            {mood === 'happy' && (
                <mesh position={[0, 0.5, 0.38]} rotation={[0, 0, Math.PI]}>
                    <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
                    <meshStandardMaterial color="#333333" />
                </mesh>
            )}
            
            {/* Panda eye patches */}
            {petType === 'panda' && (
                <>
                    <mesh position={[-0.2, 0.75, 0.3]}>
                        <sphereGeometry args={[0.18, 16, 16]} />
                        <meshStandardMaterial color="#000000" />
                    </mesh>
                    <mesh position={[0.2, 0.75, 0.3]}>
                        <sphereGeometry args={[0.18, 16, 16]} />
                        <meshStandardMaterial color="#000000" />
                    </mesh>
                </>
            )}
            
            {/* Little feet */}
            <RoundedBox args={[0.25, 0.15, 0.3]} radius={0.05} position={[-0.25, -0.55, 0.1]}>
                <meshStandardMaterial color={colors.body} />
            </RoundedBox>
            <RoundedBox args={[0.25, 0.15, 0.3]} radius={0.05} position={[0.25, -0.55, 0.1]}>
                <meshStandardMaterial color={colors.body} />
            </RoundedBox>
            
            {/* Sparkle effect for adult stage */}
            {stage === 'adult' && (
                <Float speed={4} rotationIntensity={0} floatIntensity={2}>
                    <mesh position={[0.5, 1.2, 0]}>
                        <octahedronGeometry args={[0.08]} />
                        <meshBasicMaterial color="#FFD700" />
                    </mesh>
                </Float>
            )}
        </group>
    );
}

// Main Pet3D Component with Canvas
export const Pet3D: React.FC<Pet3DProps> = ({
    petType,
    stage,
    mood,
    happiness,
    visible = true,
    onClick
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
                camera={{ position: [0, 0.5, 3], fov: 50 }}
                style={{ background: 'transparent' }}
                gl={{ alpha: true, antialias: true }}
            >
                {/* Lighting */}
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <pointLight position={[-5, 5, 5]} intensity={0.4} color="#FFB6C1" />
                
                {/* Floating animation wrapper */}
                <Float
                    speed={2}
                    rotationIntensity={0.2}
                    floatIntensity={0.5}
                >
                    <Suspense fallback={null}>
                        <PetModel
                            petType={petType}
                            stage={stage}
                            mood={mood}
                            happiness={happiness}
                        />
                    </Suspense>
                </Float>
            </Canvas>
        </div>
    );
};

// Lightweight version for use behind chatbot button (smaller canvas)
export const Pet3DMini: React.FC<Pet3DProps> = (props) => {
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
            <Pet3D {...props} />
        </div>
    );
};

export default Pet3D;
