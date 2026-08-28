// frontend-web/src/components/SessionTimerBadge.tsx
/**
 * SessionTimerBadge — small claymorphic pill showing remaining session time.
 * Shown in Sidebar desktop and mobile bottom sheet.
 *
 * Color states:
 * - Normal (mint): > 10 min remaining
 * - Warning (yellow): ≤ 10 min remaining
 * - Critical (coral, pulse): limit reached
 */

import React from 'react';
import { useSession } from '@/contexts/SessionContext';

function formatMMSS(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SessionTimerBadge: React.FC = () => {
  const { phase, remainingSeconds, isWarning, isLimitReached, isPaused, isInitialized } =
    useSession();

  if (!isInitialized || phase === null || phase === 'on_break') return null;

  const isCritical = isLimitReached;
  const isWarn = isWarning && !isLimitReached;

  const colorClass = isCritical
    ? 'bg-[#FF9F9F] text-[#1A2744]'
    : isWarn
    ? 'bg-[#FFD93D] text-[#1A2744]'
    : 'bg-[#B4E197] text-[#1A2744]';

  const displayText = isPaused
    ? 'Paused'
    : isCritical
    ? "Time's Up!"
    : formatMMSS(remainingSeconds);

  const titleAttr =
    isPaused
      ? 'Session paused (tab hidden or idle)'
      : isCritical
      ? 'Session limit reached — time for a break!'
      : `${formatMMSS(remainingSeconds)} remaining`;

  return (
    <>
      <div
        className={`
          inline-flex items-center gap-1.5
          px-3 py-1.5 rounded-full
          ${colorClass}
          shadow-clay-sm
          text-sm font-extrabold
          select-none
          ${isCritical ? 'animate-[pulseBadge_1.5s_ease-in-out_infinite]' : ''}
        `}
        style={{ fontFamily: "'Nunito', sans-serif" }}
        title={titleAttr}
      >
        <span aria-hidden="true" className="text-base leading-none">
          {isCritical ? '⏰' : '⏱️'}
        </span>
        <span className="leading-none">{displayText}</span>
      </div>
      <style>{`
        @keyframes pulseBadge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[pulseBadge_1s\\] { animation: none !important; }
        }
      `}</style>
    </>
  );
};

export default SessionTimerBadge;
