import { apiClient } from './apiClient';
import type {
  Course,
  Lesson,
  LessonSession,
  LessonStepAttemptPayload,
  MediaAssetRecord,
  QuizSubmitResult,
  UserProgress,
} from '@/types/course';

export type {
  Course,
  Lesson,
  LessonSession,
  LessonStepAttemptPayload,
  MediaAssetRecord,
  QuizSubmitResult,
  UserProgress,
} from '@/types/course';

export const courseService = {
  listCourses: (): Promise<Course[]> => apiClient.get('/api/v1/courses'),

  getCourse: (courseId: string): Promise<Course> =>
    apiClient.get(`/api/v1/courses/${courseId}`),

  getLesson: (courseId: string, lessonId: string): Promise<Lesson> =>
    apiClient.get(`/api/v1/courses/${courseId}/lessons/${lessonId}`),

  getLessonMedia: (courseId: string, lessonId: string): Promise<MediaAssetRecord[]> =>
    apiClient.get(`/api/v1/courses/${courseId}/lessons/${lessonId}/media`),

  generateSampleCourse: (): Promise<Course> =>
    apiClient.post('/api/v1/courses/generate', {}),

  startCourse: (courseId: string, userId: string) =>
    apiClient.post(`/api/v1/courses/${courseId}/start`, { user_id: userId }),

  startLessonSession: (courseId: string, lessonId: string, userId: string): Promise<LessonSession> =>
    apiClient.post(`/api/v1/courses/${courseId}/lessons/${lessonId}/session/start`, { user_id: userId }),

  getLessonSession: (courseId: string, lessonId: string, userId: string): Promise<LessonSession> =>
    apiClient.get(`/api/v1/courses/${courseId}/lessons/${lessonId}/session`, { params: { user_id: userId } }),

  submitLessonStep: (
    courseId: string,
    lessonId: string,
    payload: LessonStepAttemptPayload,
  ): Promise<LessonSession> =>
    apiClient.post(`/api/v1/courses/${courseId}/lessons/${lessonId}/steps/attempt`, payload),

  completeLesson: (
    courseId: string, 
    lessonId: string, 
    userId: string,
    stats?: {
      score?: number;
      timeSpent?: number;
      wordsLearned?: string[];
      pronunciationScores?: Record<string, number>;
      gamesPlayed?: number;
    }
  ) =>
    apiClient.post(`/api/v1/lessons/${lessonId}/complete`, {
      user_id: userId,
      course_id: courseId,
      score: stats?.score,
      time_spent: stats?.timeSpent,
      words_learned: stats?.wordsLearned,
      pronunciation_scores: stats?.pronunciationScores,
      games_played: stats?.gamesPlayed,
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

  // Media upload endpoints
  uploadMedia: (
    courseId: string,
    lessonId: string,
    formData: FormData
  ): Promise<MediaAssetRecord> =>
    apiClient.post(`/api/v1/courses/${courseId}/lessons/${lessonId}/media/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateMediaMetadata: (
    courseId: string,
    lessonId: string,
    mediaId: string,
    metadata: {
      title?: string;
      description?: string;
      tags?: string[];
      duration?: number;
      order?: number;
    }
  ): Promise<MediaAssetRecord> =>
    apiClient.patch(
      `/api/v1/courses/${courseId}/lessons/${lessonId}/media/${mediaId}`,
      metadata
    ),

  deleteMedia: (
    courseId: string,
    lessonId: string,
    mediaId: string
  ): Promise<void> =>
    apiClient.delete(`/api/v1/courses/${courseId}/lessons/${lessonId}/media/${mediaId}`),

  getMediaMetadata: (mediaId: string): Promise<MediaAssetRecord> =>
    apiClient.get(`/api/v1/media/${mediaId}`),

  // Batch media operations
  batchUpdateMediaOrder: (
    courseId: string,
    lessonId: string,
    updates: Array<{ media_id: string; order: number }>
  ): Promise<MediaAssetRecord[]> =>
    apiClient.patch(
      `/api/v1/courses/${courseId}/lessons/${lessonId}/media/order`,
      { updates }
    ),
};
