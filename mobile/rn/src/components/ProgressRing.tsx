/**
 * ProgressRing — animated circular SVG progress ring.
 *
 * Like LevelRing but more flexible: customizable label, sublabel, and center content.
 * Used for course completion, weekly activity, and skill progress.
 *
 * Props:
 *   progress     — 0..1
 *   size         — diameter in px (default 120)
 *   strokeWidth  — ring thickness (default 10)
 *   color        — progress arc color
 *   bgColor      — track color
 *   label        — bold center label (e.g. "75%")
 *   sublabel     — smaller text below label (e.g. "hoàn thành")
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT } from '../design/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  color = '#14B8A6',
  bgColor = 'rgba(20,184,166,0.12)',
  label,
  sublabel,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animProgress = useSharedValue(0);

  useEffect(() => {
    animProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animProgress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));

  const labelText = label ?? `${Math.round(progress * 100)}%`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation={-90}
          origin={`${cx}, ${cy}`}
          animatedProps={animatedCircleProps}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Text style={[styles.label, { color: COLORS.textPrimary }]}>{labelText}</Text>
        {sublabel ? (
          <Text style={styles.sublabel}>{sublabel}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: FONT.sizes.lg,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sublabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
});

export default ProgressRing;
