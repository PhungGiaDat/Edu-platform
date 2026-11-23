/**
 * Gamification Types - Shared type definitions for gamification features
 */

// ========== Streak Types ==========

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity: string | null;
  streak_active_today: boolean;
}

// ========== Daily Goal Types ==========

export interface GoalProgress {
  target: number;
  current: number;
  percentage: number;
  remaining: number;
}

export interface DailyGoalProgress {
  time_spent_mins: number;
  words_learned: number;
  games_played: number;
  pronunciation_attempts: number;
}

export interface DailyGoalTargets {
  time: GoalProgress;
  words: GoalProgress;
}

export interface DailyGoalData {
  date: string;
  progress: DailyGoalProgress;
  goals: DailyGoalTargets;
  is_complete: boolean;
}

export interface DailyGoalStreakData extends StreakData {
  daily_goal_minutes: number;
  minutes_today: number;
}

// ========== Pet Types ==========

export interface PetState {
  type: string;
  happiness: number;
  hunger: number;
  energy: number;
  mood: string;
  last_fed: string | null;
  last_played: string | null;
  last_care_at: string;
  last_mood_update: string;
  outfit: string;
  xp_earned: number;
  stage: string;
  last_action: string;
  animation_clip: string;
  needs_attention?: boolean;
}

// ========== Badge Types ==========

export interface BadgeDefinition {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: {
    type: string;
    value: number;
  };
  xp_reward: number;
}

export interface EarnedBadge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earned_at: string;
}

// ========== XP & Level Types ==========

export interface XPLevelData {
  user_id: string;
  xp: number;
  level: number;
  xp_to_next_level: number;
  total_xp_earned: number;
}

// ========== Gamification Summary Types ==========

export interface GamificationSummary {
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  lessons_completed: number;
  words_learned: number;
  badges_earned: number;
  pets_unlocked: number;
  total_time_mins: number;
}
