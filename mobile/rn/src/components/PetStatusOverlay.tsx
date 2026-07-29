import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from './ClayCard';
import { COLORS, SPACING } from '../design/tokens';

export type PetState = 'idle' | 'anticipating' | 'eating' | 'satisfied';

export interface PetStatusOverlayProps {
  petState: PetState;
  currentStreak?: number;
}

const PET_EMOJIS: Record<PetState, string> = {
  idle: '🤖',
  anticipating: '😆',
  eating: '😋',
  satisfied: '💖',
};

const PET_LABELS: Record<PetState, string> = {
  idle: 'Hungry...',
  anticipating: 'Yummy!',
  eating: 'Chomp!',
  satisfied: 'So happy!',
};

/**
 * Small claymorphic indicator showing pet state, positioned in top-right corner.
 */
export const PetStatusOverlay: React.FC<PetStatusOverlayProps> = ({
  petState,
  currentStreak = 0,
}) => {
  return (
    <View style={styles.container}>
      <ClayCard variant="sm" color="white" padding={8}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{PET_EMOJIS[petState]}</Text>
          <View style={styles.info}>
            <Text style={styles.label}>{PET_LABELS[petState]}</Text>
            {currentStreak > 0 && (
              <Text style={styles.streak}>🔥 {currentStreak} streak</Text>
            )}
          </View>
        </View>
      </ClayCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: SPACING.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  info: {
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  streak: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    marginTop: 2,
  },
});
