/**
 * Gamification types — XP, streaks, badges, levels.
 * Backend response shape (snake_case). No AR coupling.
 */

export interface GamificationProfile {
  user_id: string;
  level: number;
  current_xp: number;
  xp_to_next_level: number;
  total_xp: number;
  streak_days: number;
  last_active_at: string | null;
}

export interface Badge {
  id: string;
  code: string;
  title: string;
  description: string;
  icon_url?: string;
  earned_at: string | null;
}

export interface AwardXpRequest {
  amount: number;
  reason: string;
}

export interface AwardXpResponse {
  new_total_xp: number;
  new_level: number;
  leveled_up: boolean;
}

/**
 * Backend `/gamification/user/{user_id}` response. The snake_case keys
 * stay in place; RN consumers read `UserStats` for the canonical view.
 */
export interface UserStats {
  user_id: string;
  total_points: number;
  level: number;
  xp_to_next_level: number;
  stars: number;
  badges: string[];
  streak_days: number;
  longest_streak: number;
  streak_active_today?: boolean;
  minutes_today?: number;
  last_activity_date?: string | null;
  daily_progress?: Array<{
    date: string;
    xp_earned: number;
    flashcards_viewed?: number;
    quizzes_completed?: number;
    games_played?: number;
  }>;
  pet?: Record<string, unknown>;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  minutes_today?: number;
  streak_active_today?: boolean;
  last_active_date?: string | null;
}

export interface AddXpRequest {
  action: string;
  metadata?: Record<string, unknown>;
}

export interface AddXpResponse {
  success: boolean;
  new_total_xp?: number;
  new_level?: number;
  leveled_up?: boolean;
  xp_awarded?: number;
  error?: string;
}