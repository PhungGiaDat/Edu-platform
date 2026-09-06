// StepWords - Words/Vocabulary step component for LessonPlayer
// Displays vocabulary items with pronunciation practice

import React from 'react';
import { AssetTile } from '@/features/courses/components/CourseLearningBlocks';
import { LessonImageGallery } from '@/features/courses/components/LessonImageGallery';
import type { AssetReference, Lesson, LessonSessionStepState, VocabularyItem } from '@/types/course';
import { cleanText } from '@/lib/courseLocale';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { ActionButton, PracticeFeedback, StatusPill, statusTone } from './StepShared';
import type { PracticeSummary } from './StepShared';

export interface StepWordsProps {
  lesson: Lesson;
  currentSessionStep?: LessonSessionStepState;
  locale: string;
  wordPractice: Record<string, PracticeSummary>;
  onWordPractice: (item: VocabularyItem) => Promise<void>;
  onPlayAudio: (text: string, asset?: AssetReference | null) => Promise<void>;
  busyKey: string | null;
}

// Copy translations
const COPY = {
  en: {
    words: 'Words',
    audioReady: 'Audio ready',
    wordDone: 'Word complete',
    wordPractice: 'Practice this word with your voice.',
    hearIt: 'Hear it',
    trySpeaking: 'Try speaking',
    listening: 'Listening...',
  },
  vi: {
    words: 'Tu moi',
    audioReady: 'Am thanh san sang',
    wordDone: 'Da xong tu nay',
    wordPractice: 'Tap noi tu nay bang giong cua con.',
    hearIt: 'Nghe mau',
    trySpeaking: 'Thu noi',
    listening: 'Dang nghe...',
  },
};

const normalizeKey = (value: string) => value.trim().toLowerCase();

export const StepWords: React.FC<StepWordsProps> = ({
  lesson,
  currentSessionStep,
  locale,
  wordPractice,
  onWordPractice,
  onPlayAudio,
  busyKey,
}) => {
  const copy = COPY[locale] || COPY.en;

  // Build vocabulary images for gallery
  const vocabularyImages = lesson.vocabulary.map((item) => ({
    id: item.word_en,
    src: getAssetCandidateUrls(item.image)[0] || '',
    thumbnail: getAssetCandidateUrls(item.image)[0] || '',
    alt: item.word_en,
    caption: item.word_en,
  }));

  return (
    <section className="space-y-4 rounded-[34px] border-4 border-white bg-[#EEF9E7] p-5 shadow-[0_12px_0_rgba(125,199,96,0.14)]">
      {/* Image gallery for vocabulary */}
      {vocabularyImages.length > 0 && (
        <div className="mb-4">
          <LessonImageGallery
            images={vocabularyImages}
            columns={3}
            gap="sm"
            enableLightbox={true}
            enableZoom={true}
            enableSwipe={true}
          />
        </div>
      )}
      {lesson.vocabulary.map((item) => {
        const key = normalizeKey(item.word_en);
        const practice = wordPractice[key];
        return (
          <article
            key={item.word_en}
            className="rounded-[30px] border-4 border-white bg-[#FFF1D7] p-4 shadow-[0_8px_0_rgba(148,163,184,0.08)]"
          >
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <AssetTile
                asset={item.image}
                label={item.word_en}
                emoji={item.word_en.slice(0, 2).toUpperCase()}
                showAssetMeta
                className="min-h-[220px]"
              />
              <div className="space-y-4 rounded-[24px] border-4 border-white bg-white/90 p-5">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="#EAF5FF">{copy.audioReady}</StatusPill>
                  {practice?.passed && (
                    <StatusPill tone="#EEF9E7">{copy.wordDone}</StatusPill>
                  )}
                </div>
                <div>
                  <h3 className="text-4xl font-black text-slate-800">{item.word_en}</h3>
                  <p className="mt-2 text-lg font-bold text-slate-500">
                    {cleanText(item.word_vi, item.word_en)}
                  </p>
                  <p className="mt-4 rounded-[20px] bg-slate-50 px-4 py-3 text-sm font-bold text-sky-700">
                    {cleanText(item.simple_sentence, item.word_en)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <ActionButton tone="#EAF5FF" onClick={() => onPlayAudio(item.word_en, item.audio)}>
                    {copy.hearIt}
                  </ActionButton>
                  <ActionButton
                    onClick={() => onWordPractice(item)}
                    disabled={busyKey === `word:${key}`}
                  >
                    {busyKey === `word:${key}` ? copy.listening : copy.trySpeaking}
                  </ActionButton>
                </div>
                <PracticeFeedback result={practice} emptyText={copy.wordPractice} />
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
};

export default StepWords;
