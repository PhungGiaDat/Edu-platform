/**
 * Enhanced CourseLesson System Types
 * Inspired by Duolingo's lesson structure with video, gallery, and progress tracking
 */

import type { AssetReference } from './course';

// ============================================
// VIDEO CONTENT TYPES
// ============================================

export interface VideoCaption {
  /** Unique caption ID */
  caption_id: string;
  /** Language code (e.g., 'vi', 'en', 'zh') */
  language: string;
  /** Caption track label for accessibility */
  label: string;
  /** VTT format caption content */
  content: string;
  /** Whether this is the default caption track */
  isDefault?: boolean;
}

export interface VideoSource {
  /** Unique source ID */
  source_id: string;
  /** Video quality label (e.g., '720p', '1080p', '480p') */
  quality: '480p' | '720p' | '1080p' | 'auto';
  /** Video file URL */
  url: string;
  /** MIME type (e.g., 'video/mp4', 'video/webm') */
  mimeType: string;
  /** File size in bytes (for bandwidth detection) */
  fileSize?: number;
}

export interface VideoContent {
  /** Unique video content ID */
  video_id: string;
  /** Video title */
  title: string;
  /** Brief description */
  description?: string;
  /** Duration in seconds */
  duration_seconds: number;
  /** Primary video source */
  primarySource: AssetReference;
  /** Alternative video sources for different quality/format */
  alternativeSources?: VideoSource[];
  /** Thumbnail image */
  thumbnail: AssetReference;
  /** Preview/GIF thumbnail for quick preview */
  previewThumbnail?: AssetReference;
  /** Caption tracks (VTT format) */
  captions: VideoCaption[];
  /** Learning objectives covered in this video */
  learningObjectives?: string[];
  /** Transcript for accessibility */
  transcript?: string;
  /** Interactive timestamps for lesson navigation */
  chapterMarkers?: VideoChapterMarker[];
}

export interface VideoChapterMarker {
  /** Chapter title */
  title: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds (optional, defaults to next chapter or video end) */
  endTime?: number;
  /** Associated vocabulary words in this section */
  relatedVocabulary?: string[];
}

// ============================================
// IMAGE GALLERY TYPES
// ============================================

export interface GalleryImage {
  /** Unique image ID */
  image_id: string;
  /** Image asset reference */
  asset: AssetReference;
  /** Alt text for accessibility */
  altText: string;
  /** Display caption */
  caption?: string;
  /** Attribution/source credit */
  attribution?: string;
  /** Image dimensions (width x height) */
  dimensions?: { width: number; height: number };
  /** File size in bytes */
  fileSize?: number;
}

export interface GalleryCategory {
  /** Category identifier */
  category_id: string;
  /** Category display name */
  name: string;
  /** Category icon/emoji */
  icon: string;
  /** Description of this category */
  description?: string;
  /** Images in this category */
  images: GalleryImage[];
}

export interface ImageGallery {
  /** Unique gallery ID */
  gallery_id: string;
  /** Gallery title */
  title: string;
  /** Gallery description */
  description?: string;
  /** Gallery cover image */
  coverImage: AssetReference;
  /** Thumbnail grid images (max 6 for preview) */
  previewImages: GalleryImage[];
  /** All images in the gallery */
  allImages: GalleryImage[];
  /** Optional categorization of images */
  categories?: GalleryCategory[];
  /** Number of images to show per page in grid view */
  imagesPerPage: number;
  /** Enable zoom functionality */
  enableZoom: boolean;
  /** Enable slideshow mode */
  enableSlideshow: boolean;
  /** Auto-play slideshow interval in seconds */
  slideshowInterval?: number;
}

// ============================================
// ENHANCED LESSON TYPES
// ============================================

export interface LessonSection {
  /** Section identifier */
  section_id: string;
  /** Section type for rendering */
  type: 'introduction' | 'vocabulary' | 'practice' | 'review' | 'quiz';
  /** Section title */
  title: string;
  /** Section subtitle */
  subtitle?: string;
  /** Estimated time to complete in seconds */
  estimatedTimeSeconds?: number;
  /** Section content varies by type */
  content: VideoContent | ImageGallery | VocabularySection | PracticeSection | QuizSection;
  /** Completion requirement */
  completionRequirement?: {
    type: 'watch_complete' | 'images_viewed' | 'words_practiced' | 'quiz_passed' | 'manual';
    threshold?: number; // percentage or count
  };
  /** Section order in lesson */
  order: number;
}

export interface VocabularySection {
  /** Vocabulary words with images and audio */
  words: VocabularyItemEnhanced[];
  /** Enable flashcard mode */
  flashcardMode: boolean;
  /** Enable pronunciation practice */
  pronunciationPractice: boolean;
}

export interface VocabularyItemEnhanced {
  /** Word identifier */
  word_id: string;
  /** English word */
  word_en: string;
  /** Vietnamese translation */
  word_vi: string;
  /** Phonetic pronunciation guide */
  phonetic?: string;
  /** Emoji representation */
  emoji: string;
  /** Word image */
  image: AssetReference;
  /** Audio pronunciation */
  audio: AssetReference;
  /** Associated sticker reward */
  sticker?: AssetReference;
  /** Example sentence in English */
  exampleSentence_en: string;
  /** Example sentence in Vietnamese */
  exampleSentence_vi: string;
  /** Part of speech (noun, verb, adjective, etc.) */
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'interjection';
  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeSection {
  /** Practice type */
  practiceType: 'listening' | 'speaking' | 'reading' | 'matching' | 'fill_blank';
  /** Practice instructions in Vietnamese */
  instruction_vi: string;
  /** Practice instructions in English */
  instruction_en: string;
  /** Items/questions for this practice */
  items: PracticeItem[];
  /** Minimum score to pass (%) */
  passScore: number;
  /** Number of attempts allowed */
  maxAttempts: number;
  /** Show immediate feedback */
  immediateFeedback: boolean;
}

export interface PracticeItem {
  /** Item identifier */
  item_id: string;
  /** Question/prompt text */
  prompt: string;
  /** Question/prompt in Vietnamese */
  prompt_vi: string;
  /** Associated image (optional) */
  image?: AssetReference;
  /** Audio prompt (for listening) */
  audioPrompt?: AssetReference;
  /** Answer options */
  options?: PracticeOption[];
  /** Correct answer (for fill_blank type) */
  correctAnswer?: string;
  /** Feedback for correct answer */
  feedbackCorrect: string;
  /** Feedback for incorrect answer */
  feedbackIncorrect: string;
}

export interface PracticeOption {
  /** Option identifier */
  option_id: string;
  /** Option display text */
  label: string;
  /** Option image (optional) */
  image?: AssetReference;
  /** Whether this is the correct answer */
  isCorrect: boolean;
}

export interface QuizSection {
  /** Quiz questions */
  questions: QuizQuestionEnhanced[];
  /** Minimum score to pass (%) */
  passScore: number;
  /** Show correct answers after submission */
  showAnswersAfterSubmit: boolean;
  /** Randomize question order */
  randomizeQuestions: boolean;
}

export interface QuizQuestionEnhanced {
  /** Question identifier */
  question_id: string;
  /** Question type */
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
  /** Question text */
  question: string;
  /** Question in Vietnamese */
  question_vi: string;
  /** Associated image (optional) */
  image?: AssetReference;
  /** Answer options */
  options: QuizOptionEnhanced[];
  /** Points for this question */
  points: number;
  /** Explanation after answering */
  explanation?: string;
}

export interface QuizOptionEnhanced {
  /** Option identifier */
  option_id: string;
  /** Option text */
  text: string;
  /** Option image (optional) */
  image?: AssetReference;
  /** Whether this is the correct answer */
  isCorrect: boolean;
}

// ============================================
// LESSON PROGRESS TRACKING TYPES
// ============================================

export interface LessonProgressEnhanced {
  /** Lesson being tracked */
  lessonId: string;
  /** Current user */
  userId: string;
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Section-level progress */
  sectionProgress: SectionProgress[];
  /** Total time spent on lesson (seconds) */
  totalTimeSpent: number;
  /** Quiz scores history */
  quizScores: QuizScoreRecord[];
  /** Vocabulary mastery levels */
  vocabularyMastery: VocabularyMasteryRecord[];
  /** Achievement badges earned */
  earnedBadges: EarnedBadge[];
  /** Session data */
  currentSession?: {
    sessionId: string;
    startedAt: string;
    currentSectionIndex: number;
    answersSoFar: Record<string, string>;
  };
  /** Completed sections */
  completedSections: string[];
  /** Last accessed timestamp */
  lastAccessedAt: string;
}

export interface SectionProgress {
  /** Section identifier */
  sectionId: string;
  /** Section type */
  sectionType: LessonSection['type'];
  /** Progress percentage (0-100) */
  progress: number;
  /** Time spent on this section (seconds) */
  timeSpent: number;
  /** Whether completed */
  isCompleted: boolean;
  /** Best score achieved (if applicable) */
  bestScore?: number;
  /** Number of attempts */
  attempts: number;
}

export interface QuizScoreRecord {
  /** Attempt timestamp */
  attemptedAt: string;
  /** Score achieved (%) */
  score: number;
  /** Correct answers count */
  correctCount: number;
  /** Total questions */
  totalQuestions: number;
  /** Time taken (seconds) */
  timeTaken: number;
}

export interface VocabularyMasteryRecord {
  /** Word identifier */
  wordId: string;
  /** Mastery level (0-5) */
  masteryLevel: number;
  /** Number of correct attempts */
  correctAttempts: number;
  /** Number of incorrect attempts */
  incorrectAttempts: number;
  /** Last practiced timestamp */
  lastPracticedAt: string;
  /** Whether mastered (level >= 4) */
  isMastered: boolean;
}

export interface EarnedBadge {
  /** Badge identifier */
  badgeId: string;
  /** Badge name */
  name: string;
  /** Badge icon */
  icon: string;
  /** When earned */
  earnedAt: string;
  /** Badge description */
  description: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GetLessonRequest {
  courseId: string;
  lessonId: string;
}

export interface GetLessonResponse {
  lesson: LessonEnhanced;
  progress?: LessonProgressEnhanced;
}

export interface LessonEnhanced {
  /** Lesson unique ID */
  id: string;
  /** Course this lesson belongs to */
  courseId: string;
  /** Lesson title in English */
  title_en: string;
  /** Lesson title in Vietnamese */
  title_vi: string;
  /** Lesson description in English */
  description_en?: string;
  /** Lesson description in Vietnamese */
  description_vi?: string;
  /** Lesson order in course */
  order: number;
  /** Estimated duration in minutes */
  duration_minutes: number;
  /** XP reward for completing lesson */
  xpReward: number;
  /** Difficulty level */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Target language */
  targetLanguage: 'vi' | 'en' | 'zh';
  /** Introduction video content */
  introductionVideo?: VideoContent;
  /** Image gallery for vocabulary */
  vocabularyGallery?: ImageGallery;
  /** Lesson sections */
  sections: LessonSection[];
  /** Final quiz section */
  quiz?: QuizSection;
  /** Completion reward */
  reward?: {
    xp: number;
    badge?: EarnedBadge;
    sticker?: AssetReference;
  };
  /** Prerequisites (lesson IDs that must be completed first) */
  prerequisites?: string[];
  /** Tags for filtering */
  tags: string[];
  /** Creation timestamp */
  createdAt: string;
  /** Update timestamp */
  updatedAt: string;
}

export interface StartLessonSessionRequest {
  userId: string;
  lessonId: string;
}

export interface StartLessonSessionResponse {
  sessionId: string;
  lesson: LessonEnhanced;
  progress: LessonProgressEnhanced;
  startedAt: string;
}

export interface SubmitSectionProgressRequest {
  userId: string;
  sessionId: string;
  sectionId: string;
  progress: number;
  timeSpent: number;
  score?: number;
  answers?: Record<string, string>;
}

export interface CompleteLessonRequest {
  userId: string;
  sessionId: string;
  totalTimeSpent: number;
  finalScore: number;
  vocabularyLearned: string[];
  quizScore?: number;
}

export interface CompleteLessonResponse {
  success: boolean;
  xpEarned: number;
  newBadges: EarnedBadge[];
  updatedProgress: LessonProgressEnhanced;
}

// ============================================
// SAMPLE DATA TYPES (for seeding)
// ============================================

export interface SampleVietnameseLesson {
  /** Lesson theme/topic */
  theme: string;
  /** Vocabulary words */
  vocabulary: Array<{
    word_en: string;
    word_vi: string;
    emoji: string;
    exampleSentence_en: string;
    exampleSentence_vi: string;
  }>;
  /** Gallery categories */
  galleryCategories: Array<{
    name: string;
    icon: string;
    items: string[];
  }>;
  /** Practice items */
  practiceItems: Array<{
    prompt_en: string;
    prompt_vi: string;
    correctAnswer: string;
  }>;
}
