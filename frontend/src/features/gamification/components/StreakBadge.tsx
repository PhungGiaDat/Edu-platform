/**
 * StreakBadge.tsx — Daily Streak Display Component
 *
 * Displays user's current learning streak with fire animation.
 * Inspired by Duolingo's streak counter.
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { CodexPetSprite, type CodexPetAnimationState } from '@/features/pets/components/CodexPetSprite';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity: string;
  streak_active_today: boolean;
}

const StarIcon: React.FC<{ className?: string }> = ({ className = 'text-xs' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

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
        <div className="clay-streak-icon clay-streak-icon--hot" data-animation-state="waiting">
          <CodexPetSprite
            animationState="waiting"
            label="Lexi preparing your streak"
            size={40}
            className="drop-shadow-sm"
          />
        </div>
        <div className="clay-stat-number">...</div>
        <div className="clay-stat-label">Streak</div>
      </div>
    );
  }

  const isHotStreak = streak.current_streak >= 7;
  const hasStreak = streak.current_streak > 0;
  const mascotAnimation: CodexPetAnimationState = isHotStreak ? 'jumping' : hasStreak ? 'idle' : 'waiting';
  const mascotLabel = isHotStreak
    ? 'Lexi celebrating your hot streak'
    : hasStreak
      ? 'Lexi cheering your learning streak'
      : 'Lexi waiting for your next streak';

  return (
    <div className={`clay-stat-card ${className}`}>
      <div
        className={`clay-streak-icon ${isHotStreak ? 'clay-streak-icon--hot' : 'clay-streak-icon--cold'} ${isHotStreak ? 'motion-safe:animate-pulse' : ''}`}
        data-animation-state={mascotAnimation}
      >
        <CodexPetSprite animationState={mascotAnimation} label={mascotLabel} size={40} className="drop-shadow-sm" />
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
        Day Streak
      </div>
      {streak.current_streak >= 7 && (
        <div className="clay-streak-star" aria-hidden="true">
          <StarIcon />
        </div>
      )}
    </div>
  );
};

export default StreakBadge;
