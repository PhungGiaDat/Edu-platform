// frontend-web/src/components/GlobalSessionWatcher.tsx
/**
 * GlobalSessionWatcher
 * Renders the claymorphic BreakReminder overlay when the session timer
 * reaches warning (25 min) or limit (30 min) thresholds.
 * Lives at the app root (inside SessionProvider) so it survives route changes.
 */

import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { BreakReminder } from './BreakReminder';

export const GlobalSessionWatcher: React.FC = () => {
  const { isWarning, isLimitReached, remainingSeconds, pause, extendLock } =
    useSession();

  // Track "has shown warning" to avoid re-showing after dismiss
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    if (!isWarning && !isLimitReached) {
      // Timer dropped below warning threshold (e.g. extended) — reset dismiss flag
      setWarningDismissed(false);
    }
  }, [isWarning, isLimitReached]);

  const handleContinue = () => {
    // "Keep Going!" — just close the warning popup, clock keeps running
    setWarningDismissed(true);
  };

  const handleExit = () => {
    // "Take a Break" — pause the timer and go to dashboard
    pause();
    setWarningDismissed(true);
    window.location.href = '/profile';
  };

  const handleExtend = (mins: number) => {
    extendLock(mins);
    setWarningDismissed(false);
  };

  return (
    <BreakReminder
      remainingSeconds={remainingSeconds}
      isWarning={isWarning && !warningDismissed}
      isLimitReached={isLimitReached}
      onContinue={isWarning ? handleContinue : undefined}
      onExtend={isLimitReached ? handleExtend : undefined}
      onExit={handleExit}
    />
  );
};

export default GlobalSessionWatcher;
