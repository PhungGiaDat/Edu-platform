/**
 * PetUnlockModal — celebratory modal shown when a new pet becomes available.
 * Composes ClayCard with RARITY_COLORS ribbon + EVOLUTION_EMOJI glyph.
 * Uses RN Modal. No raw hex.
 */
import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import {
  COLORS,
  BRAND,
  EVOLUTION_EMOJI,
  RARITY_COLORS,
  RADIUS,
  STAGE_GRADIENTS,
  FONT,
  SHADOWS,
  SPACING,
  type PetRarity,
  type PetStage,
} from '../design/tokens';
import { withOpacity } from '../design/tokens';

const KNOWN_RARITIES = Object.keys(RARITY_COLORS) as PetRarity[];
const KNOWN_STAGES = Object.keys(STAGE_GRADIENTS) as PetStage[];

const AVATAR_SIZE = 96;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const RARITY_CHIP_RADIUS = RADIUS.sm + 2; // ≈14 — between RADIUS.sm and RADIUS.md

export interface PetUnlockModalProps {
  visible: boolean;
  petName: string;
  rarity?: string;
  stage?: string;
  emoji?: string;
  onDismiss: () => void;
}

function resolveRarity(value: string | undefined): PetRarity {
  return value && (KNOWN_RARITIES as string[]).includes(value)
    ? (value as PetRarity)
    : 'common';
}

function resolveStage(value: string | undefined): PetStage {
  return value && (KNOWN_STAGES as string[]).includes(value)
    ? (value as PetStage)
    : 'baby';
}

export const PetUnlockModal: React.FC<PetUnlockModalProps> = ({
  visible,
  petName,
  rarity,
  stage,
  emoji,
  onDismiss,
}) => {
  const rarityKey = resolveRarity(rarity);
  const stageKey = resolveStage(stage);
  const palette = RARITY_COLORS[rarityKey];
  const glyph = emoji ?? EVOLUTION_EMOJI[stageKey];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <ClayCard
          variant="lg"
          color="white"
          style={[styles.card, SHADOWS.clayLg]}
        >
          <Text style={styles.title}>New pet unlocked!</Text>
          <View
            style={[
              styles.avatar,
              { backgroundColor: palette.base, borderColor: palette.dark },
            ]}
          >
            <Text style={styles.emoji}>{glyph}</Text>
          </View>
          <Text style={styles.petName}>{petName}</Text>
          <View
            style={[styles.rarityChip, { borderColor: palette.base }]}
          >
            <Text style={[styles.rarityText, { color: palette.dark }]}>
              {rarityKey.toUpperCase()} · {palette.badge}
            </Text>
          </View>
          <ClayButton color="green" style={styles.button} onPress={onDismiss}>
            Awesome!
          </ClayButton>
        </ClayCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: withOpacity(BRAND.deepSlate, 0.45),
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emoji: {
    fontSize: 48,
  },
  petName: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  rarityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: RARITY_CHIP_RADIUS,
    marginBottom: SPACING.md,
  },
  rarityText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  button: {
    minWidth: 140,
  },
});

export default PetUnlockModal;
