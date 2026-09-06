// StepRead - Read Aloud step component for LessonPlayer
// Displays pages with pronunciation practice for reading

import React from 'react';
import { AssetTile } from '@/features/courses/components/CourseLearningBlocks';
import type {
  AssetReference,
  Lesson,
  LessonSessionStepState,
  ReadAloudStory,
} from '@/types/course';
import { cleanText } from '@/lib/courseLocale';
import { ActionButton, PracticeFeedback, StatusPill, statusTone } from './StepShared';
import type { PracticeSummary } from './StepShared';

export interface StepReadProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  readAloudStory?: ReadAloudStory | null;
  readPractice: Record<string, PracticeSummary>;
  onReadPractice: (pageId: string, text: string, highlightedWords: string[]) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Copy translations
const COPY = {
  en: {
    read: 'Read',
    audioReady: 'Audio ready',
    pageDone: 'Page complete',
    pagePractice: 'Read the sentence out loud.',
    hearIt: 'Hear it',
    readAloud: 'Read aloud',
    listening: 'Listening...',
  },
  vi: {
    read: 'Doc',
    audioReady: 'Am thanh san sang',
    pageDone: 'Da xong trang nay',
    pagePractice: 'Doc to cau nay.',
    hearIt: 'Nghe mau',
    readAloud: 'Doc thanh tieng',
    listening: 'Dang nghe...',
  },
};

export const StepRead: React.FC<StepReadProps> = ({
  lesson,
  currentSessionStep,
  locale,
  readAloudStory,
  readPractice,
  onReadPractice,
  onPlayAudio,
  busyKey,
}) => {
  const copy = COPY[locale] || COPY.en;

  if (!readAloudStory) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#FFE7E3] p-5 shadow-[0_12px_0_rgba(244,114,182,0.14)]">
      {readAloudStory.pages.map((page) => {
        const practice = readPractice[page.page_id];
        return (
          <article
            key={page.page_id}
            className="rounded-[30px] border-4 border-white bg-[#FFF1D7] p-4 shadow-[0_8px_0_rgba(148,163,184,0.08)]"
          >
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <AssetTile
                asset={page.image}
                label={`${copy.read} ${page.order}`}
                emoji={`P${page.order}`}
                showAssetMeta
                className="min-h-[220px]"
              />
              <div className="space-y-4 rounded-[24px] border-4 border-white bg-white/90 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="#EAF5FF">{copy.audioReady}</StatusPill>
                  {practice?.passed && (
                    <StatusPill tone="#EEF9E7">{copy.pageDone}</StatusPill>
                  )}
                </div>
                <p className="text-3xl font-black text-slate-800">
                  {cleanText(page.text_en, `Page ${page.order}`)}
                </p>
                <p className="text-lg font-bold text-slate-500">
                  {cleanText(page.text_vi, page.text_en)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {page.highlighted_words.map((word) => (
                    <StatusPill key={word} tone="#FFF1D7">
                      {word}
                    </StatusPill>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton tone="#EAF5FF" onClick={() => onPlayAudio(page.text_en, page.audio)}>
                    {copy.hearIt}
                  </ActionButton>
                  <ActionButton
                    onClick={() =>
                      onReadPractice(page.page_id, page.text_en, page.highlighted_words)
                    }
                    disabled={busyKey === `read:${page.page_id}`}
                  >
                    {busyKey === `read:${page.page_id}` ? copy.listening : copy.readAloud}
                  </ActionButton>
                </div>
                <PracticeFeedback result={practice} emptyText={copy.pagePractice} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
};

export default StepRead;
