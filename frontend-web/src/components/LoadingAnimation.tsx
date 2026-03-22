// src/components/LoadingAnimation.tsx
// Kid-friendly loading animations with multiple variants

import React from 'react';

type LoadingVariant = 'bouncing' | 'rocket' | 'stars' | 'animals' | 'rainbow';
type LoadingSize = 'small' | 'medium' | 'large';

interface LoadingAnimationProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  fullScreen?: boolean;
}

/**
 * Kid-Friendly Loading Animation Component
 * Features playful, colorful animations that keep kids engaged while waiting
 */
export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  variant = 'bouncing',
  size = 'medium',
  message = 'Loading...',
  fullScreen = false
}) => {
  const sizeConfig = {
    small: { emoji: 'text-3xl', text: 'text-sm', gap: 'gap-1', container: 'p-4' },
    medium: { emoji: 'text-5xl', text: 'text-lg', gap: 'gap-2', container: 'p-6' },
    large: { emoji: 'text-7xl', text: 'text-2xl', gap: 'gap-3', container: 'p-8' }
  };

  const config = sizeConfig[size];

  const renderLoader = () => {
    switch (variant) {
      case 'bouncing':
        return (
          <div className={`flex items-end ${config.gap}`}>
            {['🔵', '🟢', '🟡', '🟠', '🔴'].map((dot, i) => (
              <span
                key={i}
                className={`${config.emoji} animate-bounce`}
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              >
                {dot}
              </span>
            ))}
          </div>
        );

      case 'rocket':
        return (
          <div className="relative">
            <span 
              className={`${config.emoji} inline-block animate-pulse`}
              style={{ 
                animation: 'rocketFly 1.5s ease-in-out infinite'
              }}
            >
              🚀
            </span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {['✨', '⭐', '✨'].map((star, i) => (
                <span
                  key={i}
                  className="text-xl animate-ping"
                  style={{ 
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s'
                  }}
                >
                  {star}
                </span>
              ))}
            </div>
          </div>
        );

      case 'stars':
        return (
          <div className="relative w-24 h-24 flex items-center justify-center">
            {['⭐', '🌟', '✨', '💫', '⭐'].map((star, i) => (
              <span
                key={i}
                className={`absolute ${config.emoji}`}
                style={{
                  animation: 'starSpin 2s linear infinite',
                  animationDelay: `${i * 0.4}s`,
                  transform: `rotate(${i * 72}deg) translateY(-30px)`
                }}
              >
                {star}
              </span>
            ))}
          </div>
        );

      case 'animals':
        return (
          <div className={`flex items-center ${config.gap}`}>
            {['🐱', '🐶', '🐰', '🐻', '🦊'].map((animal, i) => (
              <span
                key={i}
                className={`${config.emoji}`}
                style={{
                  animation: 'animalWave 1s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`
                }}
              >
                {animal}
              </span>
            ))}
          </div>
        );

      case 'rainbow':
        return (
          <div className="flex flex-col items-center">
            <span className={`${config.emoji} animate-bounce`}>🌈</span>
            <div className={`flex ${config.gap} mt-2`}>
              {['❤️', '🧡', '💛', '💚', '💙', '💜'].map((heart, i) => (
                <span
                  key={i}
                  className="text-2xl"
                  style={{
                    animation: 'heartPop 0.8s ease-in-out infinite',
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  {heart}
                </span>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center ${config.container}`}>
      {renderLoader()}
      
      {message && (
        <p 
          className={`mt-4 ${config.text} font-bold text-center`}
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #22c55e, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {message}
        </p>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes rocketFly {
          0%, 100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-15px) rotate(15deg); }
        }
        
        @keyframes starSpin {
          0% { opacity: 0.3; transform: rotate(0deg) translateY(-30px) scale(0.8); }
          50% { opacity: 1; transform: rotate(180deg) translateY(-30px) scale(1.2); }
          100% { opacity: 0.3; transform: rotate(360deg) translateY(-30px) scale(0.8); }
        }
        
        @keyframes animalWave {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(-5deg); }
          75% { transform: translateY(-8px) rotate(5deg); }
        }
        
        @keyframes heartPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(224,242,254,0.95) 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div 
          className="bg-white/80 rounded-3xl shadow-2xl border-4 border-sky-300"
          style={{ padding: '2rem 3rem' }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
};

/**
 * Loading Overlay - Wraps content with a loading state
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  variant?: LoadingVariant;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  variant = 'bouncing',
  message = 'Loading...'
}) => {
  if (isLoading) {
    return <LoadingAnimation variant={variant} message={message} fullScreen />;
  }

  return <>{children}</>;
};

/**
 * Inline Loading Spinner - For buttons and small areas
 */
interface InlineLoadingProps {
  size?: 'tiny' | 'small';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ size = 'small' }) => {
  const emoji = size === 'tiny' ? 'text-lg' : 'text-2xl';
  
  return (
    <span className={`inline-flex items-center gap-1 ${emoji}`}>
      <span className="animate-bounce" style={{ animationDelay: '0s' }}>⏳</span>
    </span>
  );
};

export default LoadingAnimation;
