import React, { useEffect, useRef } from 'react';

interface BreakCooldownNoticeProps {
  remainingSeconds: number;
  onBackToProfile: () => void;
}

function formatMMSS(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export const BreakCooldownNotice: React.FC<BreakCooldownNoticeProps> = ({
  remainingSeconds,
  onBackToProfile,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));

    const focusFirst = () => {
      const [first] = focusableElements();
      (first ?? dialog).focus();
    };

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = focusableElements();
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

    focusFirst();
    document.addEventListener('keydown', trapFocus);

    return () => {
      document.removeEventListener('keydown', trapFocus);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-[rgba(26,39,68,0.88)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-cooldown-title"
      aria-describedby="break-cooldown-body"
    >
      <div
        className="flex w-full max-w-[480px] flex-col items-center gap-5 rounded-[2rem] border-4 border-[#6EB9FF] bg-[#FFFBF0] p-8 text-center shadow-clayLg"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FFFBF0] text-5xl shadow-clay" aria-hidden="true">
          🌈
        </div>
        <h2
          id="break-cooldown-title"
          className="leading-tight text-[#3A8FD1]"
          style={{ fontFamily: "'Baloo 2', cursive", fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 900 }}
        >
          Break time in progress
        </h2>
        <p id="break-cooldown-body" className="max-w-[36ch] text-base leading-relaxed text-[#4A5568]">
          Great job learning! Let&apos;s rest your eyes and come back when the timer is ready.
        </p>
        <p className="text-4xl font-extrabold tracking-wide text-[#1A2744]">
          {formatMMSS(remainingSeconds)}
        </p>
        <button
          type="button"
          onClick={onBackToProfile}
          className="min-h-[64px] w-full rounded-[1.25rem] bg-[#B4E197] px-6 py-4 text-lg font-extrabold text-[#1A2744] shadow-[0_6px_0_#7DC760,inset_0_1px_0_rgba(255,255,255,0.4)] transition-all duration-150 ease-out active:translate-y-[4px] active:shadow-[0_2px_0_#7DC760,inset_0_1px_0_rgba(255,255,255,0.4)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD93D]/40"
        >
          Back to Profile
        </button>
      </div>
    </div>
  );
};

export default BreakCooldownNotice;
