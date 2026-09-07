// frontend/src/features/pronunciation-course/hooks/usePronunciationCourse.ts
import { useState, useEffect, useCallback } from 'react';
import { pronunciationCourseApi } from '../services/courseApi';
import type {
  PronunciationCourse,
  PronunciationCourseDetail,
  PronunciationProgress,
  PronunciationAttempt,
} from '../types';

export function usePronunciationCourses() {
  const [courses, setCourses] = useState<PronunciationCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pronunciationCourseApi
      .listCourses()
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { courses, loading, error };
}

export function usePronunciationCourseDetail(topicId: string) {
  const [course, setCourse] = useState<PronunciationCourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    pronunciationCourseApi
      .getCourse(topicId)
      .then(setCourse)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topicId]);

  return { course, loading, error };
}

export function usePronunciationProgress() {
  const [progress, setProgress] = useState<PronunciationProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pronunciationCourseApi
      .getProgress()
      .then(setProgress)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { progress, loading, error };
}

export function useLogAttempt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logAttempt = useCallback(
    async (attempt: Omit<PronunciationAttempt, 'evaluation_method'>) => {
      setLoading(true);
      try {
        const result = await pronunciationCourseApi.logAttempt({
          ...attempt,
          evaluation_method: 'browser',
        });
        return result;
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { logAttempt, loading, error };
}
