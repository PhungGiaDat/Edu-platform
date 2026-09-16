import React from 'react';
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

  const copy = {
    en: {
      lessonSubtitle: `Lesson ${lesson.order}`,
      greeting: `Today we'll learn ${vocabulary.length || 3} new words with ${theme.mascotName}!`,
      duration: 'Duration',
      mins: 'mins',
      wordsToLearn: 'New Words',
      startCta: 'Start Learning Now 🚀',
      preview: 'Today\'s Vocabulary:',
    },
    vi: {
      lessonSubtitle: `Bài học ${lesson.order}`,
      greeting: `Hôm nay chúng ta sẽ học ${vocabulary.length || 3} từ mới cùng ${theme.mascotName}!`,
      duration: 'Thời lượng',
      mins: 'phút',
      wordsToLearn: 'Từ mới',
      startCta: 'Bắt đầu học ngay 🚀',
      preview: 'Từ vựng hôm nay:',
    },
  }[locale];

  const titleVi = lesson.title_vi || lesson.title;
  const titleEn = lesson.title;

  return (
    <section className="space-y-4 animate-fade-in w-full text-center">
      {/* Friendly Adventure Header */}
      <div className="flex flex-col items-center">
        {/* Mascot Avatar with Tactile Clay Badge */}
        <div
          className="mb-3 flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white text-4xl shadow-[0_8px_0_rgba(0,0,0,0.08)] transition-transform hover:scale-105 active:scale-95"
          style={{ background: theme.pillBg }}
        >
          <span className="animate-bounce">{theme.mascotEmoji}</span>
        </div>

        {/* Lesson Order & Category */}
        <span className="inline-block rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 shadow-xs border border-white">
          {locale === 'vi' ? theme.badgeLabelVi : theme.badgeLabelEn} • {copy.lessonSubtitle}
        </span>

        {/* Main Lesson Title */}
        <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
          {locale === 'vi' ? titleVi : titleEn}
        </h1>
        {locale === 'vi' && titleEn !== titleVi && (
          <p className="text-sm font-bold text-slate-500 mt-0.5">{titleEn}</p>
        )}

        {/* Friendly One-sentence Adventure Prompt */}
        <p className="mt-2 text-sm sm:text-base font-bold text-slate-700 max-w-sm mx-auto">
          {copy.greeting}
        </p>
      </div>

      {/* 3 Vocabulary Preview Cards (Image-first with Canonical Media) */}
      {vocabulary.length > 0 && (
        <div className="w-full pt-1">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
            {copy.preview}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {vocabulary.slice(0, 3).map((item, idx) => {
              const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);

              return (
                <div
                  key={item.word_en || idx}
                  className="flex flex-col items-center rounded-2xl border-2 border-white bg-white/95 p-2.5 shadow-[0_4px_0_rgba(0,0,0,0.06)] transition-all hover:scale-102"
                >
                  <div className="h-20 w-full sm:h-24 rounded-xl bg-slate-50 flex items-center justify-center mb-1.5 overflow-hidden border border-slate-100/80">
                    {visual.imageUrl ? (
                      <img
                        src={visual.imageUrl}
                        alt={item.word_en}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl">{visual.emoji || item.emoji || '🔤'}</span>
                    )}
                  </div>
                  <span className="text-sm font-black text-slate-900 capitalize truncate w-full">
                    {item.word_en}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 truncate w-full">
                    {item.word_vi}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Adventure Chips */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <div className="flex items-center gap-1 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-black text-slate-700 shadow-xs border border-white">
          <span>⏱️</span>
          <span>{lesson.duration_minutes || 5} {copy.mins}</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-black text-slate-700 shadow-xs border border-white">
          <span>🔤</span>
          <span>{vocabulary.length || 3} {copy.wordsToLearn}</span>
        </div>
        <div
          className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black shadow-xs border border-white"
          style={{ background: theme.pillBg, color: theme.pillText }}
        >
          <span>⭐</span>
          <span>+{lesson.reward?.xp || 25} XP</span>
        </div>
      </div>

      {/* Big Tactile Clay Start Button */}
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
