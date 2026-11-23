/**
 * SessionBreakOverlay — full-screen overlay shown during break/cooldown.
 *
 * VISIBLE when status === 'BREAK' (driven by parent, not hardcoded threshold).
 *
 * Full-screen blocking overlay during break phase:
 *   - Shows countdown timer
 *   - Encouraging message for children
 *   - Optional "Kết thúc nghỉ" early-exit button
 *
 * The BREAK threshold and duration are NOT embedded here.
 * The parent hook manages break countdown via session shell reducer.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayButton } from './ClayButton';
import { COLORS, FONT, SPACING } from '../design/tokens';
import { formatSessionTime } from '../types/session-state';

export interface SessionBreakOverlayProps {
  visible: boolean;
  /** Seconds remaining in break. */
  breakRemainingSeconds: number;
  /** Allow user to end break early. */
  onEndBreak?: () => void;
}

export const SessionBreakOverlay: React.FC<SessionBreakOverlayProps> = ({
  visible,
  breakRemainingSeconds,
  onEndBreak,
}) => {
  if (!visible) return null;

  const timeString = formatSessionTime(breakRemainingSeconds);

  return (
    <View style={styles.backdrop}>
      <View style={styles.content}>
        {/* Break illustration */}
        <Text style={styles.emoji}>🌿</Text>
        <Text style={styles.title}>Đang nghỉ giải lao</Text>
        <Text style={styles.timer}>{timeString}</Text>
        <Text style={styles.message}>
          Thư giãn một chút,{'\n'}
          nhìn ra cửa sổ,{'\n'}
          hít thở sâu...{'\n'}
          Não bộ đang ghi nhớ đó!
        </Text>
        {onEndBreak && (
          <View style={styles.buttonWrapper}>
            <ClayButton
              color="green"
              onPress={onEndBreak}
            >
              <Text style={styles.buttonText}>Kết thúc nghỉ</Text>
            </ClayButton>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 225, 151, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  content: {
    alignItems: 'center',
    padding: SPACING.xl,
    maxWidth: 320,
    gap: SPACING.md,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  timer: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  message: {
    fontSize: FONT.sizes.lg,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 8,
  },
  buttonWrapper: {
    marginTop: SPACING.lg,
    width: '100%',
  },
  buttonText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default SessionBreakOverlay;
