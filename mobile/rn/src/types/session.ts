/**
 * Lesson session + step types — backend response shape (snake_case).
 *
 * Phase 0 introduces the typed session contract that the LessonPlayer will
 * consume in Phase 2. These mirror `backend/models/course_model.py`:
 *
 *   - `LessonSession`            → server `_lesson_session` document
 *   - `LessonSessionStepState`   → server `LessonSessionStepState` model
 *   - `LessonStepStatus`         → literal enum {locked|available|in_progress|completed|needs_retry}
 *   - `LessonStepAttemptPayload` → request body for /steps/attempt
 *   - `LessonStepAttemptResponse`→ server response shape (advances step + returns score)
 *   - `LessonStatus`             → session status literal {started|completed}
 *   - `MediaAssetRecord`         → server `MediaAssetRecord` (signed URLs for lesson media)
 *   - `UserProgress`             → server `UserProgress` (course-level progress roll-up)
 *   - `QuizSubmitResult`         → quiz submit response shape
 *   - `CompleteLessonStats`      → body for POST /lessons/{id}/complete
 */

import type { LessonActivityType } from './course';

export type LessonStepStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'needs_retry';

export type LessonStatus = 'started' | 'completed';

export interface LessonSessionStepState {
  step_id: string;
  title?: string;
  activity_type?: LessonActivityType | null;
  activity_order?: number | null;
  required: boolean;
  status: LessonStepStatus;
  attempts: number;
  best_score: number;
  passed: boolean;
  last_response?: Record<string, unknown>;
  updated_at?: string;
  completed_at?: string | null;
}

export interface LessonSession {
  session_id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  content_version: number;
  status: LessonStatus;
  current_step_id: string;
  current_step_index: number;
  progress_percent: number;
  steps: LessonSessionStepState[];
  started_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface LessonStepAttemptPayload {
  user_id?: string;
  step_id: string;
  attempt_type?: string;
  passed: boolean;
  score: number;
  response_data?: Record<string, unknown>;
  mastery_words?: string[];
}

export interface LessonStepAttemptResponse {
  step: LessonSessionStepState;
  session: LessonSession;
  next_step_id: string | null;
  passed: boolean;
  score: number;
}

export interface MediaAssetRecord {
  asset_id: string;
  course_id: string;
  lesson_id: string;
  section_id: string;
  asset_key: string;
  bucket: string;
  path: string;
  type: 'video' | 'audio' | 'image' | 'sticker' | 'model' | 'texture' | 'mind';
  status: 'pending' | 'generating' | 'ready' | 'failed';
  public_url?: string | null;
  provider: string;
  metadata?: Record<string, unknown>;
  updated_at: string;
}

export interface LessonProgressEntry {
  lesson_id: string;
  status: 'not_started' | 'started' | 'completed';
  best_score: number;
  attempts: number;
  completed_at: string | null;
}

export interface UserProgress {
  user_id: string;
  course_id: string;
  status: 'started' | 'completed';
  current_lesson_id: string | null;
  completed_lessons: string[];
  lesson_progress: LessonProgressEntry[];
  total_xp: number;
  started_at: string;
  updated_at: string;
}

export interface QuizSubmitResult {
  success: boolean;
  score: number;
  passed: boolean;
  correct_count?: number;
  total_questions?: number;
  message?: string;
}

export interface CompleteLessonStats {
  score?: number;
  timeSpent?: number;
  wordsLearned?: string[];
  pronunciationScores?: Record<string, number>;
  gamesPlayed?: number;
  completedSteps?: string[];
}
