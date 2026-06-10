import { apiClient } from './apiClient';
import type { Course, Lesson, QuizSubmitResult, UserProgress } from '@/types/course';

export type { Course, Lesson, QuizSubmitResult, UserProgress } from '@/types/course';

export const courseService = {
  listCourses: (): Promise<Course[]> => apiClient.get('/api/v1/courses'),

  getCourse: (courseId: string): Promise<Course> =>
    apiClient.get(`/api/v1/courses/${courseId}`),

  getLesson: (courseId: string, lessonId: string): Promise<Lesson> =>
    apiClient.get(`/api/v1/courses/${courseId}/lessons/${lessonId}`),

  generateSampleCourse: (): Promise<Course> =>
    apiClient.post('/api/v1/courses/generate', {}),

  startCourse: (courseId: string, userId: string) =>
    apiClient.post(`/api/v1/courses/${courseId}/start`, { user_id: userId }),

  completeLesson: (courseId: string, lessonId: string, userId: string) =>
    apiClient.post(`/api/v1/lessons/${lessonId}/complete`, {
      user_id: userId,
      course_id: courseId,
    }),

  submitQuiz: (
    courseId: string,
    lessonId: string,
    answers: Record<string, string>,
    userId: string
  ): Promise<QuizSubmitResult> =>
    apiClient.post(`/api/v1/quizzes/${lessonId}/submit`, {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      answers,
    }),

  getProgress: (userId: string): Promise<UserProgress[]> =>
    apiClient.get(`/api/v1/users/${userId}/progress`),
};
