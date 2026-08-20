/**
 * GamificationScreen — comprehensive gamification hub.
 * Shows XP, Level, Streak, Badges, Stickers, and Leaderboard.
 * Uses claymorphic tab navigation between sections.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { ProgressRing } from '../components/ProgressRing';
import { BadgeGrid, type BadgeItem } from '../components/BadgeGrid';
import { StickerCollection, type StickerItem } from '../components/StickerCollection';
import { Leaderboard, type LeaderboardEntry } from '../components/Leaderboard';
import { ClayIcon } from '../components/icons/ClayIcons';
import { useGamification } from '../hooks/useGamification';
import { useUser } from '../hooks/useUser';
import {
  BRAND,
  COLORS,
  FONT,
  SPACING,
  RADIUS,
  withOpacity,
} from '../design/tokens';

type TabKey = 'badges' | 'stickers' | 'leaderboard';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'badges', label: 'Thành tựu', icon: '🏅' },
  { key: 'stickers', label: 'Bộ sưu tập', icon: '🎨' },
  { key: 'leaderboard', label: 'Xếp hạng', icon: '📊' },
];

// Mock data for development (real API TBD)
const MOCK_BADGES: BadgeItem[] = [
  { id: '1', emoji: '🌟', name: 'Khởi đầu', earned: true, earnedAt: '2024-01-15' },
  { id: '2', emoji: '📚', name: 'Học giỏi', earned: true, earnedAt: '2024-02-20' },
  { id: '3', emoji: '🔥', name: '7 ngày streak', earned: true, earnedAt: '2024-03-10' },
  { id: '4', emoji: '🏆', name: 'Hoàn thành 10 bài', earned: true, earnedAt: '2024-03-15' },
  { id: '5', emoji: '💎', name: 'VIP Member', earned: false },
  { id: '6', emoji: '🎯', name: 'AR Master', earned: false },
  { id: '7', emoji: '⚡', name: 'Nhanh như chớp', earned: false },
  { id: '8', emoji: '🌈', name: 'Đa sắc', earned: false },
  { id: '9', emoji: '🚀', name: 'Tên lửa', earned: false },
];

const MOCK_STICKERS: StickerItem[] = [
  { id: '1', emoji: '🐱', name: 'Mèo con', unlocked: true },
  { id: '2', emoji: '🐶', name: 'Chó con', unlocked: true },
  { id: '3', emoji: '🐰', name: 'Thỏ trắng', unlocked: true },
  { id: '4', emoji: '🦊', name: 'Cáo', unlocked: false },
  { id: '5', emoji: '🐼', name: 'Gấu trúc', unlocked: false },
  { id: '6', emoji: '🦁', name: 'Sư tử', unlocked: false },
  { id: '7', emoji: '🐸', name: 'Ếch', unlocked: false },
  { id: '8', emoji: '🦋', name: 'Bướm', unlocked: false },
  { id: '9', emoji: '🌸', name: 'Hoa anh đào', unlocked: false },
  { id: '10', emoji: '⭐', name: 'Sao', unlocked: false },
  { id: '11', emoji: '🌈', name: 'Cầu vồng', unlocked: false },
  { id: '12', emoji: '🎈', name: 'Bóng bay', unlocked: false },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u1', name: 'Minh Anh', initials: 'MA', xp: 12500, level: 12 },
  { rank: 2, userId: 'u2', name: 'Hoàng Nam', initials: 'HN', xp: 11200, level: 11 },
  { rank: 3, userId: 'u3', name: 'Thu Hà', initials: 'TH', xp: 9800, level: 10 },
  { rank: 4, userId: 'u4', name: 'An Khoa', initials: 'AK', xp: 8500, level: 9 },
  { rank: 5, userId: 'u5', name: 'Linh Chi', initials: 'LC', xp: 7200, level: 8 },
  { rank: 6, userId: 'u6', name: 'Bảo Long', initials: 'BL', xp: 6800, level: 8 },
  { rank: 7, userId: 'u7', name: 'Hạ Vy', initials: 'HV', xp: 5500, level: 7 },
  { rank: 8, userId: 'u8', name: 'Gia Huy', initials: 'GH', xp: 4200, level: 6 },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TabPill: React.FC<{
  tab: { key: TabKey; label: string; icon: string };
  isActive: boolean;
  onPress: (key: TabKey) => void;
}> = ({ tab, isActive, onPress }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  return (
    <AnimatedPressable
      onPress={() => onPress(tab.key)}
      onPressIn={() => { scale.value = 0.95; }}
      onPressOut={() => { scale.value = 1; }}
      style={animatedStyle}
    >
      <View
        style={[
          styles.tabPill,
          isActive && styles.tabPillActive,
        ]}
      >
        <Text style={styles.tabIcon}>{tab.icon}</Text>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

export const GamificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('badges');
  const [refreshing, setRefreshing] = useState(false);
  const [badges] = useState<BadgeItem[]>(MOCK_BADGES);
  const [stickers] = useState<StickerItem[]>(MOCK_STICKERS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);

  const { profile, loading, refresh } = useGamification();
  const { stats } = useUser();

  const currentUser: LeaderboardEntry = {
    rank: 5,
    userId: 'current',
    name: 'Bạn',
    initials: 'T',
    xp: stats?.total_points ?? 7200,
    level: stats?.level ?? 8,
    isCurrentUser: true,
  };

  const enrichedLeaderboard = useMemo(() => {
    return [currentUser, ...leaderboard]
      .sort((a, b) => b.xp - a.xp)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [currentUser, leaderboard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const levelProgress = useMemo(() => {
    const xpInLevel = (profile?.total_points ?? 0) % (profile?.xp_to_next_level ?? 100);
    const xpNeeded = profile?.xp_to_next_level ?? 100;
    return xpNeeded > 0 ? xpInLevel / xpNeeded : 0;
  }, [profile]);

  const currentLevel = profile?.level ?? stats?.level ?? 1;
  const currentXP = profile?.total_points ?? stats?.total_points ?? 0;
  const currentStreak = profile?.streak_days ?? stats?.streak_days ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.base },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.lavender}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Thành tựu</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ClayIcon name="arrowLeft" size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        {/* Stats Hero Card */}
        <ClayCard variant="lg" color="white" style={styles.heroCard}>
          <View style={styles.heroInner}>
            {/* Progress Ring */}
            <View style={styles.ringContainer}>
              <ProgressRing
                progress={levelProgress}
                size={100}
                strokeWidth={10}
                color={BRAND.sunshineYellow}
                bgColor={withOpacity(BRAND.sunshineYellow, 0.15)}
                label={`Lv.${currentLevel}`}
                sublabel="cấp độ"
              />
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>⭐</Text>
                <Text style={styles.statValue}>{currentXP.toLocaleString()}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={styles.statValue}>{currentStreak}</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🏅</Text>
                <Text style={styles.statValue}>{badges.filter((b) => b.earned).length}</Text>
                <Text style={styles.statLabel}>Huy hiệu</Text>
              </View>
            </View>
          </View>
        </ClayCard>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {TABS.map((tab) => (
            <TabPill
              key={tab.key}
              tab={tab}
              isActive={activeTab === tab.key}
              onPress={setActiveTab}
            />
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'badges' && (
            <BadgeGrid
              badges={badges}
              onBadgePress={(badge) => console.log('Badge pressed:', badge.name)}
            />
          )}
          {activeTab === 'stickers' && (
            <StickerCollection
              stickers={stickers}
              onStickerPress={(sticker) => console.log('Sticker pressed:', sticker.name)}
            />
          )}
          {activeTab === 'leaderboard' && (
            <Leaderboard
              entries={enrichedLeaderboard}
              currentUserId="current"
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          )}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: SPACING['3xl'] * 2 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  backButton: {
    padding: SPACING.sm,
  },
  heroCard: {
    marginBottom: SPACING.lg,
  },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringContainer: {
    marginRight: SPACING.lg,
  },
  statsGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT.sizes.xl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: withOpacity(COLORS.textMuted, 0.15),
  },
  tabContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingRight: SPACING.base,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabPillActive: {
    backgroundColor: withOpacity(BRAND.lavender, 0.15),
    borderColor: BRAND.lavender,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: BRAND.lavenderDark,
  },
  tabContent: {
    flex: 1,
  },
});

export default GamificationScreen;
