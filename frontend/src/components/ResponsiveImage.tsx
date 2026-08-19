import React from 'react';

/**
 * ResponsiveImage Component
 * 
 * Provides mobile-first responsive images with:
 * - Lazy loading for offscreen images
 * - Responsive srcset for different screen sizes
 * - WebP format support with JPEG fallback
 * - Fixed aspect ratio to prevent CLS (layout shift)
 * 
 * Usage:
 * <ResponsiveImage
 *   src="image-640w.jpg"
 *   srcSet="image-320w.jpg 320w, image-640w.jpg 640w, image-1024w.jpg 1024w"
 *   alt="Description"
 *   aspectRatio="16/9"
 *   lazy={true}
 *   webp={true}
 * />
 */

interface ResponsiveImageProps {
  /** Default image source (fallback, should be ~640px width) */
  src: string;
  /** Responsive image sources: "image-320w.jpg 320w, image-640w.jpg 640w, ..." */
  srcSet?: string;
  /** Image sizes for each breakpoint: "(max-width: 640px) 100vw, ..." */
  sizes?: string;
  /** Alternative text for accessibility */
  alt: string;
  /** CSS aspect ratio: "16/9", "4/3", "1/1", etc. */
  aspectRatio?: string;
  /** Enable lazy loading (for offscreen images) */
  lazy?: boolean;
  /** WebP source (if available) */
  webpSrc?: string;
  /** WebP srcSet if responsive */
  webpSrcSet?: string;
  /** CSS class for additional styling */
  className?: string;
  /** Image title for tooltip */
  title?: string;
  /** Container width constraint (max-w-md, max-w-lg, etc.) */
  maxWidth?: string;
  /** On load callback */
  onLoad?: () => void;
  /** On error callback */
  onError?: () => void;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  srcSet,
  sizes,
  alt,
  aspectRatio = 'auto',
  lazy = true,
  webpSrc,
  webpSrcSet,
  className = '',
  title,
  maxWidth = '',
  onLoad,
  onError,
}) => {
  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined,
    overflow: 'hidden',
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  };

  const containerClasses = [
    'w-full',
    maxWidth || 'max-w-full',
    className,
  ].filter(Boolean).join(' ');

  const img = (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      title={title}
      style={imgStyle}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      onLoad={onLoad}
      onError={onError}
    />
  );

  // If WebP not needed, return simple image with responsive layout
  if (!webpSrc) {
    return (
      <div className={containerClasses} style={containerStyle}>
        {img}
      </div>
    );
  }

  // With WebP support using <picture> element
  return (
    <div className={containerClasses} style={containerStyle}>
      <picture>
        {/* WebP format (modern browsers) */}
        <source
          srcSet={webpSrcSet || webpSrc}
          sizes={sizes}
          type="image/webp"
        />
        {/* JPEG fallback (older browsers) */}
        <source
          srcSet={srcSet}
          sizes={sizes}
          type="image/jpeg"
        />
        {/* Fallback img tag */}
        {img}
      </picture>
    </div>
  );
};

/**
 * Usage Examples:
 * 
 * 1. Simple responsive image (no WebP)
 * <ResponsiveImage
 *   src="course-640w.jpg"
 *   srcSet="course-320w.jpg 320w, course-640w.jpg 640w, course-1024w.jpg 1024w"
 *   sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
 *   alt="Course thumbnail"
 *   aspectRatio="16/9"
 *   lazy={true}
 * />
 * 
 * 2. Image with WebP + lazy loading
 * <ResponsiveImage
 *   src="hero-640w.jpg"
 *   srcSet="hero-320w.jpg 320w, hero-640w.jpg 640w, hero-1024w.jpg 1024w"
 *   webpSrc="hero-640w.webp"
 *   webpSrcSet="hero-320w.webp 320w, hero-640w.webp 640w, hero-1024w.webp 1024w"
 *   sizes="100vw"
 *   alt="Hero section"
 *   aspectRatio="16/9"
 *   lazy={false}  // Hero is above fold
 * />
 * 
 * 3. Avatar image with max-width
 * <ResponsiveImage
 *   src="avatar-200w.jpg"
 *   alt="User avatar"
 *   aspectRatio="1/1"
 *   maxWidth="max-w-24"
 *   className="rounded-full"
 *   lazy={true}
 * />
 */
