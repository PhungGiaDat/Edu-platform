/**
 * ClayFeatureCard — premium feature card used in the Home feature grid.
 *
 * Anatomy (consistent across all features):
 *   ┌────────────────────────────┐
 *   │  [icon-well]   [badge?]    │
 *   │                            │
 *   │  Title                     │
 *   │  Subtitle                  │
 *   │                            │
 *   │  [optional arrow]          │
 *   └────────────────────────────┘
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { ClayCard } from './ClayCard';
import {
  RADIUS,
  SPACING,
  type FeatureTone,
  FEATURE_TONES,
  COLORS,
  FONT,
} from '../design/tokens';

export interface ClayFeatureCardProps {
  tone: FeatureTone;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  trailing?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const ClayFeatureCard: React.FC<ClayFeatureCardProps> = ({
  tone,
  icon,
  title,
  subtitle,
  badge,
  trailing,
  size = 'md',
  style,
  onPress,
}) => {
  const toneConfig = FEATURE_TONES[tone];
  const paddingValue =
    size === 'lg' ? SPACING.lg : size === 'sm' ? SPACING.sm : SPACING.base;
  const iconWellSize = size === 'lg' ? 56 : size === 'sm' ? 40 : 48;

  return (
    <ClayCard
      variant="lg"
      color="white"
      padding={0}
      onPress={onPress}
      style={[styles.card, style]}
    >
      <View
        style={[
          styles.toneBackground,
          { backgroundColor: toneConfig.bg },
        ]}
      >
        <View style={styles.row}>
          {/* Icon well */}
          <View
            style={[
              styles.iconWell,
              {
                width: iconWellSize,
                height: iconWellSize,
                borderRadius: RADIUS.md,
                backgroundColor: toneConfig.iconBg,
              },
            ]}
          >
            {icon}
          </View>

          {badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: toneConfig.surface, borderColor: toneConfig.accent },
              ]}
            >
              <Text style={[styles.badgeText, { color: toneConfig.accent }]}>
                {badge}
              </Text>
            </View>
          ) : null}

          {trailing}
        </View>

        <View style={[styles.textBlock, { paddingHorizontal: paddingValue, paddingTop: paddingValue }]}>
          <Text
            style={[styles.title, size === 'lg' && styles.titleLg]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  toneBackground: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.base,
  },
  iconWell: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textBlock: {
    paddingBottom: SPACING.base,
  },
  title: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  titleLg: {
    fontSize: FONT.sizes.xxl,
  },
  subtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default ClayFeatureCard;