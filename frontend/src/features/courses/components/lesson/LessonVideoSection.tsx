import React, { useEffect, useMemo, useState } from 'react';
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

export function extractYouTubeId(value?: string | null): string | null {
  if (!value) return null;
  const clean = value.trim();
  if (/^[\w-]{11}$/.test(clean)) return clean;

  try {
    const url = new URL(clean);
    const host = url.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com'
        ? url.pathname === '/watch'
          ? url.searchParams.get('v')
          : url.pathname.match(/^\/(?:embed|v|shorts)\/([\w-]{11})(?:\/|$)/)?.[1]
        : null;
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function isYouTubeUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com';
  } catch {
    return false;
  }
}

export const LessonVideoSection: React.FC<LessonVideoSectionProps> = ({
  lesson,
  onWatched,
  isWatched,
  locale,
}) => {
  const [failedVideoUrl, setFailedVideoUrl] = useState<string | null>(null);
  const [loadedVideoUrl, setLoadedVideoUrl] = useState<string | null>(null);
  const [youtubeStarted, setYoutubeStarted] = useState(false);
  const [youtubeFailed, setYoutubeFailed] = useState(false);
  const [youtubeLoaded, setYoutubeLoaded] = useState(false);
  const [youtubePosterIndex, setYoutubePosterIndex] = useState(0);

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
  const vocabulary = lesson.vocabulary || [];
  const youtubeFallbackVisual = vocabulary[0]
    ? resolveVocabularyVisual(vocabulary[0].word_en, vocabulary, vocabulary[0].image)
    : null;
  const youtubePosterUrls = youtubeId
    ? [
      `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      posterUrl,
      youtubeFallbackVisual?.imageUrl,
    ].filter((url): url is string => Boolean(url))
    : [];
  const youtubePosterUrl = youtubePosterUrls[youtubePosterIndex] || null;
  const youtubeFallbackEmoji = youtubeFallbackVisual?.emoji || vocabulary[0]?.emoji || '🎬';

  useEffect(() => {
    setYoutubeStarted(false);
    setYoutubeFailed(false);
    setYoutubeLoaded(false);
    setYoutubePosterIndex(0);
  }, [youtubeId]);

  useEffect(() => {
    if (!youtubeStarted || youtubeLoaded) return;
    const timeout = window.setTimeout(() => setYoutubeFailed(true), 10000);
    return () => window.clearTimeout(timeout);
  }, [youtubeStarted, youtubeLoaded]);

  const copy = {
    en: {
      title: 'Watch & Discover',
      subtitle: 'Watch carefully to discover new words with Momo!',
      markWatched: 'Continue to Vocabulary →',
      watchedDone: 'Watched ✓ Continue →',
      completionFeedback: 'Great job! You finished watching the video lesson.',
      fallbackTitle: 'Video lesson is getting ready',
      fallbackDesc: 'You can continue right now to explore the exciting new words!',
      loading: 'Loading video...',
      watchVideo: '▶ Watch video',
      playerFailed: '🎬 Video cannot play here',
      retry: 'Try again',
      watchOnYouTube: 'Watch on YouTube',
    },
    vi: {
      title: 'Xem và khám phá',
      subtitle: 'Bé hãy chăm chú theo dõi video để khám phá các từ vựng mới nhé!',
      markWatched: 'Con đã xem xong! Tiếp tục →',
      watchedDone: 'Đã xem xong ✓ Tiếp tục →',
      completionFeedback: 'Bé giỏi lắm! Đã theo dõi xong video bài học.',
      fallbackTitle: 'Video bài học chưa sẵn sàng',
      fallbackDesc: 'Bé có thể tiếp tục khám phá từ vựng mới cùng bạn Momo nhé!',
      loading: 'Đang tải video...',
      watchVideo: '▶ Xem video',
      playerFailed: '🎬 Không thể phát video tại đây',
      retry: 'Thử lại',
      watchOnYouTube: 'Xem trên YouTube',
    },
  }[locale];

  const hasPlayableVideo = Boolean(
    rawVideoUrl
    && failedVideoUrl !== rawVideoUrl
    && (!isYouTubeUrl(rawVideoUrl) || youtubeId),
  );

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
          data-testid="lesson-video-stage"
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
                  youtubeFailed ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/90 p-4 text-center">
                      <p className="text-sm font-black text-purple-950">{copy.playerFailed}</p>
                      <button
                        type="button"
                        className="rounded-full bg-purple-600 px-3 py-1.5 text-xs font-black text-white"
                        onClick={() => {
                          setYoutubeFailed(false);
                          setYoutubeLoaded(false);
                          setYoutubeStarted(true);
                        }}
                      >
                        {copy.retry}
                      </button>
                      <a
                        className="text-xs font-black text-purple-700 underline"
                        href={`https://www.youtube.com/watch?v=${youtubeId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {copy.watchOnYouTube}
                      </a>
                    </div>
                  ) : youtubeStarted ? (
                    <iframe
                      className="h-full w-full border-0"
                      src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
                      title={lesson.video?.title || lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      onLoad={() => setYoutubeLoaded(true)}
                      onError={() => setYoutubeFailed(true)}
                      onErrorCapture={() => setYoutubeFailed(true)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="relative h-full w-full overflow-hidden text-center"
                      onClick={() => setYoutubeStarted(true)}
                    >
                      {youtubePosterUrl ? (
                        <img
                          src={youtubePosterUrl}
                          alt={lesson.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={() => setYoutubePosterIndex((index) => index + 1)}
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-5xl">
                          🎬 {youtubeFallbackEmoji}
                        </span>
                      )}
                      <span className="relative inline-flex translate-y-8 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-purple-950 shadow-sm">
                        {copy.watchVideo}
                      </span>
                    </button>
                  )
                ) : (
                  <>
                    {loadedVideoUrl !== rawVideoUrl && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden bg-white/90 text-sm font-black text-purple-950">
                        {posterUrl ? (
                          <img src={posterUrl} alt={lesson.title} className="absolute inset-0 h-full w-full object-cover" />
                        ) : null}
                        <span className={`relative ${posterUrl ? 'rounded-full bg-white/85 px-3 py-1 shadow-sm' : ''}`}>
                          {copy.loading}
                        </span>
                      </div>
                    )}
                    <video
                      key={rawVideoUrl || ''}
                      className={`h-full w-full object-cover transition-opacity ${
                        loadedVideoUrl === rawVideoUrl ? 'opacity-100' : 'opacity-0'
                      }`}
                      controls
                      playsInline
                      preload="metadata"
                      poster={posterUrl || undefined}
                      onLoadedData={() => setLoadedVideoUrl(rawVideoUrl)}
                      onError={() => setFailedVideoUrl(rawVideoUrl)}
                      onEnded={onWatched}
                    >
                      <source src={rawVideoUrl || ''} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>

                  </>
                )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-[22px] aspect-video w-full flex flex-col items-center justify-center text-center bg-white/90 p-5">
                {posterUrl && <img src={posterUrl} alt={lesson.title} className="absolute inset-0 h-full w-full object-cover opacity-25" />}
                <div className="relative text-4xl sm:text-5xl mb-2">🎬</div>
                <h3 className="relative text-base font-black text-purple-950 mb-1">{copy.fallbackTitle}</h3>
                <p className="relative text-xs font-bold text-purple-800/80 max-w-xs">{copy.fallbackDesc}</p>
              </div>
            )}

            {vocabulary.length > 0 && (
              <div data-testid="video-vocabulary-preview" className="mt-3 flex justify-center gap-2">
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
          </div>
        </div>
      </div>

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
