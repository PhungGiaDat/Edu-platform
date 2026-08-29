/**
 * Notebook (Sổ tay) TypeScript types
 */

export type EntrySource = 'ai_translation' | 'flashcard' | 'manual' | 'word_lookup';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface NotebookEntry {
  id: string;
  user_id: string;
  word: string;
  translation_vi: string;
  translation_en?: string;
  context?: string;
  source: EntrySource;
  topic?: string;
  difficulty?: Difficulty;
  pronunciation?: string;
  part_of_speech?: string;
  definition_en?: string;
  wiki_summary?: string;
  created_at: string;
  last_reviewed_at?: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
  next_review_at?: string;
}

export interface CreateEntryRequest {
  word: string;
  translation_vi: string;
  translation_en?: string;
  context?: string;
  source: EntrySource;
  topic?: string;
  difficulty?: Difficulty;
  pronunciation?: string;
  part_of_speech?: string;
  definition_en?: string;
  wiki_summary?: string;
}

export interface UpdateEntryRequest {
  word?: string;
  translation_vi?: string;
  translation_en?: string;
  context?: string;
  topic?: string;
  difficulty?: Difficulty;
  pronunciation?: string;
  part_of_speech?: string;
  definition_en?: string;
  wiki_summary?: string;
}

export interface ReviewSubmit {
  entry_id: string;
  quality: number; // 0-5
}

export interface ReviewResult {
  entry_id: string;
  quality: number;
  new_ease_factor: number;
  new_interval_days: number;
  next_review_at: string;
  review_count: number;
}

// Translation types
export interface TranslateRequest {
  text: string;
  context?: string;
  target_lang?: string;
}

export interface WordBreakdown {
  word: string;
  pronunciation?: string;
  part_of_speech?: string;
  translation: string;
}

export interface RelatedWord {
  word: string;
  translation: string;
  relevance_score?: number;
}

export interface TranslateResponse {
  original: string;
  translation: {
    vi: string;
    literalTranslation?: string;
    contextualNote?: string;
  };
  word_breakdown?: WordBreakdown[];
  related_words?: RelatedWord[];
  sources?: string[];
}

// Vocabulary Topics
export interface VocabularyTopic {
  id: string;
  slug: string;
  name: string;
  name_vi: string;
  description?: string;
  icon?: string;
  color?: string;
  is_ielts: boolean;
  ielts_band?: string;
  sort_order: number;
  is_active: boolean;
}

export interface VocabularyTopicList {
  items: VocabularyTopic[];
  total: number;
}
