/**
 * LessonCard — premium clay lesson list item for CourseDetailScreen.
 *
 * Anatomy:
 *   ┌─────────────────────────────────────────┐
 *   │  [N]  Title                     [CTA]  │
 *   │       Subtitle / vocabulary count        │
 *   │  [■■■■ completed ■■ pending]           │
 *   └─────────────────────────────────────────┘
 *
 * States:
 *   - not_started: white card, muted index
 *   - started: white card, blue index, progress hint
 *   - completed: green-tinted card, green index, checkmark
 *
 * Replaces LessonRow with premium claymorphic design.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayIcon } from './icons/ClayIcons';
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  BRAND,
  withOpacity,
  FEATURE_TONES,
} from '../design/tokens';

export type LessonStatus = 'not_started' | 'started' | 'completed';

export interface LessonCardProps {
  index: number;
  title: string;
  subtitle?: string;
  vocabularyCount?: number;
  status?: LessonStatus;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const STATUS_CONFIG: Record<
  LessonStatus,
  { bg: string; indexBg: string; indexColor: string; checkColor: string }
> = {
  not_started: {
    bg: COLORS.white,
    indexBg: withOpacity(BRAND.skyBlue, 0.18),
    indexColor: BRAND.skyBlueDark,
    checkColor: 'transparent',
  },
  started: {
    bg: COLORS.white,
    indexBg: BRAND.skyBlue,
    indexColor: COLORS.white,
    checkColor: 'transparent',
  },
  completed: {
    bg: withOpacity(BRAND.mintGreen, 0.08),
    indexBg: BRAND.mintGreen,
    indexColor: COLORS.white,
    checkColor: BRAND.mintGreenDark,
  },
};

export const LessonCard: React.FC<LessonCardProps> = ({
  index,
  title,
  subtitle,
  vocabularyCount,
  status = 'not_started',
  onPress,
}) => {
  const pressed = useSharedValue(0);
  const cfg = STATUS_CONFIG[status];

  const cardAnimated = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(pressed.value ? 2 : 0, { damping: 14, stiffness: 200 }) },
      { scale: withSpring(pressed.value ? 0.985 : 1, { damping: 14, stiffness: 200 }) },
    ],
  }));

  const isCompleted = status === 'completed';
  const isStarted = status === 'started';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { pressed.value = 1; }}
      onPressOut={() => { pressed.value = 0; }}
      style={styles.container}
    >
      <Animated.View style={[cardAnimated]}>
        <ClayCard variant="md" padding={0} onPress={onPress}>
          <View
            style={[
              styles.inner,
              { backgroundColor: cfg.bg },
              isCompleted && styles.innerCompleted,
            ]}
          >
            {/* Index badge */}
            <View style={[styles.indexBadge, { backgroundColor: cfg.indexBg }]}>
              {isCompleted ? (
                <ClayIcon
                  name="check"
                  size={14}
                  color={COLORS.white}
                  strokeWidth={2.5}
                />
              ) : (
                <Text style={[styles.indexText, { color: cfg.indexColor }]}>
                  {index}
                </Text>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text
                style={[
                  styles.title,
                  (isCompleted || isStarted) && styles.titleActive,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : vocabularyCount ? (
                <Text style={styles.subtitle}>
                  {vocabularyCount} từ vựng
                </Text>
              ) : null}

              {/* Status progress hint */}
              {isStarted && (
                <View style={styles.progressHintRow}>
                  <View style={styles.progressHintTrack}>
                    <View
                      style={[styles.progressHintFill, { width: '35%' }]}
                    />
                  </View>
                  <Text style={styles.progressHintText}>Đang học</Text>
                </View>
              )}
              {isCompleted && (
                <View style={styles.completedRow}>
                  <ClayIcon
                    name="check"
                    size={12}
                    color={BRAND.mintGreenDark}
                    strokeWidth={2.5}
                  />
                  <Text style={styles.completedText}>Hoàn thành</Text>
                </View>
              )}
            </View>

            {/* Arrow CTA */}
            <View style={styles.cta}>
              <ClayIcon
                name="arrowRight"
                size={18}
                color={
                  isCompleted
                    ? BRAND.mintGreenDark
                    : isStarted
                    ? BRAND.skyBlueDark
                    : COLORS.textMuted
                }
              />
            </View>
          </View>
        </ClayCard>
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    overflow: 'hidden',
  },
  innerCompleted: {
    borderLeftColor: BRAND.mintGreen,
  },
  indexBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
    flexShrink: 0,
  },
  indexText: {
    fontSize: 15,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
  },
  title: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  titleActive: {
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  progressHintTrack: {
    height: 4,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.2),
    borderRadius: 2,
    flex: 1,
    overflow: 'hidden',
  },
  progressHintFill: {
    height: '100%',
    backgroundColor: BRAND.skyBlue,
    borderRadius: 2,
  },
  progressHintText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: BRAND.skyBlueDark,
    flexShrink: 0,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  completedText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: BRAND.mintGreenDark,
  },
  cta: {
    flexShrink: 0,
  },
});

export default LessonCard;
