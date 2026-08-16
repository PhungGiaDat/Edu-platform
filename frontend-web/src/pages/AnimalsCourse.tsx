/**
 * AnimalsCourse.tsx
 * 
 * Claymorphic course overview page for the Animals Adventure course.
 * Displays course hero, lesson list, and progress tracking.
 * 
 * Features:
 * - Course hero with mascot tiles
 * - 5 lesson cards (cat, dog, bird, fish, rabbit)
 * - Progress tracking (completed lessons, XP earned)
 * - Claymorphic design with warm orange theme
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors, shadows, radius } from '../design-tokens/claymorphic';
import { useAuth } from '../contexts/AuthContext';
import { courseService } from '../services/CourseService';
import type { Course, Lesson, UserProgress } from '../types/course';

const ANIMAL_MASCOTS = [
  { name: 'cat', emoji: '🐱', color: '#FF9847', label: 'Cat', word: 'Meo' },
  { name: 'dog', emoji: '🐶', color: '#78A8A8', label: 'Dog', word: 'Cho' },
  { name: 'bird', emoji: '🐦', color: '#FF607C', label: 'Bird', word: 'Chim' },
  { name: 'fish', emoji: '🐟', color: '#6BB5FF', label: 'Fish', word: 'Ca' },
  { name: 'rabbit', emoji: '🐰', color: '#A8D8A8', label: 'Rabbit', word: 'Thu' },
];

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

export const AnimalsCourse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    en: {
      loadingCourse: 'Loading course...',
      back: 'Back',
      startLearning: 'Start Learning',
      continueJourney: 'Continue Journey',
      lessons: 'Lessons',
      xp: 'XP',
      progress: 'Progress',
      completed: 'Completed',
      locked: 'Locked',
      review: 'Review',
      words: 'words',
    },
    vi: {
      loadingCourse: 'Dang tai khoa hoc...',
      back: 'Quay lai',
      startLearning: 'Bat Dau Hoc',
      continueJourney: 'Tiep Tuc',
      lessons: 'Bai hoc',
      xp: 'XP',
      progress: 'Tien do',
      completed: 'Da xong',
      locked: 'Khoa',
      review: 'On lai',
      words: 'tu',
    },
  };

  useEffect(() => {
    const fetchCourse = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch the animals course - this would be the course ID from the backend
        const courses = await courseService.listCourses();
        const animalsCourse = courses.find(c => 
          c.title.toLowerCase().includes('animal') || 
          c.course_id === 'animals-course' ||
          c.category_key === 'animals'
        );
        
        if (animalsCourse) {
          setCourse(animalsCourse);
          
          // Fetch progress
          const learnerId = getLearnerId(user?.id);
          const progressList = await courseService.getProgress(learnerId).catch(() => []);
          const courseProgress = progressList.find(p => p.course_id === animalsCourse.course_id);
          setProgress(courseProgress || null);
        } else {
          // If no animals course found, create a mock for demo
          setCourse(createMockCourse());
        }
      } catch (err) {
        console.error('[AnimalsCourse] Error fetching course:', err);
        // Create mock course for demo
        setCourse(createMockCourse());
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [user?.id]);

  const createMockCourse = (): Course => {
    const lessons: Lesson[] = ANIMAL_MASCOTS.map((animal, index) => ({
      lesson_id: `learn-the-${animal.name}`,
      title: `Learn the ${animal.label}`,
      title_vi: `Hoc tu ${animal.word}`,
      description: `Learn about ${animal.label.toLowerCase()}!`,
      order: index + 1,
      duration_minutes: 10 + index * 2,
      video_duration: 0,
      vocabulary: [
        {
          word_en: animal.label,
          word_vi: animal.word,
          emoji: animal.emoji,
          image: { bucket: '', path: '', type: 'image', status: 'ready' },
          audio: { bucket: '', path: '', type: 'audio', status: 'ready' },
          simple_sentence: `A ${animal.label.toLowerCase()} is cute!`,
        },
      ],
      quiz: [],
      reward: {
        xp: 50 + index * 10,
        sticker: { bucket: '', path: '', type: 'sticker', status: 'ready' },
        badgeTitle: `${animal.label} Master`,
        message_vi: 'Ban da hoan thanh bai hoc!',
      },
      images: [],
      scene_images: [],
      generatedMedia: [],
    }));

    return {
      course_id: 'animals-course',
      title: 'Animals Adventure',
      description: 'Learn about animals with fun lessons!',
      subtitle_vi: 'Hoc ve cac loai dong vat',
      theme: 'animals',
      category_key: 'animals',
      category_label: 'Animals',
      category_icon: '🐾',
      age_range: '3-6',
      level: 'beginner',
      description_vi: 'Hoc cac loai dong vat vo ia!',
      thumbnail: null,
      catalogPreview: [
        { label: 'Lessons', value: '5', color: 'sky' },
        { label: 'Total XP', value: '350', color: 'amber' },
      ],
      studentTestimonials: [],
      lessons,
      is_published: true,
    };
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (!course) return;
    navigate(`/courses/animals/lessons/${lesson.lesson_id}`);
  };

  const handleStartJourney = () => {
    if (!course || !course.lessons.length) return;
    
    // Find first incomplete lesson or start from beginning
    const firstIncomplete = progress?.completed_lessons.length === 0;
    const nextLessonId = firstIncomplete 
      ? course.lessons[0]?.lesson_id 
      : course.lessons.find(l => !progress?.completed_lessons.includes(l.lesson_id))?.lesson_id
      || course.lessons[0]?.lesson_id;
    
    if (nextLessonId) {
      navigate(`/courses/animals/lessons/${nextLessonId}`);
    }
  };

  const getCompletedCount = () => progress?.completed_lessons.length || 0;
  const getTotalXp = () => {
    if (!course) return 0;
    return course.lessons.reduce((sum, l) => sum + (l.reward?.xp || 0), 0);
  };
  const getEarnedXp = () => {
    if (!course || !progress) return 0;
    return course.lessons
      .filter(l => progress.completed_lessons.includes(l.lesson_id))
      .reduce((sum, l) => sum + (l.reward?.xp || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen clay-bg-playful p-6 text-center">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-6xl mb-4 animate-bounce">🐾</div>
          <p className="text-xl font-black text-slate-700">{copy.en.loadingCourse}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen clay-bg-playful p-6 text-center">
        <p className="text-xl font-black text-rose-600">{error}</p>
        <button 
          onClick={() => navigate('/courses')}
          className="mt-4 px-6 py-3 bg-white rounded-2xl border-4 border-white shadow-lg font-bold"
        >
          {copy.en.back}
        </button>
      </div>
    );
  }

  const completedCount = getCompletedCount();
  const totalLessons = course?.lessons.length || 5;
  const progressPercent = Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="animals-course min-h-screen w-full clay-bg-playful pb-10">
      {/* Header */}
      <header className="animals-course__header">
        <div className="animals-course__header-content">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="animals-course__back-btn"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {copy.en.back}
          </button>
          
          <div className="animals-course__badge">
            <span className="animals-course__badge-icon">⭐</span>
            <span className="animals-course__badge-text">{getTotalXp()} XP</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="animals-course__hero">
        <div className="animals-course__hero-content">
          <div className="animals-course__hero-text">
            <span className="animals-course__age-badge">Ages 3-6</span>
            <h1 className="animals-course__title">Animals Adventure</h1>
            <p className="animals-course__subtitle">Learn about animals with fun lessons!</p>
            
            {/* Progress stats */}
            <div className="animals-course__stats">
              <div className="animals-course__stat">
                <span className="animals-course__stat-value">{completedCount}/{totalLessons}</span>
                <span className="animals-course__stat-label">{copy.en.lessons}</span>
              </div>
              <div className="animals-course__stat-divider" />
              <div className="animals-course__stat">
                <span className="animals-course__stat-value">{getEarnedXp()}</span>
                <span className="animals-course__stat-label">{copy.en.xp}</span>
              </div>
              <div className="animals-course__stat-divider" />
              <div className="animals-course__stat">
                <span className="animals-course__stat-value">{progressPercent}%</span>
                <span className="animals-course__stat-label">{copy.en.progress}</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="animals-course__progress-bar">
              <div 
                className="animals-course__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Start button */}
            <button
              type="button"
              onClick={handleStartJourney}
              className="animals-course__cta"
            >
              {completedCount === 0 ? copy.en.startLearning : copy.en.continueJourney}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Mascot tiles */}
          <div className="animals-course__mascots">
            <div className="animals-course__cover">
              <img 
                src="/assets/animals/course-cover.svg" 
                alt="Animals Course Cover"
                className="animals-course__cover-image"
              />
            </div>
            <div className="animals-course__mascot-tiles">
              {ANIMAL_MASCOTS.map((mascot, index) => (
                <div 
                  key={mascot.name}
                  className="animals-course__mascot-tile"
                  style={{ 
                    background: mascot.color,
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <span className="animals-course__mascot-emoji">{mascot.emoji}</span>
                  <span className="animals-course__mascot-name">{mascot.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="animals-course__decoration animals-course__decoration--1" />
        <div className="animals-course__decoration animals-course__decoration--2" />
        <div className="animals-course__decoration animals-course__decoration--3" />
      </section>

      {/* Lessons Section */}
      <section className="animals-course__lessons">
        <h2 className="animals-course__section-title">{copy.en.lessons}</h2>
        
        <div className="animals-course__lesson-list">
          {course?.lessons.map((lesson, index) => {
            const isCompleted = progress?.completed_lessons.includes(lesson.lesson_id) || false;
            const mascot = ANIMAL_MASCOTS[index] || ANIMAL_MASCOTS[0];
            const vocabPreview = lesson.vocabulary.slice(0, 5).map(v => v.emoji || '✨');
            
            return (
              <button
                key={lesson.lesson_id}
                type="button"
                onClick={() => handleLessonClick(lesson)}
                className={`animals-course__lesson-card ${isCompleted ? 'animals-course__lesson-card--completed' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="animals-course__lesson-thumbnail" style={{ background: mascot.color }}>
                  <img 
                    src={`/assets/animals/mascots/${mascot.name}.svg`}
                    alt={lesson.title}
                    className="animals-course__lesson-image"
                  />
                  {isCompleted && (
                    <div className="animals-course__lesson-completed-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="animals-course__lesson-content">
                  <div className="animals-course__lesson-order" style={{ background: mascot.color }}>
                    {lesson.order}
                  </div>
                  <div className="animals-course__lesson-info">
                    <h3 className="animals-course__lesson-title">{lesson.title}</h3>
                    <p className="animals-course__lesson-subtitle">{lesson.title_vi}</p>
                    
                    {/* Vocab preview */}
                    <div className="animals-course__lesson-vocab">
                      <span className="animals-course__lesson-vocab-label">Words:</span>
                      <div className="animals-course__lesson-vocab-emojis">
                        {vocabPreview.map((emoji, i) => (
                          <span key={i} className="animals-course__lesson-vocab-emoji">{emoji}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="animals-course__lesson-xp">
                    <span className="animals-course__lesson-xp-icon">⭐</span>
                    <span className="animals-course__lesson-xp-value">{lesson.reward?.xp || 0}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <style>{`
        .animals-course {
          padding-bottom: 80px;
        }

        /* Header */
        .animals-course__header {
          padding: 16px 20px;
        }

        .animals-course__header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 800px;
          margin: 0 auto;
        }

        .animals-course__back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 3px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clayWhite};
          cursor: pointer;
          font-weight: 700;
          font-size: 0.9rem;
          color: ${colors.deepSlate};
          transition: all 0.15s ease;
        }

        .animals-course__back-btn:hover {
          transform: translateY(-2px);
        }

        .animals-course__back-btn svg {
          width: 18px;
          height: 18px;
        }

        .animals-course__badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: ${colors.sunshineYellow};
          border: 3px solid white;
          border-radius: ${radius.full};
          box-shadow: ${shadows.clayYellow};
        }

        .animals-course__badge-icon {
          font-size: 1rem;
        }

        .animals-course__badge-text {
          font-weight: 900;
          font-size: 0.9rem;
          color: ${colors.deepSlate};
        }

        /* Hero */
        .animals-course__hero {
          position: relative;
          padding: 20px;
          margin-bottom: 24px;
        }

        .animals-course__hero-content {
          display: grid;
          gap: 24px;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        @media (min-width: 768px) {
          .animals-course__hero-content {
            grid-template-columns: 1fr 1fr;
            align-items: center;
          }
        }

        .animals-course__hero-text {
          background: ${colors.warmWhite};
          border-radius: ${radius['3xl']};
          border: 4px solid white;
          box-shadow: ${shadows.clay};
          padding: 24px;
        }

        .animals-course__age-badge {
          display: inline-block;
          padding: 6px 14px;
          background: ${colors.mintGreen};
          border-radius: ${radius.full};
          font-size: 0.75rem;
          font-weight: 800;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .animals-course__title {
          font-size: 2.5rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          margin: 0;
          line-height: 1.1;
        }

        .animals-course__subtitle {
          font-size: 1.1rem;
          font-weight: 600;
          color: ${colors.mediumGray};
          margin: 8px 0 20px;
        }

        .animals-course__stats {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .animals-course__stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .animals-course__stat-value {
          font-size: 1.5rem;
          font-weight: 900;
          color: ${colors.deepSlate};
        }

        .animals-course__stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: ${colors.lightGray};
          text-transform: uppercase;
        }

        .animals-course__stat-divider {
          width: 2px;
          height: 32px;
          background: rgba(0,0,0,0.08);
          border-radius: 1px;
        }

        .animals-course__progress-bar {
          height: 12px;
          background: rgba(0,0,0,0.06);
          border-radius: ${radius.full};
          overflow: hidden;
          margin-bottom: 20px;
        }

        .animals-course__progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${colors.skyBlue}, ${colors.mintGreen});
          border-radius: ${radius.full};
          transition: width 0.5s ease;
        }

        .animals-course__cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 16px 32px;
          background: ${colors.sunshineYellow};
          border: 4px solid white;
          border-radius: ${radius.xl};
          box-shadow: ${shadows.clayYellow};
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          transition: all 0.15s ease;
        }

        .animals-course__cta:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 0 #E5B800, 0 4px 16px rgba(0,0,0,0.1);
        }

        .animals-course__cta:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #E5B800;
        }

        .animals-course__cta svg {
          width: 20px;
          height: 20px;
        }

        /* Mascots */
        .animals-course__mascots {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .animals-course__cover {
          background: ${colors.warmWhite};
          border-radius: ${radius['3xl']};
          border: 4px solid white;
          box-shadow: ${shadows.clay};
          padding: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .animals-course__cover-image {
          width: 100%;
          max-width: 300px;
          height: auto;
        }

        .animals-course__mascot-tiles {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .animals-course__mascot-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          border-radius: ${radius['2xl']};
          border: 3px solid white;
          box-shadow: ${shadows.claySm};
          animation: mascotTileFloat 3s ease-in-out infinite;
          animation-delay: var(--mascot-index, 0) * 0.5s;
        }

        @keyframes mascotTileFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .animals-course__mascot-emoji {
          font-size: 2rem;
        }

        .animals-course__mascot-name {
          font-size: 0.75rem;
          font-weight: 800;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }

        /* Decorations */
        .animals-course__decoration {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .animals-course__decoration--1 {
          width: 200px;
          height: 200px;
          background: ${colors.sunshineYellow};
          opacity: 0.2;
          top: -50px;
          right: -50px;
        }

        .animals-course__decoration--2 {
          width: 150px;
          height: 150px;
          background: ${colors.coralPink};
          opacity: 0.15;
          bottom: 0;
          left: -30px;
        }

        .animals-course__decoration--3 {
          width: 100px;
          height: 100px;
          background: ${colors.skyBlue};
          opacity: 0.2;
          top: 50%;
          right: 10%;
        }

        /* Lessons */
        .animals-course__lessons {
          padding: 0 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .animals-course__section-title {
          font-size: 1.5rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          margin: 0 0 16px;
        }

        .animals-course__lesson-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .animals-course__lesson-card {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          background: ${colors.warmWhite};
          border-radius: ${radius['3xl']};
          border: 4px solid white;
          box-shadow: ${shadows.clay};
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          animation: lessonCardReveal 0.4s ease-out backwards;
          text-align: left;
          width: 100%;
        }

        @keyframes lessonCardReveal {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animals-course__lesson-card:hover {
          transform: translateY(-4px);
          box-shadow: ${shadows.clayLg};
        }

        .animals-course__lesson-card--completed {
          opacity: 0.9;
        }

        .animals-course__lesson-thumbnail {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: ${radius['2xl']};
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .animals-course__lesson-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .animals-course__lesson-completed-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 24px;
          height: 24px;
          background: ${colors.mintGreen};
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .animals-course__lesson-completed-badge svg {
          width: 14px;
          height: 14px;
          color: white;
        }

        .animals-course__lesson-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .animals-course__lesson-order {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1rem;
          color: white;
          flex-shrink: 0;
        }

        .animals-course__lesson-info {
          flex: 1;
          min-width: 0;
        }

        .animals-course__lesson-title {
          font-size: 1.1rem;
          font-weight: 900;
          color: ${colors.deepSlate};
          margin: 0;
        }

        .animals-course__lesson-subtitle {
          font-size: 0.85rem;
          font-weight: 600;
          color: ${colors.mediumGray};
          margin: 4px 0 0;
        }

        .animals-course__lesson-vocab {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }

        .animals-course__lesson-vocab-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: ${colors.lightGray};
          text-transform: uppercase;
        }

        .animals-course__lesson-vocab-emojis {
          display: flex;
          gap: 4px;
        }

        .animals-course__lesson-vocab-emoji {
          font-size: 1rem;
        }

        .animals-course__lesson-xp {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: ${colors.sunshineYellow};
          border-radius: ${radius.full};
          flex-shrink: 0;
        }

        .animals-course__lesson-xp-icon {
          font-size: 0.9rem;
        }

        .animals-course__lesson-xp-value {
          font-weight: 900;
          font-size: 0.85rem;
          color: ${colors.deepSlate};
        }
      `}</style>
    </div>
  );
};

export default AnimalsCourse;
