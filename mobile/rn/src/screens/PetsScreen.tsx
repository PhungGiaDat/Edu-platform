/**
 * PetsScreen — main "My Pets" screen.
 * Composes usePets + PetSelector + PetGrid + PetCareStats + PetUnlockModal.
 * No AR / Unity bridge.
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
import type { Pet, PetSummary } from '../types/pet';

function toPet(summary: PetSummary): Pet {
  return {
    id: summary.id,
    owner_id: '',
    name: summary.name,
    species: summary.species,
    level: summary.level,
    experience: 0,
    hunger: 0.5,
    happiness: 0.5,
    energy: 0.5,
    mood: summary.mood,
    last_fed_at: null,
    last_played_at: null,
    created_at: '',
    updated_at: '',
  };
}

function normalize(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function buildStats(pet: Pet): PetCareStat[] {
  return [
    { key: 'happiness', label: 'Happy', value: normalize(pet.happiness) },
    { key: 'energy', label: 'Energy', value: normalize(pet.energy) },
    { key: 'hunger', label: 'Full', value: 1 - normalize(pet.hunger) },
    { key: 'xp', label: 'XP', value: normalize(pet.experience / 100) },
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

  const summaryToPet: Pet[] = useMemo(() => pets.map(toPet), [pets]);

  const activePet: Pet | null = useMemo(() => {
    if (selectedPet) return selectedPet;
    if (selectedPetId) {
      return summaryToPet.find((p) => p.id === selectedPetId) ?? null;
    }
    return summaryToPet[0] ?? null;
  }, [selectedPet, selectedPetId, summaryToPet]);

  const onSelectPet = useCallback(
    (pet: Pet) => {
      setSelectedPetId(pet.id);
      setSelectedPet(pet);
      void getPet(pet.id).then((full) => {
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
          pets={summaryToPet}
          selectedPetId={activePet?.id ?? null}
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
                    rarity: 'common',
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
          pets={summaryToPet}
          selectedPetId={activePet?.id ?? null}
          levelProgressByPetId={summaryToPet.reduce<
            Record<string, number>
          >((acc, pet) => {
            acc[pet.id] = normalize(pet.level / 20);
            return acc;
          }, {})}
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
