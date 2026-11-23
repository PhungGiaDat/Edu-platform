// frontend/src/features/pronunciation-course/components/RecordingButton.tsx
import type { RecordingState } from '../hooks/usePronunciationEngine';

interface RecordingButtonProps {
  state: RecordingState;
  onStart: () => void;
  onStop: () => void;
}

export function RecordingButton({ state, onStart, onStop }: RecordingButtonProps) {
  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={isProcessing}
        className={`
          relative w-24 h-24 rounded-full flex items-center justify-center
          shadow-clay-lg cursor-pointer transition-all duration-200
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-4 focus:ring-offset-2
          ${isRecording
            ? 'bg-red-500 shadow-red-300 focus:ring-red-300'
            : 'bg-sky-100 shadow-clay-blue focus:ring-sky-300'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
        )}
        <span className={`text-3xl relative z-10 ${isRecording ? '' : 'text-sky-600'}`}>
          {isRecording ? '⏹' : '🎤'}
        </span>
      </button>
      <p className="text-sm text-gray-500">
        {isProcessing
          ? 'Đang xử lý...'
          : isRecording
          ? 'Nhấn để dừng'
          : 'Nhấn để nói'}
      </p>
    </div>
  );
}
