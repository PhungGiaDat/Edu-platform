/**
 * FlashcardsPage - TikTok-style Swipe Flashcards
 * Swipe up to next, left = don't know, right = know
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSwipeable, type SwipeCallback } from 'react-swipeable';
import { notebookApi } from '../services/notebookApi';
import type { NotebookEntry, VocabularyTopic } from '../types/notebook';
import { ClayCard } from '../components/clay/ClayCard';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { colors, shadows, radius } from '../design-tokens/claymorphic';

interface FlashcardsPageProps {
  onComplete?: () => void;
}

export function FlashcardsPage({ onComplete }: FlashcardsPageProps) {
  const [topics, setTopics] = useState<VocabularyTopic[]>([]);
  const [cards, setCards] = useState<NotebookEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [stats, setStats] = useState({ know: 0, dontKnow: 0 });
  const [showComplete, setShowComplete] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch('/api/v1/vocabulary/topics');
        const data = await response.json();
        setTopics(data.items || []);
      } catch (err) {
        console.error('[FlashcardsPage] Failed to fetch topics:', err);
      }
    };
    fetchTopics();
  }, []);

  // Fetch cards
  const fetchCards = useCallback(async (topic: string | null) => {
    setLoading(true);
    try {
      const response = await notebookApi.getDueCards(20);
      let filteredCards = response.items;

      // Filter by topic if selected
      if (topic) {
        filteredCards = filteredCards.filter((c) => c.topic === topic);
      }

      setCards(filteredCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setStats({ know: 0, dontKnow: 0 });
      setShowComplete(false);
    } catch (err) {
      console.error('[FlashcardsPage] Failed to fetch cards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards(selectedTopic);
  }, [fetchCards, selectedTopic]);

  // Submit review
  const submitReview = async (quality: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    try {
      await notebookApi.submitReview(currentCard.id, quality);
    } catch (err) {
      console.error('[FlashcardsPage] Review submit failed:', err);
    }
  };

  // Handle swipe
  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (currentIndex >= cards.length) return;

      const currentCard = cards[currentIndex];

      if (direction === 'left') {
        // Don't know - submit quality 1
        await submitReview(1);
        setStats((s) => ({ ...s, dontKnow: s.dontKnow + 1 }));
      } else if (direction === 'right') {
        // Know it - submit quality 5
        await submitReview(5);
        setStats((s) => ({ ...s, know: s.know + 1 }));
      } else if (direction === 'up') {
        // Just skip to next without rating
      }

      // Move to next card
      if (currentIndex + 1 >= cards.length) {
        setShowComplete(true);
        onComplete?.();
      } else {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
      }
    },
    [currentIndex, cards, onComplete]
  );

  // Swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left'),
    onSwipedRight: () => handleSwipe('right'),
    onSwipedUp: () => handleSwipe('up'),
    onSwiping: (event) => {
      if (event.dir === 'Left' || event.dir === 'Right') {
        setTranslateX(event.delta.x);
      }
    },
    onAnimationEnd: () => setTranslateX(0),
    trackMouse: true,
  });

  const currentCard = cards[currentIndex];

  // Complete screen
  if (showComplete || cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.backgroundBase }}>
        <ClayCard className="p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-4">{cards.length === 0 ? '🎉' : '🏆'}</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: colors.deepSlate }}>
            {cards.length === 0 ? 'Tất cả đã xong!' : 'Hoàn thành!'}
          </h2>
          <p className=" mb-6" style={{ color: colors.mediumGray }}>
            {cards.length === 0
              ? 'Không có từ nào cần ôn tập'
              : `Bạn đã ôn ${stats.know + stats.dontKnow} từ`}
          </p>

          {stats.know + stats.dontKnow > 0 && (
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: colors.mintGreen }}>
                  {stats.know}
                </div>
                <div className="text-xs" style={{ color: colors.mediumGray }}>
                  Đã biết ✓
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: colors.coralPink }}>
                  {stats.dontKnow}
                </div>
                <div className="text-xs" style={{ color: colors.mediumGray }}>
                  Cần ôn 📚
                </div>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            onClick={() => fetchCards(selectedTopic)}
            className="w-full"
          >
            {cards.length === 0 ? 'Làm lại' : 'Ôn tập thêm'}
          </Button>

          {cards.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setShowComplete(false);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="w-full mt-3"
            >
              Tiếp tục
            </Button>
          )}
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.backgroundBase }}>
      {/* Header */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold" style={{ color: colors.deepSlate }}>
            📇 Flashcards
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: colors.mintGreen }}>
              ✓ {stats.know}
            </span>
            <span className="text-sm" style={{ color: colors.coralPink }}>
              ✗ {stats.dontKnow}
            </span>
            <span className="text-sm font-medium" style={{ color: colors.deepSlate }}>
              {currentIndex + 1}/{cards.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.lightGray }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
              backgroundColor: colors.neonTeal,
            }}
          />
        </div>

        {/* Topic Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {topics.slice(0, 6).map((topic) => (
            <Badge
              key={topic.slug}
              variant={selectedTopic === topic.slug ? 'primary' : 'secondary'}
              onClick={() => setSelectedTopic(selectedTopic === topic.slug ? null : topic.slug)}
              className="whitespace-nowrap"
            >
              {topic.icon} {topic.name_vi}
            </Badge>
          ))}
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div
            ref={cardRef}
            {...handlers}
            className="w-full max-w-md cursor-grab active:cursor-grabbing select-none"
            style={{
              transform: `translateX(${translateX}px) rotate(${translateX * 0.05}deg)`,
              transition: translateX === 0 ? 'transform 0.3s ease-out' : 'none',
            }}
          >
            {/* Swipe Indicators */}
            {translateX < -50 && (
              <div className="absolute top-1/2 left-4 -translate-y-1/2 px-4 py-2 rounded-xl text-2xl font-bold" style={{ backgroundColor: colors.coralPink }}>
                ✗
              </div>
            )}
            {translateX > 50 && (
              <div className="absolute top-1/2 right-4 -translate-y-1/2 px-4 py-2 rounded-xl text-2xl font-bold" style={{ backgroundColor: colors.mintGreen }}>
                ✓
              </div>
            )}

            {/* Flashcard */}
            <ClayCard
              className="p-8 min-h-80 flex flex-col items-center justify-center text-center"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              {/* Front (Word) */}
              <div className={isFlipped ? 'hidden' : 'block'}>
                <Badge variant="secondary" size="sm" className="mb-4">
                  {currentCard?.topic || 'Từ vựng'}
                </Badge>
                <h2 className="text-3xl font-bold mb-4" style={{ color: colors.deepSlate }}>
                  {currentCard?.word}
                </h2>
                <p className="text-sm" style={{ color: colors.mediumGray }}>
                  Nhấn để xem đáp án
                </p>
              </div>

              {/* Back (Translation) */}
              <div className={isFlipped ? 'block' : 'hidden'}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: colors.skyBlue }}>
                  {currentCard?.translation_vi}
                </h2>
                {currentCard?.translation_en && (
                  <p className="text-sm mb-4" style={{ color: colors.mediumGray }}>
                    {currentCard.translation_en}
                  </p>
                )}
                {currentCard?.context && (
                  <p className="text-xs italic p-2 rounded" style={{ backgroundColor: colors.warmWhite, color: colors.mediumGray }}>
                    "{currentCard.context}"
                  </p>
                )}
              </div>
            </ClayCard>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 border-t" style={{ borderColor: colors.lightGray }}>
        <div className="flex justify-center gap-8 text-xs" style={{ color: colors.mediumGray }}>
          <span>⬅️ Chưa biết</span>
          <span>⬆️ Bỏ qua</span>
          <span>➡️ Đã biết</span>
        </div>
      </div>
    </div>
  );
}

export default FlashcardsPage;
