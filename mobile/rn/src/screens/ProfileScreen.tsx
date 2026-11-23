/**
 * ProfileScreen — standalone learner profile with stats visualization.
 *
 * Information architecture:
 *   1. Header (greeting, avatar, edit pill)
 *   2. Level ring — animated SVG progress arc (LevelRing)
 *   3. Quick stats row — XP, streak, lessons
 *   4. Weekly activity chart — 7-day bar chart with ClayProgressBar
 *   5. Badge shelf — earned badges horizontal scroll
 *   6. Active pet card (if pet is set)
 *   7. Settings / Logout
 *   8. LexiOrb floating
 *
 * Replaces the previous HomeScreen-wrapper stub.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { LevelRing } from '../components/LevelRing';
import { ClayProgressBar } from '../components/ClayProgressBar';
import { ProgressRing } from '../components/ProgressRing';
import { TestimonialCard } from '../components/TestimonialCard';
import { StatsDemoCard } from '../components/StatsDemoCard';
import { EnrollmentCTA } from '../components/EnrollmentCTA';
import { LexiOrb } from '../components/LexiOrb';
import { LexiBottomSheet } from '../components/LexiBottomSheet';
import { ClayIcon } from '../components/icons/ClayIcons';
import { useUser } from '../hooks/useUser';
import { useAuth } from '../hooks/useAuth';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';
import type { BottomTabKey } from '../navigation/BottomTabs';

interface ProfileScreenProps {
  onLogout?: () => Promise<void> | void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { stats, streak, activePet, loading, refreshing, refresh } = useUser();
  const { clearToken } = useAuth();
  const [lexiVisible, setLexiVisible] = useState(false);

  const nav = navigation as unknown as {
    navigate: (route: string, params?: object) => void;
  };

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await clearToken();
            onLogout?.();
          },
        },
      ],
    );
  }, [clearToken, onLogout]);

  const handleNavigate = useCallback(
    (tab: BottomTabKey) => {
      if (tab === 'Learning') nav.navigate('LearningPath');
      else if (tab === 'Games') nav.navigate('GamesMenu');
      else if (tab === 'Pets') nav.navigate('Pets');
      else if (tab === 'Profile') {} // already here
    },
    [nav],
  );

  // Weekly data — 7 days, Mon → Sun
  // Real data would come from stats.weekly_activity (not yet in types, using mock)
  const WEEKLY_DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const WEEKLY_MOCK = [0.6, 1.0, 0.4, 0.8, 0.2, 0.9, 0.5];
  const weeklyTotal = WEEKLY_MOCK.reduce((a, b) => a + b, 0);
  const activeDays = WEEKLY_MOCK.filter((v) => v > 0).length;
  const todayIdx = (() => {
    const d = new Date().getDay(); // 0=Sun
    return d === 0 ? 6 : d - 1; // convert to Mon=0 index
  })();

  const xpToNextLevel = (stats?.xp_to_next_level ?? 100);
  const currentXPInLevel = ((stats?.total_points ?? 0) % xpToNextLevel);
  const levelProgress = xpToNextLevel > 0 ? currentXPInLevel / xpToNextLevel : 0;

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
            onRefresh={refresh}
            tintColor={BRAND.skyBlue}
          />
        }
      >
        {/* ─── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()},{' '}
              <Text style={styles.greetingName}>Học viên</Text>
            </Text>
            <Text style={styles.memberSince}>Học viên từ 2024</Text>
          </View>

          {/* Avatar */}
          <View style={styles.avatarWell}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>H</Text>
            </View>
            <View style={styles.editPill}>
              <ClayIcon name="plus" size={12} color={BRAND.skyBlueDark} />
            </View>
          </View>
        </View>

        {/* ─── Level ring hero ─────────────────────────────────── */}
        <ClayCard variant="xl" color="white" padding={0} style={styles.levelCard}>
          <View style={styles.levelCardInner}>
            {/* Left: ring + level info */}
            <View style={styles.levelRingSide}>
              <LevelRing
                level={stats?.level ?? 1}
                progress={levelProgress}
                size={108}
                strokeWidth={10}
                color={BRAND.sunshineYellow}
                bgColor={withOpacity(BRAND.sunshineYellow, 0.15)}
              />
              <Text style={styles.levelNextLabel}>→ Lv.{(stats?.level ?? 1) + 1}</Text>
            </View>

            {/* Right: XP detail */}
            <View style={styles.levelDetailSide}>
              <Text style={styles.levelTitle}>Cấp độ hiện tại</Text>
              <Text style={styles.levelNumber}>Lv.{stats?.level ?? 1}</Text>
              <Text style={styles.levelXP}>
                {currentXPInLevel} / {xpToNextLevel} XP
              </Text>
              <ClayProgressBar
                progress={levelProgress}
                fillColor={BRAND.sunshineYellow}
                trackColor={withOpacity(BRAND.sunshineYellow, 0.15)}
                height={8}
                style={styles.levelProgressBar}
              />
              <Text style={styles.levelTotalXP}>
                Tổng: {stats?.total_points ?? 0} XP
              </Text>
            </View>
          </View>
        </ClayCard>

        {/* ─── Quick stats row ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Của bạn</Text>
            <Text style={styles.sectionTitle}>Thành tích</Text>
          </View>
          <StatsDemoCard
            studentsCount={12847}
            coursesCount={36}
            avgRating={4.8}
            compact
          />
        </View>

        {/* ─── Weekly progress ring ─────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Tuần này</Text>
            <Text style={styles.sectionTitle}>Hoạt động</Text>
            <View style={[styles.weeklySummary, { marginLeft: 'auto' }]}>
              <Text style={styles.weeklySummaryText}>
                {activeDays} ngày hoạt động
              </Text>
            </View>
          </View>

          <ClayCard variant="lg" color="white" padding={SPACING.base}>
            <View style={styles.progressRingRow}>
              {/* Left: ring */}
              <View style={styles.ringSide}>
                <ProgressRing
                  progress={weeklyTotal / 7}
                  size={96}
                  strokeWidth={9}
                  color={BRAND.vibrantOrange}
                  bgColor={withOpacity(BRAND.vibrantOrange, 0.12)}
                  label={`${Math.round((weeklyTotal / 7) * 100)}%`}
                  sublabel="hoàn thành"
                />
              </View>

              {/* Right: daily bars */}
              <View style={styles.dailyBars}>
                {WEEKLY_MOCK.map((value, i) => {
                  const isToday = i === todayIdx;
                  return (
                    <View key={i} style={styles.dayBar}>
                      <View
                        style={[
                          styles.dayBarFill,
                          {
                            height: `${Math.max(value * 100, 4)}%`,
                            backgroundColor: isToday
                              ? BRAND.vibrantOrange
                              : withOpacity(BRAND.vibrantOrange, 0.35),
                            borderRadius: 3,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.dayBarLabel,
                          isToday && { color: BRAND.vibrantOrange },
                        ]}
                      >
                        {WEEKLY_DAYS[i]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </ClayCard>
        </View>

        {/* ─── Student achievement testimonial ─────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Tự hào</Text>
            <Text style={styles.sectionTitle}>Thành tích</Text>
          </View>
          <TestimonialCard
            avatarInitials="M"
            name="Minh Anh"
            studentClass="Lớp 2"
            quote="Học trên EduAR mỗi ngày thật vui! Con đã hoàn thành 15 bài học và nhận được 5 huy hiệu. Lexi giúp con ôn tập rất dễ dàng."
            rating={5}
            accentColor={BRAND.electricPurple}
            variant="md"
          />
        </View>

        {/* ─── Invite a friend CTA ─────────────────────────────── */}
        <View style={styles.section}>
          <EnrollmentCTA
            title="Mời bạn bè cùng học!"
            subtitle="Nhận ưu đãi khi giới thiệu bạn bè tham gia nền tảng"
            ctaLabel="Mời ngay"
            icon="sparkle"
            compact
            onPress={() => {}}
          />
        </View>

        {/* ─── Badge shelf ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Huy hiệu đã đạt</Text>
            <Text style={styles.sectionCount}>
              {stats?.badges?.length ?? 0} / 12
            </Text>
          </View>

          {BADGE_EXAMPLES.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeShelf}
            >
              {BADGE_EXAMPLES.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <ClayCard
                    variant="md"
                    color={badge.earned ? 'yellow' : 'white'}
                    padding={0}
                  >
                    <View
                      style={[
                        styles.badgeWell,
                        !badge.earned && styles.badgeWellLocked,
                      ]}
                    >
                      <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    </View>
                  </ClayCard>
                  <Text
                    style={[
                      styles.badgeName,
                      !badge.earned && styles.badgeNameLocked,
                    ]}
                    numberOfLines={2}
                  >
                    {badge.name}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <ClayCard variant="md" color="white">
              <Text style={styles.emptyBadgesText}>
                Hoàn thành bài học để nhận huy hiệu đầu tiên!
              </Text>
            </ClayCard>
          )}
        </View>

        {/* ─── Active pet card ─────────────────────────────────── */}
        {activePet && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thú cưng của bạn</Text>
            <ClayCard
              variant="lg"
              color="green"
              onPress={() => nav.navigate('Pets')}
              style={styles.petCard}
            >
              <View style={styles.petRow}>
                <View style={styles.petAvatar}>
                  <Text style={styles.petEmoji}>🐾</Text>
                </View>
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{activePet.name}</Text>
                  <Text style={styles.petMood}>Đang ổn 🐾</Text>
                </View>
                <ClayIcon
                  name="arrowRight"
                  size={20}
                  color={BRAND.mintGreenDark}
                />
              </View>
            </ClayCard>
          </View>
        )}

        {/* ─── Settings ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cài đặt</Text>

          <ClayCard variant="md" color="white">
            <SettingsRow
              icon="bolt"
              label="Thông báo"
              trailing="Bật"
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="cloud"
              label="Đồng bộ dữ liệu"
              trailing="Đã đồng bộ"
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="star"
              label="Đánh giá ứng dụng"
              trailing="★★★★★"
            />
          </ClayCard>
        </View>

        {/* ─── Logout ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <ClayButton
            color="white"
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <View style={styles.logoutRow}>
              <ClayIcon name="lock" size={18} color={BRAND.coralPinkDark} />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </View>
          </ClayButton>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: SPACING['3xl'] * 2 }} />
      </ScrollView>

      {/* ─── LexiOrb ─────────────────────────────────────────── */}
      <View style={[styles.lexiOrbContainer, { bottom: insets.bottom + 84 }]}>
        <LexiOrb
          onPress={() => setLexiVisible(true)}
          animationState="idle"
        />
      </View>

      <LexiBottomSheet
        visible={lexiVisible}
        onDismiss={() => setLexiVisible(false)}
      />
    </View>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const SettingsRow: React.FC<{
  icon: 'cloud' | 'star' | 'bolt' | 'lock' | 'refresh' | 'send' | 'mic' | 'cards' | 'paw';
  label: string;
  trailing: string;
}> = ({ icon, label, trailing }) => (
  <View style={styles.settingsRow}>
    <View
      style={[
        styles.settingsIconWell,
        { backgroundColor: withOpacity(BRAND.skyBlue, 0.12) },
      ]}
    >
      <ClayIcon name={icon} size={16} color={BRAND.skyBlueDark} />
    </View>
    <Text style={styles.settingsLabel}>{label}</Text>
    <Text style={styles.settingsTrailing}>{trailing}</Text>
  </View>
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getMoodText(mood: string): string {
  const map: Record<string, string> = {
    happy: 'Rất vui vẻ 🐾',
    excited: 'Phấn khích ✨',
    sleepy: 'Hơi buồn ngủ 😴',
    hungry: 'Đói bụng 🍽️',
  };
  return map[mood] ?? 'Đang ổn 🐾';
}

// Mock badges — real data would come from stats.badges
const BADGE_EXAMPLES = [
  { id: '1', emoji: '🌟', name: 'Khởi đầu', earned: true },
  { id: '2', emoji: '📚', name: 'Học giỏi', earned: true },
  { id: '3', emoji: '🔥', name: '7 ngày streak', earned: true },
  { id: '4', emoji: '🏆', name: 'Hoàn thành 10 bài', earned: false },
  { id: '5', emoji: '💎', name: 'VIP', earned: false },
  { id: '6', emoji: '🎯', name: 'AR Master', earned: false },
];

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  greeting: {
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  greetingName: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  memberSince: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  avatarWell: {
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: BRAND.skyBlueDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.white,
  },
  editPill: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // Level card
  levelCard: {
    marginBottom: SPACING.lg,
  },
  levelCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
  },
  levelRingSide: {
    alignItems: 'center',
    marginRight: SPACING.base,
  },
  levelNextLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  levelDetailSide: {
    flex: 1,
  },
  levelTitle: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  levelNumber: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '900',
    color: BRAND.sunshineYellowDark,
    letterSpacing: -1.5,
    lineHeight: 38,
    marginBottom: 2,
  },
  levelXP: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  levelProgressBar: {
    marginBottom: 4,
    borderRadius: RADIUS.sm,
  },
  levelTotalXP: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 2,
  },
  statCardEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  statCardValue: {
    fontSize: FONT.sizes.lg,
    fontWeight: '900',
  },
  statCardLabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionEyebrow: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    color: BRAND.vibrantOrange,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  sectionCount: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: BRAND.mintGreenDark,
  },
  weeklySummary: {
    backgroundColor: withOpacity(BRAND.vibrantOrange, 0.12),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  weeklySummaryText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: BRAND.vibrantOrangeDark,
  },

  // Weekly chart (progress ring row)
  progressRingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  ringSide: {},
  dailyBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 72,
  },
  dayBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    gap: 4,
  },
  dayBarFill: {
    width: '60%',
    minHeight: 4,
  },
  dayBarLabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Badge shelf
  badgeShelf: {
    paddingRight: SPACING.base,
    gap: SPACING.md,
  },
  badgeItem: {
    alignItems: 'center',
    width: 72,
  },
  badgeWell: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SPACING.sm,
  },
  badgeWellLocked: {
    backgroundColor: withOpacity(COLORS.textMuted, 0.1),
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeName: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  badgeNameLocked: {
    color: COLORS.textMuted,
  },
  emptyBadgesText: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Pet
  petCard: {},
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: withOpacity(BRAND.mintGreen, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  petEmoji: {
    fontSize: 28,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  petMood: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Settings
  settingsDivider: {
    height: 1,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.12),
    marginVertical: SPACING.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  settingsIconWell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  settingsLabel: {
    flex: 1,
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingsTrailing: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
  },

  // Logout
  logoutButton: {
    borderWidth: 1.5,
    borderColor: withOpacity(BRAND.coralPink, 0.3),
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: BRAND.coralPinkDark,
  },

  // Lexi
  lexiOrbContainer: {
    position: 'absolute',
    right: SPACING.base,
    alignItems: 'center',
  },
});

export default ProfileScreen;
