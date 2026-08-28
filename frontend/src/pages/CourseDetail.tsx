import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AssetTile } from '@/features/courses/components/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
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
import type { Course, UserProgress } from '@/types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

const previewCardTones: Record<string, string> = {
  sky: '#EAF5FF',
  amber: '#FFF1D7',
  violet: '#F2EBFF',
  rose: '#FFE7E3',
  emerald: '#EEF9E7',
};

export const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const copy = {
    en: {
      loadingCourse: 'Loading course...',
      courseNotFound: 'Course not found.',
      back: 'Back',
      startLearning: 'Start learning',
      openingLesson: 'Opening lesson...',
      progress: 'Progress',
      age: 'Age',
      courseSections: 'Course sections',
      minute: 'min',
      words: 'words',
      say: 'say',
      game: 'game',
      quiz: 'quiz',
      review: 'Review',
      startLesson: 'Start lesson',
      studentVoices: 'Student voices',
      sections: 'Sections',
      rewardXp: 'Reward XP',
    },
    vi: {
      loadingCourse: 'Đang tải khóa học...',
      courseNotFound: 'Không tìm thấy khóa học.',
      back: 'Quay lại',
      startLearning: 'Bắt đầu học',
      openingLesson: 'Đang mở bài học...',
      progress: 'Tiến độ',
      age: 'Tuổi',
      courseSections: 'Các phần học',
      minute: 'phút',
      words: 'từ',
      say: 'nói',
      game: 'trò chơi',
      quiz: 'quiz',
      review: 'Ôn lại',
      startLesson: 'Học bài này',
      studentVoices: 'Cảm nhận học viên',
      sections: 'Phần học',
      rewardXp: 'XP thưởng',
    },
  }[locale];

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
        setProgress(progressList.find((item) => item.course_id === nextCourse.course_id) || null);
      })
      .catch((loadError) => {
        console.error('[CourseDetail] load error:', loadError);
        setError(copy.courseNotFound);
      })
      .finally(() => setIsLoading(false));
  }, [copy.courseNotFound, id, user?.id]);

  const handleStart = async () => {
    if (!course) return;
    setIsStarting(true);
    try {
      const nextProgress = await courseService.startCourse(course.course_id, getLearnerId(user?.id));
      setProgress(nextProgress);
      const lessonId = nextProgress.current_lesson_id || course.lessons[0]?.lesson_id;
      navigate(`/courses/${course.course_id}/lessons/${lessonId}`);
    } catch (startError) {
      console.error('[CourseDetail] start error:', startError);
      setError(copy.courseNotFound);
    } finally {
      setIsStarting(false);
    }
  };

  const stats = useMemo(() => {
    if (!course) return { totalXp: 0, completed: 0, percent: 0 };
    const completed = progress?.completed_lessons.length || 0;
    const percent = Math.round((completed / Math.max(course.lessons.length, 1)) * 100);
    return {
      totalXp: course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0),
      completed,
      percent,
    };
  }, [course, progress]);

  if (isLoading) {
    return <div className="min-h-screen clay-bg-playful p-6 text-center text-xl font-black text-slate-700">{copy.loadingCourse}</div>;
  }

  if (!course || error) {
    return (
      <div className="min-h-screen clay-bg-playful p-6 text-center">
        <p className="text-xl font-black text-rose-600">{error || copy.courseNotFound}</p>
        <button type="button" onClick={() => navigate('/courses')} className="clay-cta-primary mt-4">
          {copy.back}
        </button>
      </div>
    );
  }

  const preview = course.catalogPreview.length > 0
    ? course.catalogPreview
    : [
      { label: copy.sections, value: String(course.lessons.length), color: 'sky' },
      { label: copy.rewardXp, value: String(stats.totalXp), color: 'amber' },
      { label: copy.progress, value: `${stats.percent}%`, color: 'violet' },
    ];
  const cta = enrollmentCta(course, locale, copy.startLearning);
  const voices = testimonials(course, locale);

  return (
    <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => navigate('/courses')} className="clay-btn clay-btn-sm bg-white text-slate-700">
            {copy.back}
          </button>
          <div className="clay-badge clay-badge-yellow self-start sm:self-auto">{stats.totalXp} XP</div>
        </div>

        <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
          <div className="rounded-[36px] border-4 border-white bg-white p-5 shadow-[0_12px_0_rgba(91,141,239,0.14)] sm:p-7">
            <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600">
              {copy.age} {course.age_range} - {courseTheme(course, locale)}
            </div>
            <h1 className="text-4xl font-black leading-tight text-slate-800 sm:text-5xl lg:text-6xl">{courseTitle(course, locale)}</h1>
            <p className="mt-4 max-w-3xl text-xl font-bold text-slate-600">{courseSubtitle(course, locale)}</p>
            <p className="mt-3 max-w-3xl text-base font-semibold text-slate-500">
              {courseDescription(course, locale)}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {preview.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-3xl border-4 border-white p-4 shadow-[0_6px_0_rgba(15,23,42,0.08)]"
                  style={{ background: previewCardTones[item.color] || previewCardTones.sky }}
                >
                  <p className="text-3xl font-black text-slate-800">{item.value}</p>
                  <p className="text-sm font-black text-slate-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] border-4 border-white bg-white p-5 shadow-[0_12px_0_rgba(255,142,142,0.14)]">
            <AssetTile asset={course.thumbnail} label={courseTheme(course, locale)} emoji={courseTheme(course, locale).slice(0, 2).toUpperCase()} className="min-h-[250px]" />
            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-black text-slate-600">
                <span>{copy.progress}</span>
                <span>{stats.completed}/{course.lessons.length}</span>
              </div>
              <div className="mt-3 h-4 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#6EB9FF]" style={{ width: `${stats.percent}%` }} />
              </div>
              <p className="mt-2 text-center text-3xl font-black text-slate-800">{stats.percent}%</p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div>
            <h2 className="mb-4 text-3xl font-black text-slate-800">{copy.courseSections}</h2>
            <div className="grid gap-4">
              {course.lessons.map((lesson) => {
                const isComplete = progress?.completed_lessons.includes(lesson.lesson_id) || false;
                return (
                  <Link
                    key={lesson.lesson_id}
                    to={`/courses/${course.course_id}/lessons/${lesson.lesson_id}`}
                    className="rounded-[30px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.12)] transition-transform hover:-translate-y-1"
                  >
                    <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'}`}>
                        {lesson.order}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-slate-800">{lessonTitle(lesson, locale)}</h3>
                        <p className="font-bold text-slate-500">{lessonDescription(lesson, locale)}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                          <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">{lesson.duration_minutes} {copy.minute}</span>
                          <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{lesson.vocabulary.length} {copy.words}</span>
                          {lesson.pronunciation && <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">{copy.say}</span>}
                          {lesson.game && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{copy.game}</span>}
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{lesson.quiz.length} {copy.quiz}</span>
                        </div>
                      </div>
                      <span className="clay-btn clay-btn-sm justify-center bg-[#B4E197] text-slate-800">
                        {isComplete ? copy.review : copy.startLesson}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[34px] border-4 border-white bg-[#FFF1D7] p-5 shadow-[0_10px_0_rgba(248,113,113,0.18)]">
              <h2 className="text-3xl font-black text-slate-900">{cta.headline}</h2>
              <p className="mt-3 font-bold text-slate-700">{cta.body}</p>
              <button
                type="button"
                onClick={handleStart}
                disabled={isStarting}
                className="clay-cta-primary mt-5 w-full justify-center bg-white text-slate-800 disabled:opacity-60"
              >
                {isStarting ? copy.openingLesson : cta.buttonLabel}
              </button>
            </section>

            <section className="rounded-[34px] border-4 border-white bg-white p-5 shadow-[0_10px_0_rgba(91,141,239,0.12)]">
              <h2 className="text-2xl font-black text-slate-800">{copy.studentVoices}</h2>
              <div className="mt-4 space-y-3">
                {voices.map((testimonial, index) => (
                  <div
                    key={`${testimonial.name}-${testimonial.role}`}
                    className="rounded-3xl p-4"
                    style={{ background: Object.values(previewCardTones)[index % Object.values(previewCardTones).length] }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-sky-600 shadow-sm">
                        {testimonial.avatar || testimonial.name.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800">{testimonial.name}</p>
                        <p className="text-sm font-bold text-slate-500">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="mt-3 font-bold text-slate-600">"{testimonial.quote}"</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default CourseDetail;
