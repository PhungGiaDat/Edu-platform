/**
 * PetGrid.tsx
 *
 * Grid display of pet cards with:
 * - Filter tabs (All / Unlocked / Locked)
 * - Responsive grid layout
 * - Empty states for each filter
 * - Kid-friendly styling matching app theme
 */

import React, { useState, useMemo } from 'react';
import { Pet } from '@/features/pets/hooks/usePets';
import { PetCard } from './PetCard';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';

// ========== Types ==========

type FilterTab = 'all' | 'unlocked' | 'locked';

export interface PetGridProps {
    /** Array of all pets */
    pets: Pet[];
    /** Currently selected pet ID for preview */
    selectedPetId?: string;
    /** User's current XP for progress calculation */
    userXP?: number;
    /** User's current streak for progress calculation */
    userStreak?: number;
    /** Called when user clicks to preview a pet in 3D */
    onPreview?: (pet: Pet) => void;
    /** Called when user clicks to select a pet as active */
    onSelect?: (petId: string) => void;
    /** Called when user clicks to unlock a pet */
    onUnlock?: (petId: string) => void;
    /** Use compact card mode */
    compact?: boolean;
    /** Show filter tabs */
    showFilters?: boolean;
    /** Custom class name */
    className?: string;
}

// ========== Filter Tab Config ==========

const filterConfig: Record<FilterTab, { label: string; emoji: string }> = {
    all: { label: 'All Pets', emoji: '🐾' },
    unlocked: { label: 'My Pets', emoji: '✨' },
    locked: { label: 'Locked', emoji: '🔒' },
};

// ========== Component ==========

export const PetGrid: React.FC<PetGridProps> = ({
    pets,
    selectedPetId,
    userXP = 0,
    userStreak = 0,
    onPreview,
    onSelect,
    onUnlock,
    compact = false,
    showFilters = true,
    className = '',
}) => {
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

    // Filter pets based on active tab
    const filteredPets = useMemo(() => {
        switch (activeFilter) {
            case 'unlocked':
                return pets.filter(p => p.is_unlocked);
            case 'locked':
                return pets.filter(p => !p.is_unlocked);
            case 'all':
            default:
                return pets;
        }
    }, [pets, activeFilter]);

    // Calculate unlock progress for a pet
    const calculateProgress = (pet: Pet): number => {
        if (pet.is_unlocked) return 100;
        if (pet.unlock_condition.type === 'free') return 100;

        const { type, value } = pet.unlock_condition;
        switch (type) {
            case 'xp':
                return Math.min(100, Math.round((userXP / value) * 100));
            case 'streak':
                return Math.min(100, Math.round((userStreak / value) * 100));
            case 'achievement':
                return pet.can_unlock ? 100 : 0;
            default:
                return 0;
        }
    };

    // Handle filter tab click
    const handleFilterClick = (filter: FilterTab) => {
        HapticService.tap();
        SoundEffectService.play('click');
        setActiveFilter(filter);
    };

    // Get counts for badges
    const counts = useMemo(() => ({
        all: pets.length,
        unlocked: pets.filter(p => p.is_unlocked).length,
        locked: pets.filter(p => !p.is_unlocked).length,
    }), [pets]);

    // Empty state component
    const EmptyState = ({ filter }: { filter: FilterTab }) => {
        const emptyMessages: Record<FilterTab, { title: string; subtitle: string; emoji: string }> = {
            all: {
                title: 'No Pets Available',
                subtitle: 'Check back soon for new pets!',
                emoji: '🎁',
            },
            unlocked: {
                title: 'No Pets Yet',
                subtitle: 'Unlock your first pet by earning XP!',
                emoji: '🌟',
            },
            locked: {
                title: 'All Unlocked!',
                subtitle: "Amazing! You've unlocked every pet!",
                emoji: '🏆',
            },
        };

        const { title, subtitle, emoji } = emptyMessages[filter];

        return (
            <div
                className="flex flex-col items-center justify-center py-12 px-4"
                style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '24px',
                    border: '2px dashed rgba(255,255,255,0.3)',
                }}
            >
                <div
                    className="text-6xl mb-4"
                    style={{ animation: 'bounce 2s infinite' }}
                >
                    {emoji}
                </div>
                <h3
                    className="text-xl font-bold text-white mb-2"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                >
                    {title}
                </h3>
                <p
                    className="text-white/70 text-center"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                >
                    {subtitle}
                </p>
            </div>
        );
    };

    return (
        <div className={`pet-grid-container ${className}`}>
            {/* Filter Tabs */}
            {showFilters && (
                <div
                    className="flex gap-2 mb-4 p-1 rounded-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    {(Object.keys(filterConfig) as FilterTab[]).map((filter) => {
                        const isActive = activeFilter === filter;
                        const { label, emoji } = filterConfig[filter];
                        const count = counts[filter];

                        return (
                            <button
                                key={filter}
                                className={`
                                    flex-1 py-3 px-4 rounded-xl font-bold
                                    transition-all duration-200
                                    flex items-center justify-center gap-2
                                    ${isActive ? 'scale-105' : 'hover:scale-102'}
                                `}
                                style={{
                                    background: isActive
                                        ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                                        : 'transparent',
                                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                                    boxShadow: isActive
                                        ? '0 4px 16px rgba(139, 92, 246, 0.4)'
                                        : 'none',
                                }}
                                onClick={() => handleFilterClick(filter)}
                            >
                                <span className="text-lg">{emoji}</span>
                                <span className="hidden sm:inline text-sm">{label}</span>
                                <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                        background: isActive
                                            ? 'rgba(255,255,255,0.2)'
                                            : 'rgba(255,255,255,0.1)',
                                    }}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Pet Grid */}
            {filteredPets.length > 0 ? (
                <div
                    className={`
                        grid gap-4
                        grid-cols-2
                        md:grid-cols-3
                        lg:grid-cols-4
                        ${compact ? 'gap-3' : 'gap-4'}
                    `}
                >
                    {filteredPets.map((pet) => (
                        <PetCard
                            key={pet.pet_id}
                            pet={pet}
                            unlockProgress={calculateProgress(pet)}
                            isSelected={selectedPetId === pet.pet_id}
                            onPreview={onPreview}
                            onSelect={onSelect}
                            onUnlock={onUnlock}
                            compact={compact}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState filter={activeFilter} />
            )}

            {/* Stats Summary (when showing all) */}
            {activeFilter === 'all' && pets.length > 0 && (
                <div
                    className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-6"
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                    }}
                >
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                            {counts.unlocked}
                        </div>
                        <div className="text-xs text-white/60">Unlocked</div>
                    </div>
                    <div
                        className="w-px h-8"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                    />
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                            {counts.all}
                        </div>
                        <div className="text-xs text-white/60">Total</div>
                    </div>
                    <div
                        className="w-px h-8"
                        style={{ background: 'rgba(255,255,255,0.2)' }}
                    />
                    <div className="text-center">
                        <div
                            className="text-2xl font-bold"
                            style={{
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            {Math.round((counts.unlocked / Math.max(counts.all, 1)) * 100)}%
                        </div>
                        <div className="text-xs text-white/60">Complete</div>
                    </div>
                </div>
            )}

            {/* Animations */}
            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .hover\\:scale-102:hover {
                    transform: scale(1.02);
                }
            `}</style>
        </div>
    );
};

export default PetGrid;
