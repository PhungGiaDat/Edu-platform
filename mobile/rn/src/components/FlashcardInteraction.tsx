/**
 * @file FlashcardInteraction — reusable tap-to-interact visual feedback primitive.
 *
 * Provides a child-friendly bounce animation that triggers on each tap.
 * This is NOT per-vocabulary animation — it is a generic reusable primitive.
 *
 * The exact animation values (scale 1 → 1.1 → 1, duration 300ms) are
 * implementation defaults. The profile is configurable so product/design
 * can tune values later without code changes.
 *
 * Usage:
 * ```tsx
 * <FlashcardInteraction onTap={handleTap}>
 *   <Image source={...} />
 * </FlashcardInteraction>
 * ```
 *
 * Created: C14 (tap-to-hear + visual feedback).
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, type ViewStyle, type GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

export interface FlashcardInteractionProps {
  /** Child element that receives the tap gesture and animation. */
  children: React.ReactNode;
  /** Called on each tap. */
  onTap: () => void;
  /** Optional additional style for the wrapper. */
  style?: ViewStyle;
  /**
   * Animation profile — all values are configurable, not hard-coded per vocab.
   * Defaults chosen to match MOB-FLASH-REQ-006 "Bounce (default)" pattern.
   */
  profile?: FlashcardAnimationProfile;
  /**
   * Whether to temporarily disable the tap target.
   * Used when the parent wants to prevent double-taps during loading, etc.
   * When disabled, the pressable does not respond to touch.
   */
  disabled?: boolean;
  /** Accessibility label. */
  accessibilityLabel?: string;
}

/**
 * Configurable animation profile.
 * All values are overridable; defaults are implementation choices.
 */
export interface FlashcardAnimationProfile {
  /** Scale peak value. Default: 1.08 */
  scalePeak?: number;
  /** Spring damping. Default: 12 (snappy, child-friendly). */
  damping?: number;
  /** Spring stiffness. Default: 180. */
  stiffness?: number;
}

/** Stable default profile — tweak via `profile` prop without changing defaults here. */
const DEFAULT_ANIMATION_PROFILE: Required<FlashcardAnimationProfile> = {
  scalePeak: 1.08,
  damping: 12,
  stiffness: 180,
};

/** FlashcardInteraction — wraps a child in a Pressable with spring-bounce feedback. */
export const FlashcardInteraction: React.FC<FlashcardInteractionProps> = ({
  children,
  onTap,
  style,
  profile,
  disabled = false,
  accessibilityLabel,
}) => {
  // Merge user profile over defaults.
  const p = {
    ...DEFAULT_ANIMATION_PROFILE,
    ...profile,
  };

  // Shared value for spring animation state.
  const scale = useSharedValue(1);

  // Trigger bounce on each press.
  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(p.scalePeak, {
      damping: p.damping,
      stiffness: p.stiffness,
    });
  }, [p.scalePeak, p.damping, p.stiffness, scale]);

  // Return to idle after spring completes.
  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, {
      damping: p.damping,
      stiffness: p.stiffness,
    });
  }, [p.damping, p.stiffness, scale]);

  // Call the parent's onTap after the animation kicks off.
  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      // Start the animation immediately so feedback feels instant.
      runOnJS(onTap)();
    },
    [onTap],
  );

  // Animated style: driven by shared value.
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.pressable, style]}
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    // Fill parent so tap target is as large as the child.
    alignSelf: 'stretch',
  },
  content: {
    alignSelf: 'center',
  },
});
