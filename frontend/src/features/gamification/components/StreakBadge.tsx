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

// Inline SVG icons — vibrant claymorphic style, avoids emoji
const FireIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
);

const SnowflakeIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

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
        <div className="clay-streak-icon clay-streak-icon--hot" aria-hidden="true">
          <FireIcon className="h-5 w-5" />
        </div>
        <div className="clay-stat-number">...</div>
        <div className="clay-stat-label">Streak</div>
      </div>
    );
  }

  const isHotStreak = streak.current_streak >= 7;
  const hasStreak = streak.current_streak > 0;

  return (
    <div className={`clay-stat-card ${className}`}>
      <div className={`clay-streak-icon ${isHotStreak ? 'clay-streak-icon--hot' : 'clay-streak-icon--cold'} ${isHotStreak ? 'motion-safe:animate-pulse' : ''}`} aria-hidden="true">
        {hasStreak ? <FireIcon className="h-5 w-5" /> : <SnowflakeIcon className="h-5 w-5" />}
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
