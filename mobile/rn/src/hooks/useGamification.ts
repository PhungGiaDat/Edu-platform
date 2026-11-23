/**
 * useGamification — XP, level, badges.
 * RN-compatible; no AR coupling.
 *
 * Phase 0 — switched to the typed `UserStats` returned by
 * `/gamification/user/{user_id}`. The legacy per-action XP endpoints
 * (`/gamification/xp`) still work, but the consumer should call
 * `addXp({action, metadata})` against `coursesApi.addXp` instead.
 *
 * C26 UPDATE: Now supports idempotent XP via `addXpEvent`.
 */
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import type {
  Badge,
  UserStats,
  AddXpRequest,
  AddXpResponse,
  AddXpEventRequest,
  AddXpEventResponse,
} from '../types/gamification';
import { toAddXpEventWireRequest } from '../types/gamification';

export interface UseGamificationResult {
  profile: UserStats | null;
  badges: Badge[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  awardXp: (body: AddXpRequest) => Promise<AddXpResponse | null>;
  /**
   * Idempotent XP award for C26 gamification.
   * eventId must be stable per semantic occurrence.
   */
  addXpEvent: (body: AddXpEventRequest) => Promise<AddXpEventResponse | null>;
}

export const useGamification = (userId?: string): UseGamificationResult => {
  const [profile, setProfile] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setError('Missing userId');
      setLoading(false);
      return;
    }
    try {
      const response = await api.get<UserStats>(`/gamification/user/${userId}`);
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load gamification profile');
      console.error('useGamification: getUserStats failed', err);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchProfile();
    setLoading(false);
  }, [fetchProfile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const awardXp = useCallback(
    async (body: AddXpRequest): Promise<AddXpResponse | null> => {
      try {
        const response = await api.post<AddXpResponse>('/gamification/add-xp', body);
        await fetchProfile();
        return response.data;
      } catch (err) {
        console.error('useGamification: addXp failed', err);
        return null;
      }
    },
    [fetchProfile]
  );

  /**
   * Idempotent XP award for C26 gamification.
   * Uses POST /gamification/xp-event with stable eventId.
   *
   * IMPORTANT: eventId must be:
   * - Generated ONCE at semantic event creation boundary
   * - Reused across retries (same occurrence = same eventId)
   * - Stable: Never regenerated for the same occurrence
   */
  const addXpEvent = useCallback(
    async (body: AddXpEventRequest): Promise<AddXpEventResponse | null> => {
      try {
        const response = await api.post<AddXpEventResponse>(
          '/gamification/xp-event',
          toAddXpEventWireRequest(body)
        );
        // On successful response, refresh profile to sync progression
        if (response.data.success && !response.data.idempotent_replay) {
          await fetchProfile();
        }
        return response.data;
      } catch (err) {
        console.error('useGamification: addXpEvent failed', err);
        return null;
      }
    },
    [fetchProfile]
  );

  return {
    profile,
    badges,
    loading,
    error,
    refresh,
    awardXp,
    addXpEvent,
  };
};
