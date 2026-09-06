// StepSay - Pronunciation/Say step component for LessonPlayer
// Displays pronunciation practice with target words

import React from 'react';
import type {
  AssetReference,
  Lesson,
  LessonSessionStepState,
  PronunciationTask,
} from '@/types/course';
import { ActionButton, PracticeFeedback, StatusPill, statusTone } from './StepShared';
import type { PracticeSummary } from './StepShared';

export interface StepSayProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  pronunciation?: PronunciationTask | null;
  sayPractice: Record<string, PracticeSummary>;
  onSayPractice: (word: string) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Copy translations
const COPY = {
  en: {
    say: 'Say',
    speakingDone: 'Speaking complete',
    sayTitle: 'Say it aloud',
    sayPractice: 'Say the word clearly and confidently.',
    hearIt: 'Hear it',
    speakNow: 'Speak now',
    listening: 'Listening...',
    promptHeard: 'Prompt',
    passed: 'Great job!',
  },
  vi: {
    say: 'Noi',
    speakingDone: 'Da xong phan noi',
    sayTitle: 'Noi that to',
    sayPractice: 'Noi ro rang va tu tin nhe.',
    hearIt: 'Nghe mau',
    speakNow: 'Noi ngay',
    listening: 'Dang nghe...',
    promptHeard: 'Loi nhac',
    passed: 'Gioi qua!',
  },
};

const normalizeKey = (value: string) => value.trim().toLowerCase();

export const StepSay: React.FC<StepSayProps> = ({
  lesson,
  currentSessionStep,
  locale,
  pronunciation,
  sayPractice,
  onSayPractice,
  onPlayAudio,
  busyKey,
}) => {
  const copy = COPY[locale] || COPY.en;

  if (!pronunciation) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#EAF5FF] p-5 shadow-[0_12px_0_rgba(91,141,239,0.14)]">
      <div className="rounded-[28px] border-4 border-white bg-white/90 p-5">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="#FFFFFF">
            {copy.promptHeard}: {pronunciation.prompt_audio_text}
          </StatusPill>
          <StatusPill tone="#EEF9E7">{pronunciation.pass_score}%</StatusPill>
        </div>
        <h2 className="mt-4 text-3xl font-black text-slate-800">{copy.sayTitle}</h2>
        <p className="mt-2 font-bold text-slate-600">{copy.sayPractice}</p>
        <div className="mt-4">
          <ActionButton
            tone="#EAF5FF"
            onClick={() =>
              onPlayAudio(pronunciation.prompt_audio_text, pronunciation.audio)
            }
          >
            {copy.hearIt}
          </ActionButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {pronunciation.target_words.map((word) => {
          const key = normalizeKey(word);
          const practice = sayPractice[key];
          return (
            <article
              key={word}
              className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_8px_0_rgba(91,141,239,0.10)]"
            >
              <div className="flex flex-wrap gap-2">
                {practice?.passed && (
                  <StatusPill tone="#EEF9E7">{copy.speakingDone}</StatusPill>
                )}
              </div>
              <h3 className="mt-4 text-4xl font-black text-slate-800">{word}</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <ActionButton tone="#EAF5FF" onClick={() => onPlayAudio(word)}>
                  {copy.hearIt}
                </ActionButton>
                <ActionButton
                  onClick={() => onSayPractice(word)}
                  disabled={busyKey === `say:${key}`}
                >
                  {busyKey === `say:${key}` ? copy.listening : copy.speakNow}
                </ActionButton>
              </div>
              <div className="mt-4">
                <PracticeFeedback result={practice} emptyText={copy.sayPractice} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default StepSay;
