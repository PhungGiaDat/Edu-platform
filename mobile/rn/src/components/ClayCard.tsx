import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  COLORS,
  COLOR_MAP,
  SHADOWS,
  RADIUS,
  ANIMATION,
  type ClayColor,
} from '../design/tokens';

export type ClayVariant = 'sm' | 'md' | 'lg' | 'xl';

export interface ClayCardProps {
  variant?: ClayVariant;
  color?: ClayColor;
  borderRadius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  // Inner-tinted background used for cream/yellow tone families
  tone?: 'cool' | 'warm' | 'none';
  children: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const RADIUS_MAP = {
  sm: RADIUS.sm,
  md: RADIUS.md,
  lg: RADIUS.lg,
  xl: RADIUS.xl,
};

const SHADOW_MAP = {
  sm: SHADOWS.claySm,
  md: SHADOWS.clayMd,
  lg: SHADOWS.clayLg,
  xl: SHADOWS.clayLg,
};

/**
 * ClayCard — premium claymorphic surface with multi-layer highlight + shadow.
 * Used everywhere a child-friendly soft surface is needed.
 *
 * Tappable variant uses Reanimated spring for tactile press feedback.
 */
export const ClayCard: React.FC<ClayCardProps> = ({
  variant = 'md',
  color = 'white',
  borderRadius,
  padding = 16,
  style,
  onPress,
  children,
}) => {
  const radius = borderRadius ?? RADIUS_MAP[variant];
  const shadowStyle = SHADOW_MAP[variant];
  const backgroundColor = COLOR_MAP[color] ?? COLORS.white;

  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const pressY = pressed.value ? 2 : 0;
    const pressScale = pressed.value ? 0.985 : 1;
    const shadowMul = pressed.value ? 0.6 : 1;
    return {
      transform: [
        { translateY: withSpring(pressY, ANIMATION.press) },
        { scale: withSpring(pressScale, ANIMATION.press) },
      ],
      shadowOffset: {
        width: shadowStyle.shadowOffset.width,
        height: shadowStyle.shadowOffset.height * shadowMul,
      },
    };
  });

  const cardContent = (
    <Animated.View
      style={[
        styles.container,
        {
          borderRadius: radius,
          shadowColor: shadowStyle.shadowColor,
          shadowOpacity: shadowStyle.shadowOpacity,
          shadowRadius: shadowStyle.shadowRadius,
          elevation: shadowStyle.elevation,
        },
        onPress && animatedStyle,
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          { backgroundColor, borderRadius: radius },
        ]}
      >
        {/* Top edge highlight — soft white→transparent gradient */}
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          style={[
            styles.highlight,
            {
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
            },
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.35 }}
        />
        <View style={[styles.content, { padding }]}>{children}</View>
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        activeOpacity={1}
        onPressIn={() => { pressed.value = 1; }}
        onPressOut={() => { pressed.value = 0; }}
      >
        {cardContent}
      </AnimatedTouchable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
  inner: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  content: {
    zIndex: 1,
  },
});

export default ClayCard;