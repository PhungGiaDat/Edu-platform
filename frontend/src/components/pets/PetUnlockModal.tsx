/**
 * PetUnlockModal.tsx
 * 
 * Celebration modal for when a pet is unlocked
 * Features:
 * - Confetti animation (falling emojis like RewardCelebration.tsx)
 * - 3D pet preview using PetViewer3DCompact
 * - Rarity-based styling and gradients
 * - "Set as Active" button option
 * - Auto-dismiss with manual close option
 * - Kid-friendly styling with playful animations
 * - Haptic and sound feedback on mount
 */

import React, { useEffect, useState, useCallback } from 'react';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { Pet } from '@/hooks/usePets';
import { rarityConfig } from './PetCard';
import { PetViewer3DCompact } from './PetViewer3D';

// ========== Props Interface ==========

export interface PetUnlockModalProps {
    /** The pet that was unlocked */
    pet: Pet;
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when modal should close */
    onClose: () => void;
    /** Called when user wants to set this pet as active */
    onSetActive?: (petId: string) => void;
    /** Auto-dismiss timeout in ms (default: 8000, 0 to disable) */
    autoDismissMs?: number;
}

// ========== Confetti Configuration ==========



const RARITY_CONFETTI: Record<Pet['rarity'], string[]> = {
    common: ['🎉', '✨', '⭐', '🐾', '💚'],
    rare: ['🎉', '✨', '💎', '🌊', '💙', '⭐'],
    epic: ['🎉', '✨', '🔮', '💜', '🌟', '🦄'],
    legendary: ['🎉', '✨', '👑', '🌟', '💛', '🔥', '🏆', '⚡'],
};

// ========== Component ==========

export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
    pet,
    isOpen,
    onClose,
    onSetActive,
    autoDismissMs = 8000,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState<
        { id: number; emoji: string; left: string; delay: string; size: string }[]
    >([]);

    const config = rarityConfig[pet.rarity];

    // Generate confetti based on pet rarity
    const generateConfetti = useCallback(() => {
        const rarityConfetti = RARITY_CONFETTI[pet.rarity];
        const pieces: { id: number; emoji: string; left: string; delay: string; size: string }[] = [];

        // Generate 35 confetti pieces for more celebration
        for (let i = 0; i < 35; i++) {
            pieces.push({
                id: i,
                emoji: rarityConfetti[Math.floor(Math.random() * rarityConfetti.length)],
                left: `${Math.random() * 100}%`,
                delay: `${Math.random() * 2.5}s`,
                size: `${1 + Math.random() * 1.5}rem`,
            });
        }

        setConfettiPieces(pieces);
    }, [pet.rarity]);

    // Show modal with effects
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            generateConfetti();

            // Haptic + Sound feedback
            HapticService.levelUp();
            SoundEffectService.play('levelUp');

            // Auto-dismiss after timeout
            if (autoDismissMs > 0) {
                const timer = setTimeout(() => {
                    handleDismiss();
                }, autoDismissMs);

                return () => clearTimeout(timer);
            }
        } else {
            setIsVisible(false);
        }
    }, [isOpen, generateConfetti, autoDismissMs]);

    // Handle dismiss
    const handleDismiss = useCallback(() => {
        HapticService.tap();
        setIsVisible(false);

        // Wait for fade animation
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

    // Handle set as active
    const handleSetActive = useCallback(() => {
        HapticService.success();
        SoundEffectService.play('success');
        onSetActive?.(pet.pet_id);
        handleDismiss();
    }, [pet.pet_id, onSetActive, handleDismiss]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-[100020]"
            style={{
                background: 'rgba(0,0,0,0.85)',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.3s ease-out',
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
            onClick={handleDismiss}
        >
            {/* Confetti Layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {confettiPieces.map((piece) => (
                    <div
                        key={piece.id}
                        className="absolute animate-pet-unlock-confetti"
                        style={{
                            left: piece.left,
                            top: '-60px',
                            fontSize: piece.size,
                            animationDelay: piece.delay,
                        }}
                    >
                        {piece.emoji}
                    </div>
                ))}
            </div>

            {/* Sparkle burst around the card */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                    {[...Array(8)].map((_, i) => (
                        <span
                            key={i}
                            className="absolute text-3xl animate-sparkle-burst"
                            style={{
                                transform: `rotate(${i * 45}deg) translateY(-120px)`,
                                animationDelay: `${i * 0.1}s`,
                            }}
                        >
                            ✨
                        </span>
                    ))}
                </div>
            </div>

            {/* Main Modal Card */}
            <div
                className="relative rounded-3xl p-6 text-center max-w-sm w-full mx-4 animate-pet-unlock-pop"
                style={{
                    background: config.gradientStyle,
                    border: '4px solid #fff',
                    boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${config.glow}`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Trophy/Unlock Header */}
                <div className="relative mb-4">
                    <div
                        className="inline-block animate-bounce"
                        style={{ fontSize: '56px' }}
                    >
                        🎉
                    </div>

                    {/* Sparkle effects around header */}
                    <span
                        className="absolute text-xl animate-ping"
                        style={{ top: '0', left: '20%' }}
                    >
                        ✨
                    </span>
                    <span
                        className="absolute text-xl animate-ping"
                        style={{ top: '10px', right: '20%', animationDelay: '0.4s' }}
                    >
                        ✨
                    </span>
                </div>

                {/* Title */}
                <h2
                    className="text-2xl font-black text-white drop-shadow-lg mb-1"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                    NEW PET UNLOCKED!
                </h2>

                {/* Rarity Badge */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-1 rounded-full mb-4"
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '2px solid rgba(255,255,255,0.3)',
                    }}
                >
                    <span className="text-lg">{config.badge}</span>
                    <span className="text-white font-bold uppercase text-sm tracking-wide">
                        {pet.rarity}
                    </span>
                </div>

                {/* 3D Pet Preview */}
                <div
                    className="mx-auto mb-4 rounded-2xl overflow-hidden"
                    style={{
                        width: '160px',
                        height: '160px',
                        background: 'rgba(255,255,255,0.15)',
                        border: '3px solid rgba(255,255,255,0.3)',
                        boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.2)',
                    }}
                >
                    <PetViewer3DCompact
                        modelUrl={pet.model_url}
                        size={154}
                        scale={1.8}
                    />
                </div>

                {/* Pet Name */}
                <div className="mb-4">
                    <h3
                        className="text-xl font-bold text-white"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                    >
                        {pet.name}
                    </h3>
                    <p className="text-white/80 text-sm">
                        {pet.name_vi}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    {onSetActive && (
                        <button
                            className="w-full py-3 rounded-2xl font-bold text-base transition-all hover:scale-105 active:scale-95"
                            style={{
                                background: 'rgba(255,255,255,0.95)',
                                color: '#059669',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                            }}
                            onClick={handleSetActive}
                        >
                            <span className="mr-2">🐾</span>
                            Set as My Pet!
                        </button>
                    )}

                    <button
                        className="w-full py-2 rounded-xl font-medium text-sm transition-all hover:bg-white/20"
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            color: 'white',
                            border: '2px solid rgba(255,255,255,0.3)',
                        }}
                        onClick={handleDismiss}
                    >
                        Continue
                    </button>
                </div>

                {/* Tap to dismiss hint */}
                <p className="text-white/50 text-xs mt-4">
                    Tap outside to close
                </p>

                {/* Legendary shimmer effect */}
                {pet.rarity === 'legendary' && (
                    <div
                        className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)',
                            animation: 'pet-unlock-shimmer 2s infinite',
                        }}
                    />
                )}
            </div>

            {/* Animation Keyframes */}
            <style>{`
                @keyframes pet-unlock-confetti {
                    0% {
                        transform: translateY(0) rotate(0deg) scale(1);
                        opacity: 1;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg) scale(0.5);
                        opacity: 0;
                    }
                }
                .animate-pet-unlock-confetti {
                    animation: pet-unlock-confetti 4s ease-out forwards;
                }

                @keyframes pet-unlock-pop {
                    0% {
                        transform: scale(0.3) rotate(-10deg);
                        opacity: 0;
                    }
                    60% {
                        transform: scale(1.1) rotate(2deg);
                    }
                    80% {
                        transform: scale(0.95) rotate(-1deg);
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
                .animate-pet-unlock-pop {
                    animation: pet-unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }

                @keyframes sparkle-burst {
                    0% {
                        opacity: 0;
                        transform: rotate(var(--rotate, 0deg)) translateY(-60px) scale(0);
                    }
                    30% {
                        opacity: 1;
                        transform: rotate(var(--rotate, 0deg)) translateY(-120px) scale(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: rotate(var(--rotate, 0deg)) translateY(-150px) scale(0.5);
                    }
                }
                .animate-sparkle-burst {
                    animation: sparkle-burst 1.5s ease-out forwards;
                }

                @keyframes pet-unlock-shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default PetUnlockModal;
