import React, { useState } from 'react';
import type { Lesson, QuizSubmitResult } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';
import { FeedbackMascot } from './FeedbackMascot';
import { ClayStage } from './clayComponents';

interface QuizSectionProps {
  lesson: Lesson;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  result: QuizSubmitResult | null;
  locale: 'en' | 'vi';
  onRetry?: () => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  lesson,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  result,
  locale,
  onRetry,
}) => {
  const quizQuestions = lesson.quiz || [];
  const vocabulary = lesson.vocabulary || [];

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<{
    optionId: string;
    isCorrect: boolean;
  } | null>(null);

  const copy = {
    en: {
      title: 'Quiz Challenge',
      question: 'Câu',
      listenPrompt: 'Nghe câu hỏi',
      submitQuiz: 'Nộp bài Quiz 📝',
      continue: 'Tiếp tục →',
      submitting: 'Đang chấm điểm...',
      passed: 'Xuất sắc! Bé đã vượt qua bài kiểm tra!',
      tryAgain: 'Cố gắng lên nhé! Bé hãy thử lại để nhận sao nha.',
      correctFeedback: 'Chính xác! Giỏi quá!',
      incorrectFeedback: 'Chưa đúng rồi. Cố lên nhé!',
      score: 'Điểm kiểm tra',
    },
    vi: {
      title: 'Thử thách Quiz bài học',
      question: 'Câu',
      listenPrompt: 'Nghe câu hỏi',
      submitQuiz: 'Nộp bài Quiz 📝',
      continue: 'Tiếp tục →',
      submitting: 'Đang chấm điểm...',
      passed: 'Xuất sắc! Bé đã vượt qua bài kiểm tra!',
      tryAgain: 'Cố gắng lên nhé! Bé hãy thử lại để nhận sao nha.',
      correctFeedback: 'Chính xác! Giỏi quá!',
      incorrectFeedback: 'Chưa đúng rồi. Cố lên nhé!',
      score: 'Điểm kiểm tra',
    },
  }[locale];

  const currentQuestion = quizQuestions[activeQuestionIndex] || quizQuestions[0];
  const selectedOptionId =
    (currentQuestion ? answers[currentQuestion.question_id] : undefined) ||
    feedbackState?.optionId;

  const handlePlayAudio = async (questionId: string, text?: string) => {
    if (!text) return;
    setPlayingAudioId(questionId);
    try {
      await AudioService.playPronunciation(text, 'en');
    } finally {
      setPlayingAudioId(null);
    }
  };

  const handleSelectOption = async (optionId: string) => {
    if (!currentQuestion) return;

    onAnswerChange(currentQuestion.question_id, optionId);

    const isCorrect = optionId === currentQuestion.correctOptionId;
    setFeedbackState({ optionId, isCorrect });

    if (isCorrect) {
      await AudioService.playSoundEffect('correct');
      HapticService.success();
    } else {
      await AudioService.playSoundEffect('wrong');
      HapticService.tap();
    }
  };

  const handleAdvance = () => {
    setFeedbackState(null);
    if (activeQuestionIndex < quizQuestions.length - 1) {
      setActiveQuestionIndex((prev) => prev + 1);
    } else {
      onSubmit();
    }
  };

  if (!quizQuestions.length || !currentQuestion) {
    return (
      <div className="rounded-3xl border-4 border-white bg-white/90 p-8 text-center text-slate-500 shadow-md">
        Không có câu hỏi kiểm tra cho bài học này.
      </div>
    );
  }

  // Result screen only shown after actual quiz completion
  if (result) {
    return (
      <div className="space-y-4 animate-fade-in w-full text-center max-w-md mx-auto">
        <div
          className={`rounded-3xl border-4 p-6 text-center shadow-lg animate-fade-in ${
            result.passed
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <span className="text-5xl block mb-2">{result.passed ? '🏆' : '💪'}</span>
          <p className="text-xs font-black uppercase tracking-wider opacity-70 mb-1">
            {copy.score}
          </p>
          <div className="text-4xl sm:text-5xl font-black mb-2">
            {result.score}%
          </div>
          <p className="text-base font-bold max-w-md mx-auto mb-4">
            {result.passed ? copy.passed : copy.tryAgain}
          </p>

          {!result.passed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full min-h-[52px] rounded-2xl border-2 border-white bg-amber-500 hover:bg-amber-600 text-white font-black text-base shadow-[0_5px_0_#B45309] active:translate-y-1 active:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔄</span>
              <span>Làm lại bài kiểm tra</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const promptText = currentQuestion.prompt_vi || currentQuestion.questionAudioText;
  const isLastQuestion = activeQuestionIndex === quizQuestions.length - 1;

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Header: Câu N / 10 + Compact Progress Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
          📝 {copy.question} {activeQuestionIndex + 1} / {quizQuestions.length}
        </span>
        <div className="flex gap-1.5">
          {quizQuestions.map((q, idx) => (
            <div
              key={q.question_id || idx}
              className={`h-2 rounded-full transition-all ${
                idx === activeQuestionIndex
                  ? 'w-6 bg-sky-500 shadow-xs'
                  : answers[q.question_id]
                    ? 'w-2 bg-emerald-400'
                    : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Question Surface with Cyan ClayStage */}
      <ClayStage color="cyan" className="p-4 sm:p-5 flex flex-col items-center">
        {/* Audio question trigger if available */}
        {currentQuestion.questionAudioText && (
          <button
            type="button"
            onClick={() =>
              handlePlayAudio(currentQuestion.question_id, currentQuestion.questionAudioText)
            }
            className="mb-2.5 flex items-center gap-1.5 rounded-full border-2 border-sky-200 bg-white px-3.5 py-1 text-xs font-black text-sky-800 shadow-2xs hover:bg-sky-50 active:scale-95 transition-transform cursor-pointer"
          >
            <span>{playingAudioId === currentQuestion.question_id ? '🔊' : '🔈'}</span>
            <span>{copy.listenPrompt}</span>
          </button>
        )}

        {/* Question Title */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
          {promptText}
        </h3>

        {/* Visual/Text Choices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-4">
          {currentQuestion.options.map((opt) => {
            const isSelected = selectedOptionId === opt.option_id;
            const visual = resolveVocabularyVisual(opt.label, vocabulary, opt.image);
            const hasVisualImage = Boolean(visual.imageUrl);

            return (
              <button
                key={opt.option_id}
                type="button"
                onClick={() => handleSelectOption(opt.option_id)}
                className={`group flex flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all cursor-pointer ${
                  isSelected
                    ? feedbackState?.isCorrect
                      ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200 scale-[1.02] shadow-[0_5px_0_#10B981]'
                      : 'border-rose-400 bg-rose-50 ring-4 ring-rose-200 animate-shake shadow-[0_4px_0_#F43F5E]'
                    : 'border-sky-200 bg-white hover:border-sky-300 hover:bg-sky-50/50 shadow-[0_4px_0_#BAE6FD] active:translate-y-1 active:shadow-[0_2px_0_#BAE6FD]'
                }`}
              >
                {/* Visual image if option has image */}
                {hasVisualImage && (
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-sky-50/50 flex items-center justify-center mb-1.5 overflow-hidden border border-sky-100">
                    <img
                      src={visual.imageUrl!}
                      alt={opt.label}
                      className="h-full w-full object-contain p-1 group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                )}

                <span className="text-base sm:text-lg font-black text-slate-900">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </ClayStage>

      {/* Mascot Feedback (Appears only during feedback moments, never covers content) */}
      {feedbackState && (
        <FeedbackMascot
          mode="feedback"
          state={feedbackState.isCorrect ? 'correct' : 'incorrect'}
          message={
            feedbackState.isCorrect
              ? currentQuestion.feedbackCorrect || copy.correctFeedback
              : currentQuestion.feedbackIncorrect || copy.incorrectFeedback
          }
        />
      )}

      {/* Submit / Check CTA */}
      {selectedOptionId && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleAdvance}
            disabled={isSubmitting}
            className="w-full min-h-[56px] rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-base sm:text-lg shadow-[0_6px_0_#0D9488] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? copy.submitting : isLastQuestion ? copy.submitQuiz : copy.continue}</span>
          </button>
        </div>
      )}
    </section>
  );
};
