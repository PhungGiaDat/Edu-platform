/**
 * ClayContinueCard — the Home screen's PRIMARY CTA.
 *
 * Large, dominant clay card. Replaces the previous "Continue Learning" tile
 * with a hero-sized CTA:
 *
 *   ┌─────────────────────────────────────┐
 *   │  CONTINUE LEARNING      ⚡ 480 XP  │
 *   │  ────────────────────               │
 *   │  Momo Explores Animals and Nature   │
 *   │  Beginner Journey                   │
 *   │                                     │
 *   │  [▓▓▓▓▓▓▓▓░░░░░] Progress   Start › │
 *   └─────────────────────────────────────┘
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  withOpacity,
} from '../design/tokens';

export interface ClayContinueCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  difficulty?: string;
  progress?: number; // 0..1
  progressLabel?: string;
  xpReward?: number;
  ctaLabel?: string;
  onPress?: () => void;
  // When user has no current lesson
  empty?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ClayContinueCard: React.FC<ClayContinueCardProps> = ({
  eyebrow = 'Tiếp tục học',
  title,
  subtitle,
  difficulty,
  progress = 0,
  progressLabel,
  xpReward,
  ctaLabel = 'Bắt đầu',
  onPress,
  empty = false,
  style,
}) => {
  const pressed = useSharedValue(0);
  const fillProgress = useSharedValue(0);

  useEffect(() => {
    fillProgress.value = withTiming(progress, { duration: 900 });
  }, [progress, fillProgress]);

  const animatedCard = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(pressed.value ? 2 : 0, { damping: 14, stiffness: 200 }) },
      { scale: withSpring(pressed.value ? 0.985 : 1, { damping: 14, stiffness: 200 }) },
    ],
    shadowOffset: {
      width: 0,
      height: withSpring(pressed.value ? 6 : 18, { damping: 14, stiffness: 200 }),
    },
  }));

  const animatedFill = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { pressed.value = 1; }}
      onPressOut={() => { pressed.value = 0; }}
      style={style}
    >
      <Animated.View
        style={[
          styles.outer,
          SHADOWS.clayMd,
          animatedCard,
        ]}
      >
        {/* Top color band */}
        <View style={styles.topBand}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          {xpReward !== undefined ? (
            <View style={styles.xpPill}>
              <Text style={styles.xpIcon}>⚡</Text>
              <Text style={styles.xpText}>{xpReward} XP</Text>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <View style={styles.body}>
          <Text
            style={[styles.title, empty && styles.titleEmpty]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          {/* Difficulty chip */}
          {difficulty ? (
            <View style={styles.difficultyChip}>
              <Text style={styles.difficultyText}>{difficulty}</Text>
            </View>
          ) : null}

          {/* Progress */}
          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, animatedFill]} />
            </View>
            <View style={styles.progressMetaRow}>
              <Text style={styles.progressLabel}>{progressLabel}</Text>
              <Text style={styles.ctaLabel}>{ctaLabel} →</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  outer: {
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    shadowColor: BRAND.sunshineYellowDark,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withOpacity(BRAND.sunshineYellow, 0.4),
  },
  topBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    backgroundColor: BRAND.sunshineYellowLight,
  },
  eyebrow: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.deepSlate,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  xpIcon: {
    fontSize: 14,
  },
  xpText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: COLORS.white,
  },
  body: {
    padding: SPACING.base,
  },
  title: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 30,
  },
  titleEmpty: {
    fontSize: FONT.sizes.xl,
  },
  subtitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  difficultyChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: withOpacity(BRAND.mintGreenDark, 0.15),
    marginBottom: SPACING.base,
  },
  difficultyText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: BRAND.mintGreenDark,
  },
  progressBlock: {
    marginTop: SPACING.sm,
  },
  progressTrack: {
    height: 8,
    backgroundColor: withOpacity(BRAND.sunshineYellow, 0.2),
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND.sunshineYellow,
    borderRadius: RADIUS.pill,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  ctaLabel: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
  },
});

export default ClayContinueCard;
