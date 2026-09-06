// StepFinish - Finish/Reward step component for LessonPlayer
// Displays the lesson completion reward

import React from 'react';
import { AssetTile } from '@/features/courses/components/CourseLearningBlocks';
import type { Lesson, LessonSessionStepState, QuizSubmitResult } from '@/types/course';

export interface StepFinishProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  result?: QuizSubmitResult | null;
}

// Copy translations
const COPY = {
  en: {
    rewardTitle: 'Earn reward',
    readyReward: 'Ready for your reward?',
    finishPrompt: 'Finish the lesson and save your progress.',
    passed: 'Great job! You passed the quiz.',
    retry: 'Nice try! Try again to earn the reward.',
  },
  vi: {
    rewardTitle: 'Nhan phan thuong',
    readyReward: 'San sang nhan phan thuong chua?',
    finishPrompt: 'Hoan thanh bai hoc va luu tien do.',
    passed: 'Gioi qua! Ban da qua bai quiz.',
    retry: 'Tot lam! Thu lai de nhan phan thuong.',
  },
};

export const StepFinish: React.FC<StepFinishProps> = ({
  lesson,
  currentSessionStep,
  locale,
  result,
}) => {
  const copy = COPY[locale] || COPY.en;

  return (
    <section className="rounded-[34px] border-4 border-white bg-[#FFF8D8] p-6 text-center shadow-[0_10px_0_rgba(229,184,0,0.16)]">
      <div className="mx-auto max-w-2xl rounded-[28px] border-4 border-white bg-white/90 p-5">
        <AssetTile
          asset={lesson.reward?.sticker}
          label={lesson.reward?.badgeTitle || copy.rewardTitle}
          emoji="XP"
          className="mx-auto max-w-sm"
          showAssetMeta
        />
        <p className="mt-5 text-3xl font-black text-slate-800">{copy.readyReward}</p>
        <p className="mt-2 font-bold text-slate-500">{copy.finishPrompt}</p>
        {result && (
          <div className="mx-auto mt-4 max-w-sm rounded-[24px] bg-slate-50 px-5 py-4 shadow-[0_6px_0_rgba(148,163,184,0.10)]">
            <p className="text-3xl font-black text-slate-800">{result.score}%</p>
            <p className="font-bold text-slate-600">
              {result.passed ? copy.passed : copy.retry}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StepFinish;
