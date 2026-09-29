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
import { useLocale } from '@/contexts/LocaleContext';
import { apiClient } from '@/services/apiClient';
import type { LessonNode, LearningPathMeResponse } from '@/types/learning-path';

// ========== Component ==========

export const LearningPath3D: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLocale();
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
      setError(t('learningPathLoadError'));
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
  const currentNode = path?.nodes.find((n) => n.state === 'current') ?? null;
  const petProgress = currentNode?.position ?? path?.progress ?? 0;

  // Camera LOOK-AT target sits a bit ahead of the current node (toward the
  // next lesson), not exactly on it — the composition should show where the
  // journey goes next, not just where the learner is standing right now.
  const currentNodeIndex = currentNode ? (path?.nodes.findIndex((n) => n.lesson_id === currentNode.lesson_id) ?? -1) : -1;
  const nextNode = path && currentNodeIndex >= 0 ? path.nodes[currentNodeIndex + 1] : undefined;
  const lookAheadProgress =
    currentNode && nextNode
      ? currentNode.position + (nextNode.position - currentNode.position) * 0.6
      : petProgress;

  // ========== Loading ==========
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
        <div className="text-center">
          <div className="text-6xl">🐾</div>
          <p className="mt-4 font-bold text-slate-600">{t('learningPathLoading')}</p>
        </div>
      </div>
    );
  }

  // ========== Error ==========
  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 px-4">
        <div className="max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-lg">
          <p className="mb-4 font-bold text-slate-700">{error}</p>
          <button
            onClick={handleRetry}
            className="rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow-md hover:bg-amber-600"
          >
            {t('learningPathRetry')}
          </button>
        </div>
      </div>
    );
  }

  // ========== Empty state ==========
  if (joinedCourses.length === 0) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 px-4">
        <div className="max-w-sm rounded-3xl bg-white/90 p-6 text-center shadow-lg">
          <div className="mb-3 text-5xl">📚</div>
          <p className="mb-4 font-bold text-slate-700">
            {t('learningPathEmpty')}
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow-md hover:bg-amber-600"
          >
            {t('learningPathExplore')}
          </button>
        </div>
      </div>
    );
  }

  return (
    // Explicit 100dvh flex column (Layout drops its nav padding on this route):
    // `h-full` relied on <main> having a definite height, which it doesn't
    // (the shell only has min-height), so mobile WebKit could leave a blank
    // strip under the scene. The floating mobile nav overlays the scene.
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50">
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      {/* 3D Scene is the hero — it fills the whole container behind this
          compact header, not a small leftover strip beneath it. Single
          reusable Canvas; course switches reframe/re-skin in place (courseKey
          only resets PetGuide's transient walk-animation refs). */}
      <LearningPathScene
        nodes={path?.nodes ?? []}
        currentProgress={petProgress}
        lookAheadProgress={lookAheadProgress}
        activePet={activePet}
        onNodeSelect={handleNodeSelect}
        categoryKey={selectedCourse?.category_key}
        courseKey={selectedCourseId}
      />
      </div>

      {/* Compact header — two rows, never one row fighting for width.
          Row 1 is ONLY the title + counter (nothing to truncate "Learning
          Path" against — that's what caused "Learni..." on a 390px phone).
          Row 2 is the progress bar + course switcher, which can compete for
          space with each other without touching the title. */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-3">
        <div className="pointer-events-auto mx-auto max-w-md rounded-xl bg-white/75 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-baseline justify-between gap-2">
            {/* ! = beat the unlayered global `h1 { font-size: 3.2em }` in index.css. */}
            <h1 className="!m-0 !text-xs !leading-4 font-extrabold text-gray-700">{t('navLearningPath')}</h1>
            {path && (
              <span className="shrink-0 text-[11px] font-bold text-amber-600">
                {path.completed_count}/{path.total_count}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2">
            {path && (
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${Math.round(path.progress * 100)}%` }}
                />
              </div>
            )}
            <CourseSelector
              courses={joinedCourses}
              selectedCourseId={selectedCourseId}
              onSelect={handleCourseSwitch}
            />
          </div>
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
