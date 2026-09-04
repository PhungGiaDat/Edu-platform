// frontend/src/features/pronunciation-course/components/FeedbackDisplay.tsx
import type { EvaluationResult } from '../types';

interface FeedbackDisplayProps {
  result: EvaluationResult;
}

export function FeedbackDisplay({ result }: FeedbackDisplayProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-clay-lg text-center animate-bounce-in">
      <div className="flex justify-center gap-2 mb-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`text-4xl transition-all duration-300 ${
              i < result.stars ? 'text-yellow-400 scale-100' : 'text-gray-300 scale-75'
            }`}
          >
            ★
          </span>
        ))}
      </div>
      <p className="text-xl font-bold text-slate-800 mb-2">
        {result.feedback}
      </p>
      <p className="text-sm text-gray-500">
        Điểm: {result.score}% · {result.evaluation_method === 'huggingface' ? 'AI' : 'Browser'}
      </p>
    </div>
  );
}
