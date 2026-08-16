/**
 * CourseListScreen — premium course catalog with vibrant playful design.
 *
 * Information architecture:
 *   1. Custom header (back + title + search icon)
 *   2. CategoryChip filter rows (category + level)
 *   3. Featured CourseShowcaseCard (hero card)
 *   4. FlatList of course cards (real data, pull-to-refresh)
 *   5. Empty state + error banner
 *   6. LexiOrb floating
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Image,
  type ListRenderItem,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { CategoryChip } from '../components/CategoryChip';
import { CourseShowcaseCard } from '../components/CourseShowcaseCard';
import { TestimonialCard } from '../components/TestimonialCard';
import { EnrollmentCTA } from '../components/EnrollmentCTA';
import { LexiOrb } from '../components/LexiOrb';
import { LexiBottomSheet } from '../components/LexiBottomSheet';
import { ClayIcon } from '../components/icons/ClayIcons';
import { useCourses } from '../hooks/useCourses';
import { useLocale } from '../i18n/useLocale';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';
import type { Course } from '../types/course';

type CourseLevel = Course['level'];

const LEVEL_CHIPS = [
  { key: 'all', label: 'Tất cả', color: BRAND.vibrantOrange },
  { key: 'beginner', label: 'Sơ cấp', color: BRAND.mintGreen },
  { key: 'intermediate', label: 'Trung cấp', color: BRAND.sunshineYellow },
  { key: 'advanced', label: 'Nâng cao', color: BRAND.coralPink },
];

export const CourseListScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { courses, loading, refreshing, error, refresh } = useCourses();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | 'all'>('all');
  const [lexiVisible, setLexiVisible] = useState(false);

  const nav = navigation as unknown as {
    navigate: (route: string, params: { courseId: string; courseTitle: string }) => void;
  };

  const goToCourseDetail = useCallback(
    (courseId: string, courseTitle: string) => {
      nav.navigate('CourseDetail', { courseId, courseTitle });
    },
    [nav],
  );

  // Derive category options from real data
  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ key: string; label: string; color: string }> = [
      { key: 'all', label: 'Tất cả', color: BRAND.vibrantOrange },
    ];
    for (const course of courses) {
      if (course.category_key && !seen.has(course.category_key)) {
        seen.add(course.category_key);
        const colorMap: Record<string, string> = {
          animals: BRAND.coralPink,
          nature: BRAND.skyBlue,
          school_food: BRAND.mintGreen,
          home_family: BRAND.sunshineYellow,
        };
        options.push({
          key: course.category_key,
          label: course.category_label || course.category_key.replace(/_/g, ' '),
          color: colorMap[course.category_key] ?? BRAND.lavender,
        });
      }
    }
    return options;
  }, [courses]);

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesCategory =
          selectedCategory === 'all' || course.category_key === selectedCategory;
        const matchesLevel =
          selectedLevel === 'all' || course.level === selectedLevel;
        return matchesCategory && matchesLevel;
      }),
    [courses, selectedCategory, selectedLevel],
  );

  const featuredCourse = filteredCourses[0];
  const listCourses = filteredCourses.slice(1);

  const renderItem: ListRenderItem<Course> = useCallback(
    ({ item }) => (
      <CourseRowCard
        course={item}
        onPress={() => goToCourseDetail(item.course_id, item.title)}
      />
    ),
    [goToCourseDetail],
  );

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading && !courses.length) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.vibrantOrange} />
          <Text style={styles.loadingText}>Đang tải khóa học…</Text>
        </View>
        <LexiOrbMini insets={insets} onPress={() => setLexiVisible(true)} />
        <LexiBottomSheet visible={lexiVisible} onDismiss={() => setLexiVisible(false)} />
      </View>
    );
  }

  // ─── Main view ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ─── Custom header ─────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.headerTop}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ClayIcon name="arrowLeft" size={20} color={BRAND.deepSlate} />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Khám phá</Text>
            <Text style={styles.headerSubtitle}>
              {filteredCourses.length} khóa học
            </Text>
          </View>
          <Pressable style={styles.searchButton}>
            <ClayIcon name="sparkle" size={22} color={BRAND.vibrantOrange} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={listCourses}
        keyExtractor={(c) => c.course_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={BRAND.vibrantOrange}
            colors={[BRAND.vibrantOrange]}
          />
        }
        ListHeaderComponent={
          <>
            {/* ─── Category filter chips ─────────────────────────── */}
            <View style={styles.filtersSection}>
              <Text style={styles.filterLabel}>Chủ đề</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {categoryOptions.map((opt) => (
                  <CategoryChip
                    key={opt.key}
                    label={opt.label}
                    active={selectedCategory === opt.key}
                    accentColor={opt.color}
                    onPress={() => setSelectedCategory(opt.key)}
                  />
                ))}
              </ScrollView>

              <Text style={[styles.filterLabel, { marginTop: SPACING.sm }]}>Cấp độ</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {LEVEL_CHIPS.map((opt) => (
                  <CategoryChip
                    key={opt.key}
                    label={opt.label}
                    active={selectedLevel === opt.key}
                    accentColor={opt.color}
                    onPress={() => setSelectedLevel(opt.key as CourseLevel | 'all')}
                  />
                ))}
              </ScrollView>
            </View>

            {/* ─── Error banner ─────────────────────────────────── */}
            {error ? (
              <ClayCard variant="md" color="white" padding={SPACING.md} style={styles.errorBanner}>
                <View style={styles.errorRow}>
                  <ClayIcon name="cloud" size={20} color={BRAND.coralPinkDark} />
                  <Text style={styles.errorText}>Không tải được dữ liệu</Text>
                  <Pressable onPress={refresh} style={styles.retryPill}>
                    <Text style={styles.retryText}>Thử lại</Text>
                  </Pressable>
                </View>
              </ClayCard>
            ) : null}

            {/* ─── Featured hero card ─────────────────────────────── */}
            {featuredCourse ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>Nổi bật</Text>
                  <Text style={styles.sectionTitle}>Khóa học hôm nay</Text>
                </View>
                <CourseShowcaseCard
                  title={featuredCourse.title}
                  imageUrl={featuredCourse.thumbnail_url}
                  subtitle={featuredCourse.subtitle_vi ?? featuredCourse.description}
                  categoryLabel={featuredCourse.category_label}
                  categoryColor={
                    featuredCourse.category_key === 'animals' ? BRAND.coralPink
                    : featuredCourse.category_key === 'nature' ? BRAND.skyBlue
                    : featuredCourse.category_key === 'school_food' ? BRAND.mintGreen
                    : BRAND.sunshineYellow
                  }
                  difficulty={featuredCourse.level}
                  progress={0.25}
                  xpReward={featuredCourse.total_xp ?? 480}
                  lessonCount={featuredCourse.lesson_count}
                  ctaLabel="Học ngay"
                  onCtaPress={() =>
                    goToCourseDetail(featuredCourse.course_id, featuredCourse.title)
                  }
                  onPress={() =>
                    goToCourseDetail(featuredCourse.course_id, featuredCourse.title)
                  }
                />
              </View>
            ) : null}

            {/* ─── All courses header ────────────────────────────── */}
            {listCourses.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>Tất cả</Text>
                  <Text style={styles.sectionTitle}>Các khóa học</Text>
                </View>
              </View>
            ) : null}

            {/* ─── Enrollment CTA when empty ──────────────────────── */}
            {!featuredCourse && !error ? (
              <View style={styles.section}>
                <EnrollmentCTA
                  title="Chưa có khóa học phù hợp"
                  subtitle="Thử chọn bộ lọc khác hoặc quay lại sau nhé"
                  ctaLabel="Xem tất cả"
                  onPress={() => {
                    setSelectedCategory('all');
                    setSelectedLevel('all');
                  }}
                />
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyTitle}>Chưa có khóa học</Text>
              <Text style={styles.emptySubtitle}>
                Thử chọn bộ lọc khác nhé
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: SPACING['3xl'] * 2 }} />}
      />

      {/* ─── Floating LexiOrb ─────────────────────────────────────────────── */}
      <View style={[styles.lexiOrbContainer, { bottom: insets.bottom + 84 }]}>
        <LexiOrb onPress={() => setLexiVisible(true)} animationState="idle" />
      </View>

      <LexiBottomSheet
        visible={lexiVisible}
        onDismiss={() => setLexiVisible(false)}
      />
    </View>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const LexiOrbMini: React.FC<{
  insets: { top: number; bottom: number; left: number; right: number };
  onPress: () => void;
}> = ({ insets, onPress }) => (
  <View style={[styles.lexiOrbContainer, { bottom: insets.bottom + 84 }]}>
    <LexiOrb onPress={onPress} animationState="idle" />
  </View>
);

const CourseRowCard: React.FC<{
  course: Course;
  onPress: () => void;
}> = ({ course, onPress }) => {
  const catColor =
    course.category_key === 'animals' ? BRAND.coralPink
    : course.category_key === 'nature' ? BRAND.skyBlue
    : course.category_key === 'school_food' ? BRAND.mintGreen
    : BRAND.sunshineYellow;

  return (
    <ClayCard variant="md" color="white" padding={0} onPress={onPress} style={styles.rowCard}>
      <View style={[styles.rowCardInner, { backgroundColor: withOpacity(catColor, 0.08) }]}>
        <View style={styles.rowCardLeft}>
          {course.thumbnail_url ? <Image source={{ uri: course.thumbnail_url }} style={styles.rowCardCover} /> : null}
          <View style={[styles.rowCardAccent, { backgroundColor: catColor }]} />
          <View style={styles.rowCardText}>
            <Text style={styles.rowCardTitle} numberOfLines={2}>{course.title}</Text>
            {course.subtitle_vi ? (
              <Text style={styles.rowCardSubtitle} numberOfLines={1}>
                {course.subtitle_vi}
              </Text>
            ) : null}
            <View style={styles.rowCardMeta}>
              <Text style={styles.rowCardMetaText}>📚 {course.lesson_count ?? '?'} bài</Text>
              {course.level ? (
                <View style={[styles.levelChip, { backgroundColor: withOpacity(catColor, 0.15) }]}>
                  <Text style={[styles.levelChipText, { color: catColor }]}>
                    {course.level}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.rowCardRight}>
          {course.total_xp ? (
            <View style={[styles.xpBadge, { backgroundColor: withOpacity(BRAND.sunshineYellow, 0.15) }]}>
              <ClayIcon name="bolt" size={12} color={BRAND.sunshineYellowDark} />
              <Text style={styles.xpBadgeText}>{course.total_xp}</Text>
            </View>
          ) : null}
          <ClayIcon name="arrowRight" size={18} color={COLORS.textMuted} />
        </View>
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

  // Header
  header: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.backgroundBase,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: withOpacity(BRAND.vibrantOrange, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filters
  filtersSection: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingRight: SPACING.base,
    marginBottom: SPACING.xs,
  },

  // List
  listContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },
  rowCard: {
    marginBottom: SPACING.md,
  },
  rowCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  rowCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowCardAccent: {
    width: 4,
    height: 48,
    borderRadius: 2,
    flexShrink: 0,
  },
  rowCardCover: { width: 64, height: 64, borderRadius: RADIUS.md, resizeMode: 'cover', flexShrink: 0 },
  rowCardText: {
    flex: 1,
    gap: 2,
  },
  rowCardTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  rowCardSubtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  rowCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  rowCardMetaText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  levelChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  levelChipText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  rowCardRight: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    gap: 3,
  },
  xpBadgeText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
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

  // Error
  errorBanner: {
    marginBottom: SPACING.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FONT.sizes.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  retryPill: {
    backgroundColor: withOpacity(BRAND.skyBlue, 0.15),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  retryText: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: BRAND.skyBlueDark,
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
    gap: SPACING.sm,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Lexi
  lexiOrbContainer: {
    position: 'absolute',
    right: SPACING.base,
    alignItems: 'center',
  },
});

export default CourseListScreen;
