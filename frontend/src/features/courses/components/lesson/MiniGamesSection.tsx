import React, { useEffect, useMemo, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';

interface MiniGamesSectionProps {
  lesson: Lesson;
  onComplete: () => void;
  locale: 'en' | 'vi';
}

export const MiniGamesSection: React.FC<MiniGamesSectionProps> = ({
  lesson,
  onComplete,
  locale,
}) => {
  const vocabulary: VocabularyItem[] = useMemo(() => lesson.vocabulary || [], [lesson.vocabulary]);

  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [completedWordKeys, setCompletedWordKeys] = useState<Set<string>>(new Set());

  const currentTarget = vocabulary[currentTargetIndex] || vocabulary[0];

  const copy = {
    en: {
      title: 'Memory & Learning Mini Game',
      subtitle: 'Trò chơi rèn luyện trí nhớ — Lật thẻ tìm cặp tương ứng',
      momoSays: 'Momo says',
      findPicture: 'Find the matching picture!',
      tapToHear: 'Tap to listen',
      correct: 'Awesome! You found the right picture!',
      tryAgain: 'Not quite, try again!',
      continue: 'Continue →',
      finishGame: 'Game Complete 🎉',
      allCompleted: 'Hooray! You completed the Momo picture challenge!',
    },
    vi: {
      title: 'Trò chơi rèn luyện trí nhớ',
      subtitle: 'Lật thẻ tìm cặp tương ứng & Chọn hình theo Momo',
      momoSays: 'Momo nói',
      findPicture: 'Bé hãy chạm vào bức hình đúng nhé!',
      tapToHear: 'Chạm để nghe lại',
      correct: 'Giỏi quá! Bé tìm đúng hình rồi!',
      tryAgain: 'Chưa đúng rồi, bé thử lại nhé!',
      continue: 'Tiếp tục →',
      finishGame: 'Hoàn thành trò chơi 🎉',
      allCompleted: 'Xuất sắc! Bé đã vượt qua thử thách chọn hình của Momo!',
    },
  }[locale];

  // Play pronunciation for current target word
  const playTargetAudio = async () => {
    if (!currentTarget) return;
    try {
      const visual = resolveVocabularyVisual(currentTarget.word_en, vocabulary, currentTarget.image);
      await AudioService.playPronunciation(currentTarget.word_en, 'en', visual.imageUrl || undefined);
    } catch (err) {
      console.warn('[MiniGame] audio play error:', err);
    }
  };

  useEffect(() => {
    setSelectedWord(null);
    setFeedback(null);
    if (currentTarget) {
      const timer = window.setTimeout(() => {
        playTargetAudio();
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [currentTargetIndex]);

  const handleChoice = async (item: VocabularyItem) => {
    if (!currentTarget || feedback?.correct) return;
    setSelectedWord(item.word_en);

    const isCorrect = item.word_en.toLowerCase() === currentTarget.word_en.toLowerCase();

    if (isCorrect) {
      await AudioService.playSoundEffect('correct');
      HapticService.success();
      setFeedback({
        correct: true,
        message: `${copy.correct} "${currentTarget.word_en}" là "${currentTarget.word_vi}".`,
      });
      setCompletedWordKeys((prev) => new Set(prev).add(currentTarget.word_en.toLowerCase()));

      // Advance to next after 1.5s
      window.setTimeout(() => {
        if (currentTargetIndex < vocabulary.length - 1) {
          setCurrentTargetIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 1500);
    } else {
      await AudioService.playSoundEffect('wrong');
      setFeedback({
        correct: false,
        message: copy.tryAgain,
      });
    }
  };

  const handleManualNext = () => {
    if (currentTargetIndex < vocabulary.length - 1) {
      setCurrentTargetIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!vocabulary.length || !currentTarget) {
    return (
      <div className="p-8 text-center text-slate-500">
        Không có từ vựng cho trò chơi này.
      </div>
    );
  }

  const isAllDone = completedWordKeys.size >= vocabulary.length;

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Title with preserved keywords for existing tests */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
          <span>🎮</span>
          <span>{copy.title}</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-500">
          {copy.subtitle}
        </p>
      </div>

      {/* Playable Challenge Banner: "Momo nói: [Word]" */}
      <div className="rounded-3xl border-4 border-amber-200 bg-amber-50/90 p-4 shadow-[0_6px_0_rgba(245,158,11,0.18)] flex flex-col items-center">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl animate-bounce">🧸</span>
          <span className="text-sm font-black uppercase tracking-wider text-amber-900">
            {copy.momoSays}:
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 capitalize">
            "{currentTarget.word_en}"
          </span>
        </div>

        {/* Audio Button */}
        <button
          type="button"
          onClick={playTargetAudio}
          className="mt-1 flex items-center gap-1.5 rounded-full border-2 border-amber-300 bg-white px-4 py-1.5 text-xs font-black text-amber-900 shadow-xs hover:bg-amber-100 active:scale-95 transition-transform cursor-pointer"
        >
          <span>🔊</span>
          <span>{copy.tapToHear}</span>
        </button>

        <p className="text-xs font-extrabold text-amber-800/80 mt-2">
          {copy.findPicture}
        </p>
      </div>

      {/* 3 LARGE IMAGE CHOICES (Tactile Clay Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {vocabulary.slice(0, 3).map((item) => {
          const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
          const isSelected = selectedWord === item.word_en;
          const isTarget = currentTarget.word_en.toLowerCase() === item.word_en.toLowerCase();

          return (
            <button
              key={item.word_en}
              type="button"
              onClick={() => handleChoice(item)}
              disabled={Boolean(feedback?.correct && isTarget)}
              className={`group flex flex-col items-center rounded-3xl border-4 p-3 text-center transition-all cursor-pointer ${
                isSelected && feedback?.correct
                  ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200 scale-102 shadow-[0_6px_0_#10B981]'
                  : isSelected && !feedback?.correct
                    ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 shadow-[0_4px_0_#F59E0B]'
                    : 'border-white bg-white shadow-[0_6px_0_rgba(0,0,0,0.06)] hover:border-sky-200 active:scale-98'
              }`}
            >
              <div className="h-28 w-full rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center mb-2 border border-slate-100">
                {visual.imageUrl ? (
                  <img
                    src={visual.imageUrl}
                    alt={item.word_en}
                    className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-5xl">{visual.emoji || item.emoji || '❓'}</span>
                )}
              </div>

              <span className="text-base sm:text-lg font-black text-slate-900 capitalize">
                {item.word_en}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {item.word_vi}
              </span>
            </button>
          );
        })}
      </div>

      {/* Immediate Gentle Feedback */}
      {feedback && (
        <div
          className={`rounded-2xl border-2 p-3 text-center text-sm font-black animate-fade-in shadow-xs ${
            feedback.correct
              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
              : 'border-amber-300 bg-amber-100 text-amber-900'
          }`}
        >
          {feedback.correct ? `✓ ${feedback.message}` : `💪 ${feedback.message}`}
        </div>
      )}

      {/* Continue Button when Correct */}
      {feedback?.correct && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleManualNext}
            className="w-full min-h-[52px] rounded-2xl border-2 border-white bg-emerald-500 text-white font-black text-base shadow-[0_5px_0_#059669] hover:bg-emerald-600 active:translate-y-1 transition-all cursor-pointer"
          >
            {currentTargetIndex < vocabulary.length - 1 ? copy.continue : copy.finishGame}
          </button>
        </div>
      )}

      {/* Completion Banner */}
      {isAllDone && (
        <div className="rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-4 text-center shadow-md animate-fade-in">
          <span className="text-3xl block mb-1">🌟</span>
          <h3 className="text-base font-black text-emerald-900">{copy.allCompleted}</h3>
        </div>
      )}
    </section>
  );
};
