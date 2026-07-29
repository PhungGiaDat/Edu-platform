import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { COLORS, SPACING } from '../design/tokens';

export interface ComboOverlayProps {
  availableCombos?: Array<{ cardA: string; cardB: string; reward: string }>;
  onComboTrigger: () => void;
  isLoading?: boolean;
}

/**
 * Shown during AR_INTERACTING when 2+ flashcards are tracked.
 * Displays COMBO button with floating animation.
 */
export const ComboOverlay: React.FC<ComboOverlayProps> = ({
  availableCombos = [],
  onComboTrigger,
  isLoading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.hintContainer}>
        <ClayCard variant="sm" color="yellow" padding={12}>
          <Text style={styles.hintText}>
            🎉 {availableCombos.length > 0
              ? `${availableCombos.length} combo${availableCombos.length > 1 ? 's' : ''} available!`
              : '2 cards detected! Tap COMBO to merge them!'
            }
          </Text>
        </ClayCard>
      </View>

      <View style={styles.buttonContainer}>
        <ClayButton
          color="yellow"
          variant="lg"
          onPress={onComboTrigger}
          loading={isLoading}
          style={styles.comboButton}
        >
          <Text style={styles.comboText}>✨ COMBO! ✨</Text>
        </ClayButton>
      </View>
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
  },
  hintContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  comboButton: {
    minWidth: 200,
    transform: [{ translateY: -14 }],
  },
  comboText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
});
