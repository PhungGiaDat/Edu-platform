/**
 * PetsScreen — main "My Pets" screen.
 * Composes usePets + PetSelector + PetGrid + PetCareStats + PetUnlockModal.
 * No AR / Unity bridge.
 *
 * Phase 0 — switched to the typed `Pet` from `types/pet.ts`. The local
 * `summaryToPet` adapter is gone; we now consume the canonical pet list
 * returned by `petsApi.listPets()` directly.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { ClayButton } from '../components/ClayButton';
import { ClayCard } from '../components/ClayCard';
import { PetCareStats, type PetCareStat } from '../components/PetCareStats';
import { PetGrid } from '../components/PetGrid';
import { PetSelector } from '../components/PetSelector';
import { PetUnlockModal } from '../components/PetUnlockModal';
import { useLocale } from '../i18n/useLocale';
import { usePets } from '../hooks/usePets';
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from '../design/tokens';
import type { Pet } from '../types/pet';

function normalize(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function buildStats(pet: Pet): PetCareStat[] {
  return [
    { key: 'happiness', label: 'Happy', value: 1 },
    { key: 'energy', label: 'Energy', value: 1 },
    { key: 'hunger', label: 'Full', value: 1 },
    { key: 'xp', label: 'XP', value: normalize((pet.rarity === 'common' ? 1 : pet.rarity === 'rare' ? 0.5 : pet.rarity === 'epic' ? 0.25 : 0.1)) },
  ];
}

export const PetsScreen: React.FC = () => {
  const { pets, loading, refreshing, error, refresh, getPet } = usePets();
  const { t } = useLocale();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [unlockVisible, setUnlockVisible] = useState(false);
  const [unlockContext, setUnlockContext] = useState<{
    name: string;
    rarity?: string;
    stage?: string;
    emoji?: string;
  } | null>(null);

  const activePet: Pet | null = useMemo(() => {
    if (selectedPet) return selectedPet;
    if (selectedPetId) {
      return pets.find((p) => p.pet_id === selectedPetId) ?? null;
    }
    return pets[0] ?? null;
  }, [selectedPet, selectedPetId, pets]);

  const onSelectPet = useCallback(
    (pet: Pet) => {
      setSelectedPetId(pet.pet_id);
      setSelectedPet(pet);
      void getPet(pet.pet_id).then((full) => {
        if (full) setSelectedPet(full);
      });
    },
    [getPet],
  );

  if (loading && pets.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const stats = activePet ? buildStats(activePet) : null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('pets.title')}</Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <ClayButton
              color="yellow"
              onPress={() => void refresh()}
              style={styles.retryButton}
            >
              {t('common.retry')}
            </ClayButton>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Your pets</Text>
        <PetSelector
          pets={pets}
          selectedPetId={activePet?.pet_id ?? null}
          onSelect={onSelectPet}
        />

        {activePet ? (
          <ClayCard variant="md" color="white" style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{activePet.name}</Text>
              <ClayButton
                color="yellow"
                variant="sm"
                onPress={() => {
                  setUnlockContext({
                    name: activePet.name,
                    rarity: activePet.rarity,
                    stage: 'baby',
                  });
                  setUnlockVisible(true);
                }}
              >
                Show details
              </ClayButton>
            </View>
            {stats ? <PetCareStats stats={stats} /> : null}
          </ClayCard>
        ) : (
          <ClayCard variant="sm" color="white" style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>{t('common.empty')}</Text>
          </ClayCard>
        )}

        <Text style={styles.sectionLabel}>All pets</Text>
        <PetGrid
          pets={pets}
          selectedPetId={activePet?.pet_id ?? null}
          levelProgressByPetId={pets.reduce<Record<string, number>>(
            (acc, pet) => {
              acc[pet.pet_id] = normalize(pet.rarity === 'common' ? 1 : 0.5);
              return acc;
            },
            {},
          )}
          onSelect={onSelectPet}
        />
      </ScrollView>

      <PetUnlockModal
        visible={unlockVisible}
        petName={unlockContext?.name ?? activePet?.name ?? ''}
        rarity={unlockContext?.rarity}
        stage={unlockContext?.stage}
        emoji={unlockContext?.emoji}
        onDismiss={() => {
          setUnlockVisible(false);
          setUnlockContext(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundBase,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionLabel: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  detailTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  placeholderCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  placeholderText: {
    fontSize: FONT.sizes.md,
    color: COLORS.textMuted,
  },
  errorBanner: {
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.white,
    fontSize: FONT.sizes.md,
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: SPACING.xs,
  },
});

export default PetsScreen;