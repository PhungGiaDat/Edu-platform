export type AssetType = 'video' | 'audio' | 'image' | 'sticker' | 'model' | 'texture' | 'mind';
export type AssetStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface AssetReference {
  bucket: string;
  path: string;
  type: AssetType;
  status: AssetStatus;
}

export interface GeneratedMedia {
  asset: AssetReference;
  source: 'generated' | 'uploaded' | 'placeholder';
  prompt?: string | null;
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

export interface PronunciationTask {
  task_id: string;
  instruction_vi: string;
  prompt_audio_text: string;
  target_words: string[];
  audio: AssetReference;
  pass_score: number;
  feedback_positive_vi: string;
}

export interface SectionGame {
  game_id: string;
  type: 'listen_and_tap' | 'picture_match' | 'memory_match' | 'find_picture';
  instruction_vi: string;
  prompt_audio_text: string;
  items: Array<Record<string, unknown>>;
  feedback_positive_vi: string;
}

export interface ReadAloudPage {
  page_id: string;
  order: number;
  text_en: string;
  text_vi: string;
  highlighted_words: string[];
  image: AssetReference;
  audio: AssetReference;
}

export interface ReadAloudStory {
  story_id: string;
  title: string;
  instruction_vi: string;
  pages: ReadAloudPage[];
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

export interface CourseCatalogPreview {
  label: string;
  value: string;
  color: string;
}

export interface StudentTestimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

export interface EnrollmentCTA {
  headline: string;
  body: string;
  buttonLabel: string;
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
  game?: SectionGame | null;
  readAloudStory?: ReadAloudStory | null;
  pronunciation?: PronunciationTask | null;
  activity?: Activity | null;
  quiz: QuizQuestion[];
  reward?: Reward | null;
  arReference?: ARReference | null;
  generatedMedia: GeneratedMedia[];
}

export interface Course {
  course_id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  subtitle_vi: string;
  theme: string;
  category_key: string;
  category_label: string;
  category_icon: string;
  age_range: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description_vi: string;
  thumbnail?: AssetReference | null;
  catalogPreview: CourseCatalogPreview[];
  studentTestimonials: StudentTestimonial[];
  enrollmentCta?: EnrollmentCTA | null;
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

export type LessonStepStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'needs_retry';

export interface LessonSessionStepState {
  step_id: string;
  title: string;
  status: LessonStepStatus;
  attempts: number;
  best_score: number;
  passed: boolean;
  last_response: Record<string, unknown>;
  updated_at?: string;
  completed_at?: string | null;
}

export interface LessonSession {
  session_id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  status: 'started' | 'completed';
  current_step_id: string;
  current_step_index: number;
  progress_percent: number;
  steps: LessonSessionStepState[];
  started_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface LessonStepAttemptPayload {
  user_id: string;
  step_id: string;
  attempt_type: string;
  passed: boolean;
  score: number;
  response_data?: Record<string, unknown>;
  mastery_words?: string[];
}

export interface MediaAssetRecord {
  asset_id: string;
  course_id: string;
  lesson_id: string;
  section_id: string;
  asset_key: string;
  bucket: string;
  path: string;
  type: AssetType;
  status: AssetStatus;
  public_url?: string | null;
  provider?: string;
  metadata?: Record<string, unknown>;
  updated_at?: string;
}
