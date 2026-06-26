/**
 * DailyGoalRing.tsx — Daily Goal Progress Ring Component
 *
 * Mobile-first SVG progress ring showing daily goal completion.
 * Designed for iPhone 14 Pro (393px) — compact layout.
 * Responsive up to laptop (1440px+).
 */

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

interface DailyGoalData {
  current_streak: number;
  longest_streak: number;
  last_activity: string | null;
  streak_active_today: boolean;
  daily_goal_minutes: number;
  minutes_today: number;
}

interface DailyGoalRingProps {
  /** Radius of the SVG circle ring */
  size?: number;
  /** Stroke width of the ring */
  strokeWidth?: number;
  /** Daily goal in minutes (default: 15) */
  goalMinutes?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Show motivational text */
  showMotivation?: boolean;
}

const DAILY_GOAL_DEFAULT = 15;

export const DailyGoalRing: React.FC<DailyGoalRingProps> = ({
  size = 120,
  strokeWidth = 10,
  goalMinutes,
  className = '',
  showLabel = true,
  showMotivation = true,
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<DailyGoalData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const loadStreak = async () => {
      try {
        const result = await apiClient.getStreak(user.id);
        setData({
          current_streak: result.current_streak ?? 0,
          longest_streak: result.longest_streak ?? 0,
          last_activity: result.last_activity ?? null,
          streak_active_today: result.streak_active_today ?? false,
          daily_goal_minutes: result.daily_goal_minutes ?? DAILY_GOAL_DEFAULT,
          minutes_today: result.minutes_today ?? 0,
        });
      } catch {
        // Fallback to gamification endpoint
        try {
          const stats = await apiClient.getUserStats(user.id);
          setData({
            current_streak: stats.streak_days ?? 0,
            longest_streak: stats.longest_streak ?? 0,
            last_activity: stats.last_activity ?? null,
            streak_active_today: stats.streak_active_today ?? false,
            daily_goal_minutes: goalMinutes ?? DAILY_GOAL_DEFAULT,
            minutes_today: stats.minutes_today ?? 0,
          });
        } catch {
          setData({
            current_streak: 0,
            longest_streak: 0,
            last_activity: null,
            streak_active_today: false,
            daily_goal_minutes: goalMinutes ?? DAILY_GOAL_DEFAULT,
            minutes_today: 0,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadStreak();
  }, [user?.id, goalMinutes]);

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <LoadingRing size={size} strokeWidth={strokeWidth} />
        {showLabel && <p className="mt-2 text-xs text-gray-400 animate-pulse">Loading...</p>}
      </div>
    );
  }

  const goal = data?.daily_goal_minutes ?? goalMinutes ?? DAILY_GOAL_DEFAULT;
  const minutes = data?.minutes_today ?? 0;
  const percentage = Math.min(Math.round((minutes / goal) * 100), 100);
  const isComplete = percentage >= 100;
  const remaining = Math.max(goal - minutes, 0);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  const ringColor = isComplete
    ? '#22c55e'
    : percentage >= 60
    ? '#0ea5e9'
    : '#f59e0b';

  const motivation = isComplete
    ? "You're a star today!"
    : percentage >= 60
    ? 'Keep going!'
    : percentage > 0
    ? 'Almost there!'
    : 'Start learning!';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* SVG Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
          aria-label={`Daily goal: ${minutes} of ${goal} minutes (${percentage}%)`}
          role="img"
        >
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl sm:text-3xl" aria-hidden="true">
            {isComplete ? '🎉' : '🎯'}
          </span>
          <span
            className="font-black text-slate-800 leading-none"
            style={{ fontSize: Math.max(size * 0.14, 14) }}
          >
            {percentage}%
          </span>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="mt-2 text-center">
          <p className="text-xs font-bold text-gray-600 sm:text-sm">
            {minutes}/{goal} min
          </p>
          {showMotivation && (
            <p
              className="text-xs mt-0.5"
              style={{ color: ringColor }}
            >
              {remaining > 0 ? `${remaining}m left` : motivation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ========== Compact inline ring (for sidebar stats row) ==========

interface CompactGoalRingProps {
  /** Radius — 24 gives a 48px ring, perfect for stat cards */
  size?: number;
  /** Progress 0–100 */
  percentage: number;
  /** Ring color when complete */
  completeColor?: string;
  /** Ring color when in progress */
  progressColor?: string;
  className?: string;
}

export const CompactGoalRing: React.FC<CompactGoalRingProps> = ({
  size = 24,
  percentage,
  completeColor = '#22c55e',
  progressColor = '#0ea5e9',
  className = '',
}) => {
  const strokeWidth = 3;
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;
  const ringColor = isComplete ? completeColor : progressColor;

  return (
    <div className={className} aria-label={`${percentage}% complete`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
    </div>
  );
};

// ========== Loading skeleton ==========

const LoadingRing: React.FC<{ size: number; strokeWidth: number }> = ({ size, strokeWidth }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth * 2) / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-3 h-3 rounded-full bg-sky-300 animate-ping"
          style={{ opacity: 0.6 }}
        />
      </div>
    </div>
  );
};

export default DailyGoalRing;
