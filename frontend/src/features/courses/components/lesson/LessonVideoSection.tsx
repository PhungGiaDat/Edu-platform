import React, { useMemo, useState } from 'react';
import type { Lesson } from '@/types/course';
import { getAssetCandidateUrls, resolveStoredMediaUrl } from '@/lib/courseAssets';
import { resolveVocabularyVisual } from '@/features/courses/lib/visualResolver';
import { ClayButton } from './clayComponents';

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
  const vocabulary = lesson.vocabulary || [];

  return (
    <section className="animate-fade-in w-full text-center max-w-md mx-auto">
      <h2 className="text-lg font-black text-slate-900 tracking-tight">
        🎬 {copy.title}
      </h2>
      <p className="mt-0.5 text-xs font-bold text-slate-600">{copy.subtitle}</p>

      {/* Toy cinema stage: tilted purple clay frame with decorative marquee shapes */}
      <div className="relative mt-4 px-2">
        <span className="absolute -top-3 left-3 text-xl -rotate-12 opacity-70 select-none">⭐</span>
        <span className="absolute -top-2 right-6 text-base rotate-12 opacity-60 select-none">✨</span>
        <span className="absolute -bottom-3 right-2 text-lg rotate-6 opacity-60 select-none">🎟️</span>

        <div
          className="relative rotate-[-1.2deg] rounded-[30px] border-[6px] border-white p-2 shadow-[0_10px_0_#6B21A8,0_18px_30px_rgba(107,33,168,0.25)]"
          style={{ background: 'linear-gradient(155deg,#C79BF9,#9D5EF0)' }}
        >
          {/* Film-strip dots along the top edge */}
          <div className="mb-1.5 flex justify-center gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/70" />
            ))}
          </div>

          <div className="rotate-[1.2deg]">
            {hasPlayableVideo ? (
              <div className="relative overflow-hidden rounded-[22px] bg-slate-950 aspect-video w-full flex items-center justify-center">
                {youtubeId ? (
                  <iframe
                    className="h-full w-full border-0"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
                    title={lesson.video?.title || lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    key={rawVideoUrl || ''}
                    className="h-full w-full object-cover"
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
              <div className="relative overflow-hidden rounded-[22px] aspect-video w-full flex items-center justify-center">
                <img src={posterUrl} alt={lesson.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-[0_6px_0_#CBD5E1] hover:scale-105 active:scale-95 transition-transform cursor-pointer">
                    ▶️
                  </span>
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center text-center rounded-[22px] bg-white/90 p-5">
                <div className="text-4xl sm:text-5xl mb-2 animate-bounce">🎬</div>
                <h3 className="text-base font-black text-purple-950 mb-1">{copy.fallbackTitle}</h3>
                <p className="text-xs font-bold text-purple-800/80 max-w-xs">{copy.fallbackDesc}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Small vocabulary thumbnails below the stage, teasing what's coming */}
      {vocabulary.length > 0 && (
        <div className="mt-3 flex justify-center gap-2">
          {vocabulary.slice(0, 3).map((item) => {
            const visual = resolveVocabularyVisual(item.word_en, vocabulary, item.image);
            return (
              <div key={item.word_en} className="h-9 w-9 rounded-full overflow-hidden border-2 border-white bg-white shadow-[0_2px_0_#D1B3FC] flex items-center justify-center">
                {visual.imageUrl ? (
                  <img src={visual.imageUrl} alt={item.word_en} className="h-full w-full object-contain p-0.5" loading="lazy" />
                ) : (
                  <span className="text-sm">{visual.emoji || item.emoji || '🔤'}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isWatched && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3.5 py-1 text-xs font-black text-emerald-900 shadow-2xs animate-fade-in">
          <span>✓</span>
          <span>{copy.completionFeedback}</span>
        </div>
      )}

      <div className="mt-3">
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
