/**
 * Enhanced Course Service
 * API client for enhanced lesson system with video, gallery, and progress tracking
 */

import { apiClient } from './apiClient';
import type {
  LessonEnhanced,
  LessonProgressEnhanced,
  SectionProgress,
  VocabularyMastery,
  EarnedBadge,
  QuizScoreRecord,
} from '@/types/enhancedLesson';

// ============================================
// Types
// ============================================

export interface StartSessionResponse {
  session_id: string;
  lesson: LessonEnhanced;
  progress: LessonProgressEnhanced;
  started_at: string;
}

export interface SubmitSectionRequest {
  userId: string;
  sessionId: string;
  sectionId: string;
  progress: number;
  timeSpent: number;
  score?: number;
  answers?: Record<string, string>;
}

export interface SubmitVocabularyRequest {
  userId: string;
  lessonId: string;
  sessionId: string;
  wordId: string;
  isCorrect: boolean;
  transcript?: string;
}

export interface CompleteLessonRequest {
  userId: string;
  sessionId: string;
  totalTimeSpent: number;
  finalScore: number;
  vocabularyLearned: string[];
  quizScore?: number;
}

export interface CompleteLessonResponse {
  success: boolean;
  xp_earned: number;
  new_badges: EarnedBadge[];
  updated_progress: LessonProgressEnhanced;
}

// ============================================
// Enhanced Course Service
// ============================================

export const enhancedCourseService = {
  /**
   * Get all available lessons
   */
  listLessons: async (): Promise<{
    lessons: Array<{
      id: string;
      title_en: string;
      title_vi: string;
      description_en?: string;
      duration_minutes: number;
      xp_reward: number;
      difficulty: string;
      tags: string[];
    }>;
  }> => {
    return apiClient.get('/api/v1/lessons/');
  },

  /**
   * Get a single lesson by ID
   */
  getLesson: async (lessonId: string): Promise<LessonEnhanced> => {
    return apiClient.get(`/api/v1/lessons/${lessonId}`);
  },

  /**
   * Get user's progress for a lesson
   */
  getLessonProgress: async (
    lessonId: string,
    userId: string
  ): Promise<LessonProgressEnhanced> => {
    return apiClient.get(`/api/v1/lessons/${lessonId}/progress`, {
      params: { user_id: userId },
    });
  },

  /**
   * Start a new lesson session
   */
  startSession: async (
    lessonId: string,
    userId: string
  ): Promise<StartSessionResponse> => {
    return apiClient.post('/api/v1/lessons/session/start', {
      user_id: userId,
      lesson_id: lessonId,
    });
  },

  /**
   * Submit progress for a lesson section
   */
  submitSectionProgress: async (
    lessonId: string,
    request: SubmitSectionRequest
  ): Promise<{ success: boolean; progress: LessonProgressEnhanced }> => {
    return apiClient.post(`/api/v1/lessons/section/progress`, {
      ...request,
      lesson_id: lessonId,
    });
  },

  /**
   * Submit vocabulary practice attempt
   */
  submitVocabularyPractice: async (
    lessonId: string,
    request: SubmitVocabularyRequest
  ): Promise<{ success: boolean; mastery: VocabularyMastery[] }> => {
    return apiClient.post(`/api/v1/lessons/vocabulary/practice`, {
      ...request,
      lesson_id: lessonId,
    });
  },

  /**
   * Complete a lesson and receive rewards
   */
  completeLesson: async (
    lessonId: string,
    request: CompleteLessonRequest
  ): Promise<CompleteLessonResponse> => {
    return apiClient.post(`/api/v1/lessons/complete`, {
      ...request,
      lesson_id: lessonId,
    });
  },

  /**
   * Calculate overall progress percentage
   */
  calculateProgress: (progress: LessonProgressEnhanced): number => {
    if (!progress.section_progress || progress.section_progress.length === 0) {
      return 0;
    }
    const totalProgress = progress.section_progress.reduce(
      (sum, section) => sum + section.progress,
      0
    );
    return Math.round(totalProgress / progress.section_progress.length);
  },

  /**
   * Check if a section is completed
   */
  isSectionCompleted: (
    progress: LessonProgressEnhanced,
    sectionId: string
  ): boolean => {
    return progress.completed_sections?.includes(sectionId) ?? false;
  },

  /**
   * Get vocabulary mastery percentage
   */
  getVocabularyMasteryPercent: (progress: LessonProgressEnhanced): number => {
    if (!progress.vocabulary_mastery || progress.vocabulary_mastery.length === 0) {
      return 0;
    }
    const masteredCount = progress.vocabulary_mastery.filter(
      (m) => m.is_mastered
    ).length;
    return Math.round((masteredCount / progress.vocabulary_mastery.length) * 100);
  },

  /**
   * Get best quiz score
   */
  getBestQuizScore: (progress: LessonProgressEnhanced): number | null => {
    if (!progress.quiz_scores || progress.quiz_scores.length === 0) {
      return null;
    }
    return Math.max(...progress.quiz_scores.map((q) => q.score));
  },

  /**
   * Format time spent
   */
  formatTimeSpent: (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },

  /**
   * Get mastery level label
   */
  getMasteryLabel: (level: number): string => {
    const labels: Record<number, string> = {
      0: 'Not Started',
      1: 'Learning',
      2: 'Familiar',
      3: 'Practicing',
      4: 'Proficient',
      5: 'Mastered',
    };
    return labels[Math.min(level, 5)] ?? 'Unknown';
  },

  /**
   * Get mastery level color
   */
  getMasteryColor: (level: number): string => {
    const colors: Record<number, string> = {
      0: '#94a3b8', // slate-400
      1: '#f87171', // red-400
      2: '#fb923c', // orange-400
      3: '#facc15', // yellow-400
      4: '#4ade80', // green-400
      5: '#22c55e', // green-500
    };
    return colors[Math.min(level, 5)] ?? '#94a3b8';
  },

  /**
   * Get badge icon by ID
   */
  getBadgeIcon: (badgeId: string): string => {
    const icons: Record<string, string> = {
      'badge-perfect-vocab': '🏆',
      'badge-quiz-star': '⭐',
      'badge-speed-demon': '⚡',
      'badge-perfect-score': '💯',
      'badge-streak-3': '🔥',
      'badge-streak-7': '🔥',
      'badge-streak-30': '🔥',
    };
    return icons[badgeId] ?? '🎖️';
  },
};

// ============================================
// Re-export types for convenience
// ============================================

export type {
  LessonEnhanced,
  LessonProgressEnhanced,
  SectionProgress,
  VocabularyMastery,
  EarnedBadge,
  QuizScoreRecord,
} from '@/types/enhancedLesson';
