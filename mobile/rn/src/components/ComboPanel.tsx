/**
 * ComboPanel — M6: Multi-Card & Combo UX
 *
 * Detailed panel showing available combos with reward preview.
 * Shown below or alongside ComboOverlay when combos are available.
 *
 * Claymorphic design: vibrant coral/yellow tones, combo cards with
 * card-pair preview and XP reward badge.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { ClayButton } from './ClayButton';
import { COLORS, SPACING, BRAND } from '../design/tokens';
import type { ArCombinationSchema } from '../types/api';

export interface ComboCardInfo {
  /** Backend combo definition */
  combo: ArCombinationSchema;
  /** QR IDs of the two cards involved */
  cardAQrId: string;
  cardBQrId: string;
  /** Optional card preview image URLs */
  cardAPreviewUrl?: string;
  cardBPreviewUrl?: string;
  /** Optional display labels for cards */
  cardALabel?: string;
  cardBLabel?: string;
}

export interface ComboPanelProps {
  combos: ComboCardInfo[];
  onComboSelect?: (combo: ComboCardInfo) => void;
  onDismiss?: () => void;
  isLoading?: boolean;
}

/** Single combo card with card pair preview and XP reward */
const ComboCard: React.FC<{
  combo: ComboCardInfo;
  index: number;
  onSelect?: (combo: ComboCardInfo) => void;
}> = ({ combo, index, onSelect }) => {
  const { cardA, cardB } = (() => {
    const aLabel = combo.cardALabel ?? combo.cardAQrId;
    const bLabel = combo.cardBLabel ?? combo.cardBQrId;
    return {
      cardA: aLabel,
      cardB: bLabel,
    };
  })();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      exiting={FadeOutUp.duration(200)}
    >
      <ClayCard
        variant="md"
        color="coral"
        padding={16}
        onPress={() => onSelect?.(combo)}
        style={styles.comboCard}
      >
        {/* Card pair + arrow */}
        <View style={styles.cardPair}>
          {/* Card A */}
          <View style={styles.cardPreview}>
            {combo.cardAPreviewUrl ? (
              <Image
                source={{ uri: combo.cardAPreviewUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Text style={styles.cardEmoji}>🃏</Text>
              </View>
            )}
            <Text style={styles.cardLabel} numberOfLines={1}>{cardA}</Text>
          </View>

          {/* Plus sign */}
          <View style={styles.plusSign}>
            <Text style={styles.plusText}>+</Text>
          </View>

          {/* Card B */}
          <View style={styles.cardPreview}>
            {combo.cardBPreviewUrl ? (
              <Image
                source={{ uri: combo.cardBPreviewUrl }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Text style={styles.cardEmoji}>🃏</Text>
              </View>
            )}
            <Text style={styles.cardLabel} numberOfLines={1}>{cardB}</Text>
          </View>
        </View>

        {/* Combo description */}
        {combo.combo.description && (
          <Text style={styles.comboDesc} numberOfLines={2}>
            {combo.combo.description}
          </Text>
        )}

        {/* XP reward badge */}
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardEmoji}>⭐</Text>
          <Text style={styles.rewardText}>+{combo.combo.bonus_xp} XP</Text>
        </View>
      </ClayCard>
    </Animated.View>
  );
};

/**
 * Detailed combo panel shown when multiple combos are available.
 * Displays each combo as a card with card pair preview and XP reward.
 */
export const ComboPanel: React.FC<ComboPanelProps> = ({
  combos,
  onComboSelect,
  onDismiss,
  isLoading = false,
}) => {
  if (combos.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutUp.duration(200)}
      style={styles.container}
    >
      <ClayCard variant="lg" color="white" padding={20} style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>✨</Text>
          <Text style={styles.headerTitle}>
            {combos.length} Combo{combos.length > 1 ? 's' : ''} Available!
          </Text>
        </View>

        {/* Combo list */}
        <View style={styles.comboList}>
          {combos.map((combo, i) => (
            <ComboCard
              key={combo.combo.combo_id}
              combo={combo}
              index={i}
              onSelect={onComboSelect}
            />
          ))}
        </View>

        {/* Dismiss */}
        {onDismiss && (
          <View style={styles.dismissContainer}>
            <ClayButton
              color="white"
              variant="sm"
              onPress={onDismiss}
              style={styles.dismissButton}
            >
              Maybe Later
            </ClayButton>
          </View>
        )}
      </ClayCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
  },
  panel: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  comboList: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  comboCard: {
    marginBottom: SPACING.xs,
  },
  cardPair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  cardPreview: {
    alignItems: 'center',
    flex: 1,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  plusSign: {
    paddingHorizontal: SPACING.sm,
    paddingTop: 18,
  },
  plusText: {
    fontSize: 24,
    fontWeight: '800',
    color: BRAND.vibrantOrange,
  },
  comboDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,217,61,0.25)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    alignSelf: 'center',
  },
  rewardEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.vibrantOrange,
  },
  dismissContainer: {
    alignItems: 'center',
  },
  dismissButton: {
    minWidth: 140,
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default ComboPanel;
