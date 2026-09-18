import React, { useEffect, useMemo, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';
import { FeedbackMascot } from './FeedbackMascot';

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

  const currentTarget = vocabulary[currentTargetIndex] || vocabulary[0];

  // Ensure currentTarget is always included in choices if vocabulary has > 3 items
  const displayChoices = useMemo(() => {
    if (!currentTarget || vocabulary.length <= 3) return vocabulary.slice(0, 3);
    const others = vocabulary.filter((v) => v.word_en.toLowerCase() !== currentTarget.word_en.toLowerCase());
    return [currentTarget, ...others.slice(0, 2)].sort((a, b) => a.word_en.localeCompare(b.word_en));
  }, [currentTarget, vocabulary]);

  const copy = {
    en: {
      title: 'Trò chơi rèn luyện trí nhớ',
      subtitle: 'Lật thẻ tìm cặp tương ứng',
      tapToHear: 'Chạm để nghe lại',
      findPicture: 'Chạm vào hình đúng nhé!',
      correct: 'Giỏi quá! Bé tìm đúng hình rồi!',
      tryAgain: 'Chưa đúng rồi, bé thử lại nhé!',
      continue: 'Tiếp tục →',
      finishGame: 'Hoàn thành trò chơi 🎉',
      allCompleted: 'Xuất sắc! Bé đã vượt qua thử thách chọn hình của Momo!',
    },
    vi: {
      title: 'Trò chơi rèn luyện trí nhớ',
      subtitle: 'Lật thẻ tìm cặp tương ứng',
      tapToHear: 'Chạm để nghe lại',
      findPicture: 'Chạm vào hình đúng nhé!',
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

      window.setTimeout(() => {
        if (currentTargetIndex < vocabulary.length - 1) {
          setCurrentTargetIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 1500);
    } else {
      await AudioService.playSoundEffect('wrong');
      HapticService.tap();
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
      <div className="rounded-3xl border-4 border-white bg-white/90 p-8 text-center text-slate-500 shadow-md">
        Không có dữ liệu trò chơi.
      </div>
    );
  }

  const isAllDone = currentTargetIndex === vocabulary.length - 1 && feedback?.correct;

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Compact Header & Round Indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="text-left">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>🎮</span>
            <span>{copy.title}</span>
          </h2>
          <p className="text-xs font-bold text-slate-500">{copy.subtitle}</p>
        </div>
        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
          Vòng {currentTargetIndex + 1} / {vocabulary.length}
        </span>
      </div>

      {/* Large central target object — one focal circular badge, not a text bar */}
      <div className="relative flex flex-col items-center py-3">
        <span className="absolute -top-1 h-28 w-28 rounded-full bg-amber-300/25 blur-xl" />
        <button
          type="button"
          onClick={playTargetAudio}
          aria-label={copy.tapToHear}
          className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#FCE072] to-[#F0B72B] shadow-[0_7px_0_#D9930F] active:translate-y-1 active:shadow-[0_2px_0_#D9930F] transition-all cursor-pointer"
        >
          <span className="text-xl">🔊</span>
          <span className="text-[11px] font-black text-amber-950 capitalize leading-tight px-1">
            {currentTarget.word_en}
          </span>
        </button>
        <p className="mt-1.5 text-xs font-bold text-amber-800">{copy.findPicture}</p>
      </div>

      {/* 3 tactile toy choices, staggered spatial hierarchy */}
      <div className="grid grid-cols-3 gap-2.5 w-full items-end">
        {displayChoices.map((item, idx) => {
          const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
          const isSelected = selectedWord === item.word_en;
          const isTarget = currentTarget.word_en.toLowerCase() === item.word_en.toLowerCase();

          return (
            <button
              key={item.word_en}
              type="button"
              onClick={() => handleChoice(item)}
              disabled={Boolean(feedback?.correct && isTarget)}
              className={`group appearance-none flex flex-col items-center rounded-[20px] !border-3 p-2 text-center transition-all cursor-pointer ${idx === 1 ? '-translate-y-2' : ''} ${
                isSelected && feedback?.correct
                  ? '!border-white !bg-[#5FDBA0] scale-[1.02] shadow-[0_6px_0_#1DA36E]'
                  : isSelected && !feedback?.correct
                    ? '!border-white !bg-[#FF8A7E] animate-shake shadow-[0_5px_0_#DA3D2F]'
                    : '!border-white !bg-[#FCE072] hover:brightness-105 shadow-[0_6px_0_#F0B72B] active:translate-y-1 active:shadow-[0_2px_0_#F0B72B]'
              }`}
            >
              <div
                className={`h-20 w-full sm:h-24 rounded-full overflow-hidden flex items-center justify-center mb-1.5 border-2 shadow-inner ${
                  isSelected && feedback?.correct
                    ? 'bg-[#C6F5DE] border-white'
                    : isSelected && !feedback?.correct
                      ? 'bg-[#FFD3CD] border-white'
                      : 'bg-[#FDF0C4] border-white'
                }`}
              >
                {visual.imageUrl ? (
                  <img
                    src={visual.imageUrl}
                    alt={item.word_en}
                    className="h-full w-full object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-3xl">{visual.emoji || item.emoji || '❓'}</span>
                )}
              </div>

              <span className="text-sm font-black text-slate-900 capitalize truncate w-full">
                {item.word_en}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mascot Feedback Reaction (Supports task, never covers content) */}
      {feedback && (
        <FeedbackMascot
          mode="feedback"
          state={feedback.correct ? 'correct' : 'incorrect'}
          message={feedback.message}
        />
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
        <div className="rounded-2xl border-3 border-white bg-[#7BE8B8] p-3.5 text-center shadow-[0_6px_0_#22C481] animate-fade-in">
          <span className="text-2xl block mb-0.5">🌟</span>
          <h3 className="text-sm font-black text-emerald-900">{copy.allCompleted}</h3>
        </div>
      )}
    </section>
  );
};
