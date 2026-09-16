import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { CourseTrailerCard } from '@/features/courses/components/CourseTrailerCard';
import { CourseWarmupChallenge } from '@/features/courses/components/CourseWarmupChallenge';
import { CourseExploreRail } from '@/features/courses/components/CourseExploreRail';
import { buildCourseExploreCards } from '@/features/courses/courseExploreRail';
import { selectCourseWarmupQuestions } from '@/features/courses/courseWarmup';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import {
  courseDescription,
  courseSubtitle,
  courseTheme,
  courseTitle,
  enrollmentCta,
  lessonDescription,
  lessonTitle,
  testimonials,
} from '@/lib/courseLocale';
import { courseService } from '@/services/CourseService';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import type { Course, Lesson, UserProgress } from '@/types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();

  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const copy = useMemo(
    () =>
      ({
        en: {
          loadingCourse: 'Loading course journey...',
          courseNotFound: 'Course not found or unavailable.',
          back: 'All Courses',
          startLearning: 'Start Learning Now',
          continueLearning: 'Continue Learning',
          openingLesson: 'Opening Lesson...',
          progress: 'Progress',
          age: 'Age',
          level: 'Level',
          duration: 'Estimated Time',
          lessonJourney: '6-Lesson Learning Journey',
          lessonJourneySubtitle: 'Step through each lesson to collect XP, master vocabulary, and unlock stickers.',
          heroLessonBadge: '🌟 HERO LESSON',
          reviewLessonBadge: '🏆 COMPREHENSIVE REVIEW',
          vocabularyPreview: 'Vocabulary Focus',
          learningObjectives: 'What Your Child Will Learn',
          arBannerTitle: 'Augmented Reality (AR) Ready',
          arBannerDesc: 'Selected lessons support interactive 3D AR Flashcards. Children can explore physical cards brought to life in 3D.',
          courseRewards: 'Earned Rewards & Badges',
          studentVoices: 'Parent & Learner Feedback',
          minute: 'min',
          words: 'words',
          startLesson: 'Start Lesson',
          reviewLesson: 'Review Again',
          continueLesson: 'Continue',
          totalLessons: '6 Lessons',
          readyBadge: 'Full Curriculum Ready',
        },
        vi: {
          loadingCourse: 'Đang tải hành trình khóa học...',
          courseNotFound: 'Không tìm thấy khóa học.',
          back: 'Tất cả khóa học',
          startLearning: 'Bắt đầu học ngay',
          continueLearning: 'Học tiếp bài đang dở',
          openingLesson: 'Đang mở bài học...',
          progress: 'Tiến độ hoàn thành',
          age: 'Độ tuổi',
          level: 'Trình độ',
          duration: 'Thời lượng ước tính',
          lessonJourney: 'Hành trình 6 bài học',
          lessonJourneySubtitle: 'Bé hoàn thành từng bài học để thu thập XP, ghi nhớ từ vựng và mở khóa sticker.',
          heroLessonBadge: '🌟 BÀI HỌC TRỌNG TÂM',
          reviewLessonBadge: '🏆 BÀI ÔN TẬP TỔNG HỢP',
          vocabularyPreview: 'Từ vựng trọng tâm',
          learningObjectives: 'Mục tiêu học tập của bé',
          arBannerTitle: 'Tích hợp thẻ tương tác AR 3D',
          arBannerDesc: 'Các bài học trọng tâm hỗ trợ Flashcard AR thực tế ảo 3D. Bé có thể quan sát mô hình chuyển động trực quan.',
          courseRewards: 'Phần thưởng & Huy hiệu đạt được',
          studentVoices: 'Cảm nhận từ phụ huynh và học viên',
          minute: 'phút',
          words: 'từ',
          startLesson: 'Bắt đầu học',
          reviewLesson: 'Ôn lại bài',
          continueLesson: 'Vào học ngay',
          totalLessons: '6 Bài học',
          readyBadge: 'Chương trình hoàn chỉnh',
        },
      })[locale],
    [locale],
  );

  useEffect(() => {
    if (!id) return;
    const learnerId = getLearnerId(user?.id);
    setIsLoading(true);
    setError(null);

    Promise.all([
      courseService.getCourse(id),
      courseService.getProgress(learnerId).catch(() => [] as UserProgress[]),
    ])
      .then(([nextCourse, progressList]) => {
        setCourse(nextCourse);
        const matchProgress = progressList.find((item) => item.course_id === nextCourse.course_id);
        setProgress(matchProgress || null);
      })
      .catch((loadError) => {
        console.error('[CourseDetail] load error:', loadError);
        setError(copy.courseNotFound);
      })
      .finally(() => setIsLoading(false));
  }, [copy.courseNotFound, id, user?.id]);

  const theme: CourseThemeConfig = useMemo(() => getCourseTheme(course), [course]);

  const stats = useMemo(() => {
    if (!course) return { totalXp: 0, completed: 0, percent: 0, totalMinutes: 30 };
    const completed = progress?.completed_lessons?.length || 0;
    const totalLessons = Math.max(course.lessons?.length || 6, 1);
    const percent = Math.min(100, Math.round((completed / totalLessons) * 100));
    const totalXp = (course.lessons || []).reduce((sum, lesson) => sum + (lesson.reward?.xp || 25), 0);
    const totalMinutes = (course.lessons || []).reduce((sum, lesson) => sum + (lesson.duration_minutes || 5), 0);
    return {
      totalXp: totalXp > 0 ? totalXp : 150,
      completed,
      percent,
      totalMinutes: totalMinutes > 0 ? totalMinutes : 30,
    };
  }, [course, progress]);

  const handleStart = async () => {
    if (!course) return;
    setIsStarting(true);
    try {
      const nextProgress = await courseService.startCourse(course.course_id, getLearnerId(user?.id));
      setProgress(nextProgress);
      const targetLessonId = nextProgress.current_lesson_id || course.lessons[0]?.lesson_id;
      navigate(`/courses/${course.course_id}/lessons/${targetLessonId}`);
    } catch (startError) {
      console.error('[CourseDetail] startCourse API failed, falling back to first lesson:', startError);
      const firstLessonId = course.lessons[0]?.lesson_id;
      if (firstLessonId) {
        navigate(`/courses/${course.course_id}/lessons/${firstLessonId}`, {
          state: { startCourseError: String(startError) },
        });
      } else {
        setError(copy.courseNotFound);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleLessonOpen = (lessonId: string) => {
    if (!course) return;
    navigate(`/courses/${course.course_id}/lessons/${lessonId}`);
  };

  const warmupQuestions = useMemo(
    () => (course?.lessons ? selectCourseWarmupQuestions(course.lessons, progress?.current_lesson_id) : []),
    [course?.lessons, progress?.current_lesson_id],
  );

  const exploreCards = useMemo(
    () => (course?.lessons ? buildCourseExploreCards(course.lessons) : []),
    [course?.lessons],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EE] p-6 text-center">
        <div className="rounded-3xl border-4 border-white bg-white p-8 shadow-xl">
          <CodexPetSprite animationState="jumping" label={copy.loadingCourse} size={84} />
          <p className="mt-4 text-xl font-black text-slate-700">{copy.loadingCourse}</p>
        </div>
      </div>
    );
  }

  if (!course || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EE] p-6 text-center">
        <div className="max-w-md rounded-3xl border-4 border-white bg-white p-8 shadow-xl">
          <p className="text-2xl font-black text-rose-600">{error || copy.courseNotFound}</p>
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="mt-6 inline-flex rounded-2xl bg-amber-400 px-6 py-3 text-base font-black text-slate-800 shadow-md transition hover:bg-amber-300"
          >
            ← {copy.back}
          </button>
        </div>
      </div>
    );
  }

  const coverUrl =
    getAssetCandidateUrls(course.thumbnail)[0] ||
    course.thumbnail_url ||
    theme.defaultCoverUrl;

  const cta = enrollmentCta(
    course,
    locale,
    stats.percent > 0 ? copy.continueLearning : copy.startLearning,
  );
  const voices = testimonials(course, locale);

  const completedLessonIds = new Set(progress?.completed_lessons || []);
  const currentLessonId = progress?.current_lesson_id || course.lessons[0]?.lesson_id;

  return (
    <div
      className="min-h-screen w-full max-w-[100vw] overflow-x-hidden pb-24 transition-colors duration-300"
      style={{ background: theme.cardBg }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* TOP NAVIGATION BAR */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← {copy.back}
          </button>

          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 px-3.5 py-1.5 text-xs font-black"
              style={{
                background: theme.pillBg,
                color: theme.pillText,
                borderColor: theme.cardBorder,
              }}
            >
              {locale === 'vi' ? theme.badgeLabelVi : theme.badgeLabelEn}
            </span>
            <span className="inline-flex items-center gap-1 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-black text-amber-800 shadow-sm">
              ⚡ {stats.totalXp} XP
            </span>
          </div>
        </div>

        {/* 1. COURSE HERO SECTION */}
        <header
          className="relative overflow-hidden rounded-[36px] border-4 p-6 shadow-xl sm:p-8 lg:p-10"
          style={{
            background: theme.heroBgGradient,
            borderColor: theme.cardBorder,
          }}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-center">
            {/* Left: Course Details & Text */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-xl bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-sm backdrop-blur-sm">
                  🎯 {copy.age}: {course.age_range || '5-8'}
                </span>
                <span className="rounded-xl bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-sm backdrop-blur-sm">
                  📚 {course.level ? course.level.toUpperCase() : 'BEGINNER'}
                </span>
                <span className="rounded-xl bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-sm backdrop-blur-sm">
                  ⏱️ {stats.totalMinutes} {copy.minute}
                </span>
                <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 shadow-sm">
                  ✓ {copy.readyBadge}
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                {courseTitle(course, locale)}
              </h1>

              <p className="text-lg font-bold text-slate-700 sm:text-xl">
                {courseSubtitle(course, locale)}
              </p>

              <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                {courseDescription(course, locale)}
              </p>

              <p className="max-w-2xl text-xs font-bold text-slate-500 sm:text-sm">
                💡 {locale === 'vi' ? theme.taglineVi : theme.taglineEn}
              </p>

              {/* Action Buttons in Hero */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isStarting}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl px-8 py-4 text-base font-black text-slate-900 shadow-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: theme.primaryAccent,
                    boxShadow: `0 8px 0 rgba(0,0,0,0.12)`,
                  }}
                >
                  {isStarting ? copy.openingLesson : cta.buttonLabel || copy.startLearning} →
                </button>

                <div className="flex items-center gap-2 rounded-2xl border-2 border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
                  <span className="text-xl">🏅</span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-500">{copy.progress}</p>
                    <p className="text-sm font-black text-slate-800">
                      {stats.completed} / {course.lessons.length} {copy.totalLessons.toLowerCase()} ({stats.percent}%)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Course Cover Image & Mascot Framing */}
            <div className="relative flex flex-col items-center">
              <div
                className="relative w-full overflow-hidden rounded-[32px] border-4 border-white bg-white shadow-2xl transition hover:shadow-3xl"
                style={{ aspectRatio: '16/9' }}
              >
                <img
                  src={coverUrl}
                  alt={courseTitle(course, locale)}
                  className="h-full w-full object-cover object-center"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== theme.defaultCoverUrl) {
                      target.src = theme.defaultCoverUrl;
                    }
                  }}
                />

                {/* Floating Mascot Badge */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-2xl border-2 border-white/90 bg-white/90 p-2 shadow-lg backdrop-blur-sm">
                  <CodexPetSprite animationState="waving" label="Lexi guides your next lesson" size={54} />
                  <div className="pr-2 text-left">
                    <p className="text-xs font-bold text-slate-500">Mascot</p>
                    <p className="text-xs font-black text-slate-800">{theme.mascotName}</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar under cover */}
              <div className="mt-4 w-full rounded-2xl border-2 border-white bg-white/80 p-3.5 shadow-sm">
                <div className="flex justify-between text-xs font-black text-slate-600">
                  <span>{copy.progress}</span>
                  <span>{stats.completed}/{course.lessons.length}</span>
                </div>
                <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.percent}%`,
                      background: theme.primaryAccent,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 2. LEARNING OBJECTIVES & AR HIGHLIGHTS */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
              {copy.learningObjectives}
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              {courseTheme(course, locale)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {theme.objectives.map((obj) => (
              <div
                key={obj.titleEn}
                className="flex flex-col rounded-3xl border-2 border-white bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl shadow-inner">
                  {obj.icon}
                </div>
                <h3 className="text-base font-black text-slate-800">
                  {locale === 'vi' ? obj.titleVi : obj.titleEn}
                </h3>
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  {locale === 'vi' ? obj.descVi : obj.descEn}
                </p>
              </div>
            ))}
          </div>

          {/* AR Readiness Callout Card */}
          <div
            className="mt-5 flex flex-col gap-4 rounded-3xl border-2 p-5 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: theme.chipBg,
              borderColor: theme.cardBorder,
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                📱
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {copy.arBannerTitle}
                </h4>
                <p className="text-xs font-medium text-slate-600 sm:text-sm">
                  {locale === 'vi' ? theme.arHighlightsVi : theme.arHighlightsEn}
                </p>
              </div>
            </div>
            <span className="self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm sm:self-center">
              3D AR Ready
            </span>
          </div>
        </section>

        {/* 3. OPTIONAL TRAILER & WARMUP SECTION */}
        {course.courseTrailer && (
          <div className="mt-10">
            <CourseTrailerCard trailer={course.courseTrailer} locale={locale} />
          </div>
        )}

        {warmupQuestions.length > 0 && (
          <div className="mt-10">
            <CourseWarmupChallenge questions={warmupQuestions} locale={locale} />
          </div>
        )}

        {exploreCards.length > 0 && (
          <div className="mt-10">
            <CourseExploreRail cards={exploreCards} locale={locale} onLessonOpen={handleLessonOpen} />
          </div>
        )}

        {/* 4. LESSON JOURNEY & 6 LESSON CARDS */}
        <section className="mt-12">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
              ⚡ {copy.totalLessons}
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
              {copy.lessonJourney}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {copy.lessonJourneySubtitle}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {course.lessons.map((lesson: Lesson) => {
              const isHeroLesson = lesson.lesson_id === theme.heroLessonId;
              const isReviewLesson =
                lesson.order === 6 || lesson.lesson_id.includes('review');
              const isCompleted = completedLessonIds.has(lesson.lesson_id);
              const isCurrent = lesson.lesson_id === currentLessonId && !isCompleted;

              // Resolve thumbnail
              const lessonThumbCandidate = getAssetCandidateUrls(
                lesson.videoLesson?.thumbnail || (lesson as any).thumbnail,
              )[0];
              const lessonImg =
                lessonThumbCandidate ||
                `/learnar-assets/courses/${course.course_id}/lessons/${lesson.lesson_id}/thumb.webp` ||
                coverUrl;

              return (
                <div
                  key={lesson.lesson_id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-[30px] border-4 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                    isHeroLesson
                      ? 'border-amber-400 shadow-lg ring-4 ring-amber-200/50'
                      : isReviewLesson
                        ? 'border-indigo-300 shadow-md ring-2 ring-indigo-100'
                        : 'border-slate-100 shadow-sm'
                  }`}
                >
                  {/* Top Banners */}
                  {isHeroLesson && (
                    <div className="mb-3 -mx-5 -mt-5 flex items-center justify-center bg-gradient-to-r from-amber-400 to-orange-400 py-1.5 text-center text-xs font-black uppercase tracking-wider text-slate-900 shadow-sm">
                      {copy.heroLessonBadge}
                    </div>
                  )}

                  {isReviewLesson && (
                    <div className="mb-3 -mx-5 -mt-5 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 py-1.5 text-center text-xs font-black uppercase tracking-wider text-white shadow-sm">
                      {copy.reviewLessonBadge}
                    </div>
                  )}

                  <div>
                    {/* Header: Order & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black text-slate-700 shadow-inner">
                        #{lesson.order}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          ⏱️ {lesson.duration_minutes || 5} {copy.minute}
                        </span>

                        {isCompleted && (
                          <span className="rounded-xl bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                            ✓ {copy.startLearning ? 'Done' : 'Xong'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lesson Thumbnail */}
                    <div
                      className="mt-3.5 relative overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <img
                        src={lessonImg}
                        alt={lessonTitle(lesson, locale)}
                        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== coverUrl) {
                            target.src = coverUrl;
                          }
                        }}
                      />

                      {/* AR Badge if lesson has AR */}
                      {lesson.arReference && (
                        <span className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-xs">
                          3D AR
                        </span>
                      )}
                    </div>

                    {/* Lesson Titles */}
                    <h3 className="mt-3.5 text-lg font-black text-slate-800 transition group-hover:text-amber-600">
                      {lessonTitle(lesson, locale)}
                    </h3>
                    <p className="text-xs font-semibold text-slate-400">
                      {lesson.title}
                    </p>

                    {/* Short Description */}
                    <p className="mt-2 text-xs font-medium text-slate-600 line-clamp-2">
                      {lessonDescription(lesson, locale)}
                    </p>

                    {/* Vocabulary Preview Chips */}
                    {lesson.vocabulary && lesson.vocabulary.length > 0 && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          {copy.vocabularyPreview}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {lesson.vocabulary.slice(0, 3).map((v) => (
                            <span
                              key={v.word_en}
                              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"
                            >
                              <span>{v.emoji || '🔸'}</span>
                              <span>{v.word_en}</span>
                              {v.word_vi && (
                                <span className="text-slate-400 font-normal">({v.word_vi})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3">
                    <button
                      type="button"
                      onClick={() => handleLessonOpen(lesson.lesson_id)}
                      className={`w-full rounded-2xl py-3 px-4 text-center text-sm font-black transition-all active:scale-95 ${
                        isCompleted
                          ? 'border-2 border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : isCurrent || isHeroLesson
                            ? 'bg-amber-400 text-slate-900 shadow-md hover:bg-amber-300'
                            : 'border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isCompleted
                        ? copy.reviewLesson
                        : isCurrent
                          ? copy.continueLesson
                          : copy.startLesson} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. COURSE REWARDS & PROGRESSION SHOWCASE */}
        <section className="mt-12 rounded-[32px] border-4 border-white bg-white p-6 shadow-md sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {copy.courseRewards}
              </h2>
              <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                {locale === 'vi'
                  ? 'Bé nhận XP và huy hiệu vinh danh khi hoàn thành đủ 6 bài học.'
                  : 'Earn XP, badges, and unlock stickers by finishing all 6 lessons.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 shadow-sm">
                🏆 +{stats.totalXp} XP Total
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3.5 rounded-2xl bg-amber-50/70 p-4 border border-amber-200/60">
              <span className="text-3xl">🏅</span>
              <div>
                <p className="text-xs font-bold text-slate-500">Badge</p>
                <p className="text-sm font-black text-slate-800">
                  {courseTheme(course, locale)} Champion
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl bg-sky-50/70 p-4 border border-sky-200/60">
              <span className="text-3xl">⭐</span>
              <div>
                <p className="text-xs font-bold text-slate-500">Vocabulary Master</p>
                <p className="text-sm font-black text-slate-800">
                  15+ {copy.words}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200/60">
              <span className="text-3xl">🎖️</span>
              <div>
                <p className="text-xs font-bold text-slate-500">Sticker Pack</p>
                <p className="text-sm font-black text-slate-800">
                  Exclusive Digital Stickers
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. STUDENT VOICES / TESTIMONIALS */}
        {voices.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-black text-slate-800">
              {copy.studentVoices}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {voices.map((voice) => (
                <div
                  key={`${voice.name}-${voice.role}`}
                  className="rounded-3xl border-2 border-white bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-700">
                      {voice.avatar || voice.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{voice.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{voice.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium italic text-slate-600">
                    "{voice.quote}"
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 7. STICKY MOBILE/TABLET BOTTOM CTA BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-slate-800">
              {courseTitle(course, locale)}
            </p>
            <p className="text-[11px] font-bold text-slate-500">
              {stats.completed}/{course.lessons.length} {copy.totalLessons.toLowerCase()} • {stats.percent}%
            </p>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={isStarting}
            className="shrink-0 rounded-2xl px-6 py-3 text-sm font-black text-slate-900 shadow-md transition active:scale-95 disabled:opacity-50"
            style={{ background: theme.primaryAccent }}
          >
            {isStarting ? copy.openingLesson : cta.buttonLabel || copy.startLearning}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
