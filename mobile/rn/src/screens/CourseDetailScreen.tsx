/**
 * CourseDetailScreen — premium claymorphic course detail.
 *
 * Information architecture:
 *   1. Course hero (title, description, category, stats)
 *   2. "Tiếp tục học" primary CTA card (next lesson + progress)
 *   3. Lessons list (LessonCard with status: not_started / started / completed)
 *   4. LexiOrb floating
 *   5. Designed loading / error / empty states
 *
 * Uses: LevelRing, LessonCard, ClayContinueCard, LexiOrb, LexiBottomSheet.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClayCard } from '../components/ClayCard';
import { ClayButton } from '../components/ClayButton';
import { LevelRing } from '../components/LevelRing';
import { LessonCard, type LessonStatus } from '../components/LessonCard';
import { ClayProgressBar } from '../components/ClayProgressBar';
import { ProgressRing } from '../components/ProgressRing';
import { TestimonialCard } from '../components/TestimonialCard';
import { LexiOrb } from '../components/LexiOrb';
import { LexiBottomSheet } from '../components/LexiBottomSheet';
import { ClayIcon } from '../components/icons/ClayIcons';
import { useCourseDetail } from '../hooks/useCourseDetail';
import { useUser } from '../hooks/useUser';
import { useLocale } from '../i18n/useLocale';
import { coursesApi } from '../services/api';
import {
  BRAND,
  COLORS,
  FONT,
  RADIUS,
  SPACING,
  withOpacity,
} from '../design/tokens';
import type { Lesson } from '../types/course';
import type { RootStackParamList } from '../navigation/AppNavigator';

export const CourseDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'CourseDetail'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { courseId, courseTitle } = route.params;

  const { userId, stats, loading: userLoading } = useUser();
  const {
    course,
    lessons,
    progress,
    progressLoading,
    progressError,
    loading,
    refreshing,
    error,
    refresh,
    refreshProgress,
    setProgress,
  } = useCourseDetail(courseId, userId);

  const [lexiVisible, setLexiVisible] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const nav = navigation as unknown as {
    navigate: (
      route: string,
      params: { lessonId: string; lessonTitle: string; qrCode?: string; lesson?: Lesson },
    ) => void;
  };

  const completedLessonIds = useMemo(
    () => new Set(progress?.completed_lessons ?? []),
    [progress?.completed_lessons],
  );

  const nextLesson = useMemo((): Lesson | null => {
    if (!lessons.length) return null;
    return lessons.find((l) => !completedLessonIds.has(l.lesson_id)) ?? lessons[0];
  }, [lessons, completedLessonIds]);

  const completedCount = completedLessonIds.size;
  const totalCount = lessons.length;
  const courseProgress = totalCount > 0 ? completedCount / totalCount : 0;
  const nextLessonIndex = lessons.findIndex((l) => l.lesson_id === nextLesson?.lesson_id) + 1;

  const startButtonLabel = useMemo(() => {
    if (isStarting) return t('courses.openingLesson') ?? 'Đang mở…';
    if (completedCount > 0) return 'Tiếp tục học';
    return 'Bắt đầu học';
  }, [completedCount, isStarting, t]);

  const refreshCourseState = useCallback(async () => {
    await Promise.all([refresh(), refreshProgress()]);
  }, [refresh, refreshProgress]);

  useFocusEffect(
    useCallback(() => {
      void refreshProgress();
    }, [refreshProgress]),
  );

  const onLessonPress = useCallback(
    (lesson: Lesson) => {
      nav.navigate('LessonPlayer', {
        lessonId: lesson.lesson_id,
        lessonTitle: lesson.title,
        qrCode: lesson.qr_code,
        lesson,
      });
    },
    [nav],
  );

  const handleStartCourse = useCallback(async () => {
    if (!course || !userId) {
      setStartError('Chưa đăng nhập');
      return;
    }
    setIsStarting(true);
    setStartError(null);
    try {
      const response = await coursesApi.startCourse(course.course_id, userId);
      const nextProgress = response.data;
      setProgress(nextProgress);
      const target =
        nextProgress.current_lesson_id ?? lessons[0]?.lesson_id;
      const targetLesson = lessons.find((l) => l.lesson_id === target) ?? lessons[0];
      if (targetLesson) {
        onLessonPress(targetLesson);
      }
    } catch {
      setStartError('Không thể bắt đầu bài học. Thử lại nhé!');
    } finally {
      setIsStarting(false);
    }
  }, [course, lessons, onLessonPress, userId]);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading && !course) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.skyBlue} />
          <Text style={styles.loadingText}>Đang tải khóa học…</Text>
        </View>
      </View>
    );
  }

  // ─── Main view ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.lesson_id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + SPACING.base },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCourseState}
            tintColor={BRAND.skyBlue}
          />
        }
        ListHeaderComponent={
          <>
            {/* ─── Hero ─────────────────────────────────────────────── */}
            <View style={styles.hero}>
              {course?.thumbnail_url ? (
                <Image source={{ uri: course.thumbnail_url }} style={styles.heroCover} />
              ) : null}
              <View style={styles.heroTop}>
                <View style={styles.heroText}>
                  <Text style={styles.heroTitle} numberOfLines={2}>
                    {course?.title ?? courseTitle}
                  </Text>
                  {course?.subtitle_vi ? (
                    <Text style={styles.heroSubtitle} numberOfLines={2}>
                      {course.subtitle_vi}
                    </Text>
                  ) : null}
                  {course?.category_label ? (
                    <View style={styles.categoryRow}>
                      <View
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: withOpacity(BRAND.skyBlue, 0.15),
                            borderColor: withOpacity(BRAND.skyBlue, 0.3),
                          },
                        ]}
                      >
                        <Text style={styles.categoryText}>{course.category_label}</Text>
                      </View>
                      {course?.total_xp ? (
                        <View
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: withOpacity(BRAND.sunshineYellow, 0.15),
                              borderColor: withOpacity(BRAND.sunshineYellow, 0.3),
                            },
                          ]}
                        >
                          <Text style={styles.categoryText}>
                            ⚡ {course.total_xp} XP
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {/* Level ring */}
                <LevelRing
                  level={stats?.level ?? 1}
                  progress={0.5}
                  size={72}
                  strokeWidth={7}
                  color={BRAND.sunshineYellow}
                  bgColor={withOpacity(BRAND.sunshineYellow, 0.15)}
                />
              </View>

              {/* Course description */}
              {course?.description ? (
                <Text style={styles.description} numberOfLines={3}>
                  {course.description}
                </Text>
              ) : null}

              {/* Progress stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statEmoji}>📚</Text>
                  <Text style={styles.statValue}>{totalCount}</Text>
                  <Text style={styles.statLabel}>bài</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statPill}>
                  <Text style={styles.statEmoji}>✅</Text>
                  <Text style={styles.statValue}>{completedCount}</Text>
                  <Text style={styles.statLabel}>hoàn thành</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statPill}>
                  <Text style={styles.statEmoji}>📖</Text>
                  <Text style={styles.statValue}>{totalCount - completedCount}</Text>
                  <Text style={styles.statLabel}>còn lại</Text>
                </View>
              </View>

              {/* Overall progress bar */}
              {totalCount > 0 && (
                <View style={styles.overallProgress}>
                  <ClayProgressBar
                    progress={courseProgress}
                    fillColor={BRAND.mintGreen}
                    trackColor={withOpacity(BRAND.mintGreen, 0.15)}
                    height={10}
                    style={styles.overallBar}
                  />
                  <Text style={styles.overallProgressText}>
                    {Math.round(courseProgress * 100)}% hoàn thành
                  </Text>
                </View>
              )}
            </View>

            {/* ─── Progress ring + testimonial row ─────────────────────── */}
            <View style={styles.progressTestimonialRow}>
              <View style={styles.progressRingSide}>
                <ProgressRing
                  progress={courseProgress}
                  size={90}
                  strokeWidth={8}
                  color={BRAND.neonTeal}
                  bgColor={withOpacity(BRAND.neonTeal, 0.12)}
                  label={`${completedCount}`}
                  sublabel="hoàn thành"
                />
              </View>
              <View style={styles.testimonialSide}>
                <TestimonialCard
                  avatarInitials="H"
                  name="Hà Linh"
                  studentClass="Lớp 2"
                  quote="Khóa học rất vui, con học được rất nhiều từ mới!"
                  rating={5}
                  accentColor={BRAND.coralPink}
                  variant="sm"
                />
              </View>
            </View>

            {/* ─── Continue / Start CTA ───────────────────────────────── */}
            {nextLesson || !completedCount ? (
              <View style={styles.section}>
                {nextLesson ? (
                  <ClayCard
                    variant="lg"
                    color="white"
                    padding={0}
                    onPress={() => void handleStartCourse()}
                    style={styles.continueCard}
                  >
                    <View
                      style={[
                        styles.continueCardInner,
                        { backgroundColor: withOpacity(BRAND.sunshineYellow, 0.12) },
                      ]}
                    >
                      <View style={styles.continueLeft}>
                        <Text style={styles.continueEyebrow}>
                          {completedCount > 0 ? 'Tiếp tục học' : 'Bắt đầu học'}
                        </Text>
                        <Text style={styles.continueTitle} numberOfLines={2}>
                          {nextLesson.title}
                        </Text>
                        {nextLesson.vocabulary.length > 0 ? (
                          <Text style={styles.continueSubtitle}>
                            {nextLesson.vocabulary.length} từ vựng · Bài {nextLessonIndex}
                          </Text>
                        ) : (
                          <Text style={styles.continueSubtitle}>Bài {nextLessonIndex} / {totalCount}</Text>
                        )}
                        {/* Mini progress */}
                        {completedCount > 0 && (
                          <View style={styles.continueMiniProgress}>
                            <View style={styles.continueMiniTrack}>
                              <View
                                style={[
                                  styles.continueMiniFill,
                                  { width: `${courseProgress * 100}%` },
                                ]}
                              />
                            </View>
                            <Text style={styles.continueMiniText}>
                              {completedCount}/{totalCount} bài
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.continueRight}>
                        <View style={styles.continueArrow}>
                          <ClayIcon name="arrowRight" size={22} color={BRAND.sunshineYellowDark} />
                        </View>
                      </View>
                    </View>
                  </ClayCard>
                ) : null}

                {/* Error banner */}
                {startError ? (
                  <ClayCard variant="md" color="white" style={styles.errorBanner}>
                    <View style={styles.errorRow}>
                      <ClayIcon name="close" size={18} color={BRAND.coralPinkDark} />
                      <Text style={styles.errorText}>{startError}</Text>
                      <Pressable onPress={() => setStartError(null)}>
                        <Text style={styles.errorDismiss}>✕</Text>
                      </Pressable>
                    </View>
                  </ClayCard>
                ) : null}

                {/* Start / Continue button */}
                <ClayButton
                  color="yellow"
                  style={styles.startButton}
                  disabled={isStarting || userLoading || progressLoading || Boolean(progressError)}
                  onPress={() => void handleStartCourse()}
                >
                  {isStarting ? 'Đang mở…' : startButtonLabel}
                </ClayButton>
              </View>
            ) : (
              <View style={styles.section}>
                <ClayCard variant="md" color="white">
                  <View style={styles.allDoneCard}>
                    <Text style={styles.allDoneEmoji}>🎉</Text>
                    <Text style={styles.allDoneTitle}>Bạn đã hoàn thành khóa học!</Text>
                    <Text style={styles.allDoneSubtitle}>
                      Tuyệt vời! Hãy chọn khóa học khác nhé.
                    </Text>
                  </View>
                </ClayCard>
              </View>
            )}

            {/* ─── Lessons header ──────────────────────────────────────── */}
            <View style={styles.lessonsHeader}>
              <Text style={styles.lessonsTitle}>Danh sách bài học</Text>
              <Text style={styles.lessonsCount}>
                {completedCount}/{totalCount} hoàn thành
              </Text>
            </View>

            {/* ─── Global error ─────────────────────────────────────── */}
            {error ? (
              <ClayCard variant="md" color="white" style={styles.globalErrorCard}>
                <View style={styles.globalErrorRow}>
                  <ClayIcon name="cloud" size={22} color={BRAND.coralPinkDark} />
                  <View style={styles.globalErrorText}>
                    <Text style={styles.globalErrorTitle}>Không tải được dữ liệu</Text>
                    <Text style={styles.globalErrorSubtitle}>
                      Hãy thử làm mới trong giây lát
                    </Text>
                  </View>
                  <Pressable onPress={() => void refreshCourseState()} style={styles.retryPill}>
                    <ClayIcon name="refresh" size={16} color={BRAND.skyBlueDark} />
                    <Text style={styles.retryText}>Thử lại</Text>
                  </Pressable>
                </View>
              </ClayCard>
            ) : null}
          </>
        }
        renderItem={({ item, index }) => (
          <LessonCard
            index={index + 1}
            title={item.title}
            subtitle={item.title_vi ?? item.description ?? undefined}
            vocabularyCount={item.vocabulary.length}
            status={
              completedLessonIds.has(item.lesson_id)
                ? 'completed'
                : index === 0 && !completedCount
                ? 'started'
                : 'not_started'
            }
            onPress={() => onLessonPress(item)}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyTitle}>Chưa có bài học nào</Text>
              <Text style={styles.emptySubtitle}>
                Khóa học này đang được cập nhật
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: SPACING['3xl'] * 3 }} />}
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
  listContent: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
  },

  // Hero
  hero: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
    shadowColor: '#1A2744',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  heroCover: { width: '100%', height: 180, borderRadius: RADIUS.lg, marginBottom: SPACING.md, resizeMode: 'cover' },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  heroText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  heroTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: FONT.sizes.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  categoryPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(BRAND.skyBlue, 0.07),
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: withOpacity(BRAND.skyBlue, 0.2),
  },
  statEmoji: {
    fontSize: 14,
  },
  statValue: {
    fontSize: FONT.sizes.lg,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Overall progress
  overallProgress: {
    gap: SPACING.xs,
  },

  // Progress ring + testimonial row
  progressTestimonialRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  progressRingSide: {
    flexShrink: 0,
  },
  testimonialSide: {
    flex: 1,
  },
  overallBar: {
    borderRadius: RADIUS.sm,
  },
  overallProgressText: {
    fontSize: FONT.sizes.xs,
    fontWeight: '700',
    color: BRAND.mintGreenDark,
    textAlign: 'right',
  },

  // Continue CTA
  section: {
    marginBottom: SPACING.lg,
  },
  continueCard: {
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  continueCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.base,
    borderRadius: RADIUS.lg,
  },
  continueLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  continueEyebrow: {
    fontSize: FONT.sizes.xs,
    fontWeight: '800',
    color: BRAND.sunshineYellowDark,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  continueTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 22,
  },
  continueSubtitle: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  continueMiniProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  continueMiniTrack: {
    flex: 1,
    height: 5,
    backgroundColor: withOpacity(BRAND.sunshineYellow, 0.2),
    borderRadius: 3,
    overflow: 'hidden',
  },
  continueMiniFill: {
    height: '100%',
    backgroundColor: BRAND.sunshineYellow,
    borderRadius: 3,
  },
  continueMiniText: {
    fontSize: FONT.sizes['2xs'],
    fontWeight: '700',
    color: BRAND.sunshineYellowDark,
    flexShrink: 0,
  },
  continueRight: {
    flexShrink: 0,
  },
  continueArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: BRAND.sunshineYellowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  startButton: {
    marginTop: SPACING.xs,
  },

  // Error
  errorBanner: {
    marginTop: SPACING.sm,
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
  errorDismiss: {
    fontSize: FONT.sizes.md,
    color: COLORS.textMuted,
    fontWeight: '700',
  },

  // All done
  allDoneCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  allDoneEmoji: {
    fontSize: 48,
  },
  allDoneTitle: {
    fontSize: FONT.sizes.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  allDoneSubtitle: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Lessons
  lessonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  lessonsTitle: {
    fontSize: FONT.sizes.xxl,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  lessonsCount: {
    fontSize: FONT.sizes.sm,
    fontWeight: '700',
    color: BRAND.mintGreenDark,
  },

  // Global error
  globalErrorCard: {
    marginBottom: SPACING.lg,
  },
  globalErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  globalErrorText: {
    flex: 1,
  },
  globalErrorTitle: {
    fontSize: FONT.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  globalErrorSubtitle: {
    fontSize: FONT.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  retryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(BRAND.skyBlue, 0.15),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    gap: SPACING.xs,
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
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: FONT.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: FONT.sizes.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Lexi orb
  lexiOrbContainer: {
    position: 'absolute',
    right: SPACING.base,
    alignItems: 'center',
  },
});

export default CourseDetailScreen;
