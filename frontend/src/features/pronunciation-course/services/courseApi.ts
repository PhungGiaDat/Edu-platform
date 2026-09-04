// frontend/src/features/pronunciation-course/services/courseApi.ts
import axios from 'axios';
import type {
  PronunciationCourse,
  PronunciationCourseDetail,
  PronunciationAttempt,
  PronunciationProgress,
  EvaluationResult,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
});

export const pronunciationCourseApi = {
  /** List all pronunciation courses */
  async listCourses(): Promise<PronunciationCourse[]> {
    const response = await api.get<{ courses: PronunciationCourse[] }>(
      '/pronunciation-course'
    );
    return response.data.courses;
  },

  /** Get course detail with words */
  async getCourse(topicId: string): Promise<PronunciationCourseDetail> {
    const response = await api.get<PronunciationCourseDetail>(
      `/pronunciation-course/${topicId}`
    );
    return response.data;
  },

  /** Log pronunciation attempt */
  async logAttempt(attempt: PronunciationAttempt): Promise<{ success: boolean; stars: number }> {
    const response = await api.post(
      `/pronunciation-course/${attempt.topic_id}/attempt`,
      attempt
    );
    return response.data;
  },

  /** Get user progress report */
  async getProgress(): Promise<PronunciationProgress> {
    const response = await api.get<PronunciationProgress>(
      '/pronunciation-course/progress'
    );
    return response.data;
  },

  /** Evaluate via HuggingFace (borderline cases) */
  async huggingfaceEvaluate(
    audioData: Blob,
    expectedWord: string
  ): Promise<EvaluationResult> {
    const formData = new FormData();
    formData.append('audio', audioData);
    formData.append('expected_word', expectedWord);

    const response = await api.post<EvaluationResult>(
      '/pronunciation-course/huggingface-evaluate',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};
