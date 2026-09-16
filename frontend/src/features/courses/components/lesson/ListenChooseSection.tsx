import React, { useEffect, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';

interface ListenChooseSectionProps {
  lesson: Lesson;
  onComplete: () => void;
  locale: 'en' | 'vi';
}

export const ListenChooseSection: React.FC<ListenChooseSectionProps> = ({
  lesson,
  onComplete,
  locale,
}) => {
  const vocabulary = lesson.vocabulary || [];
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [completedWordKeys, setCompletedWordKeys] = useState<Set<string>>(new Set());

  const currentItem: VocabularyItem | undefined = vocabulary[currentTargetIndex];

  const copy = {
    en: {
      title: 'Listen & Choose the Right Picture',
      instruction: 'Listen carefully & tap the right picture!',
      replay: 'Listen Again',
      tapToHear: 'Tap to listen',
      correctPrefix: 'Splendid! Exactly right!',
      tryAgain: 'Not quite right yet. Listen again & try!',
      progress: 'Question',
      continue: 'Continue →',
      completedAll: 'Awesome! You got all the pictures right!',
    },
    vi: {
      title: 'Lắng nghe & Chọn hình đúng',
      instruction: 'Nghe và chọn hình đúng',
      replay: 'Nghe lại',
      tapToHear: 'Chạm loa để nghe',
      correctPrefix: 'Chính xác! Giỏi lắm!',
      tryAgain: 'Chưa đúng rồi. Nghe lại nhé!',
      progress: 'Câu',
      continue: 'Tiếp tục →',
      completedAll: 'Xuất sắc! Bé đã nghe và chọn đúng tất cả các hình!',
    },
  }[locale];

  // Play audio when target changes or on user click
  const playTargetAudio = async () => {
    if (!currentItem) return;
    try {
      const visual = resolveVocabularyVisual(currentItem.word_en, vocabulary, currentItem.image);
      await AudioService.playPronunciation(currentItem.word_en, 'en', visual.imageUrl || undefined);
    } catch (err) {
      console.warn('[ListenChoose] audio play error:', err);
    }
  };

  useEffect(() => {
    setSelectedWord(null);
    setIsCorrect(null);
    if (currentItem) {
      const timer = window.setTimeout(() => {
        playTargetAudio();
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [currentTargetIndex]);

  const handleChoice = async (item: VocabularyItem) => {
    if (!currentItem || (isCorrect && selectedWord === currentItem.word_en)) return;
    setSelectedWord(item.word_en);

    const matches = item.word_en.toLowerCase() === currentItem.word_en.toLowerCase();
    setIsCorrect(matches);

    if (matches) {
      await AudioService.playSoundEffect('correct');
      HapticService.success();
      setCompletedWordKeys((prev) => new Set(prev).add(currentItem.word_en.toLowerCase()));

      // Auto advance to next question after 1.5s
      window.setTimeout(() => {
        if (currentTargetIndex < vocabulary.length - 1) {
          setCurrentTargetIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 1500);
    } else {
      await AudioService.playSoundEffect('wrong');
    }
  };

  const handleManualNext = () => {
    if (currentTargetIndex < vocabulary.length - 1) {
      setCurrentTargetIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  if (!vocabulary.length || !currentItem) {
    return (
      <div className="p-8 text-center text-slate-500">
        Không có từ vựng cho bài tập này.
      </div>
    );
  }

  const isAllFinished = completedWordKeys.size >= vocabulary.length;

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Title & Progress */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
          <span>👂</span>
          <span>{copy.title}</span>
        </h2>
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
          {copy.progress} {currentTargetIndex + 1} / {vocabulary.length}
        </span>
      </div>

      {/* Large Tactile Audio Button */}
      <div className="flex flex-col items-center py-2">
        <button
          type="button"
          onClick={playTargetAudio}
          className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-5xl shadow-[0_8px_0_#D97706] hover:scale-105 active:scale-95 active:shadow-xs transition-all cursor-pointer"
          aria-label={copy.replay}
        >
          🔊
        </button>
        <p className="mt-2 text-xs font-extrabold text-amber-800">
          {copy.tapToHear}
        </p>
      </div>

      {/* 2–3 LARGE IMAGE CHOICES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {vocabulary.map((item) => {
          const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
          const isSelected = selectedWord === item.word_en;
          const isTarget = currentItem.word_en.toLowerCase() === item.word_en.toLowerCase();

          return (
            <button
              key={item.word_en}
              type="button"
              onClick={() => handleChoice(item)}
              disabled={Boolean(isCorrect && isTarget)}
              className={`group flex flex-col items-center rounded-3xl border-4 p-3 text-center transition-all cursor-pointer ${
                isSelected && isCorrect
                  ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200 scale-102 shadow-[0_6px_0_#10B981]'
                  : isSelected && !isCorrect
                    ? 'border-amber-400 bg-amber-50 ring-4 ring-amber-200 shadow-[0_4px_0_#F59E0B]'
                    : 'border-white bg-white shadow-[0_6px_0_rgba(0,0,0,0.06)] hover:border-sky-200 active:scale-98'
              }`}
            >
              {/* Large Canonical Image */}
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

              {/* English Word & Vietnamese meaning */}
              <span className="text-lg font-black text-slate-900 capitalize">
                {item.word_en}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {item.word_vi}
              </span>
            </button>
          );
        })}
      </div>

      {/* Immediate Gentle Feedback Banner */}
      {isCorrect !== null && (
        <div
          className={`rounded-2xl border-2 p-3.5 text-center text-sm font-black animate-fade-in shadow-xs ${
            isCorrect
              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
              : 'border-amber-300 bg-amber-100 text-amber-900'
          }`}
        >
          {isCorrect ? (
            <span>
              ✓ {copy.correctPrefix} "{currentItem.word_en}" là "{currentItem.word_vi}".
            </span>
          ) : (
            <span>💪 {copy.tryAgain}</span>
          )}
        </div>
      )}

      {/* Manual Continue Button when answered */}
      {isCorrect && (
        <div className="pt-1">
          <button
            type="button"
            onClick={handleManualNext}
            className="w-full min-h-[52px] rounded-2xl border-2 border-white bg-emerald-500 text-white font-black text-base shadow-[0_5px_0_#059669] hover:bg-emerald-600 active:translate-y-1 transition-all cursor-pointer"
          >
            {copy.continue}
          </button>
        </div>
      )}

      {/* Completion Banner */}
      {isAllFinished && (
        <div className="rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-4 text-center shadow-md animate-fade-in">
          <span className="text-3xl block mb-1">🌟</span>
          <h3 className="text-base font-black text-emerald-900">{copy.completedAll}</h3>
        </div>
      )}
    </section>
  );
};
