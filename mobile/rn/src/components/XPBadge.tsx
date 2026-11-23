/**
 * XPBadge — claymorphic pill showing total XP and current level.
 * Uses ClayCard + existing token palette. No raw hex.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { ClayCard } from './ClayCard';
import { CARE_STAT_COLORS, COLORS } from '../design/tokens';

export interface XPBadgeProps {
  xp: number;
  level: number;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const XPBadge: React.FC<XPBadgeProps> = ({
  xp,
  level,
  size = 'md',
  style,
}) => {
  const isMd = size === 'md';

  return (
    <ClayCard
      variant="sm"
      color="yellow"
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
        <Text style={[styles.icon, isMd ? styles.iconMd : styles.iconSm]}>⭐</Text>
        <Text style={[styles.text, isMd ? styles.textMd : styles.textSm]}>{xp}</Text>
        <Text style={[styles.label, isMd ? styles.labelMd : styles.labelSm]}>XP</Text>
        <Text style={[styles.level, isMd ? styles.levelMd : styles.levelSm]}>
          Lv.{level}
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
    color: CARE_STAT_COLORS.xp,
  },
  textMd: {
    fontSize: 16,
  },
  textSm: {
    fontSize: 12,
  },
  label: {
    fontWeight: '700',
    marginLeft: 4,
    color: COLORS.textPrimary,
  },
  labelMd: {
    fontSize: 12,
  },
  labelSm: {
    fontSize: 10,
  },
  level: {
    fontWeight: '700',
    marginLeft: 8,
    color: COLORS.textSecondary,
  },
  levelMd: {
    fontSize: 12,
  },
  levelSm: {
    fontSize: 10,
  },
});

export default XPBadge;
