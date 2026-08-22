/**
 * LessonModal.tsx
 *
 * Claymorphic modal for displaying lesson details and starting a lesson.
 * Features:
 * - CSS animations (no framer-motion)
 * - Claymorphic styling with border, shadow, rounded corners
 * - Lesson type labels
 * - XP reward display
 * - Status indicators
 */

import React, { useState, useEffect } from 'react';
import type { LessonNode } from '@/types/learning-path';

export interface LessonModalProps {
  /** The selected lesson node */
  lesson: LessonNode | null;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when lesson is started */
  onStart: () => void;
}

// Lesson type to display label mapping
const LESSON_TYPE_LABELS: Record<LessonNode['type'], string> = {
  flashcard: 'Flashcard',
  quiz: 'Quiz',
  ar_session: 'AR Lesson',
  lesson: 'Lesson',
};

// Lesson type to icon mapping
const LESSON_TYPE_ICONS: Record<LessonNode['type'], string> = {
  flashcard: '📇',
  quiz: '❓',
  ar_session: '📱',
  lesson: '📚',
};

export const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  isOpen,
  onClose,
  onStart,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Handle open/close with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen || !lesson) return null;

  const handleStart = () => {
    onStart();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Modal */}
      {isOpen && lesson && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm animate-modal-in rounded-[32px] border-4 border-white bg-white p-6 shadow-[0_12px_0_rgba(91,141,239,0.18),0_24px_48px_rgba(0,0,0,0.15)]">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <span className="text-2xl leading-none">×</span>
          </button>

          {/* Lesson icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-4xl shadow-lg">
            {lesson.icon || LESSON_TYPE_ICONS[lesson.type] || '📚'}
          </div>

          {/* Lesson title */}
          <h2 className="mb-2 pr-8 text-center text-xl font-black text-gray-800">
            {lesson.title}
          </h2>

          {/* Lesson type badge */}
          <div className="mb-3 text-center">
            <span className="inline-block rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase text-cyan-700">
              {LESSON_TYPE_LABELS[lesson.type] || lesson.type}
            </span>
          </div>

          {/* XP reward */}
          <div className="mb-4 text-center text-lg font-bold text-amber-500">
            ⚡ +{lesson.xp_reward} XP
          </div>

          {/* Status indicator */}
          <div className="mb-6 text-center">
            {lesson.status === 'completed' && (
              <span className="text-sm font-semibold text-green-600">✓ Completed</span>
            )}
            {lesson.status === 'available' && (
              <span className="text-sm font-semibold text-cyan-600">Ready to start!</span>
            )}
            {lesson.status === 'locked' && (
              <span className="text-sm font-semibold text-gray-500">🔒 Locked</span>
            )}
          </div>

          {/* Start button */}
          {lesson.status !== 'locked' && (
            <button
              onClick={handleStart}
              className="min-h-[48px] w-full rounded-2xl border-b-4 border-orange-600 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-amber-500/30 transition-all duration-200 hover:from-amber-500 hover:to-orange-600 active:translate-y-1 active:border-b-0"
            >
              Start Lesson
            </button>
          )}

          {/* Locked message */}
          {lesson.status === 'locked' && lesson.unlock_condition && (
            <div className="text-center text-sm text-gray-500">
              Complete more lessons to unlock
            </div>
          )}
        </div>
      )}

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes modal-in {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default LessonModal;
