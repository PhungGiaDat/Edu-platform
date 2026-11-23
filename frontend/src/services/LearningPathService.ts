import { apiClient } from './apiClient';

export type LearningPathPreferences = {
  user_id: string;
  priority_topics: string[];
  daily_time_goal_mins: number;
  daily_words_goal: number;
  notifications_enabled: boolean;
};

export type LearningPathPayload = {
  user_id: string;
  priority_topics: string[];
  daily_time_goal_mins: number;
  daily_words_goal: number;
  notifications_enabled: boolean;
};

export type LearningPathResponse = {
  preferences: LearningPathPreferences;
  today_progress?: {
    time_spent_mins: number;
    words_learned: number;
    games_played: number;
    pronunciation_attempts: number;
  };
  goals?: {
    time: {
      target: number;
      current: number;
      percentage: number;
      remaining: number;
    };
    words: {
      target: number;
      current: number;
      percentage: number;
      remaining: number;
    };
  };
};

export const learningPathService = {
  get: (userId: string): Promise<LearningPathResponse> =>
    apiClient.get(`/api/v1/learning-path/${userId}`),

  save: (payload: LearningPathPayload): Promise<{ preferences: LearningPathPreferences }> =>
    apiClient.post('/api/v1/learning-path/preferences', payload),
};

