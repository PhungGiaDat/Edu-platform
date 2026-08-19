/**
 * ComboOverlay — M6: Multi-Card & Combo UX
 *
 * Claymorphic combo prompt shown during AR_INTERACTING when 2+ flashcards
 * are tracked. Displays COMBO button with floating animation.
 *
 * Claymorphic design: vibrant coral/yellow tones, floating COMBO button.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { COLORS, SPACING, BRAND } from '../design/tokens';

export interface ComboOverlayProps {
  availableCombos?: Array<{ cardA: string; cardB: string; reward: string }>;
  onComboTrigger: () => void;
  isLoading?: boolean;
  onShowDetails?: () => void;
}

const FloatingButton: React.FC<{ children: React.ReactNode; onPress: () => void; disabled?: boolean }> = ({
  children, onPress, disabled,
}) => {
  const floatY = useSharedValue(0);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [floatY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ClayButton
        color="yellow"
        variant="lg"
        onPress={onPress}
        disabled={disabled}
        style={styles.comboButton}
      >
        {children}
      </ClayButton>
    </Animated.View>
  );
};

/**
 * Shown during AR_INTERACTING when 2+ flashcards are tracked.
 * Displays floating COMBO button with vibrant claymorphic styling.
 */
export const ComboOverlay: React.FC<ComboOverlayProps> = ({
  availableCombos = [],
  onComboTrigger,
  isLoading = false,
  onShowDetails,
}) => {
  const comboCount = availableCombos.length;

  return (
    <View style={styles.container}>
      {/* Hint card */}
      <View style={styles.hintContainer}>
        <ClayCard variant="sm" color="coral" padding={14}>
          <Text style={styles.hintText}>
            {comboCount > 0
              ? `✨ ${comboCount} combo${comboCount > 1 ? 's' : ''} ready!`
              : '🎉 2 cards detected!'}
          </Text>
        </ClayCard>
      </View>

      {/* Floating COMBO button */}
      <View style={styles.buttonContainer}>
        <FloatingButton onPress={onComboTrigger} disabled={isLoading}>
          <Text style={styles.comboText}>✨ COMBO! ✨</Text>
        </FloatingButton>
      </View>

      {/* Show details if multiple combos */}
      {comboCount > 1 && onShowDetails && (
        <View style={styles.detailsContainer}>
          <ClayButton
            color="white"
            variant="sm"
            onPress={onShowDetails}
            style={styles.detailsButton}
          >
            View Combos
          </ClayButton>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  hintContainer: {
    marginBottom: SPACING.sm,
  },
  hintText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    transform: [{ translateY: -14 }],
  },
  comboButton: {
    minWidth: 220,
  },
  comboText: {
    fontSize: 22,
    fontWeight: '900',
    color: BRAND.vibrantOrangeDark,
    letterSpacing: 1,
  },
  detailsContainer: {
    marginTop: SPACING.sm,
  },
  detailsButton: {
    minWidth: 140,
  },
});

export default ComboOverlay;
