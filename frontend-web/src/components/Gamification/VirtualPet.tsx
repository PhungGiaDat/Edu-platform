// src/components/Gamification/VirtualPet.tsx - Kid-friendly virtual pet companion

import React from 'react';

interface VirtualPetProps {
    petType?: 'bunny' | 'cat' | 'dog' | 'panda';
    thumbnailUrl?: string;
    happiness?: number; // 0-100
    name?: string;
    onFeed?: () => void;
    onPlay?: () => void;
    compact?: boolean;
}

const PET_EMOJIS = {
    bunny: { happy: '🐰', sad: '🐇', sleeping: '😴' },
    cat: { happy: '😺', sad: '🐱', sleeping: '😸' },
    dog: { happy: '🐶', sad: '🐕', sleeping: '🐾' },
    panda: { happy: '🐼', sad: '🐻', sleeping: '💤' },
};

export const VirtualPet: React.FC<VirtualPetProps> = ({
    petType = 'bunny',
    thumbnailUrl,
    happiness = 80,
    name = 'Buddy',
    onFeed,
    onPlay,
    compact = false
}) => {
    const pet = PET_EMOJIS[petType];
    const mood = happiness > 70 ? 'happy' : happiness > 40 ? 'sad' : 'sleeping';
    const petEmoji = pet[mood];

    // Compact version for AR overlay
    if (compact) {
        return (
            <button
                onClick={onFeed}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg"
                style={{
                    background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                    border: '3px solid #fff',
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={name} className="w-8 h-8 object-contain drop-shadow" />
                ) : (
                    <span style={{ fontSize: '28px' }}>{petEmoji}</span>
                )}
                <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-xs">{name}</span>
                    <div
                        className="h-1.5 rounded-full"
                        style={{
                            width: '40px',
                            background: 'rgba(255,255,255,0.3)'
                        }}
                    >
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${happiness}%`,
                                background: happiness > 70 ? '#4ade80' : happiness > 40 ? '#fbbf24' : '#f87171'
                            }}
                        />
                    </div>
                </div>
            </button>
        );
    }

    // Full version for profile/gamification page
    return (
        <div
            className="rounded-3xl p-4 shadow-xl"
            style={{
                background: 'linear-gradient(135deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%)',
                border: '4px solid #fff'
            }}
        >
            {/* Pet display */}
            <div className="text-center mb-3">
                <div
                    className="inline-block animate-bounce"
                    style={{
                        fontSize: 'clamp(48px, 15vw, 80px)',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                    }}
                >
                    {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt={name} className="w-24 h-24 object-contain mx-auto" />
                    ) : (
                        petEmoji
                    )}
                </div>
                <p className="text-white font-black text-lg drop-shadow">{name}</p>
            </div>

            {/* Happiness bar */}
            <div className="mb-3">
                <div className="flex justify-between text-white text-xs font-bold mb-1">
                    <span>Happiness</span>
                    <span>{happiness}%</span>
                </div>
                <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.3)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${happiness}%`,
                            background: happiness > 70
                                ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                                : happiness > 40
                                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                    : 'linear-gradient(90deg, #f87171, #ef4444)'
                        }}
                    />
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    onClick={onFeed}
                    className="flex-1 py-2 rounded-xl font-bold text-sm shadow"
                    style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        border: '2px solid #d97706',
                        color: '#fff'
                    }}
                >
                    🍎 Feed
                </button>
                <button
                    onClick={onPlay}
                    className="flex-1 py-2 rounded-xl font-bold text-sm shadow"
                    style={{
                        background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                        border: '2px solid #7c3aed',
                        color: '#fff'
                    }}
                >
                    🎾 Play
                </button>
            </div>

            {/* Mood message */}
            <p className="text-center text-white/90 text-xs mt-2 font-semibold">
                {mood === 'happy' && '💕 So happy to learn with you!'}
                {mood === 'sad' && '😢 Feed me to feel better!'}
                {mood === 'sleeping' && '💤 Zzz... needs attention!'}
            </p>
        </div>
    );
};

export default VirtualPet;
