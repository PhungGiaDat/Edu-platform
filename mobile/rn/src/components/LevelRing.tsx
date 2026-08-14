/**
 * LevelRing — animated SVG level progress ring.
 *
 * Renders a circular arc showing XP progress toward the next level.
 * Used on ProfileScreen and CourseDetailScreen hero.
 *
 * Props:
 *   level        — current level number
 *   progress     — 0..1 XP progress to next level
 *   size         — diameter in px (default 80)
 *   strokeWidth  — ring thickness (default 8)
 *   color        — fill/stroke color for the ring
 *   bgColor      — track color
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONT } from '../design/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface LevelRingProps {
  level: number;
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}

export const LevelRing: React.FC<LevelRingProps> = ({
  level,
  progress,
  size = 80,
  strokeWidth = 8,
  color = '#FFD93D',
  bgColor = 'rgba(255,217,61,0.15)',
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Arc progress: start at top (rotate -90deg), sweep clockwise.
  // We use a dash array to show the "filled" portion.
  const animProgress = useSharedValue(0);

  useEffect(() => {
    animProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animProgress]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress arc — starts at top (-90deg) */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          // Rotate so arc starts at top
          rotation={-90}
          origin={`${cx}, ${cy}`}
          animatedProps={animatedCircleProps}
        />
        {/* Level number in center */}
        <SvgText
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          fontSize={Math.max(size * 0.28, 14)}
          fontWeight="900"
          fill={COLORS.textPrimary}
          alignmentBaseline="middle"
        >
          {level}
        </SvgText>
        {/* "Lv." label above */}
        <SvgText
          x={cx}
          y={cy - size * 0.18}
          textAnchor="middle"
          fontSize={Math.max(size * 0.1, 7)}
          fontWeight="700"
          fill={COLORS.textMuted}
          alignmentBaseline="middle"
        >
          LV
        </SvgText>
      </Svg>
    </View>
  );
};

export default LevelRing;
