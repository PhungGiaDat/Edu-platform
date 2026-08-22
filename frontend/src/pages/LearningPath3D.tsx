/**
 * LearningPath3D.tsx
 *
 * Main page component for the 3D learning path experience.
 * Combines the 3D scene with modal UI and state management.
 */

import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearningPathScene } from '@/components/learning-path-3d/LearningPathScene';
import { LessonModal } from '@/components/learning-path-3d/LessonModal';
import { useLearningPath3DStore } from '@/hooks/useLearningPath3D';
import { usePets } from '@/hooks/usePets';
import { useAuth } from '@/contexts/AuthContext';
import type { LessonNode } from '@/types/learning-path';

// ========== Demo Data ==========

const DEMO_NODES: LessonNode[] = [
  { lesson_id: 'l1', title: 'Hello!', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '👋', position: 0.1 },
  { lesson_id: 'l2', title: 'Colors', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '🎨', position: 0.2 },
  { lesson_id: 'l3', title: 'Numbers', status: 'available', type: 'quiz', xp_reward: 75, icon: '🔢', position: 0.35 },
  { lesson_id: 'l4', title: 'Animals', status: 'available', type: 'ar_session', xp_reward: 100, icon: '🐱', position: 0.5 },
  { lesson_id: 'l5', title: 'Food', status: 'locked', type: 'flashcard', xp_reward: 50, icon: '🍎', position: 0.65 },
];

// ========== Component ==========

export const LearningPath3D: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activePet } = usePets(user?.id || null);

  // Store state and actions
  const {
    nodes,
    currentProgress,
    selectedNode,
    isModalOpen,
    setNodes,
    setCurrentProgress,
    setSelectedNode,
    openModal,
    closeModal,
    completeLesson,
  } = useLearningPath3DStore();

  // Initialize with demo data on mount
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes(DEMO_NODES);
      // Set initial progress to first available node
      const firstAvailable = DEMO_NODES.find(n => n.status === 'available');
      if (firstAvailable) {
        setCurrentProgress(firstAvailable.position);
      }
    }
  }, [nodes.length, setNodes, setCurrentProgress]);

  // Calculate progress stats
  const progressStats = useMemo(() => {
    const total = nodes.length;
    const completed = nodes.filter(n => n.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalXP = nodes.reduce((sum, n) => sum + n.xp_reward, 0);
    const earnedXP = nodes.filter(n => n.status === 'completed').reduce((sum, n) => sum + n.xp_reward, 0);
    return { total, completed, percent, totalXP, earnedXP };
  }, [nodes]);

  // Handle node selection
  const handleNodeSelect = (node: LessonNode) => {
    setSelectedNode(node);
    openModal(node);
  };

  // Handle lesson start - navigate to appropriate page
  const handleStartLesson = (lesson: LessonNode) => {
    closeModal();

    // Navigate based on lesson type
    switch (lesson.type) {
      case 'ar_session':
        navigate('/learn-ar');
        break;
      case 'flashcard':
        navigate('/flashcards');
        break;
      case 'quiz':
        navigate('/courses');
        break;
      case 'lesson':
        navigate('/courses');
        break;
      default:
        navigate('/courses');
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    closeModal();
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
      {/* 3D Scene */}
      <LearningPathScene
        nodes={nodes}
        currentProgress={currentProgress}
        activePet={activePet}
        onNodeSelect={handleNodeSelect}
      />

      {/* Header Overlay with Progress */}
      <div className="absolute left-0 right-0 top-0 z-10 p-4">
        <div className="mx-auto max-w-md rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-gray-800">Learning Path</h1>
            <span className="text-sm font-semibold text-amber-600">
              {progressStats.completed}/{progressStats.total} Lessons
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressStats.percent}%` }}
            />
          </div>

          {/* XP display */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
            <span>{progressStats.percent}% Complete</span>
            <span className="font-semibold text-amber-600">
              {progressStats.earnedXP}/{progressStats.totalXP} XP
            </span>
          </div>
        </div>
      </div>

      {/* Instructions hint */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg bg-black/50 px-3 py-2 text-xs text-white">
          <span className="mr-2">🖱️</span>
          Drag to rotate, scroll to zoom
        </div>
      </div>

      {/* Lesson Modal */}
      <LessonModal
        lesson={selectedNode}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onStart={handleStartLesson}
      />
    </div>
  );
};

export default LearningPath3D;
