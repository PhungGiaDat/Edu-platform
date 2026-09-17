import React, { useMemo, useState } from 'react';
import type { Lesson } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

interface LessonVideoSectionProps {
  lesson: Lesson;
  onWatched: () => void;
  isWatched: boolean;
  locale: 'en' | 'vi';
}

function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
}

export const LessonVideoSection: React.FC<LessonVideoSectionProps> = ({
  lesson,
  onWatched,
  isWatched,
  locale,
}) => {
  const [videoError, setVideoError] = useState(false);

  const rawVideoUrl = useMemo(() => {
    return (
      lesson.video_url ||
      lesson.video?.url ||
      lesson.lesson_media?.video_url ||
      (lesson.videoLesson?.video ? getAssetCandidateUrls(lesson.videoLesson.video)[0] : null) ||
      null
    );
  }, [lesson]);

  const posterUrl = useMemo(() => {
    return (
      lesson.video_thumbnail ||
      lesson.video?.thumbnail_url ||
      lesson.lesson_media?.video_thumbnail_url ||
      (lesson.videoLesson?.thumbnail ? getAssetCandidateUrls(lesson.videoLesson.thumbnail)[0] : null) ||
      undefined
    );
  }, [lesson]);

  const youtubeId = useMemo(() => extractYouTubeId(rawVideoUrl), [rawVideoUrl]);

  const copy = {
    en: {
      title: 'Watch & Discover',
      subtitle: 'Watch carefully to discover new words with Momo!',
      markWatched: 'Con đã xem xong! Tiếp tục →',
      watchedDone: 'Đã xem xong ✓ Tiếp tục →',
      completionFeedback: 'Great job! You finished watching the video lesson.',
      noVideo: 'Video Lesson',
    },
    vi: {
      title: 'Xem và khám phá',
      subtitle: 'Bé hãy chăm chú theo dõi video để khám phá các từ vựng mới nhé!',
      markWatched: 'Con đã xem xong! Tiếp tục →',
      watchedDone: 'Đã xem xong ✓ Tiếp tục →',
      completionFeedback: 'Bé giỏi lắm! Đã theo dõi xong video bài học.',
      noVideo: 'Video bài học',
    },
  }[locale];

  return (
    <section className="space-y-3.5 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Heading + One Helper Line Only */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <span>🎬</span>
          <span>{copy.title}</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* 16:9 Video Card rounded 24-28px with play affordance */}
      <div className="relative overflow-hidden rounded-[26px] border-4 border-white bg-slate-900 shadow-[0_8px_0_rgba(0,0,0,0.08)] aspect-video w-full flex items-center justify-center">
        {youtubeId ? (
          <iframe
            className="h-full w-full border-0 rounded-[22px]"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : rawVideoUrl && !videoError ? (
          <video
            key={rawVideoUrl}
            className="h-full w-full object-cover rounded-[22px]"
            controls
            playsInline
            preload="metadata"
            poster={posterUrl}
            onError={() => setVideoError(true)}
            onEnded={onWatched}
          >
            <source src={rawVideoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : posterUrl ? (
          <div className="relative h-full w-full flex items-center justify-center">
            <img
              src={posterUrl}
              alt={lesson.title}
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/35">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                ▶️
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-white">
            <div className="text-3xl mb-1.5">📺</div>
            <p className="text-sm font-black">{copy.noVideo}</p>
            <p className="text-xs text-slate-400 mt-0.5">{lesson.title}</p>
          </div>
        )}
      </div>

      {/* Small Completion Feedback after playback */}
      {isWatched && (
        <div className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-black text-emerald-800 shadow-2xs animate-fade-in">
          <span>✓</span>
          <span>{copy.completionFeedback}</span>
        </div>
      )}

      {/* Dominant Watch / Continue Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onWatched}
          className={`w-full min-h-[56px] rounded-2xl border-2 border-white px-6 text-base sm:text-lg font-black transition-all active:translate-y-1 shadow-[0_6px_0_rgba(0,0,0,0.15)] cursor-pointer flex items-center justify-center gap-2 ${
            isWatched
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_6px_0_#059669]'
              : 'bg-[#FFD93D] text-slate-900 hover:bg-[#FACC15] shadow-[0_6px_0_#EAB308]'
          }`}
        >
          {isWatched ? `✓ ${copy.watchedDone}` : `👀 ${copy.markWatched}`}
        </button>
      </div>
    </section>
  );
};
