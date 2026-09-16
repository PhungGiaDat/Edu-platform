import React, { useState } from 'react';
import type { Lesson, QuizSubmitResult } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { AudioService } from '@/services/AudioService';

interface QuizSectionProps {
  lesson: Lesson;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  result: QuizSubmitResult | null;
  locale: 'en' | 'vi';
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  lesson,
  answers,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  result,
  locale,
}) => {
  const quizQuestions = lesson.quiz || [];
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const copy = {
    en: {
      title: 'Lesson Quiz Challenge',
      subtitle: 'Answer all questions correctly to earn your stars and XP trophy!',
      question: 'Question',
      submitQuiz: 'Submit Answers',
      submitting: 'Grading your quiz...',
      passed: 'Awesome job! You passed the quiz with flying colors!',
      tryAgain: 'Good effort! Try again to achieve a passing score of 70% or higher.',
      unansweredWarning: 'Please answer all questions before submitting.',
      score: 'Your Score',
      listenPrompt: 'Listen to Question',
    },
    vi: {
      title: 'Thử thách Quiz bài học',
      subtitle: 'Trả lời đúng các câu hỏi để nhận sao và phần thưởng cúp XP nhé!',
      question: 'Câu hỏi',
      submitQuiz: 'Nộp bài kiểm tra',
      submitting: 'Đang chấm điểm...',
      passed: 'Xuất sắc! Bé đã vượt qua bài kiểm tra với điểm số tuyệt vời!',
      tryAgain: 'Cố gắng lên nhé! Bé hãy thử lại để đạt từ 70% điểm trở lên để nhận thưởng nha.',
      unansweredWarning: 'Bé hãy chọn đáp án cho tất cả câu hỏi trước khi nộp bài nhé.',
      score: 'Điểm số của bé',
      listenPrompt: 'Nghe câu hỏi',
    },
  }[locale];

  const allAnswered =
    quizQuestions.length > 0 &&
    quizQuestions.every((q) => Boolean(answers[q.question_id]));

  const handlePlayAudio = async (questionId: string, text?: string) => {
    if (!text) return;
    setPlayingAudioId(questionId);
    try {
      await AudioService.playPronunciation(text, 'en');
    } finally {
      setPlayingAudioId(null);
    }
  };

  if (!quizQuestions.length) {
    return (
      <div className="rounded-3xl border-4 border-white bg-white/90 p-8 text-center text-slate-500 shadow-md">
        No quiz questions found for this lesson.
      </div>
    );
  }

  return (
    <section className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          📝 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* Result Banner if already submitted */}
      {result && (
        <div
          className={`rounded-3xl border-4 p-6 text-center shadow-lg animate-fade-in ${
            result.passed
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          <span className="text-4xl block mb-2">{result.passed ? '🏆' : '💪'}</span>
          <p className="text-xs font-black uppercase tracking-wider opacity-70 mb-1">
            {copy.score}
          </p>
          <div className="text-4xl sm:text-5xl font-black mb-2">
            {result.score}%
          </div>
          <p className="text-base font-bold max-w-md mx-auto">
            {result.passed ? copy.passed : copy.tryAgain}
          </p>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-6">
        {quizQuestions.map((q, qIndex) => {
          const selectedOptionId = answers[q.question_id];

          return (
            <article
              key={q.question_id || qIndex}
              className="rounded-3xl border-4 border-white bg-white/95 p-5 sm:p-6 shadow-md"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-sky-600">
                    {copy.question} {qIndex + 1} / {quizQuestions.length}
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {q.prompt_vi || q.questionAudioText}
                  </h3>
                </div>

                {q.questionAudioText && (
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(q.question_id, q.questionAudioText)}
                    className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 shadow-xs"
                    title={copy.listenPrompt}
                  >
                    <span>{playingAudioId === q.question_id ? '🔊' : '🔈'}</span>
                    <span className="hidden sm:inline">{copy.listenPrompt}</span>
                  </button>
                )}
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.option_id;
                  const imgUrl = opt.image ? getAssetCandidateUrls(opt.image)[0] : undefined;

                  return (
                    <button
                      key={opt.option_id}
                      type="button"
                      onClick={() => onAnswerChange(q.question_id, opt.option_id)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-4 text-left transition-all active:scale-98 cursor-pointer ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-200 shadow-md scale-102'
                          : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 border-2 ${
                          isSelected
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-slate-300 bg-white text-slate-500'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </div>

                      {imgUrl && (
                        <div className="h-12 w-12 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                          <img
                            src={imgUrl}
                            alt={opt.label}
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <span className="text-base font-black text-slate-800 capitalize">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!allAnswered || isSubmitting}
          className="min-h-14 w-full sm:w-auto sm:min-w-[260px] rounded-3xl border-4 border-white bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-4 text-base sm:text-lg font-black text-slate-900 shadow-xl hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? `⏳ ${copy.submitting}` : `🚀 ${copy.submitQuiz}`}
        </button>

        {!allAnswered && (
          <p className="text-xs font-semibold text-slate-500 mt-2">
            {copy.unansweredWarning}
          </p>
        )}
      </div>
    </section>
  );
};
