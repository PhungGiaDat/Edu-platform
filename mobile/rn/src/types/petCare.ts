/**
 * Pet care state types — backend response shape (snake_case).
 *
 * Returned by `/gamification/pet/{user_id}` (`petsApi.getPetCareState()`) and
 * embedded in the gamification user-stats payload. RN converts to camelCase
 * via `mapPetCareState()` in `services/mappers.ts`; the snake_case keys are
 * kept accessible as `PetCareStateRaw` for advanced consumers.
 *
 * RN components should read the camelCase view (`PetCareState`).
 */

export interface PetCareStateRaw {
  user_id?: string;
  pet_id?: string;
  happiness: number;
  hunger: number;
  energy: number;
  xp_earned?: number;
  stage?: 'baby' | 'child' | 'teen' | 'adult';
  last_care_at?: string | null;
  last_mood_update?: string | null;
  mood: 'idle' | 'happy' | 'hungry' | 'sad' | 'sleeping' | string;
  needs_attention: boolean;
  animation_clip?: string;
  last_action?: 'feed' | 'play' | 'outfit' | null;
  pet_type?: string;
  outfit?: string;
}

export interface PetCareState {
  userId: string | null;
  petId: string | null;
  happiness: number;
  hunger: number;
  energy: number;
  xpEarned: number;
  stage: 'baby' | 'child' | 'teen' | 'adult';
  lastCareAt: string | null;
  lastMoodUpdate: string | null;
  mood: PetCareStateRaw['mood'];
  needsAttention: boolean;
  animationClip: string;
  lastAction: PetCareStateRaw['last_action'];
  petType: string;
  outfit: string;
}

export interface PetCareActionResult {
  success: boolean;
  happiness: number;
  hunger: number;
  energy: number;
  mood: string;
  last_action: 'feed' | 'play' | 'outfit';
  animation_clip: string;
  pet_type?: string;
  xp_earned?: number;
  stage?: 'baby' | 'child' | 'teen' | 'adult';
}

export interface PetXPProgress {
  current_stage: 'baby' | 'child' | 'teen' | 'adult';
  current_xp: number;
  progress_percentage: number;
  xp_to_next_stage: number | null;
  next_stage: 'baby' | 'child' | 'teen' | 'adult' | null;
  next_stage_threshold: number | null;
}

export interface PetXPResponse {
  xp: number;
  stage: 'baby' | 'child' | 'teen' | 'adult';
  progress: PetXPProgress;
}