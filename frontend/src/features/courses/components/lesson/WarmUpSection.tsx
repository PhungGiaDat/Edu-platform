import React from 'react';
import type { Course, Lesson } from '@/types/course';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

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

  const copy = {
    en: {
      greeting: `Welcome to Lesson ${lesson.order}!`,
      subGreeting: `Let's explore with ${theme.mascotName}!`,
      duration: 'Duration',
      mins: 'mins',
      wordsToLearn: 'New Words',
      reward: 'Reward',
      objectives: 'What we will explore:',
      startCta: 'Start Learning Now',
      preview: 'Vocabulary in this lesson:',
    },
    vi: {
      greeting: `Chào mừng bé đến với Bài học ${lesson.order}!`,
      subGreeting: `Cùng học tiếng Anh vui nhộn với ${theme.mascotName}!`,
      duration: 'Thời lượng',
      mins: 'phút',
      wordsToLearn: 'Từ vựng mới',
      reward: 'Phần thưởng',
      objectives: 'Bé sẽ cùng khám phá:',
      startCta: 'Bắt đầu học ngay',
      preview: 'Từ vựng trọng tâm trong bài:',
    },
  }[locale];

  return (
    <section className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Hero Welcome Card */}
      <div
        className="rounded-3xl border-4 p-6 sm:p-8 shadow-lg text-center relative overflow-hidden"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Playful Background Decorative Glow */}
        <div
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-30 blur-2xl pointer-events-none"
          style={{ background: theme.primaryAccent }}
        />

        {/* Mascot Avatar with Bounce */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white text-4xl shadow-md bg-white">
          <span className="transform hover:scale-110 transition-transform cursor-pointer">
            {theme.mascotEmoji}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {locale === 'vi' && lesson.title_vi ? lesson.title_vi : lesson.title}
        </h2>
        <p className="mt-1 text-base font-bold" style={{ color: theme.primaryAccent }}>
          {locale === 'vi' ? lesson.title : (lesson.title_vi || theme.taglineEn)}
        </p>

        {lesson.description && (
          <p className="mt-3 text-sm sm:text-base font-medium text-slate-600 max-w-xl mx-auto leading-relaxed">
            {lesson.description}
          </p>
        )}

        {/* Key Metrics Chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-black text-slate-800 shadow-sm">
            <span>⏱️</span>
            <span>
              {lesson.duration_minutes || 5} {copy.mins}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-black text-slate-800 shadow-sm">
            <span>🔤</span>
            <span>
              {lesson.vocabulary?.length || 3} {copy.wordsToLearn}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-2xl border-2 px-4 py-2 text-xs sm:text-sm font-black shadow-sm"
            style={{
              backgroundColor: theme.pillBg,
              color: theme.pillText,
              borderColor: theme.primaryAccent,
            }}
          >
            <span>⭐</span>
            <span>+{lesson.reward?.xp || 20} XP</span>
          </div>
        </div>
      </div>

      {/* Vocabulary Preview Strip */}
      {lesson.vocabulary && lesson.vocabulary.length > 0 && (
        <div className="rounded-3xl border-2 border-white/90 bg-white/80 backdrop-blur-sm p-5 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-3 text-center sm:text-left">
            {copy.preview}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {lesson.vocabulary.map((item, idx) => {
              const imgUrl = getAssetCandidateUrls(item.image)[0];
              return (
                <div
                  key={item.word_en || idx}
                  className="flex flex-col items-center rounded-2xl border-2 border-slate-100 bg-white p-3 text-center shadow-sm hover:border-slate-300 transition-all hover:scale-105"
                >
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center mb-2">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={item.word_en}
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl">{item.emoji || '🔤'}</span>
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-black text-slate-900 capitalize">
                    {item.word_en}
                  </span>
                  <span className="text-xs font-bold text-slate-500 line-clamp-1">
                    {item.word_vi}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Start CTA Button */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onStart}
          className="min-h-14 w-full sm:w-auto sm:min-w-[280px] rounded-3xl border-4 border-white px-8 py-4 text-base sm:text-lg font-black text-white shadow-xl hover:brightness-105 active:scale-95 transition-all"
          style={{ background: theme.accentGradient }}
        >
          🚀 {copy.startCta} →
        </button>
      </div>
    </section>
  );
};
