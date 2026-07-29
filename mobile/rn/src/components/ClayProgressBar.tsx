import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, SHADOWS, RADIUS, ANIMATION } from '../design/tokens';

export interface ClayProgressBarProps {
  progress: number; // 0.0 – 1.0
  fillColor?: string;
  trackColor?: string;
  height?: number;
  borderRadius?: number;
  showShimmer?: boolean;
  style?: ViewStyle;
}

/**
 * Claymorphic progress bar with animated fill and shimmer effect.
 * Uses native boxShadow for clay styling and Reanimated for smooth animation.
 */
export const ClayProgressBar: React.FC<ClayProgressBarProps> = ({
  progress,
  fillColor = COLORS.primary,
  trackColor = 'rgba(0,0,0,0.10)',
  height = 12,
  borderRadius,
  showShimmer = true,
  style,
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const animatedProgress = useSharedValue(0);
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [clampedProgress, animatedProgress]);

  useEffect(() => {
    if (showShimmer && clampedProgress < 1) {
      const animateShimmer = () => {
        shimmerPosition.value = -1;
        shimmerPosition.value = withTiming(1, {
          duration: ANIMATION.shimmerDuration,
          easing: Easing.linear,
        });
      };
      animateShimmer();
      const interval = setInterval(animateShimmer, ANIMATION.shimmerDuration);
      return () => clearInterval(interval);
    }
  }, [showShimmer, clampedProgress, shimmerPosition]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value * 100}%`,
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    if (!showShimmer || clampedProgress >= 1) {
      return { opacity: 0 };
    }
    return {
      opacity: 0.5,
      left: `${shimmerPosition.value * 100}%`,
    };
  });

  const radius = borderRadius ?? RADIUS.sm;

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: radius,
          shadowColor: SHADOWS.claySm.shadowColor,
          shadowOffset: SHADOWS.claySm.shadowOffset,
          shadowOpacity: SHADOWS.claySm.shadowOpacity,
          shadowRadius: SHADOWS.claySm.shadowRadius,
          elevation: SHADOWS.claySm.elevation,
        },
        style,
      ]}
    >
      <View style={[styles.fillContainer, { borderRadius: radius }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: fillColor, borderRadius: radius },
            fillStyle,
          ]}
        />
        {showShimmer && (
          <Animated.View style={[styles.shimmerContainer, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.6)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.shimmer, { borderRadius: radius }]}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(0,0,0,0.10)',
    overflow: 'hidden',
  },
  fillContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '30%',
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
  },
});
