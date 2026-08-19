/**
 * apiClient.ts
 * 
 * Centralized API client with automatic JWT token handling
 * - Automatically adds Authorization header
 * - Handles 401 responses with logout
 * - Provides methods for GET, POST, PUT, DELETE, PATCH
 */

import { getApiBase } from '@/config';

const API_BASE = getApiBase();
const TOKEN_KEY = 'authToken';

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
  body?: any;
}

export interface ProfileResponse {
  identity: {
    id: string;
    email: string;
    username: string;
    full_name?: string | null;
    avatar_url: string;
    role: string;
    is_superuser: boolean;
  };
  summary: {
    level: number;
    total_points: number;
    xp_to_next_level: number;
    streak_days: number;
    lessons_completed: number;
    words_learned: number;
    quizzes_passed: number;
  };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    emoji: string;
    icon_url: string;
    earned: boolean;
  }>;
  milestones: Array<{
    label: string;
    current: number;
    target: number;
    icon: string;
    color: string;
  }>;
  leaderboard: Array<{
    user_id: string;
    username: string;
    points: number;
    rank: number;
    avatar_url: string;
  }>;
  daily_challenge: {
    title: string;
    progress: number;
    target: number;
    reward: string;
  };
  content: {
    hero_subtitle: string;
    testimonials_heading: string;
    testimonials: Array<{
      id: string;
      name: string;
      age: number;
      avatar: string;
      quote: string;
      rating: number;
      color: string;
    }>;
    cta: { title: string; description: string; label: string; href: string };
  };
  meta: { partial_sections: string[]; generated_at: string };
}

function isNativeBody(body: unknown): body is BodyInit {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
}

function shouldSerializeAsJson(body: unknown): boolean {
  return body !== undefined && body !== null && !isNativeBody(body);
}

function serializeRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (isNativeBody(body)) {
    return body;
  }

  return JSON.stringify(body);
}

/**
 * Get current auth token from localStorage
 */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Handle 401 Unauthorized response by logging out
 */
function handle401(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('authUser');
    window.location.href = '/login';
  } catch {
    // Silently ignore
  }
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });

    const queryString = query.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Prepare request headers with Authorization
 */
function prepareHeaders(options: ApiClientOptions = {}): Headers {
  const headers = new Headers(options.headers || {});

  // Set default Content-Type for JSON bodies if not set
  if (!headers.has('Content-Type') && shouldSerializeAsJson(options.body)) {
    headers.set('Content-Type', 'application/json');
  }

  // Add Authorization header if not skipped
  if (!options.skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return headers;
}

/**
 * Handle API response
 */
async function handleResponse(response: Response): Promise<any> {
  // Handle 401 Unauthorized
  if (response.status === 401) {
    handle401();
    throw new Error('Unauthorized');
  }

  // Handle 403 Forbidden
  if (response.status === 403) {
    throw new Error('Forbidden');
  }

  // Handle 404 Not Found
  if (response.status === 404) {
    throw new Error('Not found');
  }

  // Handle server errors
  if (response.status >= 500) {
    throw new Error('Server error');
  }

  // Parse JSON response
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const data = await response.json();

    // Check for non-ok responses with error details
    if (!response.ok && data.detail) {
      throw new Error(data.detail);
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  // For non-JSON responses
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response;
}

/**
 * Generic fetch wrapper
 */
async function request(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<any> {
  const { params, skipAuth, body, ...fetchOptions } = options;

  const url = buildUrl(endpoint, params);
  const headers = prepareHeaders({ ...fetchOptions, skipAuth, body });

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: serializeRequestBody(body),
    });

    return await handleResponse(response);
  } catch (error) {
    console.error(`[ApiClient] ${options.method || 'GET'} ${endpoint}:`, error);
    throw error;
  }
}

/**
 * API Client with convenience methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: (endpoint: string, options?: ApiClientOptions) =>
    request(endpoint, { ...options, method: 'GET' }),

  /** Fetch the authenticated user's fully composed profile. */
  getMyProfile: (): Promise<ProfileResponse> =>
    request('/api/v1/profile/me', { method: 'GET' }),

  /**
   * POST request
   */
  post: (endpoint: string, body?: any, options?: ApiClientOptions) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body ?? undefined,
    }),

  /**
   * PUT request
   */
  put: (endpoint: string, body?: any, options?: ApiClientOptions) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : body ?? undefined,
    }),

  /**
   * PATCH request
   */
  patch: (endpoint: string, body?: any, options?: ApiClientOptions) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body ?? undefined,
    }),

  /**
   * DELETE request
   */
  delete: (endpoint: string, options?: ApiClientOptions) =>
    request(endpoint, { ...options, method: 'DELETE' }),

  // ========== STICKER METHODS ==========
  
  /**
   * Get sticker catalog (all available stickers)
   */
  getStickerCatalog: () =>
    request('/api/v1/gamification/stickers/catalog', { method: 'GET', skipAuth: true }),

  /**
   * Get user's collected stickers
   */
  getStickers: (userId: string) =>
    request(`/api/v1/gamification/stickers/${userId}`, { method: 'GET' }),

  /**
   * Collect a new sticker
   */
  collectSticker: (userId: string, stickerId: string) =>
    request('/api/v1/gamification/stickers/collect', {
      method: 'POST',
      body: { user_id: userId, sticker_id: stickerId },
    }),

  // ========== PROGRESS METHODS ==========
  
  /**
   * Get progress report for a user
   */
  getProgressReport: (userId: string, days: number = 7) =>
    request(`/api/v1/reports/child/${userId}`, { 
      method: 'GET',
      params: { days },
    }),

  /**
   * Track learning progress
   */
  trackLearning: (userId: string, wordsLearned: number, timeMins: number) =>
    request('/api/v1/gamification/track-learning', {
      method: 'POST',
      body: { user_id: userId, words_learned: wordsLearned, time_mins: timeMins },
    }),

  // ========== PET METHODS ==========
  
  /**
   * Get pet state
   */
  getPet: (userId: string) =>
    request(`/api/v1/gamification/pet/${userId}`, { method: 'GET' }),

  /**
   * Feed pet
   */
  feedPet: (userId: string, petId?: string) =>
    request('/api/v1/gamification/pet/feed', {
      method: 'POST',
      body: { user_id: userId, pet_id: petId },
    }),

  /**
   * Play with pet
   */
  playPet: (userId: string, petId?: string) =>
    request('/api/v1/gamification/pet/play', {
      method: 'POST',
      body: { user_id: userId, pet_id: petId },
    }),

  // ========== LEADERBOARD ==========
  
  /**
   * Get leaderboard
   */
  getLeaderboard: () =>
    request('/api/v1/gamification/leaderboard', { method: 'GET' }),

  // ========== USER STATS ==========
  
  /**
   * Get user gamification stats
   */
  getUserStats: (userId: string) =>
    request(`/api/v1/gamification/user/${userId}`, { method: 'GET' }),

  // ========== XP & BADGES ==========
  
  /**
   * Add XP for an action
   */
  addXP: (userId: string, action: string, metadata?: Record<string, unknown>) =>
    request('/api/v1/gamification/add-xp', {
      method: 'POST',
      body: { user_id: userId, action, metadata },
    }),

  /**
   * Award a badge
   */
  awardBadge: (badgeId: string) =>
    request(`/api/v1/gamification/award-badge?badge_id=${badgeId}`, { method: 'POST' }),

  // ========== LEARNING PATH ==========
  
  /**
   * Track daily progress
   */
  trackDailyProgress: (userId: string, progress: {
    lessons_completed?: number;
    time_spent?: number;
    words_learned?: number;
    games_played?: number;
    pronunciation_score?: number;
  }) =>
    request('/api/v1/learning-path/progress', {
      method: 'POST',
      body: { user_id: userId, ...progress },
    }),

  /**
   * Get learning progress
   */
  getLearningProgress: (userId: string) =>
    request(`/api/v1/learning-path/progress?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get lesson progress
   */
  getLessonProgress: (userId: string, courseId: string, lessonId: string) =>
    request(`/api/v1/learning-path/progress/${courseId}/${lessonId}?user_id=${userId}`, { method: 'GET' }),

  // ========== PRONUNCIATION ==========
  
  /**
   * Submit pronunciation for assessment
   */
  assessPronunciation: (userId: string, lessonId: string, audioData: string, expectedText: string) =>
    request('/api/v1/pronunciation/assess', {
      method: 'POST',
      body: { user_id: userId, lesson_id: lessonId, audio_data: audioData, expected_text: expectedText },
    }),

  // ========== COURSE METHODS ==========
  
  /**
   * Get all courses
   */
  getCourses: (params?: { language?: string; age_range?: string; category?: string }) =>
    request('/api/v1/courses', { method: 'GET', params }),

  /**
   * Get course by ID
   */
  getCourse: (courseId: string) =>
    request(`/api/v1/courses/${courseId}`, { method: 'GET' }),

  /**
   * Get lessons for a course
   */
  getLessons: (courseId: string) =>
    request(`/api/v1/courses/${courseId}/lessons`, { method: 'GET' }),

  /**
   * Get lesson content
   */
  getLessonContent: (courseId: string, lessonId: string) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}`, { method: 'GET' }),

  /**
   * Complete a lesson
   */
  completeLesson: (courseId: string, lessonId: string, progress: {
    score?: number;
    time_spent?: number;
    words_learned?: string[];
    pronunciation_scores?: Record<string, number>;
    games_played?: number;
  }) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: 'POST',
      body: progress,
    }),

  // ========== USER AUTH ==========
  
  /**
   * Register new user
   */
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: userData,
      skipAuth: true,
    }),

  /**
   * Login user
   */
  login: (email: string, password: string) =>
    request('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuth: true,
    }),

  /**
   * Get current user profile
   */
  getProfile: () =>
    request('/api/v1/users/me', { method: 'GET' }),

  /**
   * Update user profile
   */
  updateProfile: (data: {
    name?: string;
    age?: number;
    preferred_language?: string;
  }) =>
    request('/api/v1/users/me', {
      method: 'PUT',
      body: data,
    }),

  /**
   * Update child profile
   */
  updateChildProfile: (childId: string, data: {
    name?: string;
    age?: number;
    grade_level?: string;
    learning_path?: string[];
  }) =>
    request(`/api/v1/users/children/${childId}`, {
      method: 'PUT',
      body: data,
    }),

  // ========== REPORTS ==========
  
  /**
   * Get child progress summary
   */
  getChildProgressSummary: (userId: string, days: number = 7) =>
    request(`/api/v1/reports/child/${userId}/summary`, { 
      method: 'GET',
      params: { days },
    }),

  /**
   * Get parent dashboard
   */
  getParentDashboard: (userId: string) =>
    request(`/api/v1/reports/parent/${userId}/dashboard`, { method: 'GET' }),

  // ========== LEARNING PATH ==========
  
  /**
   * Get learning path topics
   */
  getLearningPathTopics: () =>
    request('/api/v1/learning-path/topics', { method: 'GET' }),

  /**
   * Enroll in learning path
   */
  enrollInLearningPath: (userId: string, topicIds: string[]) =>
    request('/api/v1/learning-path/enroll', {
      method: 'POST',
      body: { user_id: userId, topic_ids: topicIds },
    }),

  /**
   * Get daily lessons for learning path
   */
  getDailyLessons: (userId: string) =>
    request(`/api/v1/learning-path/daily?user_id=${userId}`, { method: 'GET' }),

  // ========== GAME ACTIVITIES ==========
  
  /**
   * Submit game score
   */
  submitGameScore: (userId: string, gameType: string, score: number, metadata?: Record<string, unknown>) =>
    request('/api/v1/games/score', {
      method: 'POST',
      body: { user_id: userId, game_type: gameType, score, metadata },
    }),

  /**
   * Get pronunciation attempts for a lesson
   */
  getPronunciationAttempts: (userId: string, lessonId: string) =>
    request(`/api/v1/pronunciation/attempts/${lessonId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Add pronunciation attempt
   */
  addPronunciationAttempt: (userId: string, lessonId: string, audioData: string, transcript: string, score: number) =>
    request('/api/v1/pronunciation/attempts', {
      method: 'POST',
      body: { user_id: userId, lesson_id: lessonId, audio_data: audioData, transcript, score },
    }),

  // ========== PARENT-CHILD LINKING ==========
  
  /**
   * Link parent account to child
   */
  linkChildAccount: (parentId: string, childId: string, parentCode: string) =>
    request('/api/v1/family/link', {
      method: 'POST',
      body: { parent_id: parentId, child_id: childId, parent_code: parentCode },
    }),

  /**
   * Get family members
   */
  getFamilyMembers: (userId: string) =>
    request(`/api/v1/family/${userId}/members`, { method: 'GET' }),

  /**
   * Get parent dashboard data
   */
  getParentDashboardData: (userId: string) =>
    request(`/api/v1/family/${userId}/dashboard`, { method: 'GET' }),

  // ========== CONTENT MANAGEMENT ==========
  
  /**
   * Get AR content list
   */
  getARContent: (params?: { category?: string; age_range?: string }) =>
    request('/api/v1/ar/content', { method: 'GET', params }),

  /**
   * Get AR content details
   */
  getARContentDetail: (contentId: string) =>
    request(`/api/v1/ar/content/${contentId}`, { method: 'GET' }),

  /**
   * Log AR interaction
   */
  logARInteraction: (userId: string, contentId: string, duration: number) =>
    request('/api/v1/ar/interactions', {
      method: 'POST',
      body: { user_id: userId, content_id: contentId, duration },
    }),

  // ========== ADDITIONAL ENDPOINTS ==========
  
  /**
   * Health check
   */
  healthCheck: () =>
    request('/api/v1/health', { method: 'GET', skipAuth: true }),

  /**
   * Get available topics
   */
  getTopics: () =>
    request('/api/v1/topics', { method: 'GET' }),

  /**
   * Get topic progress
   */
  getTopicProgress: (userId: string, topicId: string) =>
    request(`/api/v1/topics/${topicId}/progress?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get gamification achievements
   */
  getAchievements: (userId: string) =>
    request(`/api/v1/gamification/achievements/${userId}`, { method: 'GET' }),

  /**
   * Get pet collection
   */
  getPetCollection: (userId: string) =>
    request(`/api/v1/gamification/pets/${userId}`, { method: 'GET' }),

  /**
   * Choose pet
   */
  choosePet: (userId: string, petType: string) =>
    request('/api/v1/gamification/pet/choose', {
      method: 'POST',
      body: { user_id: userId, pet_type: petType },
    }),

  /**
   * Change pet outfit
   */
  changePetOutfit: (userId: string, outfit: string) =>
    request('/api/v1/gamification/pet/outfit', {
      method: 'POST',
      body: { user_id: userId, outfit },
    }),

  /**
   * Get daily goals
   */
  getDailyGoals: (userId: string) =>
    request(`/api/v1/gamification/goals/${userId}`, { method: 'GET' }),

  /**
   * Set daily goal
   */
  setDailyGoal: (userId: string, lessons: number) =>
    request('/api/v1/gamification/goals', {
      method: 'POST',
      body: { user_id: userId, daily_lessons: lessons },
    }),

  /**
   * Get weekly summary
   */
  getWeeklySummary: (userId: string) =>
    request(`/api/v1/reports/weekly/${userId}`, { method: 'GET' }),

  /**
   * Get streak info
   */
  getStreak: (userId: string) =>
    request(`/api/v1/gamification/streak/${userId}`, { method: 'GET' }),

  /**
   * Get pet XP and stage
   */
  getPetXP: (userId: string) =>
    request(`/api/v1/gamification/pet-xp/${userId}`, { method: 'GET' }),

  /**
   * Get session logs
   */
  getSessionLogs: (userId: string, limit?: number) =>
    request(`/api/v1/sessions/${userId}`, { 
      method: 'GET',
      params: { limit },
    }),

  /**
   * Create session log
   */
  createSessionLog: (userId: string, sessionData: {
    session_type: string;
    duration_mins?: number;
    words_learned?: string[];
    games_played?: number;
    pronunciation_attempts?: number;
    score?: number;
    course_id?: string;
    lesson_id?: string;
  }) =>
    request('/api/v1/sessions', {
      method: 'POST',
      body: { user_id: userId, ...sessionData },
    }),

  // ========== CONTENT SEEDING ==========
  
  /**
   * Seed courses (admin only)
   */
  seedCourses: (seedData?: {
    language?: string;
    age_range?: string;
    topic?: string;
  }) =>
    request('/api/v1/admin/seed/courses', {
      method: 'POST',
      body: seedData || {},
    }),

  /**
   * Seed pronunciations (admin only)
   */
  seedPronunciations: (seedData?: {
    language?: string;
    age_range?: string;
    topic?: string;
  }) =>
    request('/api/v1/admin/seed/pronunciations', {
      method: 'POST',
      body: seedData || {},
    }),

  // ========== SESSION MANAGEMENT ==========
  
  /**
   * End session
   */
  endSession: (sessionId: string) =>
    request(`/api/v1/sessions/${sessionId}/end`, { method: 'POST' }),

  /**
   * Get session analytics
   */
  getSessionAnalytics: (userId: string, startDate?: string, endDate?: string) =>
    request('/api/v1/analytics/sessions', {
      method: 'GET',
      params: { user_id: userId, start_date: startDate, end_date: endDate },
    }),

  /**
   * Get user activity
   */
  getUserActivity: (userId: string, limit?: number) =>
    request('/api/v1/analytics/activity', {
      method: 'GET',
      params: { user_id: userId, limit },
    }),

  /**
   * Get learning analytics
   */
  getLearningAnalytics: (userId: string) =>
    request(`/api/v1/analytics/learning/${userId}`, { method: 'GET' }),

  /**
   * Get pronunciation progress
   */
  getPronunciationProgress: (userId: string) =>
    request(`/api/v1/analytics/pronunciation/${userId}`, { method: 'GET' }),

  /**
   * Get mastery progress
   */
  getMasteryProgress: (userId: string) =>
    request(`/api/v1/analytics/mastery/${userId}`, { method: 'GET' }),

  /**
   * Get engagement metrics
   */
  getEngagementMetrics: (userId: string, period: string = 'week') =>
    request('/api/v1/analytics/engagement', {
      method: 'GET',
      params: { user_id: userId, period },
    }),

  // ========== LESSON ACTIVITIES ==========
  
  /**
   * Get lesson activities
   */
  getLessonActivities: (lessonId: string) =>
    request(`/api/v1/lessons/${lessonId}/activities`, { method: 'GET' }),

  /**
   * Submit lesson activity response
   */
  submitActivityResponse: (lessonId: string, activityId: string, response: {
    activity_type: string;
    data: Record<string, unknown>;
    score?: number;
  }) =>
    request(`/api/v1/lessons/${lessonId}/activities/${activityId}/submit`, {
      method: 'POST',
      body: response,
    }),

  /**
   * Get activity results
   */
  getActivityResults: (lessonId: string, activityId: string, userId: string) =>
    request(`/api/v1/lessons/${lessonId}/activities/${activityId}/results?user_id=${userId}`, { method: 'GET' }),

  // ========== ADDITIONAL METHODS ==========
  
  /**
   * Get course progress
   */
  getCourseProgress: (userId: string, courseId: string) =>
    request(`/api/v1/courses/${courseId}/progress?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get recommended courses
   */
  getRecommendedCourses: (userId: string) =>
    request(`/api/v1/courses/recommended/${userId}`, { method: 'GET' }),

  /**
   * Get user preferences
   */
  getUserPreferences: (userId: string) =>
    request(`/api/v1/users/${userId}/preferences`, { method: 'GET' }),

  /**
   * Update user preferences
   */
  updateUserPreferences: (userId: string, preferences: {
    notifications?: boolean;
    sound_effects?: boolean;
    haptic_feedback?: boolean;
    language?: string;
    difficulty?: string;
  }) =>
    request(`/api/v1/users/${userId}/preferences`, {
      method: 'PUT',
      body: preferences,
    }),

  /**
   * Get available pets
   */
  getAvailablePets: () =>
    request('/api/v1/gamification/available-pets', { method: 'GET' }),

  /**
   * Unlock pet
   */
  unlockPet: (userId: string, petId: string) =>
    request('/api/v1/gamification/pets/unlock', {
      method: 'POST',
      body: { user_id: userId, pet_id: petId },
    }),

  /**
   * Get all badges
   */
  getAllBadges: () =>
    request('/api/v1/gamification/badges', { method: 'GET' }),

  /**
   * Get learning milestones
   */
  getLearningMilestones: (userId: string) =>
    request(`/api/v1/gamification/milestones/${userId}`, { method: 'GET' }),

  /**
   * Get daily rewards
   */
  getDailyRewards: (userId: string) =>
    request(`/api/v1/gamification/daily-rewards/${userId}`, { method: 'GET' }),

  /**
   * Claim daily reward
   */
  claimDailyReward: (userId: string, day: number) =>
    request('/api/v1/gamification/daily-rewards/claim', {
      method: 'POST',
      body: { user_id: userId, day },
    }),

  /**
   * Get daily lessons for learning path (with topic ID)
   */
  getTopicDailyLessons: (userId: string, topicId: string) =>
    request('/api/v1/learning-path/daily', {
      method: 'GET',
      params: { user_id: userId, topic_id: topicId },
    }),

  /**
   * Start lesson
   */
  startLesson: (userId: string, courseId: string, lessonId: string) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/start`, {
      method: 'POST',
      body: { user_id: userId },
    }),

  /**
   * Get content by topic
   */
  getContentByTopic: (topicId: string, params?: { language?: string; age_range?: string }) =>
    request(`/api/v1/topics/${topicId}/content`, { method: 'GET', params }),

  /**
   * Get topic statistics
   */
  getTopicStats: (userId: string, topicId: string) =>
    request(`/api/v1/topics/${topicId}/stats?user_id=${userId}`, { method: 'GET' }),

  /**
   * Set active pet
   */
  setActivePet: (userId: string, petId: string) =>
    request('/api/v1/gamification/pets/active', {
      method: 'POST',
      body: { user_id: userId, pet_id: petId },
    }),

  /**
   * Get active pet
   */
  getActivePet: (userId: string) =>
    request(`/api/v1/gamification/pets/active/${userId}`, { method: 'GET' }),

  // ========== ADDITIONAL LEARNING PATH METHODS ==========
  
  /**
   * Get lesson progress (extended)
   */
  getLessonProgressExtended: (userId: string, courseId: string, lessonId: string) =>
    request(`/api/v1/learning-path/progress`, {
      method: 'GET',
      params: { user_id: userId, course_id: courseId, lesson_id: lessonId },
    }),

  /**
   * Update lesson progress
   */
  updateLessonProgress: (userId: string, courseId: string, lessonId: string, progress: {
    status?: string;
    score?: number;
    time_spent?: number;
    completed_at?: string;
  }) =>
    request('/api/v1/learning-path/progress', {
      method: 'PUT',
      body: { user_id: userId, course_id: courseId, lesson_id: lessonId, ...progress },
    }),

  /**
   * Get user's enrolled topics
   */
  getEnrolledTopics: (userId: string) =>
    request(`/api/v1/learning-path/enrolled/${userId}`, { method: 'GET' }),

  /**
   * Update topic enrollment
   */
  updateTopicEnrollment: (userId: string, topicId: string, status: string) =>
    request(`/api/v1/learning-path/enrollment`, {
      method: 'PUT',
      body: { user_id: userId, topic_id: topicId, status },
    }),

  // ========== ADMIN METHODS ==========
  
  /**
   * Admin: Get all users
   */
  adminGetUsers: (params?: { page?: number; limit?: number; role?: string }) =>
    request('/api/v1/admin/users', { method: 'GET', params }),

  /**
   * Admin: Get user details
   */
  adminGetUser: (userId: string) =>
    request(`/api/v1/admin/users/${userId}`, { method: 'GET' }),

  /**
   * Admin: Update user
   */
  adminUpdateUser: (userId: string, data: Record<string, unknown>) =>
    request(`/api/v1/admin/users/${userId}`, {
      method: 'PUT',
      body: data,
    }),

  /**
   * Admin: Delete user
   */
  adminDeleteUser: (userId: string) =>
    request(`/api/v1/admin/users/${userId}`, { method: 'DELETE' }),

  /**
   * Admin: Get system stats
   */
  adminGetSystemStats: () =>
    request('/api/v1/admin/stats', { method: 'GET' }),

  /**
   * Admin: Get analytics overview
   */
  adminGetAnalyticsOverview: (startDate?: string, endDate?: string) =>
    request('/api/v1/admin/analytics', {
      method: 'GET',
      params: { start_date: startDate, end_date: endDate },
    }),

  // ========== ADDITIONAL UTILITY METHODS ==========
  
  /**
   * Get user by ID
   */
  getUser: (userId: string) =>
    request(`/api/v1/users/${userId}`, { method: 'GET' }),

  /**
   * Get child progress details
   */
  getChildProgressDetails: (parentId: string, childId: string, days: number = 7) =>
    request(`/api/v1/reports/parent/${parentId}/child/${childId}`, {
      method: 'GET',
      params: { days },
    }),

  /**
   * Get lesson completion stats
   */
  getLessonCompletionStats: (userId: string) =>
    request(`/api/v1/reports/lesson-stats/${userId}`, { method: 'GET' }),

  /**
   * Get course completion stats
   */
  getCourseCompletionStats: (userId: string) =>
    request(`/api/v1/reports/course-stats/${userId}`, { method: 'GET' }),

  /**
   * Get topic completion stats
   */
  getTopicCompletionStats: (userId: string) =>
    request(`/api/v1/reports/topic-stats/${userId}`, { method: 'GET' }),

  /**
   * Get recent activity
   */
  getRecentActivity: (userId: string, limit: number = 10) =>
    request('/api/v1/reports/recent-activity', {
      method: 'GET',
      params: { user_id: userId, limit },
    }),

  /**
   * Get progress trends
   */
  getProgressTrends: (userId: string, metric: string, days: number = 30) =>
    request('/api/v1/reports/trends', {
      method: 'GET',
      params: { user_id: userId, metric, days },
    }),

  /**
   * Get achievement progress
   */
  getAchievementProgress: (userId: string) =>
    request(`/api/v1/reports/achievement-progress/${userId}`, { method: 'GET' }),

  /**
   * Get all achievements with user progress
   */
  getAllAchievements: (userId: string) =>
    request(`/api/v1/gamification/all-achievements/${userId}`, { method: 'GET' }),

  /**
   * Get course lessons with progress
   */
  getCourseLessonsWithProgress: (userId: string, courseId: string) =>
    request(`/api/v1/courses/${courseId}/lessons-with-progress?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get lesson with user progress
   */
  getLessonWithProgress: (userId: string, courseId: string, lessonId: string) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/progress?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get topic recommendations
   */
  getTopicRecommendations: (userId: string) =>
    request(`/api/v1/topics/recommendations/${userId}`, { method: 'GET' }),

  /**
   * Get AR lesson content
   */
  getARLessonContent: (courseId: string, lessonId: string) =>
    request(`/api/v1/ar/lesson/${courseId}/${lessonId}`, { method: 'GET' }),

  /**
   * Get AR word cards
   */
  getARWordCards: (courseId: string, lessonId: string) =>
    request(`/api/v1/ar/word-cards/${courseId}/${lessonId}`, { method: 'GET' }),

  /**
   * Get AR experiences
   */
  getARExperiences: (params?: { category?: string; language?: string }) =>
    request('/api/v1/ar/experiences', { method: 'GET', params }),

  /**
   * Get AR experience details
   */
  getARExperience: (experienceId: string) =>
    request(`/api/v1/ar/experiences/${experienceId}`, { method: 'GET' }),

  /**
   * Log AR experience interaction
   */
  logARExperienceInteraction: (userId: string, experienceId: string, data: {
    duration?: number;
    score?: number;
    objects_discovered?: string[];
  }) =>
    request(`/api/v1/ar/experiences/${experienceId}/interactions`, {
      method: 'POST',
      body: { user_id: userId, ...data },
    }),

  /**
   * Get learning path with today's lessons
   */
  getLearningPathToday: (userId: string) =>
    request(`/api/v1/learning-path/today/${userId}`, { method: 'GET' }),

  /**
   * Set learning goal
   */
  setLearningGoal: (userId: string, goal: {
    daily_lessons?: number;
    weekly_lessons?: number;
    daily_time_mins?: number;
  }) =>
    request('/api/v1/learning-path/goals', {
      method: 'POST',
      body: { user_id: userId, ...goal },
    }),

  /**
   * Get learning goals
   */
  getLearningGoals: (userId: string) =>
    request(`/api/v1/learning-path/goals/${userId}`, { method: 'GET' }),

  /**
   * Update learning goal
   */
  updateLearningGoal: (userId: string, goalId: string, goal: {
    daily_lessons?: number;
    weekly_lessons?: number;
    daily_time_mins?: number;
  }) =>
    request(`/api/v1/learning-path/goals/${goalId}`, {
      method: 'PUT',
      body: { user_id: userId, ...goal },
    }),

  // ========== ADDITIONAL METHODS ==========
  
  /**
   * Get pronunciation feedback
   */
  getPronunciationFeedback: (userId: string, attemptId: string) =>
    request(`/api/v1/pronunciation/feedback/${attemptId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get pronunciation history
   */
  getPronunciationHistory: (userId: string, lessonId: string, limit: number = 20) =>
    request('/api/v1/pronunciation/history', {
      method: 'GET',
      params: { user_id: userId, lesson_id: lessonId, limit },
    }),

  /**
   * Save pronunciation feedback
   */
  savePronunciationFeedback: (userId: string, attemptId: string, feedback: {
    helpful?: boolean;
    understood?: boolean;
    notes?: string;
  }) =>
    request(`/api/v1/pronunciation/feedback/${attemptId}`, {
      method: 'POST',
      body: { user_id: userId, ...feedback },
    }),

  /**
   * Get child reports
   */
  getChildReports: (parentId: string, childId: string, params?: { start_date?: string; end_date?: string }) =>
    request(`/api/v1/reports/parent/${parentId}/child/${childId}/reports`, {
      method: 'GET',
      params,
    }),

  /**
   * Get parent settings
   */
  getParentSettings: (userId: string) =>
    request(`/api/v1/family/${userId}/settings`, { method: 'GET' }),

  /**
   * Update parent settings
   */
  updateParentSettings: (userId: string, settings: {
    daily_limit_mins?: number;
    weekly_limit_mins?: number;
    allowed_days?: string[];
    content_filters?: string[];
  }) =>
    request(`/api/v1/family/${userId}/settings`, {
      method: 'PUT',
      body: settings,
    }),

  /**
   * Get family activity
   */
  getFamilyActivity: (userId: string, limit: number = 20) =>
    request(`/api/v1/family/${userId}/activity`, {
      method: 'GET',
      params: { limit },
    }),

  /**
   * Get family leaderboard
   */
  getFamilyLeaderboard: (parentId: string) =>
    request(`/api/v1/family/${parentId}/leaderboard`, { method: 'GET' }),

  /**
   * Get family rewards
   */
  getFamilyRewards: (parentId: string) =>
    request(`/api/v1/family/${parentId}/rewards`, { method: 'GET' }),

  /**
   * Award family reward
   */
  awardFamilyReward: (parentId: string, childId: string, rewardId: string) =>
    request('/api/v1/family/rewards/award', {
      method: 'POST',
      body: { parent_id: parentId, child_id: childId, reward_id: rewardId },
    }),

  /**
   * Get available rewards
   */
  getAvailableRewards: () =>
    request('/api/v1/family/rewards/available', { method: 'GET' }),

  /**
   * Get reward redemption history
   */
  getRewardHistory: (childId: string) =>
    request(`/api/v1/family/rewards/history/${childId}`, { method: 'GET' }),

  /**
   * Get reward details
   */
  getRewardDetails: (rewardId: string) =>
    request(`/api/v1/family/rewards/${rewardId}`, { method: 'GET' }),

  // ========== LEARNING PATH v2 METHODS ==========
  
  /**
   * Get user learning path v2
   */
  getUserLearningPathV2: (userId: string) =>
    request(`/api/v1/learning-path/v2/${userId}`, { method: 'GET' }),

  /**
   * Update learning path v2
   */
  updateLearningPathV2: (userId: string, data: {
    completed_lessons?: string[];
    current_lesson?: string;
    progress_percentage?: number;
    mastered_words?: string[];
  }) =>
    request(`/api/v1/learning-path/v2/${userId}`, {
      method: 'PUT',
      body: data,
    }),

  /**
   * Get learning path progress
   */
  getLearningPathProgress: (userId: string) =>
    request(`/api/v1/learning-path/progress/${userId}`, { method: 'GET' }),

  /**
   * Update learning path progress
   */
  updateLearningPathProgress: (userId: string, data: {
    lesson_id?: string;
    status?: string;
    score?: number;
    time_spent?: number;
    words_learned?: string[];
    pronunciation_scores?: Record<string, number>;
    games_played?: number;
    completed_activities?: string[];
  }) =>
    request('/api/v1/learning-path/progress', {
      method: 'POST',
      body: { user_id: userId, ...data },
    }),

  /**
   * Get all topics with user progress
   */
  getTopicsWithProgress: (userId: string) =>
    request('/api/v1/topics/with-progress', {
      method: 'GET',
      params: { user_id: userId },
    }),

  // ========== ALTERNATIVE METHODS ==========
  
  /**
   * Get user stats (alt)
   */
  getUserStatsAlt: (userId: string) =>
    request(`/api/v1/gamification/stats/${userId}`, { method: 'GET' }),

  /**
   * Get child learning summary
   */
  getChildLearningSummary: (parentId: string, childId: string) =>
    request(`/api/v1/reports/parent/${parentId}/child/${childId}/summary`, { method: 'GET' }),

  /**
   * Get lesson progress details
   */
  getLessonProgressDetails: (userId: string, lessonId: string) =>
    request(`/api/v1/learning-path/lesson/${lessonId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Update lesson progress details
   */
  updateLessonProgressDetails: (userId: string, lessonId: string, data: {
    status?: string;
    score?: number;
    time_spent?: number;
    words_learned?: string[];
    pronunciation_scores?: Record<string, number>;
    games_played?: number;
  }) =>
    request(`/api/v1/learning-path/lesson/${lessonId}`, {
      method: 'PUT',
      body: { user_id: userId, ...data },
    }),

  /**
   * Get available pets list
   */
  getAvailablePetsList: () =>
    request('/api/v1/gamification/pets/available', { method: 'GET' }),

  /**
   * Get pet stats
   */
  getPetStats: (userId: string) =>
    request(`/api/v1/gamification/pets/${userId}/stats`, { method: 'GET' }),

  /**
   * Get pet history
   */
  getPetHistory: (userId: string) =>
    request(`/api/v1/gamification/pets/${userId}/history`, { method: 'GET' }),

  /**
   * Get daily lesson plan
   */
  getDailyLessonPlan: (userId: string) =>
    request(`/api/v1/learning-path/daily-plan/${userId}`, { method: 'GET' }),

  /**
   * Get lesson recommendations
   */
  getLessonRecommendations: (userId: string) =>
    request(`/api/v1/learning-path/recommendations/${userId}`, { method: 'GET' }),

  // ========== ADDITIONAL METHODS ==========
  
  /**
   * Get AR card content
   */
  getARCardContent: (cardId: string) =>
    request(`/api/v1/ar/cards/${cardId}`, { method: 'GET' }),

  /**
   * Scan AR card
   */
  scanARCard: (userId: string, cardId: string, scanData: {
    position?: Record<string, number>;
    rotation?: Record<string, number>;
    objects_detected?: string[];
  }) =>
    request(`/api/v1/ar/cards/${cardId}/scan`, {
      method: 'POST',
      body: { user_id: userId, ...scanData },
    }),

  /**
   * Get content by type
   */
  getContentByType: (contentType: string, params?: { language?: string; age_range?: string }) =>
    request(`/api/v1/content/${contentType}`, { method: 'GET', params }),

  /**
   * Get vocabulary list
   */
  getVocabularyList: (courseId: string, lessonId: string) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/vocabulary`, { method: 'GET' }),

  /**
   * Get quiz content
   */
  getQuizContent: (courseId: string, lessonId: string) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz`, { method: 'GET' }),

  /**
   * Submit quiz answers
   */
  submitQuizAnswers: (userId: string, courseId: string, lessonId: string, answers: {
    question_id: string;
    answer: string | string[];
    time_spent?: number;
  }[]) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/quiz/submit`, {
      method: 'POST',
      body: { user_id: userId, answers },
    }),

  /**
   * Get game content
   */
  getGameContent: (courseId: string, lessonId: string, gameType: string) =>
    request(`/api/v1/courses/${courseId}/lessons/${lessonId}/games/${gameType}`, { method: 'GET' }),

  /**
   * Submit game result
   */
  submitGameResult: (userId: string, courseId: string, lessonId: string, gameType: string, result: {
    score: number;
    time_spent?: number;
    moves?: number;
    accuracy?: number;
    bonus_data?: Record<string, unknown>;
  }) =>
    request(`/api/v1/games/${courseId}/${lessonId}/${gameType}`, {
      method: 'POST',
      body: { user_id: userId, ...result },
    }),

  /**
   * Get leaderboard entries
   */
  getLeaderboardEntries: (params?: { limit?: number; period?: string; category?: string }) =>
    request('/api/v1/gamification/leaderboard/entries', { method: 'GET', params }),

  /**
   * Get user rank
   */
  getUserRank: (userId: string) =>
    request(`/api/v1/gamification/leaderboard/rank/${userId}`, { method: 'GET' }),

  /**
   * Get badge details
   */
  getBadgeDetails: (badgeId: string) =>
    request(`/api/v1/gamification/badges/${badgeId}`, { method: 'GET' }),

  /**
   * Get earned badges
   */
  getEarnedBadges: (userId: string) =>
    request(`/api/v1/gamification/badges/earned/${userId}`, { method: 'GET' }),

  /**
   * Get daily reward calendar
   */
  getDailyRewardCalendar: (userId: string) =>
    request(`/api/v1/gamification/rewards/calendar/${userId}`, { method: 'GET' }),

  /**
   * Claim calendar reward
   */
  claimCalendarReward: (userId: string, day: number) =>
    request('/api/v1/gamification/rewards/calendar/claim', {
      method: 'POST',
      body: { user_id: userId, day },
    }),

  /**
   * Get season rewards
   */
  getSeasonRewards: (userId: string) =>
    request(`/api/v1/gamification/season/${userId}`, { method: 'GET' }),

  /**
   * Claim season reward
   */
  claimSeasonReward: (userId: string, tierId: string) =>
    request('/api/v1/gamification/season/claim', {
      method: 'POST',
      body: { user_id: userId, tier_id: tierId },
    }),

  // ========== BACKUP METHODS ==========
  
  /**
   * Get all progress data
   */
  getAllProgress: (userId: string) =>
    request(`/api/v1/progress/${userId}`, { method: 'GET' }),

  /**
   * Get course content
   */
  getCourseContent: (courseId: string) =>
    request(`/api/v1/courses/${courseId}/content`, { method: 'GET' }),

  /**
   * Get lesson activities
   */
  getLessonActivitiesList: (lessonId: string) =>
    request(`/api/v1/lessons/${lessonId}/activities`, { method: 'GET' }),

  /**
   * Get activity feedback
   */
  getActivityFeedback: (activityId: string, userId: string) =>
    request(`/api/v1/activities/${activityId}/feedback?user_id=${userId}`, { method: 'GET' }),

  /**
   * Submit activity feedback
   */
  submitActivityFeedback: (activityId: string, userId: string, feedback: {
    helpful?: boolean;
    difficulty?: string;
    notes?: string;
  }) =>
    request(`/api/v1/activities/${activityId}/feedback`, {
      method: 'POST',
      body: { user_id: userId, ...feedback },
    }),

  /**
   * Get lesson tips
   */
  getLessonTips: (lessonId: string) =>
    request(`/api/v1/lessons/${lessonId}/tips`, { method: 'GET' }),

  /**
   * Report lesson issue
   */
  reportLessonIssue: (userId: string, lessonId: string, issue: {
    type: string;
    description: string;
    screenshot?: string;
  }) =>
    request(`/api/v1/lessons/${lessonId}/report`, {
      method: 'POST',
      body: { user_id: userId, ...issue },
    }),

  /**
   * Get pronunciation best attempts
   */
  getPronunciationBestAttempts: (userId: string, lessonId: string) =>
    request(`/api/v1/pronunciation/best/${lessonId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get lesson mastery summary
   */
  getLessonMasterySummary: (userId: string) =>
    request(`/api/v1/analytics/mastery-summary/${userId}`, { method: 'GET' }),

  /**
   * Get recommended next lessons
   */
  getRecommendedNextLessons: (userId: string) =>
    request(`/api/v1/recommendations/next-lessons/${userId}`, { method: 'GET' }),

  /**
   * Get personalized recommendations
   */
  getPersonalizedRecommendations: (userId: string, category: string) =>
    request('/api/v1/recommendations/personalized', {
      method: 'GET',
      params: { user_id: userId, category },
    }),

  /**
   * Get AR content by category
   */
  getARContentByCategory: (category: string) =>
    request(`/api/v1/ar/content/category/${category}`, { method: 'GET' }),

  /**
   * Get AR content by age
   */
  getARContentByAge: (ageRange: string) =>
    request(`/api/v1/ar/content/age/${ageRange}`, { method: 'GET' }),

  /**
   * Get AR content by language
   */
  getARContentByLanguage: (language: string) =>
    request(`/api/v1/ar/content/language/${language}`, { method: 'GET' }),

  /**
   * Get favorite topics
   */
  getFavoriteTopics: (userId: string) =>
    request(`/api/v1/topics/favorites/${userId}`, { method: 'GET' }),

  /**
   * Add favorite topic
   */
  addFavoriteTopic: (userId: string, topicId: string) =>
    request('/api/v1/topics/favorites', {
      method: 'POST',
      body: { user_id: userId, topic_id: topicId },
    }),

  /**
   * Remove favorite topic
   */
  removeFavoriteTopic: (userId: string, topicId: string) =>
    request(`/api/v1/topics/favorites/${topicId}`, {
      method: 'DELETE',
      params: { user_id: userId },
    }),

  // ========== ADDITIONAL ENDPOINTS ==========
  
  /**
   * Get lesson by ID
   */
  getLesson: (lessonId: string) =>
    request(`/api/v1/lessons/${lessonId}`, { method: 'GET' }),

  /**
   * Get lessons by course
   */
  getLessonsByCourse: (courseId: string, params?: { status?: string }) =>
    request(`/api/v1/courses/${courseId}/lessons`, { method: 'GET', params }),

  /**
   * Get user course progress
   */
  getUserCourseProgress: (userId: string, courseId: string) =>
    request(`/api/v1/learning-path/course-progress/${courseId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get weekly learning summary
   */
  getWeeklyLearningSummary: (userId: string) =>
    request(`/api/v1/reports/weekly-summary/${userId}`, { method: 'GET' }),

  /**
   * Get monthly learning summary
   */
  getMonthlyLearningSummary: (userId: string) =>
    request(`/api/v1/reports/monthly-summary/${userId}`, { method: 'GET' }),

  /**
   * Get custom date range report
   */
  getCustomDateRangeReport: (userId: string, startDate: string, endDate: string) =>
    request('/api/v1/reports/custom', {
      method: 'GET',
      params: { user_id: userId, start_date: startDate, end_date: endDate },
    }),

  /**
   * Get course analytics
   */
  getCourseAnalytics: (userId: string, courseId: string) =>
    request(`/api/v1/analytics/course/${courseId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get topic analytics
   */
  getTopicAnalytics: (userId: string, topicId: string) =>
    request(`/api/v1/analytics/topic/${topicId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get activity analytics
   */
  getActivityAnalytics: (userId: string, activityType: string) =>
    request('/api/v1/analytics/activity', {
      method: 'GET',
      params: { user_id: userId, type: activityType },
    }),

  /**
   * Get pronunciation analytics
   */
  getPronunciationAnalytics: (userId: string) =>
    request(`/api/v1/analytics/pronunciation-stats/${userId}`, { method: 'GET' }),

  /**
   * Get game analytics
   */
  getGameAnalytics: (userId: string) =>
    request(`/api/v1/analytics/game-stats/${userId}`, { method: 'GET' }),

  /**
   * Get engagement trends
   */
  getEngagementTrends: (userId: string, period: string = 'month') =>
    request(`/api/v1/analytics/engagement-trends/${userId}?period=${period}`, { method: 'GET' }),

  /**
   * Get retention metrics
   */
  getRetentionMetrics: (userId: string) =>
    request(`/api/v1/analytics/retention/${userId}`, { method: 'GET' }),

  /**
   * Get completion rates
   */
  getCompletionRates: (userId: string) =>
    request(`/api/v1/analytics/completion-rates/${userId}`, { method: 'GET' }),

  /**
   * Get mastery distribution
   */
  getMasteryDistribution: (userId: string) =>
    request(`/api/v1/analytics/mastery-distribution/${userId}`, { method: 'GET' }),

  /**
   * Get word mastery breakdown
   */
  getWordMasteryBreakdown: (userId: string, topicId?: string) =>
    request('/api/v1/analytics/word-mastery', {
      method: 'GET',
      params: { user_id: userId, topic_id: topicId },
    }),

  /**
   * Get pronunciation score breakdown
   */
  getPronunciationScoreBreakdown: (userId: string) =>
    request(`/api/v1/analytics/pronunciation-breakdown/${userId}`, { method: 'GET' }),

  /**
   * Get time spent breakdown
   */
  getTimeSpentBreakdown: (userId: string, period: string = 'week') =>
    request('/api/v1/analytics/time-breakdown', {
      method: 'GET',
      params: { user_id: userId, period },
    }),

  /**
   * Get streak history
   */
  getStreakHistory: (userId: string) =>
    request(`/api/v1/gamification/streak-history/${userId}`, { method: 'GET' }),

  /**
   * Get learning streak info
   */
  getLearningStreakInfo: (userId: string) =>
    request(`/api/v1/gamification/learning-streak/${userId}`, { method: 'GET' }),

  /**
   * Get daily streak rewards
   */
  getDailyStreakRewards: (userId: string) =>
    request(`/api/v1/gamification/streak-rewards/${userId}`, { method: 'GET' }),

  /**
   * Claim streak reward
   */
  claimStreakReward: (userId: string, streakDays: number) =>
    request('/api/v1/gamification/streak-rewards/claim', {
      method: 'POST',
      body: { user_id: userId, streak_days: streakDays },
    }),

  // ========== FINAL METHODS ==========
  
  /**
   * Get learning intensity
   */
  getLearningIntensity: (userId: string) =>
    request(`/api/v1/analytics/learning-intensity/${userId}`, { method: 'GET' }),

  /**
   * Get topic strength analysis
   */
  getTopicStrengthAnalysis: (userId: string) =>
    request(`/api/v1/analytics/topic-strength/${userId}`, { method: 'GET' }),

  /**
   * Get recommended difficulty
   */
  getRecommendedDifficulty: (userId: string) =>
    request(`/api/v1/analytics/recommended-difficulty/${userId}`, { method: 'GET' }),

  /**
   * Get engagement score
   */
  getEngagementScore: (userId: string) =>
    request(`/api/v1/analytics/engagement-score/${userId}`, { method: 'GET' }),

  /**
   * Get motivational insights
   */
  getMotivationalInsights: (userId: string) =>
    request(`/api/v1/analytics/motivational-insights/${userId}`, { method: 'GET' }),

  /**
   * Get session summary
   */
  getSessionSummary: (userId: string, sessionId: string) =>
    request(`/api/v1/sessions/${sessionId}/summary?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get session details
   */
  getSessionDetails: (userId: string, sessionId: string) =>
    request(`/api/v1/sessions/${sessionId}/details?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get lesson session data
   */
  getLessonSessionData: (userId: string, courseId: string, lessonId: string) =>
    request(`/api/v1/sessions/lesson/${courseId}/${lessonId}?user_id=${userId}`, { method: 'GET' }),

  /**
   * Get recent sessions
   */
  getRecentSessions: (userId: string, limit: number = 10) =>
    request('/api/v1/sessions/recent', {
      method: 'GET',
      params: { user_id: userId, limit },
    }),

  /**
   * Get session statistics
   */
  getSessionStatistics: (userId: string) =>
    request(`/api/v1/sessions/statistics/${userId}`, { method: 'GET' }),

  /**
   * Get session trends
   */
  getSessionTrends: (userId: string, period: string = 'week') =>
    request('/api/v1/sessions/trends', {
      method: 'GET',
      params: { user_id: userId, period },
    }),

  /**
   * Get daily session stats
   */
  getDailySessionStats: (userId: string, date: string) =>
    request('/api/v1/sessions/daily', {
      method: 'GET',
      params: { user_id: userId, date },
    }),

  /**
   * Get weekly session stats
   */
  getWeeklySessionStats: (userId: string, weekStart: string) =>
    request('/api/v1/sessions/weekly', {
      method: 'GET',
      params: { user_id: userId, week_start: weekStart },
    }),

  /**
   * Get monthly session stats
   */
  getMonthlySessionStats: (userId: string, year: number, month: number) =>
    request('/api/v1/sessions/monthly', {
      method: 'GET',
      params: { user_id: userId, year, month },
    }),

  // ========== END ==========

  /**
   * Raw request with full control
   */
  request,
};

export default apiClient;
