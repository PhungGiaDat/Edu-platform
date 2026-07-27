/**
 * Pet types — backend response shape (snake_case).
 *
 * Phase 0 (Migration Note A): backend uses `pet_id`. Previously the RN
 * surface used `id` (a latent bug masked by mock data). Every consumer must
 * read `pet.pet_id` from here on.
 *
 * Gamification pet care state (happiness/energy/hunger/mood) lives separately
 * in `types/petCare.ts` to mirror the split between the catalog endpoint
 * (`/pets`) and the care-state endpoint (`/gamification/pet/{user_id}`).
 */

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PetCategory = 'character' | 'animal' | 'robot' | string;

export interface UnlockCondition {
  type: 'free' | 'xp' | 'streak' | 'achievement' | 'purchase';
  value: number;
}

export interface Pet {
  pet_id: string;
  name: string;
  name_vi: string;
  model_url: string;
  texture_url?: string | null;
  thumbnail_url?: string | null;
  category: PetCategory;
  pack_source: string;
  rarity: PetRarity;
  color: string;
  animations: string[];
  unlock_condition: UnlockCondition;
  is_unlocked: boolean;
  is_active: boolean;
  can_unlock: boolean;
}

export interface PetStats {
  total: number;
  unlocked: number;
  common: number;
  rare: number;
  epic: number;
  legendary: number;
}

export interface PetListResponse {
  pets: Pet[];
  stats: PetStats;
}

export interface UnlockPetResponse {
  success: boolean;
  message: string;
  pet?: Pet | null;
}

export interface SetActivePetRequest {
  pet_id: string;
}

export interface ListPetsParams {
  category?: PetCategory;
  rarity?: PetRarity;
}

export interface ClearActivePetResponse {
  success: boolean;
  message: string;
}

export type PetOutfit =
  | 'none'
  | 'crown'
  | 'wizard_hat'
  | 'superhero_cape'
  | 'party_hat'
  | 'glasses'
  | 'bowtie';

export interface ChangePetOutfitRequest {
  outfit: PetOutfit;
}

export interface ChangePetOutfitResponse {
  success: boolean;
  outfit: PetOutfit;
}