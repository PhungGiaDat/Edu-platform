/**
 * SessionTimeIndicator — policy-neutral elapsed time display for learning session.
 *
 * Displays elapsed time in MM:SS format.
 *
 * NO HARDCODED THRESHOLDS. This component receives elapsedSeconds as a prop
 * and a status color. The parent hook computes the status from config.
 *
 * The component does NOT contain:
 *   - if (elapsed >= 1500) ...  // DQ-10 hardcoded value
 *   - if (elapsed >= 1800) ...
 * It simply renders the time and color it receives.
 *
 * Status colors (policy-driven, not hardcoded here):
 *   - NORMAL: primary blue
 *   - WARNING: amber/yellow
 *   - LIMIT_REACHED: coral/red
 *   - BREAK: muted/gray
 *   - COMPLETED: green
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT } from '../design/tokens';
import { formatSessionTime } from '../types/session-state';
import type { SessionStatus } from '../types/session-state';

export interface SessionTimeIndicatorProps {
  /** Seconds elapsed since session start. */
  elapsedSeconds: number;
  /** Current session status (drives color + label). */
  status: SessionStatus;
  /** Break remaining seconds. 0 when not in break. */
  breakRemainingSeconds?: number;
  /** Show break countdown instead of elapsed. */
  isInBreak?: boolean;
}

/**
 * Map session status to display color.
 * These are UI colors only — the policy that triggers WARNING/LIMIT_REACHED
 * lives in the parent hook, not here.
 */
function getStatusColor(status: SessionStatus): string {
  switch (status) {
    case 'NORMAL':
      return COLORS.primary;
    case 'WARNING':
      return '#FFB800'; // amber — warning state
    case 'LIMIT_REACHED':
      return COLORS.coral; // coral/red — limit reached
    case 'BREAK':
      return COLORS.textMuted;
    case 'COMPLETED':
      return COLORS.success;
    default:
      return COLORS.primary;
  }
}

/**
 * Map session status to label text.
 */
function getStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'NORMAL':
      return 'Thời gian học';
    case 'WARNING':
      return 'Cảnh báo';
    case 'LIMIT_REACHED':
      return 'Hết giờ';
    case 'BREAK':
      return 'Nghỉ giải lao';
    case 'COMPLETED':
      return 'Hoàn thành';
    default:
      return 'Thời gian học';
  }
}

export const SessionTimeIndicator: React.FC<SessionTimeIndicatorProps> = ({
  elapsedSeconds,
  status,
  breakRemainingSeconds = 0,
  isInBreak = false,
}) => {
  const displaySeconds = isInBreak ? breakRemainingSeconds : elapsedSeconds;
  const timeString = formatSessionTime(displaySeconds);
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <View style={[styles.container, { borderColor: color + '40' }]}>
      <Text style={[styles.label, { color: COLORS.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.time, { color }]}>{timeString}</Text>
      {status === 'WARNING' && (
        <Text style={[styles.hint, { color: '#FFB800' }]}>
          Sắp hết thời gian
        </Text>
      )}
      {status === 'LIMIT_REACHED' && (
        <Text style={[styles.hint, { color: COLORS.coral }]}>
          Đã hết thời gian học
        </Text>
      )}
      {status === 'BREAK' && (
        <Text style={[styles.hint, { color: COLORS.textMuted }]}>
          Vui lòng nghỉ ngơi
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    minWidth: 120,
  },
  label: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SessionTimeIndicator;
