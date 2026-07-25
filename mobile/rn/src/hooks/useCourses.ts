/**
 * useCourses — list courses and lazily fetch lessons for a selected course.
 * RN-compatible; no eventBus / AR bridge.
 */
import { useCallback, useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import type { Course, Lesson } from '../types/course';

export interface UseCoursesResult {
  courses: Course[];
  lessons: Lesson[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  selectedCourseId: string | null;
  selectCourse: (courseId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useCourses = (): UseCoursesResult => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setError(null);
      const response = await courseService.listCourses();
      setCourses(response.data);
    } catch (err) {
      setError('Failed to load courses');
      console.error('useCourses: fetchCourses failed', err);
    }
  }, []);

  const fetchLessons = useCallback(async (courseId: string) => {
    try {
      const response = await courseService.listLessons(courseId);
      setLessons(response.data);
    } catch (err) {
      console.error('useCourses: fetchLessons failed', err);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    await fetchCourses();
    setLoading(false);
  }, [fetchCourses]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCourses();
    if (selectedCourseId) {
      await fetchLessons(selectedCourseId);
    }
    setRefreshing(false);
  }, [fetchCourses, fetchLessons, selectedCourseId]);

  const selectCourse = useCallback(
    async (courseId: string | null) => {
      if (courseId === null) {
        setSelectedCourseId(null);
        setLessons([]);
        return;
      }
      setSelectedCourseId(courseId);
      await fetchLessons(courseId);
    },
    [fetchLessons]
  );

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    courses,
    lessons,
    loading,
    refreshing,
    error,
    selectedCourseId,
    selectCourse,
    refresh,
  };
};
