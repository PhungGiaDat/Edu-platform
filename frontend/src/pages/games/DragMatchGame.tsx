/**
 * DragMatchGame - Word-to-definition matching game
 * Tap English word, then tap Vietnamese meaning to match
 */
import React, { useState, useEffect } from 'react';
import { ClayCard } from '@/components/clay/ClayCard';
import { Button } from '@/components/ui/Button';
import { colors, shadows } from '@/design-tokens/claymorphic';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WordPair {
  id: string;
  word: string;
  emoji: string;
  definition: string;
  definitionVi: string;
}

type GameState = 'READY' | 'PLAYING' | 'SUCCESS';

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_PAIRS: WordPair[] = [
  { id: '1', word: 'Apple', emoji: '🍎', definition: 'Apple', definitionVi: 'Táo' },
  { id: '2', word: 'Book', emoji: '📚', definition: 'Book', definitionVi: 'Sách' },
  { id: '3', word: 'Sun', emoji: '☀️', definition: 'Sun', definitionVi: 'Mặt trời' },
  { id: '4', word: 'Tree', emoji: '🌳', definition: 'Tree', definitionVi: 'Cây' },
  { id: '5', word: 'Water', emoji: '💧', definition: 'Water', definitionVi: 'Nước' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  .drag-match {
    font-family: 'Nunito', system-ui, sans-serif;
    min-height: 100vh;
    background: ${colors.backgroundBase};
    color: ${colors.deepSlate};
  }

  .dm-header {
    padding: 20px 20px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dm-back-btn {
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

  .dm-back-btn:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.clay};
  }

  .dm-back-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 rgba(0,0,0,0.12);
  }

  .dm-title {
    font-size: 22px;
    font-weight: 900;
    margin: 0;
    color: ${colors.deepSlate};
    flex: 1;
  }

  .dm-progress-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dm-progress-badge {
    padding: 4px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
  }

  .dm-content {
    padding: 16px 20px 40px;
    max-width: 700px;
    margin: 0 auto;
  }

  .dm-ready-content {
    padding: 24px 20px;
  }

  .dm-title-center {
    font-size: 28px;
    font-weight: 900;
    text-align: center;
    margin: 0 0 16px;
    color: ${colors.deepSlate};
  }

  .dm-instructions {
    font-size: 16px;
    font-weight: 600;
    color: ${colors.mediumGray};
    margin: 0 0 12px;
    line-height: 1.5;
    text-align: center;
  }

  .dm-instructions-detail {
    font-size: 14px;
    color: ${colors.mediumGray};
    margin: 0 0 20px;
    line-height: 1.6;
  }

  .dm-hint-card {
    margin-bottom: 16px;
  }

  .dm-hint-text {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.skyBlue};
    text-align: center;
  }

  .dm-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 500px) {
    .dm-columns {
      grid-template-columns: 1fr;
    }
  }

  .dm-column-title {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.deepSlate};
    margin: 0 0 10px;
    padding-left: 4px;
  }

  .dm-word-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    background: #fff;
    border-radius: 14px;
    border: 3px solid ${colors.skyBlue};
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .dm-word-card:hover:not(.dm-word-matched):not(:disabled) {
    border-color: ${colors.mintGreen};
    background: #F0FDF4;
  }

  .dm-word-card-selected {
    border-color: ${colors.mintGreen} !important;
    background: #F0FDF4 !important;
    transform: scale(1.02);
  }

  .dm-word-card-matched {
    opacity: 0.5;
    border-color: ${colors.coralPink};
    background: #FFF1F2;
    cursor: default;
  }

  .dm-emoji {
    font-size: 28px;
    flex-shrink: 0;
  }

  .dm-word-text {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.deepSlate};
    flex: 1;
  }

  .dm-word-matched-text {
    color: ${colors.lightGray};
  }

  .dm-check {
    font-size: 20px;
    color: ${colors.mintGreen};
  }

  .dm-def-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: #fff;
    border-radius: 14px;
    border: 3px solid #E5E7EB;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .dm-def-card:hover:not(.dm-def-matched):not(:disabled) {
    border-color: ${colors.coralPink};
    background: #FEF3C7;
  }

  .dm-def-card-active {
    border-color: ${colors.coralPink} !important;
    background: #FEF3C7 !important;
  }

  .dm-def-card-matched {
    opacity: 0.5;
    border-color: ${colors.mintGreen};
    background: #F0FDF4;
    cursor: default;
  }

  .dm-def-text {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.deepSlate};
  }

  .dm-def-matched-text {
    color: ${colors.lightGray};
  }

  .dm-success-content {
    padding: 24px 20px;
    text-align: center;
  }

  .dm-success-card {
    padding: 32px;
    text-align: center;
  }

  .dm-success-emoji {
    font-size: 64px;
    margin-bottom: 12px;
  }

  .dm-success-title {
    font-size: 28px;
    font-weight: 900;
    color: ${colors.deepSlate};
    margin: 0 0 8px;
  }

  .dm-success-message {
    font-size: 16px;
    color: ${colors.mediumGray};
    margin: 0 0 20px;
  }

  .dm-stats-row {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 24px;
  }

  .dm-stat-badge {
    text-align: center;
    background: ${colors.skyBlue};
    padding: 12px 20px;
    border-radius: 16px;
    box-shadow: ${shadows.claySm};
  }

  .dm-stat-value {
    font-size: 28px;
    font-weight: 900;
    color: #fff;
  }

  .dm-stat-label {
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    margin-top: 4px;
  }

  .dm-action-btn {
    width: 100%;
    margin-top: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .dm-word-card, .dm-def-card, .dm-back-btn {
      transition: none;
    }
    .dm-word-card-selected {
      transform: none;
    }
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────

export const DragMatchGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [shuffledDefs, setShuffledDefs] = useState<WordPair[]>([]);
  const [shakeCard, setShakeCard] = useState<string | null>(null);

  // Shuffle definitions on mount
  useEffect(() => {
    setShuffledDefs([...DEMO_PAIRS].sort(() => Math.random() - 0.5));
  }, []);

  const handleStart = () => {
    setGameState('PLAYING');
    setMatchedPairs([]);
    setIncorrectAttempts(0);
    setSelectedWord(null);
    setShuffledDefs([...DEMO_PAIRS].sort(() => Math.random() - 0.5));
  };

  const handleWordPress = (id: string) => {
    if (matchedPairs.includes(id)) return;

    if (selectedWord === id) {
      setSelectedWord(null);
    } else {
      setSelectedWord(id);
    }
  };

  const handleDefPress = (defId: string) => {
    if (!selectedWord || matchedPairs.includes(defId)) return;

    if (selectedWord === defId) {
      // Correct match
      setMatchedPairs(prev => [...prev, defId]);
      setSelectedWord(null);

      if (matchedPairs.length + 1 === DEMO_PAIRS.length) {
        setTimeout(() => setGameState('SUCCESS'), 600);
      }
    } else {
      // Incorrect match
      setIncorrectAttempts(prev => prev + 1);
      setSelectedWord(null);
      setShakeCard(defId);
      setTimeout(() => setShakeCard(null), 400);
    }
  };

  const handlePlayAgain = () => {
    setGameState('READY');
  };

  // READY State
  if (gameState === 'READY') {
    return (
      <div className="drag-match">
        <style>{styles}</style>

        <div className="dm-content">
          <div className="dm-ready-content">
            <ClayCard style={{ padding: '24px', marginBottom: '16px' }}>
              <h1 className="dm-title-center">Target Match</h1>
              <p className="dm-instructions">
                Tap an English word, then tap its Vietnamese meaning to make a match!
              </p>
              <ul className="dm-instructions-detail" style={{ textAlign: 'left', paddingLeft: '20px' }}>
                <li>{DEMO_PAIRS.length} word pairs to match</li>
                <li>Tap to select, tap again to match</li>
                <li>Complete all matches to win!</li>
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
      <div className="drag-match">
        <style>{styles}</style>

        <div className="dm-content">
          <div className="dm-ready-content">
            <ClayCard style={{ padding: '32px', textAlign: 'center' }}>
              <div className="dm-success-emoji">🎉</div>
              <h2 className="dm-success-title">Amazing!</h2>
              <p className="dm-success-message">
                You matched all {DEMO_PAIRS.length} pairs!
              </p>
              <div className="dm-stats-row">
                <div className="dm-stat-badge">
                  <div className="dm-stat-value">{matchedPairs.length}</div>
                  <div className="dm-stat-label">Correct</div>
                </div>
                <div className="dm-stat-badge" style={{ background: colors.coralPink }}>
                  <div className="dm-stat-value">{incorrectAttempts}</div>
                  <div className="dm-stat-label">Tries</div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="dm-action-btn"
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
                className="dm-action-btn"
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
    <div className="drag-match">
      <style>{styles}</style>

      {/* Header */}
      <header className="dm-header">
        <button
          type="button"
          className="dm-back-btn"
          onClick={() => window.history.back()}
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="dm-title">Target Match</h1>
        <div className="dm-progress-row">
          <span
            className="dm-progress-badge"
            style={{ background: colors.mintGreen }}
          >
            ✓ {matchedPairs.length}/{DEMO_PAIRS.length}
          </span>
          {incorrectAttempts > 0 && (
            <span
              className="dm-progress-badge"
              style={{ background: colors.coralPink }}
            >
              ✗ {incorrectAttempts}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="dm-content">
        {/* Hint */}
        <ClayCard className="dm-hint-card" style={{ padding: '12px 16px' }}>
          <p className="dm-hint-text">
            {selectedWord
              ? 'Now tap the matching definition!'
              : 'Tap an English word to start'}
          </p>
        </ClayCard>

        {/* Columns */}
        <div className="dm-columns">
          {/* Words Column */}
          <div>
            <h3 className="dm-column-title">English</h3>
            {DEMO_PAIRS.map(pair => {
              const isMatched = matchedPairs.includes(pair.id);
              const isSelected = selectedWord === pair.id;

              return (
                <button
                  key={pair.id}
                  type="button"
                  className={`dm-word-card ${isSelected ? 'dm-word-card-selected' : ''} ${isMatched ? 'dm-word-card-matched' : ''}`}
                  onClick={() => handleWordPress(pair.id)}
                  disabled={isMatched}
                  style={{ width: '100%', textAlign: 'left' }}
                >
                  <span className="dm-emoji">{pair.emoji}</span>
                  <span className={`dm-word-text ${isMatched ? 'dm-word-matched-text' : ''}`}>
                    {pair.word}
                  </span>
                  {isMatched && <span className="dm-check"><CheckIcon /></span>}
                </button>
              );
            })}
          </div>

          {/* Definitions Column */}
          <div>
            <h3 className="dm-column-title">Tiếng Việt</h3>
            {shuffledDefs.map(pair => {
              const isMatched = matchedPairs.includes(pair.id);
              const canSelect = selectedWord !== null && !isMatched;

              return (
                <button
                  key={pair.id}
                  type="button"
                  className={`dm-def-card ${canSelect ? 'dm-def-card-active' : ''} ${isMatched ? 'dm-def-card-matched' : ''} ${shakeCard === pair.id ? 'shake' : ''}`}
                  onClick={() => handleDefPress(pair.id)}
                  disabled={!canSelect}
                  style={{
                    width: '100%',
                    textAlign: 'left' as const,
                    animation: shakeCard === pair.id ? 'shake 0.4s ease' : undefined,
                  }}
                >
                  <span className={`dm-def-text ${isMatched ? 'dm-def-matched-text' : ''}`}>
                    {pair.definitionVi}
                  </span>
                  {isMatched && <span className="dm-check"><CheckIcon /></span>}
                </button>
              );
            })}
          </div>
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

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
};

export default DragMatchGame;
