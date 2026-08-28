// frontend-web/src/pages/FlashcardPage.tsx
// Fetches all flashcards from /api/v1/flashcard and renders a scrollable grid.
// Tap any card to select it; a collapsible Practice panel appears below with
// PronunciationPractice and buttons for the 4 game types.
// Falls back to a single demo card if the API is offline.

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Flashcard from '@/features/learning/components/Flashcard';
import { PronunciationPractice } from '@/features/pronunciation/components/PronunciationPractice';
import { apiClient } from "../services/apiClient";
import { useAuth } from "../contexts/AuthContext";
import jungle from "../../public/assets/flashcards/jungle.jpg";

// -------- Types --------

interface FlashcardData {
  id?: string;
  _id?: string;
  qr_id?: string;
  word: string;
  translation?: string | Record<string, string>;
  image_url?: string;
  audio_url?: string;
  ar_tag?: string;
  category?: string;
  image_animation_type?: string;
}

type GameType = "drag_match" | "catch_word" | "word_scramble" | "memory_match";

const GAME_LABELS: Record<GameType, { label: string; emoji: string; color: string }> = {
  drag_match:    { label: "Drag Match",    emoji: "🖐️",  color: "#0ea5e9" },
  catch_word:    { label: "Catch Word",    emoji: "🎯",  color: "#f59e0b" },
  word_scramble: { label: "Word Scramble", emoji: "🔀",  color: "#10b981" },
  memory_match:  { label: "Memory Match",  emoji: "🧠",  color: "#f97316" },
};

const DEMO_CARD: FlashcardData = {
  word: "jungle",
  translation: "rainforest",
  image_url: jungle as string,
  audio_url: undefined,
  ar_tag: "tree_palm_02",
  image_animation_type: undefined,
};

const BG_FALLBACK =
  "https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg";

const getTranslationText = (translation?: FlashcardData["translation"]): string | undefined => {
  if (!translation) return undefined;
  if (typeof translation === "string") return translation;
  return translation.vi ?? translation.en ?? Object.values(translation)[0];
};

const getQrData = (card: FlashcardData): string =>
  card.qr_id ?? card.ar_tag ?? card.word;

// -------- Component --------

const FlashcardPage = () => {
  const navigate = useNavigate();
  const { user, token, isGuest } = useAuth();
  const userId = user?.id;
  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<FlashcardData | null>(null);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [startingGame, setStartingGame] = useState(false);

  // Fetch flashcards from API
  useEffect(() => {
    let cancelled = false;
    const fetchCards = async () => {
      try {
        const data = await apiClient.get('/api/v1/flashcard', {
          signal: AbortSignal.timeout(6000),
        });
        const list: FlashcardData[] = Array.isArray(data)
          ? data
          : data.flashcards ?? data.items ?? [];
        if (!cancelled) {
          setCards(list.length > 0 ? list : [DEMO_CARD]);
        }
      } catch {
        if (!cancelled) setCards([DEMO_CARD]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCards();
    return () => { cancelled = true; };
  }, []);

  const handleCardClick = useCallback((card: FlashcardData) => {
    setSelectedCard(card);
    setPracticeOpen(true);
  }, []);

  const handlePronunciationComplete = useCallback(
    async (score: number) => {
      if (!selectedCard || !userId || !token || isGuest) return;
      // POST attempt to backend to award XP
      try {
        await apiClient.post('/api/v1/pronunciation/attempt', {
          user_id: userId,
          flashcard_qr_id: getQrData(selectedCard),
          spoken_text: selectedCard.word, // browser speech transcription
          score,
        });
      } catch {
        // non-blocking — XP loss is acceptable if network is down
      }
    },
    [selectedCard, userId, token, isGuest]
  );

  const handleStartGame = useCallback(
    async (gameType: GameType) => {
      if (!selectedCard || startingGame) return;
      setStartingGame(true);
      try {
        const qrId = getQrData(selectedCard);
        if (userId && token && !isGuest) {
          await apiClient.post('/api/v1/game/start', null, {
            params: { type: gameType, flashcard_id: qrId, user_id: userId }
          });
        }
        navigate(`/game?type=${gameType}&flashcard_id=${qrId}`);
      } catch {
        // If the game endpoint isn't available, navigate anyway so UI isn't stuck
        navigate(`/game?type=${gameType}`);
      } finally {
        setStartingGame(false);
      }
    },
    [selectedCard, startingGame, navigate, userId, token, isGuest]
  );

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">📚</div>
          <p className="text-blue-700 font-bold text-lg">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-white/90 backdrop-blur-sm py-4 sm:py-6 md:py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-blue-800">Flashcards</h1>
        <p className="text-blue-600 text-xs sm:text-sm mt-1">Tap a card to practice pronunciation!</p>
      </div>

      {/* Card grid */}
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {cards.map((card, idx) => {
          const cardId = card.id ?? card._id ?? `card-${idx}`;
          const isSelected = selectedCard
            ? (selectedCard.id ?? selectedCard._id ?? selectedCard.word) ===
              (card.id ?? card._id ?? card.word)
            : false;

          return (
            <button
              key={cardId}
              onClick={() => handleCardClick(card)}
              className={`focus:outline-none rounded-2xl transition-transform duration-200
                ${isSelected ? "ring-4 ring-yellow-400 scale-105" : "hover:scale-105"}`}
              aria-label={`Select ${card.word} flashcard`}
            >
              <Flashcard
                word={card.word}
                bgUrl={BG_FALLBACK}
                imgUrl={card.image_url ?? jungle as string}
                qrData={getQrData(card)}
                audioUrl={card.audio_url}
                imageAnimationType={card.image_animation_type}
                translation={getTranslationText(card.translation)}
              />
            </button>
          );
        })}
      </div>

      {/* Practice panel — collapsible */}
      {selectedCard && practiceOpen && (
        <div className="max-w-md mx-auto rounded-3xl shadow-2xl overflow-hidden w-full sm:w-[90%] md:w-full"
          style={{ border: "4px solid #60a5fa" }}>
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #3b82f6, #0ea5e9)" }}
            onClick={() => setPracticeOpen(false)}
          >
            <span className="text-white font-black text-base sm:text-lg truncate">
              Practice: {selectedCard.word.toUpperCase()}
            </span>
            <span className="text-white text-lg sm:text-xl ml-2">▲</span>
          </div>

          {/* Pronunciation */}
          <div className="p-3 sm:p-4" style={{ background: "#eff6ff" }}>
            <PronunciationPractice
              targetText={selectedCard.word}
              imageUrl={selectedCard.image_url}
              audioUrl={selectedCard.audio_url}
              onComplete={handlePronunciationComplete}
            />
          </div>

          {/* Game buttons */}
          <div className="px-3 sm:px-4 pb-4 sm:pb-5" style={{ background: "#eff6ff" }}>
            <p className="text-center font-bold text-blue-700 text-xs sm:text-sm mb-3">
              Or play a mini-game!
            </p>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {(Object.entries(GAME_LABELS) as [GameType, (typeof GAME_LABELS)[GameType]][]).map(
                ([type, meta]) => (
                  <button
                    key={type}
                    onClick={() => handleStartGame(type)}
                    disabled={startingGame}
                    className="flex items-center justify-center gap-2 rounded-2xl px-3 sm:px-4 py-3 font-bold text-white text-xs sm:text-sm
                      shadow-md active:scale-95 transition-transform disabled:opacity-60 min-h-[44px]"
                    style={{ background: meta.color }}
                  >
                    <span className="text-lg sm:text-xl">{meta.emoji}</span>
                    <span className="hidden sm:inline">{meta.label}</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed tab — reopen practice panel */}
      {selectedCard && !practiceOpen && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-40 px-4">
          <button
            onClick={() => setPracticeOpen(true)}
            className="rounded-full px-4 sm:px-6 py-2 sm:py-3 font-black text-white shadow-xl text-xs sm:text-sm
              active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #3b82f6, #0ea5e9)" }}
          >
            🎤 {selectedCard.word.toUpperCase()} ▼
          </button>
        </div>
      )}
    </div>
  );
};

export default FlashcardPage;
