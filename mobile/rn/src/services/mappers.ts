/**
 * mappers.ts — snake_case ↔ camelCase boundary helpers.
 *
 * The backend serves snake_case; RN components prefer camelCase props.
 * Phase 0 keeps the raw snake_case keys intact (they are part of the
 * `Pet` / `PetCareState` types) but the mappers add camelCase aliases
 * for the most commonly consumed fields. Components may read either.
 *
 * Pure functions only — no I/O, no axios. Unit-testable.
 */

import type { Pet } from '../types/pet';
import type { PetCareState, PetCareStateRaw } from '../types/petCare';

/**
 * mapPetResponse — normalises a single Pet.
 * Backend already returns snake_case, so this is a no-op pass-through that
 * documents the boundary and is the seam for future renames.
 */
export function mapPetResponse<T extends Pet>(pet: T): T {
  return {
    ...pet,
    modelUrl: pet.model_url,
    textureUrl: pet.texture_url ?? null,
    thumbnailUrl: pet.thumbnail_url ?? null,
    isUnlocked: pet.is_unlocked,
    isActive: pet.is_active,
    canUnlock: pet.can_unlock,
  };
}

/**
 * mapPetCareState — converts the raw `gamification/pet/{user_id}` payload
 * into the canonical camelCase view. Falls back to safe defaults when the
 * backend omits optional fields (e.g. fresh user with no pet document).
 */
export function mapPetCareState(raw: unknown): PetCareState {
  const r = (raw ?? {}) as PetCareStateRaw;
  return {
    userId: r.user_id ?? null,
    petId: r.pet_id ?? null,
    happiness: r.happiness ?? 50,
    hunger: r.hunger ?? 45,
    energy: r.energy ?? 70,
    xpEarned: r.xp_earned ?? 0,
    stage: (r.stage as PetCareState['stage']) ?? 'baby',
    lastCareAt: r.last_care_at ?? null,
    lastMoodUpdate: r.last_mood_update ?? null,
    mood: r.mood ?? 'idle',
    needsAttention: r.needs_attention ?? false,
    animationClip: r.animation_clip ?? 'idle',
    lastAction: r.last_action ?? null,
    petType: r.pet_type ?? 'bunny',
    outfit: r.outfit ?? 'none',
  };
}