import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayProgressBar } from './ClayProgressBar';
import { COLORS, SPACING } from '../design/tokens';

interface ProgressTrackerProps {
  currentXP: number;
  maxXP: number;
  level: number;
}

/**
 * ProgressTracker — displays user XP progress and level with claymorphic styling.
 * Uses ClayProgressBar with shimmer, ClayCard wrappers, and claymorphic badge.
 */
export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  currentXP = 0,
  maxXP = 100,
  level = 1,
}) => {
  const progress = Math.min(currentXP / maxXP, 1);

  return (
    <ClayCard variant="sm" color="white" padding={12} style={styles.container}>
      <View style={styles.content}>
        {/* Level badge */}
        <ClayCard variant="sm" color="yellow" padding={6} style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv.{level}</Text>
        </ClayCard>

        {/* XP progress */}
        <View style={styles.progressSection}>
          <ClayProgressBar
            progress={progress}
            fillColor={COLORS.primary}
            height={10}
            showShimmer
            style={styles.progressBar}
          />
          <Text style={styles.xpText}>
            {currentXP} / {maxXP} XP
          </Text>
        </View>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    marginRight: SPACING.md,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  progressSection: {
    flex: 1,
  },
  progressBar: {
    marginBottom: 4,
  },
  xpText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'right',
    fontWeight: '500',
  },
});
