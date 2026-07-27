/**
 * PetCareStats — claymorphic read-only display of pet stats (happiness / hunger / energy / xp).
 * Reads CARE_STAT_COLORS. ClayProgressBar per stat. No raw hex.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayProgressBar } from './ClayProgressBar';
import {
  CARE_STAT_COLORS,
  COLORS,
  FONT,
  SPACING,
} from '../design/tokens';

export interface PetCareStat {
  key: 'happiness' | 'energy' | 'hunger' | 'xp';
  value: number; // 0..1
  label: string;
}

export interface PetCareStatsProps {
  stats: PetCareStat[];
  style?: ViewStyle;
}

const COLOR_BY_KEY: Record<PetCareStat['key'], string> = {
  happiness: CARE_STAT_COLORS.happiness,
  energy: CARE_STAT_COLORS.energy,
  hunger: CARE_STAT_COLORS.hunger,
  xp: CARE_STAT_COLORS.xp,
};

export const PetCareStats: React.FC<PetCareStatsProps> = ({ stats, style }) => (
  <ClayCard variant="sm" color="white" style={[styles.card, style]}>
    {stats.map((stat) => {
      const clamped = Math.min(Math.max(stat.value, 0), 1);
      const fillColor = COLOR_BY_KEY[stat.key] ?? COLORS.primary;
      return (
        <View key={stat.key} style={styles.row}>
          <Text style={styles.label}>{stat.label}</Text>
          <View style={styles.bar}>
            <ClayProgressBar
              progress={clamped}
              fillColor={fillColor}
              height={8}
              showShimmer
            />
          </View>
          <Text style={styles.value}>{Math.round(clamped * 100)}</Text>
        </View>
      );
    })}
  </ClayCard>
);

const styles = StyleSheet.create({
  card: {
    paddingVertical: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    width: 80,
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bar: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  value: {
    width: 36,
    textAlign: 'right',
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

export default PetCareStats;
