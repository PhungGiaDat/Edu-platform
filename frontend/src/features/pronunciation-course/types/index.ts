// frontend/src/features/pronunciation-course/types/index.ts

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PronunciationWord {
  word_id: string;
  word: string;
  phonetic?: string;
  difficulty: Difficulty;
  audio_url?: string;
}

export interface PronunciationCourse {
  id: string;
  topic_id: string;
  name: string;
  name_vi: string;
  icon: string;
  color: string;
  word_count: number;
  completion_percent: number;
}

export interface PronunciationCourseDetail extends PronunciationCourse {
  words: PronunciationWord[];
  progress: {
    learned: number;
    total: number;
  };
}

export interface PronunciationAttempt {
  user_id: string;
  topic_id: string;
  word_id: string;
  score: number;
  stars: number;
  transcription: string;
  evaluation_method: 'browser' | 'huggingface';
}

export interface PronunciationProgress {
  total_words_learned: number;
  words_per_topic: Array<{
    topic_id: string;
    topic_name: string;
    count: number;
  }>;
  favorite_topic?: {
    topic_id: string;
    topic_name: string;
    count: number;
  };
  total_stars: number;
  current_streak: number;
}

export interface EvaluationResult {
  score: number;
  stars: number;
  feedback: string;
  transcription: string;
  evaluation_method: 'browser' | 'huggingface';
}
