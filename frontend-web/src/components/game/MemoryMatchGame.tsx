// src/components/games/MemoryMatchGame.tsx

import React, { useState, useEffect } from 'react';
import type { GameChallenge} from '../../types';
import { getApiBase } from '../../config';

const API_BASE = getApiBase();

interface Card {
  id: string;
  pairId: string;
  type: 'image' | 'word';
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface Props {
  challenge: GameChallenge;
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

export const MemoryMatchGame: React.FC<Props> = ({ challenge, onAnswer, showHint }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [canFlip, setCanFlip] = useState(true);

  // Initialize cards
  useEffect(() => {
    if (challenge.pairs) {
      const shuffledCards = challenge.pairs
        .map((pair, index) => ({
          id: `${pair.id}-${pair.type}-${index}`,
          pairId: pair.id,
          type: pair.type,
          content: pair.content,
          isFlipped: false,
          isMatched: false
        }))
        .sort(() => Math.random() - 0.5); // Shuffle

      setCards(shuffledCards);
    }
  }, [challenge.pairs]);

  // Check if game is completed
  useEffect(() => {
    if (matchedPairs.length > 0 && matchedPairs.length === (challenge.pairs?.length || 0)) {
      setTimeout(() => {
        onAnswer('completed'); // Signal completion
      }, 1000);
    }
  }, [matchedPairs, challenge.pairs, onAnswer]);

  const handleCardClick = (card: Card) => {
    if (!canFlip || card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

    // Flip card
    const updatedCards = cards.map(c =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);

    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    // Check for match when 2 cards are flipped
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setCanFlip(false);

      const [first, second] = newFlipped;

      if (first.pairId === second.pairId) {
        // Match found!
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.pairId === first.pairId ? { ...c, isMatched: true } : c
            )
          );
          setMatchedPairs(prev => [...prev, first.pairId]);
          setFlippedCards([]);
          setCanFlip(true);
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === first.id || c.id === second.id
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
          setCanFlip(true);
        }, 1000);
      }
    }
  };

  const handleReset = () => {
    setCards(prev =>
      prev
        .map(c => ({ ...c, isFlipped: false, isMatched: false }))
        .sort(() => Math.random() - 0.5)
    );
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setCanFlip(true);
  };

  const gridCols = challenge.game_config?.grid_size === '4x2' ? 4 : 3;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex justify-between items-center">
        <div className="bg-purple-500/90 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-white shadow-lg">
          <span className="text-white font-bold text-sm md:text-base">
            🎯 Moves: {moves}
          </span>
        </div>
        <div className="bg-green-500/90 backdrop-blur-sm px-4 py-2 rounded-full border-2 border-white shadow-lg">
          <span className="text-white font-bold text-sm md:text-base">
            ✅ Found: {matchedPairs.length}/{challenge.pairs?.length || 0}
          </span>
        </div>
      </div>

      {/* Hint */}
      {showHint && challenge.hint && (
        <div className="p-3 bg-yellow-100 rounded-2xl border-4 border-yellow-300">
          <p className="text-sm md:text-base font-bold text-yellow-800 text-center">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Card Grid */}
      <div
        className={`grid gap-3 md:gap-4`}
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`
        }}
      >
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            disabled={!canFlip || card.isFlipped || card.isMatched}
            className={`relative aspect-square rounded-2xl border-4 transition-all duration-300 transform ${
              card.isMatched
                ? 'bg-green-400 border-green-600 scale-95 opacity-75'
                : card.isFlipped
                ? 'bg-white border-blue-400 scale-105'
                : 'bg-gradient-to-br from-purple-400 to-pink-500 border-purple-600 hover:scale-110 active:scale-95'
            } shadow-lg`}
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.3s'
            }}
          >
            {/* Card Back */}
            {!card.isFlipped && !card.isMatched && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl md:text-7xl">❓</span>
              </div>
            )}

            {/* Card Front */}
            {(card.isFlipped || card.isMatched) && (
              <div className="absolute inset-0 flex items-center justify-center p-2">
                {card.type === 'image' ? (
                  <img
                    src={`${API_BASE}${card.content}`}
                    alt="Memory card"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <span className="text-base md:text-xl font-black text-purple-700 text-center break-words">
                    {card.content}
                  </span>
                )}
              </div>
            )}

            {/* Matched indicator */}
            {card.isMatched && (
              <div className="absolute top-1 right-1 text-2xl md:text-3xl animate-bounce">
                ✅
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="w-full px-6 py-3 bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 rounded-2xl text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-orange-600"
      >
        🔄 Shuffle Cards
      </button>

      <p className="text-center text-sm text-white/80 font-semibold">
        🎴 Flip cards to find matching pairs!
      </p>
    </div>
  );
};