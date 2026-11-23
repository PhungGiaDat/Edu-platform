/**
 * CompletionShell — presentation layer for lesson/session completion.
 *
 * This is the END state of the session shell. It is shown when:
 *   - status === 'COMPLETED'
 *   - OR progressRatio === 1
 *
 * The shell is intentionally MINIMAL — it does NOT include:
 *   - XP amount (backend concern)
 *   - Reward/sticker animation (gamification lane)
 *   - Backend mutation
 *   - Backend completion API call
 *
 * It shows:
 *   - Celebration message
 *   - Progress summary
 *   - Continue / Back navigation actions
 *
 * The parent screen owns the backend call for lesson completion.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { ProgressRing } from './ProgressRing';
import { COLORS, FONT, SPACING } from '../design/tokens';

export interface CompletionShellProps {
  /** Lesson/session title. */
  title?: string;
  /** Completed item count. */
  completedCount: number;
  /** Total item count. */
  totalCount: number;
  /** Final progress ratio (0..1). */
  progressRatio: number;
  /** Called when user taps "Tiếp tục". */
  onContinue?: () => void;
  /** Called when user taps "Quay về". */
  onBack?: () => void;
  /** Continue button label. Default "Tiếp tục". */
  continueLabel?: string;
}

export const CompletionShell: React.FC<CompletionShellProps> = ({
  title,
  completedCount,
  totalCount,
  progressRatio,
  onContinue,
  onBack,
  continueLabel = 'Tiếp tục',
}) => {
  const safeRatio = Math.min(1, Math.max(0, progressRatio));
  const isPerfect = safeRatio >= 1;

  return (
    <View style={styles.container}>
      <Text style={styles.celebrationEmoji}>{isPerfect ? '🎉' : '🌟'}</Text>
      <Text style={styles.title}>
        {isPerfect ? 'Xuất sắc!' : 'Đã hoàn thành!'}
      </Text>
      {title ? <Text style={styles.lessonTitle}>{title}</Text> : null}

      <ClayCard variant="md" color="white" style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>đã học</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>tổng số</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              {Math.round(safeRatio * 100)}%
            </Text>
            <Text style={styles.summaryLabel}>hoàn thành</Text>
          </View>
        </View>
      </ClayCard>

      <ProgressRing
        progress={safeRatio}
        size={140}
        strokeWidth={12}
        color={isPerfect ? COLORS.success : COLORS.primary}
        bgColor="rgba(76,175,80,0.12)"
        label={`${Math.round(safeRatio * 100)}%`}
        sublabel={isPerfect ? 'hoàn hảo!' : 'tốt lắm'}
      />

      <Text style={styles.message}>
        {isPerfect
          ? 'Bạn đã hoàn thành tất cả bài học!'
          : 'Bạn đã học được nhiều điều mới!'
        }
      </Text>

      <View style={styles.buttonRow}>
        {onBack && (
          <ClayButton
            color="green"
            onPress={onBack}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Quay về</Text>
          </ClayButton>
        )}
        {onContinue && (
          <ClayButton
            color="blue"
            onPress={onContinue}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{continueLabel}</Text>
          </ClayButton>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  celebrationEmoji: {
    fontSize: 64,
  },
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  lessonTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    width: '100%',
    padding: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  buttonText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.textMuted + '30',
  },
  message: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginTop: SPACING.sm,
  },
  button: {
    flex: 1,
  },
});

export default CompletionShell;
