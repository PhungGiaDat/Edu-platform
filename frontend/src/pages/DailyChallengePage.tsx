// src/pages/DailyChallengePage.tsx
// Standalone Daily Challenge page - route: /daily-challenge
// Duolingo-inspired design with streak counter, progress ring, XP animations

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, type ProfileResponse } from '../services/apiClient';
import '../styles/claymorphic-utilities.css';

// ─── Design Tokens ────────────────────────────────────────────────
const DUO = {
  green: '#58CC02',
  greenDark: '#46A302',
  yellow: '#FFC800',
  orange: '#FF9600',
  blue: '#1CB0F6',
  red: '#FF4B4B',
  purple: '#CE82FF',
  text: '#3C3C3C',
  textLight: '#777777',
  headerBg: 'linear-gradient(135deg, #58CC02 0%, #46A302 100%)',
} as const;

// ─── Progress Ring Component ──────────────────────────────────────
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  isComplete?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  isComplete = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="duo-progress-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="duo-progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={`duo-progress-ring-fill ${isComplete ? 'duo-progress-ring-fill--complete' : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="duo-progress-ring-center">
        <div className="duo-progress-ring-percent">{progress}%</div>
        <div className="duo-progress-ring-label">
          {isComplete ? 'Done!' : 'Progress'}
        </div>
      </div>
    </div>
  );
};

// ─── Animated XP Counter ──────────────────────────────────────────
interface XPCounterProps {
  xp: number;
  prefix?: string;
}

const XPCounter: React.FC<XPCounterProps> = ({ xp, prefix = '+' }) => {
  const [displayXp, setDisplayXp] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevXp = useRef(xp);

  useEffect(() => {
    if (xp !== prevXp.current) {
      setIsAnimating(true);
      const start = prevXp.current;
      const end = xp;
      const duration = 600;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayXp(Math.round(start + (end - start) * eased));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
      prevXp.current = xp;
    }
  }, [xp]);

  return (
    <div className={`duo-xp-badge ${isAnimating ? 'duo-xp-animated' : ''}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      <span>
        <span className="duo-xp-plus">{prefix}</span>
        {displayXp} XP
      </span>
    </div>
  );
};

// ─── Streak Badge ─────────────────────────────────────────────────
interface StreakBadgeProps {
  streak: number;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => (
  <div className="duo-streak-badge">
    <svg className="duo-streak-fire" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.18 2.09-6.17 4.5-8.5l.5-.5.5.5c2.41 2.33 4.5 5.32 4.5 8.5 0 1.5-.5 2.5-1.5 2.5S8 17 8 17s0 2 2 2c1 0 2-.5 2-1.5 0 1 0 1.5 1 1.5h.5c.55 0 1 .45 1 1s-.45 1-1 1h-.5c.5 0 1 .5 1 1s-.45 1-1 1h-.5c.55 0 1 .45 1 1 0 1.55-1.57 3-4 3zm-2-8c-1.5 2-3 4-3 5.5 0 2.21 1.79 4 4 4s4-1.79 4-4c0-1.5-1.5-3.5-3-5.5l-1 .5-.5-.5c-.5.5-1 1-1 1.5 0-1.5-1-2.5-2-2.5-1 0-2 1-2 2.5 0-.5-.5-1-1-1.5l-.5.5-1-.5z" />
    </svg>
    <span>{streak} day streak</span>
  </div>
);

// ─── Reward Card ──────────────────────────────────────────────────
interface RewardCardProps {
  reward: string;
  isComplete: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, isComplete }) => (
  <div className={`duo-reward-card ${isComplete ? 'duo-reward-card--complete' : ''}`}>
    <div className="flex items-center gap-3 mb-3">
      <span className="text-3xl">{isComplete ? '🎉' : '🎁'}</span>
      <div>
        <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: isComplete ? DUO.green : '#B8860B' }}>
          {isComplete ? 'Claimed!' : 'Your Reward'}
        </div>
        <div className="font-black" style={{ color: DUO.text }}>
          {reward}
        </div>
      </div>
    </div>
    <p className="text-sm" style={{ color: DUO.textLight }}>
      {isComplete
        ? 'Amazing! You claimed your reward!'
        : 'Finish today\'s challenge to earn this reward.'}
    </p>
  </div>
);

// ─── Celebration Overlay ──────────────────────────────────────────
const CelebrationOverlay: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="duo-confetti"
        style={{
          left: `${10 + i * 12}%`,
          background: [DUO.yellow, DUO.green, DUO.blue, DUO.purple, DUO.orange][i % 5],
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
  </div>
);

// ─── Loading Skeleton ─────────────────────────────────────────────
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-56 bg-gray-200 rounded-b-3xl" />
    <div className="h-48 bg-gray-200 rounded-3xl mx-4" />
    <div className="h-32 bg-gray-200 rounded-3xl mx-4" />
  </div>
);

// ─── Error State ─────────────────────────────────────────────────
const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex min-h-screen items-center justify-center p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72">
    <div className="max-w-sm w-full text-center">
      <div className="text-7xl mb-6">😢</div>
      <h2 className="text-2xl font-black mb-2" style={{ color: DUO.text }}>
        Could not load challenge
      </h2>
      <p className="mb-6" style={{ color: DUO.textLight }}>
        Something went wrong. Please try again.
      </p>
      <button onClick={onRetry} className="duo-btn duo-btn--primary max-w-xs">
        Try again
      </button>
    </div>
  </div>
);

// ─── Empty State ─────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72">
    <div className="max-w-sm w-full text-center">
      <div className="text-7xl mb-6">🎯</div>
      <h2 className="text-2xl font-black mb-2" style={{ color: DUO.text }}>
        No challenge today
      </h2>
      <p className="mb-6" style={{ color: DUO.textLight }}>
        Check back soon for a new daily challenge!
      </p>
      <Link to="/courses" className="duo-btn duo-btn--primary inline-flex max-w-xs">
        Start learning
      </Link>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────
export const DailyChallengePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchChallenge = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await apiClient.getMyProfile();
      setProfile(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: '#F8F9FA' }}>
        <LoadingSkeleton />
      </div>
    );
  }

  if (hasError) {
    return <ErrorState onRetry={fetchChallenge} />;
  }

  const challenge = profile?.daily_challenge;
  const hasChallenge = challenge && (challenge.title || challenge.target > 0);

  if (!hasChallenge) {
    return <EmptyState />;
  }

  const progress = challenge.progress || 0;
  const target = challenge.target || 1;
  const percent = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));
  const isComplete = progress >= target;
  const streak = profile?.streak || 0;
  const xpReward = isComplete ? 50 : 10;

  return (
    <div className="min-h-screen pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
      {/* Duolingo-style Header with Green Gradient */}
      <div className="duo-header px-4 pt-6 pb-10" style={{ background: DUO.headerBg }}>
        {/* Top Row: Title and Streak */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white mb-1">
              Daily Challenge
            </h1>
            <p className="text-white/80 text-sm">
              Complete the challenge to earn your reward!
            </p>
          </div>
          <StreakBadge streak={streak} />
        </div>

        {/* XP Counter */}
        <div className="flex justify-center mb-6">
          <XPCounter xp={xpReward} />
        </div>

        {/* Challenge Card */}
        <div className={`duo-challenge-card p-6 ${isComplete ? 'duo-challenge-card--complete' : ''}`}>
          {/* Challenge Icon */}
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ background: isComplete ? `${DUO.green}20` : `${DUO.yellow}20` }}
          >
            {isComplete ? '🏆' : '🎯'}
          </div>

          {/* Challenge Title */}
          <h2 className="text-xl font-black text-center mb-3" style={{ color: DUO.text }}>
            {challenge.title || 'Today\'s Challenge'}
          </h2>

          {/* Completion Badge */}
          {isComplete && (
            <div className="flex justify-center">
              <div className="duo-complete-badge">
                <span>✨</span>
                <span>Challenge Complete!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-6 pt-5 space-y-5 max-w-lg mx-auto">
        {/* Progress Section with Ring */}
        <div className="duo-challenge-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-lg" style={{ color: DUO.text }}>
              Your Progress
            </h3>
            <span className="font-black text-base" style={{ color: isComplete ? DUO.green : DUO.red }}>
              {progress}/{target}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress Ring */}
            <ProgressRing
              progress={percent}
              size={110}
              isComplete={isComplete}
            />

            {/* Progress Details */}
            <div className="flex-1 space-y-3">
              {/* Progress Bar */}
              <div className="h-4 rounded-full overflow-hidden" style={{ background: '#E8E8E8' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${percent}%`,
                    background: isComplete
                      ? `linear-gradient(90deg, ${DUO.green}, #4CAF50)`
                      : `linear-gradient(90deg, ${DUO.red}, #FF6B6B)`,
                  }}
                />
              </div>

              {/* Motivational Text */}
              <p className="duo-motivational">
                {isComplete ? (
                  <>
                    Great job! <span className="duo-motivational--highlight">Ready to claim your reward!</span>
                  </>
                ) : (
                  <>
                    <span className="duo-motivational--highlight">{target - progress} more</span> to complete your challenge
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Reward Card */}
        <div className="relative">
          <RewardCard
            reward={challenge.reward || 'Mystery reward'}
            isComplete={isComplete}
          />
          {isComplete && <CelebrationOverlay />}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 space-y-3">
          <Link
            to="/courses"
            className="duo-btn duo-btn--primary duo-focus"
          >
            {isComplete ? 'Claim Reward!' : 'Start Challenge'}
          </Link>
          <Link
            to="/progress"
            className="duo-btn duo-btn--secondary duo-focus"
          >
            View Progress
          </Link>
        </div>

        {/* Motivational Footer */}
        <div className="text-center pt-4 pb-2">
          <p className="duo-motivational text-sm">
            {streak > 0 ? (
              <>🔥 Keep your {streak}-day streak going!</>
            ) : (
              <>💪 Start your streak today!</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailyChallengePage;
