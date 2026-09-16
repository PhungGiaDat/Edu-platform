import React from 'react';
import type { CourseThemeConfig } from '@/features/courses/courseThemes';

export type JourneyStepId =
  | 'warmup'
  | 'video'
  | 'vocabulary'
  | 'listen_choose'
  | 'match'
  | 'ar_flashcards'
  | 'mini_game'
  | 'quiz'
  | 'reward';

export interface JourneyStepMeta {
  id: JourneyStepId;
  labelEn: string;
  labelVi: string;
  shortLabelEn: string;
  shortLabelVi: string;
  icon: string;
  backendStepId?: string;
}

export const JOURNEY_STEPS: JourneyStepMeta[] = [
  {
    id: 'warmup',
    labelEn: 'Warm-up',
    labelVi: 'Khởi động',
    shortLabelEn: 'Khởi động',
    shortLabelVi: 'Khởi động',
    icon: '👋',
    backendStepId: 'intro',
  },
  {
    id: 'video',
    labelEn: 'Video Lesson',
    labelVi: 'Xem video',
    shortLabelEn: 'Video',
    shortLabelVi: 'Xem video',
    icon: '🎬',
    backendStepId: 'watch',
  },
  {
    id: 'vocabulary',
    labelEn: 'Learn Words',
    labelVi: 'Học từ vựng',
    shortLabelEn: 'Từ mới',
    shortLabelVi: 'Từ mới',
    icon: '🔤',
    backendStepId: 'words',
  },
  {
    id: 'listen_choose',
    labelEn: 'Listen & Choose',
    labelVi: 'Nghe & Chọn',
    shortLabelEn: 'Nghe chọn',
    shortLabelVi: 'Nghe chọn',
    icon: '👂',
    backendStepId: 'words',
  },
  {
    id: 'match',
    labelEn: 'Word Match',
    labelVi: 'Nối từ & hình',
    shortLabelEn: 'Nối từ',
    shortLabelVi: 'Nối từ',
    icon: '🧩',
    backendStepId: 'words',
  },
  {
    id: 'ar_flashcards',
    labelEn: '3D AR Cards',
    labelVi: 'Thẻ AR 3D',
    shortLabelEn: 'Thẻ AR',
    shortLabelVi: 'Thẻ AR',
    icon: '📱',
  },
  {
    id: 'mini_game',
    labelEn: 'Mini Games',
    labelVi: 'Trò chơi nhỏ',
    shortLabelEn: 'Trò chơi',
    shortLabelVi: 'Trò chơi',
    icon: '🎮',
    backendStepId: 'game',
  },
  {
    id: 'quiz',
    labelEn: 'Quiz Challenge',
    labelVi: 'Thử thách Quiz',
    shortLabelEn: 'Quiz',
    shortLabelVi: 'Quiz',
    icon: '📝',
    backendStepId: 'quiz',
  },
  {
    id: 'reward',
    labelEn: 'Reward & Trophy',
    labelVi: 'Nhận phần thưởng',
    shortLabelEn: 'Thưởng',
    shortLabelVi: 'Thưởng',
    icon: '🎁',
    backendStepId: 'finish',
  },
];

interface LessonJourneyProps {
  currentStepIndex: number;
  completedSteps: Set<JourneyStepId>;
  onSelectStep: (index: number) => void;
  locale: 'en' | 'vi';
  theme: CourseThemeConfig;
}

export const LessonJourney: React.FC<LessonJourneyProps> = ({
  currentStepIndex,
  completedSteps,
  onSelectStep,
  locale,
  theme,
}) => {
  return (
    <nav
      aria-label="Lesson Journey Stepper"
      className="w-full overflow-x-auto py-1 scrollbar-none no-scrollbar"
    >
      <ol className="flex items-center gap-1.5 min-w-max px-1">
        {JOURNEY_STEPS.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const isCompleted = completedSteps.has(step.id);
          const isAccessible = idx <= currentStepIndex || isCompleted;
          const label = locale === 'vi' ? step.shortLabelVi : step.shortLabelEn;

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => isAccessible && onSelectStep(idx)}
                disabled={!isAccessible}
                aria-current={isActive ? 'step' : undefined}
                className={`group flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black transition-all border-2 ${
                  isActive
                    ? 'border-white text-slate-900 shadow-sm scale-105'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white/70 text-slate-400 hover:bg-white hover:text-slate-600'
                } ${!isAccessible ? 'cursor-not-allowed opacity-40' : 'cursor-pointer active:scale-95'}`}
                style={
                  isActive
                    ? {
                        background: theme.pillBg,
                        color: theme.pillText,
                        borderColor: theme.primaryAccent,
                      }
                    : undefined
                }
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow-xs">
                  {isCompleted && !isActive ? (
                    <span className="text-xs font-black text-emerald-600">✓</span>
                  ) : (
                    step.icon
                  )}
                </span>
                <span className="whitespace-nowrap font-bold text-[11px]">
                  {idx + 1}. {label}
                </span>
              </button>

              {idx < JOURNEY_STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 w-2 rounded-full transition-colors ${
                    isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
