import React, { useEffect, useMemo, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';

interface MatchSectionProps {
  lesson: Lesson;
  onComplete: () => void;
  locale: 'en' | 'vi';
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const MatchSection: React.FC<MatchSectionProps> = ({
  lesson,
  onComplete,
  locale,
}) => {
  const vocabulary = useMemo(() => lesson.vocabulary || [], [lesson.vocabulary]);

  const [selectedWordPill, setSelectedWordPill] = useState<string | null>(null);
  const [selectedImageWord, setSelectedImageWord] = useState<string | null>(null);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  // Shuffled order of images for the right column
  const [shuffledImages, setShuffledImages] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    setShuffledImages(shuffleArray(vocabulary));
    setMatchedWords(new Set());
    setSelectedWordPill(null);
    setSelectedImageWord(null);
  }, [vocabulary]);

  const copy = {
    en: {
      title: 'Word & Picture Match',
      instruction: 'Match words with the correct pictures',
      subtitle: 'Tap a word on the left, then tap its picture on the right!',
      matchedAll: 'Hooray! All pairs matched perfectly!',
      replay: 'Play Again',
      reset: 'Reset',
      pairsRemaining: 'pairs to match',
    },
    vi: {
      title: 'Nối từ & Ghép hình',
      instruction: 'Hãy ghép từ với hình đúng',
      subtitle: 'Bé chạm vào từ ở bên trái, rồi chạm vào hình tương ứng ở bên phải nhé!',
      matchedAll: 'Tuyệt vời! Bé đã nối đúng tất cả các cặp từ!',
      replay: 'Chơi lại',
      reset: 'Làm lại',
      pairsRemaining: 'cặp cần nối',
    },
  }[locale];

  const handleSelectWord = (wordEn: string) => {
    if (matchedWords.has(wordEn.toLowerCase())) return;
    setSelectedWordPill(wordEn);

    // If image was already selected, check match
    if (selectedImageWord) {
      checkMatch(wordEn, selectedImageWord);
    }
  };

  const handleSelectImage = (wordEn: string) => {
    if (matchedWords.has(wordEn.toLowerCase())) return;
    setSelectedImageWord(wordEn);

    // If word pill was already selected, check match
    if (selectedWordPill) {
      checkMatch(selectedWordPill, wordEn);
    }
  };

  const checkMatch = async (textWord: string, imageWord: string) => {
    if (textWord.toLowerCase() === imageWord.toLowerCase()) {
      // Match!
      await AudioService.playSoundEffect('correct');
      HapticService.match();

      const nextMatched = new Set(matchedWords);
      nextMatched.add(textWord.toLowerCase());
      setMatchedWords(nextMatched);

      setSelectedWordPill(null);
      setSelectedImageWord(null);

      // Complete when all matched
      if (nextMatched.size >= vocabulary.length) {
        window.setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      // Mismatch
      await AudioService.playSoundEffect('wrong');
      setShakeKey(`${textWord}-${imageWord}`);
      window.setTimeout(() => {
        setShakeKey(null);
        setSelectedWordPill(null);
        setSelectedImageWord(null);
      }, 700);
    }
  };

  const handleReset = () => {
    setMatchedWords(new Set());
    setSelectedWordPill(null);
    setSelectedImageWord(null);
    setShuffledImages(shuffleArray(vocabulary));
  };

  const isAllMatched = matchedWords.size >= vocabulary.length && vocabulary.length > 0;

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Title & Instructions */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
          <span>🧩</span>
          <span>{copy.title}</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600">
          {copy.instruction}
        </p>
      </div>

      {/* Progress & Reset Bar */}
      <div className="flex items-center justify-between px-2 text-xs font-black text-slate-500">
        <span className="uppercase tracking-wider">
          {vocabulary.length - matchedWords.size} {copy.pairsRemaining}
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
        >
          {copy.reset}
        </button>
      </div>

      {/* 2-Column Tap-to-Match Grid (Left: Words, Right: Large Visual Images) */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Left Column: English Words */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            🔤 Từ tiếng Anh
          </p>
          {vocabulary.map((item) => {
            const wordKey = item.word_en.toLowerCase();
            const isMatched = matchedWords.has(wordKey);
            const isSelected = selectedWordPill === item.word_en;
            const isShaking = shakeKey?.startsWith(`${item.word_en}-`);

            return (
              <button
                key={`word-${item.word_en}`}
                type="button"
                onClick={() => handleSelectWord(item.word_en)}
                disabled={isMatched}
                className={`w-full min-h-[72px] sm:min-h-[84px] flex flex-col justify-center items-center p-3 rounded-2xl border-4 text-center transition-all cursor-pointer ${
                  isMatched
                    ? 'border-emerald-400 bg-emerald-50 opacity-80 cursor-default shadow-[0_3px_0_#10B981]'
                    : isSelected
                      ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-200 scale-102 shadow-[0_5px_0_#0284C7]'
                      : isShaking
                        ? 'border-rose-400 bg-rose-50 animate-shake'
                        : 'border-white bg-white hover:border-slate-200 shadow-[0_4px_0_rgba(0,0,0,0.06)] active:scale-95'
                }`}
              >
                <span className="text-base sm:text-lg font-black text-slate-900 capitalize">
                  {item.word_en}
                </span>
                {isMatched ? (
                  <span className="text-[11px] font-black text-emerald-700 mt-0.5">
                    ✓ Đã nối
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {item.word_vi}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column: Large Visual Picture Cards */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            🖼️ Hình ảnh
          </p>
          {shuffledImages.map((item) => {
            const wordKey = item.word_en.toLowerCase();
            const isMatched = matchedWords.has(wordKey);
            const isSelected = selectedImageWord === item.word_en;
            const isShaking = shakeKey?.endsWith(`-${item.word_en}`);
            const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);

            return (
              <button
                key={`img-${item.word_en}`}
                type="button"
                onClick={() => handleSelectImage(item.word_en)}
                disabled={isMatched}
                className={`w-full min-h-[72px] sm:min-h-[84px] flex items-center justify-center p-2 rounded-2xl border-4 transition-all cursor-pointer ${
                  isMatched
                    ? 'border-emerald-400 bg-emerald-50 opacity-80 cursor-default shadow-[0_3px_0_#10B981]'
                    : isSelected
                      ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-200 scale-102 shadow-[0_5px_0_#0284C7]'
                      : isShaking
                        ? 'border-rose-400 bg-rose-50 animate-shake'
                        : 'border-white bg-white hover:border-slate-200 shadow-[0_4px_0_rgba(0,0,0,0.06)] active:scale-95'
                }`}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center">
                  {visual.imageUrl ? (
                    <img
                      src={visual.imageUrl}
                      alt={item.word_en}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl">{visual.emoji || item.emoji || '✨'}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Completion Celebration Banner */}
      {isAllMatched && (
        <div className="rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-5 text-center shadow-md animate-fade-in">
          <span className="text-3xl block mb-1">🎉</span>
          <h3 className="text-base font-black text-emerald-900">{copy.matchedAll}</h3>
        </div>
      )}
    </section>
  );
};
