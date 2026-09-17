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
    // h-full (not h-[100dvh]): the parent <main> shell already reserves the
    // bottom-nav safe-area via padding-bottom. A hardcoded 100dvh here
    // double-counted that space and pushed the bottom of the world (where
    // the current node + PetGuide often sit) off-screen, behind the nav.
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
      {/* 3D Scene is the hero — it fills the whole container behind this
          compact header, not a small leftover strip beneath it. Single
          reusable Canvas; course switches reframe/re-skin in place (courseKey
          only resets PetGuide's transient walk-animation refs). */}
      <LearningPathScene
        nodes={path?.nodes ?? []}
        currentProgress={petProgress}
        activePet={activePet}
        onNodeSelect={handleNodeSelect}
        categoryKey={selectedCourse?.category_key}
        courseKey={selectedCourseId}
      />

      {/* Compact header — title/counter, thin progress bar, course switcher.
          Deliberately small: the previous version's tall single card ate
          35-40% of the mobile viewport and made the world read as secondary. */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-xl bg-white/70 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h1 className="truncate text-[11px] font-extrabold text-gray-700">Learning Path</h1>
              {path && (
                <span className="shrink-0 text-[11px] font-bold text-amber-600">
                  {path.completed_count}/{path.total_count}
                </span>
              )}
            </div>
            {path && (
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.round(path.progress * 100)}%` }}
                />
              </div>
            )}
          </div>

          <CourseSelector
            courses={joinedCourses}
            selectedCourseId={selectedCourseId}
            onSelect={handleCourseSwitch}
          />
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
