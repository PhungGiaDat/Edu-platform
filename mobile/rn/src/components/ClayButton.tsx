import React, { useCallback } from 'react';
import { Text, StyleSheet, ViewStyle, StyleProp, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLOR_MAP, SHADOWS, RADIUS, ANIMATION, COLORS, type ClayColor } from '../design/tokens';

export type ButtonVariant = 'sm' | 'md' | 'lg';

export interface ClayButtonProps {
  variant?: ButtonVariant;
  color?: ClayColor;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const HEIGHT_MAP = { sm: 44, md: 52, lg: 60 } as const;
const SHADOW_KEY_MAP = { sm: 'claySm', md: 'clayMd', lg: 'clayLg' } as const;

const AnimatedTouchable = Animated.createAnimatedComponent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  require('react-native').TouchableOpacity as any
);

/**
 * Claymorphic button with animated press/lift states via Reanimated withSpring.
 * Kids design system: minimum 44px touch target for sm variant.
 */
export const ClayButton: React.FC<ClayButtonProps> = ({
  variant = 'md',
  color = 'blue',
  onPress,
  disabled = false,
  loading = false,
  style,
  children,
}) => {
  const pressed = useSharedValue(0);
  const height = HEIGHT_MAP[variant];
  const shadowKey = SHADOW_KEY_MAP[variant] as keyof typeof SHADOWS;
  const baseShadow = SHADOWS[shadowKey];
  const backgroundColor = COLOR_MAP[color] ?? COLORS.primary;

  const animatedStyle = useAnimatedStyle(() => {
    const pressY = pressed.value ? 3 : 0;
    const pressScale = pressed.value ? 0.97 : 1;
    const shadowMultiplier = pressed.value ? 0.5 : 1;

    return {
      transform: [
        { translateY: withSpring(pressY, ANIMATION.press) },
        { scale: withSpring(pressScale, ANIMATION.press) },
      ],
      shadowOffset: {
        width: baseShadow.shadowOffset.width * shadowMultiplier,
        height: baseShadow.shadowOffset.height * shadowMultiplier,
      },
    };
  });

  const handlePressIn = useCallback(() => {
    pressed.value = 1;
  }, [pressed]);

  const handlePressOut = useCallback(() => {
    pressed.value = 0;
  }, [pressed]);

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      style={[
        styles.button,
        {
          height,
          borderRadius: RADIUS[variant],
          backgroundColor,
          shadowColor: baseShadow.shadowColor,
          shadowOpacity: baseShadow.shadowOpacity,
          shadowRadius: baseShadow.shadowRadius,
          elevation: baseShadow.elevation,
        },
        animatedStyle,
        disabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'transparent']}
        style={[styles.highlight, { borderRadius: RADIUS[variant] }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        pointerEvents="none"
      />
      {loading ? (
        <ActivityIndicator color={COLORS.textPrimary} size="small" />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.text, { color: COLORS.textPrimary }]}>{children}</Text>
        </View>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  content: {
    zIndex: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
