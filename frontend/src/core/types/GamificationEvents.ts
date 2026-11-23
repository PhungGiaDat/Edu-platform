/**
 * GamificationEvents.ts
 * 
 * Type-safe event constants for gamification and pet systems.
 * Used with EventBus for pub/sub communication between hooks and components.
 */

// ========== Gamification Events ==========

export const GamificationEvent = {
    /** Emitted when user gains XP */
    XP_GAINED: 'XP_GAINED',
    /** Emitted when user levels up */
    LEVEL_UP: 'LEVEL_UP',
    /** Emitted when user earns a badge */
    BADGES_EARNED: 'BADGES_EARNED',
    /** Emitted when user collects a sticker */
    STICKER_COLLECTED: 'STICKER_COLLECTED',
    /** Emitted when user's streak updates */
    STREAK_UPDATED: 'STREAK_UPDATED',
    /** Emitted when pronunciation result is received */
    PRONUNCIATION_RESULT: 'PRONUNCIATION_RESULT',
    /** Emitted when an AR combo is activated */
    AR_COMBO_ACTIVATED: 'AR_COMBO_ACTIVATED',
} as const;

// ========== Pet Events ==========

export const PetEvent = {
    /** Emitted when a pet is unlocked */
    PET_UNLOCKED: 'PET_UNLOCKED',
    /** Emitted when a pet is set as active */
    PET_ACTIVATED: 'PET_ACTIVATED',
    /** Emitted when active pet is cleared */
    PET_DEACTIVATED: 'PET_DEACTIVATED',
    /** Emitted when pet list is refreshed */
    PET_LIST_UPDATED: 'PET_LIST_UPDATED',
    /** Emitted after XP gain to check if pets can be unlocked */
    PET_CAN_UNLOCK: 'PET_CAN_UNLOCK',
    /** Emitted to request setting a pet as active (from modal) */
    PET_SET_ACTIVE_REQUEST: 'PET_SET_ACTIVE_REQUEST',
} as const;

// ========== Payload Types ==========

export interface PetCanUnlockPayload {
    userXP: number;
    userStreak: number;
    level: number;
}

export interface PetUnlockedPayload {
    pet: {
        pet_id: string;
        name: string;
        rarity: string;
        model_url: string;
        [key: string]: unknown;
    };
}

export interface PetActivatedPayload {
    pet: {
        pet_id: string;
        name: string;
        model_url: string;
        [key: string]: unknown;
    } | null;
}

export interface PetSetActiveRequestPayload {
    petId: string;
}

export interface LevelUpPayload {
    level: number;
}

export interface BadgesEarnedPayload {
    badges: string[];
}
