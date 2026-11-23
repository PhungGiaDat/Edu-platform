/**
 * QuizQuestion.tsx
 * 
 * Claymorphic quiz question component for the Animals course.
 * Supports image-based, sound-based, and word-based choices.
 * 
 * Features:
 * - Claymorphic design with colorful option cards
 * - Audio playback for sound-based questions
 * - Visual feedback on selection (correct/incorrect)
 * - Kid-friendly with large touch targets
 */

import React, { useState, useCallback } from 'react';
import { colors, shadows, radius } from '@/design-tokens/claymorphic';

export type QuizQuestionType = 'image_choice' | 'sound_choice' | 'word_choice';

interface QuizOption {
  optionId: string;
  label: string;
  imageUrl?: string;
  audioUrl?: string;
}

interface QuizQuestionProps {
  /** Question ID */
  questionId: string;
  /** Question type */
  type: QuizQuestionType;
  /** Vietnamese prompt text */
  promptVi: string;
  /** English audio text */
  questionAudioText?: string;
  /** Question number for display */
  questionNumber: number;
  /** Total questions */
  totalQuestions: number;
  /** Available options */
  options: QuizOption[];
  /** Currently selected answer */
  selectedAnswer?: string;
  /** Whether answer is correct (for feedback) */
  isCorrect?: boolean;
  /** Whether answer has been submitted */
  isSubmitted?: boolean;
  /** Callback when answer is selected */
  onAnswer: (questionId: string, optionId: string) => void;
  /** Callback when audio is played */
  onPlayAudio?: () => void;
}

const OPTION_COLORS = [
  { bg: '#FF9847', shadow: '#E07830', name: 'orange' },
  { bg: '#78A8A8', shadow: '#5C8080', name: 'teal' },
  { bg: '#FF607C', shadow: '#D04060', name: 'pink' },
  { bg: '#FFD93D', shadow: '#E5B800', name: 'yellow' },
];

export const QuizQuestion: React.FC<QuizQuestionProps> = ({
  questionId,
  type,
  promptVi,
  questionAudioText,
  questionNumber,
  totalQuestions,
  options,
  selectedAnswer,
  isCorrect,
  isSubmitted = false,
  onAnswer,
  onPlayAudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = useCallback(async () => {
    setIsPlaying(true);
    onPlayAudio?.();

    try {
      if (questionAudioText) {
        // Use speech synthesis as fallback
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utt = new SpeechSynthesisUtterance(questionAudioText);
          utt.lang = 'en-US';
          utt.rate = 0.85;
          utt.onend = () => setIsPlaying(false);
          utt.onerror = () => setIsPlaying(false);
          window.speechSynthesis.speak(utt);
        } else {
          setTimeout(() => setIsPlaying(false), 1000);
        }
      }
    } catch {
      setIsPlaying(false);
    }
  }, [questionAudioText, onPlayAudio]);

  const getOptionStyles = (option: QuizOption, index: number) => {
    const colorSet = OPTION_COLORS[index % OPTION_COLORS.length];
    const isSelected = selectedAnswer === option.optionId;
    const isThisCorrect = isSubmitted && isCorrect && isSelected;
    const isThisWrong = isSubmitted && !isCorrect && isSelected;

    if (isThisCorrect) {
      return {
        background: colors.mintGreen,
        borderColor: '#7DC760',
        shadow: `0 6px 0 #7DC760`,
      };
    }
    if (isThisWrong) {
      return {
        background: '#FFE7E3',
        borderColor: '#FF607C',
        shadow: `0 6px 0 #FF607C`,
      };
    }
    if (isSelected) {
      return {
        background: colorSet.bg,
        borderColor: colorSet.shadow,
        shadow: `0 6px 0 ${colorSet.shadow}`,
      };
    }
    return {
      background: colors.warmWhite,
      borderColor: '#E2E8F0',
      shadow: `0 4px 0 rgba(148,163,184,0.15)`,
    };
  };

  return (
    <div className="quiz-question">
      {/* Progress indicator */}
      <div className="quiz-question__progress">
        <div className="quiz-question__progress-bar">
          <div
            className="quiz-question__progress-fill"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
        <span className="quiz-question__progress-text">
          {questionNumber} / {totalQuestions}
        </span>
      </div>

      {/* Question card */}
      <div className="quiz-question__card">
        <div className="quiz-question__prompt-section">
          {/* Type badge */}
          <div className="quiz-question__type-badge">
            {type === 'image_choice' && '🖼️ Choose Image'}
            {type === 'sound_choice' && '🔊 Listen & Choose'}
            {type === 'word_choice' && '📝 Choose Word'}
          </div>

          {/* Question prompt */}
          <h2 className="quiz-question__prompt">{promptVi}</h2>

          {/* Audio button for sound questions */}
          {type === 'sound_choice' && questionAudioText && (
            <button
              type="button"
              onClick={handlePlayAudio}
              className={`quiz-question__audio-btn ${isPlaying ? 'quiz-question__audio-btn--playing' : ''}`}
            >
              <span className="quiz-question__audio-icon">
                {isPlaying ? '🔊' : '🔈'}
              </span>
              <span>{isPlaying ? 'Playing...' : 'Listen'}</span>
            </button>
          )}
        </div>

        {/* Options grid */}
        <div className={`quiz-question__options quiz-question__options--${type}`}>
          {options.map((option, index) => {
            const styles = getOptionStyles(option, index);
            const isSelected = selectedAnswer === option.optionId;
            const isThisCorrect = isSubmitted && isCorrect && isSelected;
            const isThisWrong = isSubmitted && !isCorrect && isSelected;

            return (
              <button
                key={option.optionId}
                type="button"
                onClick={() => !isSubmitted && onAnswer(questionId, option.optionId)}
                disabled={isSubmitted}
                className={`quiz-question__option ${isSelected ? 'quiz-question__option--selected' : ''} ${isThisCorrect ? 'quiz-question__option--correct' : ''} ${isThisWrong ? 'quiz-question__option--wrong' : ''}`}
                style={{
                  background: styles.background,
                  borderColor: styles.borderColor,
                  boxShadow: styles.shadow,
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Image for image choices */}
                {type === 'image_choice' && option.imageUrl && (
                  <div className="quiz-question__option-image-container">
                    <img
                      src={option.imageUrl}
                      alt={option.label}
                      className="quiz-question__option-image"
                    />
                  </div>
                )}

                {/* Audio indicator for sound choices */}
                {type === 'sound_choice' && (
                  <div className="quiz-question__option-sound">
                    <span className="quiz-question__option-sound-icon">🔊</span>
                  </div>
                )}

                {/* Label */}
                <span className="quiz-question__option-label">{option.label}</span>

                {/* Feedback icons */}
                {isThisCorrect && (
                  <span className="quiz-question__option-feedback quiz-question__option-feedback--correct">
                    ✓
                  </span>
                )}
                {isThisWrong && (
                  <span className="quiz-question__option-feedback quiz-question__option-feedback--wrong">
                    ✗
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback message */}
        {isSubmitted && (
          <div className={`quiz-question__feedback ${isCorrect ? 'quiz-question__feedback--correct' : 'quiz-question__feedback--wrong'}`}>
            <span className="quiz-question__feedback-icon">
              {isCorrect ? '🎉' : '💪'}
            </span>
            <span className="quiz-question__feedback-text">
              {isCorrect ? 'Correct! Great job!' : 'Try again next time!'}
            </span>
          </div>
        )}
      </div>

      <style>{`
        .quiz-question {
          animation: quizQuestionFadeIn 0.4s ease-out;
        }

        @keyframes quizQuestionFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quiz-question__progress {
          margin-bottom: 20px;
        }

        .quiz-question__progress-bar {
          height: 8px;
          background: rgba(0,0,0,0.08);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .quiz-question__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${colors.skyBlue}, ${colors.mintGreen});
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .quiz-question__progress-text {
          font-size: 0.875rem;
          font-weight: 700;
          color: ${colors.lightGray};
        }

        .quiz-question__card {
          background: ${colors.warmWhite};
          border-radius: ${radius['3xl']};
          border: 4px solid white;
          box-shadow: ${shadows.clay};
          padding: 24px;
        }

        .quiz-question__prompt-section {
          text-align: center;
          margin-bottom: 24px;
        }

        .quiz-question__type-badge {
          display: inline-block;
          padding: 8px 16px;
          background: ${colors.skyBlue};
          color: white;
          border-radius: ${radius.full};
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }

        .quiz-question__prompt {
          font-size: 1.5rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          margin: 0;
          line-height: 1.3;
        }

        .quiz-question__audio-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 24px;
          background: ${colors.skyBlue};
          border: 3px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clayBlue};
          cursor: pointer;
          font-weight: 700;
          font-size: 1rem;
          color: white;
          transition: all 0.15s ease;
        }

        .quiz-question__audio-btn:hover {
          transform: translateY(-2px);
        }

        .quiz-question__audio-btn--playing {
          background: ${colors.sunshineYellow};
          box-shadow: 0 6px 0 ${colors.sunshineYellowDark};
          animation: audioPlayingPulse 0.5s ease infinite;
        }

        @keyframes audioPlayingPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .quiz-question__audio-icon {
          font-size: 1.25rem;
        }

        .quiz-question__options {
          display: grid;
          gap: 16px;
        }

        .quiz-question__options--image_choice {
          grid-template-columns: repeat(2, 1fr);
        }

        .quiz-question__options--sound_choice {
          grid-template-columns: repeat(2, 1fr);
        }

        .quiz-question__options--word_choice {
          grid-template-columns: repeat(2, 1fr);
        }

        .quiz-question__option {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          border: 4px solid;
          border-radius: ${radius['2xl']};
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          min-height: 100px;
          animation: optionReveal 0.4s ease-out backwards;
        }

        @keyframes optionReveal {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .quiz-question__option:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.02);
        }

        .quiz-question__option:active:not(:disabled) {
          transform: translateY(2px);
        }

        .quiz-question__option--selected {
          transform: scale(1.02);
        }

        .quiz-question__option--correct {
          animation: correctPulse 0.5s ease;
        }

        @keyframes correctPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .quiz-question__option--wrong {
          animation: wrongShake 0.4s ease;
        }

        @keyframes wrongShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .quiz-question__option-image-container {
          margin-bottom: 8px;
        }

        .quiz-question__option-image {
          width: 80px;
          height: 80px;
          object-fit: contain;
          border-radius: ${radius.lg};
        }

        .quiz-question__option-sound {
          margin-bottom: 8px;
        }

        .quiz-question__option-sound-icon {
          font-size: 2rem;
        }

        .quiz-question__option-label {
          font-size: 1.25rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          text-transform: capitalize;
        }

        .quiz-question__option-feedback {
          position: absolute;
          top: -12px;
          right: -12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 900;
          color: white;
          border: 3px solid white;
          animation: feedbackPop 0.3s ease;
        }

        @keyframes feedbackPop {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        .quiz-question__option-feedback--correct {
          background: ${colors.mintGreen};
        }

        .quiz-question__option-feedback--wrong {
          background: ${colors.coralPink};
        }

        .quiz-question__feedback {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 20px;
          padding: 16px;
          border-radius: ${radius.xl};
          animation: feedbackSlideIn 0.4s ease;
        }

        @keyframes feedbackSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quiz-question__feedback--correct {
          background: rgba(180, 225, 151, 0.3);
          border: 3px solid ${colors.mintGreen};
        }

        .quiz-question__feedback--wrong {
          background: rgba(255, 159, 159, 0.3);
          border: 3px solid ${colors.coralPink};
        }

        .quiz-question__feedback-icon {
          font-size: 1.5rem;
        }

        .quiz-question__feedback-text {
          font-size: 1.125rem;
          font-weight: 800;
          color: ${colors.deepSlate};
        }
      `}</style>
    </div>
  );
};

export default QuizQuestion;
