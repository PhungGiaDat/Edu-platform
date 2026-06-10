export type AssetType = 'video' | 'audio' | 'image' | 'sticker' | 'model' | 'texture' | 'mind';
export type AssetStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface AssetReference {
  bucket: string;
  path: string;
  type: AssetType;
  status: AssetStatus;
}

export interface ARReference {
  ar_tag: string;
  flashcard_qr_id?: string | null;
  mind_asset?: AssetReference | null;
  model_asset?: AssetReference | null;
  texture_asset?: AssetReference | null;
}

export interface VideoScene {
  scene_id: string;
  order: number;
  duration_seconds: number;
  visual_prompt: string;
  narration_vi: string;
  audio_text_en: string;
  image?: AssetReference | null;
}

export interface VideoLesson {
  title: string;
  duration_seconds: number;
  video: AssetReference;
  thumbnail: AssetReference;
  scenes: VideoScene[];
}

export interface VideoSchema {
  title: string;
  url: string;
  duration_seconds: number;
  thumbnail_url?: string | null;
}

export interface VocabularyItem {
  word_en: string;
  word_vi: string;
  emoji: string;
  image: AssetReference;
  audio: AssetReference;
  sticker?: AssetReference | null;
  simple_sentence: string;
}

export interface Activity {
  activity_id: string;
  type: 'tap_image' | 'match_picture' | 'choose_sound';
  instruction_vi: string;
  prompt_audio_text: string;
  items: Array<Record<string, unknown>>;
  feedback_positive_vi: string;
}

export interface QuizOption {
  option_id: string;
  label: string;
  image?: AssetReference | null;
}

export interface QuizQuestion {
  question_id: string;
  type: 'image_choice' | 'sound_choice' | 'word_choice';
  prompt_vi: string;
  questionAudioText: string;
  options: QuizOption[];
  correctOptionId: string;
  feedbackCorrect: string;
  feedbackIncorrect: string;
}

export interface Reward {
  xp: number;
  sticker: AssetReference;
  badgeTitle: string;
  message_vi: string;
}

export interface Lesson {
  id?: string;
  lesson_id: string;
  title: string;
  description?: string | null;
  video?: VideoSchema | null;
  content?: string | null;
  title_vi: string;
  order: number;
  is_completed?: boolean;
  duration_minutes: number;
  videoLesson?: VideoLesson | null;
  vocabulary: VocabularyItem[];
  activity?: Activity | null;
  quiz: QuizQuestion[];
  reward?: Reward | null;
  arReference?: ARReference | null;
}

export interface Course {
  course_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  subtitle_vi: string;
  theme: string;
  age_range: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description_vi: string;
  thumbnail?: AssetReference | null;
  lessons: Lesson[];
  is_published: boolean;
}

export interface QuizSubmitResult {
  score: number;
  correct: number;
  total: number;
  passed: boolean;
  feedback: Array<{ question_id: string; correct: boolean; message: string }>;
  reward?: Reward | null;
}

export interface LessonProgress {
  lesson_id: string;
  status: 'not_started' | 'started' | 'completed';
  best_score: number;
  attempts: number;
  completed_at?: string | null;
}

export interface UserProgress {
  user_id: string;
  course_id: string;
  status: 'started' | 'completed';
  current_lesson_id?: string | null;
  completed_lessons: string[];
  lesson_progress: LessonProgress[];
  total_xp: number;
  rewards: Reward[];
  started_at?: string;
  updated_at?: string;
}
