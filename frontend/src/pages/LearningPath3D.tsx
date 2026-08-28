/**
 * LearningPath3D.tsx
 *
 * Main page component for the 3D learning path experience.
 * Combines the 3D scene with modal UI and state management.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LearningPathScene } from '@/features/learning-path/components/LearningPathScene';
import { LessonModal } from '@/features/learning-path/components/LessonModal';
import { useLearningPath3DStore } from '@/hooks/useLearningPath3D';
import { usePets } from '@/hooks/usePets';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/apiClient';
import type { LessonNode } from '@/types/learning-path';

// ========== Demo Data ==========

const DEMO_NODES: LessonNode[] = [
  { lesson_id: 'l1', title: 'Hello!', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '👋', position: 0.1 },
  { lesson_id: 'l2', title: 'Colors', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '🎨', position: 0.2 },
  { lesson_id: 'l3', title: 'Numbers', status: 'available', type: 'quiz', xp_reward: 75, icon: '🔢', position: 0.35 },
  { lesson_id: 'l4', title: 'Animals', status: 'available', type: 'ar_session', xp_reward: 100, icon: '🐱', position: 0.5 },
  { lesson_id: 'l5', title: 'Food', status: 'locked', type: 'flashcard', xp_reward: 50, icon: '🍎', position: 0.65 },
];

// ========== Transform Functions ==========

interface ApiLearningPathItem {
  lesson_id: string;
  title: string;
  status?: 'completed' | 'available' | 'locked';
  type?: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
  xp_reward?: number;
  xp?: number;
  icon?: string;
  emoji?: string;
  position?: number;
  order?: number;
}

function transformLearningPathData(data: ApiLearningPathItem[]): LessonNode[] {
  if (!Array.isArray(data) || data.length === 0) {
    return DEMO_NODES;
  }

  return data.map((item, index) => ({
    lesson_id: item.lesson_id || `lesson-${index}`,
    title: item.title || `Lesson ${index + 1}`,
    status: item.status || (index < 2 ? 'completed' : index === 2 ? 'available' : 'locked'),
    type: item.type || 'lesson',
    xp_reward: item.xp_reward || item.xp || 50,
    icon: item.icon || item.emoji || '📚',
    position: item.position ?? item.order ?? ((index + 1) / (data.length + 1)),
  }));
}

// ========== Component ==========

export const LearningPath3D: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activePet } = usePets(user?.id || null);
  const [loading, setLoading] = useState(true);

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
  } = useLearningPath3DStore();

  // Fetch learning path data on mount
  useEffect(() => {
    const fetchLearningPath = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get('/api/v1/learning-path/user');
        const transformed = transformLearningPathData(data);
        setNodes(transformed);

        // Set progress to first available node
        const firstAvailable = transformed.find(n => n.status === 'available');
        if (firstAvailable) {
          setCurrentProgress(firstAvailable.position);
        } else {
          // If all completed, show last completed
          const lastCompleted = [...transformed].reverse().find(n => n.status === 'completed');
          if (lastCompleted) {
            setCurrentProgress(lastCompleted.position);
          }
        }
      } catch (error) {
        console.error('Failed to load learning path:', error);
        // Fallback to demo data
        setNodes(DEMO_NODES);
        const firstAvailable = DEMO_NODES.find(n => n.status === 'available');
        if (firstAvailable) {
          setCurrentProgress(firstAvailable.position);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLearningPath();
  }, [setNodes, setCurrentProgress]);

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

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
        <div className="text-center">
          <div className="text-6xl">🐾</div>
          <p className="mt-4 font-bold text-slate-600">Loading your path...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
      {/* 3D Scene */}
      <LearningPathScene
        nodes={nodes}
        currentProgress={currentProgress}
        activePet={activePet}
        onNodeSelect={handleNodeSelect}
      />

      {/* Header Overlay with Progress */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur-sm sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800 sm:text-lg">Learning Path</h1>
            <span className="text-xs font-semibold text-amber-600 sm:text-sm">
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
      <div className="pointer-events-none absolute bottom-4 left-4 z-10">
        <div className="rounded-lg bg-black/50 px-3 py-1.5 text-xs text-white">
          <span className="mr-2">🖱️</span>
          Drag to rotate · pinch to zoom
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
