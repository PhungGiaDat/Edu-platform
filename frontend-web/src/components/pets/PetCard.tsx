/**
 * PetCard.tsx
 * 
 * Individual pet card component with:
 * - Rarity gradient background
 * - Thumbnail/placeholder display
 * - Lock/unlock status with progress bar
 * - Active indicator ring
 * - Kid-friendly styling matching RewardCelebration.tsx
 */

import React, { useState } from 'react';
import { Pet } from '@/hooks/usePets';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';

// ========== Rarity Configuration ==========

export const rarityConfig = {
    common: {
        gradient: 'from-gray-400 to-gray-600',
        gradientStyle: 'linear-gradient(135deg, #9ca3af 0%, #4b5563 100%)',
        badge: '🥉',
        glow: 'rgba(156, 163, 175, 0.4)'
    },
    rare: {
        gradient: 'from-blue-400 to-blue-600',
        gradientStyle: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)',
        badge: '🥈',
        glow: 'rgba(96, 165, 250, 0.4)'
    },
    epic: {
        gradient: 'from-purple-400 to-purple-600',
        gradientStyle: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
        badge: '🏵️',
        glow: 'rgba(167, 139, 250, 0.4)'
    },
    legendary: {
        gradient: 'from-yellow-400 to-orange-500',
        gradientStyle: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        badge: '👑',
        glow: 'rgba(251, 191, 36, 0.5)'
    }
};

// ========== Props Interface ==========

export interface PetCardProps {
    pet: Pet;
    /** Progress towards unlock (0-100) */
    unlockProgress?: number;
    /** Called when user clicks to preview in 3D */
    onPreview?: (pet: Pet) => void;
    /** Called when user clicks to select this pet as active */
    onSelect?: (petId: string) => void;
    /** Called when user clicks to unlock this pet */
    onUnlock?: (petId: string) => void;
    /** Is this card currently selected for preview */
    isSelected?: boolean;
    /** Compact mode for smaller displays */
    compact?: boolean;
}

// ========== Component ==========

export const PetCard: React.FC<PetCardProps> = ({
    pet,
    unlockProgress = 0,
    onPreview,
    onSelect,
    onUnlock,
    isSelected = false,
    compact = false
}) => {
    const [isPressed, setIsPressed] = useState(false);
    const config = rarityConfig[pet.rarity];

    // Handle card click for preview
    const handleCardClick = () => {
        HapticService.tap();
        SoundEffectService.play('click');
        onPreview?.(pet);
    };

    // Handle select button
    const handleSelect = (e: React.MouseEvent) => {
        e.stopPropagation();
        HapticService.success();
        SoundEffectService.play('success');
        onSelect?.(pet.pet_id);
    };

    // Handle unlock button
    const handleUnlock = (e: React.MouseEvent) => {
        e.stopPropagation();
        HapticService.levelUp();
        SoundEffectService.play('levelUp');
        onUnlock?.(pet.pet_id);
    };

    // Get unlock requirement text
    const getUnlockRequirementText = (): string => {
        const { type, value } = pet.unlock_condition;
        switch (type) {
            case 'free':
                return 'Free!';
            case 'xp':
                return `${value} XP`;
            case 'streak':
                return `${value} Day Streak`;
            case 'achievement':
                return 'Special Achievement';
            default:
                return 'Locked';
        }
    };

    return (
        <div
            className={`
                relative cursor-pointer transition-all duration-200 
                rounded-3xl overflow-hidden
                ${isSelected ? 'ring-4 ring-white scale-105' : ''}
                ${pet.is_active ? 'ring-4 ring-green-400 ring-offset-2 ring-offset-transparent' : ''}
                ${isPressed ? 'scale-95' : 'hover:scale-105'}
            `}
            style={{
                background: config.gradientStyle,
                border: '3px solid rgba(255,255,255,0.3)',
                boxShadow: isSelected || pet.is_active
                    ? `0 8px 32px ${config.glow}, 0 0 0 2px rgba(255,255,255,0.2)`
                    : `0 4px 16px rgba(0,0,0,0.2)`,
                opacity: pet.is_unlocked ? 1 : 0.75,
                minHeight: compact ? '140px' : '180px',
            }}
            onClick={handleCardClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            onTouchStart={() => setIsPressed(true)}
            onTouchEnd={() => setIsPressed(false)}
        >
            {/* Rarity Badge */}
            <div
                className="absolute top-2 right-2 text-2xl z-10"
                style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
            >
                {config.badge}
            </div>

            {/* Active Indicator */}
            {pet.is_active && (
                <div
                    className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold z-10"
                    style={{
                        background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                    }}
                >
                    Active ✓
                </div>
            )}

            {/* Lock Overlay */}
            {!pet.is_unlocked && (
                <div
                    className="absolute inset-0 flex items-center justify-center z-20"
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(2px)',
                    }}
                >
                    <div className="text-center">
                        <div className="text-4xl mb-2">🔒</div>
                        {!pet.can_unlock && (
                            <div
                                className="text-white text-xs font-medium px-3 py-1 rounded-full"
                                style={{ background: 'rgba(0,0,0,0.5)' }}
                            >
                                {getUnlockRequirementText()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Card Content */}
            <div className={`p-${compact ? '3' : '4'} flex flex-col h-full`}>
                {/* Thumbnail Area */}
                <div
                    className={`
                        flex-1 flex items-center justify-center 
                        rounded-2xl mb-2 overflow-hidden
                    `}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        minHeight: compact ? '60px' : '80px',
                    }}
                >
                    {pet.thumbnail_url ? (
                        <img
                            src={pet.thumbnail_url}
                            alt={pet.name}
                            className="w-full h-full object-contain"
                            style={{
                                filter: !pet.is_unlocked ? 'grayscale(100%)' : 'none',
                                maxHeight: compact ? '60px' : '80px',
                            }}
                        />
                    ) : (
                        <div className="text-4xl">🐾</div>
                    )}
                </div>

                {/* Pet Name */}
                <div className="text-center">
                    <h3
                        className={`font-bold text-white ${compact ? 'text-sm' : 'text-base'}`}
                        style={{
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            lineHeight: 1.2,
                        }}
                    >
                        {pet.name}
                    </h3>
                    <p
                        className={`text-white/80 ${compact ? 'text-xs' : 'text-sm'}`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                        {pet.name_vi}
                    </p>
                </div>

                {/* Progress Bar (for locked pets) */}
                {!pet.is_unlocked && unlockProgress > 0 && unlockProgress < 100 && (
                    <div className="mt-2">
                        <div
                            className="h-2 rounded-full overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.2)' }}
                        >
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${unlockProgress}%`,
                                    background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                                }}
                            />
                        </div>
                        <p className="text-white/70 text-xs text-center mt-1">
                            {Math.round(unlockProgress)}%
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-2">
                    {pet.is_unlocked ? (
                        !pet.is_active && (
                            <button
                                className={`
                                    w-full py-2 rounded-xl font-bold transition-all
                                    ${compact ? 'text-xs' : 'text-sm'}
                                `}
                                style={{
                                    background: 'rgba(255,255,255,0.95)',
                                    color: '#2563eb',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                }}
                                onClick={handleSelect}
                            >
                                Select Pet
                            </button>
                        )
                    ) : pet.can_unlock ? (
                        <button
                            className={`
                                w-full py-2 rounded-xl font-bold transition-all
                                ${compact ? 'text-xs' : 'text-sm'}
                                animate-pulse
                            `}
                            style={{
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                color: 'white',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                            }}
                            onClick={handleUnlock}
                        >
                            ✨ Unlock Now!
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Shimmer effect for legendary */}
            {pet.rarity === 'legendary' && pet.is_unlocked && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                        animation: 'shimmer 3s infinite',
                    }}
                />
            )}

            {/* Keyframes for shimmer animation */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default PetCard;
