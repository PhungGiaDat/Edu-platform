/**
 * PetSelector.tsx
 * 
 * Main modal for browsing, previewing, and selecting pets
 * Features:
 * - Full PetGrid with built-in filter tabs
 * - 3D preview panel when a pet is selected
 * - Pet unlock flow integration
 * - Set as active pet functionality
 * - Kid-friendly styling with slide-up animation
 * - Haptic and sound feedback
 * - PetUnlockModal overlay for recently unlocked pets
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Pet } from '@/hooks/usePets';
import { PetGrid } from './PetGrid';
import { PetViewer3D } from './PetViewer3D';
import { PetUnlockModal } from './PetUnlockModal';
import { rarityConfig } from './PetCard';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';

// ========== Props Interface ==========

export interface PetSelectorProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Called when modal should close */
    onClose: () => void;
    /** Array of all available pets */
    pets: Pet[];
    /** User's current XP for unlock progress */
    userXP?: number;
    /** User's current streak for unlock progress */
    userStreak?: number;
    /** Called when user unlocks a pet */
    onUnlock?: (petId: string) => void;
    /** Called when user sets a pet as active */
    onSetActive?: (petId: string) => void;
    /** Recently unlocked pet to show celebration modal */
    recentlyUnlockedPet?: Pet | null;
    /** Called when unlock celebration modal closes */
    onUnlockModalClose?: () => void;
}

// ========== Component ==========

export const PetSelector: React.FC<PetSelectorProps> = ({
    isOpen,
    onClose,
    pets,
    userXP = 0,
    userStreak = 0,
    onUnlock,
    onSetActive,
    recentlyUnlockedPet,
    onUnlockModalClose,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [isModelLoading, setIsModelLoading] = useState(false);

    // Handle modal visibility animation and default selection
    useEffect(() => {
        if (isOpen) {
            // Small delay for slide-up animation
            requestAnimationFrame(() => {
                setIsVisible(true);
            });
            // Auto-select the active pet if one exists
            const activePet = pets.find(p => p.is_active);
            if (activePet) {
                setSelectedPet(activePet);
            }
            HapticService.tap();
            SoundEffectService.play('click');
        } else {
            setIsVisible(false);
            // Clear selection when modal closes
            setSelectedPet(null);
        }
    }, [isOpen, pets]);

    // Handle close with animation
    const handleClose = useCallback(() => {
        setIsVisible(false);
        HapticService.tap();
        SoundEffectService.play('click');

        // Delay actual close for animation
        setTimeout(() => {
            onClose();
        }, 250);
    }, [onClose]);

    // Handle pet preview selection
    const handlePreview = useCallback((pet: Pet) => {
        setSelectedPet(pet);
        setIsModelLoading(true);
        HapticService.tap();
        SoundEffectService.play('click');
    }, []);

    // Handle pet unlock
    const handleUnlock = useCallback((petId: string) => {
        HapticService.success();
        SoundEffectService.play('click');
        onUnlock?.(petId);
    }, [onUnlock]);

    // Handle set as active pet
    const handleSetActive = useCallback((petId: string) => {
        HapticService.success();
        SoundEffectService.play('success');
        onSetActive?.(petId);
    }, [onSetActive]);

    // Handle set active from preview panel
    const handleSetActiveFromPreview = useCallback(() => {
        if (selectedPet?.is_unlocked) {
            handleSetActive(selectedPet.pet_id);
        }
    }, [selectedPet, handleSetActive]);

    // Handle model load complete
    const handleModelLoad = useCallback(() => {
        setIsModelLoading(false);
    }, []);

    // Handle unlock modal close
    const handleUnlockModalClose = useCallback(() => {
        onUnlockModalClose?.();
    }, [onUnlockModalClose]);

    // Handle set active from unlock modal
    const handleSetActiveFromUnlockModal = useCallback((petId: string) => {
        handleSetActive(petId);
        onUnlockModalClose?.();
    }, [handleSetActive, onUnlockModalClose]);

    // Don't render if not open
    if (!isOpen) return null;

    // Get selected pet's rarity config for styling
    const selectedRarityConfig = selectedPet ? rarityConfig[selectedPet.rarity] : null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{
                    backgroundColor: `rgba(0, 0, 0, ${isVisible ? 0.6 : 0})`,
                    backdropFilter: isVisible ? 'blur(8px)' : 'none',
                    transition: 'all 0.3s ease-out',
                }}
                onClick={handleClose}
            />

            {/* Modal Container */}
            <div
                className="fixed inset-x-0 bottom-0 z-50 flex justify-center items-end pointer-events-none"
                style={{ padding: '16px' }}
            >
                <div
                    className="pointer-events-auto w-full max-w-4xl"
                    style={{
                        transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
                        opacity: isVisible ? 1 : 0,
                        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Content */}
                    <div
                        className="rounded-3xl overflow-hidden"
                        style={{
                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(240, 248, 255, 0.95))',
                            border: '4px solid #fff',
                            boxShadow: '0 -8px 40px rgba(139, 92, 246, 0.3), 0 4px 20px rgba(0, 0, 0, 0.15)',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="flex items-center justify-between px-6 py-4"
                            style={{
                                background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)',
                                borderBottom: '3px solid rgba(255, 255, 255, 0.3)',
                            }}
                        >
                            <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                                Choose Your Companion
                            </h2>
                            <button
                                onClick={handleClose}
                                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 hover:scale-110"
                                style={{
                                    border: '2px solid rgba(255, 255, 255, 0.5)',
                                }}
                            >
                                <span className="text-white text-2xl font-bold leading-none">×</span>
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div
                            className="flex-1 overflow-y-auto"
                            style={{
                                maxHeight: 'calc(85vh - 80px)',
                                padding: '20px',
                            }}
                        >
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Left Side: Grid */}
                                <div className="flex-1 order-2 md:order-1">
                                    <PetGrid
                                        pets={pets}
                                        selectedPetId={selectedPet?.pet_id}
                                        userXP={userXP}
                                        userStreak={userStreak}
                                        onPreview={handlePreview}
                                        onSelect={handleSetActive}
                                        onUnlock={handleUnlock}
                                        showFilters={true}
                                        compact={false}
                                    />
                                </div>

                                {/* Right Side: Preview */}
                                <div className="w-full md:w-80 lg:w-96 shrink-0 order-1 md:order-2">
                                    <div className="sticky top-0">
                                        {/* 3D Preview Panel - shown when a pet is selected */}
                                        {selectedPet ? (
                                            <div
                                                className="rounded-2xl overflow-hidden"
                                                style={{
                                                    background: selectedRarityConfig
                                                        ? `linear-gradient(145deg, ${selectedRarityConfig.gradient[0]}15, ${selectedRarityConfig.gradient[1]}15)`
                                                        : 'linear-gradient(145deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
                                                    border: `3px solid ${selectedRarityConfig?.gradient[0] || '#8B5CF6'}40`,
                                                    boxShadow: `0 4px 20px ${selectedRarityConfig?.gradient[0] || '#8B5CF6'}20`,
                                                }}
                                            >
                                                {/* Preview Header */}
                                                <div
                                                    className="flex items-center justify-between px-5 py-3"
                                                    style={{
                                                        background: selectedRarityConfig
                                                            ? `linear-gradient(135deg, ${selectedRarityConfig.gradient[0]}, ${selectedRarityConfig.gradient[1]})`
                                                            : 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                                                        borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{rarityConfig[selectedPet.rarity]?.badge || '🐾'}</span>
                                                        <div>
                                                            <h3 className="text-xl font-bold text-white drop-shadow">
                                                                {selectedPet.name}
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                <span
                                                                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                                    style={{
                                                                        background: 'rgba(255, 255, 255, 0.25)',
                                                                        color: 'white',
                                                                    }}
                                                                >
                                                                    {selectedPet.rarity}
                                                                </span>
                                                                {selectedPet.is_unlocked && (
                                                                    <span className="text-xs text-white/80">Unlocked</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Set as Active Button */}
                                                    {selectedPet.is_unlocked && (
                                                        <button
                                                            onClick={handleSetActiveFromPreview}
                                                            className="px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
                                                            style={{
                                                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                                                color: 'white',
                                                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                                                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)',
                                                            }}
                                                        >
                                                            Select
                                                        </button>
                                                    )}
                                                </div>

                                                {/* 3D Viewer */}
                                                <div className="relative" style={{ height: '280px' }}>
                                                    <PetViewer3D
                                                        pet={selectedPet}
                                                        height="100%"
                                                        enableControls={true}
                                                        autoRotate={true}
                                                        autoRotateSpeed={1.5}
                                                        showLoading={true}
                                                        onLoad={handleModelLoad}
                                                        background="transparent"
                                                    />

                                                    {/* Loading overlay */}
                                                    {isModelLoading && (
                                                        <div
                                                            className="absolute inset-0 flex items-center justify-center"
                                                            style={{
                                                                background: 'rgba(255, 255, 255, 0.7)',
                                                                backdropFilter: 'blur(4px)',
                                                            }}
                                                        >
                                                            <div className="text-center">
                                                                <div
                                                                    className="w-12 h-12 rounded-full border-4 border-t-purple-500 border-r-pink-500 border-b-amber-500 border-l-transparent animate-spin mx-auto mb-2"
                                                                />
                                                                <p className="text-gray-600 font-medium">Loading 3D Model...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Pet Description */}
                                                <div className="px-5 py-4" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                                                    <p className="text-gray-700 text-sm leading-relaxed">
                                                        {`Meet ${selectedPet.name}, your adorable ${selectedPet.rarity} companion!`}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Empty state when no pet selected */
                                            pets.length > 0 && (
                                                <div
                                                    className="rounded-2xl p-8 text-center"
                                                    style={{
                                                        background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.05), rgba(236, 72, 153, 0.05))',
                                                        border: '2px dashed rgba(139, 92, 246, 0.3)',
                                                    }}
                                                >
                                                    <span className="text-5xl mb-3 block animate-bounce">
                                                        👆
                                                    </span>
                                                    <p className="text-gray-500 font-medium">
                                                        Tap on a pet to preview in 3D!
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pet Unlock Celebration Modal */}
            {recentlyUnlockedPet && (
                <PetUnlockModal
                    pet={recentlyUnlockedPet}
                    isOpen={true}
                    onClose={handleUnlockModalClose}
                    onSetActive={handleSetActiveFromUnlockModal}
                />
            )}

            {/* Keyframes for animations */}
            <style>{`
                @keyframes bounce {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }
                
                .animate-bounce {
                    animation: bounce 1.5s ease-in-out infinite;
                }
                
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </>
    );
};

export default PetSelector;
