// src/components/ErrorFriendly.tsx
// Kid-friendly error messages with cute illustrations and helpful actions

import React from 'react';
import { HapticService } from '../services/HapticService';
import { SoundEffectService } from '../services/SoundEffectService';

type ErrorType = 'network' | 'notFound' | 'camera' | 'permission' | 'general' | 'empty';

interface ErrorFriendlyProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  onGoHome?: () => void;
  fullScreen?: boolean;
}

interface ErrorConfig {
  emoji: string;
  defaultTitle: string;
  defaultMessage: string;
  color: string;
  borderColor: string;
  bgGradient: string;
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  network: {
    emoji: '🌐',
    defaultTitle: 'Oops! No Internet',
    defaultMessage: 'The internet went on a little adventure. Let\'s try again!',
    color: '#3b82f6',
    borderColor: '#60a5fa',
    bgGradient: 'from-blue-100 to-cyan-100'
  },
  notFound: {
    emoji: '🔍',
    defaultTitle: 'Can\'t Find It!',
    defaultMessage: 'Hmm, we looked everywhere but couldn\'t find what you\'re looking for.',
    color: '#8b5cf6',
    borderColor: '#a78bfa',
    bgGradient: 'from-purple-100 to-pink-100'
  },
  camera: {
    emoji: '📸',
    defaultTitle: 'Camera is Shy!',
    defaultMessage: 'The camera needs your permission to play. Ask a grown-up for help!',
    color: '#ec4899',
    borderColor: '#f472b6',
    bgGradient: 'from-pink-100 to-rose-100'
  },
  permission: {
    emoji: '🔐',
    defaultTitle: 'Need Permission!',
    defaultMessage: 'We need some help from a grown-up to continue.',
    color: '#f59e0b',
    borderColor: '#fbbf24',
    bgGradient: 'from-yellow-100 to-orange-100'
  },
  general: {
    emoji: '😅',
    defaultTitle: 'Something Went Wrong',
    defaultMessage: 'Don\'t worry! Let\'s try again together.',
    color: '#ef4444',
    borderColor: '#f87171',
    bgGradient: 'from-red-100 to-orange-100'
  },
  empty: {
    emoji: '📭',
    defaultTitle: 'Nothing Here Yet!',
    defaultMessage: 'This place is empty. Let\'s add something fun!',
    color: '#6b7280',
    borderColor: '#9ca3af',
    bgGradient: 'from-gray-100 to-slate-100'
  }
};

/**
 * Kid-Friendly Error Component
 * Shows cute, non-scary error messages with helpful actions
 */
export const ErrorFriendly: React.FC<ErrorFriendlyProps> = ({
  type = 'general',
  title,
  message,
  onRetry,
  onGoBack,
  onGoHome,
  fullScreen = false
}) => {
  const config = errorConfigs[type];
  
  const handleButtonClick = (action: () => void) => {
    HapticService.tap();
    SoundEffectService.play('tap');
    action();
  };

  const content = (
    <div 
      className={`bg-gradient-to-br ${config.bgGradient} rounded-3xl p-6 text-center max-w-sm mx-auto`}
      style={{ 
        border: `4px solid ${config.borderColor}`,
        boxShadow: `0 8px 32px ${config.color}30`
      }}
    >
      {/* Animated emoji character */}
      <div className="relative mb-4">
        <div 
          className="text-7xl animate-bounce inline-block"
          style={{ animationDuration: '2s' }}
        >
          {config.emoji}
        </div>
        
        {/* Decorative elements */}
        <span 
          className="absolute -top-2 -right-2 text-3xl animate-pulse"
          style={{ animationDelay: '0.5s' }}
        >
          ✨
        </span>
        <span 
          className="absolute -top-2 -left-2 text-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        >
          💫
        </span>
      </div>

      {/* Title */}
      <h2 
        className="text-2xl font-black mb-3"
        style={{ color: config.color }}
      >
        {title || config.defaultTitle}
      </h2>

      {/* Message */}
      <p className="text-gray-700 font-semibold mb-6 leading-relaxed">
        {message || config.defaultMessage}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {onRetry && (
          <button
            onClick={() => handleButtonClick(onRetry)}
            className="w-full px-6 py-4 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-green-600"
            style={{ minHeight: '56px' }}
          >
            🔄 Try Again!
          </button>
        )}

        {onGoBack && (
          <button
            onClick={() => handleButtonClick(onGoBack)}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-purple-600"
            style={{ minHeight: '56px' }}
          >
            ← Go Back
          </button>
        )}

        {onGoHome && (
          <button
            onClick={() => handleButtonClick(onGoHome)}
            className="w-full px-6 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 rounded-2xl text-white font-black text-lg transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-orange-600"
            style={{ minHeight: '56px' }}
          >
            🏠 Go Home
          </button>
        )}
      </div>

      {/* Encouraging message at bottom */}
      <p className="mt-4 text-sm text-gray-500 font-medium">
        Don't worry, mistakes help us learn! 🌟
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(243,232,255,0.95) 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};

/**
 * Empty State Component - For when there's no content to show
 */
interface EmptyStateProps {
  title?: string;
  message?: string;
  emoji?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing Here Yet!',
  message = 'Let\'s add something fun!',
  emoji = '📭',
  actionLabel,
  onAction
}) => {
  const handleAction = () => {
    if (onAction) {
      HapticService.tap();
      SoundEffectService.play('tap');
      onAction();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>
        {emoji}
      </div>
      
      <h3 className="text-xl font-black text-purple-600 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 font-medium mb-4">
        {message}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={handleAction}
          className="px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 rounded-2xl text-white font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg border-4 border-purple-600"
          style={{ minHeight: '48px' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

/**
 * Network Error Banner - For showing at top of page when offline
 */
interface NetworkBannerProps {
  isOnline: boolean;
}

export const NetworkBanner: React.FC<NetworkBannerProps> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 p-3 text-center font-bold text-white"
      style={{
        background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
        paddingTop: 'max(12px, env(safe-area-inset-top))'
      }}
    >
      <span className="inline-flex items-center gap-2">
        <span className="animate-pulse">📡</span>
        No internet - Some features may not work
      </span>
    </div>
  );
};

export default ErrorFriendly;
