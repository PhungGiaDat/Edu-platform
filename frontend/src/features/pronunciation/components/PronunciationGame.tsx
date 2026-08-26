// src/components/game/PronunciationGame.tsx
// Pronunciation game component that follows the game challenge pattern
// Wraps SpeechService for Web Speech API recognition
// AI feedback: POST /api/v1/pronunciation/attempt + /ai-feedback

import React, { useState, useCallback, useEffect } from 'react';
import type { GameChallenge } from '@/types';
import { SpeechService } from '@/features/pronunciation/services/SpeechService';
import { AudioService } from '@/services/AudioService';
import { HapticService } from '@/services/HapticService';
import { SoundEffectService } from '@/services/SoundEffectService';
import { eventBus } from '@/runtime/EventBus';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBase } from '@/config';
import { apiClient } from '@/services/apiClient';

const API_BASE = getApiBase();

interface Props {
  challenge: GameChallenge;
  onAnswer: (answer: string) => void;
  showHint: boolean;
  /** QR ID of the current flashcard — used to log the attempt */
  flashcardQrId?: string;
}

interface AiFeedback {
  message: string;
  emoji: string;
  stars: number;
}

interface RecordingState {
  status: 'idle' | 'recording' | 'processing' | 'ai_loading' | 'result';
  transcription: string | null;
  score: number | null;
  feedback: AiFeedback | null;
  error: string | null;
}

/**
 * PronunciationGame - Kid-friendly speech recognition game
 *
 * Flow:
 * 1. Child hears the target word (🔊 Hear It)
 * 2. Child taps 🎙️ and speaks
 * 3. Web Speech API transcribes → local Levenshtein score computed
 * 4. POST /api/v1/pronunciation/attempt  → XP awarded on backend
 * 5. POST /api/v1/pronunciation/ai-feedback → Gemini returns encouraging message
 * 6. Show stars + AI message to child
 */
export const PronunciationGame: React.FC<Props> = ({
  challenge,
  onAnswer,
  showHint,
  flashcardQrId,
}) => {
  const { user, isGuest } = useAuth();
  const [state, setState] = useState<RecordingState>({
    status: 'idle',
    transcription: null,
    score: null,
    feedback: null,
    error: null,
  });
  const [attempts, setAttempts] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  // The word to pronounce
  const targetWord =
    challenge.correct_answer ||
    challenge.question.replace(/[^a-zA-Z\s]/g, '').trim();

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(SpeechService.supported);
  }, []);

  // ── Helper: POST attempt to backend ──────────────────────────────────────────
  const logAttemptToBackend = useCallback(
    async (spokenText: string, score: number) => {
      if (isGuest || !user?.id) {
        return;
      }

      try {
        await apiClient.post('/api/v1/pronunciation/attempt', {
          user_id: user.id,
          flashcard_qr_id: flashcardQrId || targetWord,
          spoken_text: spokenText,
          score,
          feedback: null,
          audio_url: null,
        });
      } catch (err) {
        console.warn('[PronunciationGame] Failed to log attempt:', err);
      }
    },
    [flashcardQrId, targetWord, isGuest, user?.id]
  );

  // ── Helper: Fetch AI feedback from backend ────────────────────────────────────
  const fetchAiFeedback = useCallback(
    async (spokenText: string, score: number): Promise<AiFeedback> => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/pronunciation/ai-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: targetWord,
            spoken_text: spokenText,
            score,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json() as AiFeedback;
      } catch (err) {
        console.warn('[PronunciationGame] AI feedback fallback:', err);
        // Static fallback matching backend logic
        if (score >= 90) return { message: 'Perfect! You are a star!', emoji: '🌟🎉', stars: 3 };
        if (score >= 70) return { message: 'Great job! Keep it up!', emoji: '⭐✨', stars: 2 };
        if (score >= 50) return { message: 'Good try! Practice makes perfect!', emoji: '👍💪', stars: 1 };
        return { message: 'Keep practicing — you can do it!', emoji: '🌈💖', stars: 1 };
      }
    },
    [targetWord]
  );

  // ── Play word audio ────────────────────────────────────────────────────────────
  const handlePlayWord = useCallback(() => {
    HapticService.tap();
    SoundEffectService.play('tap');
    const audioUrl = challenge.image_url?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '.mp3');
    AudioService.playPronunciation(targetWord, 'en', audioUrl);
  }, [targetWord, challenge.image_url]);

  // ── Start / stop recording ────────────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    if (state.status === 'recording') {
      SpeechService.stopListening();
      setState((prev) => ({ ...prev, status: 'idle' }));
      return;
    }

    HapticService.tap();
    SoundEffectService.play('tap');

    setState({
      status: 'recording',
      transcription: null,
      score: null,
      feedback: null,
      error: null,
    });

    try {
      const transcription = await SpeechService.startListening('en', 5000);

      setState((prev) => ({ ...prev, status: 'processing', transcription }));

      // Local score (fast, no network)
      const score = SpeechService.scorePronunciation(targetWord, transcription);

      // Haptic + sound based on score
      if (score >= 70) {
        HapticService.success();
        SoundEffectService.play('success');
      } else if (score >= 50) {
        HapticService.tap();
        SoundEffectService.play('tap');
      } else {
        HapticService.error();
        SoundEffectService.play('error');
      }

      // Show "AI loading" state while we hit the backend
      setState((prev) => ({ ...prev, status: 'ai_loading', score }));

      // Run backend calls in parallel
      const [aiFeedback] = await Promise.all([
        fetchAiFeedback(transcription, score),
        logAttemptToBackend(transcription, score),
      ]);

      setState((prev) => ({
        ...prev,
        status: 'result',
        score,
        feedback: aiFeedback,
        transcription,
      }));

      setAttempts((prev) => prev + 1);

      // Emit pronunciation result to EventBus (for gamification panel)
      eventBus.emit('PRONUNCIATION_RESULT' as any, {
        word: targetWord,
        score,
        feedback: aiFeedback.message,
      });

      // Auto-advance on good score
      if (score >= 50) {
        setTimeout(() => {
          onAnswer(score >= 70 ? 'completed' : `score_${score}`);
        }, 2200);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      HapticService.error();
      setState((prev) => ({
        ...prev,
        status: 'idle',
        error: msg.includes('Timeout')
          ? "I didn't hear anything! Try again? 🎤"
          : msg.includes('not-allowed')
          ? 'Please allow microphone access! 🎙️'
          : `Oops! ${msg}`,
      }));
    }
  }, [state.status, targetWord, onAnswer, fetchAiFeedback, logAttemptToBackend]);

  // ── Try again ─────────────────────────────────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    HapticService.tap();
    SoundEffectService.play('tap');
    setState({ status: 'idle', transcription: null, score: null, feedback: null, error: null });
  }, []);

  // ── Skip ──────────────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    HapticService.tap();
    onAnswer('skipped');
  }, [onAnswer]);

  // ── Browser not supported ─────────────────────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="text-center p-6">
        <div className="text-6xl mb-4">🎤</div>
        <h3 className="text-xl font-bold text-sky-700 mb-2">Speech Not Supported</h3>
        <p className="text-gray-600 mb-4">
          Your browser doesn't support speech recognition. Try Chrome on Android or desktop!
        </p>
        <button
          onClick={handleSkip}
          className="px-6 py-3 bg-gradient-to-r from-sky-400 to-orange-500 rounded-2xl text-white font-bold"
          style={{ minHeight: '48px' }}
        >
          Skip This Game
        </button>
      </div>
    );
  }

  const isProcessing =
    state.status === 'processing' || state.status === 'ai_loading' || state.status === 'result';

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div
        className="text-center p-3 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)' }}
      >
        <p className="text-base font-bold text-white">
          {challenge.question || `Say this word: "${targetWord}"`}
        </p>
      </div>

      {/* Image */}
      {challenge.image_url && (
        <div className="flex justify-center">
          <div
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{ border: '4px solid #60a5fa', maxWidth: '180px' }}
          >
            <img
              src={`${API_BASE}${challenge.image_url}`}
              alt={targetWord}
              className="w-full h-32 object-cover"
            />
          </div>
        </div>
      )}

      {/* Target Word */}
      <div
        className="text-center p-4 rounded-2xl mx-auto"
        style={{ background: 'rgba(255,255,255,0.95)', border: '4px solid #3b82f6', maxWidth: '280px' }}
      >
        <p className="font-black text-blue-800 text-3xl mb-3">{targetWord}</p>
        <button
          onClick={handlePlayWord}
          className="px-4 py-2 rounded-full text-sm font-bold text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, #22c55e, #4ade80)', minHeight: '44px' }}
        >
          🔊 Hear It
        </button>
      </div>

      {/* Hint */}
      {showHint && challenge.hint && (
        <div
          className="text-center p-2 rounded-xl mx-auto"
          style={{ background: 'rgba(251,191,36,0.2)', border: '2px solid #fbbf24', maxWidth: '280px' }}
        >
          <p className="text-sm text-yellow-700 font-semibold">💡 {challenge.hint}</p>
        </div>
      )}

      {/* Microphone Button */}
      <div className="flex justify-center">
        <button
          onClick={handleStartRecording}
          disabled={isProcessing}
          className="rounded-full flex flex-col items-center justify-center transition-all active:scale-95"
          style={{
            width: 100,
            height: 100,
            background:
              state.status === 'recording'
                ? 'linear-gradient(135deg, #ef4444, #f87171)'
                : isProcessing
                ? 'linear-gradient(135deg, #9ca3af, #d1d5db)'
                : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            border: '6px solid #fff',
            boxShadow:
              state.status === 'recording'
                ? '0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3)'
                : '0 8px 24px rgba(59,130,246,0.4)',
            animation: state.status === 'recording' ? 'pronPulse 1s infinite' : 'none',
          }}
        >
          <span className="text-4xl">
            {state.status === 'recording' ? '⏹️' : state.status === 'ai_loading' ? '🤖' : '🎙️'}
          </span>
          <span className="text-white font-bold text-xs mt-1">
            {state.status === 'recording'
              ? 'Stop'
              : state.status === 'ai_loading'
              ? 'Thinking...'
              : 'Speak'}
          </span>
        </button>
      </div>

      {/* Status Text */}
      <p className="text-center font-semibold text-sm" style={{ color: '#3b82f6' }}>
        {state.status === 'idle' && '👆 Tap the microphone and say the word!'}
        {state.status === 'recording' && '🔴 Listening... Speak now!'}
        {state.status === 'processing' && '✨ Checking your pronunciation...'}
        {state.status === 'ai_loading' && '🤖 Getting your feedback...'}
        {state.status === 'result' && state.feedback && state.feedback.emoji}
      </p>

      {/* Error */}
      {state.error && (
        <div
          className="p-3 rounded-xl text-center mx-auto"
          style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid #f87171', maxWidth: '280px' }}
        >
          <p className="text-red-600 font-bold text-sm">{state.error}</p>
        </div>
      )}

      {/* Result Feedback */}
      {state.status === 'result' && state.feedback && state.score !== null && (
        <div
          className="p-4 rounded-2xl text-center mx-auto"
          style={{
            background:
              state.score >= 70
                ? 'linear-gradient(135deg, #bbf7d0, #86efac)'
                : state.score >= 50
                ? 'linear-gradient(135deg, #fef08a, #fde047)'
                : 'linear-gradient(135deg, #fecaca, #fca5a5)',
            border: `4px solid ${state.score >= 70 ? '#22c55e' : state.score >= 50 ? '#eab308' : '#ef4444'}`,
            maxWidth: '300px',
          }}
        >
          {/* Stars */}
          <div className="mb-2">
            {Array.from({ length: state.feedback.stars }).map((_, i) => (
              <span
                key={i}
                className="text-3xl inline-block animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                ⭐
              </span>
            ))}
          </div>

          {/* Emoji */}
          <p className="text-4xl mb-2">{state.feedback.emoji}</p>

          {/* AI Message */}
          <p
            className="font-black text-lg"
            style={{
              color: state.score >= 70 ? '#15803d' : state.score >= 50 ? '#a16207' : '#dc2626',
            }}
          >
            {state.feedback.message}
          </p>

          {/* Score */}
          <p className="text-sm font-bold text-gray-600 mt-1">Score: {state.score}%</p>

          {/* What they said */}
          {state.transcription && (
            <p className="text-xs text-gray-500 mt-2">You said: "{state.transcription}"</p>
          )}

          {/* Try Again */}
          {state.score < 70 && (
            <button
              onClick={handleTryAgain}
              className="mt-3 px-5 py-2 rounded-full text-sm font-bold text-white transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #22c55e)', minHeight: '44px' }}
            >
              🔄 Try Again
            </button>
          )}
        </div>
      )}

      {/* Attempts counter */}
      {attempts > 0 && (
        <p className="text-center text-xs text-gray-500">Attempts: {attempts}</p>
      )}

      <style>{`
        @keyframes pronPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default PronunciationGame;
