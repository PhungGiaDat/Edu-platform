import React, { useMemo, useState } from 'react';
import type { Lesson } from '@/types/course';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

interface LessonVideoSectionProps {
  lesson: Lesson;
  onWatched: () => void;
  isWatched: boolean;
  locale: 'en' | 'vi';
}

/**
 * Robust helper to extract YouTube ID from standard, short, or embed URLs.
 */
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

  // Video URL candidate resolution
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
      title: 'Watch & Learn with Momo',
      subtitle: 'Watch the video carefully to hear the words pronounced naturally!',
      markWatched: 'I watched it! Ready to practice',
      watchedDone: 'Watched ✓',
      videoTip: 'Tip: Tap play to start the video. You can replay anytime.',
      noVideo: 'Video lesson preview',
    },
    vi: {
      title: 'Xem & Lắng nghe cùng Momo',
      subtitle: 'Bé hãy chăm chú theo dõi video và lắng nghe cách phát âm từ vựng nhé!',
      markWatched: 'Con đã xem xong! Sẵn sàng luyện tập',
      watchedDone: 'Đã xem xong ✓',
      videoTip: 'Gợi ý: Bấm nút Play để xem video. Bé có thể xem lại bất cứ lúc nào.',
      noVideo: 'Hình ảnh minh họa bài học',
    },
  }[locale];

  return (
    <section className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header text */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          🎬 {copy.title}
        </h2>
        <p className="mt-1 text-sm sm:text-base font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* Video Player Container */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-slate-950 shadow-2xl aspect-video w-full flex items-center justify-center">
        {youtubeId ? (
          <iframe
            className="h-full w-full border-0"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : rawVideoUrl && !videoError ? (
          <video
            key={rawVideoUrl}
            className="h-full w-full object-cover"
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
          <div className="relative h-full w-full">
            <img
              src={posterUrl}
              alt={lesson.title}
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <span className="rounded-full bg-white/90 p-4 text-3xl shadow-lg">
                ▶️
              </span>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-white">
            <div className="text-5xl mb-2">📺</div>
            <p className="text-lg font-black">{copy.noVideo}</p>
            <p className="text-xs text-slate-400 mt-1">{lesson.title}</p>
          </div>
        )}
      </div>

      {/* Helper notice & Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border-2 border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600">
          <span>💡</span>
          <span>{copy.videoTip}</span>
        </div>

        <button
          type="button"
          onClick={onWatched}
          className={`min-h-12 w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm sm:text-base transition-all active:scale-95 shadow-md ${
            isWatched
              ? 'bg-emerald-500 text-white border-2 border-white'
              : 'bg-[#FFD93D] hover:bg-[#FACC15] text-slate-900 border-2 border-white'
          }`}
        >
          {isWatched ? `✓ ${copy.watchedDone}` : `👀 ${copy.markWatched}`}
        </button>
      </div>
    </section>
  );
};
