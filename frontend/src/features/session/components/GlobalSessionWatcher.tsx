// frontend-web/src/components/GlobalSessionWatcher.tsx
/**
 * Translates the persisted child-safe session state into the single global
 * warning, limit, and cooldown UI for learning routes.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { isLearningPath } from '@/session/sessionBreakState';
import { BreakCooldownNotice } from './BreakCooldownNotice';
import { BreakReminder } from './BreakReminder';

export const GlobalSessionWatcher: React.FC = () => {
  // Temporary disabled for AR testing - return null to hide all breaktime/limit UI
  return null;

  const {
    isWarning,
    isLimitReached,
    isOnBreak,
    remainingSeconds,
    breakRemainingSeconds,
    takeBreak,
  } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    if (!isWarning && !isLimitReached) {
      setWarningDismissed(false);
    }
  }, [isWarning, isLimitReached]);

  const handleContinue = () => {
    setWarningDismissed(true);
  };

  const handleExit = () => {
    takeBreak();
    navigate('/profile', { replace: true });
  };

  const handleWarningExit = () => navigate('/profile', { replace: true });

  if (isOnBreak && isLearningPath(location.pathname)) {
    return (
      <BreakCooldownNotice
        remainingSeconds={breakRemainingSeconds}
        onBackToProfile={() => navigate('/profile', { replace: true })}
      />
    );
  }

  if (!isLearningPath(location.pathname)) return null;

  return (
    <BreakReminder
      remainingSeconds={remainingSeconds}
      isWarning={isWarning && !warningDismissed}
      isLimitReached={isLimitReached}
      onContinue={isWarning ? handleContinue : undefined}
      onExit={isLimitReached ? handleExit : handleWarningExit}
    />
  );
};

export default GlobalSessionWatcher;
