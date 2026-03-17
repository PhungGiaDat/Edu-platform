/**
 * PetsPage.tsx — My Pet Hub
 *
 * Two-tab layout:
 *   Tab 1 "My Characters" — grid of all pets; tap to activate
 *   Tab 2 "Pet Care"      — large 3D viewer of active pet + stat bars
 *
 * Design: Claymorphism (clay-card, clay-btn-* classes from index.css)
 */

import React, { Suspense, lazy } from 'react';
import { usePets, type Pet } from '@/hooks/usePets';
import { getApiBase } from '@/config';

const API_BASE = getApiBase();
const USER_ID = 'demo-user';

// Lazy-load the heavy 3D viewer
const PetViewer3D = lazy(() =>
    import('@/components/pets/PetViewer3D').then(m => ({ default: m.PetViewer3D }))
);

// ─── Rarity badge helper ────────────────────────────────────────────────────
const RARITY_COLORS: Record<Pet['rarity'], { bg: string; text: string; label: string }> = {
    common:    { bg: '#e2e8f5', text: '#4a5568', label: 'Common' },
    rare:      { bg: '#bfdbfe', text: '#1d4ed8', label: 'Rare' },
    epic:      { bg: '#e9d5ff', text: '#7c3aed', label: 'Epic' },
    legendary: { bg: '#fde68a', text: '#92400e', label: 'Legendary' },
};

// ─── Lock overlay label ─────────────────────────────────────────────────────
function UnlockLabel({ pet }: { pet: Pet }) {
    const { type, value } = pet.unlock_condition;
    if (type === 'free') return <span>Free</span>;
    if (type === 'xp') return <span>{value} XP</span>;
    if (type === 'streak') return <span>{value}-day streak</span>;
    return <span>Achievement</span>;
}

// ─── Individual pet card ────────────────────────────────────────────────────
function PetCard({
    pet,
    isActive,
    onActivate,
}: {
    pet: Pet;
    isActive: boolean;
    onActivate: (petId: string) => void;
}) {
    const rarity = RARITY_COLORS[pet.rarity];

    return (
        <div
            className="clay-card relative cursor-pointer transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
                border: isActive
                    ? '3px solid var(--color-primary)'
                    : '3px solid var(--color-border)',
                boxShadow: isActive
                    ? '0 0 0 4px var(--color-primary-light), 0 8px 24px rgba(91,141,239,0.25)'
                    : undefined,
            }}
            onClick={() => pet.is_unlocked && onActivate(pet.pet_id)}
        >
            {/* Active badge */}
            {isActive && (
                <div
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '2px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        zIndex: 2,
                    }}
                >
                    Active
                </div>
            )}

            {/* 3D viewer or thumbnail */}
            <div style={{ height: 140, borderRadius: 14, overflow: 'hidden', position: 'relative', background: 'var(--color-surface-soft)' }}>
                {pet.is_unlocked ? (
                    pet.model_url ? (
                        <Suspense
                            fallback={
                                pet.thumbnail_url
                                    ? <img src={pet.thumbnail_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🐾</div>
                            }
                        >
                            <PetViewer3D
                                modelUrl={pet.model_url}
                                thumbnailUrl={pet.thumbnail_url || undefined}
                                petName={pet.name}
                                autoRotate={false}
                                enableControls={false}
                            />
                        </Suspense>
                    ) : (
                        pet.thumbnail_url
                            ? <img src={pet.thumbnail_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🐾</div>
                    )
                ) : (
                    // Lock overlay
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.55)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            borderRadius: 14,
                        }}
                    >
                        {pet.thumbnail_url && (
                            <img
                                src={pet.thumbnail_url}
                                alt={pet.name}
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(80%) blur(2px)', borderRadius: 14 }}
                            />
                        )}
                        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: 28 }}>🔒</div>
                            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginTop: 4, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                                <UnlockLabel pet={pet} />
                            </div>
                            {pet.can_unlock && (
                                <div style={{
                                    marginTop: 6, background: 'var(--color-accent)', color: '#fff',
                                    borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                                }}>
                                    Ready to unlock!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Pet info */}
            <div style={{ padding: '10px 4px 4px' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
                    {pet.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                        background: rarity.bg, color: rarity.text,
                        borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                        {rarity.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-soft)' }}>
                        {pet.category}
                    </span>
                </div>
            </div>
        </div>
    );
}

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

// ─── Tab 1: My Characters ───────────────────────────────────────────────────
function MyCharactersTab({ pets, activePet, onActivate }: {
    pets: Pet[];
    activePet: Pet | null;
    onActivate: (petId: string) => void;
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

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 16,
            padding: '16px 0',
        }}>
            {pets.map(pet => (
                <PetCard
                    key={pet.pet_id}
                    pet={pet}
                    isActive={activePet?.pet_id === pet.pet_id}
                    onActivate={onActivate}
                />
            ))}
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
                            modelUrl={activePet.model_url}
                            thumbnailUrl={activePet.thumbnail_url || undefined}
                            petName={activePet.name}
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
    const [activeTab, setActiveTab] = React.useState<'characters' | 'care'>('characters');
    const { pets, activePet, setActivePet, isLoading } = usePets(USER_ID);

    const handleActivate = async (petId: string) => {
        await setActivePet(petId);
    };

    const handleFeed = async () => {
        try {
            await fetch(`${API_BASE}/api/v1/gamification/pet/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: USER_ID }),
            });
        } catch {
            // optimistic — ignore error
        }
    };

    const handlePlay = async () => {
        try {
            await fetch(`${API_BASE}/api/v1/gamification/pet/play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: USER_ID }),
            });
        } catch {
            // optimistic — ignore error
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
            <div style={{ padding: '24px 20px 0' }}>
                <h1 style={{
                    fontFamily: "'Baloo 2', 'Nunito Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: 28,
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
            <div style={{ padding: '16px 20px 0', display: 'flex', gap: 8 }}>
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
            <div style={{ padding: '0 20px 100px' }}>
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
                    />
                ) : (
                    <PetCareTab
                        activePet={activePet}
                        onFeed={handleFeed}
                        onPlay={handlePlay}
                    />
                )}
            </div>
        </div>
    );
}
