/**
 * PetCarousel.tsx
 *
 * Filmstrip-style carousel for pets with:
 * - Center-focused design with enlarged center pet
 * - Horizontal scrolling with CSS scroll-snap
 * - Left/Right arrow navigation (desktop)
 * - Touch swipe gestures (mobile)
 * - 3D pet viewer integration
 * - Feed/Play action buttons
 * - Smooth animations and transitions
 *
 * Design Pattern: Filmstrip carousel
 * - Center pet is enlarged and highlighted
 * - Side pets are visible but smaller
 * - Seamless scrolling experience
 *
 * Following clean-code principles and UI/UX best practices
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pet } from '@/features/pets/hooks/usePets';
import { PetViewer3D } from './PetViewer3D';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { rarityConfig } from './PetCard';

// ========== Types ==========

export interface PetCarouselProps {
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
    /** Height of the carousel */
    height?: string | number;
    /** Show action buttons (Feed/Play) */
    showActions?: boolean;
    /** Custom class name */
    className?: string;
}

interface CarouselItemProps {
    pet: Pet;
    isCenter: boolean;
    isActive: boolean;
    isAdjacent: boolean; // New prop for lazy loading
    onSelect: () => void;
    onFeed: () => void;
    onPlay: () => void;
    showActions: boolean;
}

// ========== Constants ==========

const SCROLL_SNAP_TYPE = 'x mandatory';
const CENTER_SCALE = 1.2;
const SIDE_SCALE = 0.85;
const TRANSITION_DURATION = '300ms';

// ========== Carousel Item Component ==========

const CarouselItem: React.FC<CarouselItemProps> = ({
    pet,
    isCenter,
    isActive,
    isAdjacent,
    onSelect,
    onFeed,
    onPlay,
    showActions,
}) => {
    const config = rarityConfig[pet.rarity];
    const scale = isCenter ? CENTER_SCALE : SIDE_SCALE;
    const opacity = isCenter ? 1 : 0.6;

    // Only load 3D model for center pet and adjacent pets (performance optimization)
    const shouldLoad3D = isCenter || isAdjacent;

    return (
        <div
            className="carousel-item flex-shrink-0 snap-center flex flex-col items-center"
            style={{
                width: '85vw',
                maxWidth: '400px',
                padding: '0 20px',
                transform: `scale(${scale})`,
                opacity,
                transition: `all ${TRANSITION_DURATION} cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
            onClick={onSelect}
        >
            {/* 3D Pet Viewer - Only load for center and adjacent pets */}
            <div
                className="w-full mb-4"
                style={{
                    filter: isCenter
                        ? `drop-shadow(0 10px 30px ${config.glow})`
                        : 'none',
                }}
            >
                {shouldLoad3D ? (
                    <PetViewer3D
                        pet={pet}
                        height="400px"
                        enableControls={isCenter}
                        autoRotate={isCenter}
                        autoRotateSpeed={1.5}
                        showLoading
                        background="gradient"
                        scale={2.5}
                    />
                ) : (
                    /* Placeholder for non-loaded pets */
                    <div
                        className="w-full rounded-2xl overflow-hidden flex items-center justify-center"
                        style={{
                            height: '400px',
                            background: `linear-gradient(180deg, ${config.glow} 0%, rgba(0,0,0,0.4) 100%)`,
                            border: '3px solid rgba(255,255,255,0.2)',
                            boxShadow: `0 8px 32px ${config.glow}`,
                        }}
                    >
                        <div className="text-center text-white">
                            <div className="text-6xl mb-3">🐾</div>
                            <p className="font-bold text-lg">{pet.name}</p>
                            <p className="text-sm opacity-70 mt-2">Scroll to load 3D</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pet Info */}
            <div
                className="text-center mb-4"
                style={{
                    transform: isCenter ? 'scale(1.1)' : 'scale(1)',
                    transition: `transform ${TRANSITION_DURATION}`,
                }}
            >
                <h3
                    className="font-bold text-white text-xl mb-1"
                    style={{
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}
                >
                    {pet.name}
                </h3>
                <div
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                    style={{
                        background: `linear-gradient(135deg, ${config.glow} 0%, ${config.glow}80 100%)`,
                        boxShadow: `0 2px 8px ${config.glow}40`,
                    }}
                >
                    <span className="text-sm">{config.badge}</span>
                    <span className="text-xs font-semibold text-white capitalize">
                        {pet.rarity}
                    </span>
                </div>
            </div>

            {/* Active Pet Indicator */}
            {isActive && (
                <div
                    className="mb-3 px-4 py-1.5 rounded-full"
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

            {/* Action Buttons (only show for center pet) */}
            {showActions && isCenter && pet.is_unlocked && (
                <div className="flex gap-3 w-full max-w-sm">
                    {/* Feed Button */}
                    <button
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            HapticService.success();
                            SoundEffectService.play('success');
                            onFeed();
                        }}
                    >
                        <span className="mr-2">🍖</span>
                        Feed
                    </button>

                    {/* Play Button */}
                    <button
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all duration-200 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            HapticService.success();
                            SoundEffectService.play('success');
                            onPlay();
                        }}
                    >
                        <span className="mr-2">🎮</span>
                        Play
                    </button>
                </div>
            )}

            {/* Unlock Status (for locked pets) */}
            {!pet.is_unlocked && isCenter && (
                <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255,255,255,0.2)',
                    }}
                >
                    <span className="text-xl">🔒</span>
                    <span className="text-white text-sm font-semibold">
                        {pet.unlock_condition.type === 'xp' && `Unlock at ${pet.unlock_condition.value} XP`}
                        {pet.unlock_condition.type === 'streak' && `${pet.unlock_condition.value} day streak`}
                        {pet.unlock_condition.type === 'achievement' && 'Special Achievement'}
                        {pet.unlock_condition.type === 'free' && 'Free Pet'}
                    </span>
                </div>
            )}
        </div>
    );
};

// ========== Main Carousel Component ==========

export const PetCarousel: React.FC<PetCarouselProps> = ({
    pets,
    activePetId,
    onSelectPet,
    onFeedPet,
    onPlayWithPet,
    height = '600px',
    showActions = true,
    className = '',
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [centerIndex, setCenterIndex] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);

    // Find initial center index (active pet or first unlocked)
    useEffect(() => {
        const activeIndex = pets.findIndex(p => p.pet_id === activePetId);
        if (activeIndex !== -1) {
            setCenterIndex(activeIndex);
            scrollToIndex(activeIndex, false); // Instant scroll on mount
        } else {
            const firstUnlocked = pets.findIndex(p => p.is_unlocked);
            const initialIndex = firstUnlocked !== -1 ? firstUnlocked : 0;
            setCenterIndex(initialIndex);
            scrollToIndex(initialIndex, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePetId, pets]);

    // Scroll to specific index
    const scrollToIndex = useCallback((index: number, smooth = true) => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const itemWidth = container.scrollWidth / pets.length;
        const scrollPosition = itemWidth * index;

        container.scrollTo({
            left: scrollPosition,
            behavior: smooth ? 'smooth' : 'auto',
        });
    }, [pets.length]);

    // Handle scroll to update center index
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        const itemWidth = container.scrollWidth / pets.length;
        const scrollLeft = container.scrollLeft;
        const newCenterIndex = Math.round(scrollLeft / itemWidth);

        if (newCenterIndex !== centerIndex && newCenterIndex >= 0 && newCenterIndex < pets.length) {
            setCenterIndex(newCenterIndex);
            HapticService.tap();
        }
    }, [pets.length, centerIndex]);

    // Debounce scroll handler
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const debouncedScroll = () => {
            setIsScrolling(true);
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleScroll();
                setIsScrolling(false);
            }, 150);
        };

        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', debouncedScroll);
            return () => {
                container.removeEventListener('scroll', debouncedScroll);
                clearTimeout(timeoutId);
            };
        }
    }, [handleScroll]);

    // Arrow navigation
    const scrollLeft = () => {
        const newIndex = Math.max(0, centerIndex - 1);
        scrollToIndex(newIndex);
        HapticService.tap();
        SoundEffectService.play('click');
    };

    const scrollRight = () => {
        const newIndex = Math.min(pets.length - 1, centerIndex + 1);
        scrollToIndex(newIndex);
        HapticService.tap();
        SoundEffectService.play('click');
    };

    // Handle pet selection
    const handleSelectPet = (petId: string) => {
        HapticService.tap();
        SoundEffectService.play('tap');
        onSelectPet?.(petId);
    };

    // Handle feed action
    const handleFeed = (petId: string) => {
        onFeedPet?.(petId);
    };

    // Handle play action
    const handlePlay = (petId: string) => {
        onPlayWithPet?.(petId);
    };

    if (pets.length === 0) {
        return (
            <div
                className="flex items-center justify-center"
                style={{
                    height: typeof height === 'number' ? `${height}px` : height,
                }}
            >
                <div className="text-center">
                    <div className="text-6xl mb-4">🎁</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Pets Yet</h3>
                    <p className="text-white/70">Unlock pets by earning XP!</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`pet-carousel relative ${className}`}
            style={{
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        >
            {/* Left Arrow (Desktop) */}
            {centerIndex > 0 && (
                <button
                    className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                    onClick={scrollLeft}
                    aria-label="Previous pet"
                >
                    <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
            )}

            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="flex overflow-x-auto h-full items-center hide-scrollbar"
                style={{
                    scrollSnapType: SCROLL_SNAP_TYPE,
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {pets.map((pet, index) => {
                    const isAdjacent = Math.abs(index - centerIndex) === 1; // Adjacent to center

                    return (
                        <CarouselItem
                            key={pet.pet_id}
                            pet={pet}
                            isCenter={index === centerIndex && !isScrolling}
                            isActive={pet.pet_id === activePetId}
                            isAdjacent={isAdjacent}
                            onSelect={() => handleSelectPet(pet.pet_id)}
                            onFeed={() => handleFeed(pet.pet_id)}
                            onPlay={() => handlePlay(pet.pet_id)}
                            showActions={showActions}
                        />
                    );
                })}
            </div>

            {/* Right Arrow (Desktop) */}
            {centerIndex < pets.length - 1 && (
                <button
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                    onClick={scrollRight}
                    aria-label="Next pet"
                >
                    <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </button>
            )}

            {/* Pagination Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {pets.map((_, index) => (
                    <button
                        key={index}
                        className="transition-all duration-200"
                        style={{
                            width: index === centerIndex ? '24px' : '8px',
                            height: '8px',
                            borderRadius: '999px',
                            background: index === centerIndex
                                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                                : 'rgba(255,255,255,0.3)',
                            boxShadow: index === centerIndex
                                ? '0 2px 8px rgba(139, 92, 246, 0.5)'
                                : 'none',
                        }}
                        onClick={() => {
                            scrollToIndex(index);
                            HapticService.tap();
                        }}
                        aria-label={`Go to pet ${index + 1}`}
                    />
                ))}
            </div>

            {/* Styles */}
            <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }

                .carousel-item {
                    scroll-snap-align: center;
                }
            `}</style>
        </div>
    );
};

export default PetCarousel;
