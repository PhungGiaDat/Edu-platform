import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LessonMedia as LessonMediaType, SceneImage } from '@/types/course';

/** Props for the LessonMedia component */
export interface LessonMediaProps {
  /** Media data from lesson */
  media: LessonMediaType;
  /** Whether media auto-plays on mount */
  autoPlay?: boolean;
  /** Callback when intro video completes */
  onIntroComplete?: () => void;
  /** Callback when user skips intro */
  onIntroSkip?: () => void;
  /** Current locale */
  locale: 'en' | 'vi';
  /** CSS class for container */
  className?: string;
}

/** Format seconds to MM:SS */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/** Video player with custom Duolingo-style controls */
export const VideoPlayer: React.FC<{
  src?: string | null;
  poster?: string | null;
  duration?: number;
  onEnded?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
}> = ({ src, poster, duration = 0, onEnded, autoPlay = false, muted = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [autoPlay, src]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  }, [duration]);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  }, [isPlaying]);

  if (!src) return null;

  return (
    <div
      className="relative overflow-hidden rounded-[24px] bg-slate-900"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="aspect-video w-full object-contain"
        playsInline
        muted={isMuted}
        autoPlay={autoPlay}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      <button
        type="button"
        onClick={togglePlay}
        className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${
          isPlaying && !showControls ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-110">
          {isPlaying ? (
            <svg className="h-6 w-6 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="ml-1 h-6 w-6 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </button>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div
          className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/30"
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-[#FFD93D] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/20"
            >
              {isPlaying ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Time */}
            <span className="text-sm font-semibold text-white/90">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Mute */}
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/20"
          >
            {isMuted ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Image gallery with lightbox */
export const ImageGallery: React.FC<{
  images: string[];
  locale: 'en' | 'vi';
}> = ({ images, locale }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const t = locale === 'vi' ? {
    gallery: 'Hinh anh',
    close: 'Dong',
    prev: 'Truoc',
    next: 'Tiep',
  } : {
    gallery: 'Gallery',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
  };

  if (!images.length) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((url, index) => (
          <button
            key={url + index}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="group relative shrink-0 overflow-hidden rounded-[16px] border-4 border-white shadow-[0_4px_0_rgba(0,0,0,0.1)] transition-transform hover:scale-105"
          >
            <img
              src={url}
              alt={`${t.gallery} ${index + 1}`}
              className="h-24 w-32 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
              <svg className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {lightboxIndex > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <img
            src={images[lightboxIndex]}
            alt={`${t.gallery} ${lightboxIndex + 1}`}
            className="max-h-full max-w-full rounded-[16px] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition-colors hover:bg-white/30"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
};

/** Scene navigation for video chapters */
export const SceneNavigation: React.FC<{
  scenes: SceneImage[];
  activeScene?: string;
  onSceneClick?: (scene: SceneImage) => void;
  locale: 'en' | 'vi';
}> = ({ scenes, activeScene, onSceneClick, locale }) => {
  const t = locale === 'vi' ? {
    scenes: 'Cac canh',
    scene: 'Canh',
  } : {
    scenes: 'Scenes',
    scene: 'Scene',
  };

  if (!scenes.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-black text-slate-500 uppercase tracking-wide">{t.scenes}</h4>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {scenes.map((scene, index) => {
          const isActive = scene.scene_id === activeScene;
          return (
            <button
              key={scene.scene_id}
              type="button"
              onClick={() => onSceneClick?.(scene)}
              className={`group flex items-center gap-3 rounded-[16px] border-4 p-3 text-left transition-all ${
                isActive
                  ? 'border-[#FFD93D] bg-[#FFF8D8] shadow-[0_4px_0_rgba(229,184,0,0.3)]'
                  : 'border-white bg-white shadow-[0_4px_0_rgba(0,0,0,0.08)] hover:scale-[1.02]'
              }`}
            >
              {scene.thumbnail_url || scene.image_url ? (
                <img
                  src={scene.thumbnail_url || scene.image_url}
                  alt={scene.title || `${t.scene} ${index + 1}`}
                  className="h-14 w-20 rounded-[10px] object-cover"
                />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded-[10px] bg-slate-100">
                  <span className="text-lg font-black text-slate-400">{index + 1}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-800">
                  {scene.title || `${t.scene} ${index + 1}`}
                </p>
                {scene.timestamp_seconds > 0 && (
                  <p className="text-xs font-semibold text-slate-400">
                    {formatTime(scene.timestamp_seconds)}
                  </p>
                )}
              </div>
              <div className={`shrink-0 rounded-full p-1.5 ${isActive ? 'bg-[#FFD93D]' : 'bg-slate-100'}`}>
                <svg className={`h-3 w-3 ${isActive ? 'text-slate-800' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Intro video banner (Duolingo-style) */
export const IntroVideoBanner: React.FC<{
  introUrl?: string | null;
  thumbnail?: string | null;
  duration?: number;
  autoPlay?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  locale: 'en' | 'vi';
}> = ({ introUrl, thumbnail, duration = 0, autoPlay = false, onComplete, onSkip: _onSkip, locale }) => {
  const [showVideo, setShowVideo] = useState(autoPlay && !!introUrl);
  const t = locale === 'vi' ? {
    intro: 'Gioi thieu',
    watchIntro: 'Xem gioi thieu',
    skip: 'Bo qua',
    watched: 'Da xem gioi thieu',
  } : {
    intro: 'Introduction',
    watchIntro: 'Watch intro',
    skip: 'Skip',
    watched: 'Watched intro',
  };

  if (!introUrl) return null;

  if (showVideo) {
    return (
      <VideoPlayer
        src={introUrl}
        poster={thumbnail || undefined}
        duration={duration}
        autoPlay={autoPlay}
        onEnded={onComplete}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowVideo(true)}
      className="group relative w-full overflow-hidden rounded-[24px] border-4 border-[#FFD93D] bg-gradient-to-r from-[#FFD93D] to-[#FFE57F] p-4 text-left shadow-[0_6px_0_rgba(229,184,0,0.3)] transition-transform hover:scale-[1.01]"
    >
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform group-hover:scale-110">
          <svg className="ml-1 h-6 w-6 text-[#FFD93D]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <p className="pr-16 text-lg font-black text-slate-800">{t.intro}</p>
      <p className="text-sm font-semibold text-slate-600">{t.watchIntro}</p>
      {duration > 0 && (
        <p className="mt-1 text-xs font-bold text-slate-500">{formatTime(duration)}</p>
      )}
    </button>
  );
};

/** Main LessonMedia component */
export const LessonMedia: React.FC<LessonMediaProps> = ({
  media,
  autoPlay = false,
  onIntroComplete,
  onIntroSkip,
  locale,
  className = '',
}) => {
  const [showIntro, setShowIntro] = useState(autoPlay);
  const [activeScene, setActiveScene] = useState<string | undefined>();

  const hasContent = media.video_url || media.images.length || media.scene_images.length;
  const t = locale === 'vi' ? {
    video: 'Video',
    gallery: 'Hinh anh',
    scenes: 'Cac canh',
    noMedia: 'Khong co phuong tien',
  } : {
    video: 'Video',
    gallery: 'Gallery',
    scenes: 'Scenes',
    noMedia: 'No media available',
  };

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    onIntroComplete?.();
  }, [onIntroComplete]);

  const handleIntroSkip = useCallback(() => {
    setShowIntro(false);
    onIntroSkip?.();
  }, [onIntroSkip]);

  const handleSceneClick = useCallback((scene: SceneImage) => {
    setActiveScene(scene.scene_id);
  }, []);

  const activeSceneData = useMemo(
    () => media.scene_images.find(s => s.scene_id === activeScene),
    [media.scene_images, activeScene]
  );

  if (!hasContent && !media.intro_video_url) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Intro video banner */}
      {media.intro_video_url && (
        <IntroVideoBanner
          introUrl={showIntro ? media.intro_video_url : undefined}
          thumbnail={media.intro_video_thumbnail}
          duration={media.intro_video_duration}
          autoPlay={showIntro}
          onComplete={handleIntroComplete}
          onSkip={handleIntroSkip}
          locale={locale}
        />
      )}

      {/* Main video player */}
      {media.video_url && (
        <VideoPlayer
          src={media.video_url}
          poster={media.video_thumbnail_url || undefined}
          duration={media.video_duration_seconds}
        />
      )}

      {/* Image gallery */}
      {media.images.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-wide">{t.gallery}</h4>
          <ImageGallery images={media.images} locale={locale} />
        </div>
      )}

      {/* Scene navigation */}
      {media.scene_images.length > 0 && (
        <SceneNavigation
          scenes={media.scene_images}
          activeScene={activeScene}
          onSceneClick={handleSceneClick}
          locale={locale}
        />
      )}

      {/* Active scene detail */}
      {activeSceneData && (
        <div className="rounded-[20px] border-4 border-[#FFD93D] bg-[#FFF8D8] p-4">
          {activeSceneData.image_url && (
            <img
              src={activeSceneData.image_url}
              alt={activeSceneData.title}
              className="mb-3 aspect-video w-full rounded-[16px] object-cover"
            />
          )}
          {activeSceneData.title && (
            <h4 className="text-lg font-black text-slate-800">{activeSceneData.title}</h4>
          )}
          {activeSceneData.description && (
            <p className="mt-1 text-sm font-semibold text-slate-600">{activeSceneData.description}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonMedia;
