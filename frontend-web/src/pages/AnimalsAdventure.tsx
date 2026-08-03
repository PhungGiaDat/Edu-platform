/**
 * AnimalsAdventure.tsx
 * 
 * Dedicated landing page for the Animals Adventure course.
 * Shows course overview with 5 lesson cards (Cat, Dog, Bird, Fish, Rabbit).
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimalsCourse, useAnimalsProgress } from '@/hooks/useAnimalsCourse';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
import { AnimalsHero } from '@/components/animals/AnimalsHero';
import { AnimalsLessonCard } from '@/components/animals/AnimalsLessonCard';
import '@/styles/animals.css';

const ANIMALS_COURSE_ID = 'animals-adventure-en-5-7';

const copy = {
  en: {
    courseTitle: 'Animals Adventure',
    courseSubtitle: 'Learn animal names and sounds',
    ageRange: 'Ages 5-7',
    startJourney: 'Start Journey',
    continueJourney: 'Continue',
    lessonsCompleted: 'lessons completed',
    totalXp: 'Total XP',
    vocabulary: 'Vocabulary',
    xp: 'XP',
    loading: 'Loading course...',
    error: 'Could not load course. Please try again.',
    retry: 'Try Again',
  },
  vi: {
    courseTitle: 'Hành trình động vật',
    courseSubtitle: 'Học tên và âm thanh con vật',
    ageRange: 'Tuổi 5-7',
    startJourney: 'Bắt đầu',
    continueJourney: 'Tiếp tục',
    lessonsCompleted: 'bài đã hoàn thành',
    totalXp: 'Tổng XP',
    vocabulary: 'Từ vựng',
    xp: 'XP',
    loading: 'Đang tải khóa học...',
    error: 'Không tải được khóa học. Vui lòng thử lại.',
    retry: 'Thử lại',
  },
} as const;

type Locale = keyof typeof copy;

/**
 * Fallback course data for when the API is not available
 */
const fallbackCourse = {
  course_id: ANIMALS_COURSE_ID,
  title: 'Animals Adventure',
  description: 'Learn animal names, sounds, and simple sentences',
  subtitle_vi: 'Học tên, âm thanh và câu đơn giản về động vật',
  theme: 'Animals and Nature',
  category_key: 'nature',
  category_label: 'Animals and Nature',
  category_icon: 'AN',
  age_range: '5-7',
  level: 'beginner' as const,
  description_vi: 'Học tên con vật, âm thanh và câu đơn giản',
  thumbnail_url: '/assets/animals/course-cover.svg',
  catalogPreview: [],
  studentTestimonials: [],
  lessons: [
    {
      lesson_id: 'learn-the-cat',
      title: 'Cat',
      title_vi: 'Con mèo',
      description: 'Learn the word Cat and meet the cat mascot',
      order: 1,
      duration_minutes: 8,
      video_duration: 0,
      vocabulary: [
        { word_en: 'Cat', word_vi: 'con mèo', emoji: '🐱', simple_sentence: 'The cat is small.' },
        { word_en: 'Dog', word_vi: 'con chó', emoji: '🐶', simple_sentence: 'The dog is big.' },
        { word_en: 'Bird', word_vi: 'con chim', emoji: '🐦', simple_sentence: 'The bird can fly.' },
        { word_en: 'Fish', word_vi: 'con cá', emoji: '🐟', simple_sentence: 'The fish swims.' },
        { word_en: 'Rabbit', word_vi: 'con thỏ', emoji: '🐰', simple_sentence: 'The rabbit hops.' },
      ],
      quiz: [],
      images: [],
      scene_images: [],
      generatedMedia: [],
    },
    {
      lesson_id: 'learn-the-dog',
      title: 'Dog',
      title_vi: 'Con chó',
      description: 'Learn the word Dog and meet the dog mascot',
      order: 2,
      duration_minutes: 8,
      video_duration: 0,
      vocabulary: [
        { word_en: 'Cat', word_vi: 'con mèo', emoji: '🐱', simple_sentence: 'The cat is small.' },
        { word_en: 'Dog', word_vi: 'con chó', emoji: '🐶', simple_sentence: 'The dog is big.' },
        { word_en: 'Bird', word_vi: 'con chim', emoji: '🐦', simple_sentence: 'The bird can fly.' },
        { word_en: 'Fish', word_vi: 'con cá', emoji: '🐟', simple_sentence: 'The fish swims.' },
        { word_en: 'Rabbit', word_vi: 'con thỏ', emoji: '🐰', simple_sentence: 'The rabbit hops.' },
      ],
      quiz: [],
      images: [],
      scene_images: [],
      generatedMedia: [],
    },
    {
      lesson_id: 'learn-the-bird',
      title: 'Bird',
      title_vi: 'Con chim',
      description: 'Learn the word Bird and meet the bird mascot',
      order: 3,
      duration_minutes: 8,
      video_duration: 0,
      vocabulary: [
        { word_en: 'Cat', word_vi: 'con mèo', emoji: '🐱', simple_sentence: 'The cat is small.' },
        { word_en: 'Dog', word_vi: 'con chó', emoji: '🐶', simple_sentence: 'The dog is big.' },
        { word_en: 'Bird', word_vi: 'con chim', emoji: '🐦', simple_sentence: 'The bird can fly.' },
        { word_en: 'Fish', word_vi: 'con cá', emoji: '🐟', simple_sentence: 'The fish swims.' },
        { word_en: 'Rabbit', word_vi: 'con thỏ', emoji: '🐰', simple_sentence: 'The rabbit hops.' },
      ],
      quiz: [],
      images: [],
      scene_images: [],
      generatedMedia: [],
    },
    {
      lesson_id: 'learn-the-fish',
      title: 'Fish',
      title_vi: 'Con cá',
      description: 'Learn the word Fish and meet the fish mascot',
      order: 4,
      duration_minutes: 8,
      video_duration: 0,
      vocabulary: [
        { word_en: 'Cat', word_vi: 'con mèo', emoji: '🐱', simple_sentence: 'The cat is small.' },
        { word_en: 'Dog', word_vi: 'con chó', emoji: '🐶', simple_sentence: 'The dog is big.' },
        { word_en: 'Bird', word_vi: 'con chim', emoji: '🐦', simple_sentence: 'The bird can fly.' },
        { word_en: 'Fish', word_vi: 'con cá', emoji: '🐟', simple_sentence: 'The fish swims.' },
        { word_en: 'Rabbit', word_vi: 'con thỏ', emoji: '🐰', simple_sentence: 'The rabbit hops.' },
      ],
      quiz: [],
      images: [],
      scene_images: [],
      generatedMedia: [],
    },
    {
      lesson_id: 'learn-the-rabbit',
      title: 'Rabbit',
      title_vi: 'Con thỏ',
      description: 'Learn the word Rabbit and meet the rabbit mascot',
      order: 5,
      duration_minutes: 8,
      video_duration: 0,
      vocabulary: [
        { word_en: 'Cat', word_vi: 'con mèo', emoji: '🐱', simple_sentence: 'The cat is small.' },
        { word_en: 'Dog', word_vi: 'con chó', emoji: '🐶', simple_sentence: 'The dog is big.' },
        { word_en: 'Bird', word_vi: 'con chim', emoji: '🐦', simple_sentence: 'The bird can fly.' },
        { word_en: 'Fish', word_vi: 'con cá', emoji: '🐟', simple_sentence: 'The fish swims.' },
        { word_en: 'Rabbit', word_vi: 'con thỏ', emoji: '🐰', simple_sentence: 'The rabbit hops.' },
      ],
      quiz: [],
      images: [],
      scene_images: [],
      generatedMedia: [],
    },
  ],
  is_published: true,
} as const;

export const AnimalsAdventure: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const ui = copy[locale as Locale] || copy.en;

  const { data: course, isLoading, error, refetch } = useAnimalsCourse();
  const { data: progress } = useAnimalsProgress(user?.id);

  const displayCourse = course || fallbackCourse;
  const completedLessons = progress?.completed_lessons?.length || 0;
  const totalXp = progress?.total_xp || 0;

  const lessons = useMemo(() => {
    return displayCourse.lessons.map(lesson => {
      const isCompleted = progress?.completed_lessons?.includes(lesson.lesson_id) || false;
      const isInProgress = progress?.current_lesson_id === lesson.lesson_id;
      const vocabPreview = lesson.vocabulary?.slice(0, 5) || [];
      
      return {
        ...lesson,
        isCompleted,
        isInProgress,
        vocabPreview,
        xpReward: 50,
      };
    });
  }, [displayCourse.lessons, progress]);

  const handleLessonClick = (lessonId: string) => {
    navigate(`/courses/animals-adventure/lessons/${lessonId}`);
  };

  const handleStartJourney = () => {
    if (lessons.length > 0) {
      const firstLesson = progress?.current_lesson_id 
        ? lessons.find(l => l.lesson_id === progress.current_lesson_id) 
        : lessons[0];
      if (firstLesson) {
        navigate(`/courses/animals-adventure/lessons/${firstLesson.lesson_id}`);
      }
    }
  };

  if (isLoading && !course) {
    return (
      <div className="animals-page">
        <div className="animals-loading">
          <div className="animals-loading__spinner" />
          <p>{ui.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animals-page">
      <AnimalsHero
        courseTitle={ui.courseTitle}
        courseSubtitle={ui.courseSubtitle}
        ageRange={ui.ageRange}
        completedLessons={completedLessons}
        totalLessons={lessons.length}
        totalXp={totalXp}
        onStartJourney={handleStartJourney}
        startLabel={completedLessons > 0 ? ui.continueJourney : ui.startJourney}
      />

      <section className="animals-lessons">
        <div className="animals-lessons__header">
          <h2 className="animals-lessons__title">
            {locale === 'vi' ? '5 Bài học' : '5 Lessons'}
          </h2>
          <p className="animals-lessons__subtitle">
            {locale === 'vi' 
              ? `${completedLessons}/${lessons.length} bài đã hoàn thành`
              : `${completedLessons}/${lessons.length} lessons completed`}
          </p>
        </div>

        <div className="animals-lessons__grid">
          {lessons.map((lesson, index) => (
            <AnimalsLessonCard
              key={lesson.lesson_id}
              lessonId={lesson.lesson_id}
              title={locale === 'vi' ? lesson.title_vi : lesson.title}
              thumbnailUrl={`/assets/animals/mascots/${lesson.title.toLowerCase()}.svg`}
              vocabPreview={lesson.vocabPreview.map(v => v.emoji)}
              xpReward={lesson.xpReward}
              isCompleted={lesson.isCompleted}
              isInProgress={lesson.isInProgress}
              onClick={() => handleLessonClick(lesson.lesson_id)}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default AnimalsAdventure;
