import React, { useEffect, useMemo, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
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

  const [selectedImageWord, setSelectedImageWord] = useState<string | null>(null);
  const [selectedWordPill, setSelectedWordPill] = useState<string | null>(null);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  // Shuffled order of words for the right column
  const [shuffledWordItems, setShuffledWordItems] = useState<VocabularyItem[]>([]);

  useEffect(() => {
    setShuffledWordItems(shuffleArray(vocabulary));
    setMatchedWords(new Set());
    setSelectedImageWord(null);
    setSelectedWordPill(null);
  }, [vocabulary]);

  const copy = {
    en: {
      title: 'Word & Picture Match',
      subtitle: 'Tap a picture, then tap the matching English word to connect them!',
      matchedAll: 'Hooray! All pairs matched perfectly!',
      replay: 'Play Again',
      reset: 'Reset',
      pairsRemaining: 'pairs to match',
    },
    vi: {
      title: 'Nối từ & Ghép hình',
      subtitle: 'Bé hãy chạm vào bức hình, rồi chạm vào từ tiếng Anh tương ứng để nối lại nhé!',
      matchedAll: 'Tuyệt vời! Bé đã nối đúng tất cả các cặp từ!',
      replay: 'Chơi lại',
      reset: 'Làm lại',
      pairsRemaining: 'cặp cần nối',
    },
  }[locale];

  const handleSelectImage = (wordEn: string) => {
    if (matchedWords.has(wordEn.toLowerCase())) return;
    setSelectedImageWord(wordEn);

    // If word pill was already selected, evaluate match
    if (selectedWordPill) {
      checkMatch(wordEn, selectedWordPill);
    }
  };

  const handleSelectWord = (wordEn: string) => {
    if (matchedWords.has(wordEn.toLowerCase())) return;
    setSelectedWordPill(wordEn);

    // If image was already selected, evaluate match
    if (selectedImageWord) {
      checkMatch(selectedImageWord, wordEn);
    }
  };

  const checkMatch = async (imageWord: string, textWord: string) => {
    if (imageWord.toLowerCase() === textWord.toLowerCase()) {
      // Correct Match!
      await AudioService.playSoundEffect('correct');
      HapticService.match();

      const nextMatched = new Set(matchedWords);
      nextMatched.add(imageWord.toLowerCase());
      setMatchedWords(nextMatched);

      setSelectedImageWord(null);
      setSelectedWordPill(null);

      // Check if all matched
      if (nextMatched.size >= vocabulary.length) {
        window.setTimeout(() => {
          onComplete();
        }, 800);
      }
    } else {
      // Mismatch
      await AudioService.playSoundEffect('wrong');
      setShakeKey(`${imageWord}-${textWord}`);
      window.setTimeout(() => {
        setShakeKey(null);
        setSelectedImageWord(null);
        setSelectedWordPill(null);
      }, 700);
    }
  };

  const handleReset = () => {
    setMatchedWords(new Set());
    setSelectedImageWord(null);
    setSelectedWordPill(null);
    setShuffledWordItems(shuffleArray(vocabulary));
  };

  const isAllMatched = matchedWords.size >= vocabulary.length && vocabulary.length > 0;

  return (
    <section className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          🧩 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* Remaining counter */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
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

      {/* 2-Column Match Grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-8">
        {/* Left Column: Picture Tiles */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
            🖼️ Pictures
          </p>
          {vocabulary.map((item) => {
            const wordKey = item.word_en.toLowerCase();
            const isMatched = matchedWords.has(wordKey);
            const isSelected = selectedImageWord === item.word_en;
            const isShaking = shakeKey?.startsWith(`${item.word_en}-`);
            const imgUrl = getAssetCandidateUrls(item.image)[0];

            return (
              <button
                key={`img-${item.word_en}`}
                type="button"
                onClick={() => handleSelectImage(item.word_en)}
                disabled={isMatched}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-4 text-left transition-all shadow-sm ${
                  isMatched
                    ? 'border-emerald-400 bg-emerald-50 opacity-80 cursor-default'
                    : isSelected
                      ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-200 scale-102'
                      : isShaking
                        ? 'border-rose-400 bg-rose-50 animate-shake'
                        : 'border-white bg-white hover:border-slate-200 hover:shadow-md active:scale-98'
                }`}
              >
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 border border-slate-100">
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={item.word_en}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl">{item.emoji || '✨'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-400 block truncate">
                    {item.word_vi}
                  </span>
                  {isMatched && (
                    <span className="text-xs font-black text-emerald-700 flex items-center gap-1 mt-1">
                      <span>✓</span> Matched
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Word Pills */}
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
            🔤 Words
          </p>
          {shuffledWordItems.map((item) => {
            const wordKey = item.word_en.toLowerCase();
            const isMatched = matchedWords.has(wordKey);
            const isSelected = selectedWordPill === item.word_en;
            const isShaking = shakeKey?.endsWith(`-${item.word_en}`);

            return (
              <button
                key={`word-${item.word_en}`}
                type="button"
                onClick={() => handleSelectWord(item.word_en)}
                disabled={isMatched}
                className={`w-full min-h-[76px] sm:min-h-[88px] flex flex-col justify-center items-center p-3 rounded-2xl border-4 text-center transition-all shadow-sm ${
                  isMatched
                    ? 'border-emerald-400 bg-emerald-50 opacity-80 cursor-default'
                    : isSelected
                      ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-200 scale-102'
                      : isShaking
                        ? 'border-rose-400 bg-rose-50 animate-shake'
                        : 'border-white bg-white hover:border-slate-200 hover:shadow-md active:scale-98'
                }`}
              >
                <span className="text-lg sm:text-xl font-black text-slate-900 capitalize">
                  {item.word_en}
                </span>
                {isMatched ? (
                  <span className="text-xs font-black text-emerald-700 mt-0.5">
                    ✓ Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-400 mt-0.5">
                    Tap to connect
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Completion Banner */}
      {isAllMatched && (
        <div className="rounded-3xl border-4 border-emerald-300 bg-emerald-50 p-6 text-center shadow-lg animate-fade-in">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-xl font-black text-emerald-900">{copy.matchedAll}</h3>
          <button
            type="button"
            onClick={handleReset}
            className="mt-3 rounded-2xl border-2 border-emerald-300 bg-white px-5 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100 shadow-sm transition-all"
          >
            🔄 {copy.replay}
          </button>
        </div>
      )}
    </section>
  );
};
