/**
 * Skeleton components — claymorphic loading placeholders.
 * Matches the final layout of LessonPlayer sections so there is no
 * content layout shift when data arrives.
 */
import React from 'react';

const DISPLAY_FONT = "'Baloo 2', 'Quicksand', system-ui, sans-serif";

/** Claymorphic shimmer animation */
const shimmerKeyframes = `
  @keyframes skel-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skel-shimmer {
    animation: skel-shimmer 1.4s ease-in-out infinite;
    background: linear-gradient(
      90deg,
      rgba(26, 39, 68, 0.06) 0%,
      rgba(26, 39, 68, 0.12) 50%,
      rgba(26, 39, 68, 0.06) 100%
    );
    background-size: 200% 100%;
  }
`;

const styleTag = <style>{shimmerKeyframes}</style>;

/** Claymorphic pill placeholder */
export const SkelPill: React.FC<{ width?: number | string; height?: number; className?: string }> = ({
  width = 80,
  height = 28,
  className = '',
}) => (
  <div
    className={`skel-shimmer rounded-3xl ${className}`}
    style={{
      width: typeof width === 'number' ? width : width,
      height,
      border: '3px solid #fff',
      boxShadow: '0 3px 0 rgba(148,163,184,0.10)',
    }}
  />
);

/** Claymorphic card placeholder */
export const SkelCard: React.FC<{ height?: number; className?: string }> = ({
  height = 120,
  className = '',
}) => (
  <div
    className={`skel-shimmer rounded-[28px] border-4 border-white ${className}`}
    style={{
      height,
      boxShadow: '0 8px 0 rgba(148,163,184,0.08)',
    }}
  />
);

/** Claymorphic avatar placeholder */
export const SkelAvatar: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div
    className="skel-shimmer rounded-2xl"
    style={{
      width: size,
      height: size,
      border: '3px solid #fff',
      boxShadow: '0 4px 0 rgba(148,163,184,0.10)',
    }}
  />
);

/** Full LessonPlayer loading skeleton — matches the real layout */
export const LessonPlayerSkeleton: React.FC = () => {
  return (
    <div
      className="flex min-h-[100dvh] w-full max-w-[100vw] min-w-0 flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom)+4rem)]"
      style={{ background: '#F7FBFF', fontFamily: DISPLAY_FONT }}
    >
      {styleTag}
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col px-3 py-4 sm:px-6 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div
            className="skel-shimmer rounded-[22px] border-4 border-white"
            style={{ width: 80, height: 44, boxShadow: '0 6px 0 rgba(148,163,184,0.18)' }}
          />
          <div
            className="skel-shimmer rounded-full border-4 border-white"
            style={{ width: 120, height: 36, boxShadow: '0 4px 0 rgba(148,163,184,0.12)' }}
          />
        </div>

        {/* Title card skeleton */}
        <div
          className="mb-4 rounded-[34px] border-4 border-white"
          style={{ background: '#fff', padding: '1rem', boxShadow: '0 12px 0 rgba(91,141,239,0.12)' }}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div className="space-y-3">
              <div
                className="skel-shimmer rounded-3xl"
                style={{ width: 60, height: 20 }}
              />
              <div
                className="skel-shimmer rounded-3xl"
                style={{ width: '70%', height: 48 }}
              />
              <div
                className="skel-shimmer rounded-3xl"
                style={{ width: '50%', height: 28 }}
              />
              <div className="space-y-2">
                <div className="skel-shimmer rounded-2xl" style={{ width: '100%', height: 16 }} />
                <div className="skel-shimmer rounded-2xl" style={{ width: '85%', height: 16 }} />
              </div>
            </div>
            {/* Stats column */}
            <div
              className="skel-shimmer rounded-[26px]"
              style={{ height: 160, border: '3px solid #fff' }}
            />
          </div>
        </div>

        {/* Step tabs skeleton */}
        <div className="mb-4 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="skel-shimmer rounded-[20px]"
              style={{
                width: 60 + i * 8,
                height: 44,
                border: '3px solid #fff',
                boxShadow: '0 4px 0 rgba(148,163,184,0.10)',
              }}
            />
          ))}
        </div>

        {/* Main content skeleton */}
        <div
          className="min-h-0 flex-1 rounded-[36px] border-4 border-white"
          style={{ background: '#FFF8D8', padding: '1.25rem', boxShadow: '0 12px 0 rgba(229,184,0,0.14)' }}
        >
          {/* Status pills */}
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="skel-shimmer rounded-3xl" style={{ width: 100, height: 28, border: '3px solid #fff' }} />
            <div className="skel-shimmer rounded-3xl" style={{ width: 80, height: 28, border: '3px solid #fff' }} />
          </div>

          {/* Content card */}
          <div
            className="rounded-[28px] border-4 border-white"
            style={{ background: '#fff', padding: '1.25rem', boxShadow: '0 8px 0 rgba(229,184,0,0.08)' }}
          >
            <div className="mb-4 space-y-3">
              <div className="skel-shimmer rounded-3xl" style={{ width: '40%', height: 40 }} />
              <div className="skel-shimmer rounded-2xl" style={{ width: '90%', height: 20 }} />
              <div className="skel-shimmer rounded-2xl" style={{ width: '75%', height: 20 }} />
            </div>

            {/* Media placeholder */}
            <div
              className="skel-shimmer rounded-[26px]"
              style={{ height: 200, border: '3px solid #fff', boxShadow: '0 6px 0 rgba(229,184,0,0.06)' }}
            />

            {/* Action button */}
            <div
              className="skel-shimmer mt-4 rounded-[20px]"
              style={{ width: 160, height: 52, border: '3px solid #fff', boxShadow: '0 4px 0 rgba(229,184,0,0.10)' }}
            />
          </div>
        </div>

        {/* Footer skeleton */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="skel-shimmer rounded-[24px]" style={{ height: 56, border: '3px solid #fff', boxShadow: '0 8px 0 rgba(148,163,184,0.18)' }} />
          <div className="skel-shimmer rounded-[24px]" style={{ height: 56, border: '3px solid #fff', boxShadow: '0 8px 0 rgba(229,184,0,0.22)' }} />
        </div>
      </div>
    </div>
  );
};

export default LessonPlayerSkeleton;
