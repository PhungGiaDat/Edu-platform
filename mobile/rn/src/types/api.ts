/**
 * types/api.ts — public surface of the typed backend contract.
 *
 * Re-exports the canonical types so the rest of the tree imports from
 * `'../types/api'`. Adding a new type means adding the re-export below;
 * no other file imports the sub-modules directly.
 *
 * Phase 0 (Task 0.1) — Migrated to snake_case per backend + added lesson
 * session types, pet types, and gamification stat shapes.
 */

export type {
  Course,
  CourseDetail,
  Lesson,
  LessonVocabularyItem,
  LessonVideoLesson,
  LessonQuizQuestion,
  LessonReadAloudStory,
  LessonPronunciationTask,
  LessonARReference,
  LessonReward,
  LessonProgress,
  LessonSession,
  LessonSessionStepState,
  LessonStepStatus,
  LessonStatus,
  LessonStepAttemptPayload,
  LessonStepAttemptResponse,
  MediaAssetRecord,
  UserProgress,
  QuizSubmitResult,
  CompleteLessonStats,
} from './course';

export type {
  Pet,
  PetRarity,
  PetCategory,
  PetStats,
  PetListResponse,
  PetOutfit,
  UnlockCondition,
  UnlockPetResponse,
  SetActivePetRequest,
  ChangePetOutfitRequest,
  ChangePetOutfitResponse,
  ClearActivePetResponse,
  ListPetsParams,
} from './pet';

export type {
  PetCareState,
  PetCareStateRaw,
  PetCareActionResult,
  PetXPResponse,
  PetXPProgress,
} from './petCare';

export type {
  GamificationProfile,
  Badge,
  AwardXpRequest,
  AwardXpResponse,
  UserStats,
  StreakData,
  AddXpRequest,
  AddXpResponse,
} from './gamification';

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  role: string;
  roles: string[];
  created_at: string;
}

export interface UserMe {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  role?: string;
  avatar_url?: string | null;
  unlocked_pets?: string[];
  active_pet?: string | null;
}

/** Multi-marker combo DTO — mirrors backend ArCombinationSchema. */
export interface ArCombinationSchema {
  combo_id: string;
  description: string;
  required_tags: string[];
  target_order?: string[] | null;
  model_3d_url: string;
  texture_url?: string | null;
  image_2d_url: string;
  combo_mind_url?: string | null;
  bonus_xp: number;
  center_transform?: {
    position?: string | null;
    rotation?: string | null;
    scale?: string | null;
  } | null;
  semantic_result?: string | null;
  animation?: string | null;
  sound?: string | null;
  phrase?: string | null;
  priority: number;
  active: boolean;
  flashcard_set?: string | null;
  cross_category_allowed: boolean;
}

/**
 * Lexi Agentic RAG — Chat Types
 * Mirrors backend RAGChatRequest / RAGChatResponse and /chat/models
 */

// ── Model catalog ──────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  role: 'planner' | 'generator' | 'validator';
  description: string;
}

export interface ChatModelsResponse {
  models: ModelInfo[];
  defaults: Record<string, string>;
}

// ── RAG Chat ───────────────────────────────────────────────────────────────────

export interface RAGSource {
  word: string;
  score: number;
}

export interface RAGChatRequest {
  question: string;
  session_id?: string;
  user_id?: string;
  planner_model?: string;
  generator_model?: string;
  validator_model?: string;
}

export interface RAGChatResponse {
  response: string;
  sources: RAGSource[];
  session_id: string;
  agent_trace: string[];
}

// ── UI message shape ─────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: RAGSource[];
  agentTrace?: string[];
  timestamp: Date;
}


/**
 * Canonical flat learner/Unity DTO, with optional nested fields accepted for
 * the ARExperienceResponseSchema transport used by the newer AR endpoint.
 */
export interface ARExperienceResponse {
  qr_id: string;
  word: string;
  translation_vi: string;
  audio_url: string;
  model_url: string;
  animation_type: 'rotate' | 'bounce' | 'idle';
  glb_size: number;
  position: string;
  rotation: string;
  scale: string;
  reference_image_url?: string | null;
  physical_width_m?: number | null;
  related_combos: readonly ArCombinationSchema[];
  flashcard?: {
    qr_id: string;
    word: string;
    audio_url?: string | null;
    translation: Record<string, string>;
    ar_tag?: string;
  };
  target?: {
    ar_tag: string;
    model_3d_url: string;
    animation_type?: string | null;
    glb_size: number;
    position?: string | null;
    rotation?: string | null;
    scale?: string | null;
  };
}
