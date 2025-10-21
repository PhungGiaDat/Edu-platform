// src/types.ts

export type ARTarget = {
  tag: string;
  nft_base_url: string;
  image_2d_url?: string;
  model_3d_url: string;
  position?: string;
  rotation?: string;
  scale?: string;
};

export type ARCombo = {
  combo_id: string;
  required_tags: string[];
  image_2d_url?: string;
  model_3d_url: string;
  center_transform?: { position?: string; rotation?: string; scale?: string };
};

export type AppState = 'SCANNING' | 'LOADING_DATA' | 'AR_VIEW' | 'ERROR';

// ========== QUIZ TYPES ==========

export type QuestionType = 'multiple_choice' | 'true_false';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question_text: string;
  image_url?: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export interface QuizSessionData {
  flashcard_qr_id: string;
  questions: QuizQuestion[];
  time_limit?: number;
  passing_score?: number;
}

export interface QuizAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpent?: number;
}


// ========== GAME TYPES ==========

export type GameType = 'drag_match' | 'catch_word' | 'word_scramble' | 'memory_match';
export type GameDifficulty = 'easy' | 'medium' | 'hard';

export interface MemoryPair {
  id: string;
  type: 'image' | 'word';
  content: string;
}

export interface GameChallenge {
  game_type: GameType;
  flashcard_qr_id: string;
  difficulty: GameDifficulty;
  question: string;
  image_url?: string;
  
  // For drag_match and catch_word
  correct_answer?: string;
  choices?: string[];
  
  // For word_scramble
  scrambled_word?: string;
  
  // For memory_match
  pairs?: MemoryPair[];
  
  hint?: string;
  encouragement_wrong?: string;
  celebration_right?: string;
  time_limit?: number | null;
  stars_reward: number;
  game_config?: {
    fall_speed?: number;
    spawn_interval?: number;
    grid_size?: string;
    max_flips?: number;
    [key: string]: any;
  };
}

export interface GameSessionData {
  flashcard_qr_id: string;
  challenges: GameChallenge[];
  difficulty?: string;
  game_type?: string;
}

export interface GameAnswer {
  challengeIndex: number;
  userAnswer: string;
  isCorrect: boolean;
  starsEarned: number;
  timeSpent: number;
}