/**
 * PetDropdownViewer.tsx
 * 
 * Dropdown-based pet viewer with:
 * - Single large 3D viewer showing selected pet
 * - Dropdown menu to switch between pets
 * - Lazy loading: only loads the selected pet's model
 * - Feed/Play action buttons
 * - Pet info and rarity badge
 * 
 * Design Pattern: Single focus with dropdown selector
 * - Better performance: loads only 1 model at a time
 * - Cleaner UX: focused on one pet
 * - Easy navigation with dropdown
 * 
 * Following clean-code principles and performance best practices
 */

import React, { useState, useEffect } from 'react';
import { Pet } from '@/hooks/usePets';
import { PetViewer3D } from './PetViewer3D';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { rarityConfig } from './PetCard';

// ========== Types ==========

export interface PetDropdownViewerProps {
    /** Array of pets to display */
    pets: Pet[];
    /** Currently active pet ID */
    activePetId?: string;
    /** Called when user selects a pet */
    onSelectPet?: (petId: string) => void;
    /** Called when user feeds a pet */
    onFeedPet?: (petId: string) => void;
    /** Called when user plays with a pet */
    onPlayWithPet?: (petId: string) => void;
    /** Show action buttons (Feed/Play) */
    showActions?: boolean;
    /** Custom class name */
    className?: string;
}

// ========== Main Component ==========

export const PetDropdownViewer: React.FC<PetDropdownViewerProps> = ({
    pets,
    activePetId,
    onSelectPet,
    onFeedPet,
    onPlayWithPet,
    showActions = true,
    className = '',
}) => {
    // Find initial selected pet (active pet or first unlocked)
    const getInitialPet = (): Pet | null => {
        if (activePetId) {
            const activePet = pets.find(p => p.pet_id === activePetId);
            if (activePet) return activePet;
        }
        const firstUnlocked = pets.find(p => p.is_unlocked);
        return firstUnlocked || pets[0] || null;
    };

    const [selectedPet, setSelectedPet] = useState<Pet | null>(getInitialPet);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Update selected pet when activePetId changes
    useEffect(() => {
        if (activePetId) {
            const activePet = pets.find(p => p.pet_id === activePetId);
            if (activePet) {
                setSelectedPet(activePet);
            }
        }
    }, [activePetId, pets]);

    // Handle pet selection
    const handleSelectPet = (pet: Pet) => {
        setSelectedPet(pet);
        setIsDropdownOpen(false);
        HapticService.tap();
        SoundEffectService.play('tap');
        onSelectPet?.(pet.pet_id);
    };

    // Handle feed action
    const handleFeed = () => {
        if (!selectedPet) return;
        HapticService.success();
        SoundEffectService.play('success');
        onFeedPet?.(selectedPet.pet_id);
    };

    // Handle play action
    const handlePlay = () => {
        if (!selectedPet) return;
        HapticService.success();
        SoundEffectService.play('success');
        onPlayWithPet?.(selectedPet.pet_id);
    };

    if (pets.length === 0) {
        return (
            <div className={`text-center py-16 ${className}`}>
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="text-xl font-bold text-white mb-2">No Pets Yet</h3>
                <p className="text-white/70">Unlock pets by earning XP!</p>
            </div>
        );
    }

    if (!selectedPet) {
        return null;
    }

    const config = rarityConfig[selectedPet.rarity];
    const isActive = selectedPet.pet_id === activePetId;

    return (
        <div className={`pet-dropdown-viewer ${className}`}>
            {/* Dropdown Selector */}
            <div className="mb-6">
                <label
                    className="block text-sm font-bold text-white mb-2"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                    Select Pet
                </label>
                <div className="relative">
                    <button
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-white transition-all duration-200 active:scale-98"
                        style={{
                            background: `linear-gradient(135deg, ${config.glow} 0%, ${config.glow}CC 100%)`,
                            boxShadow: `0 4px 16px ${config.glow}60`,
                            border: '2px solid rgba(255,255,255,0.2)',
                        }}
                        onClick={() => {
                            setIsDropdownOpen(!isDropdownOpen);
                            HapticService.tap();
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{config.badge}</span>
                            <div className="text-left">
                                <div className="font-bold">{selectedPet.name}</div>
                                <div className="text-xs opacity-80 capitalize">{selectedPet.rarity}</div>
                            </div>
                        </div>
                        <svg
                            className={`w-5 h-5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div
                            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20"
                            style={{
                                background: 'rgba(0,0,0,0.95)',
                                backdropFilter: 'blur(20px)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                maxHeight: '320px',
                                overflowY: 'auto',
                            }}
                        >
                            {pets.map((pet) => {
                                const petConfig = rarityConfig[pet.rarity];
                                const isSelected = pet.pet_id === selectedPet.pet_id;

                                return (
                                    <button
                                        key={pet.pet_id}
                                        className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200 hover:bg-white/10"
                                        style={{
                                            background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        }}
                                        onClick={() => handleSelectPet(pet)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{petConfig.badge}</span>
                                            <div className="text-left">
                                                <div className="font-bold text-white text-sm">
                                                    {pet.name}
                                                    {!pet.is_unlocked && (
                                                        <span className="ml-2 text-xs opacity-60">🔒</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-white/60 capitalize">
                                                    {pet.rarity}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <svg
                                                className="w-5 h-5 text-green-400"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Click outside to close dropdown */}
                {isDropdownOpen && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsDropdownOpen(false)}
                    />
                )}
            </div>

            {/* Large 3D Pet Viewer */}
            <div className="mb-6">
                <PetViewer3D
                    pet={selectedPet}
                    height="400px"
                    enableControls={true}
                    autoRotate={true}
                    autoRotateSpeed={1.5}
                    showLoading
                    background="gradient"
                    scale={1.2}
                />
            </div>

            {/* Pet Info */}
            <div
                className="text-center mb-6 px-6 py-4 rounded-2xl"
                style={{
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255,255,255,0.1)',
                }}
            >
                <h2
                    className="font-bold text-white text-2xl mb-2"
                    style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}
                >
                    {selectedPet.name}
                </h2>
                <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
                    style={{
                        background: `linear-gradient(135deg, ${config.glow} 0%, ${config.glow}80 100%)`,
                        boxShadow: `0 2px 8px ${config.glow}40`,
                    }}
                >
                    <span className="text-lg">{config.badge}</span>
                    <span className="text-sm font-semibold text-white capitalize">
                        {selectedPet.rarity}
                    </span>
                </div>

                {/* Active Pet Indicator */}
                {isActive && (
                    <div
                        className="inline-block px-4 py-2 rounded-full"
                        style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                        }}
                    >
                        <span className="text-white text-sm font-bold">
                            ✓ Active Pet
                        </span>
                    </div>
                )}

                {/* Unlock Status */}
                {!selectedPet.is_unlocked && (
                    <div
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full mt-2"
                        style={{
                            background: 'rgba(0,0,0,0.4)',
                            backdropFilter: 'blur(10px)',
                            border: '2px solid rgba(255,255,255,0.2)',
                        }}
                    >
                        <span className="text-xl">🔒</span>
                        <span className="text-white text-sm font-semibold">
                            {selectedPet.unlock_condition.type === 'xp' && `Unlock at ${selectedPet.unlock_condition.value} XP`}
                            {selectedPet.unlock_condition.type === 'streak' && `${selectedPet.unlock_condition.value} day streak`}
                            {selectedPet.unlock_condition.type === 'achievement' && 'Special Achievement'}
                            {selectedPet.unlock_condition.type === 'free' && 'Free Pet'}
                            {selectedPet.unlock_condition.type === 'purchase' && `Purchase for ${selectedPet.unlock_condition.value} coins`}
                        </span>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {showActions && selectedPet.is_unlocked && (
                <div className="flex gap-4">
                    {/* Feed Button */}
                    <button
                        className="flex-1 py-4 px-6 rounded-xl font-bold text-white transition-all duration-200 active:scale-95 hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                        }}
                        onClick={handleFeed}
                    >
                        <span className="mr-2 text-2xl">🍖</span>
                        <span className="text-lg">Feed</span>
                    </button>

                    {/* Play Button */}
                    <button
                        className="flex-1 py-4 px-6 rounded-xl font-bold text-white transition-all duration-200 active:scale-95 hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                        }}
                        onClick={handlePlay}
                    >
                        <span className="mr-2 text-2xl">🎮</span>
                        <span className="text-lg">Play</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PetDropdownViewer;
