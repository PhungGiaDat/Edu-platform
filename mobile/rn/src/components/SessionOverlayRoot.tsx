/**
 * SessionOverlayRoot — presentation layer root for session overlays.
 *
 * Composes all session-related modals/overlays in one place.
 * Each overlay is shown/hidden based on the session status.
 *
 * The overlays are STATE-DRIVEN — they receive the status prop and render
 * accordingly. No hardcoded thresholds inside these components.
 *
 * Layout:
 *   SessionOverlayRoot
 *     ├── SessionWarningModal     (visible when status === 'WARNING')
 *     ├── SessionLimitModal      (visible when status === 'LIMIT_REACHED')
 *     └── SessionBreakOverlay    (visible when status === 'BREAK')
 *
 * This component does NOT own the session state — it receives the status prop.
 * The status is computed by the parent hook using the DQ-10 policy config.
 */
import React from 'react';
import { SessionWarningModal } from './SessionWarningModal';
import { SessionLimitModal } from './SessionLimitModal';
import { SessionBreakOverlay } from './SessionBreakOverlay';
import type { SessionStatus } from '../types/session-state';

export interface SessionOverlayRootProps {
  /** Current session status. Drives which overlay is visible. */
  status: SessionStatus;
  /** Break remaining seconds. */
  breakRemainingSeconds: number;
  /** Called when user dismisses the warning modal. */
  onDismissWarning?: () => void;
  /** Called when user wants to continue session after limit. */
  onContinueSession?: () => void;
  /** Called when user acknowledges the limit. */
  onEndSession?: () => void;
  /** Called when user wants to start a break. */
  onStartBreak?: () => void;
  /** Called when user wants to end break early. */
  onEndBreak?: () => void;
  /** Break duration in seconds (from config). */
  breakSeconds?: number;
}

export const SessionOverlayRoot: React.FC<SessionOverlayRootProps> = ({
  status,
  breakRemainingSeconds,
  onDismissWarning,
  onContinueSession,
  onEndSession,
  onStartBreak,
  onEndBreak,
  breakSeconds = 0,
}) => {
  return (
    <>
      <SessionWarningModal
        visible={status === 'WARNING'}
        onDismissWarning={onDismissWarning}
        onStartBreak={onStartBreak}
        breakSeconds={breakSeconds}
      />
      <SessionLimitModal
        visible={status === 'LIMIT_REACHED'}
        breakRemainingSeconds={breakRemainingSeconds}
        onEndSession={onEndSession}
        onStartBreak={onStartBreak}
        breakSeconds={breakSeconds}
      />
      <SessionBreakOverlay
        visible={status === 'BREAK'}
        breakRemainingSeconds={breakRemainingSeconds}
        onEndBreak={onEndBreak}
      />
    </>
  );
};

export default SessionOverlayRoot;
