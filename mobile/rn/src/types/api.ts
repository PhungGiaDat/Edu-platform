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
}