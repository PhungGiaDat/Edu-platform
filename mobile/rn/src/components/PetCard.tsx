/**
 * PetCard — single-pet claymorphic card.
 * Reads RARITY_COLORS for the rarity ribbon + STAGE_GRADIENTS / EVOLUTION_EMOJI for the stage.
 * Does NOT import the Unity bridge. Renders a clay progress bar for level XP.
 * No raw hex.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayProgressBar } from './ClayProgressBar';
import { StreakBadge } from './StreakBadge';
import {
  EVOLUTION_EMOJI,
  RARITY_COLORS,
  STAGE_GRADIENTS,
  COLORS,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  type PetRarity,
  type PetStage,
} from '../design/tokens';import type { Pet, PetMood } from '../types/pet';

const KNOWN_RARITIES = Object.keys(RARITY_COLORS) as PetRarity[];
const KNOWN_STAGES = Object.keys(STAGE_GRADIENTS) as PetStage[];

const FALLBACK_RARITY: PetRarity = 'common';
const FALLBACK_STAGE: PetStage = 'baby';

function resolveRarity(pet: Pet): PetRarity {
  const candidate = (pet as Pet & { rarity?: string }).rarity;
  return candidate && (KNOWN_RARITIES as string[]).includes(candidate)
    ? (candidate as PetRarity)
    : FALLBACK_RARITY;
}

function resolveStage(pet: Pet): PetStage {
  const candidate = (pet as Pet & { stage?: string }).stage;
  return candidate && (KNOWN_STAGES as string[]).includes(candidate)
    ? (candidate as PetStage)
    : FALLBACK_STAGE;
}

const MOOD_LABEL: Record<PetMood, string> = {
  idle: 'Idle',
  anticipating: 'Anticipating',
  eating: 'Eating',
  satisfied: 'Satisfied',
  sleeping: 'Sleeping',
};

const AVATAR_SIZE = 64;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const RARITY_BADGE_SIZE = 22;
const RARITY_BADGE_RADIUS = RARITY_BADGE_SIZE / 2;

export interface PetCardProps {
  pet: Pet;
  /** 0..1 — derived from level XP. Optional. */
  levelProgress?: number;
  /** Selected visual (slight scale + stronger shadow). */
  selected?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export const PetCard: React.FC<PetCardProps> = ({
  pet,
  levelProgress,
  selected = false,
  style,
  onPress,
}) => {
  const rarity = resolveRarity(pet);
  const stage = resolveStage(pet);
  const rarityPalette = RARITY_COLORS[rarity];
  const stagePalette = STAGE_GRADIENTS[stage];

  return (
    <ClayCard
      variant={selected ? 'lg' : 'md'}
      color="white"
      onPress={onPress}
      style={[
        styles.card,
        selected && styles.cardSelected,
        style,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.avatar,
            {
              borderColor: rarityPalette.base,
              backgroundColor: stagePalette.base,
            },
          ]}
        >
          <Text style={styles.avatarEmoji}>{EVOLUTION_EMOJI[stage]}</Text>
          <View
            style={[
              styles.rarityBadge,
              { backgroundColor: rarityPalette.base },
            ]}
          >
            <Text style={styles.rarityBadgeText}>{rarityPalette.badge}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.species} numberOfLines={1}>
            {pet.species} · Lv.{pet.level}
          </Text>
          <Text style={styles.mood} numberOfLines={1}>
            {MOOD_LABEL[pet.mood] ?? pet.mood}
          </Text>
          {typeof levelProgress === 'number' ? (
            <View style={styles.progressRow}>
              <ClayProgressBar
                progress={Math.min(Math.max(levelProgress, 0), 1)}
                fillColor={rarityPalette.base}
                height={6}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.rarityColumn}>
          <View
            style={[
              styles.rarityChip,
              { borderColor: rarityPalette.base },
            ]}
          >
            <Text
              style={[styles.rarityText, { color: rarityPalette.dark }]}
            >
              {rarity.toUpperCase()}
            </Text>
          </View>
          <StreakBadge days={Math.min(pet.level, 99)} size="sm" />
        </View>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  cardSelected: {
    borderRadius: RADIUS.lg,
    ...SHADOWS.clayLg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  rarityBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: RARITY_BADGE_SIZE,
    height: RARITY_BADGE_SIZE,
    borderRadius: RARITY_BADGE_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityBadgeText: {
    fontSize: 14,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  name: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  species: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mood: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressRow: {
    marginTop: SPACING.xs,
  },
  rarityColumn: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  rarityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default PetCard;
