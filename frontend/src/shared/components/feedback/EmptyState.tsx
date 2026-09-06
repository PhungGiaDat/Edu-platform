/**
 * EmptyState — claymorphic empty state placeholder for LessonPlayer steps.
 * Shown when a step type is present in the step order but has no content
 * (e.g., a lesson with no game, no pronunciation, no vocabulary).
 */
import React from 'react';
import { colors } from '@/design-tokens/claymorphic';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';

const DISPLAY_FONT = "'Baloo 2', 'Quicksand', system-ui, sans-serif";

interface EmptyStateProps {
  /** Vietnamese label for the step type */
  stepLabel: string;
  /** English label for the step type */
  stepLabelEn?: string;
  /** Optional illustration type */
  type?: 'game' | 'vocabulary' | 'pronunciation' | 'reading' | 'video' | 'general';
}

const EmptyStateIllustration: React.FC<{ type: EmptyStateProps['type'] }> = ({ type }) => {
  const labelMap = {
    game: 'Không có trò chơi',
    vocabulary: 'Không có từ vựng',
    pronunciation: 'Không có bài phát âm',
    reading: 'Không có bài đọc',
    video: 'Không có video',
    general: 'Phần này đang cập nhật',
  };

  return (
    <div
      className="flex flex-col items-center justify-center rounded-[28px] border-4 border-white bg-white/80 p-8 text-center"
      style={{ boxShadow: `0 8px 0 rgba(148,163,184,0.10)`, minHeight: 200 }}
    >
      <CodexPetSprite
        animationState="waiting"
        label={labelMap[type]}
        size={80}
      />
      <p
        className="mt-3 text-base font-black text-slate-500"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {labelMap[type]}
      </p>
    </div>
  );
};

export const LessonStepEmptyState: React.FC<EmptyStateProps> = ({
  stepLabel,
  stepLabelEn,
  type = 'general',
}) => {
  return (
    <div className="rounded-[24px] border-4 border-white bg-white/90 p-6">
      <EmptyStateIllustration type={type} />
      <div className="mt-4 space-y-1 text-center">
        <p
          className="text-lg font-black text-slate-600"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {stepLabel}
          {stepLabelEn && (
            <span className="ml-2 text-sm font-semibold text-slate-400">
              ({stepLabelEn})
            </span>
          )}
        </p>
        <p
          className="text-sm font-semibold text-slate-400"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          Phần này đang được cập nhật — con bỏ qua và học phần tiếp theo nhé!
        </p>
      </div>
    </div>
  );
};

export default LessonStepEmptyState;
