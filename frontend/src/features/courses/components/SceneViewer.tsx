import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface Scene {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  title?: string;
  narrationText?: string;
  audioUrl?: string;
  duration?: number; // seconds
  timestamp?: number; // video timestamp in seconds
}

export interface SceneViewerProps {
  scenes: Scene[];
  autoPlay?: boolean;
  loop?: boolean;
  showNavigation?: boolean;
  showThumbnails?: boolean;
  showNarration?: boolean;
  enableAudioSync?: boolean;
  onSceneChange?: (scene: Scene, index: number) => void;
  onComplete?: () => void;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const SceneViewer: React.FC<SceneViewerProps> = ({
  scenes,
  autoPlay = false,
  loop = false,
  showNavigation = true,
  showThumbnails = true,
  showNarration = true,
  enableAudioSync = false,
  onSceneChange,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const transitionTimer = useRef<NodeJS.Timeout | null>(null);

  const currentScene = scenes[currentIndex];
  const isFirstScene = currentIndex === 0;
  const isLastScene = currentIndex === scenes.length - 1;

  // Initialize audio
  useEffect(() => {
    if (enableAudioSync && currentScene?.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = currentScene.audioUrl;
        if (isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      } else {
        audioRef.current = new Audio(currentScene.audioUrl);
        audioRef.current.volume = isMuted ? 0 : 1;
        if (isPlaying) {
          audioRef.current.play().catch(() => {});
        }
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentScene?.audioUrl, enableAudioSync, isPlaying]);

  // Progress timer
  useEffect(() => {
    if (isPlaying && currentScene?.duration) {
      progressTimer.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / (currentScene.duration || 1));
          if (newProgress >= 100) {
            handleNext();
            return 0;
          }
          return newProgress;
        });
      }, 1000);
    }

    return () => {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
      }
    };
  }, [isPlaying, currentScene?.duration]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'Home':
          e.preventDefault();
          goToScene(0);
          break;
        case 'End':
          e.preventDefault();
          goToScene(scenes.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [scenes.length]);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : 1;
      }
      return newMuted;
    });
  };

  const goToScene = (index: number) => {
    if (index < 0 || index >= scenes.length || isTransitioning) return;

    setIsTransitioning(true);
    setProgress(0);

    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
    }

    transitionTimer.current = setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
      onSceneChange?.(scenes[index], index);
    }, 300);
  };

  const handlePrev = useCallback(() => {
    if (isFirstScene) {
      if (loop) {
        goToScene(scenes.length - 1);
      }
      return;
    }
    goToScene(currentIndex - 1);
  }, [currentIndex, isFirstScene, loop, scenes.length]);

  const handleNext = useCallback(() => {
    if (isLastScene) {
      if (loop) {
        goToScene(0);
        onComplete?.();
      } else {
        onComplete?.();
      }
      return;
    }
    goToScene(currentIndex + 1);
  }, [currentIndex, isLastScene, loop, onComplete]);

  const handleThumbnailClick = (index: number) => {
    goToScene(index);
  };

  // Touch swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  if (scenes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 p-8 text-slate-500">
        No scenes available
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900">
      {/* Main scene image */}
      <div
        className="relative aspect-[16/9] w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image with transition */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <img
            src={currentScene.imageUrl}
            alt={currentScene.title || `Scene ${currentIndex + 1}`}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Progress bar */}
        {currentScene.duration && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-[#6EB9FF] transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Narration overlay */}
        {showNarration && currentScene.narrationText && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
            <div className="mx-auto max-w-2xl">
              <p className="text-lg font-medium text-white">{currentScene.narrationText}</p>
            </div>
          </div>
        )}

        {/* Scene title */}
        {currentScene.title && (
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4">
            <h3 className="text-xl font-bold text-white">{currentScene.title}</h3>
          </div>
        )}
      </div>

      {/* Navigation controls */}
      {showNavigation && (
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
          {/* Previous button */}
          <button
            onClick={handlePrev}
            disabled={isFirstScene && !loop}
            className={`pointer-events-auto rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20 ${
              isFirstScene && !loop ? 'cursor-not-allowed opacity-30' : ''
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause button */}
          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className="pointer-events-auto rounded-full bg-white/10 p-4 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {isPlaying ? (
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={isLastScene && !loop}
            className={`pointer-events-auto rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20 ${
              isLastScene && !loop ? 'cursor-not-allowed opacity-30' : ''
            }`}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Scene counter */}
      <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 font-mono text-sm text-white backdrop-blur-sm">
        {currentIndex + 1} / {scenes.length}
      </div>

      {/* Duration indicator */}
      {currentScene.duration && (
        <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 font-mono text-sm text-white backdrop-blur-sm">
          {formatTime(currentScene.duration)}
        </div>
      )}

      {/* Thumbnail strip */}
      {showThumbnails && scenes.length > 1 && (
        <div className="absolute bottom-20 left-0 right-0 overflow-x-auto px-4">
          <div className="flex gap-2 pb-2">
            {scenes.map((scene, index) => (
              <button
                key={scene.id}
                onClick={() => handleThumbnailClick(index)}
                className={`group relative shrink-0 transition-all ${
                  index === currentIndex
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-black'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                <div className="h-16 w-24 overflow-hidden rounded-lg bg-slate-800">
                  <img
                    src={scene.thumbnailUrl || scene.imageUrl}
                    alt={scene.title || `Scene ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Active indicator */}
                {index === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                    <div className="h-3 w-3 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress dots (alternative to thumbnails) */}
      {!showThumbnails && scenes.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => handleThumbnailClick(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}

      {/* Audio mute button */}
      {enableAudioSync && (
        <button
          onClick={toggleMute}
          className="absolute right-4 bottom-4 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
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
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute left-4 bottom-4 hidden gap-2 text-xs text-white/50 md:flex">
        <span className="rounded bg-black/30 px-2 py-1">
          <kbd className="font-mono">←</kbd> / <kbd className="font-mono">→</kbd> Navigate
        </span>
        <span className="rounded bg-black/30 px-2 py-1">
          <kbd className="font-mono">Space</kbd> Play/Pause
        </span>
      </div>
    </div>
  );
};

export default SceneViewer;
