// StepQuiz - Quiz step component for LessonPlayer
// Displays quiz questions with image choices

import React from 'react';
import { ImageQuiz } from '@/features/courses/components/CourseLearningBlocks';
import type { Lesson, LessonSessionStepState, QuizSubmitResult } from '@/types/course';
import { StatusPill, statusTone } from './StepShared';

export interface StepQuizProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  answers: Record<string, string>;
  result?: QuizSubmitResult | null;
  onAnswer: (questionId: string, optionId: string) => void;
}

// Copy translations
const COPY = {
  en: {
    quiz: 'Quiz',
    passed: 'Great job! You passed the quiz.',
    retry: 'Nice try! Try again to earn the reward.',
  },
  vi: {
    quiz: 'Quiz',
    passed: 'Gioi qua! Ban da qua bai quiz.',
    retry: 'Tot lam! Thu lai de nhan phan thuong.',
  },
};

export const StepQuiz: React.FC<StepQuizProps> = ({
  lesson,
  currentSessionStep,
  locale,
  answers,
  result,
  onAnswer,
}) => {
  const copy = COPY[locale] || COPY.en;

  return (
    <section className="space-y-4">
      <ImageQuiz
        questions={lesson.quiz}
        answers={answers}
        onAnswer={onAnswer}
      />
      {result && (
        <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 text-center shadow-[0_8px_0_rgba(148,163,184,0.10)]">
          <p className="text-4xl font-black text-slate-800">{result.score}%</p>
          <p
            className={`mt-2 text-lg font-black ${result.passed ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {result.passed ? copy.passed : copy.retry}
          </p>
        </div>
      )}
    </section>
  );
};

export default StepQuiz;
