// frontend-web/src/components/BreakReminder.tsx
/**
 * Claymorphic Break Reminder overlay for kids 5-8 years old.
 * Two variants:
 * - Warning (25 min): centered card, "Almost Break Time!" — dismissible
 * - Limit (30 min): full-screen overlay, "Time for a Break!" — NOT dismissible by child
 *
 * Style: claymorphic with Baloo 2 headings, Nunito body, 64px touch targets,
 * spring animations, respects prefers-reduced-motion.
 */

import React, { useEffect, useRef } from 'react';

const getFocusableElements = (dialog: HTMLElement) => Array.from(dialog.querySelectorAll<HTMLElement>(
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
));

// Format remaining seconds as "Xm Ys" or "X min"
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 1) return s > 0 ? `${m}m ${s}s` : `${m} min`;
  return `${s}s`;
}

// Claymorphic Card — outer shell
const ClayCard: React.FC<{
  accentColor: 'yellow' | 'pink' | 'blue' | 'green';
  children: React.ReactNode;
  className?: string;
}> = ({ accentColor, children, className = '' }) => {
  const ringMap = {
    yellow: 'ring-[#FFD93D]',
    pink: 'ring-[#FF9F9F]',
    blue: 'ring-[#6EB9FF]',
    green: 'ring-[#B4E197]',
  };
  const glowMap = {
    yellow: 'shadow-[0_0_0_6px_rgba(255,217,61,0.35)]',
    pink: 'shadow-[0_0_0_6px_rgba(255,159,159,0.35)]',
    blue: 'shadow-[0_0_0_6px_rgba(110,185,255,0.35)]',
    green: 'shadow-[0_0_0_6px_rgba(180,225,151,0.35)]',
  };

  return (
    <div
      className={`
        relative w-full max-w-[480px] rounded-[2rem] p-8 pt-10
        bg-[#FFFBF0]
        border-4 ${ringMap[accentColor]} ${glowMap[accentColor]}
        shadow-clayLg
        flex flex-col items-center gap-5
        ${className}
      `}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* Inner highlight edge */}
      <div
        className="absolute inset-0 rounded-[2rem] pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, transparent 60%)',
        }}
      />
      {children}
    </div>
  );
};

// Claymorphic Action Button
const ClayButton: React.FC<{
  variant: 'green' | 'blue' | 'gray';
  children: React.ReactNode;
  onClick?: () => void;
  fullWidth?: boolean;
}> = ({ variant, children, onClick, fullWidth = true }) => {
  const styles = {
    green: {
      bg: 'bg-[#B4E197]',
      shadow: 'shadow-[0_6px_0_#7DC760,inset_0_1px_0_rgba(255,255,255,0.4)]',
      activeShadow: 'shadow-[0_2px_0_#7DC760,inset_0_1px_0_rgba(255,255,255,0.4)]',
      text: 'text-[#1A2744]',
    },
    blue: {
      bg: 'bg-[#6EB9FF]',
      shadow: 'shadow-[0_6px_0_#3A8FD1,inset_0_1px_0_rgba(255,255,255,0.4)]',
      activeShadow: 'shadow-[0_2px_0_#3A8FD1,inset_0_1px_0_rgba(255,255,255,0.4)]',
      text: 'text-white',
    },
    gray: {
      bg: 'bg-[#F1F5F9]',
      shadow: 'shadow-[0_6px_0_#CBD5E1,inset_0_1px_0_rgba(255,255,255,0.6)]',
      activeShadow: 'shadow-[0_2px_0_#CBD5E1,inset_0_1px_0_rgba(255,255,255,0.6)]',
      text: 'text-[#475569]',
    },
  };

  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      className={`
        ${fullWidth ? 'w-full' : ''}
        min-h-[64px] rounded-[1.25rem]
        ${s.bg} ${s.shadow}
        ${s.text}
        font-extrabold text-lg
        transition-all duration-150 ease-out
        active:translate-y-[4px]
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD93D]/40
        flex items-center justify-center gap-2
        cursor-pointer select-none
        px-6 py-4
      `}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {children}
    </button>
  );
};

// Animated Icon Circle
const AnimatedIcon: React.FC<{ emoji: string; animate: boolean }> = ({
  emoji,
  animate,
}) => (
  <div
    className={`
      w-24 h-24 rounded-full flex items-center justify-center text-5xl
      bg-[#FFFBF0] shadow-clay
      ${animate ? 'animate-[float_4s_ease-in-out_infinite]' : ''}
    `}
  >
    {emoji}
  </div>
);

interface BreakReminderProps {
  isWarning: boolean;
  isLimitReached: boolean;
  remainingSeconds: number;
  onContinue?: () => void;
  onExit?: () => void;
}

export const BreakReminder: React.FC<BreakReminderProps> = ({
  isWarning,
  isLimitReached,
  remainingSeconds,
  onContinue,
  onExit,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isOpen = isWarning || isLimitReached;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', trapFocus);

    return () => {
      document.removeEventListener('keydown', trapFocus);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const [first] = getFocusableElements(dialog);
    (first ?? dialog).focus();
  }, [isOpen, isLimitReached]);

  if (!isOpen) return null;

  const isFullScreen = isLimitReached;
  const accentColor = isLimitReached ? 'pink' : 'yellow';
  const titleColor = isLimitReached ? '#D97070' : '#E5B800';

  const timeDisplay =
    remainingSeconds > 0 ? `Only ${formatTime(remainingSeconds)} left!` : 'Great job!';

  return (
    <>
      {/* CSS keyframes — inline so they're self-contained */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Overlay */}
      <div
        className={`
          fixed inset-0 flex items-center justify-center p-4
          z-[999999]
          ${isFullScreen ? 'bg-[rgba(26,39,68,0.88)]' : 'bg-[rgba(26,39,68,0.45)]'}
          backdrop-blur-sm
        `}
        style={{
          animation: prefersReducedMotion ? 'none' : 'fadeInUp 200ms ease-out forwards',
        }}
        onClick={isFullScreen ? undefined : onExit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="break-reminder-title"
        aria-describedby="break-reminder-body"
      >
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="relative"
          onClick={e => e.stopPropagation()}
        >
          <ClayCard accentColor={accentColor}>
            {/* Animated Icon */}
            <AnimatedIcon
              emoji={isLimitReached ? '💤' : '⏰'}
              animate={!prefersReducedMotion}
            />

            {/* Title */}
            <h2
              id="break-reminder-title"
              className="text-center leading-tight"
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: 'clamp(1.5rem, 5vw, 2rem)',
                fontWeight: 900,
                color: titleColor,
              }}
            >
              {isLimitReached ? "Time for a Break!" : "Almost Break Time!"}
            </h2>

            {/* Body message */}
            <p
              id="break-reminder-body"
              className="text-center text-[#4A5568] text-base leading-relaxed"
              style={{
                fontFamily: "'Nunito', sans-serif",
                maxWidth: '36ch',
              }}
            >
              {isLimitReached
                ? "You've been learning for a while. Let's rest your eyes!"
                : `${timeDisplay} Great job learning today!`}
            </p>

            {/* Actions */}
            <div className="w-full flex flex-col gap-3 mt-2">
              {/* "Keep Going!" — only in warning state */}
              {isWarning && onContinue && (
                <ClayButton variant="green" onClick={onContinue}>
                  ✨ Keep Going!
                </ClayButton>
              )}

              {/* "Take a Break" — always shown */}
              {onExit && (
                <ClayButton
                  variant={isLimitReached ? 'green' : 'gray'}
                  onClick={onExit}
                >
                  {isLimitReached ? '🌈 Take a Break!' : '👋 Exit for Now'}
                </ClayButton>
              )}
            </div>

            {/* Encouraging footer */}
            <p
              className="text-center text-xs text-[#94A3B8] mt-2"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {isLimitReached
                ? 'Rest is important for learning! Come back soon!'
                : 'You can always come back later!'}
            </p>
          </ClayCard>
        </div>
      </div>
    </>
  );
};

export default BreakReminder;
