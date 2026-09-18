import React, { useState } from 'react';
import type { Course, Lesson } from '@/types/course';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';

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
    <section className="animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Small chapter ribbon */}
      <span className="inline-block rounded-full bg-white/85 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow-xs border border-white">
        {locale === 'vi' ? theme.badgeLabelVi : theme.badgeLabelEn} • {copy.lessonSubtitle}
      </span>

      {/* HERO: illustration floats free on an organic blob island — not trapped in a rectangle */}
      {vocabulary.length > 0 && activeItem && (
        <div className="relative mt-2 flex flex-col items-center">
          {/* Organic mint island behind the hero */}
          <div
            className="absolute top-1 h-[210px] w-[230px] rounded-[42%_58%_63%_37%/48%_44%_56%_52%]"
            style={{ background: 'linear-gradient(155deg,#BFF3E1,#8FE6C4)' }}
          />
          <div
            className="absolute top-6 h-[170px] w-[190px] rounded-[55%_45%_40%_60%/45%_55%_45%_55%] bg-white/30"
          />

          {/* Freely floating hero image, no card frame */}
          <div className="relative z-10 h-[190px] w-[190px] flex items-center justify-center drop-shadow-[0_18px_14px_rgba(16,90,70,0.25)]">
            {activeVisual?.imageUrl ? (
              <img
                src={activeVisual.imageUrl}
                alt={activeItem.word_en}
                className="h-full w-full object-contain animate-float"
                loading="lazy"
              />
            ) : (
              <span className="text-8xl">{activeVisual?.emoji || activeItem.emoji || '🔤'}</span>
            )}
          </div>

          {/* "Guess the word" caption pill overlapping the island edge */}
          <span className="relative z-10 -mt-1 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-800 shadow-[0_3px_0_#A7F3D0]">
            {activeItem.word_vi}
            <span className="text-[10px] font-bold text-emerald-600/80">• {theme.mascotName} đố bé!</span>
          </span>

          {/* Title overlaps the island bottom edge */}
          <h1 className="relative z-10 -mt-2 text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {locale === 'vi' ? titleVi : titleEn}
          </h1>
          {locale === 'vi' && titleEn !== titleVi && (
            <p className="relative z-10 text-[11px] font-bold text-slate-500">{titleEn}</p>
          )}
          <p className="relative z-10 mt-0.5 text-xs font-bold text-slate-600 max-w-[280px]">
            {copy.greeting}
          </p>

          {/* Floating mini vocab toy chips, scattered around/below the hero */}
          <div className="relative z-10 mt-3 flex items-end justify-center gap-3">
            {vocabulary.slice(0, 3).map((item, idx) => {
              const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
              const isSelected = idx === selectedVocabIndex;
              const offsets = ['translate-y-1', '-translate-y-1', 'translate-y-1.5'];

              return (
                <button
                  key={item.word_en || idx}
                  type="button"
                  onClick={() => setSelectedVocabIndex(idx)}
                  className={`flex flex-col items-center gap-0.5 transition-all cursor-pointer ${offsets[idx % 3]} ${
                    isSelected ? 'scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center overflow-hidden border-[3px] border-white ${
                      isSelected ? 'shadow-[0_5px_0_#10B981]' : 'shadow-[0_3px_0_#A7F3D0]'
                    }`}
                    style={{ background: isSelected ? '#DCFCE7' : '#F0FDF9' }}
                  >
                    {visual.imageUrl ? (
                      <img src={visual.imageUrl} alt={item.word_en} className="h-full w-full object-contain p-1" loading="lazy" />
                    ) : (
                      <span className="text-lg">{visual.emoji || item.emoji || '🔤'}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-black text-slate-600 capitalize">{item.word_en}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact playful metadata row */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-black text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 border border-white shadow-2xs">
          ⏱️ {lesson.duration_minutes || 5} {copy.mins}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 border border-white shadow-2xs">
          🔤 {vocabulary.length || 3} {copy.wordsToLearn}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 border border-white shadow-2xs"
          style={{ background: theme.pillBg, color: theme.pillText }}
        >
          ⭐ +{lesson.reward?.xp || 25} XP
        </span>
      </div>

      {/* Primary CTA */}
      <div className="mt-3">
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
