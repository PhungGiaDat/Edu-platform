import { useMemo, useState } from 'react';

import type { Locale } from '@/contexts/LocaleContext';
import { CodexPetSprite, type CodexPetAnimationState } from '@/features/pets/components/CodexPetSprite';

import type { CourseWarmupQuestion } from '../courseWarmup';

export interface CourseWarmupChallengeProps {
  questions: CourseWarmupQuestion[];
  locale: Locale;
  onComplete?: (correctCount: number) => void;
}

const copy = {
  en: {
    title: 'Play with Lexi',
    progress: (current: number, total: number) => `Question ${current} of ${total}`,
    continue: 'See the mission path',
    complete: 'Your warm-up is complete!',
  },
  vi: {
    title: 'Chơi cùng Lexi',
    progress: (current: number, total: number) => `Câu ${current}/${total}`,
    continue: 'Xem đường nhiệm vụ',
    complete: 'Con đã khởi động xong!',
  },
} as const;

export function CourseWarmupChallenge({ questions, locale, onComplete }: CourseWarmupChallengeProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const currentQuestion = questions[questionIndex];
  const ui = copy[locale];

  const mascotState = useMemo<CodexPetAnimationState>(() => {
    if (isComplete) return 'jumping';
    if (feedback === currentQuestion?.feedbackIncorrect) return 'waiting';
    if (feedback === currentQuestion?.feedbackCorrect) return 'jumping';
    return 'waving';
  }, [currentQuestion?.feedbackCorrect, currentQuestion?.feedbackIncorrect, feedback, isComplete]);

  if (!currentQuestion && !isComplete) return null;

  const handleAnswer = (optionId: string) => {
    if (!currentQuestion || hasAnsweredCorrectly) return;

    if (optionId !== currentQuestion.correctOptionId) {
      setFeedback(currentQuestion.feedbackIncorrect);
      return;
    }

    const nextCorrectCount = correctCount + 1;
    setCorrectCount(nextCorrectCount);
    setHasAnsweredCorrectly(true);
    setFeedback(currentQuestion.feedbackCorrect);
  };

  const handleContinue = () => {
    if (questionIndex + 1 >= questions.length) {
      setIsComplete(true);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setFeedback(null);
    setHasAnsweredCorrectly(false);
  };

  if (isComplete) {
    return (
      <section className="rounded-[32px] border-4 border-white bg-[#EEF9E7] p-5 shadow-[0_10px_0_rgba(34,197,94,0.16)]" aria-labelledby="course-warmup-title">
        <div className="flex items-center gap-4">
          <CodexPetSprite animationState={mascotState} label="Lexi celebrates" size={72} />
          <div>
            <h2 id="course-warmup-title" className="text-2xl font-black text-slate-800">{ui.title}</h2>
            <p role="status" className="mt-1 font-bold text-emerald-700">{ui.complete}</p>
          </div>
        </div>
        <button type="button" className="clay-cta-primary mt-5 min-h-12 w-full justify-center" onClick={() => onComplete?.(correctCount)}>
          {ui.continue}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[32px] border-4 border-white bg-[#F2EBFF] p-5 shadow-[0_10px_0_rgba(139,92,246,0.16)]" aria-labelledby="course-warmup-title">
      <div className="flex items-center gap-4">
        <CodexPetSprite animationState={mascotState} label="Lexi guides the warm-up" size={72} />
        <div>
          <h2 id="course-warmup-title" className="text-2xl font-black text-slate-800">{ui.title}</h2>
          <p className="mt-1 text-sm font-black text-violet-700">{ui.progress(questionIndex + 1, questions.length)}</p>
        </div>
      </div>

      <p className="mt-5 text-xl font-black text-slate-800">{currentQuestion.prompt_vi}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {currentQuestion.options.map((option) => (
          <button
            key={option.option_id}
            type="button"
            className="min-h-12 rounded-3xl border-4 border-white bg-white px-4 py-3 text-left text-lg font-black text-slate-800 shadow-[0_5px_0_rgba(15,23,42,0.10)] transition-colors duration-200 hover:bg-violet-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={hasAnsweredCorrectly}
            onClick={() => handleAnswer(option.option_id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {feedback && <p role="status" className="mt-4 rounded-2xl bg-white px-4 py-3 font-black text-slate-700">{feedback}</p>}
      {hasAnsweredCorrectly && (
        <button type="button" className="clay-cta-primary mt-4 min-h-12 w-full justify-center" onClick={handleContinue}>
          {questionIndex + 1 >= questions.length ? ui.continue : locale === 'vi' ? 'Tiep tuc' : 'Continue'}
        </button>
      )}
    </section>
  );
}

export default CourseWarmupChallenge;
