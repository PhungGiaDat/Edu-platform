/**
 * usePets.ts
 * 
 * React hook for Pet companion system:
 * - Fetch all available pets with unlock status
 * - Unlock pets via XP, streak, or achievement
 * - Set/clear active pet
 * - Pet preferences and AR integration
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import { eventBus } from '@/runtime/EventBus';

// ========== TypeScript Interfaces ==========

export interface UnlockCondition {
    type: 'free' | 'xp' | 'streak' | 'achievement' | 'purchase';
    value: number;
}

export interface Pet {
    pet_id: string;
    name: string;
    name_vi: string;
    model_url: string;
    texture_url: string | null;
    thumbnail_url: string | null;
    category: string;
    pack_source: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    color: string;
    animations: string[];
    unlock_condition: UnlockCondition;
    is_unlocked: boolean;
    is_active: boolean;
    can_unlock: boolean;
}

export interface PetStats {
    total: number;
    unlocked: number;
    common: number;
    rare: number;
    epic: number;
    legendary: number;
}

export interface PetListResponse {
    pets: Pet[];
    stats: PetStats;
}

export interface UnlockPetResponse {
    success: boolean;
    message: string;
    pet?: Pet;
}

export interface SetActivePetResponse {
    success: boolean;
    message: string;
    active_pet?: Pet;
}

// ========== Event Types ==========

export type PetEventType =
    | 'PET_UNLOCKED'
    | 'PET_ACTIVATED'
    | 'PET_DEACTIVATED'
    | 'PET_LIST_UPDATED';

// ========== Hook ==========

export function usePets(userId: string | null) {
    const [pets, setPets] = useState<Pet[]>([]);
    const [activePet, setActivePetState] = useState<Pet | null>(null);
    const [stats, setStats] = useState<PetStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentlyUnlocked, setRecentlyUnlocked] = useState<Pet | null>(null);

    // Fetch all pets with user's unlock status
    const fetchPets = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            const data: PetListResponse = await apiClient.get('/api/v1/pets');
            console.log('[usePets] API Response Data:', data);
            setPets(data.pets);
            setStats(data.stats);

            // Find and set active pet
            const active = data.pets.find(p => p.is_active);
            console.log('[usePets] Setting active pet to:', active);
            setActivePetState(active || null);

            eventBus.emit('PET_LIST_UPDATED' as any, { pets: data.pets, stats: data.stats });
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            console.error('[usePets] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch current active pet
    const fetchActivePet = useCallback(async (): Promise<Pet | null> => {
        if (!userId) return null;

        try {
            const pet: Pet = await apiClient.get('/api/v1/pets/active/current');
            setActivePetState(pet);
            return pet;
        } catch (err) {
            // 404 means user has no active pet yet
            if (err instanceof Error && err.message === 'Not found') {
                setActivePetState(null);
                return null;
            }
            console.error('[usePets] Fetch active pet error:', err);
            return null;
        }
    }, [userId]);

    // Unlock a pet
    const unlockPet = useCallback(async (petId: string): Promise<UnlockPetResponse> => {
        if (!userId) {
            return { success: false, message: 'User not authenticated' };
        }

        try {
            const result: UnlockPetResponse = await apiClient.post(`/api/v1/pets/${petId}/unlock`, {});

            if (result.success && result.pet) {
                // Update local state
                setPets(prev => prev.map(p =>
                    p.pet_id === petId ? { ...p, is_unlocked: true, can_unlock: false } : p
                ));

                setRecentlyUnlocked(result.pet);
                setTimeout(() => setRecentlyUnlocked(null), 3000);

                // Emit event for UI celebrations
                eventBus.emit('PET_UNLOCKED' as any, { pet: result.pet });

                // Trigger AR celebration animation if active
                eventBus.emit('AR_COMMAND' as any, {
                    type: 'TRIGGER_ANIMATION',
                    payload: { clip: 'celebrate', loop: false }
                });
            }

            return result;
        } catch (err) {
            console.error('[usePets] Unlock pet error:', err);
            return { success: false, message: (err as Error).message };
        }
    }, [userId]);

    // Set active pet
    const setActivePet = useCallback(async (petId: string): Promise<SetActivePetResponse> => {
        if (!userId) {
            return { success: false, message: 'User not authenticated' };
        }

        try {
            await apiClient.put('/api/v1/pets/active', { pet_id: petId });

            // Update local state
            setPets(prev => prev.map(p => ({
                ...p,
                is_active: p.pet_id === petId
            })));

            const newActivePet = pets.find(p => p.pet_id === petId) || null;
            setActivePetState(newActivePet);

            // Emit events
            eventBus.emit('PET_ACTIVATED' as any, { pet: newActivePet });

            // Load pet model in AR scene
            if (newActivePet) {
                eventBus.emit('AR_COMMAND' as any, {
                    type: 'LOAD_PET_MODEL',
                    payload: {
                        modelUrl: newActivePet.model_url,
                        petId: newActivePet.pet_id,
                        animations: newActivePet.animations
                    }
                });
            }

            return { success: true, message: 'Pet activated', active_pet: newActivePet || undefined };
        } catch (err) {
            console.error('[usePets] Set active pet error:', err);
            return { success: false, message: (err as Error).message };
        }
    }, [userId, pets]);

    // Clear active pet
    const clearActivePet = useCallback(async (): Promise<boolean> => {
        if (!userId) return false;

        try {
            await apiClient.delete('/api/v1/pets/active');

            // Update local state
            setPets(prev => prev.map(p => ({ ...p, is_active: false })));
            setActivePetState(null);

            // Emit events
            eventBus.emit('PET_DEACTIVATED' as any, {});

            // Remove pet from AR scene
            eventBus.emit('AR_COMMAND' as any, {
                type: 'REMOVE_PET_MODEL',
                payload: {}
            });

            return true;
        } catch (err) {
            console.error('[usePets] Clear active pet error:', err);
            return false;
        }
    }, [userId]);

    // Get pet by ID
    const getPetById = useCallback((petId: string): Pet | undefined => {
        return pets.find(p => p.pet_id === petId);
    }, [pets]);

    // Filter pets by category
    const getPetsByCategory = useCallback((category: string): Pet[] => {
        return pets.filter(p => p.category === category);
    }, [pets]);

    // Filter pets by rarity
    const getPetsByRarity = useCallback((rarity: Pet['rarity']): Pet[] => {
        return pets.filter(p => p.rarity === rarity);
    }, [pets]);

    // Get unlocked pets only
    const getUnlockedPets = useCallback((): Pet[] => {
        return pets.filter(p => p.is_unlocked);
    }, [pets]);

    // Get locked pets that can be unlocked
    const getUnlockablePets = useCallback((): Pet[] => {
        return pets.filter(p => !p.is_unlocked && p.can_unlock);
    }, [pets]);

    // Calculate unlock progress for a specific pet
    const getUnlockProgress = useCallback((pet: Pet, userXP: number, userStreak: number): number => {
        if (pet.is_unlocked) return 100;
        if (pet.unlock_condition.type === 'free') return 100;

        const { type, value } = pet.unlock_condition;

        switch (type) {
            case 'xp':
                return Math.min(100, Math.round((userXP / value) * 100));
            case 'streak':
                return Math.min(100, Math.round((userStreak / value) * 100));
            case 'achievement':
                // Achievement checking would need additional data
                return pet.can_unlock ? 100 : 0;
            default:
                return 0;
        }
    }, []);

    // Auto-fetch on mount when userId is available
    useEffect(() => {
        if (userId) {
            fetchPets();
        }
    }, [userId, fetchPets]);

    // Listen for gamification events that might unlock pets
    useEffect(() => {
        const handleLevelUp = () => {
            // Refresh pets list to check for newly unlockable pets
            if (userId) fetchPets();
        };

        const handleStreakUpdate = () => {
            // Refresh pets list for streak-based unlocks
            if (userId) fetchPets();
        };

        eventBus.on('LEVEL_UP', handleLevelUp);
        eventBus.on('STREAK_UPDATED', handleStreakUpdate);

        return () => {
            eventBus.off('LEVEL_UP', handleLevelUp);
            eventBus.off('STREAK_UPDATED', handleStreakUpdate);
        };
    }, [userId, fetchPets]);

    return {
        // State
        pets,
        activePet,
        stats,
        isLoading,
        error,
        recentlyUnlocked,

        // Actions
        fetchPets,
        fetchActivePet,
        unlockPet,
        setActivePet,
        clearActivePet,

        // Helpers
        getPetById,
        getPetsByCategory,
        getPetsByRarity,
        getUnlockedPets,
        getUnlockablePets,
        getUnlockProgress
    };
}

export default usePets;
