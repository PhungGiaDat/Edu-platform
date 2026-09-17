import { useState } from 'react';

export type LearnerOverlayMode = 'collapsed' | 'compact' | 'expanded';

export type LearnerOverlayTarget = {
  targetName: string;
  word: string;
  acquiredAt: number;
  audioUrl?: string;
};

export type LearnerOverlayFeedback = {
  id: string;
  message: string;
};

type LearnerAROverlayProps = {
  activeTargets: LearnerOverlayTarget[];
  featuredTargetName?: string;
  instruction: string;
  feedback?: LearnerOverlayFeedback | null;
  initialMode?: LearnerOverlayMode;
  onSpeak: (targetName: string) => void;
};

function displayWord(word: string): string {
  return word ? `${word.slice(0, 1).toLocaleUpperCase()}${word.slice(1)}` : 'Card';
}

function activeTargetLabel(count: number): string {
  return `${count} active ${count === 1 ? 'card' : 'cards'}`;
}

type TargetCardProps = {
  target: LearnerOverlayTarget;
  featured?: boolean;
  onSpeak: (targetName: string) => void;
};

function TargetCard({ target, featured = false, onSpeak }: TargetCardProps) {
  const label = displayWord(target.word);

  return (
    <article className={`learner-ar-overlay__target${featured ? ' is-featured' : ''}`}>
      <span className="learner-ar-overlay__target-label">{label}</span>
      <button
        type="button"
        className="learner-ar-overlay__speaker"
        onClick={() => onSpeak(target.targetName)}
        aria-label={`Hear ${label}`}
      >
        Hear it
      </button>
    </article>
  );
}

export function LearnerAROverlay({
  activeTargets,
  featuredTargetName,
  instruction,
  feedback,
  initialMode = 'compact',
  onSpeak,
}: LearnerAROverlayProps) {
  const [mode, setMode] = useState<LearnerOverlayMode>(initialMode);
  const featuredTarget = activeTargets.find(target => target.targetName === featuredTargetName)
    ?? activeTargets[0];
  const targetCount = activeTargets.length;

  return (
    <aside
      className={`learner-ar-overlay learner-ar-overlay--${mode}`}
      data-testid="learner-ar-overlay"
      data-mode={mode}
      aria-label="AR learning controls"
    >
      {mode === 'collapsed' && (
        <button
          type="button"
          className="learner-ar-overlay__reopen"
          onClick={() => setMode('compact')}
          aria-label="Expand learner overlay"
          data-testid="learner-overlay-collapsed"
        >
          {targetCount > 0 ? activeTargetLabel(targetCount) : 'AR'}
        </button>
      )}

      {mode === 'compact' && (
        <section className="learner-ar-overlay__panel learner-ar-overlay__panel--compact" data-testid="learner-overlay-compact">
          <div className="learner-ar-overlay__topline">
            <span className="learner-ar-overlay__count">{activeTargetLabel(targetCount)}</span>
            <button
              type="button"
              className="learner-ar-overlay__control"
              onClick={() => setMode('collapsed')}
              aria-label="Collapse learner overlay"
            >
              Hide
            </button>
          </div>

          {featuredTarget ? (
            <TargetCard target={featuredTarget} featured onSpeak={onSpeak} />
          ) : (
            <p className="learner-ar-overlay__empty">Look for a card.</p>
          )}

          <div className="learner-ar-overlay__footer">
            <p className="learner-ar-overlay__instruction">{instruction}</p>
            <button
              type="button"
              className="learner-ar-overlay__control"
              onClick={() => setMode('expanded')}
              aria-label="Show all active cards"
            >
              Details
            </button>
          </div>

          {feedback && (
            <p
              key={feedback.id}
              className="learner-ar-overlay__feedback"
              data-feedback-id={feedback.id}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}
        </section>
      )}

      {mode === 'expanded' && (
        <section className="learner-ar-overlay__panel learner-ar-overlay__panel--expanded" data-testid="learner-overlay-expanded">
          <div className="learner-ar-overlay__topline">
            <span className="learner-ar-overlay__count">{activeTargetLabel(targetCount)}</span>
            <div className="learner-ar-overlay__controls">
              <button
                type="button"
                className="learner-ar-overlay__control"
                onClick={() => setMode('compact')}
                aria-label="Use compact learner overlay"
              >
                Compact
              </button>
              <button
                type="button"
                className="learner-ar-overlay__control"
                onClick={() => setMode('collapsed')}
                aria-label="Collapse learner overlay"
              >
                Hide
              </button>
            </div>
          </div>

          <div className="learner-ar-overlay__target-list">
            {activeTargets.length > 0 ? activeTargets.map(target => (
              <TargetCard
                key={target.targetName}
                target={target}
                featured={target.targetName === featuredTarget?.targetName}
                onSpeak={onSpeak}
              />
            )) : (
              <p className="learner-ar-overlay__empty">Look for a card.</p>
            )}
          </div>

          <p className="learner-ar-overlay__instruction">{instruction}</p>
          {feedback && (
            <p
              key={feedback.id}
              className="learner-ar-overlay__feedback"
              data-feedback-id={feedback.id}
              role="status"
              aria-live="polite"
            >
              {feedback.message}
            </p>
          )}
        </section>
      )}
    </aside>
  );
}

export type { LearnerAROverlayProps };
