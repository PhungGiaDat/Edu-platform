/**
 * CourseCard — claymorphic summary card for a single course. Used by CourseListScreen.
 * Reads CATEGORY_COLORS via LessonCategoryBadge. Composes ClayCard + ClayProgressBar.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayProgressBar } from './ClayProgressBar';
import { LessonCategoryBadge } from './LessonCategoryBadge';
import { COLORS, FONT, SPACING } from '../design/tokens';
import { Course } from '../types/course';

export interface CourseCardProps {
  course: Course & { category?: string | null };
  /** 0..1. Optional — when supplied, renders a clay progress bar. */
  progress?: number;
  /** Optional label under progress (e.g. "3 / 6 lessons"). */
  progressLabel?: string;
  /** Trailing CTA label ("Start learning" / "Continue learning"). */
  ctaLabel?: string;
  style?: ViewStyle;
  onPress?: () => void;
  onCtaPress?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  progress,
  progressLabel,
  ctaLabel,
  style,
  onPress,
  onCtaPress,
}) => {
  const clampedProgress =
    typeof progress === 'number' ? Math.min(Math.max(progress, 0), 1) : undefined;

  return (
    <ClayCard
      variant="md"
      color="white"
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <LessonCategoryBadge category={course.category} />
          <Text style={styles.lessonCount}>
            {course.lesson_count ?? 0} lessons
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>

        <Text style={styles.description} numberOfLines={3}>
          {course.description}
        </Text>

        {typeof clampedProgress === 'number' ? (
          <View style={styles.progressBlock}>
            <ClayProgressBar
              progress={clampedProgress}
              fillColor={COLORS.primary}
              height={8}
              showShimmer
              style={styles.progress}
            />
            {progressLabel ? (
              <Text style={styles.progressLabel}>{progressLabel}</Text>
            ) : null}
          </View>
        ) : null}

        {ctaLabel ? (
          <View style={styles.ctaRow}>
            <Text style={styles.ctaLabel}>{ctaLabel}</Text>
            {onCtaPress ? (
              <Text style={styles.ctaArrow} onPress={onCtaPress}>
                ›
              </Text>
            ) : (
              <Text style={styles.ctaArrow}>›</Text>
            )}
          </View>
        ) : null}
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  lessonCount: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  progressBlock: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  progress: {
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  ctaLabel: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: SPACING.xs,
  },
  ctaArrow: {
    fontSize: FONT.sizes.xl,
    color: COLORS.primary,
    fontWeight: '800',
  },
});

export default CourseCard;
