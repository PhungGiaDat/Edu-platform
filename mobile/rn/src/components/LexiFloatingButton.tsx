/**
 * LexiFloatingButton — persistent floating entry point for the Lexi chatbot.
 * Renders as a floating pill/bubble in the bottom-right corner.
 * Child-friendly, inviting, always visible on learner screens.
 *
 * Usage:
 *   <LexiFloatingButton onPress={() => setLexiVisible(true)} />
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { COLORS, SHADOWS, SPACING } from '../design/tokens';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface LexiFloatingButtonProps {
  onPress: () => void;
}

export const LexiFloatingButton: React.FC<LexiFloatingButtonProps> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(1);

  React.useEffect(() => {
    // Gentle pulse to draw attention
    glow.value = withRepeat(
      withSequence(
        withSpring(1.06, { damping: 15, stiffness: 120 }),
        withSpring(1, { damping: 15, stiffness: 120 }),
      ),
      -1,
      true,
    );
  }, [glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * glow.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[styles.container, animatedStyle]}
    >
      {/* Lexi mascot face */}
      <View style={styles.mascotFace}>
        <Text style={styles.mascotEmoji}>🦋</Text>
      </View>

      {/* Lexi label pill */}
      <View style={styles.labelPill}>
        <Text style={styles.labelText}>Lexi</Text>
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    ...SHADOWS.clayLg,
    // Softer, warmer shadow for the floating pill
    shadowColor: '#A78BFA',
    shadowOpacity: 0.3,
    borderWidth: 2,
    borderColor: '#DDD6FE',
    zIndex: 100,
  },
  mascotFace: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
  },
  mascotEmoji: {
    fontSize: 22,
  },
  labelPill: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },
});

export default LexiFloatingButton;
