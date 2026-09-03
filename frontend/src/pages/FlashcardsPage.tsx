/**
 * FlashcardsPage - TikTok-style Swipe Flashcards
 * Swipe up to next, left = don't know, right = know
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { notebookApi } from '../services/notebookApi';
import type { NotebookEntry, VocabularyTopic } from '../types/notebook';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner';
import { Badge } from '@/shared/components/ui/Badge';
import { colors, shadows, withOpacity } from '../design-tokens/claymorphic';

/** Kid Leitner box — stage names for the seed→bloom metaphor. */
export const BOX_STAGES = ['', 'Hạt 🌰', 'Mầm 🌱', 'Cây nhỏ 🌿', 'Nụ hoa 🌷', 'Nở hoa 🌸'] as const;

interface FlashcardsPageProps {
  onComplete?: () => void;
}

/** Positive-only floating XP/toast message (no failure framing). */
interface ToastState {
  id: number;
  text: string;
  tone: 'xp' | 'bloom';
}

export function FlashcardsPage({ onComplete }: FlashcardsPageProps) {
  const [topics, setTopics] = useState<VocabularyTopic[]>([]);
  const [cards, setCards] = useState<NotebookEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [stats, setStats] = useState({ know: 0, practiced: 0 });
  const [showComplete, setShowComplete] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  // Relearn requeue: words answered "relearn" come back 2 cards later,
  // max twice per session — always succeeds eventually, never traps a loop.
  const requeueRef = useRef<{ id: string; count: number }[]>([]);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((text: string, tone: ToastState['tone'] = 'xp') => {
    setToast({ id: Date.now(), text, tone });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1800);
  }, []);

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
      setStats({ know: 0, practiced: 0 });
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

  // Submit review — no-fail kid flow:
  //  "relearn" (1): box stays, card requeued later in this session, due tomorrow.
  //  "know" (5):    box +1 (never decreases), bonus XP, bloom celebration at box 5.
  // eventId is stable per swipe → retries never double-award XP.
  const submitReview = async (quality: number) => {
    const currentCard = cards[currentIndex]; // used in JSX below
    if (!currentCard) return;
    const eventId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `swipe-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const result = await notebookApi.submitReview(currentCard.id, quality, eventId);
      const gained = result.xp_awarded ?? 0;
      if (gained > 0) {
        setSessionXp((xp) => xp + gained);
        showToast(`+${gained} XP ⭐`);
      }
      if (result.mastery_box >= 5 && quality >= 3) {
        showToast(result.sticker_earned
          ? `Nở hoa! 🌸 Huy hiệu "${result.sticker_earned.name}"!`
          : 'Nở hoa rồi! 🌸 Tuyệt vời!', 'bloom');
      } else if (result.box_up) {
        showToast(`${BOX_STAGES[result.mastery_box] ?? 'Lên cấp'} lên cấp! 🎉`);
      }
    } catch (err) {
      console.error('[FlashcardsPage] Review submit failed:', err);
    }
  };

  // Handle swipe
  const handleSwipe = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (currentIndex >= cards.length) return;

      // currentCard used in submitReview via closure

      if (direction === 'left') {
        // Relearn — positive-only: requeue for an in-session retry
        await submitReview(1);
        setStats((s) => ({ ...s, practiced: s.practiced + 1 }));
        const card = cards[currentIndex];
        if (card) {
          const entry = requeueRef.current.find((r) => r.id === card.id);
          if (!entry) requeueRef.current.push({ id: card.id, count: 1 });
          else if (entry.count < 2) entry.count += 1;
          else {
            // Retry budget spent — scheduled for tomorrow by the backend anyway
            requeueRef.current = requeueRef.current.filter((r) => r.id !== card.id);
          }
        }
      } else if (direction === 'right') {
        // Know it — box up
        await submitReview(5);
        setStats((s) => ({ ...s, know: s.know + 1 }));
        const card = cards[currentIndex];
        if (card) requeueRef.current = requeueRef.current.filter((r) => r.id !== card.id);
      } else if (direction === 'up') {
        // Just skip to next without rating
      }

      // Move to next card (relearned words rejoin near the front)
      if (currentIndex + 1 >= cards.length) {
        const pending = requeueRef.current.find((r) => r.count < 2);
        if (pending && direction === 'left') {
          // Session continues: surface the relearned word again right away
          setCards((prev) => {
            if (!prev.some((c) => c.id === pending.id)) return prev;
            const relearned = prev.find((c) => c.id === pending.id);
            const rest = prev.filter((c, i) => c.id !== pending.id || i === currentIndex);
            return relearned ? [...rest, relearned] : prev;
          });
          setShowComplete(false);
        } else {
          setShowComplete(true);
          onComplete?.();
        }
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
    onSwiping: (event: any) => {
      if (event.dir === 'Left' || event.dir === 'Right') {
        setTranslateX(event.delta.x);
      }
    },
    trackMouse: true,
  });

  const currentCard = cards[currentIndex]; // used in JSX below

  // Complete screen
  if (showComplete || cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: colors.backgroundBase }}>
        <ClayCard className="p-8 text-center max-w-sm w-full">
          <div className="text-6xl mb-4">{cards.length === 0 ? '🎉' : '🏆'}</div>
          <h2 className="text-2xl font-black mb-2" style={{ color: colors.deepSlate }}>
            {cards.length === 0 ? 'Tất cả đã xong!' : 'Hoàn thành!'}
          </h2>
          <p className=" mb-6" style={{ color: colors.mediumGray }}>
            {cards.length === 0
              ? 'Không có từ nào cần ôn tập'
              : `Bạn đã luyện ${stats.know + stats.practiced} từ`}
          </p>

          {stats.know + stats.practiced > 0 && (
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: colors.mintGreenDark ?? '#7DC760' }}>
                  {stats.know}
                </div>
                <div className="text-xs" style={{ color: colors.mediumGray }}>
                  Đã biết ✓
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: colors.sunshineYellowDark ?? '#E5B800' }}>
                  {stats.practiced}
                </div>
                <div className="text-xs" style={{ color: colors.mediumGray }}>
                  Đã luyện thêm 💪
                </div>
              </div>
            </div>
          )}

          {sessionXp > 0 && (
            <div
              className="mb-6 rounded-2xl px-4 py-3 font-black text-lg"
              style={{ backgroundColor: withOpacity(colors.sunshineYellow, 0.4), boxShadow: shadows.claySm, color: colors.deepSlate }}
            >
              +{sessionXp} XP ⭐ hôm nay!
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
            <span className="text-sm font-bold" style={{ color: colors.mintGreenDark ?? '#7DC760' }}>
              ✓ {stats.know}
            </span>
            {sessionXp > 0 && (
              <span className="text-sm font-black" style={{ color: colors.sunshineYellowDark ?? '#E5B800' }}>
                ⭐ {sessionXp} XP
              </span>
            )}
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
      <div className="flex-1 flex items-center justify-center px-4 pb-4 relative">
        {/* Floating XP/toast — pointer-transparent, positive-only */}
        {toast && (
          <div
            key={toast.id}
            className={`absolute top-2 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-2 font-black text-lg ${toast.tone === 'bloom' ? 'clay-toast-bloom' : 'clay-toast-xp'}`}
            style={{
              backgroundColor: toast.tone === 'bloom'
                ? withOpacity(colors.bubblePink, 0.95)
                : withOpacity(colors.sunshineYellow, 0.95),
              color: colors.deepSlate,
              boxShadow: shadows.clay,
            }}
            aria-live="polite"
          >
            {toast.text}
          </div>
        )}
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div
            {...handlers}
            className="w-full max-w-md cursor-grab active:cursor-grabbing select-none"
            style={{
              transform: `translateX(${translateX}px) rotate(${translateX * 0.05}deg)`,
              transition: translateX === 0 ? 'transform 0.3s ease-out' : 'none',
            }}
          >
            {/* Swipe Indicators — positive-only (no ✗/red) */}
            {translateX < -50 && (
              <div className="absolute top-1/2 left-4 -translate-y-1/2 px-4 py-2 rounded-xl text-2xl font-bold" style={{ backgroundColor: withOpacity(colors.mintGreen, 0.9) }}>
                🌱
              </div>
            )}
            {translateX > 50 && (
              <div className="absolute top-1/2 right-4 -translate-y-1/2 px-4 py-2 rounded-xl text-2xl font-bold" style={{ backgroundColor: withOpacity(colors.mintGreen, 0.9) }}>
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

      {/* Instructions — positive kid framing, box stage chip */}
      <div className="px-4 py-3 border-t" style={{ borderColor: colors.lightGray }}>
        <div className="flex justify-center items-center gap-4 text-xs font-semibold" style={{ color: colors.mediumGray }}>
          <span>⬅️ Học lại nhé 🌱</span>
          <span>⬆️ Bỏ qua</span>
          <span>➡️ Đã biết! 🎉</span>
        </div>
        {currentCard?.mastery_box != null && (
          <p className="text-center text-xs mt-2 font-bold" style={{ color: colors.mediumGray }}>
            Từ này đang ở: {BOX_STAGES[currentCard.mastery_box] ?? `Hộp ${currentCard.mastery_box}`}
          </p>
        )}
      </div>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .clay-toast-xp { animation: clayToastFloat 1.8s ease-out forwards; }
          .clay-toast-bloom { animation: clayToastBloom 1.8s cubic-bezier(0.34,1.56,0.64,1) forwards; }
          @keyframes clayToastFloat {
            0% { opacity: 0; transform: translate(-50%, 8px); }
            15% { opacity: 1; transform: translate(-50%, 0); }
            75% { opacity: 1; transform: translate(-50%, -6px); }
            100% { opacity: 0; transform: translate(-50%, -18px); }
          }
          @keyframes clayToastBloom {
            0% { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
            25% { opacity: 1; transform: translate(-50%, -4px) scale(1.1); }
            40% { transform: translate(-50%, -4px) scale(0.98); }
            55% { transform: translate(-50%, -4px) scale(1.05); }
            80% { opacity: 1; transform: translate(-50%, -10px) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -22px) scale(1); }
          }
        }
      `}</style>
    </div>
  );
}

export default FlashcardsPage;
