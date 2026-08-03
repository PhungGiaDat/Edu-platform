/**
 * ProgressBar.tsx
 * 
 * Claymorphic progress bar component for the Animals course lesson player.
 * Shows section completion with animated progress and section indicators.
 * 
 * Features:
 * - Animated fill with gradient
 * - Section step indicators
 * - XP progress tracking
 * - Kid-friendly with playful design
 */

import React from 'react';
import { colors, shadows, radius } from '../../design-tokens/claymorphic';

interface Section {
  id: string;
  label: string;
  isActive?: boolean;
  isCompleted?: boolean;
  isLocked?: boolean;
}

interface ProgressBarProps {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Total XP available */
  totalXp?: number;
  /** XP earned so far */
  xpEarned?: number;
  /** List of sections with their states */
  sections: Section[];
  /** Currently active section index */
  activeSectionIndex?: number;
  /** Progress bar color theme */
  theme?: 'animals' | 'default';
  /** Height of the progress bar */
  height?: 'sm' | 'md' | 'lg';
}

const THEME_COLORS = {
  animals: {
    gradient: `linear-gradient(90deg, ${colors.skyBlue}, ${colors.sunshineYellow}, ${colors.mintGreen})`,
    track: '#F0F4F8',
    active: colors.sunshineYellow,
    completed: colors.mintGreen,
    locked: colors.lightGray,
  },
  default: {
    gradient: `linear-gradient(90deg, ${colors.skyBlue}, ${colors.skyBlue})`,
    track: '#F0F4F8',
    active: colors.skyBlue,
    completed: colors.mintGreen,
    locked: colors.lightGray,
  },
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  totalXp,
  xpEarned = 0,
  sections = [],
  activeSectionIndex = 0,
  theme = 'animals',
  height = 'md',
}) => {
  const themeColors = THEME_COLORS[theme];

  const heightMap = {
    sm: '6px',
    md: '12px',
    lg: '16px',
  };

  return (
    <div className="progress-bar">
      {/* XP display (if XP tracking enabled) */}
      {totalXp !== undefined && (
        <div className="progress-bar__xp-section">
          <div className="progress-bar__xp-icon">⭐</div>
          <div className="progress-bar__xp-text">
            <span className="progress-bar__xp-earned">{xpEarned}</span>
            <span className="progress-bar__xp-separator">/</span>
            <span className="progress-bar__xp-total">{totalXp}</span>
            <span className="progress-bar__xp-label">XP</span>
          </div>
        </div>
      )}

      {/* Main progress bar */}
      <div 
        className="progress-bar__track"
        style={{ height: heightMap[height] }}
      >
        <div
          className="progress-bar__fill"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: themeColors.gradient,
          }}
        >
          {/* Animated shine effect */}
          <div className="progress-bar__shine" />
        </div>
        
        {/* Milestone markers */}
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className={`progress-bar__milestone ${progress >= milestone ? 'progress-bar__milestone--passed' : ''}`}
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>

      {/* Percentage display */}
      <div className="progress-bar__percentage">
        <span className="progress-bar__percentage-value">{Math.round(progress)}%</span>
        <span className="progress-bar__percentage-label">Complete</span>
      </div>

      {/* Section indicators */}
      {sections.length > 0 && (
        <div className="progress-bar__sections">
          {sections.map((section, index) => {
            const isActive = section.isActive ?? (index === activeSectionIndex);
            const isCompleted = section.isCompleted ?? (index < activeSectionIndex);
            const isLocked = section.isLocked ?? false;

            return (
              <div
                key={section.id}
                className={`progress-bar__section ${isActive ? 'progress-bar__section--active' : ''} ${isCompleted ? 'progress-bar__section--completed' : ''} ${isLocked ? 'progress-bar__section--locked' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="progress-bar__section-dot">
                  {isCompleted ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : isLocked ? (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C9.24 2 7 4.24 7 7v3H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2h-1V7c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v3H9V7c0-1.66 1.34-3 3-3z" />
                    </svg>
                  ) : (
                    <span className="progress-bar__section-number">{index + 1}</span>
                  )}
                </div>
                <span className="progress-bar__section-label">{section.label}</span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .progress-bar {
          width: 100%;
        }

        /* XP Section */
        .progress-bar__xp-section {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .progress-bar__xp-icon {
          font-size: 1.5rem;
        }

        .progress-bar__xp-text {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .progress-bar__xp-earned {
          font-size: 1.5rem;
          font-weight: 900;
          color: ${colors.sunshineYellow};
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .progress-bar__xp-separator,
        .progress-bar__xp-total,
        .progress-bar__xp-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: ${colors.lightGray};
        }

        /* Track */
        .progress-bar__track {
          position: relative;
          width: 100%;
          background: ${themeColors.track};
          border-radius: ${radius.full};
          overflow: hidden;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        }

        /* Fill */
        .progress-bar__fill {
          position: relative;
          height: 100%;
          border-radius: ${radius.full};
          transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        /* Shine effect */
        .progress-bar__shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,0.4),
            transparent
          );
          animation: progressBarShine 2s ease-in-out infinite;
        }

        @keyframes progressBarShine {
          0% { left: -100%; }
          50%, 100% { left: 200%; }
        }

        /* Milestones */
        .progress-bar__milestone {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: white;
          border: 3px solid ${themeColors.track};
          border-radius: 50%;
          z-index: 1;
          transition: all 0.3s ease;
        }

        .progress-bar__milestone--passed {
          background: ${themeColors.completed};
          border-color: ${themeColors.completed};
        }

        /* Percentage */
        .progress-bar__percentage {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-top: 8px;
          justify-content: flex-end;
        }

        .progress-bar__percentage-value {
          font-size: 1.125rem;
          font-weight: 900;
          color: ${colors.deepSlate};
        }

        .progress-bar__percentage-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: ${colors.lightGray};
        }

        /* Section indicators */
        .progress-bar__sections {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          padding: 0 4px;
        }

        .progress-bar__section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          animation: sectionFadeIn 0.3s ease-out backwards;
        }

        @keyframes sectionFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .progress-bar__section-dot {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${themeColors.locked};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 900;
          color: ${themeColors.locked};
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .progress-bar__section--active .progress-bar__section-dot {
          background: ${themeColors.active};
          border-color: ${colors.sunshineYellowDark};
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(255, 217, 61, 0.4);
        }

        .progress-bar__section--completed .progress-bar__section-dot {
          background: ${themeColors.completed};
          border-color: ${colors.mintGreenDark};
          color: white;
        }

        .progress-bar__section--locked .progress-bar__section-dot {
          opacity: 0.5;
        }

        .progress-bar__section-dot svg {
          width: 16px;
          height: 16px;
        }

        .progress-bar__section-number {
          font-size: 0.875rem;
        }

        .progress-bar__section-label {
          font-size: 0.625rem;
          font-weight: 700;
          color: ${colors.lightGray};
          text-align: center;
          max-width: 60px;
          line-height: 1.2;
        }

        .progress-bar__section--active .progress-bar__section-label {
          color: ${colors.deepSlate};
          font-weight: 800;
        }

        .progress-bar__section--completed .progress-bar__section-label {
          color: ${colors.mintGreenDark};
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
