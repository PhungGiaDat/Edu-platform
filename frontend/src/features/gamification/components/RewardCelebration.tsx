// src/components/Gamification/RewardCelebration.tsx
// Kid-friendly celebration overlay for rewards, level-ups, and stickers

import React, { useEffect, useState, useCallback } from 'react';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { eventBus } from '@/runtime/EventBus';

export type CelebrationType =
    | 'level_up'
    | 'sticker_earned'
    | 'badge_earned'
    | 'pet_evolved'
    | 'streak_milestone';

interface CelebrationData {
    type: CelebrationType;
    title: string;
    subtitle?: string;
    emoji: string;
    details?: {
        name?: string;
        rarity?: string;
        level?: number;
        stage?: string;
        imageUrl?: string;
    };
}

interface RewardCelebrationProps {
    /** If controlled externally */
    celebration?: CelebrationData | null;
    onClose?: () => void;
    /** Auto-listen to EventBus events */
    autoListen?: boolean;
}

// Celebration configs
const CELEBRATION_CONFIGS: Record<CelebrationType, { bg: string; confetti: string[] }> = {
    level_up: {
        bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #ea580c 100%)',
        confetti: ['🌟', '⭐', '✨', '🎉', '🚀'],
    },
    sticker_earned: {
        bg: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 50%, #0284c7 100%)',
        confetti: ['🎨', '✨', '🌈', '⭐', '💫'],
    },
    badge_earned: {
        bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
        confetti: ['🏆', '🎖️', '🏅', '⭐', '✨'],
    },
    pet_evolved: {
        bg: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)',
        confetti: ['🐾', '✨', '💫', '🌟', '🎉'],
    },
    streak_milestone: {
        bg: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%)',
        confetti: ['🔥', '💪', '⚡', '🌟', '🎯'],
    },
};

const RARITY_COLORS: Record<string, string> = {
    common: '#9ca3af',
    rare: '#3b82f6',
    epic: '#0ea5e9',
    legendary: '#f59e0b',
};

export const RewardCelebration: React.FC<RewardCelebrationProps> = ({
    celebration: externalCelebration,
    onClose,
    autoListen = true,
}) => {
    const [celebration, setCelebration] = useState<CelebrationData | null>(externalCelebration || null);
    const [isVisible, setIsVisible] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState<{ id: number; emoji: string; left: string; delay: string }[]>([]);

    // Generate confetti
    const generateConfetti = useCallback((type: CelebrationType) => {
        const config = CELEBRATION_CONFIGS[type];
        const pieces: { id: number; emoji: string; left: string; delay: string }[] = [];

        for (let i = 0; i < 30; i++) {
            pieces.push({
                id: i,
                emoji: config.confetti[Math.floor(Math.random() * config.confetti.length)],
                left: `${Math.random() * 100}%`,
                delay: `${Math.random() * 2}s`,
            });
        }

        setConfettiPieces(pieces);
    }, []);

    // Show celebration
    const showCelebration = useCallback((data: CelebrationData) => {
        setCelebration(data);
        setIsVisible(true);
        generateConfetti(data.type);

        // Haptic + Sound
        HapticService.levelUp();
        SoundEffectService.play('levelUp');

        // Auto-hide after 4 seconds
        setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => {
                setCelebration(null);
                onClose?.();
            }, 300);
        }, 4000);
    }, [generateConfetti, onClose]);

    // Listen to EventBus events
    useEffect(() => {
        if (!autoListen) return;

        const handleLevelUp = (data: any) => {
            showCelebration({
                type: 'level_up',
                title: 'LEVEL UP!',
                subtitle: `You reached Level ${data.level}!`,
                emoji: '🚀',
                details: { level: data.level },
            });
        };

        const handleStickerCollected = (data: any) => {
            const sticker = data.sticker;
            showCelebration({
                type: 'sticker_earned',
                title: 'NEW STICKER!',
                subtitle: sticker.name,
                emoji: '🎨',
                details: {
                    name: sticker.name,
                    rarity: sticker.rarity,
                    imageUrl: sticker.imageUrl,
                },
            });
        };

        const handleBadgesEarned = (data: any) => {
            const badges = data.badges;
            if (badges.length > 0) {
                showCelebration({
                    type: 'badge_earned',
                    title: 'BADGE EARNED!',
                    subtitle: badges.length > 1 ? `${badges.length} new badges!` : undefined,
                    emoji: '🏆',
                });
            }
        };

        const handlePetEvolved = (data: any) => {
            showCelebration({
                type: 'pet_evolved',
                title: 'PET EVOLVED!',
                subtitle: `Your pet is now ${data.stage}!`,
                emoji: '🐾',
                details: { stage: data.stage },
            });
        };

        eventBus.on('LEVEL_UP', handleLevelUp);
        eventBus.on('STICKER_COLLECTED', handleStickerCollected);
        eventBus.on('BADGES_EARNED', handleBadgesEarned);
        eventBus.on('PET_EVOLVED', handlePetEvolved);

        return () => {
            eventBus.off('LEVEL_UP', handleLevelUp);
            eventBus.off('STICKER_COLLECTED', handleStickerCollected);
            eventBus.off('BADGES_EARNED', handleBadgesEarned);
            eventBus.off('PET_EVOLVED', handlePetEvolved);
        };
    }, [autoListen, showCelebration]);

    // Handle external celebration prop
    useEffect(() => {
        if (externalCelebration) {
            showCelebration(externalCelebration);
        }
    }, [externalCelebration, showCelebration]);

    const handleDismiss = () => {
        HapticService.tap();
        setIsVisible(false);
        setTimeout(() => {
            setCelebration(null);
            onClose?.();
        }, 300);
    };

    if (!celebration) return null;

    const config = CELEBRATION_CONFIGS[celebration.type];

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-[100010]"
            style={{
                background: 'rgba(0,0,0,0.8)',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.3s ease-out',
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
            onClick={handleDismiss}
        >
            {/* Confetti layer */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {confettiPieces.map((piece) => (
                    <div
                        key={piece.id}
                        className="absolute text-2xl animate-confetti-fall"
                        style={{
                            left: piece.left,
                            top: '-50px',
                            animationDelay: piece.delay,
                        }}
                    >
                        {piece.emoji}
                    </div>
                ))}
            </div>

            {/* Main celebration card */}
            <div
                className="rounded-3xl p-6 text-center max-w-xs w-full mx-4 animate-celebration-pop"
                style={{
                    background: config.bg,
                    border: '4px solid #fff',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Emoji burst */}
                <div
                    className="relative inline-block mb-4 animate-bounce"
                    style={{ fontSize: '64px' }}
                >
                    {celebration.emoji}

                    {/* Sparkle effects */}
                    <span
                        className="absolute text-xl animate-ping"
                        style={{ top: '-10px', left: '-10px' }}
                    >
                        ✨
                    </span>
                    <span
                        className="absolute text-xl animate-ping"
                        style={{ top: '0', right: '-15px', animationDelay: '0.3s' }}
                    >
                        ✨
                    </span>
                    <span
                        className="absolute text-xl animate-ping"
                        style={{ bottom: '5px', left: '-20px', animationDelay: '0.6s' }}
                    >
                        ✨
                    </span>
                </div>

                {/* Title */}
                <h2
                    className="text-2xl font-black text-white drop-shadow-lg mb-2"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                    {celebration.title}
                </h2>

                {/* Subtitle */}
                {celebration.subtitle && (
                    <p className="text-white/90 font-bold text-lg mb-3">
                        {celebration.subtitle}
                    </p>
                )}

                {/* Level display */}
                {celebration.type === 'level_up' && celebration.details?.level && (
                    <div
                        className="inline-block px-6 py-3 rounded-2xl mb-4"
                        style={{
                            background: 'rgba(255,255,255,0.9)',
                            border: '3px solid #fff',
                        }}
                    >
                        <span className="text-4xl font-black text-orange-600">
                            {celebration.details.level}
                        </span>
                    </div>
                )}

                {/* Sticker display */}
                {celebration.type === 'sticker_earned' && celebration.details && (
                    <div className="mb-4">
                        <div
                            className="inline-block w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                            style={{
                                background: 'rgba(255,255,255,0.9)',
                                border: `3px solid ${RARITY_COLORS[celebration.details.rarity || 'common']}`,
                            }}
                        >
                            🎨
                        </div>
                        {celebration.details.rarity && (
                            <p
                                className="mt-2 text-sm font-bold text-white uppercase tracking-wide"
                                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                            >
                                {celebration.details.rarity}
                            </p>
                        )}
                    </div>
                )}

                {/* Pet evolution display */}
                {celebration.type === 'pet_evolved' && celebration.details?.stage && (
                    <div
                        className="inline-block px-4 py-2 rounded-full mb-4"
                        style={{
                            background: 'rgba(255,255,255,0.9)',
                        }}
                    >
                        <span className="text-lg font-black text-green-600">
                            {celebration.details.stage.toUpperCase()} STAGE!
                        </span>
                    </div>
                )}

                {/* Tap to dismiss hint */}
                <p className="text-white/70 text-xs mt-2">
                    Tap anywhere to continue
                </p>
            </div>

            {/* Animation keyframes */}
            <style>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-confetti-fall {
                    animation: confetti-fall 4s ease-out forwards;
                }

                @keyframes celebration-pop {
                    0% {
                        transform: scale(0.5);
                        opacity: 0;
                    }
                    50% {
                        transform: scale(1.1);
                    }
                    100% {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-celebration-pop {
                    animation: celebration-pop 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default RewardCelebration;
