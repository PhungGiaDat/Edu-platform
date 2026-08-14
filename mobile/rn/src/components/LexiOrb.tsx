/**
 * LexiOrb — premium floating assistant entry point.
 *
 * Lavender clay orb with the Lexi butterfly sprite + a soft glow.
 * Spring-animated on press. Persistent across learner screens.
 *
 * Single source of truth for "ask Lexi" entry — replaces LexiFloatingButton.
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { CodexPetSprite, type CodexPetAnimationState } from './pets/CodexPetSprite';
import {
  BRAND,
  FEATURE_TONES,
  FONT,
  SHADOWS,
  RADIUS,
  SPACING,
} from '../design/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface LexiOrbProps {
  onPress: () => void;
  badgeCount?: number;
  animationState?: CodexPetAnimationState;
  style?: StyleProp<ViewStyle>;
  showLabel?: boolean;
}

export const LexiOrb: React.FC<LexiOrbProps> = ({
  onPress,
  badgeCount,
  animationState = 'waving',
  style,
  showLabel = false,
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(1);
  const tone = FEATURE_TONES.lex;

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withSpring(1.06, { damping: 18, stiffness: 90 }),
        withSpring(1, { damping: 18, stiffness: 90 }),
      ),
      -1,
      true,
    );
  }, [glow]);

  const orbAnimated = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value * glow.value },
    ],
  }));

  const pressIn = () => { scale.value = withSpring(0.92, { damping: 18, stiffness: 280 }); };
  const pressOut = () => { scale.value = withSpring(1, { damping: 18, stiffness: 200 }); };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[styles.container, style]}
      accessibilityLabel="Mở trợ lý Lexi"
      accessibilityRole="button"
    >
      <Animated.View style={[styles.orb, SHADOWS.lexGlow, orbAnimated, { backgroundColor: tone.iconBg }]}>
        {/* Soft inner ring highlight */}
        <View style={[styles.innerRing, { borderColor: tone.surface }]} />

        {/* Lexi sprite */}
        <CodexPetSprite
          animationState={animationState}
          size={56}
          style={styles.sprite}
        />

        {/* Notification badge */}
        {badgeCount !== undefined && badgeCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 9 ? '9+' : badgeCount}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      {showLabel ? (
        <View style={[styles.labelPill, { backgroundColor: tone.surface, borderColor: tone.iconBg }]}>
          <Text style={[styles.labelText, { color: tone.accent }]}>Lexi</Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  orb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: BRAND.lavenderLight,
  },
  innerRing: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 28,
    borderWidth: 1,
    opacity: 0.6,
  },
  sprite: {
    marginTop: -4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: BRAND.coralPink,
    borderWidth: 2,
    borderColor: BRAND.lavenderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  labelPill: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  labelText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default LexiOrb;
