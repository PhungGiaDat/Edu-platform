/**
 * AnimalsLessonCard.tsx
 * 
 * Lesson card component for the Animals Adventure course.
 * Shows lesson thumbnail, title, vocabulary preview (5 emoji), and XP reward.
 */

import React from 'react';

interface AnimalsLessonCardProps {
  lessonId: string;
  title: string;
  thumbnailUrl: string;
  vocabPreview: string[];
  xpReward: number;
  isCompleted: boolean;
  isInProgress: boolean;
  onClick: () => void;
  index: number;
}

export const AnimalsLessonCard: React.FC<AnimalsLessonCardProps> = ({
  lessonId,
  title,
  thumbnailUrl,
  vocabPreview,
  xpReward,
  isCompleted,
  isInProgress,
  onClick,
  index,
}) => {
  const cardClasses = [
    'animals-lesson-card',
    isCompleted ? 'animals-lesson-card--completed' : '',
    isInProgress ? 'animals-lesson-card--in-progress' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cardClasses}
      style={{ '--card-index': index } as React.CSSProperties}
    >
      <div className="animals-lesson-card__thumbnail">
        <img 
          src={thumbnailUrl} 
          alt={title}
          className="animals-lesson-card__image"
          loading="lazy"
        />
        {isCompleted && (
          <div className="animals-lesson-card__completed-badge" aria-label="Completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        )}
        {isInProgress && (
          <div className="animals-lesson-card__in-progress-badge" aria-label="In Progress">
            <span className="animals-lesson-card__progress-dot" />
          </div>
        )}
      </div>

      <div className="animals-lesson-card__content">
        <h3 className="animals-lesson-card__title">{title}</h3>
        
        <div className="animals-lesson-card__vocab">
          <span className="animals-lesson-card__vocab-label">Words:</span>
          <div className="animals-lesson-card__vocab-emojis">
            {vocabPreview.slice(0, 5).map((emoji, i) => (
              <span key={i} className="animals-lesson-card__emoji">{emoji}</span>
            ))}
          </div>
        </div>

        <div className="animals-lesson-card__footer">
          <div className="animals-lesson-card__xp">
            <svg viewBox="0 0 24 24" fill="currentColor" className="animals-lesson-card__xp-icon">
              <path d="M13.5 2 4 14h6.7L9.5 22 20 9h-7.1L13.5 2Z" />
            </svg>
            <span>{xpReward} XP</span>
          </div>
          <span className="animals-lesson-card__arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
};
