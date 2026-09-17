import React, { useMemo, useState } from 'react';
import type { Lesson } from '@/types/course';
import { getAssetCandidateUrls, resolveStoredMediaUrl } from '@/lib/courseAssets';
import { ClayButton, ClayStage } from './clayComponents';

interface LessonVideoSectionProps {
  lesson: Lesson;
  onWatched: () => void;
  isWatched: boolean;
  locale: 'en' | 'vi';
}

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const clean = url.trim();
  // Direct 11-char ID
  if (/^[\w-]{11}$/.test(clean)) return clean;
  const regExp = /(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/;
  const match = clean.match(regExp);
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
    const raw = (
      lesson.video_url ||
      lesson.video?.url ||
      lesson.intro_video_url ||
      lesson.lesson_media?.video_url ||
      lesson.lesson_media?.intro_video_url ||
      (lesson.videoLesson?.video ? getAssetCandidateUrls(lesson.videoLesson.video)[0] : null) ||
      null
    );
    return resolveStoredMediaUrl(raw);
  }, [lesson]);

  const posterUrl = useMemo(() => {
    const raw = (
      lesson.video_thumbnail ||
      lesson.video?.thumbnail_url ||
      lesson.intro_video_thumbnail ||
      lesson.lesson_media?.video_thumbnail_url ||
      (lesson.videoLesson?.thumbnail ? getAssetCandidateUrls(lesson.videoLesson.thumbnail)[0] : null) ||
      null
    );
    return resolveStoredMediaUrl(raw);
  }, [lesson]);

  const youtubeId = useMemo(() => extractYouTubeId(rawVideoUrl), [rawVideoUrl]);

  const copy = {
    en: {
      title: 'Watch & Discover',
      subtitle: 'Watch carefully to discover new words with Momo!',
      markWatched: 'Continue to Vocabulary →',
      watchedDone: 'Watched ✓ Continue →',
      completionFeedback: 'Great job! You finished watching the video lesson.',
      fallbackTitle: 'Video lesson is getting ready',
      fallbackDesc: 'You can continue right now to explore the exciting new words!',
    },
    vi: {
      title: 'Xem và khám phá',
      subtitle: 'Bé hãy chăm chú theo dõi video để khám phá các từ vựng mới nhé!',
      markWatched: 'Con đã xem xong! Tiếp tục →',
      watchedDone: 'Đã xem xong ✓ Tiếp tục →',
      completionFeedback: 'Bé giỏi lắm! Đã theo dõi xong video bài học.',
      fallbackTitle: 'Video bài học chưa sẵn sàng',
      fallbackDesc: 'Bé có thể tiếp tục khám phá từ vựng mới cùng bạn Momo nhé!',
    },
  }[locale];

  const hasPlayableVideo = Boolean(youtubeId || (rawVideoUrl && !videoError));

  return (
    <section className="space-y-4 animate-fade-in w-full text-center max-w-md mx-auto">
      {/* Heading + One Helper Line */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
          <span>🎬</span>
          <span>{copy.title}</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      {/* 16:9 Video Card rounded 26px with play affordance or friendly fallback */}
      {hasPlayableVideo ? (
        <div className="relative overflow-hidden rounded-[26px] border-4 border-white bg-slate-950 shadow-[0_8px_0_#94A3B8,0_12px_24px_rgba(0,0,0,0.15)] aspect-video w-full flex items-center justify-center">
          {youtubeId ? (
            <iframe
              className="h-full w-full border-0 rounded-[22px]"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
              title={lesson.video?.title || lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              key={rawVideoUrl || ''}
              className="h-full w-full object-cover rounded-[22px]"
              controls
              playsInline
              preload="metadata"
              poster={posterUrl || undefined}
              onError={() => setVideoError(true)}
              onEnded={onWatched}
            >
              <source src={rawVideoUrl || ''} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ) : posterUrl ? (
        <div className="relative overflow-hidden rounded-[26px] border-4 border-white shadow-[0_8px_0_#FDE08B,0_12px_24px_rgba(255,211,78,0.2)] aspect-video w-full flex items-center justify-center">
          <img
            src={posterUrl}
            alt={lesson.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-[0_6px_0_#CBD5E1] hover:scale-105 active:scale-95 transition-transform cursor-pointer">
              ▶️
            </span>
          </div>
        </div>
      ) : (
        /* Child-Friendly Fallback Card — Never a dead black screen! */
        <ClayStage
          color="yellow"
          className="aspect-video w-full flex flex-col items-center justify-center text-center p-5 border-4 border-white"
        >
          <div className="text-4xl sm:text-5xl mb-2 animate-bounce">🎬</div>
          <h3 className="text-base sm:text-lg font-black text-amber-950 mb-1">
            {copy.fallbackTitle}
          </h3>
          <p className="text-xs sm:text-sm font-bold text-amber-800/90 max-w-xs">
            {copy.fallbackDesc}
          </p>
        </ClayStage>
      )}

      {/* Small Completion Feedback after playback */}
      {isWatched && (
        <div className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs font-black text-emerald-900 shadow-2xs animate-fade-in">
          <span>✓</span>
          <span>{copy.completionFeedback}</span>
        </div>
      )}

      {/* Dominant Watch / Continue Button */}
      <div className="pt-1">
        <ClayButton
          variant={isWatched ? 'emerald' : 'yellow'}
          onClick={onWatched}
          size="lg"
        >
          {isWatched ? `✓ ${copy.watchedDone}` : `👀 ${copy.markWatched}`}
        </ClayButton>
      </div>
    </section>
  );
};
