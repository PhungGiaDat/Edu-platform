/**
 * Enhanced ImageGallery Component with Zoom and Slideshow
 * Inspired by Duolingo's image gallery for vocabulary learning
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { GalleryImage, ImageGallery as ImageGalleryType } from '@/types/enhancedLesson';
import { getAssetCandidateUrls } from '@/lib/courseAssets';

interface ImageGalleryProps {
  /** Gallery data */
  gallery: ImageGalleryType;
  /** Current locale */
  locale?: 'en' | 'vi';
  /** Callback when an image is selected */
  onImageSelect?: (image: GalleryImage, index: number) => void;
  /** Callback when gallery is completed */
  onComplete?: (viewedCount: number, totalCount: number) => void;
  /** Enable zoom functionality */
  enableZoom?: boolean;
  /** Enable slideshow mode */
  enableSlideshow?: boolean;
  /** Number of columns in grid view */
  columns?: 2 | 3 | 4;
  /** Show category filters */
  showFilters?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ZoomState {
  isOpen: boolean;
  image: GalleryImage | null;
  index: number;
  scale: number;
  position: { x: number; y: number };
  rotation: number;
}

interface SlideshowState {
  isPlaying: boolean;
  currentIndex: number;
  interval: number;
}

const ImageCard: React.FC<{
  image: GalleryImage;
  onClick: () => void;
  isSelected?: boolean;
}> = ({ image, onClick, isSelected }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const urls = getAssetCandidateUrls(image.asset);
    if (urls.length > 0) {
      setImageUrl(urls[0]);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [image.asset]);

  return (
    <button
      onClick={onClick}
      className={`group relative aspect-square overflow-hidden rounded-2xl border-4 transition-all ${
        isSelected
          ? 'border-yellow-400 shadow-lg ring-4 ring-yellow-400/30'
          : 'border-white shadow-md hover:border-yellow-300 hover:shadow-lg'
      }`}
    >
      {/* Image */}
      <img
        src={imageUrl}
        alt={image.altText}
        className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-110 ${
          isLoading ? 'animate-pulse bg-slate-200' : ''
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        loading="lazy"
        decoding="async"
      />

      {/* Loading/Error placeholder */}
      {(isLoading || hasError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          {isLoading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          ) : (
            <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
      )}

      {/* Caption overlay on hover */}
      {image.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <p className="text-sm font-medium text-white">{image.caption}</p>
        </div>
      )}

      {/* Zoom icon */}
      {image.dimensions && (
        <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
            />
          </svg>
        </div>
      )}
    </button>
  );
};

const ZoomModal: React.FC<{
  image: GalleryImage;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}> = ({ image, onClose, onNext, onPrev, hasNext, hasPrev }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urls = getAssetCandidateUrls(image.asset);
    if (urls.length > 0) {
      setImageUrl(urls[0]);
    }
    // Reset zoom state when image changes
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [image.asset]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(4, prev + delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(4, prev + 0.5));
  const handleZoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.5));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleResetZoom();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, hasNext, hasPrev]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation buttons */}
      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev?.();
          }}
          className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext?.();
          }}
          className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <span className="min-w-16 text-center text-sm font-medium text-white">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="mx-2 h-6 w-px bg-white/30" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleResetZoom();
          }}
          className="rounded-full p-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          Reset
        </button>
      </div>

      {/* Image container */}
      <div
        ref={zoomContainerRef}
        className="relative max-h-[85vh] max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        {isLoading && (
          <div className="flex h-96 w-96 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          </div>
        )}

        <img
          src={imageUrl}
          alt={image.altText}
          className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          onLoad={() => setIsLoading(false)}
          draggable={false}
        />

        {/* Caption */}
        {image.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-center text-lg font-medium text-white">{image.caption}</p>
            {image.attribution && (
              <p className="mt-1 text-center text-sm text-white/60">{image.attribution}</p>
            )}
          </div>
        )}

        {/* Dimensions info */}
        {image.dimensions && (
          <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {image.dimensions.width} x {image.dimensions.height}
          </div>
        )}
      </div>
    </div>
  );
};

const Slideshow: React.FC<{
  images: GalleryImage[];
  initialIndex?: number;
  interval?: number;
  onClose: () => void;
  onImageChange?: (index: number) => void;
}> = ({ images, initialIndex = 0, interval = 5, onClose, onImageChange }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentImage = images[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = (prev + 1) % images.length;
      onImageChange?.(next);
      return next;
    });
    setProgress(0);
  }, [images.length, onImageChange]);

  const goPrev = () => {
    setCurrentIndex((prev) => {
      const next = (prev - 1 + images.length) % images.length;
      onImageChange?.(next);
      return next;
    });
    setProgress(0);
  };

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            goNext();
            return 0;
          }
          return prev + 100 / (interval * 10);
        });
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, interval, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goNext, goPrev]);

  const [imageUrl, setImageUrl] = useState<string>('');
  useEffect(() => {
    if (currentImage) {
      const urls = getAssetCandidateUrls(currentImage.asset);
      if (urls.length > 0) setImageUrl(urls[0]);
    }
  }, [currentImage?.asset]);

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation */}
      <button
        onClick={goPrev}
        className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
      >
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goNext}
        className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
      >
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Image */}
      <img
        src={imageUrl}
        alt={currentImage.altText}
        className="max-h-[80vh] max-w-[90vw] object-contain"
      />

      {/* Caption */}
      {currentImage.caption && (
        <div className="absolute inset-x-0 bottom-20 bg-gradient-to-t from-black/80 to-transparent p-4 text-center">
          <p className="text-xl font-medium text-white">{currentImage.caption}</p>
          <p className="mt-1 text-sm text-white/60">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      )}

      {/* Progress bar and controls */}
      <div className="absolute bottom-4 inset-x-4 flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
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

        {/* Progress bar */}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full bg-yellow-400 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time display */}
        <span className="text-sm text-white">
          {currentIndex + 1}/{images.length}
        </span>
      </div>

      {/* Thumbnail strip */}
      <div className="absolute bottom-24 left-1/2 flex max-w-full -translate-x-1/2 gap-2 overflow-x-auto px-4">
        {images.slice(Math.max(0, currentIndex - 5), currentIndex + 6).map((img, idx) => {
          const actualIndex = Math.max(0, currentIndex - 5) + idx;
          const urls = getAssetCandidateUrls(img.asset);
          return (
            <button
              key={img.image_id}
              onClick={() => {
                setCurrentIndex(actualIndex);
                setProgress(0);
                onImageChange?.(actualIndex);
              }}
              className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                actualIndex === currentIndex
                  ? 'border-yellow-400 opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-80'
              }`}
            >
              <img
                src={urls[0] || ''}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  gallery,
  locale: _locale = 'en',
  onImageSelect,
  onComplete,
  enableZoom = true,
  enableSlideshow = true,
  columns = 3,
  showFilters = true,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewedImages, setViewedImages] = useState<Set<string>>(new Set());
  const [zoomState, setZoomState] = useState<ZoomState>({
    isOpen: false,
    image: null,
    index: 0,
    scale: 1,
    position: { x: 0, y: 0 },
    rotation: 0,
  });
  const [slideshowState, setSlideshowState] = useState<SlideshowState>({
    isPlaying: false,
    currentIndex: 0,
    interval: gallery.slideshowInterval || 5,
  });
  const [showGrid, setShowGrid] = useState(true);

  // Filter images by category
  const filteredImages = selectedCategory
    ? gallery.categories?.find((c) => c.category_id === selectedCategory)?.images || gallery.allImages
    : gallery.allImages;

  // Mark image as viewed
  const markAsViewed = (imageId: string) => {
    setViewedImages((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      // Check if all images are viewed
      if (next.size === gallery.allImages.length) {
        onComplete?.(next.size, gallery.allImages.length);
      }
      return next;
    });
  };

  // Handle image click
  const handleImageClick = (image: GalleryImage, index: number) => {
    markAsViewed(image.image_id);
    onImageSelect?.(image, index);
    if (enableZoom) {
      setZoomState({
        isOpen: true,
        image,
        index,
        scale: 1,
        position: { x: 0, y: 0 },
        rotation: 0,
      });
    }
  };

  // Zoom navigation
  const handleZoomNext = () => {
    if (zoomState.index < filteredImages.length - 1) {
      const nextIndex = zoomState.index + 1;
      const nextImage = filteredImages[nextIndex];
      markAsViewed(nextImage.image_id);
      setZoomState((prev) => ({
        ...prev,
        image: nextImage,
        index: nextIndex,
        scale: 1,
        position: { x: 0, y: 0 },
      }));
    }
  };

  const handleZoomPrev = () => {
    if (zoomState.index > 0) {
      const prevIndex = zoomState.index - 1;
      const prevImage = filteredImages[prevIndex];
      markAsViewed(prevImage.image_id);
      setZoomState((prev) => ({
        ...prev,
        image: prevImage,
        index: prevIndex,
        scale: 1,
        position: { x: 0, y: 0 },
      }));
    }
  };

  const closeZoom = () => {
    setZoomState((prev) => ({ ...prev, isOpen: false }));
  };

  // Slideshow handlers
  const openSlideshow = (startIndex: number = 0) => {
    setSlideshowState((prev) => ({ ...prev, isPlaying: true, currentIndex: startIndex }));
  };

  const closeSlideshow = () => {
    setSlideshowState((prev) => ({ ...prev, isPlaying: false }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-800">{gallery.title}</h3>
          {gallery.description && (
            <p className="mt-1 text-sm text-slate-500">{gallery.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border-4 border-white bg-white p-1 shadow-md">
            <button
              onClick={() => setShowGrid(true)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                showGrid ? 'bg-yellow-400 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setShowGrid(false)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !showGrid ? 'bg-yellow-400 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              List
            </button>
          </div>

          {/* Slideshow button */}
          {enableSlideshow && gallery.enableSlideshow && (
            <button
              onClick={() => openSlideshow(0)}
              className="flex items-center gap-2 rounded-lg border-4 border-white bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-md transition-colors hover:bg-slate-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Slideshow
            </button>
          )}
        </div>
      </div>

      {/* Category filters */}
      {showFilters && gallery.categories && gallery.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-yellow-400 text-slate-900'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({gallery.allImages.length})
          </button>
          {gallery.categories.map((category) => (
            <button
              key={category.category_id}
              onClick={() => setSelectedCategory(category.category_id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category.category_id
                  ? 'bg-yellow-400 text-slate-900'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
              <span className="text-xs opacity-60">({category.images.length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Progress indicator */}
      {viewedImages.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-md">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(viewedImages.size / gallery.allImages.length) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-600">
            {viewedImages.size} / {gallery.allImages.length} viewed
          </span>
        </div>
      )}

      {/* Image grid */}
      {showGrid ? (
        <div
          className={`grid gap-3`}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {filteredImages.map((image, index) => (
            <ImageCard
              key={image.image_id}
              image={image}
              onClick={() => handleImageClick(image, index)}
              isSelected={zoomState.image?.image_id === image.image_id && zoomState.isOpen}
            />
          ))}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filteredImages.map((image, index) => (
            <button
              key={image.image_id}
              onClick={() => handleImageClick(image, index)}
              className={`flex w-full items-center gap-4 rounded-xl border-4 bg-white p-3 text-left transition-all hover:shadow-md ${
                viewedImages.has(image.image_id) ? 'border-green-200' : 'border-white'
              }`}
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 border-slate-100">
                <img
                  src={getAssetCandidateUrls(image.asset)[0]}
                  alt={image.altText}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800">{image.altText}</p>
                {image.caption && (
                  <p className="truncate text-sm text-slate-500">{image.caption}</p>
                )}
              </div>
              {viewedImages.has(image.image_id) && (
                <div className="flex-shrink-0 rounded-full bg-green-100 p-1.5">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredImages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-4 border-dashed border-slate-200 bg-slate-50 py-12">
          <svg className="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-lg font-medium text-slate-500">No images in this category</p>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomState.isOpen && zoomState.image && (
        <ZoomModal
          image={zoomState.image}
          onClose={closeZoom}
          onNext={handleZoomNext}
          onPrev={handleZoomPrev}
          hasNext={zoomState.index < filteredImages.length - 1}
          hasPrev={zoomState.index > 0}
        />
      )}

      {/* Slideshow */}
      {slideshowState.isPlaying && (
        <Slideshow
          images={filteredImages}
          initialIndex={slideshowState.currentIndex}
          interval={slideshowState.interval}
          onClose={closeSlideshow}
        />
      )}
    </div>
  );
};

export default ImageGallery;
