/**
 * AnimalsRewardBurst.tsx
 * 
 * Reward celebration overlay for the Animals Adventure course.
 * Shows sticker burst animation with XP toast when a lesson is completed.
 */

import React, { useEffect, useState } from 'react';

interface AnimalsRewardBurstProps {
  isVisible: boolean;
  stickerName: string;
  stickerUrl?: string;
  xpEarned: number;
  badgeTitle: string;
  message: string;
  onClose: () => void;
}

const stickerEmojis: Record<string, string> = {
  'cat-king': '👑',
  'dog-hero': '🦸',
  'bird-sky': '🌤️',
  'fish-friend': '🌊',
  'rabbit-jump': '🏆',
  default: '🎉',
};

export const AnimalsRewardBurst: React.FC<AnimalsRewardBurstProps> = ({
  isVisible,
  stickerName,
  stickerUrl,
  xpEarned,
  badgeTitle,
  message,
  onClose,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const stickerEmoji = stickerEmojis[stickerName] || stickerEmojis.default;

  return (
    <div className={`animals-reward-burst ${isAnimating ? 'animals-reward-burst--animating' : ''}`}>
      <div className="animals-reward-burst__backdrop" onClick={onClose} />
      
      <div className="animals-reward-burst__content">
        <div className="animals-reward-burst__confetti">
          {Array.from({ length: 12 }).map((_, i) => (
            <div 
              key={i} 
              className="animals-reward-burst__confetti-piece"
              style={{ '--confetti-index': i } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="animals-reward-burst__sticker-frame">
          {stickerUrl ? (
            <img 
              src={stickerUrl} 
              alt={stickerName}
              className="animals-reward-burst__sticker-image"
            />
          ) : (
            <div className="animals-reward-burst__sticker-emoji">
              {stickerEmoji}
            </div>
          )}
        </div>

        <h2 className="animals-reward-burst__badge-title">{badgeTitle}</h2>
        <p className="animals-reward-burst__message">{message}</p>

        <div className="animals-reward-burst__xp-toast">
          <svg viewBox="0 0 24 24" fill="currentColor" className="animals-reward-burst__xp-icon">
            <path d="M13.5 2 4 14h6.7L9.5 22 20 9h-7.1L13.5 2Z" />
          </svg>
          <span className="animals-reward-burst__xp-value">+{xpEarned}</span>
          <span className="animals-reward-burst__xp-label">XP</span>
        </div>

        <button 
          type="button" 
          onClick={onClose}
          className="animals-reward-burst__continue"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
