import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Course, Lesson, QuizSubmitResult } from '@/types/course';
import { getCourseTheme, type CourseThemeConfig } from '@/features/courses/courseThemes';
import { getAssetCandidateUrls } from '@/lib/courseAssets';
import { SoundEffectService } from '@/services/SoundEffectService';
import { HapticService } from '@/services/HapticService';

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
  const starsCount = score >= 90 ? 3 : score >= 75 ? 2 : 1;
  const xp = lesson.reward?.xp || quizResult?.reward?.xp || 25;
  const stickerUrl = lesson.reward?.sticker
    ? getAssetCandidateUrls(lesson.reward.sticker)[0]
    : undefined;

  const copy = {
    en: {
      congrats: 'Lesson Complete!',
      subtitle: `Congratulations! You have mastered Lesson ${lesson.order}!`,
      badgeTitle: lesson.reward?.badgeTitle || 'Explorer Badge',
      xpEarned: 'XP Points Earned',
      score: 'Quiz Score',
      stars: 'Stars Earned',
      finishButton: 'Save Progress & Complete',
      finishedBadge: 'Lesson Officially Completed ✓',
      reviewLesson: 'Review Lesson',
      backToCourse: 'Back to Course Map',
    },
    vi: {
      congrats: 'Chúc mừng bé đã hoàn thành bài học!',
      subtitle: `Bé thật tuyệt vời! Đã hoàn thành xuất sắc Bài học ${lesson.order}!`,
      badgeTitle: lesson.reward?.badgeTitle || 'Huy hiệu Khám phá',
      xpEarned: 'Điểm kinh nghiệm XP',
      score: 'Điểm kiểm tra',
      stars: 'Sao đạt được',
      finishButton: 'Lưu tiến độ & Hoàn tất',
      finishedBadge: 'Đã hoàn tất bài học thành công ✓',
      reviewLesson: 'Học lại bài này',
      backToCourse: 'Về danh sách bài học',
    },
  }[locale];

  useEffect(() => {
    SoundEffectService.play('success').catch(() => {});
    HapticService.reward();
  }, []);

  return (
    <section className="space-y-6 animate-fade-in max-w-2xl mx-auto text-center">
      {/* Celebration Trophy Card */}
      <div
        className="rounded-3xl border-4 p-8 shadow-2xl relative overflow-hidden"
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
      >
        {/* Glow */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 blur-3xl pointer-events-none"
          style={{ background: theme.primaryAccent }}
        />

        {/* Mascot / Trophy Icon */}
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-amber-300 to-amber-500 text-5xl shadow-xl animate-bounce">
          {theme.mascotEmoji}
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-3">
          {[1, 2, 3].map((starIdx) => (
            <span
              key={starIdx}
              className={`text-3xl sm:text-4xl transition-all duration-300 ${
                starIdx <= starsCount
                  ? 'text-amber-400 drop-shadow-md scale-110'
                  : 'text-slate-200'
              }`}
            >
              ★
            </span>
          ))}
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          🎉 {copy.congrats}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>

        {/* Reward Badge / Sticker */}
        <div className="my-6 inline-flex flex-col items-center rounded-3xl border-4 border-white bg-white/90 p-5 shadow-md">
          {stickerUrl ? (
            <img
              src={stickerUrl}
              alt={copy.badgeTitle}
              className="h-24 w-24 object-contain mb-2"
            />
          ) : (
            <span className="text-5xl mb-2">🏅</span>
          )}
          <span className="text-base font-black text-slate-900">
            {copy.badgeTitle}
          </span>
          <span className="text-xs font-bold text-amber-600">
            +{xp} {copy.xpEarned}
          </span>
        </div>

        {/* Score & XP Highlights */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <div className="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-xs">
            <span className="text-xs font-bold text-slate-400 block">{copy.score}</span>
            <span className="text-2xl font-black text-slate-900">{score}%</span>
          </div>
          <div className="rounded-2xl border-2 border-slate-100 bg-white p-3 shadow-xs">
            <span className="text-xs font-bold text-slate-400 block">{copy.xpEarned}</span>
            <span className="text-2xl font-black text-amber-600">+{xp} XP</span>
          </div>
        </div>

        {/* Save & Complete Action Button */}
        <div className="mt-8 space-y-3">
          {!isCompleted ? (
            <button
              type="button"
              onClick={onFinishLesson}
              disabled={isSubmitting}
              className="min-h-14 w-full sm:w-auto sm:min-w-[280px] rounded-3xl border-4 border-white px-8 py-4 text-base sm:text-lg font-black text-white shadow-xl hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              style={{ background: theme.accentGradient }}
            >
              {isSubmitting ? '⏳ ...' : `⭐ ${copy.finishButton}`}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-black text-emerald-800 border-2 border-emerald-300">
              <span>✓</span> {copy.finishedBadge}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onReplayLesson}
              className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              🔄 {copy.reviewLesson}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/courses/${courseId}`)}
              className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
            >
              🗺️ {copy.backToCourse}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
