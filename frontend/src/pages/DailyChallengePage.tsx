// src/pages/DailyChallengePage.tsx
// Standalone Daily Challenge page - route: /daily-challenge
// Kid-friendly claymorphism challenge flow with progress and reward states

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, type ProfileResponse } from '../services/apiClient';
import '../styles/claymorphic-utilities.css';

type IconProps = { className?: string };

const TargetIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
    <path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2" />
  </svg>
);

const GiftIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="9" width="17" height="11.5" rx="2.5" />
    <path d="M12 9v11.5M3.5 13h17M5.5 9V6.75a2.25 2.25 0 0 1 4.5 0V9M18.5 9V6.75a2.25 2.25 0 0 0-4.5 0V9" />
    <path d="M12 6.75C11.4 4.2 7.25 3.9 7.25 6.2 7.25 8.1 10.2 8.6 12 8.75c1.8-.15 4.75-.65 4.75-2.55 0-2.3-4.15-2-4.75.55Z" />
  </svg>
);

const TrophyIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3.5h10v4.75a5 5 0 0 1-10 0V3.5Z" />
    <path d="M7 5H4.75v2.25A3.25 3.25 0 0 0 8 10.5M17 5h2.25v2.25A3.25 3.25 0 0 1 16 10.5M12 13.25v4M8.5 20.5h7M10 17.25h4" />
  </svg>
);

const FlameIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.3 21c-4.05 0-7.1-2.65-7.1-6.45 0-2.95 1.65-5.3 4.15-7.95.25 2.2 1.25 3.35 2.35 4.15.1-3.9 1.55-6.55 3.9-8.75.15 3.25 3.2 5.45 3.2 9.5 0 5.55-2.8 9.5-6.5 9.5Z" />
    <path d="M12.25 20.25c-1.9 0-3.25-1.35-3.25-3.2 0-1.35.7-2.45 1.8-3.65.15 1.05.65 1.7 1.35 2.15.05-1.55.55-2.55 1.35-3.45.15 1.55 1.6 2.35 1.6 4.25 0 2.2-1.05 3.9-2.85 3.9Z" />
  </svg>
);

const SparkleIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="m12 1.5 1.85 6.65L20.5 10l-6.65 1.85L12 18.5l-1.85-6.65L3.5 10l6.65-1.85L12 1.5Z" />
  </svg>
);

const CheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.6 2.6L16.5 9" />
  </svg>
);

const BookIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5V4.5Z" />
    <path d="M5 4.5v17M8.5 6.5h7M8.5 10h8" />
  </svg>
);

const ArrowIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h13M13 6l6 6-6 6" />
  </svg>
);

const AlertIcon: React.FC<IconProps> = ({ className }) => (
  <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3 9 16H3L12 3Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

interface ProgressRingProps {
  progress: number;
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
    <div
      className={`daily-challenge-progress-ring ${isComplete ? 'daily-challenge-progress-ring--complete' : ''}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${progress}% complete`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className="daily-challenge-progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="daily-challenge-progress-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="daily-challenge-progress-ring-center">
        <div className="daily-challenge-progress-ring-percent">{progress}%</div>
        <div className="daily-challenge-progress-ring-label">
          {isComplete ? 'Done!' : 'Progress'}
        </div>
      </div>
    </div>
  );
};

interface XPCounterProps {
  xp: number;
  prefix?: string;
}

const XPCounter: React.FC<XPCounterProps> = ({ xp, prefix = '+' }) => {
  const [displayXp, setDisplayXp] = useState(xp);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevXp = useRef(xp);

  useEffect(() => {
    if (xp === prevXp.current) return;

    setIsAnimating(true);
    const start = prevXp.current;
    const end = xp;
    const duration = 600;
    const startTime = performance.now();
    let frameId = 0;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayXp(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    frameId = requestAnimationFrame(animate);
    prevXp.current = xp;

    return () => cancelAnimationFrame(frameId);
  }, [xp]);

  return (
    <div
      className={`daily-challenge-xp-badge ${isAnimating ? 'daily-challenge-xp-badge--animated' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${xp} experience points available`}
    >
      <span className="daily-challenge-xp-icon" aria-hidden="true">{prefix}</span>
      <span>{displayXp} XP</span>
    </div>
  );
};

interface StreakBadgeProps {
  streak: number;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => (
  <div className="daily-challenge-streak">
    <FlameIcon className="daily-challenge-streak-icon" />
    <span>{streak} day streak</span>
  </div>
);

interface RewardCardProps {
  reward: string;
  isComplete: boolean;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, isComplete }) => (
  <section className={`daily-challenge-reward-card ${isComplete ? 'daily-challenge-reward-card--complete' : ''}`} aria-labelledby="daily-challenge-reward-title">
    <div className="daily-challenge-card-heading">
      <span className="daily-challenge-reward-icon" aria-hidden="true">
        {isComplete ? <TrophyIcon /> : <GiftIcon />}
      </span>
      <div>
        <div className="daily-challenge-card-label" id="daily-challenge-reward-title">
          {isComplete ? 'Claimed!' : 'Reward'}
        </div>
        <div className="daily-challenge-reward-name">{reward}</div>
      </div>
    </div>
    <p className="daily-challenge-card-copy">
      {isComplete
        ? 'Amazing work. Your reward is ready to celebrate.'
        : 'Finish today\'s challenge to earn this reward.'}
    </p>
  </section>
);

const CelebrationOverlay: React.FC = () => {
  const confettiTones = ['coral', 'teal', 'violet', 'sky', 'pink'];

  return (
    <div className="daily-challenge-celebration" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <span
          key={index}
          className={`daily-challenge-confetti daily-challenge-confetti--${confettiTones[index % confettiTones.length]}`}
          style={{
            left: `${10 + index * 12}%`,
            animationDelay: `${index * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
};

const LoadingSkeleton: React.FC = () => (
  <div className="daily-challenge-skeleton animate-pulse" role="status" aria-label="Loading challenge">
    <div className="daily-challenge-skeleton-header" />
    <div className="daily-challenge-skeleton-card" />
    <div className="daily-challenge-skeleton-card daily-challenge-skeleton-card--short" />
  </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <main className="daily-challenge-page daily-challenge-state" role="alert" aria-live="assertive">
    <div className="daily-challenge-state-inner">
      <div className="daily-challenge-state-icon daily-challenge-state-icon--error" aria-hidden="true">
        <AlertIcon />
      </div>
      <h1 className="daily-challenge-state-title">Could not load challenge</h1>
      <p className="daily-challenge-state-copy">Something went wrong. Please try again.</p>
      <button type="button" onClick={onRetry} className="daily-challenge-state-button">
        Try again
      </button>
    </div>
  </main>
);

const EmptyState: React.FC = () => (
  <main className="daily-challenge-page daily-challenge-state" role="status" aria-live="polite">
    <div className="daily-challenge-state-inner">
      <div className="daily-challenge-state-icon daily-challenge-state-icon--empty" aria-hidden="true">
        <TargetIcon />
      </div>
      <h1 className="daily-challenge-state-title">No challenge today</h1>
      <p className="daily-challenge-state-copy">Check back soon for a new daily challenge.</p>
      <Link to="/courses" className="daily-challenge-state-button daily-challenge-state-button--link">
        Start learning
      </Link>
    </div>
  </main>
);

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
      <main className="daily-challenge-page daily-challenge-loading-shell" aria-label="Daily Challenge">
        <LoadingSkeleton />
      </main>
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
  const streak = profile?.summary.streak_days || 0;
  const xpReward = isComplete ? 50 : 10;

  return (
    <main className="daily-challenge-page" aria-label="Daily Challenge">
      <a href="#challenge-content" className="daily-challenge-skip-link">
        Skip to challenge content
      </a>

      <header id="challenge-content" className="daily-challenge-header">
        <div className="daily-challenge-header-layout">
          <div className="daily-challenge-header-copy">
            <div className="daily-challenge-heading-row">
              <div className="daily-challenge-title-block">
                <h1 className="daily-challenge-title">
                  <span className="daily-challenge-title-mark" aria-hidden="true">
                    <TargetIcon />
                  </span>
                  <span>Daily Challenge</span>
                </h1>
                <p className="daily-challenge-subtitle">
                  Complete a small challenge and keep your learning streak alive.
                </p>
              </div>

              <div className="daily-challenge-header-tools">
                <button
                  type="button"
                  onClick={fetchChallenge}
                  disabled={isLoading}
                  className="daily-challenge-refresh"
                  aria-label="Refresh challenge"
                  title="Refresh challenge"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 11a8.1 8.1 0 0 0-14.7-3L3 10m0 0V4m0 6h6M4 13a8.1 8.1 0 0 0 14.7 3L21 14m0 0v6m0-6h-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                <StreakBadge streak={streak} />
              </div>
            </div>

            <div className="daily-challenge-xp-row">
              <XPCounter xp={xpReward} />
            </div>
          </div>

          <article className={`daily-challenge-hero-card ${isComplete ? 'daily-challenge-hero-card--complete' : ''}`}>
            <div className="daily-challenge-hero-icon" aria-hidden="true">
              {isComplete ? <TrophyIcon /> : <TargetIcon />}
            </div>
            <div className="daily-challenge-hero-copy">
              <p className="daily-challenge-hero-overline">Today's focus</p>
              <h2>{challenge.title || 'Today\'s Challenge'}</h2>
              <p>{isComplete ? 'You made it happen. Take a moment to celebrate.' : 'One focused step is all it takes to move forward.'}</p>
            </div>
            {isComplete && (
              <div className="daily-challenge-complete-badge" role="status">
                <CheckIcon />
                <span>Challenge Complete!</span>
              </div>
            )}
          </article>
        </div>
      </header>

      <div className="daily-challenge-content">
        <div className="daily-challenge-grid">
          <section className="daily-challenge-progress-card" aria-labelledby="daily-challenge-progress-title">
            <div className="daily-challenge-card-topline">
              <div>
                <h2 id="daily-challenge-progress-title">Your Progress</h2>
                <p>Every small step counts.</p>
              </div>
              <span className={`daily-challenge-progress-count ${isComplete ? 'daily-challenge-progress-count--complete' : ''}`}>
                {progress}/{target}
              </span>
            </div>

            <div className="daily-challenge-progress-layout">
              <ProgressRing progress={percent} size={110} isComplete={isComplete} />

              <div className="daily-challenge-progress-details">
                <div
                  className="daily-challenge-progress-track"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${percent}% of challenge completed`}
                >
                  <div
                    className={`daily-challenge-progress-fill ${isComplete ? 'daily-challenge-progress-fill--complete' : ''}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <p className="daily-challenge-motivational">
                  {isComplete ? (
                    <>
                      Great job. <span>Ready to claim your reward.</span>
                    </>
                  ) : (
                    <span>{target - progress} more to go</span>
                  )}
                </p>
              </div>
            </div>
          </section>

          <div className="daily-challenge-reward-wrap">
            <RewardCard reward={challenge.reward || 'Mystery reward'} isComplete={isComplete} />
            {isComplete && <CelebrationOverlay />}
          </div>

          <nav className="daily-challenge-actions" aria-label="Challenge actions">
            <Link to="/courses" className="daily-challenge-action-card daily-challenge-action-card--primary" aria-label="Go to Courses">
              <span className="daily-challenge-action-icon" aria-hidden="true"><BookIcon /></span>
              <span className="daily-challenge-action-copy">
                <strong>Go to Courses</strong>
                <small>Keep your momentum going</small>
              </span>
              <ArrowIcon className="daily-challenge-action-arrow" />
            </Link>
            <Link to="/progress" className="daily-challenge-action-card daily-challenge-action-card--secondary" aria-label="View Progress">
              <span className="daily-challenge-action-icon" aria-hidden="true"><SparkleIcon /></span>
              <span className="daily-challenge-action-copy">
                <strong>View Progress</strong>
                <small>See how far you have come</small>
              </span>
              <ArrowIcon className="daily-challenge-action-arrow" />
            </Link>
          </nav>
        </div>

        <div className="daily-challenge-footer-note">
          <FlameIcon className="daily-challenge-footer-icon" />
          <p>
            {streak > 0 ? `Keep your ${streak}-day streak going.` : 'Start your streak today.'}
          </p>
        </div>
      </div>
    </main>
  );
};

export default DailyChallengePage;
