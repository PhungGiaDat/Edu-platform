/**
 * MemoryPairsGame - Memory card matching game
 * Flip cards to find matching image-word pairs
 */
import React, { useState, useCallback } from 'react';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { colors, shadows } from '@/design-tokens/claymorphic';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Card {
  id: string;
  pairId: string;
  emoji: string;
  word: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type GameState = 'READY' | 'PLAYING' | 'SUCCESS';

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_ITEMS = [
  { pairId: 'pair-1', emoji: '🍎', word: 'Apple' },
  { pairId: 'pair-2', emoji: '📚', word: 'Book' },
  { pairId: 'pair-3', emoji: '☀️', word: 'Sun' },
  { pairId: 'pair-4', emoji: '🌳', word: 'Tree' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  .memory-game {
    font-family: 'Nunito', system-ui, sans-serif;
    min-height: 100vh;
    background: ${colors.backgroundBase};
    color: ${colors.deepSlate};
  }

  .mg-header {
    padding: 20px 20px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .mg-back-btn {
    width: 44px;
    height: 44px;
    background: #fff;
    border: none;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: ${shadows.claySm};
    color: ${colors.skyBlue};
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    flex-shrink: 0;
  }

  .mg-back-btn:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.clay};
  }

  .mg-back-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 rgba(0,0,0,0.12);
  }

  .mg-title {
    font-size: 22px;
    font-weight: 900;
    margin: 0;
    color: ${colors.deepSlate};
    flex: 1;
  }

  .mg-progress-row {
    display: flex;
    gap: 8px;
  }

  .mg-progress-badge {
    padding: 4px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
  }

  .mg-content {
    padding: 16px 20px 40px;
    max-width: 600px;
    margin: 0 auto;
  }

  .mg-ready-content {
    padding: 24px 20px;
  }

  .mg-title-center {
    font-size: 28px;
    font-weight: 900;
    text-align: center;
    margin: 0 0 16px;
    color: ${colors.deepSlate};
  }

  .mg-instructions {
    font-size: 16px;
    font-weight: 600;
    color: ${colors.mediumGray};
    margin: 0 0 12px;
    line-height: 1.5;
    text-align: center;
  }

  .mg-instructions-detail {
    font-size: 14px;
    color: ${colors.mediumGray};
    margin: 0 0 20px;
    line-height: 1.6;
    text-align: left;
    padding-left: 20px;
  }

  .mg-hint-card {
    margin-bottom: 16px;
  }

  .mg-hint-text {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.skyBlue};
    text-align: center;
  }

  .mg-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  @media (max-width: 400px) {
    .mg-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
  }

  .mg-card {
    aspect-ratio: 1;
    border-radius: 14px;
    border: 3px solid #93C5FD;
    background: ${colors.skyBlue};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    box-shadow: ${shadows.claySm};
    user-select: none;
  }

  .mg-card:hover:not(.mg-card-matched):not(:disabled) {
    transform: scale(1.05);
    box-shadow: ${shadows.clay};
  }

  .mg-card:active:not(.mg-card-matched):not(:disabled) {
    transform: scale(0.95);
  }

  .mg-card-flipped {
    background: #fff;
    border-color: ${colors.skyBlue};
  }

  .mg-card-matched {
    background: #F0FDF4;
    border-color: ${colors.mintGreen};
    opacity: 0.8;
    cursor: default;
  }

  .mg-card-disabled {
    cursor: default;
  }

  .mg-card-back {
    font-size: 32px;
  }

  .mg-card-emoji {
    font-size: 36px;
  }

  .mg-card-word {
    font-size: 11px;
    font-weight: 700;
    color: ${colors.deepSlate};
    text-align: center;
    margin-top: 4px;
  }

  .mg-match-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: ${colors.mintGreen};
    border-radius: 12px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
    color: #fff;
  }

  .mg-success-card {
    padding: 32px;
    text-align: center;
  }

  .mg-success-emoji {
    font-size: 64px;
    margin-bottom: 12px;
  }

  .mg-success-title {
    font-size: 28px;
    font-weight: 900;
    color: ${colors.deepSlate};
    margin: 0 0 8px;
  }

  .mg-success-message {
    font-size: 16px;
    color: ${colors.mediumGray};
    margin: 0 0 20px;
  }

  .mg-stats-row {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 24px;
  }

  .mg-stat-badge {
    text-align: center;
    background: ${colors.skyBlue};
    padding: 12px 20px;
    border-radius: 16px;
    box-shadow: ${shadows.claySm};
  }

  .mg-stat-value {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
  }

  .mg-stat-label {
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    margin-top: 4px;
  }

  .mg-action-btn {
    width: 100%;
    margin-top: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .mg-card, .mg-back-btn {
      transition: none;
    }
    .mg-card:hover {
      transform: none;
    }
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────

export const MemoryPairsGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [canFlip, setCanFlip] = useState(true);

  const initializeCards = useCallback(() => {
    const pairs = DEMO_ITEMS.flatMap((item, index) => [
      { id: `${index}-a`, pairId: item.pairId, emoji: item.emoji, word: item.word, isFlipped: false, isMatched: false },
      { id: `${index}-b`, pairId: item.pairId, emoji: item.emoji, word: item.word, isFlipped: false, isMatched: false },
    ]);

    // Shuffle
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    setCards(pairs);
  }, []);

  const handleStart = () => {
    setGameState('PLAYING');
    initializeCards();
    setFlippedCards([]);
    setMatchedCount(0);
    setMoves(0);
    setCanFlip(true);
  };

  const handleCardPress = (card: Card) => {
    if (!canFlip || card.isFlipped || card.isMatched || flippedCards.length >= 2) {
      return;
    }

    // Flip card
    const updatedCards = cards.map(c =>
      c.id === card.id ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);

    const newFlipped = [...flippedCards, card];
    setFlippedCards(newFlipped);

    // Check for match when 2 cards flipped
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      setCanFlip(false);

      const [first, second] = newFlipped;

      if (first.pairId === second.pairId) {
        // Match found!
        const incremented = matchedCount + 1;
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.pairId === first.pairId ? { ...c, isMatched: true } : c
            )
          );
          setMatchedCount(incremented);
          setFlippedCards([]);
          setCanFlip(true);

          if (incremented === DEMO_ITEMS.length) {
            setTimeout(() => setGameState('SUCCESS'), 600);
          }
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev =>
            prev.map(c =>
              c.id === first.id || c.id === second.id
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setFlippedCards([]);
          setCanFlip(true);
        }, 1000);
      }
    }
  };

  const handlePlayAgain = () => {
    setGameState('READY');
  };

  // READY State
  if (gameState === 'READY') {
    return (
      <div className="memory-game">
        <style>{styles}</style>

        <div className="mg-content">
          <div className="mg-ready-content">
            <ClayCard style={{ padding: '24px', marginBottom: '16px' }}>
              <h1 className="mg-title-center">Memory Pairs</h1>
              <p className="mg-instructions">
                Flip cards to find matching image-word pairs!
              </p>
              <ul className="mg-instructions-detail">
                <li>{DEMO_ITEMS.length * 2} cards to match</li>
                <li>Tap to flip cards</li>
                <li>Match all pairs to win!</li>
              </ul>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStart}
              >
                Start Game
              </Button>
            </ClayCard>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => window.history.back()}
            >
              Back to Games
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS State
  if (gameState === 'SUCCESS') {
    return (
      <div className="memory-game">
        <style>{styles}</style>

        <div className="mg-content">
          <div className="mg-ready-content">
            <ClayCard style={{ padding: '32px', textAlign: 'center' }}>
              <div className="mg-success-emoji">🎉</div>
              <h2 className="mg-success-title">Perfect Memory!</h2>
              <p className="mg-success-message">
                You matched all {DEMO_ITEMS.length} pairs!
              </p>
              <div className="mg-stats-row">
                <div className="mg-stat-badge">
                  <div className="mg-stat-value">{matchedCount}</div>
                  <div className="mg-stat-label">Pairs</div>
                </div>
                <div className="mg-stat-badge" style={{ background: colors.mintGreen }}>
                  <div className="mg-stat-value">{moves}</div>
                  <div className="mg-stat-label">Moves</div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="mg-action-btn"
                onClick={() => {
                  handlePlayAgain();
                  handleStart();
                }}
              >
                Play Again
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="mg-action-btn"
                onClick={() => window.history.back()}
              >
                Back to Games
              </Button>
            </ClayCard>
          </div>
        </div>
      </div>
    );
  }

  // PLAYING State
  return (
    <div className="memory-game">
      <style>{styles}</style>

      {/* Header */}
      <header className="mg-header">
        <button
          type="button"
          className="mg-back-btn"
          onClick={() => window.history.back()}
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="mg-title">Memory Pairs</h1>
        <div className="mg-progress-row">
          <span
            className="mg-progress-badge"
            style={{ background: colors.mintGreen }}
          >
            ✓ {matchedCount}/{DEMO_ITEMS.length}
          </span>
          <span
            className="mg-progress-badge"
            style={{ background: colors.skyBlue }}
          >
            {moves} moves
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="mg-content">
        {/* Hint */}
        <ClayCard className="mg-hint-card" style={{ padding: '12px 16px' }}>
          <p className="mg-hint-text">
            Tap cards to flip and find matching pairs!
          </p>
        </ClayCard>

        {/* Card Grid */}
        <div className="mg-grid">
          {cards.map(card => (
            <button
              key={card.id}
              type="button"
              className={`mg-card ${card.isFlipped ? 'mg-card-flipped' : ''} ${card.isMatched ? 'mg-card-matched' : ''} ${!canFlip && !card.isFlipped && !card.isMatched ? 'mg-card-disabled' : ''}`}
              onClick={() => handleCardPress(card)}
              disabled={!canFlip || card.isFlipped || card.isMatched}
              aria-label={card.isFlipped || card.isMatched ? `${card.word}` : 'Hidden card'}
            >
              {card.isFlipped || card.isMatched ? (
                <>
                  <span className="mg-card-emoji">{card.emoji}</span>
                  <span className="mg-card-word">{card.word}</span>
                </>
              ) : (
                <span className="mg-card-back">?</span>
              )}
              {card.isMatched && (
                <span className="mg-match-badge">
                  <CheckIcon />
                </span>
              )}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => window.history.back()}
        >
          Exit Game
        </Button>
      </div>
    </div>
  );
};

export default MemoryPairsGame;
