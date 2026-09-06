// StepGame - Game step component for LessonPlayer
// Displays a matching game with image choices

import React from 'react';
import { AssetTile } from '@/features/courses/components/CourseLearningBlocks';
import type { AssetReference, Lesson, LessonSessionStepState, SectionGame } from '@/types/course';
import { ActionButton, StatusPill, statusTone } from './StepShared';

export interface StepGameProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  game?: SectionGame | null;
  gameFeedback?: { choiceId?: string; correct: boolean; message: string } | null;
  onGameChoice: (choiceId: string, label: string) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
}

// Copy translations
const COPY = {
  en: {
    game: 'Game',
    active: 'Active',
    retryNeeded: 'Retry',
    gameTitle: 'Quick game',
    gamePrompt: 'Tap the matching picture.',
    hearIt: 'Hear it',
    promptHeard: 'Prompt',
  },
  vi: {
    game: 'Tro choi',
    active: 'Dang hoc',
    retryNeeded: 'Can thu lai',
    gameTitle: 'Tro choi nhanh',
    gamePrompt: 'Cham vao hinh dung nhe.',
    hearIt: 'Nghe mau',
    promptHeard: 'Loi nhac',
  },
};

export const StepGame: React.FC<StepGameProps> = ({
  lesson,
  currentSessionStep,
  locale,
  game,
  gameFeedback,
  onGameChoice,
  onPlayAudio,
}) => {
  const copy = COPY[locale] || COPY.en;

  if (!game) {
    return null;
  }

  return (
    <section className="rounded-[34px] border-4 border-white bg-[#FFF1D7] p-5 shadow-[0_12px_0_rgba(229,184,0,0.16)]">
      <div className="rounded-[28px] border-4 border-white bg-white/90 p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="#FFFFFF">
            {copy.promptHeard}: {game.prompt_audio_text}
          </StatusPill>
          <StatusPill tone={statusTone(currentSessionStep?.status)}>
            {currentSessionStep?.status === 'needs_retry' ? copy.retryNeeded : copy.active}
          </StatusPill>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.gameTitle}</h2>
        <p className="mt-2 font-bold text-slate-600">{copy.gamePrompt}</p>
        <div className="mt-4">
          <ActionButton tone="#EAF5FF" onClick={() => onPlayAudio(game.prompt_audio_text)}>
            {copy.hearIt}
          </ActionButton>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {game.items.map((item, index) => {
          const label = String(item.label || item.word || item.id || `choice-${index + 1}`);
          const itemId = String(item.id || label);
          const selected = gameFeedback?.choiceId === itemId;
          return (
            <button
              key={itemId}
              type="button"
              onClick={() => onGameChoice(itemId, label)}
              className={`rounded-[28px] border-4 p-3 text-left transition ${
                selected
                  ? gameFeedback?.correct
                    ? 'border-emerald-300 bg-white shadow-[0_8px_0_rgba(16,185,129,0.16)]'
                    : 'border-rose-300 bg-white shadow-[0_8px_0_rgba(244,63,94,0.16)]'
                  : 'border-white bg-white/90 shadow-[0_8px_0_rgba(148,163,184,0.12)]'
              }`}
            >
              <AssetTile
                asset={item.image as AssetReference}
                label={label}
                emoji={`0${index + 1}`}
                showAssetMeta
              />
            </button>
          );
        })}
      </div>
      {gameFeedback && (
        <div className="mt-5 rounded-[24px] border-4 border-white bg-white/90 p-4 text-center">
          <p
            className={`text-lg font-black ${gameFeedback.correct ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {gameFeedback.message}
          </p>
        </div>
      )}
    </section>
  );
};

export default StepGame;
