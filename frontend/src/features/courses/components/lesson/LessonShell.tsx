import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, Lesson } from '@/types/course';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import { LessonJourney, JOURNEY_STEPS, type JourneyStepId } from './LessonJourney';

interface LessonShellProps {
  course?: Course | null;
  lesson: Lesson;
  courseId: string;
  currentStepIndex: number;
  completedSteps: Set<JourneyStepId>;
  onSelectStep: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
  canGoNext?: boolean;
  notice?: string | null;
  locale: 'en' | 'vi';
  children: React.ReactNode;
}

export const LessonShell: React.FC<LessonShellProps> = ({
  course,
  lesson,
  courseId,
  currentStepIndex,
  completedSteps,
  onSelectStep,
  onPrevious,
  onNext,
  isSubmitting = false,
  canGoNext = true,
  notice,
  locale,
  children,
}) => {
  const navigate = useNavigate();
  const theme: CourseThemeConfig = getCourseTheme(course);
  const currentStep = JOURNEY_STEPS[currentStepIndex] || JOURNEY_STEPS[0];
  const progressPercent = Math.round(
    ((completedSteps.size + (completedSteps.has(currentStep.id) ? 0 : 0.5)) /
      JOURNEY_STEPS.length) *
      100
  );

  const copy = {
    en: {
      back: 'Back to Course',
      lesson: 'Lesson',
      progress: 'Progress',
      previous: 'Previous',
      next: 'Next Activity',
      submitQuiz: 'Submit Quiz',
      finishLesson: 'Complete Lesson',
      submitting: 'Processing...',
    },
    vi: {
      back: 'Về khóa học',
      lesson: 'Bài học',
      progress: 'Tiến độ',
      previous: 'Quay lại',
      next: 'Bước tiếp theo',
      submitQuiz: 'Nộp bài Quiz',
      finishLesson: 'Hoàn thành bài học',
      submitting: 'Đang xử lý...',
    },
  }[locale];

  const getNextButtonLabel = () => {
    if (isSubmitting) return copy.submitting;
    if (currentStep.id === 'quiz') return copy.submitQuiz;
    if (currentStep.id === 'reward') return copy.finishLesson;
    return copy.next;
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col transition-colors duration-500"
      style={{
        background: theme.heroBgGradient,
      }}
    >
      {/* Top Sticky App Header */}
      <header className="sticky top-0 z-30 border-b-4 border-white/80 bg-white/90 backdrop-blur-md px-3 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            aria-label={copy.back}
          >
            <span className="text-base font-black">‹</span>
            <span className="hidden sm:inline">{copy.back}</span>
          </button>

          {/* Center Mascot / Lesson Title Pill */}
          <div className="flex items-center gap-2 text-center min-w-0">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg shadow-sm shrink-0"
              style={{ background: theme.pillBg }}
              title={theme.mascotName}
            >
              {theme.mascotEmoji}
            </span>
            <div className="min-w-0 text-left">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-500 line-clamp-1">
                {locale === 'vi' ? theme.badgeLabelVi : theme.badgeLabelEn} • {copy.lesson} {lesson.order}
              </span>
              <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {locale === 'vi' && lesson.title_vi ? lesson.title_vi : lesson.title}
              </h1>
            </div>
          </div>

          {/* Progress Pill */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block text-right">
              <span className="text-[11px] font-bold text-slate-500">{copy.progress}</span>
              <p className="text-xs font-black text-slate-800">{progressPercent}%</p>
            </div>
            <div className="h-3 w-14 sm:w-20 overflow-hidden rounded-full bg-slate-200 border-2 border-white shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: theme.accentGradient,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="mx-auto max-w-6xl mt-2.5 pt-2 border-t border-slate-100">
          <LessonJourney
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
            onSelectStep={onSelectStep}
            locale={locale}
            theme={theme}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6 flex flex-col justify-center">
        {/* Notice toast if any */}
        {notice && (
          <aside
            aria-live="polite"
            className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-sm animate-fade-in flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🔔</span>
              <span>{notice}</span>
            </div>
          </aside>
        )}

        {/* Child section rendering */}
        <div className="w-full">{children}</div>
      </main>

      {/* Bottom Sticky Action Footer */}
      <footer className="sticky bottom-0 z-30 border-t-4 border-white/80 bg-white/95 backdrop-blur-md px-3 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={currentStepIndex === 0 || isSubmitting}
            className="min-h-12 rounded-2xl border-2 border-slate-200 bg-white px-4 sm:px-6 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← {copy.previous}
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs font-bold text-slate-500">
              {currentStepIndex + 1} / {JOURNEY_STEPS.length}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting || !canGoNext}
              className="min-h-12 min-w-[140px] sm:min-w-[180px] rounded-2xl border-2 border-white px-6 text-sm sm:text-base font-black text-white shadow-md hover:brightness-105 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: theme.accentGradient,
              }}
            >
              {getNextButtonLabel()} →
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
