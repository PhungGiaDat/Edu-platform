/**
 * PetGrid — 2-column grid that hosts PetCard tiles.
 * Uses FlatList numColumns={2}. No raw hex; tokens only.
 */
import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  type ListRenderItem,
  type ViewStyle,
} from 'react-native';
import { ClayCard } from './ClayCard';
import { PetCard } from './PetCard';
import { SPACING } from '../design/tokens';
import type { Pet } from '../types/pet';

export interface PetGridProps {
  pets: Pet[];
  selectedPetId?: string | null;
  levelProgressByPetId?: Record<string, number>;
  contentContainerStyle?: ViewStyle;
  onSelect?: (pet: Pet) => void;
}

export const PetGrid: React.FC<PetGridProps> = ({
  pets,
  selectedPetId,
  levelProgressByPetId,
  contentContainerStyle,
  onSelect,
}) => {
  const renderItem: ListRenderItem<Pet> = ({ item }) => (
    <View style={styles.column}>
      <PetCard
        pet={item}
        levelProgress={levelProgressByPetId?.[item.id]}
        selected={item.id === selectedPetId}
        onPress={onSelect ? () => onSelect(item) : undefined}
      />
    </View>
  );

  return (
    <FlatList
      data={pets}
      keyExtractor={(p) => p.id}
      numColumns={2}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      ListEmptyComponent={
        <ClayCard variant="sm" color="white" style={styles.emptyCard}>
          <View style={styles.emptyInner} />
        </ClayCard>
      }
    />
  );
};

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
  },
  row: {
    gap: SPACING.sm,
  },
  column: {
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: SPACING.md,
  },
  emptyInner: {
    height: 1,
  },
});

export default PetGrid;
