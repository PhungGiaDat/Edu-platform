// StepWatch - Watch/Video step component for LessonPlayer
// Displays the main lesson video with player controls

import React from 'react';
import { LessonVideoPlayer } from '@/features/courses/components/LessonVideoPlayer';
import type { Lesson, LessonSessionStepState } from '@/types/course';
import { cleanText, lessonDescription, lessonTitle } from '@/lib/courseLocale';
import { ActionButton, StatusPill, statusTone } from './StepShared';

export interface StepWatchProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  videoUrl?: string | null;
  videoPoster?: string | null;
  onWatchComplete: () => Promise<void>;
  busyKey: string | null;
}

// Copy translations
const COPY = {
  en: {
    watch: 'Watch',
    completed: 'Completed',
    active: 'Active',
    videoReady: 'Video ready',
    stepGuide: 'One small step at a time.',
    descriptionFallback: 'Short learning block for young learners.',
    markWatched: 'I watched it',
    watchedDone: 'Watch complete',
    stepSaved: 'Progress saved',
  },
  vi: {
    watch: 'Xem',
    completed: 'Da xong',
    active: 'Dang hoc',
    videoReady: 'Video san sang',
    stepGuide: 'Moi buoc mot chut thoi.',
    descriptionFallback: 'Bai hoc ngan danh cho tre nho.',
    markWatched: 'Con da xem xong',
    watchedDone: 'Da xem xong',
    stepSaved: 'Da luu tien do',
  },
};

export const StepWatch: React.FC<StepWatchProps> = ({
  lesson,
  currentSessionStep,
  locale,
  videoUrl,
  videoPoster,
  onWatchComplete,
  busyKey,
}) => {
  const copy = COPY[locale] || COPY.en;

  // Use video lesson preview if no direct video URL
  const showVideoLesson = !videoUrl && lesson.videoLesson;

  return (
    <section className="rounded-[34px] border-4 border-white bg-[#EAF5FF] p-5 shadow-[0_12px_0_rgba(91,141,239,0.14)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-[28px] border-4 border-white bg-[#1A2744] p-4 shadow-[0_8px_0_rgba(15,23,42,0.18)]">
          {videoUrl ? (
            <LessonVideoPlayer
              src={videoUrl}
              poster={videoPoster}
              onEnded={onWatchComplete}
              onTimeUpdate={() => {
                // Track video progress if needed
              }}
            />
          ) : showVideoLesson ? (
            <LessonMediaPreview
              title={cleanText(lesson.videoLesson!.title, lessonTitle(lesson, locale))}
              asset={lesson.videoLesson!.video}
              thumbnail={lesson.videoLesson!.thumbnail}
            />
          ) : null}
        </div>
        <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(91,141,239,0.10)]">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="#EEF9E7">{copy.videoReady}</StatusPill>
            <StatusPill tone={statusTone(currentSessionStep?.status)}>
              {currentSessionStep?.status === 'completed' ? copy.completed : copy.active}
            </StatusPill>
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.watch}</h2>
          <p className="mt-2 font-bold leading-7 text-slate-600">
            {cleanText(lessonDescription(lesson, locale), copy.descriptionFallback)}
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-500">{copy.stepGuide}</p>
          <div className="mt-5">
            <ActionButton
              onClick={onWatchComplete}
              disabled={busyKey === 'watch' || currentSessionStep?.status === 'completed'}
            >
              {busyKey === 'watch'
                ? copy.stepSaved
                : currentSessionStep?.status === 'completed'
                  ? copy.watchedDone
                  : copy.markWatched}
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
};

// Internal preview component for video lessons
const LessonMediaPreview: React.FC<{
  title: string;
  asset?: unknown;
  thumbnail?: unknown;
}> = ({ title }) => {
  return (
    <div className="flex aspect-video items-center justify-center rounded-[26px] bg-[#6EB9FF] px-4 text-center text-slate-900 shadow-[inset_0_2px_0_rgba(255,255,255,0.55)]">
      <div>
        <div className="text-6xl font-black">Play</div>
        <p className="mt-3 text-2xl font-black">{title}</p>
      </div>
    </div>
  );
};

export default StepWatch;
