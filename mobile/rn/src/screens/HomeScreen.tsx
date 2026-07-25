/**
 * HomeScreen — entry point dashboard for the post-login experience.
 *
 * Updated (Sub-task E) to render:
 *   - XP bar (ProgressTracker)
 *   - Streak (StreakBadge) from gamification
 *   - Two claymorphic entry-point cards (Courses + Pets) that navigate via
 *     the parent stack
 *   - Claymorphic bottom-tabs strip (Home / Courses / Pets / Profile)
 *
 * In `profileMode`, the screen renders a profile summary + sign-out button.
 *
 * No AR / Unity bridge. No raw hex colors.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { ProgressTracker } from '../components/ProgressTracker';
import { StreakBadge } from '../components/StreakBadge';
import { useCourses } from '../hooks/useCourses';
import { useGamification } from '../hooks/useGamification';
import { useLocale } from '../i18n/useLocale';
import { usePets } from '../hooks/usePets';
import { BottomTabs, type BottomTabKey } from '../navigation/BottomTabs';
import {
  COLORS,
  FONT,
  SPACING,
} from '../design/tokens';

export interface HomeScreenProps {
  onLogout?: () => Promise<void> | void;
  profileMode?: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onLogout,
  profileMode = false,
}) => {
  const { t } = useLocale();
  const navigation = useNavigation();
  const nav = navigation as unknown as {
    navigate: (route: string) => void;
  };
  const [activeTab, setActiveTab] = useState<BottomTabKey>('Home');

  const handleTabChange = useCallback(
    (next: BottomTabKey) => {
      setActiveTab(next);
      if (next === 'Courses') {
        nav.navigate('CourseList');
      } else if (next === 'Pets') {
        nav.navigate('Pets');
      } else if (next === 'Profile') {
        nav.navigate('Profile');
      }
    },
    [nav],
  );

  const { profile, loading: gamificationLoading, refresh: refreshGamification } =
    useGamification();
  const { pets, refresh: refreshPets } = usePets();
  const { courses, refresh: refreshCourses } = useCourses();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshGamification(),
      refreshPets(),
      refreshCourses(),
    ]);
    setRefreshing(false);
  }, [refreshCourses, refreshGamification, refreshPets]);

  const xpCurrent = useMemo(
    () => profile?.current_xp ?? 0,
    [profile?.current_xp],
  );
  const xpMax = useMemo(
    () => Math.max(profile?.xp_to_next_level ?? xpCurrent, xpCurrent, 100),
    [profile?.xp_to_next_level, xpCurrent],
  );
  const level = useMemo(() => profile?.level ?? 1, [profile?.level]);
  const streakDays = useMemo(
    () => profile?.streak_days ?? 0,
    [profile?.streak_days],
  );

  if (profileMode) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>
              {gamificationLoading ? 'Loading…' : `Level ${level}`}
            </Text>
          </View>
          <ClayCard variant="md" color="white" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Gamification</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total XP</Text>
              <Text style={styles.statValue}>{profile?.total_xp ?? 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Current level</Text>
              <Text style={styles.statValue}>{level}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Streak</Text>
              <Text style={styles.statValue}>{streakDays} days</Text>
            </View>
          </ClayCard>
          {onLogout ? (
            <ClayButton
              color="coral"
              style={styles.logoutButton}
              onPress={() => {
                void onLogout();
              }}
            >
              Sign out
            </ClayButton>
          ) : null}
          <BottomTabs active={activeTab} onChange={handleTabChange} />
        </ScrollView>
      </View>
    );
  }

  if (gamificationLoading && !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
        <BottomTabs active={activeTab} onChange={handleTabChange} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('common.empty').length ? 'Home' : 'Home'}</Text>
          <View style={styles.streakRow}>
            <StreakBadge days={streakDays} />
          </View>
        </View>

        <ProgressTracker currentXP={xpCurrent} maxXP={xpMax} level={level} />

        <View style={styles.entryGrid}>
          <ClayCard
            variant="lg"
            color="yellow"
            style={styles.entryCard}
            onPress={() => nav.navigate('CourseList')}
          >
            <Text style={styles.entryEmoji}>📚</Text>
            <Text style={styles.entryTitle}>Courses</Text>
            <Text style={styles.entrySubtitle}>
              {courses.length} available
            </Text>
            <ClayButton
              color="yellow"
              variant="sm"
              style={styles.entryButton}
              onPress={() => nav.navigate('CourseList')}
            >
              Browse lessons
            </ClayButton>
          </ClayCard>

          <ClayCard
            variant="lg"
            color="green"
            style={styles.entryCard}
            onPress={() => nav.navigate('Pets')}
          >
            <Text style={styles.entryEmoji}>🐾</Text>
            <Text style={styles.entryTitle}>Pets</Text>
            <Text style={styles.entrySubtitle}>
              {pets.length} {pets.length === 1 ? 'companion' : 'companions'}
            </Text>
            <ClayButton
              color="green"
              variant="sm"
              style={styles.entryButton}
              onPress={() => nav.navigate('Pets')}
            >
              Visit pets
            </ClayButton>
          </ClayCard>
        </View>

        <ClayCard variant="md" color="white" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quick stats</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Courses loaded</Text>
            <Text style={styles.statValue}>{courses.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Pets loaded</Text>
            <Text style={styles.statValue}>{pets.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{streakDays} days</Text>
          </View>
        </ClayCard>

        <ClayButton
          color="blue"
          style={styles.profileButton}
          onPress={() => nav.navigate('Profile')}
        >
          View profile
        </ClayButton>

        <BottomTabs active={activeTab} onChange={handleTabChange} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
  },
  streakRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  entryGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  entryCard: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  entryEmoji: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  entryTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  entrySubtitle: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  entryButton: {
    alignSelf: 'stretch',
    marginHorizontal: SPACING.sm,
  },
  sectionCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: FONT.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  logoutButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
});

export default HomeScreen;
