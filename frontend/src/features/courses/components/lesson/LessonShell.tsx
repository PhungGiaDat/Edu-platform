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
  showFooterNext?: boolean;
  notice?: string | null;
  locale: 'en' | 'vi';
  children: React.ReactNode;
}

export const LessonShell: React.FC<LessonShellProps> = ({
  course,
  courseId,
  currentStepIndex,
  completedSteps,
  onSelectStep,
  onPrevious,
  onNext,
  isSubmitting = false,
  canGoNext = true,
  showFooterNext = true,
  notice,
  locale,
  children,
}) => {
  const navigate = useNavigate();
  const theme: CourseThemeConfig = getCourseTheme(course);
  const currentStep = JOURNEY_STEPS[currentStepIndex] || JOURNEY_STEPS[0];

  const [visibleNotice, setVisibleNotice] = React.useState<string | null>(notice ?? null);

  React.useEffect(() => {
    if (!notice) {
      setVisibleNotice(null);
      return;
    }
    setVisibleNotice(notice);
    const timer = setTimeout(() => {
      setVisibleNotice(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [notice]);

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
      className="relative min-h-screen w-full flex flex-col transition-colors duration-300 overflow-x-hidden"
      style={{
        background: theme.heroBgGradient,
        ['--lesson-bottom-action-height' as any]: '4.5rem',
      }}
    >
      {/* Layered organic backdrop — soft floating blobs + tiny decorative motifs, no flat single gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-20 -left-16 h-64 w-64 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] bg-[#20D6A4]/18 blur-3xl" />
        <div className="absolute top-1/4 -right-20 h-72 w-72 rounded-[55%_45%_40%_60%/45%_55%_45%_55%] bg-[#20BCEB]/16 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-[50%_50%_60%_40%/55%_45%_50%_50%] bg-[#8B5CF6]/12 blur-3xl" />
        <div className="absolute bottom-40 right-8 h-32 w-32 rounded-full bg-[#FFD34E]/14 blur-2xl" />
        <span className="absolute top-24 right-10 text-2xl opacity-20 select-none">✦</span>
        <span className="absolute top-52 left-6 text-lg opacity-15 select-none">✦</span>
        <span className="absolute bottom-24 left-10 text-xl opacity-15 select-none">•</span>
      </div>

      {/* Compact floating header — no rectangular chrome bar, blends with backdrop */}
      <header className="sticky top-0 z-30 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1.5">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          {/* Small circular back/close */}
          <button
            type="button"
            onClick={() => navigate(`/courses/${courseId}`)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#FFC4BE] text-sm font-black text-rose-950 shadow-[0_3px_0_#F24E42] hover:brightness-105 transition-all active:translate-y-1 active:shadow-[0_1px_0_#F24E42] cursor-pointer"
            aria-label={copy.back}
          >
            ✕
          </button>

          {/* Center: compact label */}
          <span className="min-w-0 flex-1 truncate text-center text-xs font-black text-slate-700">
            {stepTitle}
          </span>

          {/* Small step icon chip */}
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base shadow-[0_3px_0_rgba(0,0,0,0.12)] border-2 border-white"
            style={{ background: theme.pillBg }}
            title={theme.mascotName}
          >
            {theme.mascotEmoji}
          </div>
        </div>

        {/* Segmented colorful progress path — dots, not a rectangular bar */}
        <div className="mx-auto mt-1.5 flex max-w-lg items-center justify-center gap-1 px-1">
          {JOURNEY_STEPS.map((step, idx) => {
            const isDone = completedSteps.has(step.id) || idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <span
                key={step.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent ? 'w-5' : 'w-1.5'
                }`}
                style={{
                  background: isDone || isCurrent ? theme.accentGradient : 'rgba(148,163,184,0.35)',
                }}
              />
            );
          })}
        </div>

        {/* Desktop Stepper Track - Hidden on Mobile to avoid screen clutter */}
        <div className="hidden sm:block mx-auto max-w-lg mt-2 pt-1 border-t border-slate-200/50">
          <LessonJourney
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
            onSelectStep={onSelectStep}
            locale={locale}
            theme={theme}
          />
        </div>
      </header>

      {/* Floating Save Progress Notification Toast */}
      {visibleNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm rounded-2xl border-2 border-white bg-[#FBD65C] px-4 py-2.5 text-xs font-black text-amber-950 shadow-[0_4px_0_#F0B72B] animate-fade-in flex items-center gap-2 pointer-events-none"
        >
          <span className="text-sm">🔔</span>
          <span className="truncate">{visibleNotice}</span>
        </div>
      )}

      {/* Main Learning Task Area */}
      <main className="flex-1 w-full max-w-md sm:max-w-lg mx-auto px-4 pt-3 pb-[calc(88px+env(safe-area-inset-bottom,12px))] sm:pb-32 flex flex-col justify-start min-h-0">

        {/* Child Interactive Section */}
        <div className="w-full min-w-0">{children}</div>
      </main>

      {/* Sticky Bottom Action Bar with iOS Safe Area */}
      {(currentStepIndex > 0 || showFooterNext) && (
        <footer className="sticky bottom-0 z-30 border-t-4 border-white bg-[#F2FBF8] px-4 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_0_rgba(32,214,164,0.1)]">
          <div className="mx-auto flex w-full max-w-[448px] items-center gap-3">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={onPrevious}
                disabled={isSubmitting}
                className="flex h-13 px-4 items-center justify-center rounded-2xl border-2 border-white bg-[#BBD9FE] text-sm font-black text-blue-950 shadow-[0_4px_0_#5B96EE] hover:brightness-105 transition-all active:translate-y-1 active:shadow-[0_1px_0_#5B96EE] disabled:opacity-40 cursor-pointer"
                aria-label={copy.previous}
              >
                ←
              </button>
            )}

            {showFooterNext && (
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
            )}
          </div>
        </footer>
      )}
    </div>
  );
};
