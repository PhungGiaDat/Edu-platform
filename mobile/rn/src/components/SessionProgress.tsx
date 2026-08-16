/**
 * SessionProgress — policy-neutral progress display for learning session.
 *
 * Shows step progress as a reusable visual component.
 * The progress ratio (0..1) is computed by the parent hook and passed as prop.
 * No hardcoded thresholds or business logic embedded here.
 *
 * Visual: animated circular progress ring (reuses ProgressRing) + step counter.
 *
 * Props are intentionally minimal — the parent owns all policy decisions.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressRing } from './ProgressRing';
import { COLORS, FONT } from '../design/tokens';

export interface SessionProgressProps {
  /** 0..1 progress ratio. Safe for 0/total cases. */
  progressRatio: number;
  /** Completed step count. */
  completedCount: number;
  /** Total step count. */
  totalCount: number;
  /** Label above the ring (e.g. lesson title). Optional. */
  label?: string;
  /** Ring size in px. Default 100. */
  size?: number;
  /** Custom ring color. Default uses primary. */
  color?: string;
}

export const SessionProgress: React.FC<SessionProgressProps> = ({
  progressRatio,
  completedCount,
  totalCount,
  label,
  size = 100,
  color,
}) => {
  const safeRatio = Math.min(1, Math.max(0, progressRatio));
  const percentage = Math.round(safeRatio * 100);
  const stepLabel = `${completedCount} / ${totalCount}`;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.ringWrapper}>
        <ProgressRing
          progress={safeRatio}
          size={size}
          strokeWidth={9}
          color={color ?? COLORS.primary}
          bgColor="rgba(110,185,255,0.15)"
          label={`${percentage}%`}
          sublabel="hoàn thành"
        />
      </View>
      <Text style={styles.stepLabel}>{stepLabel}</Text>
      <Text style={styles.stepHint}>bài học đã hoàn thành</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  stepHint: {
    fontSize: FONT.sizes.xs,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});

export default SessionProgress;
