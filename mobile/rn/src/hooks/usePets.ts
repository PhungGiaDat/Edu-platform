/**
 * usePets — RN-compatible pet state.
 * No eventBus, no AR bridge. Pure API consumption.
 *
 * Phase 0 — switched to the typed `Pet` (snake_case fields, no `id`).
 * Actions that don't exist in the new contract (feed/play on the old
 * per-pet routes) are removed; the plan §1.3 endpoints live in `petsApi`
 * and are exposed through new helpers added in Task 0.4 / Phase 3.
 */
import { useCallback, useEffect, useState } from 'react';
import { petService } from '../services/petService';
import type { Pet } from '../types/pet';

export interface UsePetsResult {
  pets: Pet[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getPet: (petId: string) => Promise<Pet | null>;
}

export const usePets = (): UsePetsResult => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (isRefresh: boolean): Promise<Pet[]> => {
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

  return {
    pets,
    loading,
    refreshing,
    error,
    refresh,
    getPet,
  };
};