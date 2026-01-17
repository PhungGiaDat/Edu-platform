// src/components/games/WordScrambleGame.tsx - Mobile-first kid-friendly design

import React, { useState } from 'react';
import type { GameChallenge } from '../../types';
import { getApiBase } from '../../config';

const API_BASE = getApiBase();

interface Props {
  challenge: GameChallenge;
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

export const WordScrambleGame: React.FC<Props> = ({ challenge, onAnswer, showHint }) => {
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>(
    challenge.scrambled_word?.split('') || []
  );

  const handleLetterClick = (letter: string, index: number) => {
    setSelectedLetters(prev => [...prev, letter]);
    setAvailableLetters(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveLetter = (index: number) => {
    const letter = selectedLetters[index];
    setSelectedLetters(prev => prev.filter((_, i) => i !== index));
    setAvailableLetters(prev => [...prev, letter]);
  };

  const handleSubmit = () => {
    const answer = selectedLetters.join('');
    onAnswer(answer);
  };

  const handleReset = () => {
    setSelectedLetters([]);
    setAvailableLetters(challenge.scrambled_word?.split('') || []);
  };

  return (
    <div className="space-y-3">
      {/* Question */}
      <div
        className="text-center p-3 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
        }}
      >
        <p className="text-base font-bold text-white">{challenge.question}</p>
      </div>

      {/* Image - smaller for mobile */}
      {challenge.image_url && (
        <div
          className="rounded-2xl overflow-hidden shadow-xl mx-auto"
          style={{
            border: '4px solid #c084fc',
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
          <p
            className="font-bold text-amber-800"
            style={{ fontSize: 'clamp(11px, 3vw, 14px)' }}
          >
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Your Answer */}
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '3px solid #60a5fa',
          minHeight: '80px'
        }}
      >
        <p
          className="font-bold text-gray-600 mb-2 text-center"
          style={{ fontSize: 'clamp(10px, 2.5vw, 12px)' }}
        >
          Your Answer:
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {selectedLetters.length === 0 ? (
            <p className="text-gray-400" style={{ fontSize: 'clamp(12px, 3vw, 16px)' }}>
              👇 Tap letters below...
            </p>
          ) : (
            selectedLetters.map((letter, index) => (
              <button
                key={index}
                onClick={() => handleRemoveLetter(index)}
                style={{
                  width: 'clamp(36px, 10vw, 48px)',
                  height: 'clamp(36px, 10vw, 48px)',
                  fontSize: 'clamp(16px, 5vw, 24px)',
                  background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                  border: '3px solid #2563eb',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontWeight: 900,
                  boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {letter}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Available Letters */}
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '3px solid #c084fc'
        }}
      >
        <p
          className="font-bold text-gray-600 mb-2 text-center"
          style={{ fontSize: 'clamp(10px, 2.5vw, 12px)' }}
        >
          Scrambled Letters:
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {availableLetters.map((letter, index) => {
            const colors = [
              { bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', border: '#db2777' },
              { bg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', border: '#7c3aed' },
              { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', border: '#059669' },
              { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', border: '#d97706' },
              { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', border: '#2563eb' },
              { bg: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', border: '#ea580c' },
            ];
            const color = colors[index % colors.length];

            return (
              <button
                key={index}
                onClick={() => handleLetterClick(letter, index)}
                style={{
                  width: 'clamp(36px, 10vw, 48px)',
                  height: 'clamp(36px, 10vw, 48px)',
                  fontSize: 'clamp(16px, 5vw, 24px)',
                  background: color.bg,
                  border: `3px solid ${color.border}`,
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontWeight: 900,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleReset}
          className="flex-1"
          style={{
            padding: 'clamp(10px, 3vw, 14px)',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
            border: '3px solid #4b5563',
            borderRadius: '1rem',
            color: '#fff',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(107, 114, 128, 0.3)',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          🔄 Reset
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedLetters.length === 0}
          className="flex-1"
          style={{
            padding: 'clamp(10px, 3vw, 14px)',
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            background: selectedLetters.length === 0
              ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
              : 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
            border: selectedLetters.length === 0 ? '3px solid #9ca3af' : '3px solid #16a34a',
            borderRadius: '1rem',
            color: '#fff',
            fontWeight: 700,
            boxShadow: selectedLetters.length === 0 ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.4)',
            opacity: selectedLetters.length === 0 ? 0.6 : 1,
            cursor: selectedLetters.length === 0 ? 'not-allowed' : 'pointer',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          ✓ Submit
        </button>
      </div>
    </div>
  );
};