import React from 'react';

export interface FeedbackMascotProps {
  mode: 'companion' | 'feedback';
  state?: 'idle' | 'correct' | 'incorrect';
  message?: string;
  mascotEmoji?: string;
  mascotName?: string;
  className?: string;
}

/**
 * Lightweight, non-intrusive mascot helper.
 * Rules:
 * - Must never cover text, cards, choices, or CTAs.
 * - Sits inline near headings or appears temporarily during feedback moments.
 * - Supports the learning task without competing for screen real estate.
 */
export const FeedbackMascot: React.FC<FeedbackMascotProps> = ({
  mode,
  state = 'idle',
  message,
  mascotEmoji = '🐻',
  mascotName = 'Momo',
  className = '',
}) => {
  if (mode === 'companion') {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-50/90 px-3 py-1 shadow-xs transition-all ${className}`}
        aria-label={`${mascotName} đồng hành`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm shadow-2xs">
          {mascotEmoji}
        </span>
        <span className="text-xs font-black text-amber-900">
          {message || `${mascotName} cùng học với bé!`}
        </span>
      </div>
    );
  }

  // Feedback mode (appears below cards or inline during answer evaluation)
  if (state === 'idle' && !message) return null;

  const isCorrect = state === 'correct';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left shadow-xs transition-all animate-fade-in ${
        isCorrect
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : 'border-amber-300 bg-amber-50 text-amber-950'
      } ${className}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl shadow-xs border-2 border-white ${
          isCorrect ? 'bg-emerald-200 animate-bounce' : 'bg-amber-200 animate-wiggle'
        }`}
      >
        {isCorrect ? '🌟' : mascotEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-wider opacity-75">
          {isCorrect ? `${mascotName} khen bé:` : `${mascotName} nhắn bé:`}
        </p>
        <p className="text-sm font-black leading-snug">
          {message || (isCorrect ? 'Tuyệt vời! Bé chọn đúng rồi!' : 'Cố lên bé ơi, nghe lại và thử nhé!')}
        </p>
      </div>
    </div>
  );
};
