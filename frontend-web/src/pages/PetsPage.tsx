/**
 * PetsPage.tsx — My Pet Hub
 *
 * Redesigned with playful claymorphism design:
 * - Hero section with 3D pet showcase
 * - Pet collection gallery with clay cards
 * - Progress tracking and stats
 * - Vibrant, engaging colors for educational platform
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { usePets, type Pet } from '@/hooks/usePets';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { rarityConfig } from '@/components/pets/PetCard';
import type { PetViewerInteraction, PetViewerMood } from '@/components/pets/PetViewer3D';

// Lazy-load the heavy 3D viewer
const PetViewer3D = lazy(() =>
    import('@/components/pets/PetViewer3D').then(m => ({ default: m.PetViewer3D }))
);

interface PetCareState {
    happiness: number;
    hunger: number;
    energy: number;
    mood: PetViewerMood;
    last_action: PetViewerInteraction;
}

const SUPPORTED_MODEL_EXTENSIONS = new Set(['.glb', '.gltf']);

function getPathExtension(pathname: string): string {
    const lastDotIndex = pathname.lastIndexOf('.');
    if (lastDotIndex < 0) {
        return '';
    }
    return pathname.slice(lastDotIndex).toLowerCase();
}

function isRenderableModelUrl(modelUrl: string | null | undefined): boolean {
    if (!modelUrl) {
        return false;
    }

    try {
        const parsed = new URL(modelUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return false;
        }

        return SUPPORTED_MODEL_EXTENSIONS.has(getPathExtension(parsed.pathname));
    } catch {
        return false;
    }
}

// ─── Pet Collection Card ────────────────────────────────────────────────────
function PetCollectionCard({
    pet,
    isActive,
    onSelect,
    onFeed,
    onPlay
}: {
    pet: Pet;
    isActive: boolean;
    onSelect: () => void;
    onFeed: () => void;
    onPlay: () => void;
}) {
    const config = rarityConfig[pet.rarity];
    const isLocked = !pet.is_unlocked;

    const colorVariants: Record<string, string> = {
        common: 'clay-card-mint',
        rare: 'clay-card-sky',
        epic: 'clay-card-lavender',
        legendary: 'clay-card-sunshine',
    };

    return (
        <div
            className={`relative h-full min-w-0 cursor-pointer rounded-3xl p-3 transition-all duration-300 sm:p-4 ${isLocked ? 'opacity-60' : ''
                } ${colorVariants[pet.rarity] || 'clay-card-elevated'}`}
            onClick={() => !isLocked && onSelect()}
            style={{
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
            }}
        >
            {/* Active Indicator */}
            {isActive && (
                <div className="absolute -top-2 -right-2 z-10">
                    <div className="clay-badge-green px-3 py-1 text-xs">
                        Active
                    </div>
                </div>
            )}

            {/* Lock Overlay */}
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center z-10 rounded-3xl bg-white/60 backdrop-blur-sm">
                    <div className="text-center">
                        <span className="text-4xl">🔒</span>
                        <p className="text-sm font-bold text-gray-600 mt-2">
                            {pet.unlock_condition.type === 'xp' && `${pet.unlock_condition.value} XP`}
                            {pet.unlock_condition.type === 'streak' && `${pet.unlock_condition.value} Days`}
                        </p>
                    </div>
                </div>
            )}

            {/* Pet Thumbnail/3D Preview */}
            <div className="relative mb-3 h-24 overflow-hidden rounded-2xl bg-white/40 sm:h-32 lg:h-36">
                {pet.thumbnail_url ? (
                    <img
                        src={pet.thumbnail_url}
                        alt={pet.name}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                        {config.badge}
                    </div>
                )}
            </div>

            {/* Pet Info */}
            <div className="min-w-0 text-center">
                <h3 className="truncate text-base font-bold text-gray-800 sm:text-lg">{pet.name}</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-lg">{config.badge}</span>
                    <span className="truncate text-xs font-semibold capitalize text-gray-600 sm:text-sm">{pet.rarity}</span>
                </div>
            </div>

            {/* Action Buttons (only for unlocked pets) */}
            {!isLocked && (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onFeed(); }}
                        className="min-h-[44px] rounded-xl bg-white/60 px-3 py-2 text-xs font-bold transition-all hover:bg-white/80 sm:text-sm"
                    >
                        🍖 Feed
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPlay(); }}
                        className="min-h-[44px] rounded-xl bg-white/60 px-3 py-2 text-xs font-bold transition-all hover:bg-white/80 sm:text-sm"
                    >
                        🎮 Play
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }: { icon: string; value: number | string; label: string; color: string }) {
    return (
        <div className="clay-stat-card">
            <div className="text-3xl mb-2">{icon}</div>
            <div className="clay-stat-number" style={{ background: `linear-gradient(135deg, ${color}, #FF9F9F)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {value}
            </div>
            <div className="clay-stat-label">{label}</div>
        </div>
    );
}

// ─── Progress Bar ───────────────────────────────────────────────────────────
function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-gray-700">{label}</span>
                <span className="font-bold" style={{ color }}>{value}/{max}</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div
                    className="h-full rounded-full transition-all duration-500 clay-shimmer"
                    style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                    }}
                />
            </div>
        </div>
    );
}

// ─── Main PetsPage ──────────────────────────────────────────────────────────
export default function PetsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const userId = user?.id ?? null;
    const { pets, activePet, setActivePet, isLoading } = usePets(userId);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [petCare, setPetCare] = useState<PetCareState>({
        happiness: 50,
        hunger: 45,
        energy: 70,
        mood: 'content',
        last_action: 'idle',
    });
    const [viewerInteraction, setViewerInteraction] = useState<PetViewerInteraction>('idle');
    const [viewerInteractionKey, setViewerInteractionKey] = useState(0);

    // Initialize selected pet
    React.useEffect(() => {
        if (!selectedPet && activePet) {
            setSelectedPet(activePet);
        } else if (!selectedPet && pets.length > 0) {
            const firstUnlocked = pets.find(p => p.is_unlocked);
            setSelectedPet(firstUnlocked || pets[0]);
        }
    }, [activePet, pets, selectedPet]);

    useEffect(() => {
        if (!userId) return;

        let isMounted = true;
        apiClient.get(`/api/v1/gamification/pet/${userId}`)
            .then((pet) => {
                if (!isMounted) return;
                setPetCare({
                    happiness: pet.happiness ?? 50,
                    hunger: pet.hunger ?? 45,
                    energy: pet.energy ?? 70,
                    mood: pet.mood ?? 'content',
                    last_action: pet.last_action ?? 'idle',
                });
            })
            .catch((error) => {
                console.warn('[PetsPage] Pet care state unavailable:', error);
            });

        return () => {
            isMounted = false;
        };
    }, [userId]);

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center overflow-x-hidden clay-bg-playful px-4 pb-28 transition-all duration-300 md:pb-8">
                <div className="text-center">
                    <div className="text-6xl mb-4 clay-float-element">🐾</div>
                    <p className="font-bold text-gray-600">Loading your pets...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !userId) {
        return (
            <div className="flex min-h-screen items-center justify-center overflow-x-hidden clay-bg-playful p-4 pb-28 transition-all duration-300 sm:p-6 md:pb-8">
                <div className="clay-card-elevated max-w-md w-full p-8 text-center">
                    <div className="text-6xl mb-4">🐣</div>
                    <h2 className="clay-section-title mb-4">Sign In to Meet Your Pets!</h2>
                    <p className="text-gray-600 mb-6">
                        Create an account to unlock adorable pet companions that grow with your learning journey!
                    </p>
                    <button className="clay-cta-primary w-full">
                        Get Started
                    </button>
                </div>
            </div>
        );
    }

    const handleActivate = async (petId: string) => {
        const pet = pets.find(p => p.pet_id === petId);
        if (pet) {
            setSelectedPet(pet);
            HapticService.success();
            SoundEffectService.play('tap');
            await setActivePet(petId);
        }
    };

    const handleFeed = async (petId: string) => {
        try {
            HapticService.success();
            SoundEffectService.play('success');
            const result = await apiClient.post('/api/v1/gamification/pet/feed', {
                user_id: userId,
                pet_id: petId,
            });
            setPetCare(prev => ({
                ...prev,
                happiness: result.happiness ?? prev.happiness,
                hunger: result.hunger ?? prev.hunger,
                energy: result.energy ?? prev.energy,
                mood: result.mood ?? 'happy',
                last_action: 'feed',
            }));
            setViewerInteraction('feed');
            setViewerInteractionKey(prev => prev + 1);
            window.setTimeout(() => setViewerInteraction('idle'), 1300);
        } catch (error) {
            console.error('Feed error:', error);
        }
    };

    const handlePlay = async (petId: string) => {
        try {
            HapticService.success();
            SoundEffectService.play('success');
            const result = await apiClient.post('/api/v1/gamification/pet/play', {
                user_id: userId,
                pet_id: petId,
            });
            setPetCare(prev => ({
                ...prev,
                happiness: result.happiness ?? prev.happiness,
                hunger: result.hunger ?? prev.hunger,
                energy: result.energy ?? prev.energy,
                mood: result.mood ?? 'happy',
                last_action: 'play',
            }));
            setViewerInteraction('play');
            setViewerInteractionKey(prev => prev + 1);
            window.setTimeout(() => setViewerInteraction('idle'), 1300);
        } catch (error) {
            console.error('Play error:', error);
        }
    };

    const unlockedCount = pets.filter(p => p.is_unlocked).length;
    const displayPet = selectedPet || activePet || pets[0];
    const canRenderDisplayPet3D = isRenderableModelUrl(displayPet?.model_url);

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-28 transition-all duration-300 md:pb-8">
            {/* Decorative Background Elements */}
            <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
                <div className="clay-shape-circle w-96 h-96 -top-48 -left-48 opacity-40" />
                <div className="clay-shape-circle w-64 h-64 top-1/4 right-0 opacity-30" />
                <div className="clay-shape-circle w-80 h-80 bottom-0 left-1/4 opacity-25" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-7xl min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                {/* Header */}
                <header className="mb-6 text-center sm:mb-8">
                    <h1 className="mb-2 text-3xl font-black leading-tight text-gray-800 sm:text-4xl md:text-5xl" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                        My Pet Collection
                    </h1>
                    <p className="font-semibold text-gray-600">
                        {unlockedCount} of {pets.length} companions unlocked
                    </p>
                </header>

                {/* Stats Row */}
                <div className="mb-6 grid min-w-0 grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-3 sm:gap-4">
                    <StatCard icon="🐾" value={unlockedCount} label="Pets Unlocked" color="#5B8DEF" />
                    <StatCard icon="⚡" value={1250} label="Total XP" color="#FFB347" />
                    <StatCard icon="🔥" value={12} label="Day Streak" color="#FF9F9F" />
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 xl:grid-cols-5 xl:items-start">
                    {/* Left: Pet Collection */}
                    <div className="min-w-0 xl:col-span-3">
                        <div className="clay-card-elevated p-4 sm:p-6">
                            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                                <span className="clay-icon-bubble clay-icon-bubble-mint w-10 h-10 text-lg">🎯</span>
                                Pet Gallery
                            </h2>

                            {isLoading ? (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="h-40 animate-pulse rounded-3xl bg-gray-100 sm:h-48" />
                                    ))}
                                </div>
                            ) : pets.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🎁</div>
                                    <h3 className="font-bold text-xl text-gray-800 mb-2">No Pets Yet!</h3>
                                    <p className="text-gray-600">Complete lessons to unlock your first pet companion.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                                    {pets.map(pet => (
                                        <PetCollectionCard
                                            key={pet.pet_id}
                                            pet={pet}
                                            isActive={pet.pet_id === activePet?.pet_id}
                                            onSelect={() => handleActivate(pet.pet_id)}
                                            onFeed={() => handleFeed(pet.pet_id)}
                                            onPlay={() => handlePlay(pet.pet_id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Active Pet Showcase */}
                    <div className="min-w-0 xl:col-span-2">
                        <div className="clay-pet-showcase xl:sticky xl:top-8">
                            <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                                <span className="clay-icon-bubble clay-icon-bubble-sunshine w-10 h-10 text-lg">⭐</span>
                                Active Pet
                            </h2>

                            {displayPet ? (
                                <>
                                    {/* 3D Pet Viewer */}
                                    <div className="rounded-2xl overflow-hidden mb-4 bg-gradient-to-b from-blue-100/50 to-pink-100/50">
                                        {canRenderDisplayPet3D ? (
                                            <Suspense
                                                fallback={
                                                    <div className="flex h-[clamp(200px,42vw,280px)] items-center justify-center">
                                                        <div className="text-5xl clay-float-element">🐾</div>
                                                    </div>
                                                }
                                            >
                                                <PetViewer3D
                                                    key={`${displayPet.pet_id}:${displayPet.model_url}`}
                                                    pet={displayPet}
                                                    height="clamp(200px, 42vw, 280px)"
                                                    autoRotate={true}
                                                    enableControls={true}
                                                    scale={1.0}
                                                    background="transparent"
                                                    mood={petCare.mood}
                                                    interaction={viewerInteraction}
                                                    interactionKey={viewerInteractionKey}
                                                />
                                            </Suspense>
                                        ) : displayPet.thumbnail_url ? (
                                            <div className="flex h-[clamp(200px,42vw,280px)] items-center justify-center bg-white/30">
                                                <img
                                                    src={displayPet.thumbnail_url}
                                                    alt={displayPet.name}
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-[clamp(200px,42vw,280px)] flex-col items-center justify-center gap-2 px-4 text-center">
                                                <span className="text-7xl">{rarityConfig[displayPet.rarity].badge}</span>
                                                <p className="text-xs font-semibold text-gray-600">
                                                    3D preview disabled: use self-contained .glb/.gltf model_url
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Pet Info */}
                                    <div className="text-center mb-4">
                                        <h3 className="font-black text-2xl text-gray-800">{displayPet.name}</h3>
                                        <div className="clay-badge-blue mt-2 inline-flex">
                                            <span>{rarityConfig[displayPet.rarity].badge}</span>
                                            <span className="capitalize">{displayPet.rarity}</span>
                                        </div>
                                    </div>

                                    {/* Pet Stats */}
                                    <div className="space-y-3 mb-4">
                                        <ProgressBar label="Happiness" value={petCare.happiness} max={100} color="#5B8DEF" />
                                        <ProgressBar label="Energy" value={petCare.energy} max={100} color="#7BC67E" />
                                        <ProgressBar label="Hunger" value={petCare.hunger} max={100} color="#FFB347" />
                                    </div>

                                    <div className="mb-4 text-center">
                                        <span className="inline-flex rounded-full bg-white/80 px-4 py-2 text-sm font-black capitalize text-slate-700 shadow-sm">
                                            Mood: {petCare.mood}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    {displayPet.is_unlocked && (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                                            <button
                                                onClick={() => handleFeed(displayPet.pet_id)}
                                                className="clay-btn clay-btn-yellow clay-btn-md w-full"
                                            >
                                                🍖 Feed
                                            </button>
                                            <button
                                                onClick={() => handlePlay(displayPet.pet_id)}
                                                className="clay-btn clay-btn-blue clay-btn-md w-full"
                                            >
                                                🎮 Play
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="text-6xl mb-4 clay-float-element">🐣</div>
                                    <p className="text-gray-600 font-semibold">Select a pet to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="mt-10 clay-card-elevated p-5 text-center sm:mt-12 sm:p-8">
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Want More Pets?</h2>
                    <p className="text-gray-600 mb-6">Complete lessons and earn XP to unlock rare and legendary companions!</p>
                    <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                        <button
                            className="clay-cta-primary"
                            onClick={() => window.location.href = '/courses'}
                        >
                            Start Learning
                        </button>
                        <button
                            className="clay-cta-secondary"
                            onClick={() => window.location.href = '/learn-ar'}
                        >
                            Try AR Mode
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
