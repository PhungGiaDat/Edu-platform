/**
 * LexiLoginLoader.tsx
 *
 * Full-screen loading overlay displayed immediately after successful login.
 * Inspired by Duolingo's login experience — shows Lexi mascot with
 * friendly animations and rotating "content preparing" messages.
 *
 * Features:
 * - Duolingo-inspired design with warm, friendly colors
 * - Lexi mascot with waving/bouncing CSS animations
 * - Rotating loading messages for engagement
 * - Accessible: role="status", aria-live="polite"
 * - Reduced-motion support via media query
 * - Responsive layout for mobile and desktop
 * - Non-blocking: errors are handled by Login.tsx, not this overlay
 */

import React, { useEffect, useState, useMemo } from 'react';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';

interface LexiLoginLoaderProps {
  isVisible: boolean;
  onAnimationEnd?: () => void;
}

// Rotating messages displayed during loading
const LOADING_MESSAGES = [
  'Getting your courses ready...',
  'Loading your learning path...',
  'Preparing AR flashcards...',
  'Setting up your progress tracker...',
  'Almost there!',
];

// CSS animation keyframes (inline styles to avoid global CSS conflicts)
const ANIMATION_STYLES = `
  @keyframes lexi-bounce {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }

  @keyframes lexi-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(15deg); }
    75% { transform: rotate(-5deg); }
  }

  @keyframes lexi-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-8px) rotate(2deg); }
    66% { transform: translateY(-4px) rotate(-2deg); }
  }

  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0.5); }
    50% { opacity: 1; transform: scale(1); }
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(1.4); opacity: 0; }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes text-fade {
    0%, 20% { opacity: 1; }
    40%, 60% { opacity: 0; }
    80%, 100% { opacity: 1; }
  }

  .lexi-loader--visible {
    animation: fadeIn 0.3s ease-out forwards;
  }

  .lexi-loader--hiding {
    animation: fadeOut 0.4s ease-in forwards;
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lexi-float,
    .lexi-bounce {
      animation: none !important;
    }
  }
`;

export const LexiLoginLoader: React.FC<LexiLoginLoaderProps> = ({
  isVisible,
  onAnimationEnd,
}) => {
  // Track current message index
  const [messageIndex, setMessageIndex] = useState(0);
  // Track if we're in hide animation phase
  const [isHiding, setIsHiding] = useState(false);
  // Internal visibility state for smooth transitions
  const [shouldRender, setShouldRender] = useState(false);

  // Start timers when visible
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsHiding(false);

      // Rotate messages every 2.5 seconds
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);

      // Auto-dismiss after timeout (navigation typically completes within 2-3 seconds)
      const timeout = setTimeout(() => {
        onAnimationEnd?.();
      }, 3000); // 3 seconds - enough time for navigation + initial render

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } else if (shouldRender) {
      // Start hide animation when becoming invisible
      setIsHiding(true);
    }
  }, [isVisible, shouldRender, onAnimationEnd]);

  // Handle animation end for hide phase
  const handleTransitionEnd = useMemo(() => {
    return (e: React.TransitionEvent) => {
      if (isHiding && e.propertyName === 'opacity') {
        setShouldRender(false);
        setIsHiding(false);
        setMessageIndex(0);
        onAnimationEnd?.();
      }
    };
  }, [isHiding, onAnimationEnd]);

  // Don't render if not needed
  if (!shouldRender) {
    return null;
  }

  const currentMessage = LOADING_MESSAGES[messageIndex];

  return (
    <>
      {/* Inject animation styles */}
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_STYLES }} />

      {/* Full-screen overlay */}
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden ${
          isHiding ? 'lexi-loader--hiding' : 'lexi-loader--visible'
        }`}
        style={{
          background: 'linear-gradient(135deg, #f7fbff 0%, #fff8ed 50%, #e8f4ff 100%)',
        }}
        role="status"
        aria-live="polite"
        aria-label="Loading your learning experience"
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Floating circles */}
          <div
            className="absolute w-64 h-64 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #5B8DEF 0%, transparent 70%)',
              top: '10%',
              left: '5%',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-48 h-48 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #7BC67E 0%, transparent 70%)',
              bottom: '15%',
              right: '10%',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
          <div
            className="absolute w-32 h-32 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #FFB347 0%, transparent 70%)',
              top: '60%',
              left: '15%',
              animation: 'float 6s ease-in-out infinite 1s',
            }}
          />
        </div>

        {/* Main content card */}
        <div
          className="relative flex flex-col items-center px-8 py-12 rounded-3xl shadow-2xl max-w-md w-full mx-4"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '3px solid rgba(91, 141, 239, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(91, 141, 239, 0.25)',
          }}
        >
          {/* Greeting header */}
          <p
            className="text-sm font-bold uppercase tracking-widest mb-6"
            style={{ color: '#5B8DEF' }}
          >
            Welcome back!
          </p>

          {/* Lexi mascot — spritesheet animation via CodexPetSprite */}
          <div
            className="relative mb-8"
            style={{
              width: '160px',
              height: '160px',
              animation: 'lexi-float 3s ease-in-out infinite',
            }}
          >
            {/* Pulse rings behind mascot */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'rgba(91, 141, 239, 0.15)',
                animation: 'pulse-ring 2s ease-out infinite',
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'rgba(123, 198, 126, 0.15)',
                animation: 'pulse-ring 2s ease-out infinite 0.5s',
              }}
            />

            {/* Spritesheet animation — waving greeting */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ animation: 'lexi-bounce 2s ease-in-out infinite' }}
            >
              <CodexPetSprite
                animationState="waving"
                label="Lexi mascot"
                size={140}
                style={{ filter: 'drop-shadow(0 4px 8px rgba(91,141,239,0.3))' }}
              />
            </div>

            {/* Sparkles around mascot */}
            <div
              className="absolute -top-2 -right-2"
              style={{ animation: 'sparkle 1.5s ease-in-out infinite 0.2s' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFB347">
                <polygon points="12,0 14,10 24,12 14,14 12,24 10,14 0,12 10,10" />
              </svg>
            </div>
            <div
              className="absolute -bottom-1 -left-3"
              style={{ animation: 'sparkle 1.5s ease-in-out infinite 0.7s' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#7BC67E">
                <polygon points="12,0 14,10 24,12 14,14 12,24 10,14 0,12 10,10" />
              </svg>
            </div>
            <div
              className="absolute top-1/2 -right-4"
              style={{ animation: 'sparkle 1.5s ease-in-out infinite 1.2s' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#5B8DEF">
                <polygon points="12,0 14,10 24,12 14,14 12,24 10,14 0,12 10,10" />
              </svg>
            </div>
          </div>

          {/* Loading message */}
          <div className="text-center mb-6">
            <p
              key={messageIndex}
              className="text-lg font-semibold"
              style={{
                color: '#2D3A4A',
                animation: 'text-fade 2.5s ease-in-out infinite',
              }}
            >
              {currentMessage}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="w-full max-w-xs">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(91, 141, 239, 0.2)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #5B8DEF 0%, #7BC67E 100%)',
                  animation: 'shimmer 2s linear infinite',
                  backgroundSize: '200% 100%',
                  width: '70%',
                }}
              />
            </div>
          </div>

          {/* Subtle hint text */}
          <p
            className="mt-6 text-xs"
            style={{ color: '#6B7A8D' }}
          >
            Preparing your personalized learning experience...
          </p>
        </div>

        {/* Lexi name badge */}
        <div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 12px rgba(91, 141, 239, 0.2)',
            border: '2px solid rgba(91, 141, 239, 0.3)',
          }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: '#5B8DEF' }}
          >
            Lexi is excited to see you!
          </span>
        </div>
      </div>
    </>
  );
};

export default LexiLoginLoader;
