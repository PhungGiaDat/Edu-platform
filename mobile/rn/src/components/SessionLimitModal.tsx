/**
 * SessionLimitModal — state-driven hard-limit reached modal.
 *
 * VISIBLE when status === 'LIMIT_REACHED' (driven by parent, not hardcoded threshold).
 *
 * Shows a child-friendly message when the session limit is reached.
 * Options:
 *   - "Bắt đầu nghỉ giải lao" (start break)
 *   - "Kết thúc buổi học" (end session)
 *
 * The LIMIT threshold is NOT embedded here.
 * The parent hook computes status from config + elapsedSeconds.
 */
import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { ClayButton } from './ClayButton';
import { ClayCard } from './ClayCard';
import { COLORS, FONT, RADIUS, SPACING } from '../design/tokens';
import { formatSessionTime } from '../types/session-state';

export interface SessionLimitModalProps {
  visible: boolean;
  breakRemainingSeconds?: number;
  onStartBreak?: () => void;
  onEndSession?: () => void;
  breakSeconds?: number;
}

export const SessionLimitModal: React.FC<SessionLimitModalProps> = ({
  visible,
  breakRemainingSeconds = 0,
  onStartBreak,
  onEndSession,
  breakSeconds = 300,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onEndSession}
    >
      <View style={styles.backdrop}>
        <ClayCard variant="lg" color="white" style={styles.card}>
          {/* Limit icon */}
          <View style={styles.iconWrapper}>
            <Text style={styles.iconText}>⏱️</Text>
          </View>

          <Text style={styles.title}>Hết giờ học rồi!</Text>
          <Text style={styles.message}>
            Buổi học hôm nay đã kết thúc.{'\n'}
            Bạn đã làm rất tốt!{'\n'}
            {breakRemainingSeconds > 0
              ? `Nghỉ giải lao ${formatSessionTime(breakRemainingSeconds)} rồi tiếp tục nhé.`
              : 'Hãy nghỉ giải lao một chút.'}
          </Text>

          <View style={styles.buttonRow}>
            {onStartBreak && (
              <ClayButton
                color="green"
                onPress={onStartBreak}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Nghỉ giải lao</Text>
              </ClayButton>
            )}
            {onEndSession && (
              <ClayButton
                color="blue"
                onPress={onEndSession}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Kết thúc</Text>
              </ClayButton>
            )}
          </View>
        </ClayCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,107,107,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: COLORS.coral,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    width: '100%',
  },
  button: {
    flex: 1,
  },
  buttonText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default SessionLimitModal;
