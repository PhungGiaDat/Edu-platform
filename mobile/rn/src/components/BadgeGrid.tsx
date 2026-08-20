/**
 * BadgeGrid — grid display of earned and locked badges.
 * Claymorphic card style with scale animation on press.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { BRAND, COLORS, FONT, SPACING, RADIUS, withOpacity } from '../design/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMNS = 3;
const BADGE_SIZE = (SCREEN_WIDTH - SPACING.base * 2 - SPACING.md * (COLUMNS - 1)) / COLUMNS;

export interface BadgeItem {
  id: string;
  emoji: string;
  name: string;
  earned: boolean;
  earnedAt?: string;
}

export interface BadgeGridProps {
  badges: BadgeItem[];
  onBadgePress?: (badge: BadgeItem) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BadgeCard: React.FC<{
  badge: BadgeItem;
  onPress?: (badge: BadgeItem) => void;
}> = ({ badge, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => onPress?.(badge)}
      onPressIn={() => { scale.value = 0.92; }}
      onPressOut={() => { scale.value = 1; }}
      style={[styles.badgeCardWrapper, animatedStyle]}
    >
      <ClayCard
        variant="sm"
        color={badge.earned ? 'yellow' : 'white'}
        padding={0}
        style={styles.badgeCard}
      >
        <View
          style={[
            styles.badgeInner,
            !badge.earned && styles.badgeLocked,
          ]}
        >
          <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
            {badge.earned ? badge.emoji : '🔒'}
          </Text>
        </View>
      </ClayCard>
      <Text
        style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}
        numberOfLines={2}
      >
        {badge.name}
      </Text>
      {badge.earned && badge.earnedAt && (
        <Text style={styles.badgeDate}>
          {formatDate(badge.earnedAt)}
        </Text>
      )}
    </AnimatedPressable>
  );
};

export const BadgeGrid: React.FC<BadgeGridProps> = ({ badges, onBadgePress }) => {
  const rows: BadgeItem[][] = [];
  for (let i = 0; i < badges.length; i += COLUMNS) {
    rows.push(badges.slice(i, i + COLUMNS));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((badge) => (
            <BadgeCard
              key={badge.id}
              badge={badge}
              onPress={onBadgePress}
            />
          ))}
          {/* Fill empty slots */}
          {row.length < COLUMNS &&
            Array.from({ length: COLUMNS - row.length }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.badgeCardWrapper} />
            ))}
        </View>
      ))}
      {badges.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={styles.emptyText}>Chưa có huy hiệu nào</Text>
          <Text style={styles.emptySubtext}>Hoàn thành bài học để nhận huy hiệu!</Text>
        </View>
      )}
    </View>
  );
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  badgeCardWrapper: {
    width: BADGE_SIZE,
    alignItems: 'center',
  },
  badgeCard: {
    width: BADGE_SIZE,
    aspectRatio: 1,
  },
  badgeInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLocked: {
    backgroundColor: withOpacity(COLORS.textMuted, 0.08),
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeEmojiLocked: {
    opacity: 0.4,
  },
  badgeName: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  badgeNameLocked: {
    color: COLORS.textMuted,
  },
  badgeDate: {
    fontSize: FONT.sizes['2xs'],
    color: BRAND.mintGreenDark,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});

export default BadgeGrid;
