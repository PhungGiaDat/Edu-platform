/**
 * GamesPage - Entry point for all educational games
 * Claymorphic vibrant design adapted from mobile/rn patterns
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ClayCard } from '@/components/clay/ClayCard';
import { colors, shadows } from '@/design-tokens/claymorphic';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const TargetIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const BrainIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const PaletteIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="1.5" />
    <circle cx="17.5" cy="10.5" r="1.5" />
    <circle cx="8.5" cy="7.5" r="1.5" />
    <circle cx="6.5" cy="12.5" r="1.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type GameId = 'drag-match' | 'memory-pairs' | 'color-learn';

interface GameItem {
  id: GameId;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  icon: React.ReactNode;
  color: string;
  shadowColor: string;
  route: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const GAMES: GameItem[] = [
  {
    id: 'drag-match',
    title: 'Drag & Match',
    titleVi: 'Nối từ',
    description: 'Match English words with Vietnamese meanings',
    descriptionVi: 'Nối từ tiếng Anh với nghĩa tiếng Việt',
    icon: <TargetIcon />,
    color: colors.skyBlue,
    shadowColor: colors.skyBlueDark,
    route: '/games/drag-match',
  },
  {
    id: 'memory-pairs',
    title: 'Memory Pairs',
    titleVi: 'Trí nhớ',
    description: 'Find matching image-word pairs by memory',
    descriptionVi: 'Tìm các cặp hình ảnh-từ bằng trí nhớ',
    icon: <BrainIcon />,
    color: colors.mintGreen,
    shadowColor: colors.mintGreenDark,
    route: '/games/memory-pairs',
  },
  {
    id: 'color-learn',
    title: 'Color Learn',
    titleVi: 'Học màu',
    description: 'Learn color names with pronunciation',
    descriptionVi: 'Học tên màu có phát âm',
    icon: <PaletteIcon />,
    color: colors.sunshineYellow,
    shadowColor: colors.sunshineYellowDark,
    route: '/games/color-learn',
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');

  .games-page {
    font-family: 'Nunito', system-ui, sans-serif;
    min-height: 100vh;
    background: ${colors.backgroundBase};
    color: ${colors.deepSlate};
  }

  .games-header {
    padding: 24px 24px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .games-back-btn {
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

  .games-back-btn:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.clay};
  }

  .games-back-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 rgba(0,0,0,0.12);
  }

  .games-title {
    font-size: 26px;
    font-weight: 900;
    margin: 0;
    color: ${colors.deepSlate};
    flex: 1;
  }

  .games-content {
    padding: 16px 24px 40px;
    max-width: 600px;
    margin: 0 auto;
  }

  .games-intro {
    text-align: center;
    margin-bottom: 24px;
  }

  .games-intro-text {
    font-size: 16px;
    font-weight: 700;
    color: ${colors.skyBlue};
  }

  .game-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
  }

  .game-card:hover {
    transform: translateY(-4px) scale(1.01);
  }

  .game-card:active {
    transform: translateY(2px) scale(0.99);
  }

  .game-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
  }

  .game-info {
    flex: 1;
    min-width: 0;
  }

  .game-card-title {
    font-size: 20px;
    font-weight: 900;
    margin: 0 0 4px;
    color: ${colors.deepSlate};
  }

  .game-card-desc {
    font-size: 14px;
    font-weight: 600;
    color: ${colors.mediumGray};
    margin: 0;
    line-height: 1.4;
  }

  .game-arrow {
    color: ${colors.lightGray};
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  .game-card:hover .game-arrow {
    transform: translateX(4px);
  }

  .games-footer {
    margin-top: 32px;
    text-align: center;
  }

  .games-footer-text {
    font-size: 14px;
    font-weight: 700;
    color: ${colors.lightGray};
  }

  @media (max-width: 480px) {
    .games-header {
      padding: 16px 16px 12px;
    }
    .games-title {
      font-size: 22px;
    }
    .games-content {
      padding: 12px 16px 32px;
    }
    .game-card {
      padding: 16px;
      gap: 14px;
    }
    .game-icon {
      width: 52px;
      height: 52px;
    }
    .game-card-title {
      font-size: 18px;
    }
    .game-card-desc {
      font-size: 13px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .game-card, .games-back-btn {
      transition: none;
    }
    .game-card:hover, .game-card:hover .game-arrow {
      transform: none;
    }
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────

export const GamesPage: React.FC = () => {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="games-page">
      <style>{styles}</style>

      {/* Header */}
      <header className="games-header">
        <button
          type="button"
          className="games-back-btn"
          onClick={handleBack}
          aria-label="Go back"
        >
          <BackIcon />
        </button>
        <h1 className="games-title">Trò chơi học tiếng Anh</h1>
      </header>

      {/* Content */}
      <div className="games-content">
        {/* Intro */}
        <div className="games-intro">
          <ClayCard style={{ padding: '16px 20px' }}>
            <p className="games-intro-text">
              Play games to practice English!
            </p>
          </ClayCard>
        </div>

        {/* Game Cards */}
        {GAMES.map(game => (
          <Link
            key={game.id}
            to={game.route}
            className="game-card clay-card"
            style={{
              background: game.color,
              boxShadow: `0 8px 0 ${game.shadowColor}, 0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.7)`,
              textDecoration: 'none',
              borderRadius: '20px',
            }}
          >
            <div
              className="game-icon"
              style={{
                background: `${game.shadowColor}40`,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.4)`,
              }}
            >
              {game.icon}
            </div>
            <div className="game-info">
              <h2 className="game-card-title">{game.title}</h2>
              <p className="game-card-desc">{game.descriptionVi}</p>
            </div>
            <div className="game-arrow">
              <ArrowRightIcon />
            </div>
          </Link>
        ))}

        {/* Footer */}
        <div className="games-footer">
          <p className="games-footer-text">More games coming soon!</p>
        </div>
      </div>
    </div>
  );
};

export default GamesPage;
