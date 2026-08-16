/**
 * HomeScreen — premium playful education platform.
 *
 * Information architecture:
 *   1. Hero banner (gradient, greeting, motivational tagline, confetti dots)
 *   2. StatsDemoCard (platform aggregate stats)
 *   3. Featured CourseShowcaseCard (primary CTA)
 *   4. CategoryChip filter row
 *   5. CourseCard 2-column grid (real data)
 *   6. TestimonialCard horizontal scroll
 *   7. EnrollmentCTA inline banner
 *   8. LexiOrb floating + BottomTabs fixed
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { CourseShowcaseCard } from '../components/CourseShowcaseCard';
import { CategoryChip } from '../components/CategoryChip';
import { TestimonialCard } from '../components/TestimonialCard';
import { StatsDemoCard } from '../components/StatsDemoCard';
import { EnrollmentCTA } from '../components/EnrollmentCTA';
import { ProgressRing } from '../components/ProgressRing';
import { LexiOrb } from '../components/LexiOrb';
import { LexiBottomSheet } from '../components/LexiBottomSheet';
import { ClayIcon } from '../components/icons/ClayIcons';
import { useCourses } from '../hooks/useCourses';
import { useUser } from '../hooks/useUser';
import { useLocale } from '../i18n/useLocale';
import { BottomTabs, type BottomTabKey } from '../navigation/BottomTabs';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SHADOWS,
  SPACING,
  withOpacity,
} from '../design/tokens';

export interface HomeScreenProps {
  onLogout?: () => Promise<void> | void;
  profileMode?: boolean;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_TESTIMONIALS = [
  {
    id: '1',
    initials: 'M',
    name: 'Minh Anh',
    class: 'Lớp 2',
    quote: 'Con rất thích học tiếng Anh qua AR! Những tấm thẻ 3D khiến việc học trở nên thú vị hơn bao giờ hết.',
    rating: 5,
    color: BRAND.coralPink,
  },
  {
    id: '2',
    initials: 'T',
    name: 'Tuấn Khoa',
    class: 'Lớp 3',
    quote: 'Lexi là trợ lý học tập tuyệt vời. Con có thể hỏi bất cứ lúc nào và được giải thích rất dễ hiểu.',
    rating: 5,
    color: BRAND.skyBlue,
  },
  {
    id: '3',
    initials: 'H',
    name: 'Hà Linh',
    class: 'Lớp 1',
    quote: 'Thú cưng ảo của con đã thúc đẩy con học mỗi ngày. Streak 30 ngày rồi!',
    rating: 5,
    color: BRAND.mintGreen,
  },
];

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Tất cả', color: BRAND.vibrantOrange },
  { key: 'animals', label: 'Động vật', color: BRAND.coralPink },
  { key: 'nature', label: 'Thiên nhiên', color: BRAND.skyBlue },
  { key: 'school_food', label: 'Trường học', color: BRAND.mintGreen },
  { key: 'home_family', label: 'Gia đình', color: BRAND.sunshineYellow },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

// ─── Component ────────────────────────────────────────────────────────────────
export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const navigation = useNavigation();
  const nav = navigation as unknown as {
    navigate: (route: string, params?: object) => void;
  };
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();

  const [activeTab, setActiveTab] = useState<BottomTabKey>('Home');
  const [lexiVisible, setLexiVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { stats, streak, userId, loading: userLoading, error: userError, refresh: refreshUser } =
    useUser();
  const { courses, loading: coursesLoading, error: coursesError, refresh: refreshCourses } =
    useCourses();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refreshCourses()]);
    setRefreshing(false);
  }, [refreshCourses, refreshUser]);

  const handleTabChange = useCallback(
    (next: BottomTabKey) => {
      setActiveTab(next);
      if (next === 'Learning') nav.navigate('LearningPath');
      else if (next === 'Games') nav.navigate('GamesMenu');
      else if (next === 'Pets') nav.navigate('Pets');
      else if (next === 'Profile') nav.navigate('Profile');
    },
    [nav],
  );

  const xpCurrent = useMemo(() => stats?.total_points ?? 0, [stats]);
  const xpToNext = useMemo(
    () => Math.max(stats?.xp_to_next_level ?? xpCurrent, xpCurrent, 100) - xpCurrent,
    [stats?.xp_to_next_level, xpCurrent],
  );
  const level = useMemo(() => stats?.level ?? 1, [stats?.level]);
  const streakDays = useMemo(() => streak?.current_streak ?? 0, [streak]);

  // Filter courses by category
  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'all') return courses;
    return courses.filter((c) => c.category_key === selectedCategory);
  }, [courses, selectedCategory]);

  const featuredCourse = filteredCourses[0];
  const gridCourses = filteredCourses.slice(1, 5);

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (userLoading && !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.vibrantOrange} />
          <Text style={styles.loadingText}>Đang tải hành trình của bạn…</Text>
        </View>
        <View style={[styles.fixedBottom, { paddingBottom: insets.bottom }]}>
          <BottomTabs active={activeTab} onChange={handleTabChange} />
        </View>
      </View>
    );
  }

  // ─── Hero banner ────────────────────────────────────────────────────────────
  const HeroBanner = (
    <View style={styles.heroBannerOuter}>
      <LinearGradient
        colors={[
          withOpacity(BRAND.lavender, 0.35),
          withOpacity(BRAND.skyBlue, 0.25),
          withOpacity(BRAND.lavender, 0.15),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroBanner, { borderRadius: RADIUS.xl }]}
      >
        {/* Confetti dots */}
        <View style={[styles.confettiDot, { top: 12, left: 24, backgroundColor: withOpacity(BRAND.sunshineYellow, 0.7) }]} />
        <View style={[styles.confettiDot, { top: 28, right: 40, backgroundColor: withOpacity(BRAND.coralPink, 0.7) }]} />
        <View style={[styles.confettiDot, { bottom: 20, left: 60, backgroundColor: withOpacity(BRAND.mintGreen, 0.7) }]} />
        <View style={[styles.confettiDot, { bottom: 10, right: 20, backgroundColor: withOpacity(BRAND.lavender, 0.7) }]} />
        <View style={[styles.confettiDot, { top: 20, left: 80, backgroundColor: withOpacity(BRAND.vibrantOrange, 0.6) }]} />

        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroGreeting}>{getGreeting()}, 👋</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              Sẵn sàng cho{'\n'}cuộc phiêu lưu mới?
            </Text>
            <Text style={styles.heroSubtext}>
              Học mỗi ngày, tiến bộ mỗi ngày
            </Text>
          </View>

          <View style={styles.heroRight}>
            {/* Level + streak compact ring */}
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <ProgressRing
                  progress={xpToNext > 0 ? (xpCurrent % xpToNext) / xpToNext : 0}
                  size={56}
                  strokeWidth={5}
                  color={BRAND.sunshineYellow}
                  bgColor={withOpacity(BRAND.sunshineYellow, 0.15)}
                  label={`Lv.${level}`}
                />
              </View>
              <View style={[styles.heroStreakBadge, { backgroundColor: withOpacity(BRAND.coralPink, 0.2) }]}>
                <Text style={styles.heroStreakEmoji}>🔥</Text>
                <Text style={[styles.heroStreakNum, { color: BRAND.coralPinkDark }]}>
                  {streakDays}
                </Text>
                <Text style={styles.heroStreakLabel}>ngày</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + SPACING.sm },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND.vibrantOrange}
            colors={[BRAND.vibrantOrange]}
          />
        }
      >
        {/* ─── A. Hero banner ──────────────────────────────────────── */}
        {HeroBanner}

        {/* ─── A2. Quick AR access ─────────────────────────────────── */}
        <View style={styles.section}>
          <Pressable
            onPress={() => {
              if (__DEV__) {
                nav.navigate('BridgeDiagnostic');
                return;
              }
              nav.navigate('AR', {
                lessonId: 'demo-lesson-001',
                lessonTitle: 'Demo AR Experience',
              });
            }}
            style={({ pressed }) => [
              styles.quickArButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <LinearGradient
              colors={[withOpacity(BRAND.skyBlue, 0.9), withOpacity(BRAND.lavender, 0.9)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickArGradient}
            >
              <View style={styles.quickArLeft}>
                <View style={styles.quickArIcon}>
                  <ClayIcon name="camera" size={24} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.quickArEyebrow}>THỬ NGAY</Text>
                  <Text style={styles.quickArTitle}>AR Experience</Text>
                  <Text style={styles.quickArSubtitle}>Quét thẻ AR để trải nghiệm</Text>
                </View>
              </View>
              <View style={styles.quickArArrow}>
                <ClayIcon name="arrowRight" size={20} color={COLORS.white} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* ─── B. Stats demo card ─────────────────────────────────── */}
        <View style={styles.section}>
          <StatsDemoCard
            studentsCount={12847}
            coursesCount={courses.length > 0 ? courses.length : 36}
            avgRating={4.8}
          />
        </View>

        {/* ─── C. Featured course showcase ───────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Nổi bật</Text>
            <Text style={styles.sectionTitle}>Khóa học hôm nay</Text>
          </View>

          {coursesLoading ? (
            <ClayCard variant="xl" color="white">
              <View style={styles.skeleton}>
                <ActivityIndicator size="large" color={BRAND.sunshineYellow} />
                <Text style={styles.skeletonText}>Đang tải…</Text>
              </View>
            </ClayCard>
          ) : featuredCourse ? (
            <CourseShowcaseCard
              title={featuredCourse.title}
              subtitle={featuredCourse.subtitle_vi ?? featuredCourse.description}
              categoryLabel={featuredCourse.category_label}
              categoryColor={
                featuredCourse.category_key === 'animals' ? BRAND.coralPink
                : featuredCourse.category_key === 'nature' ? BRAND.skyBlue
                : featuredCourse.category_key === 'school_food' ? BRAND.mintGreen
                : BRAND.sunshineYellow
              }
              difficulty={featuredCourse.level}
              progress={0.3}
              xpReward={featuredCourse.total_xp ?? 480}
              lessonCount={featuredCourse.lesson_count}
              completedCount={0}
              ctaLabel="Học ngay"
              onCtaPress={() =>
                nav.navigate('CourseDetail', {
                  courseId: featuredCourse.course_id,
                  courseTitle: featuredCourse.title,
                })
              }
              onPress={() =>
                nav.navigate('CourseDetail', {
                  courseId: featuredCourse.course_id,
                  courseTitle: featuredCourse.title,
                })
              }
            />
          ) : (
            <EnrollmentCTA
              title="Khám phá khóa học đầu tiên"
              subtitle="Rất nhiều chủ đề thú vị đang chờ bạn"
              ctaLabel="Bắt đầu"
              onPress={() => nav.navigate('CourseList')}
            />
          )}
        </View>

        {/* ─── D. Category filter chips ───────────────────────────── */}
        <View style={styles.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {CATEGORY_FILTERS.map((f) => (
              <CategoryChip
                key={f.key}
                label={f.label}
                active={selectedCategory === f.key}
                accentColor={f.color}
                onPress={() => setSelectedCategory(f.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── E. Course grid ─────────────────────────────────────── */}
        {gridCourses.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEyebrow}>Khám phá</Text>
              <Text style={styles.sectionTitle}>Các khóa học</Text>
              {selectedCategory !== 'all' && (
                <Pressable onPress={() => setSelectedCategory('all')}>
                  <Text style={styles.clearFilter}>✕ Bỏ lọc</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.courseGrid}>
              {gridCourses.map((course) => (
                <CourseGridCard
                  key={course.course_id}
                  course={course}
                  onPress={() =>
                    nav.navigate('CourseDetail', {
                      courseId: course.course_id,
                      courseTitle: course.title,
                    })
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* ─── F. Testimonials ────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEyebrow}>Học viên nói gì</Text>
            <Text style={styles.sectionTitle}>Cảm nhận</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialRow}
          >
            {MOCK_TESTIMONIALS.map((t) => (
              <View key={t.id} style={styles.testimonialItem}>
                <TestimonialCard
                  avatarInitials={t.initials}
                  name={t.name}
                  studentClass={t.class}
                  quote={t.quote}
                  rating={t.rating}
                  accentColor={t.color}
                  variant="md"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ─── G. Enrollment CTA ──────────────────────────────────── */}
        <View style={styles.section}>
          <EnrollmentCTA
            title="Bắt đầu hành trình học tập!"
            subtitle="Đăng ký ngay để nhận ưu đãi đặc biệt cho học viên mới"
            ctaLabel="Đăng ký miễn phí"
            icon="sparkle"
            onPress={() => nav.navigate('CourseList')}
          />
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

      {/* ─── Bottom tabs ─────────────────────────────────────── */}
      <View style={[styles.fixedBottom, { paddingBottom: insets.bottom }]}>
        <BottomTabs active={activeTab} onChange={handleTabChange} />
      </View>
    </View>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CourseGridCard: React.FC<{
  course: {
    course_id: string;
    title: string;
    subtitle_vi?: string;
    category_key: string;
    category_label?: string;
    level?: string;
    lesson_count?: number;
    total_xp?: number;
  };
  onPress: () => void;
}> = ({ course, onPress }) => {
  const catColor =
    course.category_key === 'animals' ? BRAND.coralPink
    : course.category_key === 'nature' ? BRAND.skyBlue
    : course.category_key === 'school_food' ? BRAND.mintGreen
    : BRAND.sunshineYellow;

  return (
    <ClayCard
      variant="md"
      color="white"
      padding={SPACING.md}
      onPress={onPress}
      style={styles.gridCard}
    >
      {/* Category accent bar */}
      <View style={[styles.gridCardAccent, { backgroundColor: withOpacity(catColor, 0.2) }]}>
        <View style={[styles.gridCardDot, { backgroundColor: catColor }]} />
      </View>
      <Text style={styles.gridCardTitle} numberOfLines={2}>{course.title}</Text>
      {course.category_label ? (
        <Text style={styles.gridCardCategory}>{course.category_label}</Text>
      ) : null}
      <View style={styles.gridCardMeta}>
        <Text style={styles.gridCardMetaText}>
          📚 {course.lesson_count ?? '?'} bài
        </Text>
        {course.total_xp ? (
          <Text style={styles.gridCardXp}>⚡{course.total_xp}</Text>
        ) : null}
      </View>
    </ClayCard>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundBase,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },

  // Hero
  heroBannerOuter: {
    marginBottom: SPACING.lg,
  },

  // Quick AR button
  quickArButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  quickArGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
  },
  quickArLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  quickArIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickArEyebrow: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.85,
  },
  quickArTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '900',
    color: COLORS.white,
    lineHeight: 22,
  },
  quickArSubtitle: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.8,
  },
  quickArArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroBanner: {
    padding: SPACING.base,
    overflow: 'hidden',
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  heroRight: {},
  heroGreeting: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: FONT.sizes.xxxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroSubtext: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroStatItem: {},
  heroStreakBadge: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  heroStreakEmoji: {
    fontSize: 18,
  },
  heroStreakNum: {
    fontSize: FONT.sizes.xl,
    fontWeight: '900',
  },
  heroStreakLabel: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
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
  clearFilter: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: BRAND.coralPink,
    marginLeft: 'auto',
  },

  // Skeleton
  skeleton: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  skeletonText: {
    fontSize: FONT.sizes.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Category chips
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.base,
  },

  // Course grid
  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  gridCard: {
    width: '47%',
    minHeight: 120,
  },
  gridCardAccent: {
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.sm,
    width: 40,
  },
  gridCardDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 0,
  },
  gridCardTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  gridCardCategory: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  gridCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 'auto',
  },
  gridCardMetaText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  gridCardXp: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
  },

  // Testimonials
  testimonialRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingRight: SPACING.base,
  },
  testimonialItem: {
    width: 260,
  },

  // Lexi orb
  lexiOrbContainer: {
    position: 'absolute',
    right: SPACING.base,
    alignItems: 'center',
  },

  // Bottom tabs
  fixedBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen;
