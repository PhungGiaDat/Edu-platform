/**
 * VocabularyCard.tsx
 * 
 * Claymorphic flashcard component for vocabulary learning in the Animals course.
 * Displays animal image, word, pronunciation, and supports audio playback.
 * 
 * Features:
 * - Claymorphic design with the warm orange theme
 * - Tap-to-play pronunciation with speaker icon
 * - Visual feedback on interaction
 * - Kid-friendly with large touch targets
 */

import React, { useState, useCallback } from 'react';
import { colors, shadows, radius } from '@/design-tokens/claymorphic';

interface VocabularyCardProps {
  /** The English word to display */
  word: string;
  /** Vietnamese translation */
  translation?: string;
  /** Image URL for the vocabulary item */
  imageUrl?: string;
  /** SVG asset path for the animal image */
  imageSrc?: string;
  /** Audio URL for pronunciation */
  audioUrl?: string;
  /** Simple sentence using the word */
  sentence?: string;
  /** Index for stagger animation */
  index?: number;
  /** Whether this card is in completed state */
  isCompleted?: boolean;
  /** Callback when card is tapped */
  onTap?: () => void;
  /** Callback when audio is played */
  onPlayAudio?: () => void;
}

const ANIMAL_MASCOTS: Record<string, { emoji: string; color: string }> = {
  cat: { emoji: '🐱', color: '#FF9847' },
  dog: { emoji: '🐶', color: '#78A8A8' },
  bird: { emoji: '🐦', color: '#FF607C' },
  fish: { emoji: '🐟', color: '#6BB5FF' },
  rabbit: { emoji: '🐰', color: '#A8D8A8' },
};

const getAnimalFromWord = (word: string) => {
  const lower = word.toLowerCase();
  if (lower.includes('cat')) return ANIMAL_MASCOTS.cat;
  if (lower.includes('dog')) return ANIMAL_MASCOTS.dog;
  if (lower.includes('bird')) return ANIMAL_MASCOTS.bird;
  if (lower.includes('fish')) return ANIMAL_MASCOTS.fish;
  if (lower.includes('rabbit')) return ANIMAL_MASCOTS.rabbit;
  return { emoji: '✨', color: '#FFD93D' };
};

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  translation,
  imageUrl,
  imageSrc,
  audioUrl,
  sentence,
  index = 0,
  isCompleted = false,
  onTap,
  onPlayAudio,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTapped, setIsTapped] = useState(false);

  const animal = getAnimalFromWord(word);

  const handlePlayAudio = useCallback(async () => {
    setIsPlaying(true);
    onPlayAudio?.();

    try {
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          // Fallback to speech synthesis
          speakWord(word);
        };
        await audio.play();
      } else {
        speakWord(word);
        setTimeout(() => setIsPlaying(false), 1500);
      }
    } catch {
      setIsPlaying(false);
      speakWord(word);
    }
  }, [audioUrl, word, onPlayAudio]);

  const speakWord = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.rate = 0.85;
    window.speechSynthesis.speak(utt);
  };

  const handleCardTap = () => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 600);
    onTap?.();
  };

  const imageSource = imageUrl || imageSrc || `/assets/animals/mascots/${word.toLowerCase()}.svg`;

  return (
    <article
      className="vocabulary-card"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
      onClick={handleCardTap}
    >
      <div
        className={`vocabulary-card__inner ${isTapped ? 'vocabulary-card__inner--tapped' : ''} ${isCompleted ? 'vocabulary-card__inner--completed' : ''}`}
      >
        {/* Header with animal emoji and word */}
        <div className="vocabulary-card__header" style={{ background: animal.color }}>
          <span className="vocabulary-card__emoji">{animal.emoji}</span>
          <div className="vocabulary-card__word-section">
            <h3 className="vocabulary-card__word">{word}</h3>
            {translation && (
              <p className="vocabulary-card__translation">{translation}</p>
            )}
          </div>
          {isCompleted && (
            <div className="vocabulary-card__completed-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
          )}
        </div>

        {/* Image section */}
        <div className="vocabulary-card__image-container">
          <img
            src={imageSource}
            alt={word}
            className={`vocabulary-card__image ${isPlaying ? 'vocabulary-card__image--playing' : ''}`}
          />
        </div>

        {/* Audio controls */}
        <div className="vocabulary-card__controls">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayAudio();
            }}
            className={`vocabulary-card__audio-btn ${isPlaying ? 'vocabulary-card__audio-btn--playing' : ''}`}
            aria-label={`Play pronunciation of ${word}`}
          >
            <span className="vocabulary-card__audio-icon">
              {isPlaying ? '🔊' : '🔈'}
            </span>
            <span className="vocabulary-card__audio-label">
              {isPlaying ? 'Playing...' : 'Listen'}
            </span>
          </button>
        </div>

        {/* Sentence (if provided) */}
        {sentence && (
          <div className="vocabulary-card__sentence">
            <p>{sentence}</p>
          </div>
        )}
      </div>

      <style>{`
        .vocabulary-card {
          cursor: pointer;
          animation: vocabularyCardReveal 0.5s ease-out backwards;
        }

        @keyframes vocabularyCardReveal {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .vocabulary-card__inner {
          background: ${colors.warmWhite};
          border-radius: ${radius['3xl']};
          border: 4px solid white;
          box-shadow: ${shadows.clay};
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.2s ease;
        }

        .vocabulary-card__inner:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: ${shadows.clayLg};
        }

        .vocabulary-card__inner--tapped {
          transform: scale(0.98);
        }

        .vocabulary-card__inner--completed {
          border-color: ${colors.mintGreen};
        }

        .vocabulary-card__header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          position: relative;
        }

        .vocabulary-card__emoji {
          font-size: 2.5rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }

        .vocabulary-card__word-section {
          flex: 1;
        }

        .vocabulary-card__word {
          font-size: 1.75rem;
          font-weight: 900;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.15);
          text-transform: capitalize;
          margin: 0;
        }

        .vocabulary-card__translation {
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          margin: 4px 0 0 0;
        }

        .vocabulary-card__completed-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 36px;
          height: 36px;
          background: ${colors.mintGreen};
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .vocabulary-card__completed-badge svg {
          width: 20px;
          height: 20px;
          color: white;
        }

        .vocabulary-card__image-container {
          padding: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 160px;
        }

        .vocabulary-card__image {
          max-width: 100%;
          max-height: 150px;
          object-fit: contain;
          border-radius: ${radius.xl};
          transition: transform 0.3s ease;
        }

        .vocabulary-card__image--playing {
          animation: vocabularyCardBounce 0.6s ease infinite;
        }

        @keyframes vocabularyCardBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .vocabulary-card__controls {
          padding: 0 16px 16px;
          display: flex;
          justify-content: center;
        }

        .vocabulary-card__audio-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: ${colors.skyBlue};
          border: 3px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clayBlue};
          cursor: pointer;
          transition: all 0.15s ease;
          font-weight: 700;
          font-size: 1rem;
          color: white;
        }

        .vocabulary-card__audio-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 0 ${colors.skyBlueDark}, 0 4px 16px rgba(0,0,0,0.1);
        }

        .vocabulary-card__audio-btn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 ${colors.skyBlueDark};
        }

        .vocabulary-card__audio-btn--playing {
          background: ${colors.sunshineYellow};
          box-shadow: 0 6px 0 ${colors.sunshineYellowDark};
          animation: audioBtnPulse 0.5s ease infinite;
        }

        @keyframes audioBtnPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .vocabulary-card__audio-icon {
          font-size: 1.25rem;
        }

        .vocabulary-card__audio-label {
          font-size: 0.9rem;
        }

        .vocabulary-card__sentence {
          padding: 12px 16px 16px;
        }

        .vocabulary-card__sentence p {
          background: rgba(0,0,0,0.03);
          border-radius: ${radius.lg};
          padding: 12px 16px;
          margin: 0;
          font-size: 0.95rem;
          color: ${colors.mediumGray};
          font-style: italic;
          text-align: center;
        }
      `}</style>
    </article>
  );
};

export default VocabularyCard;
