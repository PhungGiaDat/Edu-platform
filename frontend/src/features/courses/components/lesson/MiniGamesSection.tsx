import React, { useEffect, useMemo, useState } from 'react';
import type { Lesson, VocabularyItem } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';

interface MiniGamesSectionProps {
  lesson: Lesson;
  onComplete: () => void;
  locale: 'en' | 'vi';
}

interface MemoryCard {
  id: string;
  wordEn: string;
  type: 'image' | 'word';
  imageUrl?: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const MiniGamesSection: React.FC<MiniGamesSectionProps> = ({
  lesson,
  onComplete,
  locale,
}) => {
  const vocabulary: VocabularyItem[] = useMemo(() => lesson.vocabulary || [], [lesson.vocabulary]);

  // Authored game state if lesson.game exists
  const [authoredGameFeedback, setAuthoredGameFeedback] = useState<{
    choiceId: string;
    correct: boolean;
    message: string;
  } | null>(null);

  // Memory game state
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCardIds, setFlippedCardIds] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);

  const copy = {
    en: {
      title: 'Mini Learning Games',
      subtitle: 'Play the memory flip game or picture challenge to reinforce vocabulary!',
      memoryTitle: 'Flip & Match Cards',
      memorySubtitle: 'Find the matching pairs of pictures and English words!',
      pairsFound: 'Pairs found',
      tapPrompt: 'Tap a card to flip',
      congrats: 'Awesome job! You found all pairs!',
      replay: 'Play Again',
      authoredGameTitle: 'Picture Challenge',
      hearPrompt: 'Listen to instruction',
    },
    vi: {
      title: 'Trò chơi rèn luyện trí nhớ',
      subtitle: 'Thử thách trí nhớ cùng trò chơi lật thẻ bài vui nhộn nhé!',
      memoryTitle: 'Lật thẻ tìm cặp tương ứng',
      memorySubtitle: 'Lật các thẻ bài để ghép đúng hình ảnh và từ tiếng Anh tương ứng!',
      pairsFound: 'Cặp đã tìm được',
      tapPrompt: 'Chạm vào thẻ để lật',
      congrats: 'Xuất sắc! Bé đã tìm thấy tất cả các cặp thẻ bài!',
      replay: 'Chơi lại',
      authoredGameTitle: 'Thử thách chọn hình',
      hearPrompt: 'Nghe hướng dẫn',
    },
  }[locale];

  // Initialize Memory Cards from vocabulary
  const initializeMemoryCards = () => {
    const newCards: MemoryCard[] = [];
    // Take up to 3 vocabulary items to make 6 cards
    const slice = vocabulary.slice(0, 3);

    slice.forEach((item, index) => {
      const imgUrl = getAssetCandidateUrls(item.image)[0];
      // Card 1: Picture Card
      newCards.push({
        id: `img-${index}-${item.word_en}`,
        wordEn: item.word_en.toLowerCase(),
        type: 'image',
        imageUrl: imgUrl,
        isFlipped: false,
        isMatched: false,
      });

      // Card 2: Word Card
      newCards.push({
        id: `word-${index}-${item.word_en}`,
        wordEn: item.word_en.toLowerCase(),
        type: 'word',
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards(shuffleArray(newCards));
    setFlippedCardIds([]);
    setIsEvaluating(false);
    setMatchedPairsCount(0);
  };

  useEffect(() => {
    initializeMemoryCards();
  }, [vocabulary]);

  const handleCardClick = async (card: MemoryCard) => {
    if (isEvaluating || card.isFlipped || card.isMatched) return;

    // Flip card
    const nextFlippedIds = [...flippedCardIds, card.id];
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, isFlipped: true } : c))
    );
    setFlippedCardIds(nextFlippedIds);

    if (nextFlippedIds.length === 2) {
      setIsEvaluating(true);
      const [firstId, secondId] = nextFlippedIds;
      const firstCard = cards.find((c) => c.id === firstId);
      const secondCard = card;

      if (firstCard && secondCard && firstCard.wordEn === secondCard.wordEn) {
        // MATCH!
        await AudioService.playSoundEffect('correct');
        HapticService.match();

        setCards((prev) =>
          prev.map((c) =>
            c.id === firstId || c.id === secondId
              ? { ...c, isMatched: true, isFlipped: true }
              : c
          )
        );
        const nextPairsCount = matchedPairsCount + 1;
        setMatchedPairsCount(nextPairsCount);
        setFlippedCardIds([]);
        setIsEvaluating(false);

        // Check if finished
        const targetPairs = Math.min(vocabulary.length, 3);
        if (nextPairsCount >= targetPairs) {
          window.setTimeout(() => {
            onComplete();
          }, 800);
        }
      } else {
        // MISMATCH -> flip back after 900ms
        await AudioService.playSoundEffect('wrong');
        window.setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstId || c.id === secondId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCardIds([]);
          setIsEvaluating(false);
        }, 900);
      }
    }
  };

  // Authored game handler
  const handleAuthoredGameChoice = async (item: Record<string, unknown>) => {
    if (!lesson.game) return;
    const promptWord = (lesson.game.prompt_audio_text || '').toLowerCase().replace(/[^a-z ]/g, '').trim().split(' ').pop() || '';
    const label = String(item.label || item.word || item.id || '').toLowerCase();
    const correct = label.includes(promptWord) || promptWord.includes(label);

    setAuthoredGameFeedback({
      choiceId: String(item.id || label),
      correct,
      message: correct ? (lesson.game.feedback_positive_vi || 'Chính xác!') : 'Chưa đúng, thử lại nhé!',
    });

    await AudioService.playSoundEffect(correct ? 'correct' : 'wrong');
    if (correct) {
      onComplete();
    }
  };

  const targetPairs = Math.min(vocabulary.length, 3);
  const isMemoryFinished = matchedPairsCount >= targetPairs && targetPairs > 0;

  return (
    <section className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          🎮 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* Authored Game (if present in lesson) */}
      {lesson.game && (
        <div className="rounded-3xl border-4 border-amber-200 bg-amber-50/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-amber-950 flex items-center gap-2">
              <span>🎯</span> {lesson.game.instruction_vi || copy.authoredGameTitle}
            </h3>
            {lesson.game.prompt_audio_text && (
              <button
                type="button"
                onClick={() => AudioService.playPronunciation(lesson.game!.prompt_audio_text, 'en')}
                className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100"
              >
                <span>🔊</span> {copy.hearPrompt}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {lesson.game.items.map((item, idx) => {
              const label = String(item.label || item.word || `Item ${idx + 1}`);
              const isSelected = authoredGameFeedback?.choiceId === String(item.id || label);
              const imgUrl = item.image ? getAssetCandidateUrls(item.image as any)[0] : undefined;

              return (
                <button
                  key={String(item.id || idx)}
                  type="button"
                  onClick={() => handleAuthoredGameChoice(item)}
                  className={`flex flex-col items-center rounded-2xl border-2 p-3 transition-all ${
                    isSelected
                      ? authoredGameFeedback?.correct
                        ? 'border-emerald-400 bg-emerald-100'
                        : 'border-rose-400 bg-rose-100'
                      : 'border-white bg-white hover:border-amber-300 shadow-sm'
                  }`}
                >
                  <div className="h-16 w-16 rounded-xl bg-slate-50 flex items-center justify-center mb-1.5 overflow-hidden">
                    {imgUrl ? (
                      <img src={imgUrl} alt={label} className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-2xl">🖼️</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-800 capitalize truncate w-full text-center">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {authoredGameFeedback && (
            <div
              className={`rounded-xl p-2.5 text-center text-xs font-black ${
                authoredGameFeedback.correct
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-rose-100 text-rose-900'
              }`}
            >
              {authoredGameFeedback.message}
            </div>
          )}
        </div>
      )}

      {/* Memory Flip Card Game */}
      <div className="rounded-3xl border-4 border-white bg-white/90 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>🃏</span> {copy.memoryTitle}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">{copy.memorySubtitle}</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            {matchedPairsCount} / {targetPairs} {copy.pairsFound}
          </span>
        </div>

        {/* 6-Card Grid */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {cards.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => handleCardClick(card)}
                disabled={card.isMatched || isEvaluating}
                className={`relative aspect-[3/4] rounded-2xl border-4 p-2 transition-all duration-300 transform flex items-center justify-center cursor-pointer shadow-sm ${
                  isRevealed
                    ? card.isMatched
                      ? 'border-emerald-400 bg-emerald-50 scale-98 shadow-inner'
                      : 'border-sky-400 bg-sky-50 shadow-md'
                    : 'border-amber-300 bg-gradient-to-br from-amber-400 to-amber-500 hover:scale-102 hover:shadow-md'
                }`}
              >
                {isRevealed ? (
                  card.type === 'image' && card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.wordEn}
                      className="h-full w-full object-contain p-1 rounded-xl"
                    />
                  ) : (
                    <div className="text-center">
                      <span className="text-sm sm:text-base font-black text-slate-900 capitalize block">
                        {card.wordEn}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">Word</span>
                    </div>
                  )
                ) : (
                  <div className="text-center text-white">
                    <span className="text-2xl sm:text-3xl font-black block mb-0.5">❓</span>
                    <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                      Momo
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Finished Banner */}
        {isMemoryFinished && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-center animate-fade-in">
            <span className="text-3xl block mb-1">🎉</span>
            <p className="text-base font-black text-emerald-900">{copy.congrats}</p>
            <button
              type="button"
              onClick={initializeMemoryCards}
              className="mt-2 text-xs font-bold text-emerald-700 underline cursor-pointer"
            >
              🔄 {copy.replay}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
