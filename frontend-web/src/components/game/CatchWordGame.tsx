2// src/components/games/CatchWordGame.tsx

import React, { useState, useEffect, useRef } from 'react';
import type { GameChallenge } from '../../types';
import { getApiBase } from '../../config';

const API_BASE = getApiBase();

interface FallingWord {
  id: number;
  word: string;
  x: number;
  y: number;
}

interface Props {
  challenge: GameChallenge;
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

export const CatchWordGame: React.FC<Props> = ({ challenge, onAnswer, showHint }) => {
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [basketX, setBasketX] = useState(50); // Percentage
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const wordIdRef = useRef(0);

  const fallSpeed = challenge.game_config?.fall_speed || 2;
  const spawnInterval = challenge.game_config?.spawn_interval || 2000;

  // Spawn falling words
  useEffect(() => {
    const interval = setInterval(() => {
      const randomWord = challenge.choices?.[Math.floor(Math.random() * challenge.choices.length)];
      if (randomWord) {
        setFallingWords(prev => [
          ...prev,
          {
            id: wordIdRef.current++,
            word: randomWord,
            x: Math.random() * 80 + 10, // 10-90%
            y: 0
          }
        ]);
      }
    }, spawnInterval);

    return () => clearInterval(interval);
  }, [challenge.choices, spawnInterval]);

  // Animate falling
  useEffect(() => {
    const interval = setInterval(() => {
      setFallingWords(prev =>
        prev
          .map(word => ({ ...word, y: word.y + fallSpeed }))
          .filter(word => word.y < 100)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [fallSpeed]);

  // Move basket
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setBasketX(Math.max(10, Math.min(90, x)));
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (gameAreaRef.current && e.touches[0]) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      setBasketX(Math.max(10, Math.min(90, x)));
    }
  };

  // Check collision
  const handleCatch = (word: FallingWord) => {
    const distance = Math.abs(word.x - basketX);
    if (distance < 10 && word.y > 80 && word.y < 95) {
      onAnswer(word.word);
      setFallingWords(prev => prev.filter(w => w.id !== word.id));
    }
  };

  useEffect(() => {
    fallingWords.forEach(word => handleCatch(word));
  }, [fallingWords, basketX]);

  return (
    <div className="space-y-4">
      {/* Image */}
      {challenge.image_url && (
        <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-blue-300">
          <img
            src={`${API_BASE}${challenge.image_url}`}
            alt="Challenge"
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Hint */}
      {showHint && challenge.hint && (
        <div className="p-3 bg-yellow-100 rounded-2xl border-4 border-yellow-300">
          <p className="text-sm font-bold text-yellow-800 text-center">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="relative h-96 bg-gradient-to-b from-blue-200 to-blue-300 rounded-2xl border-4 border-blue-400 overflow-hidden cursor-none"
      >
        {/* Falling words */}
        {fallingWords.map(word => (
          <div
            key={word.id}
            className="absolute px-4 py-2 bg-white rounded-xl border-2 border-gray-800 font-bold text-lg shadow-lg"
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'none'
            }}
          >
            {word.word}
          </div>
        ))}

        {/* Basket */}
        <div
          className="absolute bottom-4 w-24 h-20 transition-all duration-100"
          style={{
            left: `${basketX}%`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-7xl">🧺</div>
        </div>
      </div>

      <p className="text-center text-sm text-white/80 font-semibold">
        🎯 Move your device to catch the correct word!
      </p>
    </div>
  );
};