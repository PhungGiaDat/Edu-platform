/**
 * ColorLearnGame - Color learning game with pronunciation
 * Tap a color to hear its name pronounced
 */
import React, { useState } from 'react';
import { ClayCard } from '@/shared/components/clay/ClayCard';
import { Button } from '@/shared/components/ui/Button';
import { useSpeech } from '@/hooks/useSpeech';
import { colors, shadows } from '@/design-tokens/claymorphic';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ColorItem {
  id: string;
  name: string;
  nameVi: string;
  hex: string;
  tapped: boolean;
}

type GameState = 'READY' | 'PLAYING' | 'SUCCESS';

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_COLORS: Omit<ColorItem, 'tapped'>[] = [
  { id: '1', name: 'Red', nameVi: 'Đỏ', hex: '#EF4444' },
  { id: '2', name: 'Blue', nameVi: 'Xanh dương', hex: '#3B82F6' },
  { id: '3', name: 'Green', nameVi: 'Xanh lá', hex: '#22C55E' },
  { id: '4', name: 'Yellow', nameVi: 'Vàng', hex: '#EAB308' },
  { id: '5', name: 'Orange', nameVi: 'Cam', hex: '#F97316' },
  { id: '6', name: 'Purple', nameVi: 'Tím', hex: '#A855F7' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const VolumeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  .color-learn {
    font-family: 'Nunito', system-ui, sans-serif;
    min-height: 100vh;
    background: ${colors.backgroundBase};
    color: ${colors.deepSlate};
  }

  .cl-header {
    padding: 20px 20px 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cl-back-btn {
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

  .cl-back-btn:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.clay};
  }

  .cl-back-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 rgba(0,0,0,0.12);
  }

  .cl-title {
    font-size: 22px;
    font-weight: 900;
    margin: 0;
    color: ${colors.deepSlate};
    flex: 1;
  }

  .cl-progress-badge {
    padding: 4px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    background: ${colors.mintGreen};
  }

  .cl-content {
    padding: 16px 20px 40px;
    max-width: 600px;
    margin: 0 auto;
  }

  .cl-ready-content {
    padding: 24px 20px;
  }

  .cl-title-center {
    font-size: 28px;
    font-weight: 900;
    text-align: center;
    margin: 0 0 16px;
    color: ${colors.deepSlate};
  }

  .cl-instructions {
    font-size: 16px;
    font-weight: 600;
    color: ${colors.mediumGray};
    margin: 0 0 12px;
    line-height: 1.5;
    text-align: center;
  }

  .cl-instructions-detail {
    font-size: 14px;
    color: ${colors.mediumGray};
    margin: 0 0 20px;
    line-height: 1.6;
    text-align: left;
    padding-left: 20px;
  }

  .cl-hint-card {
    margin-bottom: 16px;
  }

  .cl-hint-text {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.skyBlue};
    text-align: center;
  }

  .cl-color-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  }

  @media (max-width: 380px) {
    .cl-color-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
  }

  .cl-color-card {
    background: #fff;
    border-radius: 16px;
    padding: 10px;
    border: 3px solid #E5E7EB;
    box-shadow: ${shadows.claySm};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .cl-color-card:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: ${shadows.clay};
  }

  .cl-color-card:active {
    transform: translateY(1px) scale(0.98);
  }

  .cl-color-card-tapped {
    opacity: 0.85;
  }

  .cl-swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
  }

  .cl-check-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #fff;
    border-radius: 50%;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    color: ${colors.mintGreen};
  }

  .cl-speak-badge {
    position: absolute;
    background: rgba(255,255,255,0.95);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }

  .cl-color-info {
    text-align: center;
  }

  .cl-color-name {
    font-size: 16px;
    font-weight: 800;
    color: ${colors.deepSlate};
    margin: 0 0 2px;
  }

  .cl-color-name-vi {
    font-size: 12px;
    font-weight: 600;
    color: ${colors.lightGray};
    margin: 0;
  }

  .cl-success-card {
    padding: 32px;
    text-align: center;
  }

  .cl-success-emoji {
    font-size: 64px;
    margin-bottom: 12px;
  }

  .cl-success-title {
    font-size: 28px;
    font-weight: 900;
    color: ${colors.deepSlate};
    margin: 0 0 8px;
  }

  .cl-success-message {
    font-size: 16px;
    color: ${colors.mediumGray};
    margin: 0 0 20px;
  }

  .cl-action-btn {
    width: 100%;
    margin-top: 10px;
  }

  @media (prefers-reduced-motion: reduce) {
    .cl-color-card, .cl-back-btn {
      transition: none;
    }
    .cl-speak-badge {
      animation: none;
    }
    .cl-color-card:hover {
      transform: none;
    }
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────

export const ColorLearnGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('READY');
  const [colorItems, setColorItems] = useState<ColorItem[]>([]);
  const [speakingColorId, setSpeakingColorId] = useState<string | null>(null);
  const { speak, isSupported } = useSpeech({ rate: 0.85 });

  const handleStart = () => {
    setGameState('PLAYING');
    setColorItems(DEMO_COLORS.map(c => ({ ...c, tapped: false })));
  };

  const SPEECH_CLEAR_DELAY_MS = 1500;

  const handleColorPress = (color: ColorItem) => {
    // Mark as tapped using functional update so completion check sees the new state
    setColorItems(prev => {
      const next = prev.map(c => (c.id === color.id ? { ...c, tapped: true } : c));

      // Check completion against the updated state
      if (next.every(c => c.tapped) && next.length > 0) {
        setTimeout(() => setGameState('SUCCESS'), 800);
      }

      return next;
    });

    // Play pronunciation with safe cleanup in case speech throws
    if (isSupported) {
      setSpeakingColorId(color.id);
      try {
        speak(color.name, 'en-US');
      } catch {
        setSpeakingColorId(null);
      }

      // Clear speaking indicator after a delay — wrapped in try/catch for safety
      try {
        setTimeout(() => {
          setSpeakingColorId(prev => prev === color.id ? null : prev);
        }, SPEECH_CLEAR_DELAY_MS);
      } catch {
        setSpeakingColorId(null);
      }
    }
  };

  const handlePlayAgain = () => {
    setGameState('READY');
  };

  // READY State
  if (gameState === 'READY') {
    return (
      <div className="color-learn">
        <style>{styles}</style>

        <div className="cl-content">
          <div className="cl-ready-content">
            <ClayCard style={{ padding: '24px', marginBottom: '16px' }}>
              <h1 className="cl-title-center">Color Learn</h1>
              <p className="cl-instructions">
                Tap each color to learn its name! Listen to the pronunciation.
              </p>
              <ul className="cl-instructions-detail">
                <li>{DEMO_COLORS.length} colors to learn</li>
                <li>Tap to hear the color name</li>
                <li>Tap all colors to complete!</li>
              </ul>
              {!isSupported && (
                <p style={{ fontSize: '13px', color: colors.coralPink, marginBottom: '12px' }}>
                  Note: Speech synthesis not supported in this browser.
                </p>
              )}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleStart}
              >
                Start Learning
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
      <div className="color-learn">
        <style>{styles}</style>

        <div className="cl-content">
          <div className="cl-ready-content">
            <ClayCard style={{ padding: '32px', textAlign: 'center' }}>
              <div className="cl-success-emoji">🌈</div>
              <h2 className="cl-success-title">Great Job!</h2>
              <p className="cl-success-message">
                You learned all {DEMO_COLORS.length} colors!
              </p>

              <Button
                variant="primary"
                size="lg"
                className="cl-action-btn"
                onClick={() => {
                  handlePlayAgain();
                  handleStart();
                }}
              >
                Learn Again
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="cl-action-btn"
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
  const tappedCount = colorItems.filter(c => c.tapped).length;

  return (
    <div className="color-learn">
      <style>{styles}</style>

      {/* Header */}
      <header className="cl-header">
        <button
          type="button"
          className="cl-back-btn"
          onClick={() => window.history.back()}
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="cl-title">Color Learn</h1>
        <span className="cl-progress-badge">
          ✓ {tappedCount}/{DEMO_COLORS.length}
        </span>
      </header>

      {/* Content */}
      <div className="cl-content">
        {/* Hint */}
        <ClayCard className="cl-hint-card" style={{ padding: '12px 16px' }}>
          <p className="cl-hint-text">
            Tap each color to hear its name!
          </p>
        </ClayCard>

        {/* Color Grid */}
        <div className="cl-color-grid">
          {colorItems.map(color => (
            <button
              key={color.id}
              type="button"
              className={`cl-color-card ${color.tapped ? 'cl-color-card-tapped' : ''}`}
              onClick={() => handleColorPress(color)}
              style={{ width: '100%', textAlign: 'left' }}
              aria-label={`${color.name} - ${color.nameVi}`}
            >
              <div className="cl-swatch" style={{ backgroundColor: color.hex }}>
                {color.tapped && (
                  <span className="cl-check-badge">
                    <CheckIcon />
                  </span>
                )}
                {speakingColorId === color.id && (
                  <span className="cl-speak-badge">
                    <VolumeIcon />
                  </span>
                )}
              </div>
              <div className="cl-color-info">
                <p className="cl-color-name">{color.name}</p>
                <p className="cl-color-name-vi">{color.nameVi}</p>
              </div>
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

export default ColorLearnGame;
