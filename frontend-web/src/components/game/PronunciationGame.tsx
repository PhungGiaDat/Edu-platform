// src/components/game/PronunciationGame.tsx
// Pronunciation game component that follows the game challenge pattern
// Wraps SpeechService for Web Speech API recognition

import React, { useState, useCallback, useEffect } from 'react';
import type { GameChallenge } from '../../types';
import { SpeechService } from '../../services/SpeechService';
import { AudioService } from '../../services/AudioService';
import { HapticService } from '../../services/HapticService';
import { SoundEffectService } from '../../services/SoundEffectService';
import { getApiBase } from '../../config';

const API_BASE = getApiBase();

interface Props {
  challenge: GameChallenge;
  onAnswer: (answer: string) => void;
  showHint: boolean;
}

interface RecordingState {
  status: 'idle' | 'recording' | 'processing' | 'result';
  transcription: string | null;
  score: number | null;
  feedback: { message: string; emoji: string; stars: number } | null;
  error: string | null;
}

/**
 * PronunciationGame - Kid-friendly speech recognition game
 * 
 * Uses Web Speech API to:
 * 1. Let kids hear the target word
 * 2. Record their pronunciation
 * 3. Score accuracy with kid-friendly feedback
 */
export const PronunciationGame: React.FC<Props> = ({ challenge, onAnswer, showHint }) => {
  const [state, setState] = useState<RecordingState>({
    status: 'idle',
    transcription: null,
    score: null,
    feedback: null,
    error: null
  });
  const [attempts, setAttempts] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  // The word to pronounce is the correct_answer or extracted from question
  const targetWord = challenge.correct_answer || 
    challenge.question.replace(/[^a-zA-Z\s]/g, '').trim();

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(SpeechService.supported);
  }, []);

  // Play the word for the child to hear
  const handlePlayWord = useCallback(() => {
    HapticService.tap();
    SoundEffectService.play('tap');
    
    // Try to use the flashcard's audio URL if available
    const audioUrl = challenge.image_url?.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '.mp3');
    AudioService.playPronunciation(targetWord, 'en', audioUrl);
  }, [targetWord, challenge.image_url]);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (state.status === 'recording') {
      // Stop if already recording
      SpeechService.stopListening();
      setState(prev => ({ ...prev, status: 'idle' }));
      return;
    }

    HapticService.tap();
    SoundEffectService.play('tap');

    setState({
      status: 'recording',
      transcription: null,
      score: null,
      feedback: null,
      error: null
    });

    try {
      // Listen for 5 seconds max
      const transcription = await SpeechService.startListening('en', 5000);
      
      setState(prev => ({ ...prev, status: 'processing', transcription }));

      // Score the pronunciation
      const score = SpeechService.scorePronunciation(targetWord, transcription);
      const feedback = SpeechService.getFeedback(score);

      // Haptic + sound feedback based on score
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

      setState(prev => ({
        ...prev,
        status: 'result',
        score,
        feedback
      }));

      setAttempts(prev => prev + 1);

      // If score is good enough, auto-submit after showing feedback
      if (score >= 50) {
        setTimeout(() => {
          // Answer format: "completed" for success, or score-based
          onAnswer(score >= 70 ? 'completed' : `score_${score}`);
        }, 1500);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      HapticService.error();
      
      setState(prev => ({
        ...prev,
        status: 'idle',
        error: errorMessage.includes('Timeout') 
          ? "I didn't hear anything! Try again? 🎤" 
          : errorMessage.includes('not-allowed')
          ? "Please allow microphone access! 🎙️"
          : `Oops! ${errorMessage}`
      }));
    }
  }, [state.status, targetWord, onAnswer]);

  // Try again after getting result
  const handleTryAgain = useCallback(() => {
    HapticService.tap();
    SoundEffectService.play('tap');
    
    setState({
      status: 'idle',
      transcription: null,
      score: null,
      feedback: null,
      error: null
    });
  }, []);

  // Skip if not supported
  const handleSkip = useCallback(() => {
    HapticService.tap();
    onAnswer('skipped');
  }, [onAnswer]);

  // Browser doesn't support speech recognition
  if (!isSupported) {
    return (
      <div className="text-center p-6">
        <div className="text-6xl mb-4">🎤</div>
        <h3 className="text-xl font-bold text-purple-600 mb-2">
          Speech Not Supported
        </h3>
        <p className="text-gray-600 mb-4">
          Your browser doesn't support speech recognition.
          Try using Chrome on a computer or Android phone!
        </p>
        <button
          onClick={handleSkip}
          className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl text-white font-bold"
          style={{ minHeight: '48px' }}
        >
          Skip This Game
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div
        className="text-center p-3 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
        }}
      >
        <p className="text-base font-bold text-white">
          {challenge.question || `Say this word: "${targetWord}"`}
        </p>
      </div>

      {/* Image if available */}
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

      {/* Target Word Display */}
      <div
        className="text-center p-4 rounded-2xl mx-auto"
        style={{
          background: 'rgba(255,255,255,0.95)',
          border: '4px solid #3b82f6',
          maxWidth: '280px'
        }}
      >
        <p className="font-black text-blue-800 text-3xl mb-3">{targetWord}</p>
        
        {/* Hear It Button */}
        <button
          onClick={handlePlayWord}
          className="px-4 py-2 rounded-full text-sm font-bold text-white transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #4ade80)',
            minHeight: '44px'
          }}
        >
          🔊 Hear It
        </button>
      </div>

      {/* Hint */}
      {showHint && challenge.hint && (
        <div
          className="text-center p-2 rounded-xl mx-auto"
          style={{
            background: 'rgba(251, 191, 36, 0.2)',
            border: '2px solid #fbbf24',
            maxWidth: '280px'
          }}
        >
          <p className="text-sm text-yellow-700 font-semibold">
            💡 {challenge.hint}
          </p>
        </div>
      )}

      {/* Recording Button - Large and Kid-Friendly */}
      <div className="flex justify-center">
        <button
          onClick={handleStartRecording}
          disabled={state.status === 'processing' || state.status === 'result'}
          className="rounded-full flex flex-col items-center justify-center transition-all active:scale-95"
          style={{
            width: 100,
            height: 100,
            background: state.status === 'recording'
              ? 'linear-gradient(135deg, #ef4444, #f87171)'
              : state.status === 'result'
              ? 'linear-gradient(135deg, #9ca3af, #d1d5db)'
              : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            border: '6px solid #fff',
            boxShadow: state.status === 'recording'
              ? '0 0 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3)'
              : '0 8px 24px rgba(59,130,246,0.4)',
            animation: state.status === 'recording' ? 'pulse 1s infinite' : 'none'
          }}
        >
          <span className="text-4xl">
            {state.status === 'recording' ? '⏹️' : '🎙️'}
          </span>
          <span className="text-white font-bold text-xs mt-1">
            {state.status === 'recording' ? 'Stop' : 'Speak'}
          </span>
        </button>
      </div>

      {/* Status Text */}
      <p className="text-center font-semibold text-sm" style={{ color: '#3b82f6' }}>
        {state.status === 'idle' && '👆 Tap the microphone and say the word!'}
        {state.status === 'recording' && '🔴 Listening... Speak now!'}
        {state.status === 'processing' && '✨ Checking your pronunciation...'}
        {state.status === 'result' && state.feedback && `${state.feedback.emoji}`}
      </p>

      {/* Error Message */}
      {state.error && (
        <div
          className="p-3 rounded-xl text-center mx-auto"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '2px solid #f87171',
            maxWidth: '280px'
          }}
        >
          <p className="text-red-600 font-bold text-sm">{state.error}</p>
        </div>
      )}

      {/* Result Feedback */}
      {state.status === 'result' && state.feedback && (
        <div
          className="p-4 rounded-2xl text-center mx-auto"
          style={{
            background: state.score && state.score >= 70
              ? 'linear-gradient(135deg, #bbf7d0, #86efac)'
              : state.score && state.score >= 50
              ? 'linear-gradient(135deg, #fef08a, #fde047)'
              : 'linear-gradient(135deg, #fecaca, #fca5a5)',
            border: state.score && state.score >= 70
              ? '4px solid #22c55e'
              : state.score && state.score >= 50
              ? '4px solid #eab308'
              : '4px solid #ef4444',
            maxWidth: '300px'
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

          {/* Message */}
          <p
            className="font-black text-lg"
            style={{
              color: state.score && state.score >= 70
                ? '#15803d'
                : state.score && state.score >= 50
                ? '#a16207'
                : '#dc2626'
            }}
          >
            {state.feedback.message}
          </p>

          {/* Score */}
          <p className="text-sm font-bold text-gray-600 mt-1">
            Score: {state.score}%
          </p>

          {/* What they said */}
          {state.transcription && (
            <p className="text-xs text-gray-500 mt-2">
              You said: "{state.transcription}"
            </p>
          )}

          {/* Try Again Button (if score < 70) */}
          {state.score && state.score < 70 && (
            <button
              onClick={handleTryAgain}
              className="mt-3 px-5 py-2 rounded-full text-sm font-bold text-white transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                minHeight: '44px'
              }}
            >
              🔄 Try Again
            </button>
          )}
        </div>
      )}

      {/* Attempts counter */}
      {attempts > 0 && (
        <p className="text-center text-xs text-gray-500">
          Attempts: {attempts}
        </p>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default PronunciationGame;
