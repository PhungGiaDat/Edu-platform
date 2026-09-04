// frontend/src/features/pronunciation-course/components/WordCard.tsx
import type { PronunciationWord } from '../types';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

interface WordCardProps {
  word: PronunciationWord;
  stars?: number;
  isLearned?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export function WordCard({ word, stars = 0, isLearned, isActive, onClick }: WordCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-4 shadow-clay cursor-pointer text-left w-full
        transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
        focus:outline-none focus:ring-4 focus:ring-yellow-300
        ${isActive ? 'ring-4 ring-yellow-400' : ''}
        ${isLearned ? 'opacity-80' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold text-lg text-slate-800">{word.word}</h4>
          {word.phonetic && (
            <p className="text-sm text-gray-500">{word.phonetic}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            DIFFICULTY_COLORS[word.difficulty]
          }`}
        >
          {word.difficulty}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`text-lg ${
              i < stars ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        {isLearned && <span className="ml-2 text-green-500 text-sm">Đã học</span>}
      </div>
    </button>
  );
}
