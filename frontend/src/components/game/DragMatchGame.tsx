// src/components/games/DragMatchGame.tsx - Mobile-first kid-friendly design

import React, { useState } from 'react';
import type { GameChallenge } from '../../types';
import { getApiBase } from '../../config';

const API_BASE = getApiBase();

interface Props {
  challenge: GameChallenge;
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

export const DragMatchGame: React.FC<Props> = ({ challenge, onAnswer, showHint }) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [droppedWord, setDroppedWord] = useState<string | null>(null);

  // Touch-friendly: tap to select, tap image to drop
  const handleWordClick = (word: string) => {
    if (selectedWord === word) {
      setSelectedWord(null); // Deselect
    } else {
      setSelectedWord(word);
    }
  };

  const handleImageClick = () => {
    if (selectedWord) {
      setDroppedWord(selectedWord);
      setTimeout(() => {
        onAnswer(selectedWord);
        setDroppedWord(null);
        setSelectedWord(null);
      }, 600);
    }
  };

  // Drag events (for desktop)
  const handleDragStart = (word: string) => {
    setSelectedWord(word);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (selectedWord) {
      handleImageClick();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const colors = [
    { bg: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', border: '#ea580c' },
    { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', border: '#2563eb' },
    { bg: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', border: '#16a34a' },
    { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', border: '#d97706' }
  ];

  return (
    <div className="space-y-4">
      {/* Question */}
      <div
        className="text-center p-3 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        }}
      >
        <p className="text-base font-bold text-white">{challenge.question}</p>
      </div>

      {/* Image - Drop Zone */}
      {challenge.image_url && (
        <div
          onClick={handleImageClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="relative rounded-2xl overflow-hidden cursor-pointer mx-auto"
          style={{
            maxWidth: '280px',
            border: droppedWord
              ? '4px solid #22c55e'
              : selectedWord
                ? '4px solid #fbbf24'
                : '4px solid #22d3ee',
            boxShadow: selectedWord
              ? '0 0 20px rgba(251, 191, 36, 0.5)'
              : '0 8px 25px rgba(6, 182, 212, 0.3)',
            transform: droppedWord ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.3s ease'
          }}
        >
          <img
            src={`${API_BASE}${challenge.image_url}`}
            alt="Match target"
            className="w-full object-cover"
            style={{ height: 'clamp(120px, 35vw, 180px)' }}
          />

          {/* Drop overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: selectedWord
                ? 'rgba(251, 191, 36, 0.3)'
                : 'rgba(6, 182, 212, 0.2)',
              backdropFilter: 'blur(2px)'
            }}
          >
            {droppedWord ? (
              <div
                className="px-6 py-3 rounded-2xl animate-bounce"
                style={{
                  background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                  border: '3px solid #fff',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.5)'
                }}
              >
                <p
                  className="font-black text-white"
                  style={{ fontSize: 'clamp(18px, 5vw, 28px)' }}
                >
                  ✓ {droppedWord}
                </p>
              </div>
            ) : (
              <div
                className="px-4 py-2 rounded-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '3px dashed #fbbf24'
                }}
              >
                  <p
                    className="font-bold text-sky-700"
                    style={{ fontSize: 'clamp(12px, 3.5vw, 16px)' }}
                  >
                  {selectedWord ? '👆 Tap here!' : '👇 Select a word'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint */}
      {showHint && challenge.hint && (
        <div
          className="p-2 rounded-xl text-center mx-auto"
          style={{
            maxWidth: '300px',
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

      {/* Word Options - Mobile optimized grid */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(2, 1fr)',
          padding: '0 0.5rem'
        }}
      >
        {challenge.choices?.map((word, index) => {
          const color = colors[index % colors.length];
          const isSelected = selectedWord === word;

          return (
            <button
              key={index}
              draggable
              onDragStart={() => handleDragStart(word)}
              onClick={() => handleWordClick(word)}
              className="relative overflow-hidden"
              style={{
                padding: 'clamp(12px, 3vw, 20px)',
                background: color.bg,
                borderRadius: '1rem',
                border: isSelected ? '4px solid #fff' : `3px solid ${color.border}`,
                boxShadow: isSelected
                  ? '0 0 20px rgba(255, 255, 255, 0.5), 0 4px 15px rgba(0,0,0,0.2)'
                  : '0 4px 12px rgba(0,0,0,0.15)',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <span
                className="font-bold text-white drop-shadow-md flex items-center justify-center gap-1"
                style={{ fontSize: 'clamp(14px, 4vw, 20px)' }}
              >
                {isSelected && '✓ '}
                {word}
              </span>
            </button>
          );
        })}
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
        👆 Tap a word, then tap the picture to match!
      </p>
    </div>
  );
};
