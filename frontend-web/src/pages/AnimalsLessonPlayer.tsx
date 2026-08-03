/**
 * AnimalsLessonPlayer.tsx
 * 
 * Claymorphic lesson player page for the Animals Adventure course.
 * Features 7 sections: Warmup, Vocabulary, Listen & Choose, Match, Games, Quiz, Reward.
 * 
 * Features:
 * - 7 learning sections with animated transitions
 * - Section progress tracking
 * - Interactive activities
 * - Claymorphic design with kid-friendly UI
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, shadows, radius } from '../design-tokens/claymorphic';
import { useAuth } from '../contexts/AuthContext';
import { VocabularyCard } from '../components/animals/VocabularyCard';
import { QuizQuestion } from '../components/animals/QuizQuestion';
import { ProgressBar } from '../components/animals/ProgressBar';
import { RewardAnimation } from '../components/animals/RewardAnimation';
import type { Lesson, LessonSession, VocabularyItem } from '../types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

interface Section {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

const SECTIONS: Section[] = [
  { id: 'warmup', label: 'Warm Up', emoji: '🌟', color: '#FFF8D8' },
  { id: 'vocabulary', label: 'Words', emoji: '📚', color: '#EEF9E7' },
  { id: 'listen', label: 'Listen', emoji: '👂', color: '#EAF5FF' },
  { id: 'match', label: 'Match', emoji: '🔗', color: '#FFE7E3' },
  { id: 'games', label: 'Games', emoji: '🎮', color: '#FFF1D7' },
  { id: 'quiz', label: 'Quiz', emoji: '❓', color: '#F2EBFF' },
  { id: 'reward', label: 'Reward', emoji: '🏆', color: '#FFF8D8' },
];

const ANIMAL_MASCOTS: Record<string, { emoji: string; color: string }> = {
  cat: { emoji: '🐱', color: '#FF9847' },
  dog: { emoji: '🐶', color: '#78A8A8' },
  bird: { emoji: '🐦', color: '#FF607C' },
  fish: { emoji: '🐟', color: '#6BB5FF' },
  rabbit: { emoji: '🐰', color: '#A8D8A8' },
};

interface QuizState {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  isSubmitted: boolean;
}

export const AnimalsLessonPlayer: React.FC = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [vocabProgress, setVocabProgress] = useState<Set<string>>(new Set());
  const [listenAnswers, setListenAnswers] = useState<Record<string, string>>({});
  const [matchPairs, setMatchPairs] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResults, setQuizResults] = useState<Record<string, QuizState>>({});
  const [showReward, setShowReward] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const copy = {
    warmupTitle: 'Welcome!',
    warmupSubtitle: "Let's learn about animals!",
    vocabularyTitle: 'Learn New Words',
    vocabularySubtitle: 'Tap to hear and learn',
    listenTitle: 'Listen & Choose',
    listenSubtitle: 'Tap the animal you hear',
    matchTitle: 'Match the Pairs',
    matchSubtitle: 'Connect the word to the picture',
    gamesTitle: 'Fun Games',
    gamesSubtitle: 'Play and learn!',
    quizTitle: 'Quick Quiz',
    quizSubtitle: 'Test what you learned!',
    rewardTitle: 'Amazing!',
    rewardSubtitle: 'You finished the lesson!',
    continue: 'Continue',
    previous: 'Previous',
    complete: 'Complete',
    playAudio: 'Listen',
    checkAnswer: 'Check',
    skip: 'Skip',
  };

  // Create mock lesson data based on animal type
  const getAnimalFromLessonId = (id?: string) => {
    if (!id) return 'cat';
    if (id.includes('dog')) return 'dog';
    if (id.includes('bird')) return 'bird';
    if (id.includes('fish')) return 'fish';
    if (id.includes('rabbit')) return 'rabbit';
    return 'cat';
  };

  useEffect(() => {
    const fetchLesson = async () => {
      setIsLoading(true);
      
      // Create mock lesson data
      const animal = getAnimalFromLessonId(lessonId);
      const mascot = ANIMAL_MASCOTS[animal];
      
      const mockLesson: Lesson = {
        lesson_id: lessonId || 'lesson-cat',
        title: `Learn the ${animal.charAt(0).toUpperCase() + animal.slice(1)}`,
        title_vi: `Hoc tu ${animal}`,
        description: `Learn about ${animal}!`,
        order: 1,
        duration_minutes: 10,
        vocabulary: [
          { word_en: animal, word_vi: animal === 'cat' ? 'Meo' : animal === 'dog' ? 'Cho' : animal === 'bird' ? 'Chim' : animal === 'fish' ? 'Ca' : 'Thu', emoji: mascot.emoji, image: { bucket: '', path: '', type: 'image', status: 'ready' }, audio: { bucket: '', path: '', type: 'audio', status: 'ready' }, simple_sentence: `A ${animal} is cute!` },
          { word_en: 'animal', word_vi: 'Dong vat', emoji: '🐾', image: { bucket: '', path: '', type: 'image', status: 'ready' }, audio: { bucket: '', path: '', type: 'audio', status: 'ready' }, simple_sentence: 'All animals are amazing!' },
          { word_en: 'pet', word_vi: 'Thu cung', emoji: '🏠', image: { bucket: '', path: '', type: 'image', status: 'ready' }, audio: { bucket: '', path: '', type: 'audio', status: 'ready' }, simple_sentence: 'A pet is a friend!' },
        ],
        quiz: [
          { question_id: 'q1', type: 'image_choice', prompt_vi: `${mascot.emoji} La con gi?`, questionAudioText: animal, options: [{ optionId: 'a', label: animal }, { optionId: 'b', label: 'dog' }, { optionId: 'c', label: 'bird' }, { optionId: 'd', label: 'fish' }], correctOptionId: 'a', feedbackCorrect: 'Dung roi!', feedbackIncorrect: 'Thu lai nhe!' },
          { question_id: 'q2', type: 'image_choice', prompt_vi: 'Con gi nay?', questionAudioText: 'animal', options: [{ optionId: 'a', label: 'animal' }, { optionId: 'b', label: 'plant' }, { optionId: 'c', label: 'food' }, { optionId: 'd', label: 'car' }], correctOptionId: 'a', feedbackCorrect: 'Gioi qua!', feedbackIncorrect: 'Sai roi!' },
        ],
        reward: { xp: 50, sticker: { bucket: '', path: '', type: 'sticker', status: 'ready' }, badgeTitle: `${animal} Master`, message_vi: 'Ban da hoan thanh!' },
        images: [],
        scene_images: [],
        generatedMedia: [],
      };

      setTimeout(() => {
        setLesson(mockLesson);
        setIsLoading(false);
      }, 500);
    };

    fetchLesson();
  }, [lessonId]);

  const currentSection = SECTIONS[currentSectionIndex];
  
  const progress = useMemo(() => {
    const completed = completedSections.size;
    return Math.round((completed / SECTIONS.length) * 100);
  }, [completedSections.size]);

  const handleSectionComplete = useCallback(() => {
    setCompletedSections(prev => new Set([...prev, currentSection.id]));
    
    // Auto-advance to next section after a short delay
    if (currentSectionIndex < SECTIONS.length - 1) {
      setTimeout(() => {
        setCurrentSectionIndex(prev => prev + 1);
      }, 800);
    } else {
      // Show reward on final section
      setXpEarned(lesson?.reward?.xp || 50);
      setShowReward(true);
    }
  }, [currentSection.id, currentSectionIndex, lesson?.reward?.xp]);

  const handleNextSection = () => {
    if (currentSectionIndex < SECTIONS.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleVocabComplete = (word: string) => {
    setVocabProgress(prev => new Set([...prev, word]));
  };

  const handleListenAnswer = (questionId: string, answer: string) => {
    setListenAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleMatchPair = (word: string, imageId: string) => {
    setMatchPairs(prev => ({ ...prev, [word]: imageId }));
  };

  const handleQuizAnswer = (questionId: string, answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
    setQuizResults(prev => ({ 
      ...prev, 
      [questionId]: { 
        questionId, 
        selectedAnswer: answer, 
        isCorrect: false, 
        isSubmitted: false 
      } 
    }));
  };

  const handleQuizSubmit = (questionId: string) => {
    const question = lesson?.quiz.find(q => q.question_id === questionId);
    if (!question) return;

    const selectedAnswer = quizAnswers[questionId];
    const isCorrect = question.options.find(o => o.optionId === selectedAnswer)?.label === 
                      question.options.find(o => o.optionId === question.correctOptionId)?.label;

    setQuizResults(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedAnswer,
        isCorrect,
        isSubmitted: true,
      },
    }));
  };

  const handleRewardDismiss = () => {
    setShowReward(false);
    navigate('/courses/animals');
  };

  // Render section content
  const renderSectionContent = () => {
    if (!lesson) return null;

    switch (currentSection.id) {
      case 'warmup':
        return (
          <div className="lesson-section lesson-section--warmup">
            <div className="lesson-section__intro">
              <div className="lesson-section__mascot">
                <img 
                  src={`/assets/animals/mascots/${getAnimalFromLessonId(lessonId)}.svg`}
                  alt={lesson.title}
                  className="lesson-section__mascot-image"
                />
              </div>
              <h2 className="lesson-section__title">{copy.warmupTitle}</h2>
              <p className="lesson-section__subtitle">{copy.warmupSubtitle}</p>
              
              <div className="lesson-section__mascot-tiles">
                {Object.entries(ANIMAL_MASCOTS).map(([key, value]) => (
                  <div 
                    key={key}
                    className={`lesson-section__mascot-tile ${key === getAnimalFromLessonId(lessonId) ? 'lesson-section__mascot-tile--active' : ''}`}
                    style={{ background: value.color }}
                  >
                    <span>{value.emoji}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSectionComplete}
              className="lesson-section__cta lesson-section__cta--primary"
            >
              {copy.continue}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      case 'vocabulary':
        return (
          <div className="lesson-section lesson-section--vocabulary">
            <div className="lesson-section__header">
              <h2 className="lesson-section__title">{copy.vocabularyTitle}</h2>
              <p className="lesson-section__subtitle">{copy.vocabularySubtitle}</p>
            </div>

            <div className="lesson-section__vocab-grid">
              {lesson.vocabulary.map((item, index) => (
                <VocabularyCard
                  key={item.word_en}
                  word={item.word_en}
                  translation={item.word_vi}
                  imageSrc={`/assets/animals/mascots/${getAnimalFromLessonId(lessonId)}-vocab.svg`}
                  sentence={item.simple_sentence}
                  index={index}
                  isCompleted={vocabProgress.has(item.word_en)}
                  onTap={() => handleVocabComplete(item.word_en)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSectionComplete}
              className="lesson-section__cta lesson-section__cta--primary"
              disabled={vocabProgress.size === 0}
            >
              {copy.continue}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      case 'listen':
        return (
          <div className="lesson-section lesson-section--listen">
            <div className="lesson-section__header">
              <h2 className="lesson-section__title">{copy.listenTitle}</h2>
              <p className="lesson-section__subtitle">{copy.listenSubtitle}</p>
            </div>

            <div className="lesson-section__listen-choices">
              {lesson.vocabulary.map((item, index) => (
                <button
                  key={item.word_en}
                  type="button"
                  onClick={() => handleListenAnswer('listen1', item.word_en)}
                  className={`lesson-section__listen-btn ${listenAnswers['listen1'] === item.word_en ? 'lesson-section__listen-btn--selected' : ''}`}
                  style={{ 
                    background: ANIMAL_MASCOTS[getAnimalFromLessonId(lessonId)]?.color || colors.skyBlue,
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <span className="lesson-section__listen-emoji">{item.emoji}</span>
                  <span className="lesson-section__listen-word">{item.word_en}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSectionComplete}
              className="lesson-section__cta lesson-section__cta--primary"
            >
              {copy.continue}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      case 'match':
        return (
          <div className="lesson-section lesson-section--match">
            <div className="lesson-section__header">
              <h2 className="lesson-section__title">{copy.matchTitle}</h2>
              <p className="lesson-section__subtitle">{copy.matchSubtitle}</p>
            </div>

            <div className="lesson-section__match-container">
              <div className="lesson-section__match-words">
                {lesson.vocabulary.map((item) => (
                  <div 
                    key={`word-${item.word_en}`}
                    className={`lesson-section__match-word ${matchPairs[item.word_en] ? 'lesson-section__match-word--matched' : ''}`}
                    onClick={() => {
                      // Toggle selection for matching
                      const currentMatch = Object.entries(matchPairs).find(([w]) => w === item.word_en);
                      if (currentMatch) {
                        setMatchPairs(prev => {
                          const next = { ...prev };
                          delete next[currentMatch[0]];
                          return next;
                        });
                      }
                    }}
                  >
                    {item.word_en}
                  </div>
                ))}
              </div>
              <div className="lesson-section__match-images">
                {lesson.vocabulary.map((item, index) => (
                  <div 
                    key={`image-${item.word_en}`}
                    className={`lesson-section__match-image ${Object.values(matchPairs).includes(item.word_en) ? 'lesson-section__match-image--matched' : ''}`}
                    onClick={() => {
                      // Match with first unmatched word
                      const unmatchedWord = lesson.vocabulary.find(w => !matchPairs[w.word_en]);
                      if (unmatchedWord) {
                        handleMatchPair(unmatchedWord.word_en, item.word_en);
                      }
                    }}
                  >
                    <span className="lesson-section__match-emoji">{item.emoji}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSectionComplete}
              className="lesson-section__cta lesson-section__cta--primary"
            >
              {copy.continue}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      case 'games':
        return (
          <div className="lesson-section lesson-section--games">
            <div className="lesson-section__header">
              <h2 className="lesson-section__title">{copy.gamesTitle}</h2>
              <p className="lesson-section__subtitle">{copy.gamesSubtitle}</p>
            </div>

            <div className="lesson-section__game-cards">
              <button 
                type="button"
                className="lesson-section__game-card"
                onClick={() => setCurrentSectionIndex(2)} // Go to listen
              >
                <span className="lesson-section__game-icon">👂</span>
                <span className="lesson-section__game-name">Listen Game</span>
              </button>
              <button 
                type="button"
                className="lesson-section__game-card"
                onClick={() => setCurrentSectionIndex(3)} // Go to match
              >
                <span className="lesson-section__game-icon">🔗</span>
                <span className="lesson-section__game-name">Match Game</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSectionComplete}
              className="lesson-section__cta lesson-section__cta--primary"
            >
              {copy.continue}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      case 'quiz':
        return (
          <div className="lesson-section lesson-section--quiz">
            <div className="lesson-section__header">
              <h2 className="lesson-section__title">{copy.quizTitle}</h2>
              <p className="lesson-section__subtitle">{copy.quizSubtitle}</p>
            </div>

            <div className="lesson-section__quiz-list">
              {lesson.quiz.map((question, index) => (
                <QuizQuestion
                  key={question.question_id}
                  questionId={question.question_id}
                  type={question.type}
                  promptVi={question.prompt_vi}
                  questionAudioText={question.questionAudioText}
                  questionNumber={index + 1}
                  totalQuestions={lesson.quiz.length}
                  options={question.options}
                  selectedAnswer={quizAnswers[question.question_id]}
                  isCorrect={quizResults[question.question_id]?.isCorrect}
                  isSubmitted={quizResults[question.question_id]?.isSubmitted}
                  onAnswer={handleQuizAnswer}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSectionComplete}
              className="lesson-section__cta lesson-section__cta--primary"
            >
              {copy.continue}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      case 'reward':
        return (
          <div className="lesson-section lesson-section--reward">
            <div className="lesson-section__reward-content">
              <div className="lesson-section__reward-icon">
                🎉
              </div>
              <h2 className="lesson-section__title">{copy.rewardTitle}</h2>
              <p className="lesson-section__subtitle">{copy.rewardSubtitle}</p>
              
              <div className="lesson-section__xp-earned">
                <span className="lesson-section__xp-icon">⭐</span>
                <span className="lesson-section__xp-value">{lesson.reward?.xp || 50}</span>
                <span className="lesson-section__xp-label">XP</span>
              </div>

              <div className="lesson-section__sticker">
                <img 
                  src={`/assets/animals/stickers/${getAnimalFromLessonId(lessonId)}-hero.svg`}
                  alt="Reward sticker"
                  className="lesson-section__sticker-image"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setXpEarned(lesson.reward?.xp || 50);
                setShowReward(true);
              }}
              className="lesson-section__cta lesson-section__cta--primary lesson-section__cta--reward"
            >
              Claim Reward!
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen clay-bg-playful p-6 text-center">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-6xl mb-4 animate-bounce">🐾</div>
          <p className="text-xl font-black text-slate-700">Loading lesson...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animals-lesson-player min-h-screen w-full clay-bg-playful">
      {/* Header */}
      <header className="animals-lesson-player__header">
        <div className="animals-lesson-player__header-content">
          <button
            type="button"
            onClick={() => navigate('/courses/animals')}
            className="animals-lesson-player__back-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="animals-lesson-player__lesson-info">
            <span className="animals-lesson-player__lesson-title">{lesson?.title}</span>
          </div>

          <div className="animals-lesson-player__progress-badge">
            <span>{progress}%</span>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="animals-lesson-player__progress-section">
        <ProgressBar
          progress={progress}
          sections={SECTIONS.map((s, i) => ({
            id: s.id,
            label: s.label,
            isActive: i === currentSectionIndex,
            isCompleted: completedSections.has(s.id),
          }))}
          activeSectionIndex={currentSectionIndex}
          theme="animals"
        />
      </div>

      {/* Section Navigation */}
      <nav className="animals-lesson-player__nav">
        {SECTIONS.map((section, index) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setCurrentSectionIndex(index)}
            className={`animals-lesson-player__nav-item ${index === currentSectionIndex ? 'animals-lesson-player__nav-item--active' : ''} ${completedSections.has(section.id) ? 'animals-lesson-player__nav-item--completed' : ''}`}
            style={{ 
              background: index === currentSectionIndex ? section.color : 'white',
              animationDelay: `${index * 50}ms`
            }}
          >
            <span className="animals-lesson-player__nav-emoji">{section.emoji}</span>
            <span className="animals-lesson-player__nav-label">{section.label}</span>
            {completedSections.has(section.id) && (
              <span className="animals-lesson-player__nav-check">✓</span>
            )}
          </button>
        ))}
      </nav>

      {/* Section Content */}
      <main 
        className="animals-lesson-player__content"
        style={{ background: currentSection.color }}
      >
        {renderSectionContent()}
      </main>

      {/* Navigation Controls */}
      <footer className="animals-lesson-player__footer">
        <button
          type="button"
          onClick={handlePrevSection}
          disabled={currentSectionIndex === 0}
          className="animals-lesson-player__nav-btn animals-lesson-player__nav-btn--prev"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {copy.previous}
        </button>

        <button
          type="button"
          onClick={handleNextSection}
          disabled={currentSectionIndex === SECTIONS.length - 1}
          className="animals-lesson-player__nav-btn animals-lesson-player__nav-btn--next"
        >
          {copy.continue}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </footer>

      {/* Reward Animation */}
      <RewardAnimation
        xpEarned={xpEarned}
        stickerEmoji="🎉"
        isVisible={showReward}
        onDismiss={handleRewardDismiss}
        message={lesson?.reward?.badgeTitle || 'Great Job!'}
      />

      <style>{`
        .animals-lesson-player {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          padding-bottom: 100px;
        }

        /* Header */
        .animals-lesson-player__header {
          padding: 16px 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          background: white;
          border-bottom: 3px solid rgba(0,0,0,0.05);
        }

        .animals-lesson-player__header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 800px;
          margin: 0 auto;
        }

        .animals-lesson-player__back-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 3px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clayWhite};
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .animals-lesson-player__back-btn:hover {
          transform: translateY(-2px);
        }

        .animals-lesson-player__back-btn svg {
          width: 20px;
          height: 20px;
          color: ${colors.deepSlate};
        }

        .animals-lesson-player__lesson-info {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .animals-lesson-player__lesson-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: ${colors.deepSlate};
        }

        .animals-lesson-player__progress-badge {
          padding: 8px 16px;
          background: ${colors.skyBlue};
          border-radius: ${radius.full};
          font-weight: 900;
          font-size: 0.875rem;
          color: white;
        }

        /* Progress Section */
        .animals-lesson-player__progress-section {
          padding: 16px 20px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        /* Nav */
        .animals-lesson-player__nav {
          display: flex;
          gap: 8px;
          padding: 0 16px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .animals-lesson-player__nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          border: 3px solid white;
          border-radius: ${radius['2xl']};
          box-shadow: ${shadows.claySm};
          cursor: pointer;
          transition: all 0.2s ease;
          animation: navItemReveal 0.3s ease-out backwards;
          min-width: 70px;
          position: relative;
        }

        @keyframes navItemReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animals-lesson-player__nav-item:hover {
          transform: translateY(-2px);
        }

        .animals-lesson-player__nav-item--active {
          box-shadow: ${shadows.clay};
        }

        .animals-lesson-player__nav-item--completed {
          opacity: 0.7;
        }

        .animals-lesson-player__nav-emoji {
          font-size: 1.25rem;
        }

        .animals-lesson-player__nav-label {
          font-size: 0.625rem;
          font-weight: 700;
          color: ${colors.deepSlate};
          white-space: nowrap;
        }

        .animals-lesson-player__nav-check {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          background: ${colors.mintGreen};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: white;
          font-weight: 900;
        }

        /* Content */
        .animals-lesson-player__content {
          flex: 1;
          padding: 24px 20px;
          margin: 16px;
          border-radius: ${radius['3xl']};
          border: 4px solid white;
          box-shadow: ${shadows.clay};
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          width: calc(100% - 32px);
        }

        /* Footer */
        .animals-lesson-player__footer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          padding: 16px 20px;
          background: white;
          border-top: 3px solid rgba(0,0,0,0.05);
          z-index: 100;
        }

        .animals-lesson-player__nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border: 3px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clay};
          cursor: pointer;
          font-weight: 700;
          font-size: 1rem;
          transition: all 0.15s ease;
        }

        .animals-lesson-player__nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .animals-lesson-player__nav-btn:not(:disabled):hover {
          transform: translateY(-2px);
        }

        .animals-lesson-player__nav-btn--prev {
          background: white;
          color: ${colors.deepSlate};
        }

        .animals-lesson-player__nav-btn--next {
          background: ${colors.skyBlue};
          color: white;
        }

        .animals-lesson-player__nav-btn svg {
          width: 18px;
          height: 18px;
        }

        /* Section Styles */
        .lesson-section {
          animation: sectionFadeIn 0.4s ease-out;
        }

        @keyframes sectionFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .lesson-section__header {
          text-align: center;
          margin-bottom: 24px;
        }

        .lesson-section__title {
          font-size: 2rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          margin: 0;
        }

        .lesson-section__subtitle {
          font-size: 1rem;
          font-weight: 600;
          color: ${colors.mediumGray};
          margin: 8px 0 0;
        }

        .lesson-section__intro {
          text-align: center;
        }

        .lesson-section__mascot {
          margin-bottom: 20px;
        }

        .lesson-section__mascot-image {
          width: 150px;
          height: 150px;
          object-fit: contain;
          animation: mascotBounce 2s ease-in-out infinite;
        }

        @keyframes mascotBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .lesson-section__mascot-tiles {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        .lesson-section__mascot-tile {
          width: 50px;
          height: 50px;
          border-radius: ${radius.lg};
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: ${shadows.claySm};
          animation: mascotTileFloat 3s ease-in-out infinite;
        }

        .lesson-section__mascot-tile--active {
          transform: scale(1.2);
          box-shadow: ${shadows.clay};
        }

        @keyframes mascotTileFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .lesson-section__vocab-grid {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 640px) {
          .lesson-section__vocab-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .lesson-section__listen-choices {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 640px) {
          .lesson-section__listen-choices {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .lesson-section__listen-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px;
          border: 4px solid white;
          border-radius: ${radius['2xl']};
          box-shadow: ${shadows.clay};
          cursor: pointer;
          transition: all 0.2s ease;
          animation: listenBtnReveal 0.4s ease-out backwards;
        }

        @keyframes listenBtnReveal {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .lesson-section__listen-btn:hover {
          transform: translateY(-4px);
        }

        .lesson-section__listen-btn--selected {
          box-shadow: ${shadows.clayLg};
          transform: scale(1.05);
        }

        .lesson-section__listen-emoji {
          font-size: 3rem;
        }

        .lesson-section__listen-word {
          font-size: 1.25rem;
          font-weight: 900;
          color: white;
          text-transform: capitalize;
        }

        .lesson-section__match-container {
          display: grid;
          gap: 32px;
          margin-bottom: 24px;
        }

        @media (min-width: 640px) {
          .lesson-section__match-container {
            grid-template-columns: 1fr 1fr;
          }
        }

        .lesson-section__match-words,
        .lesson-section__match-images {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lesson-section__match-word,
        .lesson-section__match-image {
          padding: 16px 24px;
          background: white;
          border: 3px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.claySm};
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .lesson-section__match-word:hover,
        .lesson-section__match-image:hover {
          transform: translateY(-2px);
        }

        .lesson-section__match-word--matched,
        .lesson-section__match-image--matched {
          background: ${colors.mintGreenLight};
          border-color: ${colors.mintGreen};
        }

        .lesson-section__match-emoji {
          font-size: 2rem;
        }

        .lesson-section__game-cards {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (min-width: 640px) {
          .lesson-section__game-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .lesson-section__game-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 32px;
          background: white;
          border: 4px solid white;
          border-radius: ${radius['2xl']};
          box-shadow: ${shadows.clay};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .lesson-section__game-card:hover {
          transform: translateY(-4px);
        }

        .lesson-section__game-icon {
          font-size: 3rem;
        }

        .lesson-section__game-name {
          font-size: 1rem;
          font-weight: 800;
          color: ${colors.deepSlate};
        }

        .lesson-section__quiz-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-bottom: 24px;
        }

        .lesson-section__reward-content {
          text-align: center;
        }

        .lesson-section__reward-icon {
          font-size: 5rem;
          margin-bottom: 16px;
          animation: rewardBounce 0.6s ease infinite;
        }

        @keyframes rewardBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .lesson-section__xp-earned {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          background: ${colors.sunshineYellow};
          border: 4px solid white;
          border-radius: ${radius.full};
          box-shadow: ${shadows.clayYellow};
          margin: 16px 0;
        }

        .lesson-section__xp-icon {
          font-size: 1.5rem;
        }

        .lesson-section__xp-value {
          font-size: 2.5rem;
          font-weight: 900;
          color: ${colors.deepSlate};
        }

        .lesson-section__xp-label {
          font-size: 1rem;
          font-weight: 700;
          color: ${colors.deepSlate};
        }

        .lesson-section__sticker {
          margin: 20px 0;
        }

        .lesson-section__sticker-image {
          width: 120px;
          height: 120px;
          object-fit: contain;
          animation: stickerWiggle 0.5s ease;
        }

        @keyframes stickerWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }

        .lesson-section__cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 32px;
          border: 4px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clay};
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 900;
          transition: all 0.15s ease;
          margin-top: 24px;
        }

        .lesson-section__cta:hover {
          transform: translateY(-3px);
        }

        .lesson-section__cta:active {
          transform: translateY(2px);
        }

        .lesson-section__cta:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .lesson-section__cta--primary {
          background: ${colors.skyBlue};
          color: white;
        }

        .lesson-section__cta--reward {
          background: ${colors.sunshineYellow};
          color: ${colors.deepSlate};
        }

        .lesson-section__cta svg {
          width: 20px;
          height: 20px;
        }
      `}</style>
    </div>
  );
};

export default AnimalsLessonPlayer;
