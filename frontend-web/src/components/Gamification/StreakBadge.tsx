/**
 * StreakBadge.tsx — Daily Streak Display Component
 * 
 * Displays user's current learning streak with fire animation.
 * Inspired by Duolingo's streak counter.
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity: string;
  streak_active_today: boolean;
}

export const StreakBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>({
    current_streak: 0,
    longest_streak: 0,
    last_activity: '',
    streak_active_today: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadStreak = async () => {
      try {
        const data = await apiClient.get(`/api/v1/gamification/streak/${user.id}`);
        setStreak({
          current_streak: data.current_streak ?? 0,
          longest_streak: data.longest_streak ?? 0,
          last_activity: data.last_activity ?? '',
          streak_active_today: data.streak_active_today ?? false,
        });
      } catch (error) {
        console.warn('[StreakBadge] Failed to load streak:', error);
        // Try to get from summary endpoint as fallback
        try {
          const summary = await apiClient.get(`/api/v1/reports/child/${user.id}/summary`);
          setStreak({
            current_streak: summary.streak ?? 0,
            longest_streak: summary.longest_streak ?? 0,
            last_activity: summary.last_activity ?? '',
            streak_active_today: summary.streak_active_today ?? false,
          });
        } catch {
          setStreak(prev => ({ ...prev, current_streak: 0 }));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStreak();
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className={`clay-stat-card ${className}`}>
        <div className="text-xl animate-pulse">🔥</div>
        <div className="clay-stat-number">...</div>
        <div className="clay-stat-label">Streak</div>
      </div>
    );
  }

  const isHotStreak = streak.current_streak >= 7;

  return (
    <div className={`clay-stat-card ${className}`}>
      <div className={`text-xl ${isHotStreak ? 'animate-pulse' : ''}`}>
        {streak.current_streak > 0 ? '🔥' : '❄️'}
      </div>
      <div 
        className="clay-stat-number"
        style={{
          background: isHotStreak 
            ? 'linear-gradient(135deg, #f97316, #ef4444, #f97316)' 
            : 'linear-gradient(135deg, #6EB9FF, #B4E197)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {streak.current_streak}
      </div>
      <div className="clay-stat-label">
        {streak.current_streak === 1 ? 'Day Streak' : 'Day Streak'}
      </div>
      {streak.current_streak >= 7 && (
        <div className="absolute -top-1 -right-1 text-xs">
          ⭐
        </div>
      )}
    </div>
  );
};

export default StreakBadge;
