/**
 * useUser — single source of truth for the post-auth user surface.
 *
 * Joins three backend endpoints in parallel:
 *   - `petsApi.getActivePet()`        → which pet (if any) is active
 *   - `coursesApi.getUserStats()`     → XP, level, badges, streak-active-today
 *   - `coursesApi.getStreak()`        → current / longest streak
 *
 * Memoized result. Handles 401 by invoking the existing `useAuth().clearToken`
 * so the app can recover to the auth screen. The userId is resolved lazily
 * via `authApi.me()` on first mount when an auth token is present.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, coursesApi, petsApi } from '../services/api';
import { useAuth } from './useAuth';
import type { Pet } from '../types/pet';
import type { StreakData, UserStats } from '../types/gamification';

export interface UseUserReturn {
  userId: string | null;
  stats: UserStats | null;
  streak: StreakData | null;
  activePet: Pet | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setUserId: (userId: string | null) => void;
}

interface UseUserOptions {
  /** Skip the auto-fetch on mount (e.g. when no auth token). */
  skip?: boolean;
}

export const useUser = (options: UseUserOptions = {}): UseUserReturn => {
  const { skip = false } = options;
  const { clearToken, token } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState<boolean>(!skip);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (uid: string, isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const [activePetRes, statsRes, streakRes] = await Promise.allSettled([
          petsApi.getActivePet(),
          coursesApi.getUserStats(uid),
          coursesApi.getStreak(uid),
        ]);

        if (activePetRes.status === 'fulfilled') {
          setActivePet(activePetRes.value.data);
        } else if (activePetRes.reason?.response?.status === 401) {
          await clearToken();
          return;
        }
        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        } else if (statsRes.reason?.response?.status === 401) {
          await clearToken();
          return;
        }
        if (streakRes.status === 'fulfilled') {
          setStreak(streakRes.value.data);
        }

        setError(null);
      } catch (err) {
        setError('Failed to load user profile');
        console.error('useUser: fetchAll failed', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearToken]
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    await fetchAll(userId, true);
  }, [userId, fetchAll]);

  // Resolve userId lazily from /auth/me when the token becomes available.
  useEffect(() => {
    if (skip || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authApi.me();
        if (!cancelled && res.data?.id) {
          setUserId(res.data.id);
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          await clearToken();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, skip, clearToken]);

  // Re-fetch whenever the userId or auth token changes.
  useEffect(() => {
    if (skip) return;
    if (!userId) {
      setStats(null);
      setStreak(null);
      setActivePet(null);
      setLoading(false);
      return;
    }
    fetchAll(userId, false).catch(() => undefined);
  }, [userId, token, skip, fetchAll]);

  return useMemo(
    () => ({
      userId,
      stats,
      streak,
      activePet,
      loading,
      refreshing,
      error,
      refresh,
      setUserId,
    }),
    [userId, stats, streak, activePet, loading, refreshing, error, refresh]
  );
};