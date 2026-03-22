// src/components/Gamification/StickerCollection.tsx
// Kid-friendly sticker collection display with rarity effects

import React, { useState } from 'react';
import { HapticService } from '../../services/HapticService';
import { SoundEffectService } from '../../services/SoundEffectService';

export interface Sticker {
    id: string;
    name: string;
    imageUrl: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earned_at?: string;
}

interface StickerCollectionProps {
    stickers: Sticker[];
    compact?: boolean;
    onStickerClick?: (sticker: Sticker) => void;
}

// Emoji fallbacks for stickers (used when image fails to load)
const STICKER_EMOJIS: Record<string, string> = {
    star_gold: '⭐',
    star_rainbow: '🌈',
    trophy_bronze: '🥉',
    trophy_gold: '🏆',
    animal_elephant: '🐘',
    animal_lion: '🦁',
    crown: '👑',
    heart: '❤️',
    rocket: '🚀',
    medal: '🎖️',
    diamond: '💎',
    fire: '🔥',
};

// Rarity styling
const RARITY_STYLES: Record<string, { border: string; glow: string; bg: string; label: string }> = {
    common: {
        border: '#9ca3af',
        glow: 'none',
        bg: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        label: 'Common'
    },
    rare: {
        border: '#3b82f6',
        glow: '0 0 12px rgba(59, 130, 246, 0.4)',
        bg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
        label: 'Rare'
    },
    epic: {
        border: '#0ea5e9',
        glow: '0 0 16px rgba(14, 165, 233, 0.45)',
        bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
        label: 'Epic'
    },
    legendary: {
        border: '#f59e0b',
        glow: '0 0 20px rgba(245, 158, 11, 0.6), 0 0 40px rgba(245, 158, 11, 0.3)',
        bg: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)',
        label: 'Legendary'
    }
};

export const StickerCollection: React.FC<StickerCollectionProps> = ({
    stickers,
    compact = false,
    onStickerClick
}) => {
    const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

    const handleStickerClick = (sticker: Sticker) => {
        HapticService.tap();
        SoundEffectService.play('tap');
        setSelectedSticker(sticker);
        onStickerClick?.(sticker);
    };

    const handleCloseDetail = () => {
        HapticService.tap();
        setSelectedSticker(null);
    };

    const handleImageError = (stickerId: string) => {
        setImageErrors(prev => new Set(prev).add(stickerId));
    };

    // Group stickers by rarity for display
    const groupedStickers = {
        legendary: stickers.filter(s => s.rarity === 'legendary'),
        epic: stickers.filter(s => s.rarity === 'epic'),
        rare: stickers.filter(s => s.rarity === 'rare'),
        common: stickers.filter(s => s.rarity === 'common'),
    };

    const totalStickers = stickers.length;

    // Compact version - just show count and preview
    if (compact) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg"
                style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    border: '3px solid #fff',
                }}
            >
                <span style={{ fontSize: '24px' }}>🎨</span>
                <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-xs">Stickers</span>
                    <span className="text-white font-black text-sm">{totalStickers}</span>
                </div>
                {/* Preview of top 3 stickers */}
                <div className="flex -space-x-2 ml-1">
                    {stickers.slice(0, 3).map((sticker) => (
                        <div
                            key={sticker.id}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{
                                background: RARITY_STYLES[sticker.rarity].bg,
                                border: `2px solid ${RARITY_STYLES[sticker.rarity].border}`,
                            }}
                        >
                            {STICKER_EMOJIS[sticker.id] || '🎨'}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Full collection view
    return (
        <div className="space-y-4">
            {/* Header */}
            <div
                className="text-center p-4 rounded-2xl"
                style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    border: '4px solid #fff',
                }}
            >
                <h2 className="text-white font-black text-xl drop-shadow">
                    🎨 My Sticker Collection
                </h2>
                <p className="text-white/90 text-sm font-semibold">
                    {totalStickers} sticker{totalStickers !== 1 ? 's' : ''} collected!
                </p>
            </div>

            {/* Empty state */}
            {totalStickers === 0 && (
                <div
                    className="text-center p-8 rounded-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        border: '3px dashed #9ca3af',
                    }}
                >
                    <p className="text-4xl mb-3">🎨</p>
                    <p className="text-gray-600 font-bold">No stickers yet!</p>
                    <p className="text-gray-500 text-sm">Play games to earn stickers!</p>
                </div>
            )}

            {/* Stickers by rarity */}
            {(['legendary', 'epic', 'rare', 'common'] as const).map((rarity) => {
                const rarityStickers = groupedStickers[rarity];
                if (rarityStickers.length === 0) return null;

                return (
                    <div key={rarity}>
                        {/* Rarity label */}
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                style={{
                                    background: RARITY_STYLES[rarity].border,
                                    boxShadow: RARITY_STYLES[rarity].glow,
                                }}
                            >
                                {RARITY_STYLES[rarity].label}
                            </span>
                            <span className="text-gray-500 text-xs">
                                ({rarityStickers.length})
                            </span>
                        </div>

                        {/* Sticker grid */}
                        <div className="grid grid-cols-4 gap-3">
                            {rarityStickers.map((sticker) => (
                                <button
                                    key={sticker.id}
                                    onClick={() => handleStickerClick(sticker)}
                                    className="relative aspect-square rounded-xl flex items-center justify-center transition-transform active:scale-95"
                                    style={{
                                        background: RARITY_STYLES[sticker.rarity].bg,
                                        border: `3px solid ${RARITY_STYLES[sticker.rarity].border}`,
                                        boxShadow: RARITY_STYLES[sticker.rarity].glow,
                                        minWidth: '60px',
                                        minHeight: '60px',
                                    }}
                                >
                                    {imageErrors.has(sticker.id) ? (
                                        <span style={{ fontSize: '28px' }}>
                                            {STICKER_EMOJIS[sticker.id] || '🎨'}
                                        </span>
                                    ) : (
                                        <img
                                            src={sticker.imageUrl}
                                            alt={sticker.name}
                                            className="w-10 h-10 object-contain"
                                            onError={() => handleImageError(sticker.id)}
                                        />
                                    )}

                                    {/* Legendary sparkle effect */}
                                    {sticker.rarity === 'legendary' && (
                                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                                            <div
                                                className="absolute text-xs animate-ping"
                                                style={{ top: '10%', left: '20%' }}
                                            >
                                                ✨
                                            </div>
                                            <div
                                                className="absolute text-xs animate-ping"
                                                style={{ top: '60%', right: '15%', animationDelay: '0.5s' }}
                                            >
                                                ✨
                                            </div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}

            {/* Sticker detail modal */}
            {selectedSticker && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                    onClick={handleCloseDetail}
                >
                    <div
                        className="rounded-3xl p-6 text-center max-w-xs w-full mx-4 animate-bounceIn"
                        style={{
                            background: RARITY_STYLES[selectedSticker.rarity].bg,
                            border: `4px solid ${RARITY_STYLES[selectedSticker.rarity].border}`,
                            boxShadow: RARITY_STYLES[selectedSticker.rarity].glow,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sticker display */}
                        <div
                            className="w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                            style={{
                                background: 'rgba(255,255,255,0.8)',
                                border: `3px solid ${RARITY_STYLES[selectedSticker.rarity].border}`,
                            }}
                        >
                            {imageErrors.has(selectedSticker.id) ? (
                                <span style={{ fontSize: '48px' }}>
                                    {STICKER_EMOJIS[selectedSticker.id] || '🎨'}
                                </span>
                            ) : (
                                <img
                                    src={selectedSticker.imageUrl}
                                    alt={selectedSticker.name}
                                    className="w-16 h-16 object-contain"
                                    onError={() => handleImageError(selectedSticker.id)}
                                />
                            )}
                        </div>

                        {/* Name */}
                        <h3 className="text-xl font-black text-gray-800 mb-2">
                            {selectedSticker.name}
                        </h3>

                        {/* Rarity badge */}
                        <span
                            className="inline-block px-4 py-1 rounded-full text-sm font-bold text-white mb-3"
                            style={{
                                background: RARITY_STYLES[selectedSticker.rarity].border,
                            }}
                        >
                            {RARITY_STYLES[selectedSticker.rarity].label}
                        </span>

                        {/* Earned date */}
                        {selectedSticker.earned_at && (
                            <p className="text-gray-600 text-xs">
                                Collected: {new Date(selectedSticker.earned_at).toLocaleDateString()}
                            </p>
                        )}

                        {/* Close button */}
                        <button
                            onClick={handleCloseDetail}
                            className="mt-4 px-6 py-2 rounded-full font-bold text-white transition-transform active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                minHeight: '44px',
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Animation keyframes */}
            <style>{`
                @keyframes bounceIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    60% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounceIn {
                    animation: bounceIn 0.4s ease-out;
                }
            `}</style>
        </div>
    );
};

export default StickerCollection;
