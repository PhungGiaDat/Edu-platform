/**
 * ClayProgressBar — soft, animated progress bar with clay shadow inset.
 *
 * Used by ClayProgressHero and standalone cards.
 */
import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { RADIUS, SHADOWS, withOpacity } from '../design/tokens';

export interface ClayProgressBarProps {
  progress: number; // 0..1
  fillColor: string;
  trackColor?: string;
  height?: number;
  showShimmer?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ClayProgressBar: React.FC<ClayProgressBarProps> = ({
  progress,
  fillColor,
  trackColor,
  height = 10,
  showShimmer = false,
  style,
}) => {
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    progressWidth.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, progressWidth]);

  const fillAnimated = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? withOpacity(fillColor, 0.18),
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          fillAnimated,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: fillColor,
          },
        ]}
      >
        {/* Top highlight */}
        <View
          style={[
            styles.highlight,
            {
              top: 1,
              bottom: height - 3,
              borderRadius: height / 2,
            },
          ]}
        />
      </Animated.View>

      {showShimmer && progress < 1 ? (
        <View
          style={[
            styles.shimmer,
            {
              top: 1,
              bottom: 1,
              borderRadius: height / 2,
              width: `${progress * 100}%`,
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 1,
  },
  highlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

export default ClayProgressBar;
