/**
 * Enhanced VideoPlayer Component with Captions Support
 * Inspired by Duolingo's video player with chapter markers and captions
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { VideoCaption, VideoChapterMarker } from '@/types/enhancedLesson';

interface VideoPlayerProps {
  /** Video source URL */
  src: string;
  /** Alternative video sources */
  sources?: Array<{ url: string; quality: string; mimeType: string }>;
  /** Thumbnail/preview image URL */
  thumbnailUrl?: string;
  /** Caption tracks */
  captions?: VideoCaption[];
  /** Chapter markers for navigation */
  chapterMarkers?: VideoChapterMarker[];
  /** Video title */
  title?: string;
  /** Auto-play video */
  autoPlay?: boolean;
  /** Loop video */
  loop?: boolean;
  /** Muted by default */
  muted?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Show chapter markers on timeline */
  showChapterMarkers?: boolean;
  /** Callback when video ends */
  onEnded?: () => void;
  /** Callback when video plays */
  onPlay?: () => void;
  /** Callback when video pauses */
  onPause?: () => void;
  /** Callback on time update (every 250ms) */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Callback when caption is changed */
  onCaptionChange?: (caption: VideoCaption | null) => void;
  /** Additional CSS classes */
  className?: string;
  /** Enable keyboard shortcuts */
  enableKeyboardShortcuts?: boolean;
  /** Playback speeds available */
  playbackSpeeds?: number[];
}

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  chapterMarkers?: VideoChapterMarker[];
  onSeek: (time: number) => void;
  onChapterClick?: (marker: VideoChapterMarker) => void;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  buffered,
  chapterMarkers = [],
  onSeek,
  onChapterClick,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    onSeek(newTime);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        onSeek(percent * duration);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, duration, onSeek]);

  return (
    <div
      ref={progressRef}
      className="group relative h-2 w-full cursor-pointer rounded-full bg-white/30 transition-all hover:h-3"
      onClick={handleProgressClick}
      onMouseDown={handleMouseDown}
    >
      {/* Buffered indicator */}
      <div
        className="absolute h-full rounded-full bg-white/50 transition-all"
        style={{ width: `${bufferedPercent}%` }}
      />

      {/* Chapter markers */}
      {chapterMarkers.map((marker, index) => {
        const position = duration > 0 ? (marker.startTime / duration) * 100 : 0;
        return (
          <div
            key={marker.title + index}
            className="absolute top-1/2 z-10 h-3 w-1 -translate-y-1/2 cursor-pointer rounded-full bg-yellow-400 opacity-80 transition-all hover:scale-125 hover:opacity-100"
            style={{ left: `${position}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onChapterClick?.(marker);
            }}
            title={marker.title}
          />
        );
      })}

      {/* Current progress */}
      <div
        className="absolute h-full rounded-full bg-yellow-400 transition-all"
        style={{ width: `${progressPercent}%` }}
      />

      {/* Scrubber handle */}
      <div
        className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 shadow-lg transition-all ${
          isDragging ? 'scale-125 opacity-100' : 'scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'
        }`}
        style={{ left: `${progressPercent}%` }}
      />
    </div>
  );
};

export const EnhancedVideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  sources = [],
  thumbnailUrl,
  captions = [],
  chapterMarkers = [],
  title,
  autoPlay = false,
  loop = false,
  muted = false,
  showProgress = true,
  showChapterMarkers = true,
  onEnded,
  onPlay,
  onPause,
  onTimeUpdate,
  onCaptionChange,
  className = '',
  enableKeyboardShortcuts = true,
  playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeCaption, setActiveCaption] = useState<VideoCaption | null>(
    captions.find((c) => c.isDefault) || captions[0] || null
  );
  const [showCaptions, setShowCaptions] = useState(true);
  const [showCaptionsMenu, setShowCaptionsMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChapters, setShowChapters] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowCaptionsMenu(false);
        setShowSpeedMenu(false);
        setShowChapters(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Handle video events
  const handlePlay = () => {
    setIsPlaying(true);
    onPlay?.();
    resetControlsTimer();
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPause?.();
    resetControlsTimer();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    onEnded?.();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onTimeUpdate?.(video.currentTime, video.duration);

    // Update buffered
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setIsLoading(false);
  };

  const handleError = () => {
    setError('Failed to load video');
    setIsLoading(false);
  };

  // Playback controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration));
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    video.volume = clampedVolume;
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      if (video.volume === 0) {
        video.volume = 0.5;
        setVolume(0.5);
      }
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleCaptionToggle = () => {
    setShowCaptions(!showCaptions);
    if (!showCaptions) {
      const video = videoRef.current;
      if (video && video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing';
      }
    } else {
      const video = videoRef.current;
      if (video && video.textTracks.length > 0) {
        video.textTracks[0].mode = 'hidden';
      }
    }
  };

  const handleCaptionSelect = (caption: VideoCaption | null) => {
    setActiveCaption(caption);
    setShowCaptionsMenu(false);
    onCaptionChange?.(caption);
  };

  const handleChapterClick = (marker: VideoChapterMarker) => {
    handleSeek(marker.startTime);
    setShowChapters(false);
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || !containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          handleCaptionToggle();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, isPlaying, volume, isMuted]);

  // Auto-play on mount
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [autoPlay]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Generate VTT content for captions
  const generateVTT = (caption: VideoCaption): string => {
    const lines = ['WEBVTT', '', `NOTE ${caption.label}`, ''];
    const segments = caption.content.split('\n');
    segments.forEach((segment, index) => {
      if (segment.trim()) {
        const start = index * 5;
        const end = start + 5;
        lines.push(`${formatTime(start)} --> ${formatTime(end)}`);
        lines.push(segment);
        lines.push('');
      }
    });
    return lines.join('\n');
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl bg-black ${className}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      tabIndex={0}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="h-full w-full"
        src={src}
        poster={thumbnailUrl}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      >
        {/* Alternative sources */}
        {sources.map((source, index) => (
          <source key={index} src={source.url} type={source.mimeType} />
        ))}

        {/* Caption tracks */}
        {captions.map((caption) => (
          <track
            key={caption.caption_id}
            kind="subtitles"
            src={`data:text/vtt;base64,${btoa(generateVTT(caption))}`}
            srcLang={caption.language}
            label={caption.label}
            default={caption.isDefault}
          />
        ))}
      </video>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
          <svg className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-4 text-lg font-semibold">{error}</p>
        </div>
      )}

      {/* Big play button overlay */}
      {!isPlaying && !isLoading && !error && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          onClick={togglePlay}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-lg transition-transform hover:scale-110">
            <svg className="ml-1 h-10 w-10 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* Click to play/pause */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          togglePlay();
        }}
      />

      {/* Caption display */}
      {showCaptions && activeCaption && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 max-w-2xl -translate-x-1/2">
          <div className="rounded-lg bg-black/80 px-4 py-2 text-center text-white">
            <p className="text-lg font-medium">{activeCaption.content}</p>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="p-4">
          {/* Progress bar */}
          {showProgress && (
            <div className="mb-4">
              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                buffered={buffered}
                chapterMarkers={showChapterMarkers ? chapterMarkers : []}
                onSeek={handleSeek}
                onChapterClick={handleChapterClick}
              />
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
              >
                {isPlaying ? (
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Skip backward */}
              <button
                onClick={() => skip(-10)}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                title="Skip back 10 seconds"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                  <text x="12" y="15" textAnchor="middle" fontSize="7" fill="currentColor">
                    10
                  </text>
                </svg>
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                title="Skip forward 10 seconds"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                  <text x="12" y="15" textAnchor="middle" fontSize="7" fill="currentColor">
                    10
                  </text>
                </svg>
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                >
                  {isMuted || volume === 0 ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="h-1 w-20 cursor-pointer accent-yellow-400"
                />
              </div>

              {/* Time display */}
              <span className="text-sm font-medium text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Chapters */}
              {chapterMarkers.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowChapters(!showChapters)}
                    className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                    title="Chapters"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8V9zm0 3h4v2h-4v-2zm0-6h8v2h-8V6z" />
                    </svg>
                  </button>

                  {showChapters && (
                    <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-slate-800 p-2 shadow-xl">
                      <p className="mb-2 px-2 text-xs font-semibold text-white/60">Chapters</p>
                      {chapterMarkers.map((marker, index) => (
                        <button
                          key={index}
                          onClick={() => handleChapterClick(marker)}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        >
                          <span className="text-xs text-white/60">{formatTime(marker.startTime)}</span>
                          <span>{marker.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Captions */}
              {captions.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowCaptionsMenu(!showCaptionsMenu)}
                    className={`rounded-full p-2 transition-colors hover:bg-white/20 ${
                      showCaptions ? 'text-yellow-400' : 'text-white'
                    }`}
                    title="Captions"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
                    </svg>
                  </button>

                  {showCaptionsMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-slate-800 p-2 shadow-xl">
                      <button
                        onClick={() => handleCaptionToggle()}
                        className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-white transition-colors hover:bg-white/10"
                      >
                        <span>{showCaptions ? 'Hide' : 'Show'} Captions</span>
                        <span className="text-xs text-yellow-400">{showCaptions ? 'ON' : 'OFF'}</span>
                      </button>
                      {captions.map((caption) => (
                        <button
                          key={caption.caption_id}
                          onClick={() => handleCaptionSelect(caption)}
                          className={`flex w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10 ${
                            activeCaption?.caption_id === caption.caption_id
                              ? 'text-yellow-400'
                              : 'text-white'
                          }`}
                        >
                          {caption.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Playback speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                  title="Playback speed"
                >
                  <span className="text-sm font-bold">{playbackSpeed}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-24 rounded-lg bg-slate-800 p-2 shadow-xl">
                    {playbackSpeeds.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`flex w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-white/10 ${
                          playbackSpeed === speed ? 'text-yellow-400' : 'text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Title overlay */}
      {title && showControls && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPlayer;
