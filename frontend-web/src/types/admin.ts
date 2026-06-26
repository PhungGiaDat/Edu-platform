// frontend-web/src/types/admin.ts
/**
 * TypeScript types for Teacher Admin Dashboard
 */

export interface DashboardStats {
  total_students: number;
  total_courses: number;
  total_flashcards: number;
  total_decks: number;
  active_sessions: number;
  average_progress: number;
  total_enrollments: number;
  students_this_week: number;
  lessons_completed_today: number;
  top_students: TopStudent[];
}

export interface TopStudent {
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  total_xp: number;
  streak_days: number;
  last_active?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

// ========== Course Types ==========

export interface Course {
  course_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  subtitle_vi?: string;
  theme?: string;
  category_key?: string;
  category_label?: string;
  category_icon?: string;
  age_range?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  description_vi?: string;
  is_template?: boolean;
  is_published?: boolean;
  enrollment_count?: number;
  lesson_count?: number;
  lessons?: Lesson[];
  created_at?: string;
  updated_at?: string;
}

export interface Lesson {
  lesson_id: string;
  title: string;
  description?: string;
  order?: number;
  duration_minutes?: number;
  // Add other lesson fields as needed
}

export interface CourseCreate {
  title: string;
  description?: string;
  thumbnail_url?: string;
  subtitle_vi?: string;
  theme?: string;
  category_key?: string;
  category_label?: string;
  category_icon?: string;
  age_range?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  description_vi?: string;
  is_template?: boolean;
}

export interface CourseUpdate {
  title?: string;
  description?: string;
  thumbnail_url?: string;
  subtitle_vi?: string;
  theme?: string;
  category_key?: string;
  category_label?: string;
  category_icon?: string;
  age_range?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  description_vi?: string;
  is_template?: boolean;
  is_published?: boolean;
  lessons?: Lesson[];
}

// ========== Flashcard Deck Types ==========

export interface FlashcardDeck {
  deck_id: string;
  teacher_id: string;
  name: LocalizedString;
  description?: LocalizedString;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  card_count?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LocalizedString {
  en?: string;
  vi?: string;
  [key: string]: string | undefined;
}

export interface DeckCreate {
  name: LocalizedString;
  description?: LocalizedString;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
}

export interface DeckUpdate {
  name?: LocalizedString;
  description?: LocalizedString;
  cover_image_url?: string;
  category?: string;
  tags?: string[];
  is_active?: boolean;
}

// ========== Flashcard Types ==========

export interface Flashcard {
  qr_id: string;
  teacher_id?: string;
  deck_id?: string;
  word: string;
  translation: LocalizedString;
  pronunciation?: string;
  image_url?: string;
  audio_url?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FlashcardCreate {
  qr_id: string;
  word: string;
  translation: LocalizedString;
  deck_id?: string;
  pronunciation?: string;
  image_url?: string;
  audio_url?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
}

export interface FlashcardUpdate {
  word?: string;
  translation?: LocalizedString;
  deck_id?: string;
  pronunciation?: string;
  image_url?: string;
  audio_url?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  is_active?: boolean;
}

// ========== Student Types ==========

export interface StudentProgress {
  user_id: string;
  teacher_id: string;
  user_name?: string;
  user_avatar?: string;
  enrollments: CourseEnrollment[];
  flashcards_practiced?: number;
  flashcards_mastered?: number;
  total_xp?: number;
  total_time_minutes?: number;
  streak_days?: number;
  last_active?: string;
}

export interface CourseEnrollment {
  course_id: string;
  course_title?: string;
  course_thumbnail?: string;
  enrolled_at?: string;
  progress_percent: number;
  lessons: LessonProgress[];
  last_activity?: string;
  status?: 'active' | 'completed' | 'dropped';
}

export interface LessonProgress {
  lesson_id: string;
  status: 'not_started' | 'started' | 'completed';
  attempts: number;
  best_score?: number;
  time_spent_minutes: number;
  completed_at?: string;
}

// ========== Learning Goal Types ==========

export interface LearningGoal {
  user_id: string;
  teacher_id: string;
  settings: LearningGoalSettings;
  current_streak: number;
  longest_streak: number;
  total_xp_earned: number;
  total_minutes_learned: number;
  last_goal_completed?: string;
  last_active_date?: string;
}

export interface LearningGoalSettings {
  daily_xp_goal: number;
  daily_minutes_goal: number;
  streak_protection_enabled: boolean;
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
}

export interface LearningGoalCreate {
  daily_xp_goal?: number;
  daily_minutes_goal?: number;
  streak_protection_enabled?: boolean;
  reminder_enabled?: boolean;
  reminder_interval_minutes?: number;
}

// ========== Analytics Types ==========

export interface ProgressAnalytics {
  progress_trends: ProgressTrend[];
  xp_distribution: XpDistribution[];
}

export interface ProgressTrend {
  date: string;
  avg_progress: number;
  count: number;
}

export interface XpDistribution {
  range: string;
  count: number;
}

export interface EngagementAnalytics {
  activity_by_day: ActivityByDay[];
  session_stats: SessionStats;
}

export interface ActivityByDay {
  day: number;
  count: number;
}

export interface SessionStats {
  avg_session_time: number;
  total_sessions: number;
  avg_xp: number;
}

// ========== API Request Types ==========

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface StudentListParams extends PaginationParams {
  search?: string;
}

// ========== Admin Page Props ==========

export interface AdminPageProps {
  children: React.ReactNode;
  title: string;
}

export interface AdminCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export interface AdminTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  className?: string;
}

export interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}
