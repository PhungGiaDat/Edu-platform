// src/components/Gamification/VirtualPetEvolved.tsx
// Enhanced virtual pet with evolution stages, outfits, and accessories

import React, { useState } from 'react';
import { HapticService } from '../../services/HapticService';
import { SoundEffectService } from '../../services/SoundEffectService';

export type PetType = string;
export type PetMood = 'happy' | 'content' | 'sad' | 'sleeping';
export type EvolutionStage = 'baby' | 'child' | 'teen' | 'adult';
export type OutfitId = 'none' | 'crown' | 'wizard_hat' | 'superhero_cape' | 'party_hat' | 'glasses' | 'bowtie';

interface PetState {
    type: PetType;
    happiness: number;
    stage: EvolutionStage;
    outfit?: OutfitId;
    accessory?: string;
    xpEarned: number; // Total XP earned with this pet
}

interface VirtualPetEvolvedProps {
    pet: PetState;
    onFeed?: () => void;
    onPlay?: () => void;
    onChangeOutfit?: (outfit: OutfitId) => void;
    compact?: boolean;
    showOutfitSelector?: boolean;
}

// Pet emojis by type, mood, and evolution stage
const PET_VISUALS: Record<string, Record<EvolutionStage, Record<PetMood, string>>> = {
    bunny: {
        baby: { happy: '🐣', content: '🥚', sad: '😢', sleeping: '💤' },
        child: { happy: '🐰', content: '🐇', sad: '😿', sleeping: '😴' },
        teen: { happy: '🐰', content: '🐇', sad: '🐇', sleeping: '😴' },
        adult: { happy: '🐰✨', content: '🐇', sad: '🐇', sleeping: '😴' },
    },
    cat: {
        baby: { happy: '🐱', content: '😺', sad: '😿', sleeping: '💤' },
        child: { happy: '😸', content: '😺', sad: '😿', sleeping: '😴' },
        teen: { happy: '😸', content: '🐱', sad: '😾', sleeping: '😴' },
        adult: { happy: '😻✨', content: '😺', sad: '😿', sleeping: '😴' },
    },
    dog: {
        baby: { happy: '🐕', content: '🐶', sad: '🥺', sleeping: '💤' },
        child: { happy: '🐶', content: '🐕', sad: '🐕', sleeping: '😴' },
        teen: { happy: '🐕‍🦺', content: '🐶', sad: '🐕', sleeping: '😴' },
        adult: { happy: '🐕✨', content: '🦮', sad: '🐕', sleeping: '😴' },
    },
    panda: {
        baby: { happy: '🐼', content: '🐻', sad: '😢', sleeping: '💤' },
        child: { happy: '🐼', content: '🐻', sad: '🐻', sleeping: '😴' },
        teen: { happy: '🐼', content: '🐼', sad: '🐻', sleeping: '😴' },
        adult: { happy: '🐼✨', content: '🐼', sad: '🐼', sleeping: '😴' },
    },
};

// Outfit emojis
const OUTFIT_VISUALS: Record<OutfitId, { emoji: string; name: string; requiredLevel: number }> = {
    none: { emoji: '', name: 'None', requiredLevel: 0 },
    crown: { emoji: '👑', name: 'Crown', requiredLevel: 10 },
    wizard_hat: { emoji: '🧙‍♂️', name: 'Wizard Hat', requiredLevel: 5 },
    superhero_cape: { emoji: '🦸', name: 'Superhero Cape', requiredLevel: 8 },
    party_hat: { emoji: '🎉', name: 'Party Hat', requiredLevel: 3 },
    glasses: { emoji: '🤓', name: 'Smart Glasses', requiredLevel: 2 },
    bowtie: { emoji: '🎀', name: 'Bowtie', requiredLevel: 1 },
};

// Evolution thresholds (XP required)
const EVOLUTION_THRESHOLDS: Record<EvolutionStage, number> = {
    baby: 0,
    child: 100,
    teen: 500,
    adult: 2000,
};

const STAGE_LABELS: Record<EvolutionStage, string> = {
    baby: 'Baby',
    child: 'Little',
    teen: 'Growing',
    adult: 'Super',
};

const DEFAULT_PET_VISUALS: Record<EvolutionStage, Record<PetMood, string>> = {
    baby: { happy: 'Pet', content: 'Pet', sad: 'Pet', sleeping: 'Zzz' },
    child: { happy: 'Pet', content: 'Pet', sad: 'Pet', sleeping: 'Zzz' },
    teen: { happy: 'Pet', content: 'Pet', sad: 'Pet', sleeping: 'Zzz' },
    adult: { happy: 'Pet', content: 'Pet', sad: 'Pet', sleeping: 'Zzz' },
};

// Helper to get stage from XP
export function getEvolutionStage(xp: number): EvolutionStage {
    if (xp >= EVOLUTION_THRESHOLDS.adult) return 'adult';
    if (xp >= EVOLUTION_THRESHOLDS.teen) return 'teen';
    if (xp >= EVOLUTION_THRESHOLDS.child) return 'child';
    return 'baby';
}

// Helper to get next evolution progress
export function getEvolutionProgress(xp: number): { current: number; next: number; percentage: number } {
    const stage = getEvolutionStage(xp);
    const stages: EvolutionStage[] = ['baby', 'child', 'teen', 'adult'];
    const currentIndex = stages.indexOf(stage);
    
    if (stage === 'adult') {
        return { current: xp, next: xp, percentage: 100 };
    }
    
    const nextStage = stages[currentIndex + 1];
    const currentThreshold = EVOLUTION_THRESHOLDS[stage];
    const nextThreshold = EVOLUTION_THRESHOLDS[nextStage];
    
    const progress = xp - currentThreshold;
    const needed = nextThreshold - currentThreshold;
    
    return {
        current: progress,
        next: needed,
        percentage: Math.min(100, Math.round((progress / needed) * 100))
    };
}

export const VirtualPetEvolved: React.FC<VirtualPetEvolvedProps> = ({
    pet,
    onFeed,
    onPlay,
    onChangeOutfit,
    compact = false,
    showOutfitSelector = false
}) => {
    const [isOutfitOpen, setIsOutfitOpen] = useState(false);
    
    // Calculate mood from happiness
    const getMood = (happiness: number): PetMood => {
        if (happiness >= 80) return 'happy';
        if (happiness >= 50) return 'content';
        if (happiness >= 20) return 'sad';
        return 'sleeping';
    };
    
    const mood = getMood(pet.happiness);
    const stage = pet.stage || getEvolutionStage(pet.xpEarned || 0);
    const petVisuals = PET_VISUALS[pet.type] || DEFAULT_PET_VISUALS;
    const petEmoji = petVisuals[stage]?.[mood] || DEFAULT_PET_VISUALS[stage][mood];
    const outfit = pet.outfit || 'none';
    const outfitEmoji = OUTFIT_VISUALS[outfit]?.emoji || '';
    const evolutionProgress = getEvolutionProgress(pet.xpEarned || 0);
    
    const handleFeed = () => {
        HapticService.tap();
        SoundEffectService.play('tap');
        onFeed?.();
    };
    
    const handlePlay = () => {
        HapticService.tap();
        SoundEffectService.play('tap');
        onPlay?.();
    };
    
    const handleOutfitClick = (outfitId: OutfitId) => {
        HapticService.success();
        SoundEffectService.play('success');
        onChangeOutfit?.(outfitId);
        setIsOutfitOpen(false);
    };
    
    // Compact mode for AR overlay
    if (compact) {
        return (
            <button
                onClick={handleFeed}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl shadow-lg transition-transform active:scale-95"
                style={{
                    background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
                    border: '3px solid #fff',
                    WebkitTapHighlightColor: 'transparent',
                    minHeight: '48px'
                }}
            >
                <div className="relative">
                    <span style={{ fontSize: '28px' }}>{petEmoji}</span>
                    {outfitEmoji && (
                        <span
                            className="absolute -top-2 -right-1"
                            style={{ fontSize: '14px' }}
                        >
                            {outfitEmoji}
                        </span>
                    )}
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-white font-bold text-xs">
                        {STAGE_LABELS[stage]} {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
                    </span>
                    <div
                        className="h-1.5 rounded-full"
                        style={{ width: '40px', background: 'rgba(255,255,255,0.3)' }}
                    >
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${pet.happiness}%`,
                                background: pet.happiness > 70 ? '#4ade80' : pet.happiness > 40 ? '#fbbf24' : '#f87171'
                            }}
                        />
                    </div>
                </div>
            </button>
        );
    }
    
    // Full mode
    return (
        <div
            className="rounded-3xl p-4 shadow-xl"
            style={{
                background: 'linear-gradient(135deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%)',
                border: '4px solid #fff'
            }}
        >
            {/* Pet display with outfit */}
            <div className="text-center mb-3 relative">
                <div
                    className="inline-block animate-bounce relative"
                    style={{
                        fontSize: 'clamp(48px, 15vw, 80px)',
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                    }}
                >
                    {petEmoji}
                    {outfitEmoji && (
                        <span
                            className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                            style={{ fontSize: 'clamp(20px, 6vw, 32px)' }}
                        >
                            {outfitEmoji}
                        </span>
                    )}
                </div>
                <p className="text-white font-black text-lg drop-shadow">
                    {STAGE_LABELS[stage]} {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
                </p>
            </div>
            
            {/* Happiness bar */}
            <div className="mb-2">
                <div className="flex justify-between text-white text-xs font-bold mb-1">
                    <span>Happiness</span>
                    <span>{pet.happiness}%</span>
                </div>
                <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.3)' }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${pet.happiness}%`,
                            background: pet.happiness > 70
                                ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                                : pet.happiness > 40
                                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                                    : 'linear-gradient(90deg, #f87171, #ef4444)'
                        }}
                    />
                </div>
            </div>
            
            {/* Evolution progress bar */}
            {stage !== 'adult' && (
                <div className="mb-3">
                    <div className="flex justify-between text-white text-xs font-bold mb-1">
                        <span>Evolution</span>
                        <span>{evolutionProgress.percentage}%</span>
                    </div>
                    <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.3)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${evolutionProgress.percentage}%`,
                                background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)'
                            }}
                        />
                    </div>
                    <p className="text-white/70 text-xs text-center mt-1">
                        {evolutionProgress.current} / {evolutionProgress.next} XP to next stage
                    </p>
                </div>
            )}
            
            {stage === 'adult' && (
                <div className="text-center mb-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-sky-500/80">
                        MAX EVOLUTION! 🌟
                    </span>
                </div>
            )}
            
            {/* Action buttons */}
            <div className="flex gap-2 mb-2">
                <button
                    onClick={handleFeed}
                    className="flex-1 py-3 rounded-xl font-bold text-sm shadow transition-transform active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        border: '2px solid #d97706',
                        color: '#fff',
                        minHeight: '48px'
                    }}
                >
                    🍎 Feed
                </button>
                <button
                    onClick={handlePlay}
                    className="flex-1 py-3 rounded-xl font-bold text-sm shadow transition-transform active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
                        border: '2px solid #0284c7',
                        color: '#fff',
                        minHeight: '48px'
                    }}
                >
                    🎾 Play
                </button>
            </div>
            
            {/* Outfit button */}
            {showOutfitSelector && (
                <button
                    onClick={() => setIsOutfitOpen(!isOutfitOpen)}
                    className="w-full py-2 rounded-xl font-bold text-sm shadow transition-transform active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                        border: '2px solid #ea580c',
                        color: '#fff',
                        minHeight: '44px'
                    }}
                >
                    👗 Change Outfit
                </button>
            )}
            
            {/* Outfit selector modal */}
            {isOutfitOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                    onClick={() => setIsOutfitOpen(false)}
                >
                    <div
                        className="rounded-3xl p-4 max-w-sm w-full mx-4"
                        style={{
                            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                            border: '4px solid #f97316'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-black text-orange-600 text-center mb-3">
                            👗 Choose Outfit
                        </h3>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {Object.entries(OUTFIT_VISUALS).map(([id, outfitInfo]) => (
                                <button
                                    key={id}
                                    onClick={() => handleOutfitClick(id as OutfitId)}
                                    className="p-3 rounded-xl text-center transition-transform active:scale-95"
                                    style={{
                                        background: outfit === id
                                            ? 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'
                                            : 'rgba(255,255,255,0.9)',
                                        border: outfit === id ? '2px solid #ea580c' : '2px solid #fdba74',
                                        minHeight: '70px'
                                    }}
                                >
                                    <span style={{ fontSize: '24px' }}>
                                        {outfitInfo.emoji || '❌'}
                                    </span>
                                    <p
                                        className="text-xs font-bold mt-1"
                                        style={{ color: outfit === id ? '#fff' : '#c2410c' }}
                                    >
                                        {outfitInfo.name}
                                    </p>
                                </button>
                            ))}
                        </div>
                        
                        <button
                            onClick={() => setIsOutfitOpen(false)}
                            className="w-full mt-3 py-2 rounded-xl font-bold text-white transition-transform active:scale-95"
                            style={{
                                background: '#9ca3af',
                                minHeight: '44px'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            
            {/* Mood message */}
            <p className="text-center text-white/90 text-xs mt-2 font-semibold">
                {mood === 'happy' && '💕 So happy to learn with you!'}
                {mood === 'content' && '😊 Feeling good!'}
                {mood === 'sad' && '😢 Feed me to feel better!'}
                {mood === 'sleeping' && '💤 Zzz... needs attention!'}
            </p>
        </div>
    );
};

export default VirtualPetEvolved;
