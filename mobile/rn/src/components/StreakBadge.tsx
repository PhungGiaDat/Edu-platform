/**
 * StreakBadge — claymorphic pill showing a streak day count.
 * Uses CARE_STAT_COLORS.streak + ClayCard. No raw hex.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { ClayCard } from './ClayCard';
import { CARE_STAT_COLORS, COLORS } from '../design/tokens';

export interface StreakBadgeProps {
  days: number;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  days,
  size = 'md',
  style,
}) => {
  const isMd = size === 'md';
  return (
    <ClayCard
      variant="sm"
      color="coral"
      style={[
        styles.badge,
        {
          paddingHorizontal: isMd ? 14 : 10,
          paddingVertical: isMd ? 8 : 4,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.icon, isMd ? styles.iconMd : styles.iconSm]}>
          🔥
        </Text>
        <Text style={[styles.text, isMd ? styles.textMd : styles.textSm]}>
          {days}
        </Text>
        <Text style={[styles.label, isMd ? styles.labelMd : styles.labelSm]}>
          {days === 1 ? 'day' : 'days'}
        </Text>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  iconMd: {
    fontSize: 16,
  },
  iconSm: {
    fontSize: 12,
  },
  text: {
    fontWeight: '800',
    color: CARE_STAT_COLORS.streak,
  },
  textMd: {
    fontSize: 16,
  },
  textSm: {
    fontSize: 12,
  },
  label: {
    fontWeight: '600',
    marginLeft: 4,
    color: COLORS.textPrimary,
  },
  labelMd: {
    fontSize: 12,
  },
  labelSm: {
    fontSize: 10,
  },
});

export default StreakBadge;
