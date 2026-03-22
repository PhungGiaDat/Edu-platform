// src/components/games/CatchWordGame.tsx

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
            x: Math.random() * 70 + 15, // 15-85% for mobile
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

  // Move basket with mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setBasketX(Math.max(15, Math.min(85, x)));
    }
  };

  // Move basket with touch (mobile)
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent scrolling
    if (gameAreaRef.current && e.touches[0]) {
      const rect = gameAreaRef.current.getBoundingClientRect();
      const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      setBasketX(Math.max(15, Math.min(85, x)));
    }
  };

  // Check collision
  const handleCatch = (word: FallingWord) => {
    const distance = Math.abs(word.x - basketX);
    if (distance < 15 && word.y > 75 && word.y < 95) {
      onAnswer(word.word);
      setFallingWords(prev => prev.filter(w => w.id !== word.id));
    }
  };

  useEffect(() => {
    fallingWords.forEach(word => handleCatch(word));
  }, [fallingWords, basketX]);

  return (
    <div className="space-y-3">
      {/* Question */}
      <div
        className="text-center p-3 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        }}
      >
        <p className="text-base font-bold text-white">{challenge.question}</p>
      </div>

      {/* Image - smaller for mobile */}
      {challenge.image_url && (
        <div
          className="rounded-2xl overflow-hidden shadow-xl mx-auto"
          style={{
            border: '4px solid #22d3ee',
            maxWidth: '150px'
          }}
        >
          <img
            src={`${API_BASE}${challenge.image_url}`}
            alt="Challenge"
            className="w-full h-24 object-cover"
          />
        </div>
      )}

      {/* Hint */}
      {showHint && challenge.hint && (
        <div
          className="p-2 rounded-xl text-center"
          style={{
            background: 'linear-gradient(135deg, #fef08a 0%, #fde047 100%)',
            border: '3px solid #eab308'
          }}
        >
          <p className="text-sm font-bold text-amber-800">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Game Area - Mobile optimized */}
      <div
        ref={gameAreaRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onTouchStart={(e) => e.preventDefault()}
        className="relative overflow-hidden touch-none"
        style={{
          height: 'min(50vh, 300px)',
          background: 'linear-gradient(180deg, #67e8f9 0%, #06b6d4 50%, #0e7490 100%)',
          borderRadius: '1.5rem',
          border: '4px solid #22d3ee',
          boxShadow: '0 8px 25px rgba(6, 182, 212, 0.4)'
        }}
      >
        {/* Sky decoration */}
        <div className="absolute top-2 left-4 text-3xl opacity-70">☁️</div>
        <div className="absolute top-4 right-6 text-2xl opacity-60">☁️</div>
        <div className="absolute top-1 left-1/2 text-xl opacity-50">☁️</div>

        {/* Falling words */}
        {fallingWords.map(word => (
          <div
            key={word.id}
            className="absolute shadow-lg"
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: 'translate(-50%, -50%)',
              padding: 'clamp(6px, 2vw, 12px) clamp(10px, 3vw, 20px)',
              fontSize: 'clamp(12px, 3.5vw, 18px)',
              fontWeight: 700,
              background: word.word === challenge.correct_answer
                ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                : 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                color: '#fff',
              borderRadius: '1rem',
              border: '3px solid rgba(255,255,255,0.5)',
              whiteSpace: 'nowrap'
            }}
          >
            {word.word}
          </div>
        ))}

        {/* Ground */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12"
          style={{
            background: 'linear-gradient(180deg, #84cc16 0%, #65a30d 100%)',
            borderTop: '3px solid #4d7c0f'
          }}
        />

        {/* Basket */}
        <div
          className="absolute transition-all duration-75"
          style={{
            bottom: '12px',
            left: `${basketX}%`,
            transform: 'translateX(-50%)',
            fontSize: 'clamp(40px, 12vw, 70px)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
          }}
        >
          🧺
        </div>
      </div>

      {/* Instructions */}
      <p
        className="text-center font-bold"
        style={{
          fontSize: 'clamp(11px, 3vw, 14px)',
          color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}
      >
        👆 Swipe to move the basket and catch "{challenge.correct_answer}"!
      </p>
    </div>
  );
};
