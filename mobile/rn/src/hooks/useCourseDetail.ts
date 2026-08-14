/**
 * useCourseDetail — lazily loads a course and its lessons.
 * Thin add-on to the foundation useCourses hook so CourseDetailScreen can
 * listen to a single course + lessons pair without duplicating cache logic.
 *
 * Phase 0 — CourseDetail now exposes `course_id` instead of `id`.
 */
import { useCallback, useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import { coursesApi } from '../services/api';
import type { CourseDetail, Lesson, UserProgress } from '../types/course';

export interface UseCourseDetailResult {
  course: CourseDetail | null;
  lessons: Lesson[];
  progress: UserProgress | null;
  progressLoading: boolean;
  progressError: string | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  setProgress: (progress: UserProgress | null) => void;
}

export const useCourseDetail = (
  courseId: string | null,
  userId: string | null,
): UseCourseDetailResult => {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (id: string, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const [courseResponse, lessonsResponse] = await Promise.all([
          courseService.getCourse(id),
          courseService.listLessons(id),
        ]);
        setCourse(courseResponse.data);
        setLessons(lessonsResponse.data);
      } catch (err) {
        console.error('useCourseDetail: fetch failed', err);
        setError('Failed to load course');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (courseId) {
      await fetchAll(courseId, true);
    }
  }, [courseId, fetchAll]);

  const refreshProgress = useCallback(async () => {
    if (!courseId || !userId) {
      setProgress(null);
      setProgressError(null);
      return;
    }

    setProgressLoading(true);
    try {
      const response = await coursesApi.getProgress(userId);
      setProgress(
        response.data.find((item) => item.course_id === courseId) ?? null,
      );
      setProgressError(null);
    } catch (err) {
      console.error('useCourseDetail: progress fetch failed', err);
      setProgressError('Failed to load course progress');
    } finally {
      setProgressLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    if (courseId) {
      fetchAll(courseId).catch(() => undefined);
      return;
    }
    setCourse(null);
    setLessons([]);
  }, [courseId, fetchAll]);

  useEffect(() => {
    refreshProgress().catch(() => undefined);
  }, [refreshProgress]);

  return {
    course,
    lessons,
    progress,
    progressLoading,
    progressError,
    loading,
    refreshing,
    error,
    refresh,
    refreshProgress,
    setProgress,
  };
};

export default useCourseDetail;
