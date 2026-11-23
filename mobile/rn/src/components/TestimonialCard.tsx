/**
 * TestimonialCard — premium student testimonial card with avatar, rating, and quote.
 *
 * Uses claymorphic card + clay icon for the star rating.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClayCard } from './ClayCard';
import { ClayIcon } from './icons/ClayIcons';
import { BRAND, COLORS, FONT, RADIUS, SPACING, withOpacity } from '../design/tokens';

export interface TestimonialCardProps {
  avatarInitials: string;
  name: string;
  studentClass?: string;
  quote: string;
  rating?: number; // 1-5
  accentColor?: string;
  variant?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  avatarInitials,
  name,
  studentClass,
  quote,
  rating = 5,
  accentColor = BRAND.lavender,
  variant = 'md',
  onPress,
}) => {
  return (
    <ClayCard
      variant={variant}
      color="white"
      padding={0}
      onPress={onPress}
    >
      <View style={styles.inner}>
        {/* Avatar */}
        <View style={[styles.avatarWell, { backgroundColor: withOpacity(accentColor, 0.15) }]}>
          <Text style={[styles.avatarInitials, { color: accentColor }]}>
            {avatarInitials}
          </Text>
        </View>

        {/* Stars */}
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <ClayIcon
              key={i}
              name="star"
              size={12}
              color={i < rating ? BRAND.sunshineYellow : withOpacity(BRAND.sunshineYellow, 0.25)}
            />
          ))}
        </View>

        {/* Quote */}
        <Text style={styles.quote} numberOfLines={4}>
          "{quote}"
        </Text>

        {/* Attribution */}
        <View style={styles.attribution}>
          <Text style={styles.name}>{name}</Text>
          {studentClass ? (
            <Text style={styles.studentClass}>· {studentClass}</Text>
          ) : null}
        </View>
      </View>
    </ClayCard>
  );
};

const styles = StyleSheet.create({
  inner: {
    padding: SPACING.base,
    alignItems: 'center',
  },
  avatarWell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: SPACING.sm,
  },
  quote: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  studentClass: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});

export default TestimonialCard;
