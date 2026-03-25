/**
 * PetsPage.tsx — My Pet Hub
 *
 * Two-tab layout:
 *   Tab 1 "My Characters" — filmstrip carousel with center-focused pet
 *   Tab 2 "Pet Care"      — large 3D viewer of active pet + stat bars
 *
 * Design: Filmstrip carousel with 3D viewer integration
 * - Center pet is enlarged and interactive
 * - Left/Right arrows (desktop) + swipe gestures (mobile)
 * - Feed/Play actions integrated into carousel
 */

import React, { Suspense, lazy } from 'react';
import { usePets, type Pet } from '@/hooks/usePets';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { PetDropdownViewer } from '@/components/pets/PetDropdownViewer';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';

// Lazy-load the heavy 3D viewer
const PetViewer3D = lazy(() =>
    import('@/components/pets/PetViewer3D').then(m => ({ default: m.PetViewer3D }))
);

// ─── Stat bar ───────────────────────────────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{label}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color }}>{value}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'var(--color-border)' }}>
                <div
                    style={{
                        height: '100%',
                        borderRadius: 999,
                        width: `${value}%`,
                        background: color,
                        transition: 'width 0.6s ease',
                    }}
                />
            </div>
        </div>
    );
}

// ─── Tab 1: My Characters (Filmstrip Carousel) ─────────────────────────────
function MyCharactersTab({ 
    pets, 
    activePet, 
    onActivate,
    onFeed,
    onPlay,
}: {
    pets: Pet[];
    activePet: Pet | null;
    onActivate: (petId: string) => void;
    onFeed: (petId: string) => void;
    onPlay: (petId: string) => void;
}) {
    if (pets.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-soft)' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🐾</div>
                <p style={{ fontWeight: 700, fontSize: 18 }}>No pets yet!</p>
                <p style={{ fontSize: 14 }}>Complete lessons to unlock your first pet companion.</p>
            </div>
        );
    }

    // Show only unlocked pets in carousel, or all pets if none unlocked
    const displayPets = pets.filter(p => p.is_unlocked);
    const petsToShow = displayPets.length > 0 ? displayPets : pets;

    return (
        <div style={{ padding: '16px 0' }}>
            <PetDropdownViewer
                pets={petsToShow}
                activePetId={activePet?.pet_id}
                onSelectPet={onActivate}
                onFeedPet={onFeed}
                onPlayWithPet={onPlay}
                showActions={true}
            />
        </div>
    );
}

// ─── Tab 2: Pet Care ────────────────────────────────────────────────────────
function PetCareTab({ activePet, onFeed, onPlay }: {
    activePet: Pet | null;
    onFeed: () => void;
    onPlay: () => void;
}) {
    if (!activePet) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-soft)' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🐣</div>
                <p style={{ fontWeight: 700, fontSize: 18 }}>No active pet</p>
                <p style={{ fontSize: 14 }}>Go to "My Characters" and tap a pet to make it your companion!</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '16px 0' }}>
            {/* Large 3D viewer */}
            <div
                className="clay-card"
                style={{ height: 280, marginBottom: 20, overflow: 'hidden', position: 'relative' }}
            >
                {activePet.model_url ? (
                    <Suspense
                        fallback={
                            activePet.thumbnail_url
                                ? <img src={activePet.thumbnail_url} alt={activePet.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
                                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 80 }}>🐾</div>
                        }
                    >
                        <PetViewer3D
                            pet={activePet}
                            autoRotate={true}
                            enableControls={true}
                        />
                    </Suspense>
                ) : activePet.thumbnail_url ? (
                    <img src={activePet.thumbnail_url} alt={activePet.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 80 }}>🐾</div>
                )}
                <div style={{
                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: '4px 16px',
                    fontWeight: 800, fontSize: 15, color: 'var(--color-text)',
                    backdropFilter: 'blur(4px)',
                }}>
                    {activePet.name} · {activePet.name_vi}
                </div>
            </div>

            {/* Stat bars */}
            <div className="clay-card" style={{ marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-text)', marginBottom: 12 }}>
                    Pet Wellbeing
                </h3>
                <StatBar label="Happiness" value={80} color="var(--color-accent)" />
                <StatBar label="Energy" value={65} color="var(--color-secondary)" />
                <StatBar label="Hunger" value={50} color="var(--color-accent-pink)" />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    className="clay-btn clay-btn-accent"
                    style={{ flex: 1, fontSize: 15 }}
                    onClick={onFeed}
                >
                    Feed
                </button>
                <button
                    className="clay-btn clay-btn-secondary"
                    style={{ flex: 1, fontSize: 15 }}
                    onClick={onPlay}
                >
                    Play
                </button>
            </div>
        </div>
    );
}

// ─── Main PetsPage ──────────────────────────────────────────────────────────
export default function PetsPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = React.useState<'characters' | 'care'>('characters');
    const userId = user?.id ?? null;
    const { pets, activePet, setActivePet, isLoading } = usePets(userId);

    if (authLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--color-text-soft)' }}>Loading...</p>
            </div>
        );
    }

    if (!isAuthenticated || !userId) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div className="clay-card" style={{ maxWidth: 420, textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 8px' }}>Sign in to view pets</h2>
                    <p style={{ margin: 0, color: 'var(--color-text-soft)' }}>
                        Guest mode can explore AR, but pets are available only for signed-in users.
                    </p>
                </div>
            </div>
        );
    }

    const handleActivate = async (petId: string) => {
        HapticService.success();
        SoundEffectService.play('tap');
        await setActivePet(petId);
    };

    const handleFeed = async (petId: string) => {
        try {
            HapticService.success();
            SoundEffectService.play('success');
            await apiClient.post('/api/v1/gamification/pet/feed', { 
                user_id: userId,
                pet_id: petId,
            });
            // TODO: Show success toast
        } catch (error) {
            console.error('Feed error:', error);
            // TODO: Show error toast
        }
    };

    const handlePlay = async (petId: string) => {
        try {
            HapticService.success();
            SoundEffectService.play('success');
            await apiClient.post('/api/v1/gamification/pet/play', { 
                user_id: userId,
                pet_id: petId,
            });
            // TODO: Show success toast
        } catch (error) {
            console.error('Play error:', error);
            // TODO: Show error toast
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--color-bg)',
                fontFamily: "'Nunito Sans', 'Quicksand', sans-serif",
            }}
        >
            {/* Page header */}
            <div style={{ padding: 'clamp(16px, 4vw, 24px) clamp(12px, 4vw, 20px) 0' }}>
                <h1 style={{
                    fontFamily: "'Baloo 2', 'Nunito Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 'clamp(20px, 5vw, 28px)',
                    color: 'var(--color-text)',
                    margin: '0 0 4px',
                }}>
                    My Pets
                </h1>
                <p style={{ color: 'var(--color-text-soft)', fontSize: 14, margin: 0 }}>
                    {pets.filter(p => p.is_unlocked).length} / {pets.length} companions unlocked
                </p>
            </div>

            {/* Tab switcher */}
            <div style={{ padding: 'clamp(12px, 3vw, 16px) clamp(12px, 4vw, 20px) 0', display: 'flex', gap: 'clamp(4px, 2vw, 8px)' }}>
                {(['characters', 'care'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: 14,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: activeTab === tab ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: activeTab === tab ? '#fff' : 'var(--color-text-soft)',
                            boxShadow: activeTab === tab
                                ? '0 4px 12px rgba(91,141,239,0.35)'
                                : '0 2px 6px rgba(0,0,0,0.08)',
                        }}
                    >
                        {tab === 'characters' ? 'My Characters' : 'Pet Care'}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '0 clamp(12px, 4vw, 20px) clamp(60px, 15vw, 100px)' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-soft)' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🐾</div>
                        <p style={{ fontWeight: 700 }}>Loading your pets...</p>
                    </div>
                ) : activeTab === 'characters' ? (
                    <MyCharactersTab
                        pets={pets}
                        activePet={activePet}
                        onActivate={handleActivate}
                        onFeed={handleFeed}
                        onPlay={handlePlay}
                    />
                ) : (
                    <PetCareTab
                        activePet={activePet}
                        onFeed={() => activePet && handleFeed(activePet.pet_id)}
                        onPlay={() => activePet && handlePlay(activePet.pet_id)}
                    />
                )}
            </div>
        </div>
    );
}
