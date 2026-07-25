/**
 * usePets — RN-compatible pet state.
 * No eventBus, no AR bridge. Pure API consumption.
 */
import { useCallback, useEffect, useState } from 'react';
import { petService } from '../services/petService';
import type {
  FeedPetRequest,
  Pet,
  PetSummary,
  PlayWithPetRequest,
} from '../types/pet';

export interface UsePetsResult {
  pets: PetSummary[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getPet: (petId: string) => Promise<Pet | null>;
  feedPet: (petId: string, body: FeedPetRequest) => Promise<Pet | null>;
  playWithPet: (petId: string, body: PlayWithPetRequest) => Promise<Pet | null>;
}

export const usePets = (): UsePetsResult => {
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (isRefresh: boolean): Promise<PetSummary[]> => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        setError(null);
        const response = await petService.listPets();
        setPets(response.data);
        return response.data;
      } catch (err) {
        setError('Failed to load pets');
        console.error('usePets: listPets failed', err);
        return [];
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    await fetchList(true);
  }, [fetchList]);

  useEffect(() => {
    fetchList(false).catch(() => undefined);
  }, [fetchList]);

  const getPet = useCallback(async (petId: string): Promise<Pet | null> => {
    try {
      const response = await petService.getPet(petId);
      return response.data;
    } catch (err) {
      console.error('usePets: getPet failed', err);
      return null;
    }
  }, []);

  const feedPet = useCallback(
    async (petId: string, body: FeedPetRequest): Promise<Pet | null> => {
      try {
        const response = await petService.feedPet(petId, body);
        return response.data;
      } catch (err) {
        console.error('usePets: feedPet failed', err);
        return null;
      }
    },
    []
  );

  const playWithPet = useCallback(
    async (petId: string, body: PlayWithPetRequest): Promise<Pet | null> => {
      try {
        const response = await petService.playWithPet(petId, body);
        return response.data;
      } catch (err) {
        console.error('usePets: playWithPet failed', err);
        return null;
      }
    },
    []
  );

  return {
    pets,
    loading,
    refreshing,
    error,
    refresh,
    getPet,
    feedPet,
    playWithPet,
  };
};
