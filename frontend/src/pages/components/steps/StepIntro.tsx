// StepIntro - Intro step component for LessonPlayer
// Displays the lesson introduction with media preview

import React from 'react';
import { LessonMedia } from '@/features/courses/components/LessonMedia';
import type { Lesson } from '@/types/course';
import { cleanText, lessonDescription } from '@/lib/courseLocale';
import { ActionButton, PracticeFeedback, StatusPill, statusTone } from './StepShared';
import type { LessonMedia as LessonMediaType, LessonSessionStepState } from './types';

export interface StepIntroProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  onIntroComplete: () => Promise<void>;
  onIntroSkip: () => Promise<void>;
  busyKey: string | null;
  lessonMedia?: LessonMediaType | null;
}

// Copy translations
const COPY = {
  en: {
    intro: 'Intro',
    completed: 'Completed',
    active: 'Active',
    introTitle: 'Watch & Learn',
    descriptionFallback: 'Short learning block for young learners.',
    stepSaved: 'Progress saved',
    introComplete: 'Continue to vocabulary',
  },
  vi: {
    intro: 'Gioi thieu',
    completed: 'Da xong',
    active: 'Dang hoc',
    introTitle: 'Xem va hoc',
    descriptionFallback: 'Bai hoc ngan danh cho tre nho.',
    stepSaved: 'Da luu tien do',
    introComplete: 'Tiep tuc tu moi',
  },
};

export const StepIntro: React.FC<StepIntroProps> = ({
  lesson,
  currentSessionStep,
  locale,
  onIntroComplete,
  onIntroSkip,
  busyKey,
  lessonMedia,
}) => {
  const copy = COPY[locale] || COPY.en;

  // Build media prop from lesson data
  const media = lessonMedia || {
    video_url: lesson.video_url,
    video_thumbnail_url: lesson.video_thumbnail,
    video_duration_seconds: lesson.video_duration,
    intro_video_url: lesson.intro_video_url,
    intro_video_thumbnail: lesson.intro_video_thumbnail,
    intro_video_duration: lesson.video_duration,
    images: lesson.images,
    scene_images: lesson.scene_images,
    auto_play_intro: true,
  };

  return (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#FFF8D8] p-5 shadow-[0_12px_0_rgba(229,184,0,0.14)]">
      <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(229,184,0,0.08)]">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="#FFF1D7">{copy.intro}</StatusPill>
          <StatusPill tone={statusTone(currentSessionStep?.status)}>
            {currentSessionStep?.status === 'completed' ? copy.completed : copy.active}
          </StatusPill>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.introTitle}</h2>
        <p className="mt-2 font-bold leading-7 text-slate-600">
          {cleanText(lessonDescription(lesson, locale), copy.descriptionFallback)}
        </p>
      </div>

      {/* Duolingo-style media component */}
      <LessonMedia
        media={media}
        autoPlay
        onIntroComplete={onIntroComplete}
        onIntroSkip={onIntroSkip}
        locale={locale}
      />

      <div className="flex justify-end">
        <ActionButton
          onClick={onIntroComplete}
          disabled={busyKey === 'intro' || currentSessionStep?.status === 'completed'}
        >
          {busyKey === 'intro'
            ? copy.stepSaved
            : currentSessionStep?.status === 'completed'
              ? copy.introComplete
              : copy.introComplete}
        </ActionButton>
      </div>
    </section>
  );
};

export default StepIntro;
