/**
 * Model Interaction Policy — single-scene tap feedback
 *
 * Maps a tap on an AR model to:
 *  1. An animation clip that already exists INSIDE the model's GLB
 *     (animation names from ragdollcat_mobile.glb / master.glb)
 *  2. A sound effect (e.g. meow), if configured
 *
 * Available animations in GLB:
 *   CAT_IDLE, CAT_EAT, CAT_LOOK_UP, CAT_MEOW,
 *   CAT_PET_REACT, CAT_SIT, CAT_SPIN
 *
 * Audio files: stored in public/static/ar-assets/audio/animal/
 *   - cat_meow.mp3 (Orange Free Sounds, CC BY-NC 4.0)
 *   - elephant_trumpet.mp3 (Orange Free Sounds, royalty-free)
 *
 * Fail-closed: no policy → existing pronunciation behaviour preserved.
 */

interface FlashcardDataLike {
    arTag: string;
    category: string;
    word?: string;
}

export interface InteractionPolicy {
    /** Clip name that MUST exist in the model's GLB animations. */
    clipName: string;
    loop?: boolean;
    /** Sound effect URL — public/static/ar-assets/audio/animal/ */
    soundUrl?: string;
    cooldownMs?: number;
}

/**
 * Per-card policy table.
 * Animation clip names are from ragdollcat_mobile.glb QA export.
 * Audio files from Supabase storage: AR_models/assets/animal/
 */
const SUPABASE_AUDIO_BASE = 'https://rofprrtoeyirssfndxag.supabase.co/storage/v1/object/public/AR_models/assets/animal';

const POLICY_BY_ARTAG: Record<string, InteractionPolicy> = {
    // ── Animals ─────────────────────────────────────────────────────────
    // cat_marker_01: tap → meow animation + cat sound
    cat_marker_01: {
        clipName: 'CAT_MEOW',
        soundUrl: `${SUPABASE_AUDIO_BASE}/cat_meow.mp3`,
        cooldownMs: 2000, // animation is ~2s
    },
    // elephant_marker_01: tap → eat animation + trumpet sound
    elephant_marker_01: {
        clipName: 'CAT_EAT', // reuse eat animation for elephant
        soundUrl: `${SUPABASE_AUDIO_BASE}/elephant_trumpet.mp3`,
        cooldownMs: 5000,
    },
};

/** Category-level fallback for any unlisted card. */
const POLICY_BY_CATEGORY: Record<string, InteractionPolicy> = {
    animals: { clipName: 'CAT_IDLE', loop: false },
};

const DEFAULT_COOLDOWN_MS = 1200;
const cooldowns = new Map<number, number>();

export function applyInteractionFeedback(
    eventBus: { emit(event: string, payload: unknown): void },
    card: FlashcardDataLike | null | undefined,
    slotIndex: number,
): boolean {
    if (!card || !eventBus) return false;

    const policy =
        POLICY_BY_ARTAG[card.arTag] ?? POLICY_BY_CATEGORY[card.category];
    if (!policy) return false;

    const now = Date.now();
    const last = cooldowns.get(slotIndex) ?? 0;
    if (now - last < (policy.cooldownMs ?? DEFAULT_COOLDOWN_MS)) return true;
    cooldowns.set(slotIndex, now);

    // Trigger GLB skeletal animation via animation-mixer
    eventBus.emit('AR_COMMAND' as never, {
        type: 'TRIGGER_ANIMATION',
        payload: {
            clip: policy.clipName,
            loop: policy.loop ?? false,
        },
    } as never);

    // Play sound effect if configured
    if (policy.soundUrl) {
        eventBus.emit('AR_COMMAND' as never, {
            type: 'PLAY_AUDIO',
            payload: { url: policy.soundUrl, volume: 1.0 },
        } as never);
    }

    return true;
}

export function resetInteractionCooldowns() {
    cooldowns.clear();
}
