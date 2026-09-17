import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, Lesson, QuizSubmitResult } from '@/types/course';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { SoundEffectService } from '@/services/SoundEffectService';
import { HapticService } from '@/services/HapticService';
import { isReadyAsset, sanitizeChildLabel } from '@/features/courses/lib/visualResolver';

interface RewardSectionProps {
  course?: Course | null;
  lesson: Lesson;
  courseId: string;
  quizResult: QuizSubmitResult | null;
  onFinishLesson: () => void;
  isSubmitting: boolean;
  isCompleted: boolean;
  onReplayLesson: () => void;
  locale: 'en' | 'vi';
}

export const RewardSection: React.FC<RewardSectionProps> = ({
  course,
  lesson,
  courseId,
  quizResult,
  onFinishLesson,
  isSubmitting,
  isCompleted,
  onReplayLesson,
  locale,
}) => {
  const navigate = useNavigate();
  const theme: CourseThemeConfig = getCourseTheme(course);

  const score = quizResult?.score ?? 100;
  const starsCount = score >= 90 ? 3 : score >= 70 ? 2 : 1;
  const xp = lesson.reward?.xp || quizResult?.reward?.xp || 25;

  // Verify sticker is actually ready and not a pending SVG or filename
  const isStickerUsable = isReadyAsset(lesson.reward?.sticker);
  const rawStickerUrls = isStickerUsable && lesson.reward?.sticker
    ? getAssetCandidateUrls(lesson.reward.sticker)
    : [];
  const stickerUrl = rawStickerUrls.find((u) => !u.toLowerCase().endsWith('.svg')) || null;

  const rawBadgeTitle = lesson.reward?.badgeTitle || (lesson.title_vi ? `${lesson.title_vi} Star` : 'Ngôi sao bài học');
  const badgeTitle = sanitizeChildLabel(rawBadgeTitle, 'Ngôi sao bài học');

  const copy = {
    en: {
      congrats: 'Con làm rất tốt!',
      subtitle: 'Chúc mừng bé đã hoàn thành bài học!',
      finishCta: 'Lưu tiến độ & Hoàn tất',
      reviewCta: 'Xem lại bài học 🔄',
      backToCourse: 'Về danh sách bài học',
    },
    vi: {
      congrats: 'Con làm rất tốt!',
      subtitle: 'Chúc mừng bé đã hoàn thành bài học!',
      finishCta: 'Lưu tiến độ & Hoàn tất',
      reviewCta: 'Xem lại bài học 🔄',
      backToCourse: 'Về danh sách bài học',
    },
  }[locale];

  useEffect(() => {
    SoundEffectService.play('success').catch(() => {});
    HapticService.reward();
  }, []);

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Large Celebratory Trophy Card (Tactile Clay) */}
      <div
        className="rounded-3xl border-4 p-5 sm:p-6 shadow-[0_10px_0_rgba(0,0,0,0.08)] relative overflow-hidden flex flex-col items-center"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Playful Glow Background */}
        <div
          className="absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-25 blur-2xl pointer-events-none"
          style={{ background: theme.primaryAccent }}
        />

        {/* Celebration Trophy Avatar */}
        <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-4xl shadow-md animate-bounce">
          🏆
        </div>

        {/* Big 3 Stars */}
        <div className="flex justify-center gap-2 mb-1.5">
          {[1, 2, 3].map((starIdx) => (
            <span
              key={starIdx}
              className={`text-4xl sm:text-5xl transition-all duration-300 ${
                starIdx <= starsCount
                  ? 'text-amber-400 drop-shadow-[0_4px_8px_rgba(251,191,36,0.6)] scale-105'
                  : 'text-slate-200'
              }`}
            >
              ★
            </span>
          ))}
        </div>

        {/* Celebratory Headings */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {copy.congrats}
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm font-bold text-slate-600">
          {copy.subtitle}
        </p>

        {/* Badge & XP Prominently */}
        <div className="my-3.5 w-full flex flex-col items-center rounded-2xl border-2 border-white bg-white/95 p-3.5 shadow-2xs">
          {stickerUrl ? (
            <img
              src={stickerUrl}
              alt={badgeTitle}
              className="h-16 w-16 object-contain mb-1"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-4xl mb-1 animate-pulse">🌟</span>
          )}

          <span className="text-base sm:text-lg font-black text-slate-900">
            {badgeTitle}
          </span>
          <span className="mt-1 rounded-full bg-amber-100 px-3 py-0.5 text-sm font-black text-amber-800 border border-amber-200">
            +{xp} XP
          </span>
        </div>

        {/* Primary Finish CTA Button */}
        <div className="w-full pt-1 space-y-2">
          <button
            type="button"
            onClick={isCompleted ? () => navigate(`/courses/${courseId}`) : onFinishLesson}
            disabled={isSubmitting}
            className="w-full min-h-[56px] rounded-2xl border-2 border-white bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black text-base sm:text-lg shadow-[0_6px_0_#0D9488] hover:brightness-105 active:translate-y-1 active:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isCompleted ? copy.backToCourse : copy.finishCta}</span>
            <span>🚀</span>
          </button>

          {/* Secondary Replay Button */}
          <button
            type="button"
            onClick={onReplayLesson}
            className="w-full min-h-[46px] rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-black text-sm shadow-xs hover:bg-slate-50 active:translate-y-0.5 transition-all cursor-pointer"
          >
            {copy.reviewCta}
          </button>
        </div>
      </div>
    </section>
  );
};
