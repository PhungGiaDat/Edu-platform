/**
 * SessionWarningModal — state-driven warning modal.
 *
 * VISIBLE when status === 'WARNING' (driven by parent, not hardcoded threshold).
 *
 * Shows a child-friendly warning with:
 *   - Encouraging message
 *   - "Nghỉ giải lao" button (starts break)
 *   - "Tiếp tục học" button (dismiss and continue)
 *
 * The WARNING threshold is NOT embedded here.
 * The parent hook computes status from config + elapsedSeconds.
 */
import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { ClayButton } from './ClayButton';
import { ClayCard } from './ClayCard';
import { COLORS, FONT, RADIUS, SPACING } from '../design/tokens';

export interface SessionWarningModalProps {
  visible: boolean;
  onDismissWarning?: () => void;
  onStartBreak?: () => void;
  breakSeconds?: number;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  visible,
  onDismissWarning,
  onStartBreak,
  breakSeconds = 300,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismissWarning}
    >
      <View style={styles.backdrop}>
        <ClayCard variant="lg" color="white" style={styles.card}>
          {/* Warning icon */}
          <View style={styles.iconWrapper}>
            <Text style={styles.iconText}>⏰</Text>
          </View>

          <Text style={styles.title}>Sắp hết thời gian!</Text>
          <Text style={styles.message}>
            Bạn đã học rất tốt rồi.{'\n'}
            Có thể nghỉ giải lao một chút để nhớ lâu hơn nhé.
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
            {onDismissWarning && (
              <ClayButton
                color="blue"
                onPress={onDismissWarning}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Tiếp tục học</Text>
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
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    backgroundColor: 'rgba(255,184,0,0.15)',
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
    color: '#FFB800',
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

export default SessionWarningModal;
