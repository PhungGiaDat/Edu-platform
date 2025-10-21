// src/components/games/DragMatchGame.tsx

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
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [droppedWord, setDroppedWord] = useState<string | null>(null);

  const handleDragStart = (word: string) => {
    setDraggedWord(word);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedWord) {
      setDroppedWord(draggedWord);
      setTimeout(() => {
        onAnswer(draggedWord);
        setDroppedWord(null);
        setDraggedWord(null);
      }, 500);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Image - Drop Zone */}
      {challenge.image_url && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative rounded-2xl overflow-hidden shadow-xl border-4 ${
            droppedWord ? 'border-green-400 scale-105' : 'border-yellow-300'
          } transition-all duration-300`}
        >
          <img
            src={`${API_BASE}${challenge.image_url}`}
            alt="Challenge"
            className="w-full h-64 object-cover"
          />
          
          {/* Drop overlay */}
          <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-white/50">
            {droppedWord ? (
              <div className="bg-white/95 px-8 py-4 rounded-2xl border-4 border-green-500 shadow-2xl animate-bounce">
                <p className="text-3xl font-black text-green-600">{droppedWord}</p>
              </div>
            ) : (
              <div className="bg-white/80 px-6 py-3 rounded-2xl border-4 border-yellow-400">
                <p className="text-xl font-bold text-purple-700">👆 Drop word here!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint */}
      {showHint && challenge.hint && (
        <div className="p-3 bg-yellow-100 rounded-2xl border-4 border-yellow-300 animate-fadeIn">
          <p className="text-sm md:text-base font-bold text-yellow-800 text-center">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Draggable Words */}
      <div className="grid grid-cols-2 gap-4">
        {challenge.choices?.map((word, index) => {
          const colors = [
            'from-red-400 to-pink-500 border-red-600',
            'from-blue-400 to-cyan-500 border-blue-600',
            'from-green-400 to-emerald-500 border-green-600',
            'from-yellow-400 to-orange-500 border-yellow-600'
          ];

          return (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(word)}
              className={`p-5 bg-gradient-to-br ${colors[index]} rounded-2xl text-white font-bold text-xl text-center cursor-move transition-all transform hover:scale-110 active:scale-95 shadow-lg border-4 ${
                draggedWord === word ? 'opacity-50 scale-95' : ''
              }`}
            >
              <span className="drop-shadow-md">🎯 {word}</span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm text-white/80 font-semibold">
        ✨ Drag a word and drop it on the picture!
      </p>
    </div>
  );
};