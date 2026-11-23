import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface GalleryImage {
  id: string;
  src: string;
  thumbnail: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface LessonImageGalleryProps {
  images: GalleryImage[];
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  enableLightbox?: boolean;
  enableZoom?: boolean;
  enableSwipe?: boolean;
  onImageClick?: (image: GalleryImage, index: number) => void;
}

const formatGap = (gap: 'sm' | 'md' | 'lg'): string => {
  switch (gap) {
    case 'sm': return 'gap-2';
    case 'md': return 'gap-3';
    case 'lg': return 'gap-4';
  }
};

const formatCols = (cols: 2 | 3 | 4): string => {
  switch (cols) {
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-3';
    case 4: return 'grid-cols-4';
  }
};

interface LightboxProps {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
  enableZoom?: boolean;
  enableSwipe?: boolean;
}

const Lightbox: React.FC<LightboxProps> = ({
  images,
  initialIndex,
  onClose,
  enableZoom = true,
  enableSwipe = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [swipeStart, setSwipeStart] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentImage = images[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          setZoomLevel(1);
          setPanPosition({ x: 0, y: 0 });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    resetZoom();
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    resetZoom();
  }, [images.length]);

  const resetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.5, 1);
    setZoomLevel(newZoom);
    if (newZoom === 1) {
      setPanPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!enableZoom) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setSwipeStart(e.touches[0].clientX);
      setIsSwiping(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || !enableSwipe) return;
    if (e.touches.length === 1 && zoomLevel === 1) {
      const currentX = e.touches[0].clientX;
      const diff = swipeStart - currentX;
      
      if (Math.abs(diff) > 10) {
        // Visual feedback during swipe
        const container = containerRef.current;
        if (container) {
          container.style.transform = `translateX(${-diff * 0.3}px)`;
        }
      }
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - panPosition.x, y: e.touches[0].clientY - panPosition.y });
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping || !enableSwipe) return;
    
    const container = containerRef.current;
    if (container) {
      container.style.transform = '';
    }

    const diff = dragStart.x - swipeStart;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    setIsSwiping(false);
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="relative max-h-full max-w-full overflow-hidden"
        style={{ transition: isSwiping ? 'none' : 'transform 0.3s ease' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          ref={imageRef}
          src={currentImage?.src}
          alt={currentImage?.alt}
          className="max-h-screen max-w-screen object-contain"
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
          draggable={false}
        />
      </div>

      {/* Zoom controls */}
      {enableZoom && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-4 py-2">
          <button
            onClick={handleZoomOut}
            className="rounded-lg p-2 text-white transition hover:bg-white/20"
            disabled={zoomLevel <= 1}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="min-w-[4rem] text-center font-mono text-sm text-white">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="rounded-lg p-2 text-white transition hover:bg-white/20"
            disabled={zoomLevel >= 4}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="ml-2 rounded-lg p-2 text-white transition hover:bg-white/20"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      )}

      {/* Caption and counter */}
      <div className="absolute bottom-4 left-4 z-10">
        <p className="text-sm text-white/80">{currentImage?.caption || currentImage?.alt}</p>
        <p className="mt-1 font-mono text-xs text-white/60">
          {currentIndex + 1} / {images.length}
        </p>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => {
                setCurrentIndex(idx);
                resetZoom();
              }}
              className={`h-12 w-12 overflow-hidden rounded border-2 transition ${
                idx === currentIndex ? 'border-white' : 'border-transparent opacity-60'
              }`}
            >
              <img
                src={img.thumbnail}
                alt={img.alt}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const LessonImageGallery: React.FC<LessonImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 'md',
  enableLightbox = true,
  enableZoom = true,
  enableSwipe = true,
  onImageClick,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const imageRefs = useRef<Map<string, HTMLImageElement>>(new Map());

  const handleImageClick = (image: GalleryImage, index: number) => {
    if (enableLightbox) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
    onImageClick?.(image, index);
  };

  const handleLightboxClose = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Lazy loading observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    imageRefs.current.forEach((img) => {
      if (img.dataset.src) {
        observer.observe(img);
      }
    });

    return () => observer.disconnect();
  }, [images]);

  const setImageRef = (id: string, el: HTMLImageElement | null) => {
    if (el) {
      imageRefs.current.set(id, el);
    } else {
      imageRefs.current.delete(id);
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 p-8 text-slate-500">
        No images available
      </div>
    );
  }

  return (
    <>
      <div className={`grid ${formatCols(columns)} ${formatGap(gap)}`}>
        {images.map((image, index) => (
          <button
            key={image.id}
            onClick={() => handleImageClick(image, index)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100 transition hover:ring-2 hover:ring-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <img
              ref={(el) => setImageRef(image.id, el)}
              data-src={image.thumbnail}
              src={image.thumbnail}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
              {image.caption && (
                <p className="mb-3 px-3 text-sm text-white">{image.caption}</p>
              )}
            </div>
            {/* Expand icon */}
            <div className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 opacity-0 transition group-hover:opacity-100">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={handleLightboxClose}
          enableZoom={enableZoom}
          enableSwipe={enableSwipe}
        />
      )}
    </>
  );
};

export default LessonImageGallery;
