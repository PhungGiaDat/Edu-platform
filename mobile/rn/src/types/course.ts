/**
 * Course and lesson types — backend response shape (snake_case).
 *
 * Phase 0 (Migration Note A): backend uses `course_id` / `lesson_id`.
 * Previously these were `id` (a latent bug masked by the mock layer).
 * Every consumer must use the snake_case key from here on.
 *
 * Slim non-AR surface: AR-coupled fields live in `types/ar.ts`.
 */

import type {
  LessonSession,
  LessonStepStatus,
  LessonSessionStepState,
  MediaAssetRecord,
  UserProgress,
  QuizSubmitResult,
  CompleteLessonStats,
} from './session';

export type {
  LessonSession,
  LessonSessionStepState,
  LessonStepStatus,
  LessonStepAttemptPayload,
  LessonStepAttemptResponse,
  LessonStatus,
  MediaAssetRecord,
  UserProgress,
  QuizSubmitResult,
  CompleteLessonStats,
} from './session';

export interface Course {
  course_id: string;
  title: string;
  description: string;
  category_key: string;
  image_url?: string;
  lesson_count: number;
  age_range?: string;
  total_xp?: number;
  level?: 'beginner' | 'intermediate' | 'advanced';
  theme?: string;
  subtitle_vi?: string;
  category_label?: string;
  category_icon?: string;
}

export interface LessonVocabularyItem {
  word_en: string;
  word_vi: string;
  emoji: string;
  image: AssetReferenceLike;
  audio: AssetReferenceLike;
  sticker?: AssetReferenceLike | null;
  simple_sentence?: string;
}

export interface AssetReferenceLike {
  bucket?: string;
  path: string;
  type: 'video' | 'audio' | 'image' | 'sticker' | 'model' | 'texture' | 'mind';
  status?: 'pending' | 'generating' | 'ready' | 'failed';
}

export interface LessonVideoLesson {
  title: string;
  duration_seconds: number;
  video: AssetReferenceLike;
  thumbnail: AssetReferenceLike;
  scenes: Array<{
    scene_id: string;
    order: number;
    duration_seconds: number;
    visual_prompt: string;
    narration_vi: string;
    audio_text_en: string;
    image?: AssetReferenceLike | null;
    scene_image_url?: string | null;
    scene_thumbnail_url?: string | null;
  }>;
}

export interface LessonQuizQuestion {
  question_id: string;
  type: 'image_choice' | 'sound_choice' | 'word_choice';
  prompt_vi: string;
  questionAudioText: string;
  options: Array<{
    option_id: string;
    label: string;
    image?: AssetReferenceLike | null;
  }>;
  correctOptionId: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
}

export interface LessonReadAloudStory {
  story_id: string;
  title: string;
  instruction_vi: string;
  pages: Array<{
    page_id: string;
    order: number;
    text_en: string;
    text_vi: string;
    highlighted_words: string[];
    image: AssetReferenceLike;
    audio: AssetReferenceLike;
  }>;
  feedback_positive_vi: string;
}

export interface LessonPronunciationTask {
  task_id: string;
  instruction_vi: string;
  prompt_audio_text: string;
  target_words: string[];
  audio: AssetReferenceLike;
  pass_score: number;
  feedback_positive_vi: string;
}

export interface LessonARReference {
  ar_tag: string;
  flashcard_qr_id?: string | null;
  mind_asset?: AssetReferenceLike | null;
  model_asset?: AssetReferenceLike | null;
  texture_asset?: AssetReferenceLike | null;
}

export interface LessonReward {
  xp: number;
  sticker: AssetReferenceLike;
  badgeTitle: string;
  message_vi: string;
}

export interface Lesson {
  lesson_id: string;
  course_id: string;
  title: string;
  title_vi?: string;
  description?: string | null;
  qr_code?: string;
  order?: number;
  duration_minutes?: number;
  vocabulary: LessonVocabularyItem[];
  quiz: LessonQuizQuestion[];
  videoLesson?: LessonVideoLesson | null;
  readAloudStory?: LessonReadAloudStory | null;
  pronunciation?: LessonPronunciationTask | null;
  reward?: LessonReward | null;
  arReference?: LessonARReference | null;
}

export interface CourseDetail extends Course {
  lessons: Lesson[];
}

export interface LessonProgress {
  lesson_id: string;
  status: 'not_started' | 'started' | 'completed';
  best_score: number;
  attempts: number;
  completed_at: string | null;
}