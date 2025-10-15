// src/components/games/WordScrambleGame.tsx

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
    <div className="space-y-6">
      {/* Image */}
      {challenge.image_url && (
        <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-purple-300">
          <img
            src={`${API_BASE}${challenge.image_url}`}
            alt="Challenge"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Hint */}
      {showHint && challenge.hint && (
        <div className="p-3 bg-yellow-100 rounded-2xl border-4 border-yellow-300">
          <p className="text-sm md:text-base font-bold text-yellow-800 text-center">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Your Answer */}
      <div className="bg-white/90 rounded-2xl p-6 border-4 border-blue-300 min-h-24">
        <p className="text-sm font-bold text-gray-600 mb-3 text-center">Your Answer:</p>
        <div className="flex flex-wrap justify-center gap-2 min-h-16">
          {selectedLetters.length === 0 ? (
            <p className="text-gray-400 text-lg">Click letters below...</p>
          ) : (
            selectedLetters.map((letter, index) => (
              <button
                key={index}
                onClick={() => handleRemoveLetter(index)}
                className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl text-white font-black text-2xl shadow-lg border-4 border-blue-600 hover:scale-110 transition-transform"
              >
                {letter}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Available Letters */}
      <div className="bg-white/90 rounded-2xl p-6 border-4 border-purple-300">
        <p className="text-sm font-bold text-gray-600 mb-3 text-center">Scrambled Letters:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {availableLetters.map((letter, index) => (
            <button
              key={index}
              onClick={() => handleLetterClick(letter, index)}
              className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl text-white font-black text-2xl shadow-lg border-4 border-purple-600 hover:scale-110 active:scale-95 transition-transform"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 rounded-2xl text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-gray-600"
        >
          🔄 Reset
        </button>
        <button
          onClick={handleSubmit}
          disabled={selectedLetters.length === 0}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-white font-bold text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-green-600"
        >
          ✓ Submit
        </button>
      </div>
    </div>
  );
};