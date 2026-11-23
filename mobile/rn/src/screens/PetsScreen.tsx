/**
 * PetsScreen — main "My Pets" screen.
 * Composes usePets + PetSelector + PetGrid + PetCareStats + PetUnlockModal.
 * No AR / Unity bridge.
 *
 * Phase 0 — switched to the typed `Pet` from `types/pet.ts`. The local
 * `summaryToPet` adapter is gone; we now consume the canonical pet list
 * returned by `petsApi.listPets()` directly.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { PetModelViewer } from '../components/pets/PetModelViewer';
import { LexiFloatingButton } from '../components/LexiFloatingButton';
import { LexiQuickActionSheet } from '../components/LexiQuickActionSheet';
import { useLocale } from '../i18n/useLocale';
import { usePets } from '../hooks/usePets';
import { useUser } from '../hooks/useUser';
import { petsApi } from '../services/api';
import {
  COLORS,
  FONT,
  RADIUS,
  SPACING,
} from '../design/tokens';
import type { Pet } from '../types/pet';
import type { PetCareState } from '../types/petCare';

function normalize(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function buildStats(careState: PetCareState): PetCareStat[] {
  return [
    { key: 'happiness', label: 'Happiness', value: normalize(careState.happiness / 100) },
    { key: 'energy', label: 'Energy', value: normalize(careState.energy / 100) },
    { key: 'hunger', label: 'Hunger', value: normalize(careState.hunger / 100) },
    { key: 'xp', label: 'XP', value: normalize(careState.xpEarned / 100) },
  ];
}

export const PetsScreen: React.FC = () => {
  const { pets, loading, refreshing, error, refresh, getPet, setActivePet } = usePets();
  const {
    userId,
    activePet: userActivePet,
    refresh: refreshUser,
  } = useUser();
  const { t } = useLocale();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [careState, setCareState] = useState<PetCareState | null>(null);
  const [careStateError, setCareStateError] = useState<string | null>(null);
  const [isSelectingPet, setIsSelectingPet] = useState(false);
  const [unlockVisible, setUnlockVisible] = useState(false);
  const [unlockContext, setUnlockContext] = useState<{
    name: string;
    rarity?: string;
    stage?: string;
    emoji?: string;
  } | null>(null);
  const [lexiVisible, setLexiVisible] = useState(false);

  useEffect(() => {
    if (userActivePet) {
      setSelectedPetId(userActivePet.pet_id);
      setSelectedPet(userActivePet);
    }
  }, [userActivePet]);

  useEffect(() => {
    if (!userId) {
      setCareState(null);
      setCareStateError(null);
      return;
    }

    let cancelled = false;
    setCareStateError(null);
    void petsApi
      .getPetCareState(userId)
      .then((response) => {
        if (!cancelled) {
          setCareState(response.data);
        }
      })
      .catch((careError) => {
        if (!cancelled) {
          console.error('PetsScreen: getPetCareState failed', careError);
          setCareStateError(t('pets.careLoadFailed'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t, userId]);

  const activePet: Pet | null = useMemo(() => {
    if (selectedPet) return selectedPet;
    if (selectedPetId) {
      return pets.find((pet) => pet.pet_id === selectedPetId) ?? null;
    }
    if (userActivePet) {
      return pets.find((pet) => pet.pet_id === userActivePet.pet_id) ?? userActivePet;
    }
    return pets[0] ?? null;
  }, [pets, selectedPet, selectedPetId, userActivePet]);

  const onSelectPet = useCallback(
    (pet: Pet) => {
      setIsSelectingPet(true);
      setCareStateError(null);
      setSelectedPetId(pet.pet_id);
      setSelectedPet(pet);
      void Promise.all([setActivePet(pet.pet_id), getPet(pet.pet_id)])
        .then(([nextActivePet, fullPet]) => {
          if (nextActivePet) {
            setSelectedPet(nextActivePet);
            // Refresh useUser so the source-of-truth activePet matches the
            // backend; otherwise the unlock CTA / sync between selector and
            // detail card can drift until the next /pets/active/current poll.
            void refreshUser();
            return;
          }

          if (fullPet) {
            setSelectedPet(fullPet);
          }

          setCareStateError(t('pets.activePetFailed'));
        })
        .finally(() => {
          setIsSelectingPet(false);
        });
    },
    [getPet, refreshUser, setActivePet, t],
  );

  if (loading && pets.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const stats = careState ? buildStats(careState) : null;

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
          <Text style={styles.title}>Thú cưng của tôi</Text>
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

        {careStateError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{careStateError}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>{t('pets.yourPets')}</Text>
        <PetSelector
          pets={pets}
          selectedPetId={activePet?.pet_id ?? null}
          onSelect={onSelectPet}
        />

        {activePet ? (
          <ClayCard variant="md" color="white" style={styles.detailCard}>
            <PetModelViewer pet={activePet} />
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{activePet.name}</Text>
              <ClayButton
                color="yellow"
                variant="sm"
                disabled={isSelectingPet}
                onPress={() => {
                  if (activePet.is_active) {
                    setUnlockContext({
                      name: activePet.name,
                      rarity: activePet.rarity,
                      stage: careState?.stage ?? 'baby',
                    });
                    setUnlockVisible(true);
                    return;
                  }

                  setIsSelectingPet(true);
                  setCareStateError(null);
                  void setActivePet(activePet.pet_id)
                    .then((activatedPet) => {
                      if (!activatedPet) {
                        setCareStateError(t('pets.activePetFailed'));
                        return;
                      }

                      const promoted = activatedPet;
                      setSelectedPet(promoted);
                      setSelectedPetId(promoted.pet_id);
                      setUnlockContext({
                        name: promoted.name,
                        rarity: promoted.rarity,
                        stage: careState?.stage ?? 'baby',
                      });
                      setUnlockVisible(true);
                      void refreshUser();
                    })
                    .catch((activateError) => {
                      console.error(
                        'PetsScreen: activate pet from CTA failed',
                        activateError,
                      );
                      setCareStateError(t('pets.activePetFailed'));
                    })
                    .finally(() => {
                      setIsSelectingPet(false);
                    });
                }}
              >
                {isSelectingPet ? t('pets.updatingActivePet') : t('pets.activePetCta')}
              </ClayButton>
            </View>
            {stats ? <PetCareStats stats={stats} /> : null}
          </ClayCard>
        ) : (
          <ClayCard variant="sm" color="white" style={styles.placeholderCard}>
            <Text style={styles.placeholderText}>{t('common.empty')}</Text>
          </ClayCard>
        )}

        <Text style={styles.sectionLabel}>{t('pets.allPets')}</Text>
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

      <LexiFloatingButton onPress={() => setLexiVisible(true)} />
      <LexiQuickActionSheet
        visible={lexiVisible}
        onDismiss={() => setLexiVisible(false)}
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