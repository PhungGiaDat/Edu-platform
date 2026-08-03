/**
 * AnimalsHero.tsx
 * 
 * Clay-style hero component for the Animals Adventure course page.
 * Displays the course cover, title, and 5 mascot tiles (Cat, Dog, Bird, Fish, Rabbit).
 */

import React from 'react';

interface AnimalsHeroProps {
  courseTitle: string;
  courseSubtitle: string;
  ageRange: string;
  completedLessons: number;
  totalLessons: number;
  totalXp: number;
  onStartJourney: () => void;
  startLabel: string;
}

const mascots = [
  { name: 'Cat', emoji: '🐱', color: '#FF9847' },
  { name: 'Dog', emoji: '🐶', color: '#78A8A8' },
  { name: 'Bird', emoji: '🐦', color: '#FF607C' },
  { name: 'Fish', emoji: '🐟', color: '#6BB5FF' },
  { name: 'Rabbit', emoji: '🐰', color: '#A8D8A8' },
];

export const AnimalsHero: React.FC<AnimalsHeroProps> = ({
  courseTitle,
  courseSubtitle,
  ageRange,
  completedLessons,
  totalLessons,
  totalXp,
  onStartJourney,
  startLabel,
}) => {
  return (
    <header className="animals-hero">
      <div className="animals-hero__content">
        <div className="animals-hero__text">
          <span className="animals-hero__badge">{ageRange}</span>
          <h1 className="animals-hero__title">{courseTitle}</h1>
          <p className="animals-hero__subtitle">{courseSubtitle}</p>
          
          <div className="animals-hero__stats">
            <div className="animals-hero__stat">
              <span className="animals-hero__stat-value">{completedLessons}/{totalLessons}</span>
              <span className="animals-hero__stat-label">Lessons</span>
            </div>
            <div className="animals-hero__stat-divider" />
            <div className="animals-hero__stat">
              <span className="animals-hero__stat-value">{totalXp}</span>
              <span className="animals-hero__stat-label">XP</span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onStartJourney}
            className="animals-hero__cta"
          >
            {startLabel}
          </button>
        </div>

        <div className="animals-hero__mascots">
          <div className="animals-hero__mascot-cover">
            <img 
              src="/assets/animals/course-cover.svg" 
              alt={courseTitle}
              className="animals-hero__cover-image"
            />
          </div>
          <div className="animals-hero__mascot-tiles">
            {mascots.map((mascot, index) => (
              <div 
                key={mascot.name}
                className="animals-hero__mascot-tile"
                style={{ 
                  '--mascot-color': mascot.color,
                  '--mascot-index': index,
                } as React.CSSProperties}
              >
                <span className="animals-hero__mascot-emoji">{mascot.emoji}</span>
                <span className="animals-hero__mascot-name">{mascot.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="animals-hero__decoration animals-hero__decoration--1" aria-hidden="true" />
      <div className="animals-hero__decoration animals-hero__decoration--2" aria-hidden="true" />
      <div className="animals-hero__decoration animals-hero__decoration--3" aria-hidden="true" />
    </header>
  );
};
