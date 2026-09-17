import React, { useState } from 'react';
import type { Course, Lesson } from '@/types/course';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { FeedbackMascot } from './FeedbackMascot';

interface WarmUpSectionProps {
  lesson: Lesson;
  course?: Course | null;
  onStart: () => void;
  locale: 'en' | 'vi';
}

export const WarmUpSection: React.FC<WarmUpSectionProps> = ({
  lesson,
  course,
  onStart,
  locale,
}) => {
  const theme: CourseThemeConfig = getCourseTheme(course);
  const vocabulary = lesson.vocabulary || [];
  const [selectedVocabIndex, setSelectedVocabIndex] = useState(0);

  const copy = {
    en: {
      lessonSubtitle: `Lesson ${lesson.order}`,
      greeting: `Discover new words with ${theme.mascotName}!`,
      duration: 'Duration',
      mins: 'mins',
      wordsToLearn: 'New Words',
      startCta: 'Bắt đầu học ngay 🚀',
      preview: 'Vocabulary preview:',
    },
    vi: {
      lessonSubtitle: `Bài học ${lesson.order}`,
      greeting: `Khám phá các từ vựng mới cùng ${theme.mascotName}!`,
      duration: 'Thời lượng',
      mins: 'phút',
      wordsToLearn: 'từ mới',
      startCta: 'Bắt đầu học ngay 🚀',
      preview: 'Từ vựng bài học:',
    },
  }[locale];

  const titleVi = lesson.title_vi || lesson.title;
  const titleEn = lesson.title;

  const activeItem = vocabulary[selectedVocabIndex] || vocabulary[0];
  const activeVisual = activeItem
    ? resolveVocabularyVisual(activeItem.word_en, vocabulary, activeItem.image)
    : null;

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Friendly Header with Small Companion Bubble (No large floating mascot) */}
      <div className="flex flex-col items-center">
        {/* Small companion badge near heading */}
        <div className="mb-1.5">
          <FeedbackMascot
            mode="companion"
            mascotEmoji={theme.mascotEmoji}
            mascotName={theme.mascotName}
            message={`${theme.mascotName} cùng học với bé!`}
          />
        </div>

        {/* Small lesson/chapter pill */}
        <span className="inline-block rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-500 shadow-xs border border-white">
          {locale === 'vi' ? theme.badgeLabelVi : theme.badgeLabelEn} • {copy.lessonSubtitle}
        </span>

        {/* Large Playful Title */}
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          {locale === 'vi' ? titleVi : titleEn}
        </h1>
        {locale === 'vi' && titleEn !== titleVi && (
          <p className="text-xs font-bold text-slate-500 mt-0.5">{titleEn}</p>
        )}

        {/* One short Vietnamese helper sentence */}
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600 max-w-sm mx-auto">
          {copy.greeting}
        </p>
      </div>

      {/* VISUAL FIRST: One Prominent Visual Panel + 3 Preview Chips */}
      {vocabulary.length > 0 && activeItem && (
        <div className="w-full">
          {/* Prominent Visual Hero Panel */}
          <div className="rounded-3xl border-4 border-white bg-white/95 p-4 shadow-[0_8px_0_rgba(0,0,0,0.06)] flex flex-col items-center">
            <div className="relative w-full aspect-[4/3] max-h-[190px] rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-2">
              {activeVisual?.imageUrl ? (
                <img
                  src={activeVisual.imageUrl}
                  alt={activeItem.word_en}
                  className="h-full w-full object-contain p-2 transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <span className="text-6xl">{activeVisual?.emoji || activeItem.emoji || '🔤'}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-amber-600">
                {activeItem.word_vi}
              </span>
              <span className="text-xs font-bold text-slate-400">
                • {theme.mascotName} đố bé biết từ này!
              </span>
            </div>
          </div>

          {/* 3 Small Word Chips / Preview Thumbnails (Tappable to switch preview) */}
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            {vocabulary.slice(0, 3).map((item, idx) => {
              const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
              const isSelected = idx === selectedVocabIndex;

              return (
                <button
                  key={item.word_en || idx}
                  type="button"
                  onClick={() => setSelectedVocabIndex(idx)}
                  className={`flex items-center gap-1.5 rounded-xl border-2 p-1.5 transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'border-sky-400 bg-sky-50 shadow-xs ring-2 ring-sky-200 scale-102'
                      : 'border-white bg-white/90 hover:bg-white text-slate-600 shadow-2xs'
                  }`}
                >
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                    {visual.imageUrl ? (
                      <img
                        src={visual.imageUrl}
                        alt={item.word_en}
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-sm">{visual.emoji || item.emoji || '🔤'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 capitalize truncate">
                      {item.word_en}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 truncate">
                      {item.word_vi}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtle Compressed Metadata Row */}
      <div className="flex items-center justify-center gap-2 text-xs font-black text-slate-500 py-0.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 border border-white shadow-2xs">
          ⏱️ {lesson.duration_minutes || 5} {copy.mins}
        </span>
        <span className="text-slate-300">•</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 border border-white shadow-2xs">
          🔤 {vocabulary.length || 3} {copy.wordsToLearn}
        </span>
        <span className="text-slate-300">•</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 border border-white shadow-2xs"
          style={{ background: theme.pillBg, color: theme.pillText }}
        >
          ⭐ +{lesson.reward?.xp || 25} XP
        </span>
      </div>

      {/* Primary Dominant CTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onStart}
          className="w-full min-h-[56px] rounded-2xl border-2 border-white px-6 text-lg font-black text-white shadow-[0_6px_0_rgba(0,0,0,0.18)] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          style={{ background: theme.accentGradient }}
        >
          {copy.startCta}
        </button>
      </div>
    </section>
  );
};
