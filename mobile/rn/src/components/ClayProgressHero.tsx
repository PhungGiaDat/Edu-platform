/**
 * ClayProgressHero — single coherent progress surface for the Home screen.
 *
 * Combines:
 *   - Level badge (left)
 *   - XP progress bar (right, takes remaining width)
 *   - XP / streak meta row
 *
 * Replaces disconnected XP + streak cards with one cohesive hero card.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayProgressBar } from './ClayProgressBar';
import {
  BRAND,
  COLORS,
  FEATURE_TONES,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';

export interface ClayProgressHeroProps {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  streakDays: number;
  style?: StyleProp<ViewStyle>;
}

export const ClayProgressHero: React.FC<ClayProgressHeroProps> = ({
  level,
  currentXP,
  xpToNextLevel,
  streakDays,
  style,
}) => {
  const total = currentXP + Math.max(xpToNextLevel, 1);
  const progress = Math.min(currentXP / total, 1);
  const xpRemaining = Math.max(xpToNextLevel, 0);
  const tone = FEATURE_TONES.progress;

  return (
    <ClayCard
      variant="xl"
      color="white"
      padding={0}
      style={style}
    >
      <View style={[styles.container, { backgroundColor: tone.bg }]}>
        {/* Top row: Level + Streak */}
        <View style={styles.topRow}>
          {/* Level badge */}
          <View style={[styles.levelBadge, { backgroundColor: tone.iconBg }]}>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={styles.levelNumber}>{level}</Text>
          </View>

          {/* XP + Streak meta */}
          <View style={styles.metaRight}>
            <View style={[styles.metaPill, { backgroundColor: COLORS.white }]}>
              <Text style={styles.metaIcon}>⭐</Text>
              <Text style={styles.metaValue}>{currentXP}</Text>
              <Text style={styles.metaLabel}>XP</Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: BRAND.coralPinkLight }]}>
              <Text style={styles.metaIcon}>🔥</Text>
              <Text style={[styles.metaValue, { color: BRAND.coralPinkDark }]}>
                {streakDays}
              </Text>
              <Text style={[styles.metaLabel, { color: BRAND.coralPinkDark }]}>
                ngày
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBlock}>
          <ClayProgressBar
            progress={progress}
            fillColor={tone.accent}
            trackColor={withOpacity(tone.accent, 0.15)}
            height={12}
            showShimmer={progress < 1}
            style={styles.progressBar}
          />
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressMeta}>
              {currentXP} / {total} XP
            </Text>
            <Text style={[styles.progressMeta, styles.progressMetaRight]}>
              Còn {xpRemaining} XP
            </Text>
          </View>
        </View>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.base,
  },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  levelLabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
  },
  levelNumber: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '900',
    color: COLORS.white,
    marginTop: -2,
  },
  metaRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  metaIcon: {
    fontSize: FONT.sizes.md,
  },
  metaValue: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
  },
  metaLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  progressBlock: {
    marginTop: SPACING.xs,
  },
  progressBar: {
    marginBottom: SPACING.sm,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressMeta: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  progressMetaRight: {
    color: '#5673E5',
  },
});

export default ClayProgressHero;
