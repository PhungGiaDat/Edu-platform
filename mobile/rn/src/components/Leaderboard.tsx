/**
 * Leaderboard — ranked list with top 3 medal highlights.
 * Claymorphic card container with pull-to-refresh.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from './ClayCard';
import { BRAND, COLORS, FONT, SPACING, RADIUS, withOpacity } from '../design/tokens';

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  initials?: string;
  xp: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  isTopThree: boolean;
  onPress?: (entry: LeaderboardEntry) => void;
}> = ({ entry, isTopThree, onPress }) => {
  const scale = useSharedValue(1);
  const isCurrentUser = entry.isCurrentUser;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  const getRankDisplay = () => {
    if (isTopThree && entry.rank <= 3) {
      return <Text style={styles.medalEmoji}>{MEDAL_EMOJIS[entry.rank - 1]}</Text>;
    }
    return <Text style={styles.rankNumber}>{entry.rank}</Text>;
  };

  const getBackgroundColor = () => {
    if (entry.rank === 1) return withOpacity(BRAND.sunshineYellow, 0.12);
    if (entry.rank === 2) return withOpacity(BRAND.lightGray, 0.12);
    if (entry.rank === 3) return withOpacity(BRAND.coralPink, 0.12);
    return COLORS.white;
  };

  return (
    <AnimatedPressable
      onPress={() => onPress?.(entry)}
      onPressIn={() => { scale.value = 0.98; }}
      onPressOut={() => { scale.value = 1; }}
      style={animatedStyle}
    >
      <ClayCard
        variant="sm"
        color="white"
        padding={SPACING.sm}
        style={[
          styles.rowCard,
          isCurrentUser && styles.rowCurrentUser,
          { backgroundColor: getBackgroundColor() },
        ]}
      >
        <View style={styles.rowInner}>
          {/* Rank */}
          <View style={styles.rankCell}>
            {getRankDisplay()}
          </View>

          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              isCurrentUser && styles.avatarCurrentUser,
            ]}
          >
            <Text style={styles.avatarText}>
              {entry.initials ?? entry.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>

          {/* Name & Level */}
          <View style={styles.nameCell}>
            <Text
              style={[styles.userName, isCurrentUser && styles.userNameCurrent]}
              numberOfLines={1}
            >
              {entry.name}
              {isCurrentUser && ' (bạn)'}
            </Text>
            <Text style={styles.userLevel}>Lv.{entry.level}</Text>
          </View>

          {/* XP */}
          <View style={styles.xpCell}>
            <Text style={styles.xpIcon}>⭐</Text>
            <Text style={styles.xpValue}>{entry.xp.toLocaleString()}</Text>
          </View>
        </View>
      </ClayCard>
    </AnimatedPressable>
  );
};

export const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  currentUserId,
  onRefresh,
  refreshing = false,
}) => {
  const [localRefreshing, setLocalRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setLocalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setLocalRefreshing(false);
    }
  }, [onRefresh]);

  const isRefreshing = refreshing || localRefreshing;

  return (
    <View style={styles.container}>
      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <View style={styles.podiumSection}>
          {/* Second place */}
          <View style={[styles.podiumItem, styles.podiumSecond]}>
            <View style={[styles.podiumAvatar, { backgroundColor: withOpacity(BRAND.lightGray, 0.3) }]}>
              <Text style={styles.podiumAvatarText}>
                {entries[1].initials ?? entries[1].name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.medalSmall}>🥈</Text>
            <Text style={styles.podiumName} numberOfLines={1}>{entries[1].name}</Text>
            <Text style={styles.podiumXp}>{entries[1].xp.toLocaleString()} XP</Text>
            <View style={[styles.podiumStand, styles.podiumStandSecond]} />
          </View>

          {/* First place */}
          <View style={[styles.podiumItem, styles.podiumFirst]}>
            <View style={[styles.podiumAvatar, { backgroundColor: withOpacity(BRAND.sunshineYellow, 0.3) }]}>
              <Text style={styles.podiumAvatarText}>
                {entries[0].initials ?? entries[0].name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.medalSmall}>🥇</Text>
            <Text style={styles.podiumName} numberOfLines={1}>{entries[0].name}</Text>
            <Text style={styles.podiumXp}>{entries[0].xp.toLocaleString()} XP</Text>
            <View style={[styles.podiumStand, styles.podiumStandFirst]} />
          </View>

          {/* Third place */}
          <View style={[styles.podiumItem, styles.podiumThird]}>
            <View style={[styles.podiumAvatar, { backgroundColor: withOpacity(BRAND.coralPink, 0.3) }]}>
              <Text style={styles.podiumAvatarText}>
                {entries[2].initials ?? entries[2].name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.medalSmall}>🥉</Text>
            <Text style={styles.podiumName} numberOfLines={1}>{entries[2].name}</Text>
            <Text style={styles.podiumXp}>{entries[2].xp.toLocaleString()} XP</Text>
            <View style={[styles.podiumStand, styles.podiumStandThird]} />
          </View>
        </View>
      )}

      {/* Leaderboard list */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={BRAND.lavender}
            />
          ) : undefined
        }
      >
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.userId}
            entry={entry}
            isTopThree={entry.rank <= 3}
          />
        ))}
        {entries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  podiumSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  podiumItem: {
    alignItems: 'center',
    width: 90,
  },
  podiumFirst: {
    marginBottom: SPACING.lg,
  },
  podiumSecond: {
    marginBottom: SPACING.md,
  },
  podiumThird: {
    marginBottom: SPACING.sm,
  },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  podiumAvatarText: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  medalSmall: {
    fontSize: 20,
    marginBottom: 2,
  },
  podiumName: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  podiumXp: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  podiumStand: {
    width: '100%',
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  podiumStandFirst: {
    height: 60,
    backgroundColor: BRAND.sunshineYellow,
  },
  podiumStandSecond: {
    height: 40,
    backgroundColor: withOpacity(BRAND.lightGray, 0.5),
  },
  podiumStandThird: {
    height: 28,
    backgroundColor: BRAND.coralPink,
  },
  list: {
    flex: 1,
    gap: SPACING.sm,
  },
  rowCard: {
    marginHorizontal: SPACING.base,
  },
  rowCurrentUser: {
    borderWidth: 2,
    borderColor: BRAND.lavender,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankCell: {
    width: 36,
    alignItems: 'center',
  },
  medalEmoji: {
    fontSize: 24,
  },
  rankNumber: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarCurrentUser: {
    backgroundColor: withOpacity(BRAND.lavender, 0.3),
  },
  avatarText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  nameCell: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  userName: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userNameCurrent: {
    color: BRAND.lavenderDark,
  },
  userLevel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  xpCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpIcon: {
    fontSize: 14,
  },
  xpValue: {
    fontSize: FONT.sizes.sm,
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
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
  },
});

export default Leaderboard;
