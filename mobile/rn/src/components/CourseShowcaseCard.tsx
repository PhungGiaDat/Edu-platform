/**
 * CourseShowcaseCard — hero-sized course preview card.
 *
 * Full claymorphic card with gradient header, category badge, title,
 * subtitle, difficulty chip, progress bar, XP reward pill, and CTA.
 * Used as the featured/hero card on HomeScreen and CourseListScreen.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { ClayProgressBar } from './ClayProgressBar';
import { ClayIcon } from './icons/ClayIcons';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CourseShowcaseCardProps {
  // Data
  title: string;
  subtitle?: string;
  categoryLabel?: string;
  categoryColor?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  progress?: number; // 0..1
  xpReward?: number;
  lessonCount?: number;
  completedCount?: number;
  // CTA
  ctaLabel?: string;
  onCtaPress?: () => void;
  onPress?: () => void;
  // Visual variants
  size?: 'sm' | 'md' | 'lg';
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  beginner: { bg: withOpacity(BRAND.mintGreen, 0.2), text: BRAND.mintGreenDark },
  intermediate: { bg: withOpacity(BRAND.sunshineYellow, 0.2), text: BRAND.sunshineYellowDark },
  advanced: { bg: withOpacity(BRAND.coralPink, 0.2), text: BRAND.coralPinkDark },
};

const GRADIENT_PALETTES: Record<string, readonly [string, string]> = {
  Animals: [withOpacity(BRAND.coralPink, 0.3), withOpacity(BRAND.coralPinkLight, 0.1)],
  Nature: [withOpacity(BRAND.skyBlue, 0.3), withOpacity(BRAND.skyBlueLight, 0.1)],
  Food: [withOpacity(BRAND.mintGreen, 0.3), withOpacity(BRAND.mintGreenLight, 0.1)],
  Family: [withOpacity(BRAND.sunshineYellow, 0.3), withOpacity(BRAND.sunshineYellowLight, 0.1)],
};

export const CourseShowcaseCard: React.FC<CourseShowcaseCardProps> = ({
  title,
  subtitle,
  categoryLabel,
  categoryColor = BRAND.skyBlue,
  difficulty,
  progress = 0,
  xpReward,
  lessonCount,
  completedCount = 0,
  ctaLabel = 'Học ngay',
  onCtaPress,
  onPress,
  size = 'lg',
}) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(pressed.value ? 3 : 0, { damping: 14, stiffness: 180 }) },
      { scale: withSpring(pressed.value ? 0.985 : 1, { damping: 14, stiffness: 180 }) },
    ],
  }));

  const gradientKey = categoryLabel ?? 'Nature';
  const gradientColors = GRADIENT_PALETTES[gradientKey] ?? GRADIENT_PALETTES['Nature'];
  const diffStyle = difficulty ? DIFFICULTY_COLORS[difficulty] : null;
  const hasProgress = completedCount > 0 || progress > 0;
  const cardPadding = size === 'lg' ? SPACING.base : SPACING.md;

  return (
    <AnimatedPressable
      onPress={onPress ?? onCtaPress}
      onPressIn={() => { pressed.value = 1; }}
      onPressOut={() => { pressed.value = 0; }}
    >
      <Animated.View style={animatedStyle}>
        <ClayCard variant="xl" color="white" padding={0}>
          <View>
            {/* ─── Gradient header ─────────────────────────────── */}
            <LinearGradient
              colors={[gradientColors[0], gradientColors[1]] as unknown as React.ComponentProps<typeof LinearGradient>['colors']}
              style={[
                styles.header,
                { padding: cardPadding, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl },
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerTop}>
                {/* Category badge */}
                {categoryLabel ? (
                  <View style={[styles.categoryBadge, { backgroundColor: withOpacity(categoryColor, 0.2) }]}>
                    <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                      {categoryLabel}
                    </Text>
                  </View>
                ) : null}

                {/* XP reward pill */}
                {xpReward ? (
                  <View style={[styles.xpPill, { backgroundColor: withOpacity(BRAND.sunshineYellow, 0.25) }]}>
                    <ClayIcon name="bolt" size={12} color={BRAND.sunshineYellowDark} />
                    <Text style={styles.xpPillText}>+{xpReward} XP</Text>
                  </View>
                ) : null}
              </View>

              {/* Title */}
              <Text style={styles.title} numberOfLines={2}>{title}</Text>

              {/* Subtitle */}
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
              ) : null}
            </LinearGradient>

            {/* ─── Card body ───────────────────────────────────── */}
            <View style={[styles.body, { padding: cardPadding }]}>
              <View style={styles.bodyTop}>
                {/* Meta row */}
                <View style={styles.metaRow}>
                  {lessonCount ? (
                    <Text style={styles.metaText}>📚 {lessonCount} bài học</Text>
                  ) : null}
                  {difficulty ? (
                    diffStyle ? (
                      <View style={[styles.diffChip, { backgroundColor: diffStyle.bg }]}>
                        <Text style={[styles.diffChipText, { color: diffStyle.text }]}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </Text>
                      </View>
                    ) : null
                  ) : null}
                </View>
              </View>

              {/* Progress bar */}
              {hasProgress ? (
                <View style={styles.progressSection}>
                  <ClayProgressBar
                    progress={progress}
                    fillColor={BRAND.neonTeal}
                    trackColor={withOpacity(BRAND.neonTeal, 0.12)}
                    height={8}
                    style={{ marginBottom: 4 }}
                  />
                  <Text style={styles.progressLabel}>
                    {completedCount}/{lessonCount ?? '?'} hoàn thành
                  </Text>
                </View>
              ) : null}

              {/* CTA */}
              {onCtaPress ? (
                <ClayButton
                  color="yellow"
                  style={styles.cta}
                  onPress={onCtaPress}
                >
                  <Text style={styles.ctaText}>{ctaLabel}</Text>
                  <ClayIcon name="arrowRight" size={16} color={BRAND.sunshineYellowDark} />
                </ClayButton>
              ) : null}
            </View>
          </View>
        </ClayCard>
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: SPACING.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  categoryBadgeText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  xpPillText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
  },
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  body: {
    gap: SPACING.md,
  },
  bodyTop: {},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  diffChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  diffChipText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
  },
  progressSection: {
    gap: 4,
  },
  progressLabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  cta: {
    marginTop: SPACING.xs,
  },
  ctaText: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
});

export default CourseShowcaseCard;
