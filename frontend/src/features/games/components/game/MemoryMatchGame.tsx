// src/components/games/MemoryMatchGame.tsx - Mobile-first kid-friendly design

import React, { useState, useEffect } from 'react';
import type { GameChallenge } from '@/types';
import { getApiBase } from '@/config';

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

  // Auto grid: 4 columns for 8 cards, 3 for 6, 2 for 4
  const numCards = cards.length;
  const gridCols = numCards >= 8 ? 4 : numCards >= 6 ? 3 : 2;

  return (
    <div className="space-y-3">
      {/* Question */}
      <div
        className="text-center p-2 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        }}
      >
        <p className="text-sm font-bold text-white">{challenge.question}</p>
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center gap-2">
        <div
          className="px-3 py-1 rounded-full shadow"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
            border: '2px solid #fff'
          }}
        >
          <span className="text-white font-bold text-xs">
            🎯 Moves: {moves}
          </span>
        </div>
        <div
          className="px-3 py-1 rounded-full shadow"
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
            border: '2px solid #fff'
          }}
        >
          <span className="text-white font-bold text-xs">
            ✅ {matchedPairs.length}/{challenge.pairs?.length || 0}
          </span>
        </div>
      </div>

      {/* Hint */}
      {showHint && challenge.hint && (
        <div
          className="p-2 rounded-xl text-center"
          style={{
            background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)',
            border: '2px solid #eab308'
          }}
        >
          <p className="text-xs font-bold text-amber-800">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Card Grid - Mobile optimized */}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`
        }}
      >
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            disabled={!canFlip || card.isFlipped || card.isMatched}
            className="relative overflow-hidden"
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '0.75rem',
              border: card.isMatched
                ? '3px solid #22c55e'
                  : card.isFlipped
                    ? '3px solid #60a5fa'
                    : '3px solid #93c5fd',
                background: card.isMatched
                  ? 'linear-gradient(135deg, #86efac 0%, #4ade80 100%)'
                  : card.isFlipped
                    ? '#fff'
                    : 'linear-gradient(135deg, #93c5fd 0%, #0ea5e9 100%)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              transform: card.isMatched ? 'scale(0.95)' : 'scale(1)',
              opacity: card.isMatched ? 0.8 : 1,
              transition: 'all 0.3s ease',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {/* Card Back */}
            {!card.isFlipped && !card.isMatched && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span style={{ fontSize: 'clamp(24px, 8vw, 40px)' }}>❓</span>
              </div>
            )}

            {/* Card Front */}
            {(card.isFlipped || card.isMatched) && (
              <div className="absolute inset-0 flex items-center justify-center p-1">
                {card.type === 'image' ? (
                  <img
                    src={`${API_BASE}${card.content}`}
                    alt="Memory card"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span
                    className="font-black text-sky-700 text-center break-words px-1"
                    style={{ fontSize: 'clamp(10px, 3vw, 16px)' }}
                  >
                    {card.content}
                  </span>
                )}
              </div>
            )}

            {/* Matched indicator */}
            {card.isMatched && (
              <div
                className="absolute top-0 right-0 animate-bounce"
                style={{ fontSize: 'clamp(14px, 4vw, 24px)' }}
              >
                ✅
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="w-full"
        style={{
          padding: 'clamp(8px, 2vw, 12px)',
          fontSize: 'clamp(12px, 3.5vw, 16px)',
          background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
          border: '3px solid #ea580c',
          borderRadius: '1rem',
          color: '#fff',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(249, 115, 22, 0.4)',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        🔄 Shuffle Cards
      </button>
    </div>
  );
};
