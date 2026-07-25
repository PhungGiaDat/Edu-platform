/**
 * useGamification — XP, level, badges.
 * RN-compatible; no AR coupling.
 */
import { useCallback, useEffect, useState } from 'react';
import { gamificationService } from '../services/gamificationService';
import type {
  AwardXpRequest,
  AwardXpResponse,
  Badge,
  GamificationProfile,
} from '../types/gamification';

export interface UseGamificationResult {
  profile: GamificationProfile | null;
  badges: Badge[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  awardXp: (body: AwardXpRequest) => Promise<AwardXpResponse | null>;
}

export const useGamification = (): UseGamificationResult => {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await gamificationService.getProfile();
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load gamification profile');
      console.error('useGamification: getProfile failed', err);
    }
  }, []);

  const fetchBadges = useCallback(async () => {
    try {
      const response = await gamificationService.listBadges();
      setBadges(response.data);
    } catch (err) {
      console.error('useGamification: listBadges failed', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchProfile();
    await fetchBadges();
    setLoading(false);
  }, [fetchProfile, fetchBadges]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const awardXp = useCallback(
    async (body: AwardXpRequest): Promise<AwardXpResponse | null> => {
      try {
        const response = await gamificationService.awardXp(body);
        // Refresh profile after a successful award so local state stays in sync.
        await fetchProfile();
        return response.data;
      } catch (err) {
        console.error('useGamification: awardXp failed', err);
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
  };
};
