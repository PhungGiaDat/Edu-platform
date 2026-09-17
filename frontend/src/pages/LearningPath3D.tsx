/**
 * LearningPath3D.tsx
 *
 * Main page component for the 3D learning path experience.
 * Shows only courses the authenticated user has joined; the 3D scene is a
 * pure presentation layer over the LearningPathViewModel returned by
 * GET /api/v1/learning-path/me. No demo/fallback curriculum data.
 */

import React, { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LearningPathScene } from '@/features/learning-path/components/LearningPathScene';
import { LessonModal } from '@/features/learning-path/components/LessonModal';
import { CourseSelector } from '@/features/learning-path/components/CourseSelector';
import { useLearningPath3DStore } from '@/hooks/useLearningPath3D';
import { usePets } from '@/hooks/usePets';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/apiClient';
import type { LessonNode, LearningPathMeResponse } from '@/types/learning-path';

// ========== Component ==========

export const LearningPath3D: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activePet } = usePets(user?.id || null);
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdParam = searchParams.get('course_id');

  const {
    joinedCourses,
    selectedCourseId,
    path,
    selectedNodeId,
    loading,
    error,
    setJoinedCourses,
    setSelectedCourse,
    setPath,
    selectNode,
    clearSelectedNode,
    setLoading,
    setError,
  } = useLearningPath3DStore();

  const fetchPath = useCallback(async (courseId: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiClient.getLearningPathMe(courseId || undefined)) as LearningPathMeResponse;
      setJoinedCourses(data.joined_courses);
      setSelectedCourse(data.selected_course?.course_id ?? null);
      setPath(data.path);
    } catch (err) {
      console.error('[LearningPath3D] Failed to load learning path:', err);
      setError('Unable to load your learning path.');
    } finally {
      setLoading(false);
    }
  }, [setJoinedCourses, setSelectedCourse, setPath, setLoading, setError]);

  useEffect(() => {
    fetchPath(courseIdParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdParam]);

  const handleRetry = () => {
    fetchPath(courseIdParam);
  };

  const handleCourseSwitch = (courseId: string) => {
    clearSelectedNode();
    setSearchParams({ course_id: courseId }, { replace: true });
  };

  // Node click
  const handleNodeSelect = (node: LessonNode) => {
    if (node.state === 'locked') return;
    selectNode(node.lesson_id);
  };

  const handleCloseModal = () => {
    clearSelectedNode();
  };

  // Launch the canonical lesson runner. Learning Path never decides which
  // activity implementation to open — that belongs to LessonPlayer.
  const handleStartLesson = (lesson: LessonNode) => {
    clearSelectedNode();
    navigate(lesson.launch_path);
  };

  const selectedNode = path?.nodes.find((n) => n.lesson_id === selectedNodeId) ?? null;
  const selectedCourse = joinedCourses.find((c) => c.course_id === selectedCourseId) ?? null;

  // Pet position: the current lesson's spot on the path, or overall progress
  // if nothing is "current" yet (e.g. a freshly-completed course).
  const petProgress = path
    ? path.nodes.find((n) => n.state === 'current')?.position ?? path.progress
    : 0;

  // ========== Loading ==========
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

  // ========== Error ==========
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 px-4">
        <div className="max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-lg">
          <p className="mb-4 font-bold text-slate-700">{error}</p>
          <button
            onClick={handleRetry}
            className="rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow-md hover:bg-amber-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ========== Empty state ==========
  if (joinedCourses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 px-4">
        <div className="max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-lg">
          <div className="mb-3 text-5xl">📚</div>
          <p className="mb-4 font-bold text-slate-700">
            You haven&apos;t joined any courses yet.
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow-md hover:bg-amber-600"
          >
            Explore Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
      {/* 3D Scene — single reusable Canvas; course switches reframe/re-skin
          in place (courseKey below only resets the PetGuide's transient
          walk-animation refs, it does NOT remount the Canvas). */}
      <LearningPathScene
        nodes={path?.nodes ?? []}
        currentProgress={petProgress}
        activePet={activePet}
        onNodeSelect={handleNodeSelect}
        categoryKey={selectedCourse?.category_key}
        courseKey={selectedCourseId}
      />

      {/* Header Overlay with Progress + Course Selector */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur-sm sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-base font-bold text-gray-800 sm:text-lg">Learning Path</h1>
            {path && (
              <span className="text-xs font-semibold text-amber-600 sm:text-sm">
                {path.completed_count}/{path.total_count} Lessons
              </span>
            )}
          </div>

          {path && (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.round(path.progress * 100)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {Math.round(path.progress * 100)}% Complete
              </div>
            </>
          )}

          {joinedCourses.length > 1 && (
            <div className="mt-3">
              <CourseSelector
                courses={joinedCourses}
                selectedCourseId={selectedCourseId}
                onSelect={handleCourseSwitch}
              />
            </div>
          )}
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
        courseTitle={selectedCourse?.title_vi || selectedCourse?.title}
        isOpen={!!selectedNode}
        onClose={handleCloseModal}
        onStart={handleStartLesson}
      />
    </div>
  );
};

export default LearningPath3D;
