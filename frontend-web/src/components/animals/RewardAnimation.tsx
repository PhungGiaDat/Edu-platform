/**
 * RewardAnimation.tsx
 * 
 * Claymorphic reward celebration component for the Animals course.
 * Displays XP earned, sticker animations, and confetti effects.
 * 
 * Features:
 * - XP counter with animated counting
 * - Sticker reveal animation
 * - Confetti celebration effect
 * - Kid-friendly celebration design
 */

import React, { useEffect, useState, useCallback } from 'react';
import { colors, shadows, radius } from '../../design-tokens/claymorphic';

interface RewardAnimationProps {
  /** XP earned in this lesson */
  xpEarned: number;
  /** Sticker image URL (optional) */
  stickerUrl?: string;
  /** Sticker emoji fallback */
  stickerEmoji?: string;
  /** Whether the reward animation is visible */
  isVisible: boolean;
  /** Callback when animation completes or is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss delay in milliseconds */
  autoDismissDelay?: number;
  /** Lesson completion message */
  message?: string;
}

const CONFETTI_EMOJIS = ['🎉', '⭐', '✨', '🌟', '💫', '🎊', '🏆', '🌈'];

export const RewardAnimation: React.FC<RewardAnimationProps> = ({
  xpEarned,
  stickerUrl,
  stickerEmoji = '🎉',
  isVisible,
  onDismiss,
  autoDismissDelay = 5000,
  message = 'Great job!',
}) => {
  const [displayedXp, setDisplayedXp] = useState(0);
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number;
    emoji: string;
    left: string;
    delay: string;
    duration: string;
  }>>([]);
  const [showSticker, setShowSticker] = useState(false);

  // Generate confetti
  const generateConfetti = useCallback(() => {
    const pieces = [];
    for (let i = 0; i < 30; i++) {
      pieces.push({
        id: i,
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 2}s`,
        duration: `${2 + Math.random() * 2}s`,
      });
    }
    setConfettiPieces(pieces);
  }, []);

  // Animate XP counter
  useEffect(() => {
    if (!isVisible || xpEarned <= 0) return;

    setDisplayedXp(0);
    const duration = 1500; // 1.5 seconds to count up
    const steps = 30;
    const increment = xpEarned / steps;
    let current = 0;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), xpEarned);
      setDisplayedXp(current);

      if (step >= steps) {
        clearInterval(interval);
        setDisplayedXp(xpEarned);
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [isVisible, xpEarned]);

  // Show sticker after XP animation
  useEffect(() => {
    if (!isVisible) return;

    const stickerTimer = setTimeout(() => {
      setShowSticker(true);
    }, 1500);

    return () => clearTimeout(stickerTimer);
  }, [isVisible]);

  // Auto-dismiss
  useEffect(() => {
    if (!isVisible) return;

    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, autoDismissDelay);

    return () => clearTimeout(dismissTimer);
  }, [isVisible, autoDismissDelay, onDismiss]);

  // Generate confetti on visible
  useEffect(() => {
    if (isVisible) {
      generateConfetti();
    }
  }, [isVisible, generateConfetti]);

  if (!isVisible) return null;

  return (
    <div 
      className="reward-animation"
      onClick={onDismiss}
    >
      {/* Backdrop */}
      <div className="reward-animation__backdrop" />

      {/* Confetti layer */}
      <div className="reward-animation__confetti">
        {confettiPieces.map((piece) => (
          <div
            key={piece.id}
            className="reward-animation__confetti-piece"
            style={{
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
            }}
          >
            {piece.emoji}
          </div>
        ))}
      </div>

      {/* Main reward card */}
      <div 
        className="reward-animation__card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Celebration header */}
        <div className="reward-animation__header">
          <div className="reward-animation__celebration-icon">
            🎉
          </div>
          <h2 className="reward-animation__title">{message}</h2>
        </div>

        {/* XP display */}
        <div className="reward-animation__xp-section">
          <div className="reward-animation__xp-badge">
            <span className="reward-animation__xp-star">⭐</span>
            <span className="reward-animation__xp-value">{displayedXp}</span>
            <span className="reward-animation__xp-label">XP</span>
          </div>
        </div>

        {/* Sticker reveal */}
        {stickerUrl || stickerEmoji ? (
          <div className={`reward-animation__sticker-section ${showSticker ? 'reward-animation__sticker-section--visible' : ''}`}>
            <div className="reward-animation__sticker-label">You earned a sticker!</div>
            <div className="reward-animation__sticker">
              {stickerUrl ? (
                <img
                  src={stickerUrl}
                  alt="Reward sticker"
                  className="reward-animation__sticker-image"
                />
              ) : (
                <span className="reward-animation__sticker-emoji">{stickerEmoji}</span>
              )}
            </div>
          </div>
        ) : null}

        {/* Continue button */}
        <button
          type="button"
          onClick={onDismiss}
          className="reward-animation__continue-btn"
        >
          Continue
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="reward-animation__continue-icon">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Tap hint */}
        <p className="reward-animation__tap-hint">Tap anywhere to continue</p>
      </div>

      <style>{`
        .reward-animation {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: rewardAnimationFadeIn 0.3s ease-out;
        }

        @keyframes rewardAnimationFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .reward-animation__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
        }

        .reward-animation__confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .reward-animation__confetti-piece {
          position: absolute;
          top: -50px;
          font-size: 1.5rem;
          animation: confettiFall linear forwards;
          opacity: 0;
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .reward-animation__card {
          position: relative;
          background: ${colors.warmWhite};
          border-radius: ${radius['4xl']};
          border: 4px solid white;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 32px;
          max-width: 360px;
          width: 90%;
          text-align: center;
          animation: rewardCardPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes rewardCardPop {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .reward-animation__header {
          margin-bottom: 24px;
        }

        .reward-animation__celebration-icon {
          font-size: 4rem;
          margin-bottom: 8px;
          animation: celebrationBounce 0.6s ease infinite;
        }

        @keyframes celebrationBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .reward-animation__title {
          font-size: 1.75rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          margin: 0;
        }

        .reward-animation__xp-section {
          margin-bottom: 24px;
        }

        .reward-animation__xp-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, ${colors.sunshineYellow}, #FFD93D);
          border-radius: ${radius.full};
          padding: 16px 32px;
          border: 4px solid white;
          box-shadow: ${shadows.clayYellow};
        }

        .reward-animation__xp-star {
          font-size: 1.5rem;
        }

        .reward-animation__xp-value {
          font-size: 2.5rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .reward-animation__xp-label {
          font-size: 1rem;
          font-weight: 700;
          color: ${colors.deepSlate};
          opacity: 0.8;
        }

        .reward-animation__sticker-section {
          opacity: 0;
          transform: scale(0.8) translateY(20px);
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          margin-bottom: 24px;
        }

        .reward-animation__sticker-section--visible {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        .reward-animation__sticker-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: ${colors.lightGray};
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .reward-animation__sticker {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100px;
          height: 100px;
          background: white;
          border-radius: ${radius['2xl']};
          border: 4px solid ${colors.skyBlue};
          box-shadow: ${shadows.clay};
          animation: stickerWiggle 0.5s ease;
        }

        @keyframes stickerWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }

        .reward-animation__sticker-image {
          width: 80px;
          height: 80px;
          object-fit: contain;
        }

        .reward-animation__sticker-emoji {
          font-size: 3rem;
        }

        .reward-animation__continue-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px 32px;
          background: ${colors.skyBlue};
          border: 4px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clayBlue};
          cursor: pointer;
          font-size: 1.125rem;
          font-weight: 900;
          color: white;
          transition: all 0.15s ease;
        }

        .reward-animation__continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 0 ${colors.skyBlueDark}, 0 4px 16px rgba(0,0,0,0.1);
        }

        .reward-animation__continue-btn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 ${colors.skyBlueDark};
        }

        .reward-animation__continue-icon {
          width: 20px;
          height: 20px;
        }

        .reward-animation__tap-hint {
          margin-top: 16px;
          font-size: 0.75rem;
          color: ${colors.lightGray};
        }
      `}</style>
    </div>
  );
};

export default RewardAnimation;
