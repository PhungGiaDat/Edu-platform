// frontend-web/src/services/adminApi.ts
/**
 * Admin API Service - Teacher Admin Dashboard API Client
 * Handles all API calls to the admin backend with consistent error handling
 */
import { apiClient } from './apiClient';
import type {
  DashboardStats,
  PaginatedResponse,
  Course,
  CourseCreate,
  CourseUpdate,
  FlashcardDeck,
  DeckCreate,
  DeckUpdate,
  Flashcard,
  FlashcardCreate,
  FlashcardUpdate,
  StudentProgress,
  LearningGoal,
  LearningGoalCreate,
  ProgressAnalytics,
  EngagementAnalytics,
  PaginationParams,
  StudentListParams,
} from '../types/admin';

const ADMIN_BASE_URL = '/api/v1/admin';

/**
 * Dashboard API
 */
export const adminDashboardApi = {
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get(`${ADMIN_BASE_URL}/dashboard`);
      return response as DashboardStats;
    } catch (error) {
      console.error('[adminDashboardApi.getStats] Error:', error);
      throw error;
    }
  },
};

/**
 * Courses API
 */
export const adminCoursesApi = {
  async getCourses(params: PaginationParams = {}): Promise<PaginatedResponse<Course>> {
    try {
      const { skip = 0, limit = 20 } = params;
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/courses`,
        { params: { skip, limit } }
      );
      return response as PaginatedResponse<Course>;
    } catch (error) {
      console.error('[adminCoursesApi.getCourses] Error:', error);
      throw error;
    }
  },

  async getCourse(courseId: string): Promise<Course> {
    try {
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/courses/${courseId}`
      );
      return response as Course;
    } catch (error) {
      console.error('[adminCoursesApi.getCourse] Error:', error);
      throw error;
    }
  },

  async createCourse(data: CourseCreate): Promise<Course> {
    try {
      const response = await apiClient.post(
        `${ADMIN_BASE_URL}/courses`,
        data
      );
      return response as Course;
    } catch (error) {
      console.error('[adminCoursesApi.createCourse] Error:', error);
      throw error;
    }
  },

  async updateCourse(courseId: string, data: CourseUpdate): Promise<Course> {
    try {
      const response = await apiClient.put(
        `${ADMIN_BASE_URL}/courses/${courseId}`,
        data
      );
      return response as Course;
    } catch (error) {
      console.error('[adminCoursesApi.updateCourse] Error:', error);
      throw error;
    }
  },

  async deleteCourse(courseId: string): Promise<void> {
    try {
      await apiClient.delete(`${ADMIN_BASE_URL}/courses/${courseId}`);
    } catch (error) {
      console.error('[adminCoursesApi.deleteCourse] Error:', error);
      throw error;
    }
  },
};

/**
 * Flashcard Decks API
 */
export const adminDecksApi = {
  async getDecks(params: PaginationParams = {}): Promise<PaginatedResponse<FlashcardDeck>> {
    try {
      const { skip = 0, limit = 20 } = params;
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/flashcards/decks`,
        { params: { skip, limit } }
      );
      return response as PaginatedResponse<FlashcardDeck>;
    } catch (error) {
      console.error('[adminDecksApi.getDecks] Error:', error);
      throw error;
    }
  },

  async getDeck(deckId: string): Promise<FlashcardDeck> {
    try {
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/flashcards/decks/${deckId}`
      );
      return response as FlashcardDeck;
    } catch (error) {
      console.error('[adminDecksApi.getDeck] Error:', error);
      throw error;
    }
  },

  async createDeck(data: DeckCreate): Promise<FlashcardDeck> {
    try {
      const response = await apiClient.post(
        `${ADMIN_BASE_URL}/flashcards/decks`,
        data
      );
      return response as FlashcardDeck;
    } catch (error) {
      console.error('[adminDecksApi.createDeck] Error:', error);
      throw error;
    }
  },

  async updateDeck(deckId: string, data: DeckUpdate): Promise<FlashcardDeck> {
    try {
      const response = await apiClient.put(
        `${ADMIN_BASE_URL}/flashcards/decks/${deckId}`,
        data
      );
      return response as FlashcardDeck;
    } catch (error) {
      console.error('[adminDecksApi.updateDeck] Error:', error);
      throw error;
    }
  },

  async deleteDeck(deckId: string): Promise<void> {
    try {
      await apiClient.delete(`${ADMIN_BASE_URL}/flashcards/decks/${deckId}`);
    } catch (error) {
      console.error('[adminDecksApi.deleteDeck] Error:', error);
      throw error;
    }
  },
};

/**
 * Flashcards API
 */
export const adminFlashcardsApi = {
  async getFlashcardsInDeck(
    deckId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Flashcard>> {
    try {
      const { skip = 0, limit = 50 } = params;
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/flashcards/decks/${deckId}/cards`,
        { params: { skip, limit } }
      );
      return response as PaginatedResponse<Flashcard>;
    } catch (error) {
      console.error('[adminFlashcardsApi.getFlashcardsInDeck] Error:', error);
      throw error;
    }
  },

  async createFlashcard(
    deckId: string,
    data: FlashcardCreate
  ): Promise<Flashcard> {
    try {
      const response = await apiClient.post(
        `${ADMIN_BASE_URL}/flashcards/decks/${deckId}/cards`,
        data
      );
      return response as Flashcard;
    } catch (error) {
      console.error('[adminFlashcardsApi.createFlashcard] Error:', error);
      throw error;
    }
  },

  async updateFlashcard(
    qrId: string,
    data: FlashcardUpdate
  ): Promise<Flashcard> {
    try {
      const response = await apiClient.put(
        `${ADMIN_BASE_URL}/flashcards/cards/${qrId}`,
        data
      );
      return response as Flashcard;
    } catch (error) {
      console.error('[adminFlashcardsApi.updateFlashcard] Error:', error);
      throw error;
    }
  },

  async deleteFlashcard(qrId: string): Promise<void> {
    try {
      await apiClient.delete(`${ADMIN_BASE_URL}/flashcards/cards/${qrId}`);
    } catch (error) {
      console.error('[adminFlashcardsApi.deleteFlashcard] Error:', error);
      throw error;
    }
  },
};

/**
 * Students API
 */
export const adminStudentsApi = {
  async getStudents(
    params: StudentListParams = {}
  ): Promise<PaginatedResponse<StudentProgress>> {
    try {
      const { skip = 0, limit = 20, search } = params;
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/students`,
        { params: { skip, limit, search } }
      );
      return response as PaginatedResponse<StudentProgress>;
    } catch (error) {
      console.error('[adminStudentsApi.getStudents] Error:', error);
      throw error;
    }
  },

  async getStudent(userId: string): Promise<StudentProgress> {
    try {
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/students/${userId}`
      );
      return response as StudentProgress;
    } catch (error) {
      console.error('[adminStudentsApi.getStudent] Error:', error);
      throw error;
    }
  },
};

/**
 * Analytics API
 */
export const adminAnalyticsApi = {
  async getProgressAnalytics(days: number = 30): Promise<ProgressAnalytics> {
    try {
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/analytics/progress`,
        { params: { days } }
      );
      return response as ProgressAnalytics;
    } catch (error) {
      console.error('[adminAnalyticsApi.getProgressAnalytics] Error:', error);
      throw error;
    }
  },

  async getEngagementAnalytics(): Promise<EngagementAnalytics> {
    try {
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/analytics/engagement`
      );
      return response as EngagementAnalytics;
    } catch (error) {
      console.error('[adminAnalyticsApi.getEngagementAnalytics] Error:', error);
      throw error;
    }
  },
};

/**
 * Learning Goals API
 */
export const adminLearningGoalsApi = {
  async setLearningGoal(
    userId: string,
    data: LearningGoalCreate
  ): Promise<LearningGoal> {
    try {
      const response = await apiClient.post(
        `${ADMIN_BASE_URL}/learning-goals`,
        data,
        { params: { user_id: userId } }
      );
      return response as LearningGoal;
    } catch (error) {
      console.error('[adminLearningGoalsApi.setLearningGoal] Error:', error);
      throw error;
    }
  },

  async getLearningGoal(userId: string): Promise<LearningGoal> {
    try {
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/learning-goals/${userId}`
      );
      return response as LearningGoal;
    } catch (error) {
      console.error('[adminLearningGoalsApi.getLearningGoal] Error:', error);
      throw error;
    }
  },

  async getAllLearningGoals(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<LearningGoal>> {
    try {
      const { skip = 0, limit = 50 } = params;
      const response = await apiClient.get(
        `${ADMIN_BASE_URL}/learning-goals`,
        { params: { skip, limit } }
      );
      return response as PaginatedResponse<LearningGoal>;
    } catch (error) {
      console.error('[adminLearningGoalsApi.getAllLearningGoals] Error:', error);
      throw error;
    }
  },
};

// Export all APIs as a combined object
export const adminApi = {
  dashboard: adminDashboardApi,
  courses: adminCoursesApi,
  decks: adminDecksApi,
  flashcards: adminFlashcardsApi,
  students: adminStudentsApi,
  analytics: adminAnalyticsApi,
  learningGoals: adminLearningGoalsApi,
};

export default adminApi;
