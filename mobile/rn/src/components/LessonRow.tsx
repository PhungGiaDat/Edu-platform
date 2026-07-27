/**
 * LessonRow — claymorphic lesson row used by CourseListScreen and CourseDetailScreen.
 * Composes ClayCard. No raw hex; tokens only.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { ClayCard } from './ClayCard';
import { COLORS, FONT, RADIUS, SPACING } from '../design/tokens';

const INDEX_BADGE_SIZE = 24;
const INDEX_BADGE_RADIUS = INDEX_BADGE_SIZE / 2;
const BULLET_SIZE = 10;
const BULLET_RADIUS = BULLET_SIZE / 2;

export interface LessonRowProps {
  title: string;
  subtitle?: string;
  trailing?: string;
  index?: number;
  disabled?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export const LessonRow: React.FC<LessonRowProps> = ({
  title,
  subtitle,
  trailing,
  index,
  disabled = false,
  style,
  onPress,
}) => (
  <ClayCard
    variant="sm"
    color="white"
    onPress={disabled ? undefined : onPress}
    style={[styles.card, disabled && styles.cardDisabled, style]}
  >
    <View style={styles.content}>
      <View style={styles.leadingColumn}>
        {typeof index === 'number' ? (
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index}</Text>
          </View>
        ) : (
          <View style={styles.bulletDot} />
        )}
      </View>
      <View style={styles.titleColumn}>
        <Text
          style={[styles.title, disabled && styles.titleDisabled]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  </ClayCard>
);

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingColumn: {
    width: 28,
    alignItems: 'center',
  },
  indexBadge: {
    width: INDEX_BADGE_SIZE,
    height: INDEX_BADGE_SIZE,
    borderRadius: INDEX_BADGE_RADIUS,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bulletDot: {
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    borderRadius: BULLET_RADIUS,
    backgroundColor: COLORS.secondary,
  },
  titleColumn: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  titleDisabled: {
    color: COLORS.textMuted,
  },
  subtitle: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  trailing: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
});

export default LessonRow;
