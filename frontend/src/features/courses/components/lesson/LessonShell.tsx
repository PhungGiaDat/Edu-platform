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
      back: 'Exit',
      lesson: 'Lesson',
      previous: 'Previous',
      next: 'Continue',
      submitQuiz: 'Submit Quiz',
      finishLesson: 'Complete Lesson 🎉',
      submitting: 'Processing...',
    },
    vi: {
      back: 'Thoát',
      lesson: 'Bài học',
      previous: 'Quay lại',
      next: 'Tiếp tục',
      submitQuiz: 'Nộp bài Quiz',
      finishLesson: 'Hoàn thành bài học 🎉',
      submitting: 'Đang xử lý...',
    },
  }[locale];

  const getNextButtonLabel = () => {
    if (isSubmitting) return copy.submitting;
    if (currentStep.id === 'quiz') return copy.submitQuiz;
    if (currentStep.id === 'reward') return copy.finishLesson;
    return copy.next;
  };

  const stepTitle = locale === 'vi' ? currentStep.labelVi : currentStep.labelEn;

  return (
    <div
      className="min-h-screen w-full flex flex-col transition-colors duration-300 overflow-x-hidden"
      style={{
        background: theme.heroBgGradient,
      }}
    >
      {/* Top Mobile App Header with iOS Safe Area */}
      <header className="sticky top-0 z-30 border-b-2 border-white/80 bg-white/95 backdrop-blur-md px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 shadow-xs">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-base font-black text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            aria-label={copy.back}
          >
            ✕
          </button>

          {/* Center: Thin Progress Bar & Step Info */}
          <div className="flex-1 min-w-0 px-2">
            <div className="flex items-center justify-between mb-1 text-[11px] font-black text-slate-500">
              <span className="truncate text-slate-800 font-extrabold">
                {locale === 'vi' && lesson.title_vi ? lesson.title_vi : lesson.title} • {stepTitle}
              </span>
              <span className="shrink-0 font-black text-slate-600">
                {currentStepIndex + 1} / {JOURNEY_STEPS.length}
              </span>
            </div>
            {/* Thin clean progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/60 shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-400 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background: theme.accentGradient,
                }}
              />
            </div>
          </div>

          {/* Theme Mascot Badge */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl shadow-xs border-2 border-white"
            style={{ background: theme.pillBg }}
            title={theme.mascotName}
          >
            {theme.mascotEmoji}
          </div>
        </div>

        {/* Compact Stepper Track */}
        <div className="mx-auto max-w-lg mt-1.5 pt-1 border-t border-slate-100/80">
          <LessonJourney
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
            onSelectStep={onSelectStep}
            locale={locale}
            theme={theme}
          />
        </div>
      </header>

      {/* Main Learning Task Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 flex flex-col justify-center min-h-0">
        {notice && (
          <aside
            aria-live="polite"
            className="mb-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-black text-amber-900 shadow-xs animate-fade-in flex items-center gap-2"
          >
            <span className="text-sm">🔔</span>
            <span>{notice}</span>
          </aside>
        )}

        {/* Child Interactive Section */}
        <div className="w-full min-w-0">{children}</div>
      </main>

      {/* Sticky Bottom Action Bar with iOS Safe Area */}
      <footer className="sticky bottom-0 z-30 border-t-2 border-white/90 bg-white/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={onPrevious}
              disabled={isSubmitting}
              className="flex h-13 px-4 items-center justify-center rounded-2xl border-2 border-slate-200 bg-white text-sm font-black text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              aria-label={copy.previous}
            >
              ←
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            disabled={isSubmitting || !canGoNext}
            className="flex-1 min-h-[52px] h-13 rounded-2xl border-2 border-white px-6 text-base sm:text-lg font-black text-white shadow-[0_5px_0_rgba(0,0,0,0.15)] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: theme.accentGradient,
            }}
          >
            <span>{getNextButtonLabel()}</span>
            <span>→</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
