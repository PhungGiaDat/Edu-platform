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
      title: 'Nối từ & Ghép hình',
      pairsCount: `${vocabulary.length || 3} pairs`,
      subtitle: 'Tap a word on the left, then tap its picture on the right!',
      matchedAll: 'Hooray! All pairs matched perfectly!',
      wordsCol: 'TỪ VỰNG',
      imagesCol: 'HÌNH ẢNH',
    },
    vi: {
      title: 'Nối từ & Ghép hình',
      pairsCount: `${vocabulary.length || 3} cặp`,
      subtitle: 'Bé chạm từ ở bên trái, rồi chạm hình đúng ở bên phải nhé!',
      matchedAll: 'Tuyệt vời! Bé đã nối đúng tất cả các cặp từ!',
      wordsCol: 'TỪ VỰNG',
      imagesCol: 'HÌNH ẢNH',
    },
  }[locale];

  const handleSelectWord = (wordEn: string) => {
    if (matchedWords.has(wordEn.toLowerCase())) return;
    setSelectedWordPill(wordEn);

    if (selectedImageWord) {
      checkMatch(wordEn, selectedImageWord);
    }
  };

  const handleSelectImage = (wordEn: string) => {
    if (matchedWords.has(wordEn.toLowerCase())) return;
    setSelectedImageWord(wordEn);

    if (selectedWordPill) {
      checkMatch(selectedWordPill, wordEn);
    }
  };

  const checkMatch = async (word: string, imageWord: string) => {
    const isMatch = word.toLowerCase() === imageWord.toLowerCase();

    if (isMatch) {
      const nextMatched = new Set(matchedWords);
      nextMatched.add(word.toLowerCase());
      setMatchedWords(nextMatched);
      setSelectedWordPill(null);
      setSelectedImageWord(null);

      await AudioService.playSoundEffect('correct');
      HapticService.success();

      if (nextMatched.size === vocabulary.length) {
        window.setTimeout(() => {
          onComplete();
        }, 1200);
      }
    } else {
      setShakeKey(`${word}-${imageWord}`);
      await AudioService.playSoundEffect('wrong');
      HapticService.tap();

      window.setTimeout(() => {
        setShakeKey(null);
        setSelectedWordPill(null);
        setSelectedImageWord(null);
      }, 700);
    }
  };

  if (!vocabulary.length) {
    return (
      <div className="rounded-3xl border-4 border-white bg-white/90 p-8 text-center text-slate-500 shadow-md">
        Không có dữ liệu bài tập nối từ.
      </div>
    );
  }

  const isAllMatched = matchedWords.size === vocabulary.length;

  return (
    <section className="space-y-3.5 animate-fade-in w-full max-w-md mx-auto">
      {/* Compact Heading with Pair Count */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
          <span>🧩</span>
          <span>{copy.title}</span>
        </h2>
        <span className="text-xs font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
          {copy.pairsCount}
        </span>
      </div>

      <p className="text-xs font-bold text-slate-500 px-1 text-center">
        {copy.subtitle}
      </p>

      {/* Two Balanced Columns: WORDS | IMAGES */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {/* Left Column: WORDS (Chunky 56-72px tappable cards) */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center">
            🔤 {copy.wordsCol}
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
                className={`appearance-none w-full min-h-[60px] sm:min-h-[68px] flex flex-col justify-center items-center p-2 rounded-[20px] !border-3 text-center transition-all cursor-pointer ${
                  isMatched
                    ? '!border-white !bg-[#7BE8B8] opacity-60 scale-95 cursor-default shadow-[0_2px_0_#22C481]'
                    : isSelected
                      ? '!border-white !bg-[#C79BF9] scale-[1.02] shadow-[0_6px_0_#9D5EF0] -translate-y-0.5'
                      : isShaking
                        ? '!border-white !bg-[#FF9E94] animate-shake shadow-[0_4px_0_#F24E42]'
                        : '!border-white !bg-[#7DD3EE] hover:brightness-105 shadow-[0_6px_0_#2B9DC4] active:translate-y-1 active:shadow-[0_2px_0_#2B9DC4]'
                }`}
              >
                <span className="text-base sm:text-lg font-black text-slate-900 capitalize leading-tight">
                  {item.word_en}
                </span>
                {isMatched ? (
                  <span className="text-[10px] font-black text-emerald-700">
                    ✓ Đã ghép
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-sky-700/80">
                    {item.word_vi}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Column: IMAGES (Chunky 56-72px tappable visual cards) */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 text-center">
            🖼️ {copy.imagesCol}
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
                className={`appearance-none w-full min-h-[60px] sm:min-h-[68px] flex items-center justify-center p-1.5 rounded-[20px] !border-3 transition-all cursor-pointer ${
                  isMatched
                    ? '!border-white !bg-[#7BE8B8] opacity-60 scale-95 cursor-default shadow-[0_2px_0_#22C481]'
                    : isSelected
                      ? '!border-white !bg-[#C79BF9] scale-[1.02] shadow-[0_6px_0_#9D5EF0] -translate-y-0.5'
                      : isShaking
                        ? '!border-white !bg-[#FF9E94] animate-shake shadow-[0_4px_0_#F24E42]'
                        : '!border-white !bg-[#FCE59A] hover:brightness-105 shadow-[0_6px_0_#F0B72B] active:translate-y-1 active:shadow-[0_2px_0_#F0B72B]'
                }`}
              >
                <div
                  className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 shadow-inner overflow-hidden flex items-center justify-center ${
                    isMatched ? 'bg-[#C6F5DE] border-white' : isSelected ? 'bg-[#EBDCFC] border-white' : isShaking ? 'bg-[#FFD3CD] border-white' : 'bg-[#FDF0C4] border-white'
                  }`}
                >
                  {visual.imageUrl ? (
                    <img
                      src={visual.imageUrl}
                      alt={item.word_en}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl">{visual.emoji || item.emoji || '✨'}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Completion Celebration Banner */}
      {isAllMatched && (
        <div className="rounded-2xl border-3 border-white bg-[#7BE8B8] p-3.5 text-center shadow-[0_6px_0_#22C481] animate-fade-in">
          <span className="text-2xl block mb-0.5">🎉</span>
          <h3 className="text-sm font-black text-emerald-900">{copy.matchedAll}</h3>
        </div>
      )}
    </section>
  );
};
