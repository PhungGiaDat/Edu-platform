import React, { useEffect, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
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
      title: 'Listen & Choose',
      subtitle: 'Listen to the word and tap the matching picture!',
      tapToHear: 'Tap to Hear Word',
      replay: 'Listen Again',
      correct: 'Splendid! That is correct!',
      tryAgain: 'Not quite, try another picture!',
      completedAll: 'All words completed! Great ear!',
      progress: 'Round',
      nextWord: 'Next Word',
      finishPractice: 'Next Activity',
    },
    vi: {
      title: 'Lắng nghe & Chọn hình đúng',
      subtitle: 'Bé hãy lắng nghe từ vựng và chọn bức tranh tương ứng nhé!',
      tapToHear: 'Bấm để nghe từ vựng',
      replay: 'Nghe lại',
      correct: 'Chính xác! Bé giỏi quá!',
      tryAgain: 'Chưa đúng rồi, bé thử lại nhé!',
      completedAll: 'Bé đã hoàn thành xuất sắc bài luyện nghe!',
      progress: 'Câu hỏi',
      nextWord: 'Câu tiếp theo',
      finishPractice: 'Bước tiếp theo',
    },
  }[locale];

  // Play audio when target changes
  const playTargetAudio = async () => {
    if (!currentItem) return;
    try {
      const audioUrl = getAssetCandidateUrls(currentItem.audio)[0];
      await AudioService.playPronunciation(currentItem.word_en, 'en', audioUrl);
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
    if (!currentItem || isCorrect) return;
    setSelectedWord(item.word_en);

    const matches = item.word_en.toLowerCase() === currentItem.word_en.toLowerCase();
    setIsCorrect(matches);

    if (matches) {
      await AudioService.playSoundEffect('correct');
      HapticService.success();
      setCompletedWordKeys((prev) => new Set(prev).add(currentItem.word_en.toLowerCase()));

      // Auto advance to next question after 1.2s or complete
      window.setTimeout(() => {
        if (currentTargetIndex < vocabulary.length - 1) {
          setCurrentTargetIndex((prev) => prev + 1);
        } else {
          onComplete();
        }
      }, 1200);
    } else {
      await AudioService.playSoundEffect('wrong');
    }
  };

  if (!vocabulary.length) {
    return (
      <div className="p-8 text-center text-slate-500">
        No vocabulary items available for this activity.
      </div>
    );
  }

  const isAllFinished = completedWordKeys.size >= vocabulary.length;

  return (
    <section className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          👂 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* Progress Counter */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
          {copy.progress} {currentTargetIndex + 1} / {vocabulary.length}
        </span>
        <div className="flex gap-1.5">
          {vocabulary.map((v, i) => (
            <div
              key={v.word_en}
              className={`h-2.5 w-6 rounded-full transition-all ${
                completedWordKeys.has(v.word_en.toLowerCase())
                  ? 'bg-emerald-500'
                  : i === currentTargetIndex
                    ? 'bg-sky-500 ring-2 ring-sky-200'
                    : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Audio Prompt Card */}
      <div className="rounded-3xl border-4 border-white bg-white/90 p-6 text-center shadow-md">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
          {copy.tapToHear}
        </p>

        <button
          type="button"
          onClick={playTargetAudio}
          className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-amber-300 to-amber-500 text-5xl shadow-xl hover:scale-105 active:scale-95 transition-transform"
          aria-label={copy.replay}
        >
          🔊
        </button>

        <p className="mt-3 text-sm font-bold text-amber-700">
          {copy.replay}
        </p>
      </div>

      {/* 3 Choices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {vocabulary.map((item) => {
          const isSelected = selectedWord === item.word_en;
          const isTarget = currentItem?.word_en.toLowerCase() === item.word_en.toLowerCase();
          const imgUrl = getAssetCandidateUrls(item.image)[0];

          return (
            <button
              key={item.word_en}
              type="button"
              onClick={() => handleChoice(item)}
              disabled={Boolean(isCorrect && isTarget)}
              className={`group flex flex-col items-center rounded-3xl border-4 p-4 text-center transition-all active:scale-95 shadow-md ${
                isSelected && isCorrect
                  ? 'border-emerald-400 bg-emerald-50 ring-4 ring-emerald-200 scale-105'
                  : isSelected && !isCorrect
                    ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-200'
                    : 'border-white bg-white hover:border-slate-200 hover:shadow-lg'
              }`}
            >
              <div className="h-28 w-28 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center mb-3 border-2 border-slate-100">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={item.word_en}
                    className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-4xl">{item.emoji || '❓'}</span>
                )}
              </div>
              <span className="text-lg font-black text-slate-800 capitalize">
                {item.word_en}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {item.word_vi}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback Message Banner */}
      {isCorrect !== null && (
        <div
          className={`rounded-2xl border-2 p-4 text-center text-sm sm:text-base font-black animate-fade-in shadow-sm ${
            isCorrect
              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
              : 'border-rose-300 bg-rose-100 text-rose-900'
          }`}
        >
          {isCorrect ? `🎉 ${copy.correct}` : `💪 ${copy.tryAgain}`}
        </div>
      )}

      {/* Completion Banner */}
      {isAllFinished && (
        <div className="rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-6 text-center shadow-lg">
          <div className="text-4xl mb-2">🌟</div>
          <h3 className="text-xl font-black text-emerald-900">{copy.completedAll}</h3>
        </div>
      )}
    </section>
  );
};
