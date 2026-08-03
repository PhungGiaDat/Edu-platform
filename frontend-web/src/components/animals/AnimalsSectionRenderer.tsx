/**
 * AnimalsSectionRenderer.tsx
 * 
 * Renders each section type for the Animals Adventure lesson player.
 * Handles: warmup, vocab, listen, match, games, quiz, reward
 */

import React from 'react';
import type {
  VocabularyItem,
  QuizQuestion,
  Reward,
  ReadAloudStory,
  PronunciationTask,
} from '@/types/course';

interface BaseSectionProps {
  onNext?: () => void;
  onComplete?: () => void;
}

interface WarmupSectionProps extends BaseSectionProps {
  type: 'warmup';
  title: string;
  description?: string;
}

interface VocabSectionProps extends BaseSectionProps {
  type: 'vocab';
  items: VocabularyItem[];
  onWordClick?: (word: VocabularyItem) => void;
}

interface ListenSectionProps extends BaseSectionProps {
  type: 'listen';
  prompt: string;
  items: Array<{ id: string; label: string; imageUrl?: string; emoji?: string }>;
  onSelect: (id: string) => void;
  selectedId?: string;
  isCorrect?: boolean;
  feedback?: string;
}

interface MatchSectionProps extends BaseSectionProps {
  type: 'match';
  pairs: Array<{ left: { id: string; label: string; imageUrl?: string; emoji?: string }; right: { id: string; label: string; imageUrl?: string; emoji?: string } }>;
  onMatch: (leftId: string, rightId: string) => void;
  matchedPairs: string[];
}

interface GamesSectionProps extends BaseSectionProps {
  type: 'games';
  games: Array<{ id: string; name: string; type: string; description: string }>;
  onSelectGame: (gameId: string) => void;
}

interface QuizSectionProps extends BaseSectionProps {
  type: 'quiz';
  questions: QuizQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
  score?: number;
  isSubmitted: boolean;
}

interface RewardSectionProps extends BaseSectionProps {
  type: 'reward';
  reward: Reward;
  onClaim: () => void;
}

interface StorySectionProps extends BaseSectionProps {
  type: 'story';
  story: ReadAloudStory;
}

interface PronunciationSectionProps extends BaseSectionProps {
  type: 'pronunciation';
  task: PronunciationTask;
  onRecord?: () => void;
  onPlayAudio?: () => void;
}

type SectionProps = 
  | WarmupSectionProps
  | VocabSectionProps
  | ListenSectionProps
  | MatchSectionProps
  | GamesSectionProps
  | QuizSectionProps
  | RewardSectionProps
  | StorySectionProps
  | PronunciationSectionProps;

const sectionIcons: Record<string, string> = {
  warmup: '🎬',
  vocab: '📚',
  listen: '👂',
  match: '🔗',
  games: '🎮',
  quiz: '📝',
  reward: '🏆',
  story: '📖',
  pronunciation: '🎤',
};

export const AnimalsSectionRenderer: React.FC<SectionProps> = (props) => {
  const { type } = props;

  switch (type) {
    case 'warmup':
      return <WarmupSection {...props} />;
    case 'vocab':
      return <VocabSection {...props} />;
    case 'listen':
      return <ListenSection {...props} />;
    case 'match':
      return <MatchSection {...props} />;
    case 'games':
      return <GamesSection {...props} />;
    case 'quiz':
      return <QuizSection {...props} />;
    case 'reward':
      return <RewardSection {...props} />;
    case 'story':
      return <StorySection {...props} />;
    case 'pronunciation':
      return <PronunciationSection {...props} />;
    default:
      return <div className="animals-section__unknown">Unknown section type</div>;
  }
};

// ========== Section Components ==========

const WarmupSection: React.FC<WarmupSectionProps> = ({ title, description, onNext }) => (
  <div className="animals-section animals-section--warmup">
    <div className="animals-section__icon">{sectionIcons.warmup}</div>
    <h2 className="animals-section__title">{title}</h2>
    {description && <p className="animals-section__description">{description}</p>}
    {onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Start
      </button>
    )}
  </div>
);

const VocabSection: React.FC<VocabSectionProps> = ({ items, onWordClick, onNext }) => (
  <div className="animals-section animals-section--vocab">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.vocab}</div>
      <h2 className="animals-section__title">Vocabulary</h2>
    </div>
    <div className="animals-section__vocab-grid">
      {items.map((item, index) => (
        <button
          key={item.word_en}
          type="button"
          onClick={() => onWordClick?.(item)}
          className="animals-vocab-card"
          style={{ '--vocab-index': index } as React.CSSProperties}
        >
          <div className="animals-vocab-card__emoji">{item.emoji}</div>
          <div className="animals-vocab-card__words">
            <span className="animals-vocab-card__word-en">{item.word_en}</span>
            <span className="animals-vocab-card__word-vi">{item.word_vi}</span>
          </div>
          <div className="animals-vocab-card__sentence">{item.simple_sentence}</div>
        </button>
      ))}
    </div>
    {onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    )}
  </div>
);

const ListenSection: React.FC<ListenSectionProps> = ({
  prompt,
  items,
  onSelect,
  selectedId,
  isCorrect,
  feedback,
  onNext,
}) => (
  <div className="animals-section animals-section--listen">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.listen}</div>
      <h2 className="animals-section__title">Listen & Choose</h2>
    </div>
    <p className="animals-section__prompt">{prompt}</p>
    <div className="animals-section__listen-grid">
      {items.map((item) => {
        const isSelected = selectedId === item.id;
        const showCorrect = isSelected && isCorrect;
        const showIncorrect = isSelected && !isCorrect;
        
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`animals-listen-card ${isSelected ? 'animals-listen-card--selected' : ''} ${showCorrect ? 'animals-listen-card--correct' : ''} ${showIncorrect ? 'animals-listen-card--incorrect' : ''}`}
          >
            <div className="animals-listen-card__emoji">{item.emoji}</div>
            <span className="animals-listen-card__label">{item.label}</span>
          </button>
        );
      })}
    </div>
    {feedback && (
      <div className={`animals-section__feedback ${isCorrect ? 'animals-section__feedback--correct' : 'animals-section__feedback--incorrect'}`}>
        {feedback}
      </div>
    )}
    {selectedId && isCorrect && onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    )}
  </div>
);

const MatchSection: React.FC<MatchSectionProps> = ({ pairs, onMatch, matchedPairs, onNext }) => (
  <div className="animals-section animals-section--match">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.match}</div>
      <h2 className="animals-section__title">Match the Pairs</h2>
    </div>
    <p className="animals-section__prompt">Tap the matching pairs</p>
    <div className="animals-section__match-grid">
      <div className="animals-section__match-column">
        {pairs.map((pair) => (
          <button
            key={`left-${pair.left.id}`}
            type="button"
            onClick={() => onMatch(pair.left.id, pair.right.id)}
            className={`animals-match-card ${matchedPairs.includes(pair.left.id) ? 'animals-match-card--matched' : ''}`}
            disabled={matchedPairs.includes(pair.left.id)}
          >
            <div className="animals-match-card__emoji">{pair.left.emoji}</div>
            <span>{pair.left.label}</span>
          </button>
        ))}
      </div>
      <div className="animals-section__match-column">
        {pairs.map((pair) => (
          <button
            key={`right-${pair.right.id}`}
            type="button"
            onClick={() => onMatch(pair.left.id, pair.right.id)}
            className={`animals-match-card ${matchedPairs.includes(pair.right.id) ? 'animals-match-card--matched' : ''}`}
            disabled={matchedPairs.includes(pair.right.id)}
          >
            <div className="animals-match-card__emoji">{pair.right.emoji}</div>
            <span>{pair.right.label}</span>
          </button>
        ))}
      </div>
    </div>
    {matchedPairs.length === pairs.length && onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    )}
  </div>
);

const GamesSection: React.FC<GamesSectionProps> = ({ games, onSelectGame, onNext }) => (
  <div className="animals-section animals-section--games">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.games}</div>
      <h2 className="animals-section__title">Mini Games</h2>
    </div>
    <div className="animals-section__games-grid">
      {games.map((game, index) => (
        <button
          key={game.id}
          type="button"
          onClick={() => onSelectGame(game.id)}
          className="animals-game-card"
          style={{ '--game-index': index } as React.CSSProperties}
        >
          <span className="animals-game-card__number">{index + 1}</span>
          <span className="animals-game-card__name">{game.name}</span>
          <span className="animals-game-card__type">{game.type}</span>
        </button>
      ))}
    </div>
    {onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    )}
  </div>
);

const QuizSection: React.FC<QuizSectionProps> = ({
  questions,
  answers,
  onAnswer,
  onSubmit,
  score,
  isSubmitted,
  onNext,
}) => (
  <div className="animals-section animals-section--quiz">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.quiz}</div>
      <h2 className="animals-section__title">Quiz Time!</h2>
    </div>
    <div className="animals-section__quiz-progress">
      <span>{Object.keys(answers).length} / {questions.length} answered</span>
      {score !== undefined && (
        <span className="animals-section__quiz-score">Score: {score}%</span>
      )}
    </div>
    <div className="animals-section__quiz-list">
      {questions.map((question, index) => (
        <div key={question.question_id} className="animals-quiz-item">
          <p className="animals-quiz-item__question">
            {index + 1}. {question.prompt_vi}
          </p>
          <div className="animals-quiz-item__options">
            {question.options.map((option) => {
              const isSelected = answers[question.question_id] === option.option_id;
              return (
                <button
                  key={option.option_id}
                  type="button"
                  onClick={() => onAnswer(question.question_id, option.option_id)}
                  className={`animals-quiz-option ${isSelected ? 'animals-quiz-option--selected' : ''}`}
                  disabled={isSubmitted}
                >
                  <span className="animals-quiz-option__label">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
    {!isSubmitted ? (
      <button type="button" onClick={onSubmit} className="animals-section__cta" disabled={Object.keys(answers).length < questions.length}>
        Submit Quiz
      </button>
    ) : onNext ? (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    ) : null}
  </div>
);

const RewardSection: React.FC<RewardSectionProps> = ({ reward, onClaim }) => (
  <div className="animals-section animals-section--reward">
    <div className="animals-section__icon">{sectionIcons.reward}</div>
    <h2 className="animals-section__title">You Got a Sticker!</h2>
    <div className="animals-section__reward-content">
      <div className="animals-section__reward-sticker">
        <img src={`/assets/animals/stickers/${reward.sticker.path}`} alt={reward.badgeTitle} />
      </div>
      <h3 className="animals-section__reward-badge">{reward.badgeTitle}</h3>
      <p className="animals-section__reward-message">{reward.message_vi}</p>
      <div className="animals-section__reward-xp">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 2 4 14h6.7L9.5 22 20 9h-7.1L13.5 2Z" />
        </svg>
        <span>+{reward.xp} XP</span>
      </div>
    </div>
    <button type="button" onClick={onClaim} className="animals-section__cta">
      Claim Reward
    </button>
  </div>
);

const StorySection: React.FC<StorySectionProps> = ({ story, onNext }) => (
  <div className="animals-section animals-section--story">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.story}</div>
      <h2 className="animals-section__title">{story.title}</h2>
    </div>
    <div className="animals-section__story-pages">
      {story.pages.map((page) => (
        <div key={page.page_id} className="animals-story-page">
          <div className="animals-story-page__image">
            {page.image?.path && (
              <img src={`/assets/${page.image.path}`} alt={`Page ${page.order}`} />
            )}
          </div>
          <div className="animals-story-page__text">
            <p className="animals-story-page__text-en">{page.text_en}</p>
            <p className="animals-story-page__text-vi">{page.text_vi}</p>
            <div className="animals-story-page__highlighted">
              {page.highlighted_words.map((word) => (
                <span key={word} className="animals-story-page__highlighted-word">{word}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
    {onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    )}
  </div>
);

const PronunciationSection: React.FC<PronunciationSectionProps> = ({
  task,
  onRecord,
  onPlayAudio,
  onNext,
}) => (
  <div className="animals-section animals-section--pronunciation">
    <div className="animals-section__header">
      <div className="animals-section__icon">{sectionIcons.pronunciation}</div>
      <h2 className="animals-section__title">Say It Aloud</h2>
    </div>
    <p className="animals-section__prompt">{task.instruction_vi}</p>
    <div className="animals-section__pronunciation-content">
      <button type="button" onClick={onPlayAudio} className="animals-pronunciation__play">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>Listen</span>
      </button>
      <div className="animals-section__target-words">
        {task.target_words.map((word) => (
          <span key={word} className="animals-pronunciation__word">{word}</span>
        ))}
      </div>
      <button type="button" onClick={onRecord} className="animals-pronunciation__record">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" />
        </svg>
        <span>Record</span>
      </button>
    </div>
    {onNext && (
      <button type="button" onClick={onNext} className="animals-section__cta">
        Continue
      </button>
    )}
  </div>
);
