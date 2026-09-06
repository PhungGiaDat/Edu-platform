// StepStory - Story step component for LessonPlayer
// Displays video scenes with narration and navigation

import React from 'react';
import { AssetTile } from '@/features/courses/components/CourseLearningBlocks';
import { SceneViewer } from '@/features/courses/components/SceneViewer';
import type { AssetReference, Lesson, LessonSessionStepState } from '@/types/course';
import { cleanText } from '@/lib/courseLocale';
import { ActionButton, StatusPill, statusTone } from './StepShared';

export interface StepStoryProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  scenes: Array<{
    id: string;
    imageUrl: string;
    thumbnailUrl: string;
    title: string;
    narrationText?: string;
    duration: number;
  }>;
  storyIndex: number;
  totalScenes: number;
  onStoryAdvance: () => Promise<void>;
  onSceneChange: (scene: { id: string; narrationText?: string }) => void;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Copy translations
const COPY = {
  en: {
    story: 'Story',
    scenes: 'Scenes',
    duration: 'Duration',
    storyTitle: 'Short video story',
    completed: 'Completed',
    active: 'Active',
    playLine: 'Play line',
    nextScene: 'Next scene',
    finishStory: 'Finish story',
    stepSaved: 'Progress saved',
  },
  vi: {
    story: 'Truyen',
    scenes: 'Canh',
    duration: 'Thoi luong',
    storyTitle: 'Cau chuyen ngan',
    completed: 'Da xong',
    active: 'Dang hoc',
    playLine: 'Nghe cau nay',
    nextScene: 'Canh tiep theo',
    finishStory: 'Xong cau chuyen',
    stepSaved: 'Da luu tien do',
  },
};

export const StepStory: React.FC<StepStoryProps> = ({
  lesson,
  currentSessionStep,
  locale,
  scenes,
  storyIndex,
  totalScenes,
  onStoryAdvance,
  onSceneChange,
  onPlayAudio,
  busyKey,
}) => {
  const copy = COPY[locale] || COPY.en;
  const currentScene = scenes[storyIndex];

  if (!currentScene) {
    return null;
  }

  return (
    <section className="rounded-[34px] border-4 border-white bg-[#FFE7E3] p-5 shadow-[0_12px_0_rgba(244,114,182,0.14)]">
      {/* SceneViewer component for story scenes */}
      <div className="mb-4">
        <SceneViewer
          scenes={scenes}
          showNavigation={true}
          showThumbnails={true}
          showNarration={true}
          enableAudioSync={false}
          onSceneChange={onSceneChange}
          onComplete={onStoryAdvance}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <AssetTile
          asset={currentScene.imageUrl}
          label={`${copy.story} ${storyIndex + 1}`}
          emoji={`0${storyIndex + 1}`}
          showAssetMeta
          className="min-h-[260px]"
        />
        <div className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(244,114,182,0.10)]">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="#EAF5FF">
              {copy.scenes}: {storyIndex + 1}/{totalScenes}
            </StatusPill>
            <StatusPill tone="#FFF1D7">
              {copy.duration}: {currentScene.duration}s
            </StatusPill>
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-800">
            {cleanText(currentScene.title, copy.storyTitle)}
          </h2>
          <p className="mt-2 text-lg font-bold text-slate-500">
            {cleanText(currentScene.narrationText, currentScene.title)}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionButton tone="#EAF5FF" onClick={() => onPlayAudio(currentScene.title)}>
              {copy.playLine}
            </ActionButton>
            <ActionButton onClick={onStoryAdvance} disabled={busyKey === 'story'}>
              {busyKey === 'story'
                ? copy.stepSaved
                : storyIndex >= totalScenes - 1
                  ? copy.finishStory
                  : copy.nextScene}
            </ActionButton>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StepStory;
