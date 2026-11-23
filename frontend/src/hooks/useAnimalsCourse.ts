/**
 * useAnimalsCourse.ts
 * 
 * React Query hooks for the Animals Adventure course.
 * Provides data fetching for the course overview and individual lessons.
 */

import { useQuery } from '@tanstack/react-query';
import { courseService } from '@/services/CourseService';
import type { Course, Lesson } from '@/types/course';

const ANIMALS_COURSE_ID = 'animals-adventure-en-5-7';

/**
 * Fetch the Animals Adventure course overview
 */
export function useAnimalsCourse() {
  return useQuery<Course>({
    queryKey: ['course', ANIMALS_COURSE_ID],
    queryFn: () => courseService.getCourse(ANIMALS_COURSE_ID),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

/**
 * Fetch a specific lesson from the Animals Adventure course
 * @param lessonId - The lesson ID to fetch
 */
export function useAnimalsLesson(lessonId: string | undefined) {
  return useQuery<Lesson>({
    queryKey: ['lesson', lessonId],
    queryFn: () => courseService.getLesson(ANIMALS_COURSE_ID, lessonId!),
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook to get progress for the Animals Adventure course
 * @param userId - The user ID to fetch progress for
 */
export function useAnimalsProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['progress', 'animals', userId],
    queryFn: async () => {
      const allProgress = await courseService.getProgress(userId!);
      return allProgress.find(p => p.course_id === ANIMALS_COURSE_ID);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
