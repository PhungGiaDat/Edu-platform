/**
 * useCourseDetail — lazily loads a course and its lessons.
 * Thin add-on to the foundation useCourses hook so CourseDetailScreen can
 * listen to a single course + lessons pair without duplicating cache logic.
 *
 * Phase 0 — CourseDetail now exposes `course_id` instead of `id`.
 */
import { useCallback, useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import type { CourseDetail, Lesson } from '../types/course';

export interface UseCourseDetailResult {
  course: CourseDetail | null;
  lessons: Lesson[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useCourseDetail = (courseId: string | null): UseCourseDetailResult => {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
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

  useEffect(() => {
    if (courseId) {
      fetchAll(courseId).catch(() => undefined);
      return;
    }
    setCourse(null);
    setLessons([]);
  }, [courseId, fetchAll]);

  return { course, lessons, loading, refreshing, error, refresh };
};

export default useCourseDetail;