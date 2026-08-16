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

export type LessonActivityType =
  | 'warm_up'
  | 'learn_vocabulary'
  | 'listen_choose'
  | 'match'
  | 'drag_drop'
  | 'memory_match'
  | 'coloring'
  | 'mini_game'
  | 'quiz'
  | 'read_aloud'
  | 'pronunciation';

export type CompletionMode =
  | 'viewed'
  | 'all_items'
  | 'interaction_complete'
  | 'game_complete'
  | 'quiz_complete';

interface LessonActivityBase<T extends LessonActivityType, C, M extends CompletionMode> {
  activity_id: string;
  type: T;
  order: number;
  required: boolean;
  completion_policy: { mode: M };
  config: C;
  title?: string | null;
  instructions?: string | null;
}

type PracticeReferences = {
  vocabulary_ids: string[];
  mini_game_item_ids?: number[];
} | {
  vocabulary_ids?: string[];
  mini_game_item_ids: number[];
};

export type LessonActivity =
  | LessonActivityBase<'warm_up', { media_asset_ids: string[] }, 'viewed'>
  | LessonActivityBase<'learn_vocabulary', { vocabulary_ids: string[] }, 'viewed' | 'all_items'>
  | LessonActivityBase<'listen_choose', { vocabulary_ids: string[]; question_count?: number | null; order_policy: 'authored' | 'random' }, 'all_items' | 'interaction_complete'>
  | LessonActivityBase<'match', PracticeReferences, 'all_items' | 'interaction_complete'>
  | LessonActivityBase<'drag_drop', PracticeReferences, 'all_items' | 'interaction_complete'>
  | LessonActivityBase<'memory_match', PracticeReferences, 'all_items' | 'interaction_complete'>
  | LessonActivityBase<'coloring', { vocabulary_id: string; outline_asset_id: string }, 'interaction_complete'>
  | LessonActivityBase<'mini_game', { game_type: 'catch_word' | 'drag_match' | 'memory_match' | 'word_scramble' | 'coloring'; mini_game_item_ids: number[] }, 'game_complete'>
  | LessonActivityBase<'quiz', { question_ids: number[]; question_count?: number | null; order_policy: 'authored' | 'random' }, 'quiz_complete'>
  | LessonActivityBase<'read_aloud', { story_id: string }, 'all_items'>
  | LessonActivityBase<'pronunciation', { vocabulary_ids: string[] }, 'all_items' | 'interaction_complete'>;

export interface QuizActivityOption { option_id: string; label: string; order: number; }
export interface QuizActivityQuestion { question_id: number; question_type: 'multiple_choice' | 'true_false'; prompt: string; flashcard_qr_id: string; options: QuizActivityOption[]; }
export interface QuizActivityHydration { activity_id: string; questions: QuizActivityQuestion[]; }
export interface QuizActivityAnswerRequest { question_id: number; option_id: string; }
export interface QuizActivityAnswerResult { question_id: number; correct: boolean; score: number; completed: boolean; session: LessonSession; }
export type LearnerAssetRole = 'course_cover' | 'warm_up_visual' | 'vocabulary_illustration' | 'pronunciation_audio' | 'coloring_outline';
export interface ResolvedLearnerAsset { role: LearnerAssetRole; url: string; media_type: 'video' | 'audio' | 'image' | 'sticker' | 'model' | 'texture' | 'mind'; metadata: Record<string, unknown>; }
export interface MemoryMatchCard { card_id: string; pair_id: string; type: 'word' | 'image'; content?: string | null; asset?: ResolvedLearnerAsset | null; }
export interface MiniGameActivityHydration { activity_id: string; game_type: 'memory_match'; cards: MemoryMatchCard[]; }
export interface MiniGameCompleteResult { completed: boolean; session: LessonSession; }
export interface VocabularyActivityItem { vocabulary_id: string; illustration: ResolvedLearnerAsset; pronunciation_audio: ResolvedLearnerAsset; }
export interface VocabularyActivityHydration { activity_id: string; items: VocabularyActivityItem[]; }

export interface LessonLearningBlocks {
  schema_version: 1 | 2;
  content_version: number;
  vocabulary: Array<string | Record<string, unknown>>;
  activities: LessonActivity[];
  activity?: Record<string, unknown> | null;
  game?: Record<string, unknown> | null;
  pronunciation?: Record<string, unknown> | null;
  quiz?: Array<Record<string, unknown>> | null;
  readAloudStory?: Record<string, unknown> | null;
}

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
  thumbnail_url?: string | null;
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
  learning_blocks: LessonLearningBlocks;
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
