/**
 * PetSelector — horizontal scroller that lets the user pick a primary pet.
 * Uses PetCard in a horizontal list. Selected pet gets `selected` styling.
 */
import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';
import { PetCard } from './PetCard';
import { SPACING } from '../design/tokens';
import type { Pet } from '../types/pet';

export interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: string | null;
  onSelect: (pet: Pet) => void;
}

const HORIZONTAL_PADDING = SPACING.md;
const CARD_WIDTH = 260;

export const PetSelector: React.FC<PetSelectorProps> = ({
  pets,
  selectedPetId,
  onSelect,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.content}
  >
    {pets.map((pet) => (
      <View key={pet.id} style={styles.itemWrap}>
        <PetCard
          pet={pet}
          selected={pet.id === selectedPetId}
          onPress={() => onSelect(pet)}
          style={styles.card}
        />
      </View>
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: SPACING.sm,
  },
  itemWrap: {
    width: CARD_WIDTH,
    marginRight: SPACING.sm,
  },
  card: {
    marginBottom: 0,
  },
});

export default PetSelector;
