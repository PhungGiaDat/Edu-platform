/**
 * EnrollmentCTA — vibrant enrollment call-to-action banner.
 *
 * Inline or sticky CTA with shimmer button animation.
 * Used on HomeScreen, CourseListScreen, and ProfileScreen.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { ClayIcon } from './icons/ClayIcons';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';

export interface EnrollmentCTAProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  icon?: string;
  onPress?: () => void;
  compact?: boolean;
}

export const EnrollmentCTA: React.FC<EnrollmentCTAProps> = ({
  title = 'Bắt đầu hành trình học tập!',
  subtitle = 'Đăng ký ngay để nhận ưu đãi đặc biệt cho học viên mới',
  ctaLabel = 'Đăng ký miễn phí',
  icon = 'sparkle',
  onPress,
  compact = false,
}) => {
  // Shimmer animation on the icon
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [shimmer]);

  const iconShimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.6, 1]),
    transform: [{ scale: interpolate(shimmer.value, [0, 1], [0.9, 1.1]) }],
  }));

  return (
    <ClayCard
      variant={compact ? 'lg' : 'xl'}
      color="white"
      padding={compact ? SPACING.md : SPACING.base}
    >
      <View style={[styles.inner, compact && styles.innerCompact]}>
        {/* Icon */}
        <Animated.View style={[styles.iconWell, iconShimmerStyle]}>
          <View style={styles.iconCircle}>
            <ClayIcon name={icon as never} size={compact ? 22 : 28} color={BRAND.vibrantOrangeDark} />
          </View>
        </Animated.View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={[styles.title, compact && styles.titleCompact]}>
            {title}
          </Text>
          {!compact && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* CTA Button */}
        {onPress ? (
          <ClayButton
            color="yellow"
            variant="md"
            onPress={onPress}
            style={[styles.button, compact && styles.buttonCompact]}
          >
            <Text style={styles.buttonText}>{ctaLabel}</Text>
          </ClayButton>
        ) : (
          <View style={[styles.button, compact && styles.buttonCompact, styles.buttonPlaceholder]}>
            <Text style={styles.buttonText}>{ctaLabel}</Text>
          </View>
        )}
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  innerCompact: {
    gap: SPACING.sm,
  },
  iconWell: {},
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(BRAND.vibrantOrange, 0.15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: FONT.sizes.lg,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  titleCompact: {
    fontSize: FONT.sizes.md,
  },
  subtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  button: {
    flexShrink: 0,
    paddingHorizontal: SPACING.md,
  },
  buttonCompact: {
    paddingHorizontal: SPACING.sm,
  },
  buttonPlaceholder: {
    backgroundColor: withOpacity(BRAND.sunshineYellow, 0.5),
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  buttonText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});

export default EnrollmentCTA;
