/**
 * useGamification.ts
 * 
 * React hook for gamification features:
 * - XP tracking
 * - Badge management  
 * - Streak tracking
 * - Level progression
 * - Virtual Pet
 * - Sticker Collection
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiBase } from '@/config';
import { eventBus } from '@/runtime/EventBus';

const API_BASE = getApiBase();

export interface Badge {
    id: string;
    name: string;
    emoji: string;
    description?: string;
    earned_at?: string;
}

export interface VirtualPet {
    type: 'bunny' | 'panda' | 'dog' | 'cat';
    happiness: number; // 0-100
    last_fed: string;
    outfit?: string;
}

export interface Sticker {
    id: string;
    name: string;
    imageUrl: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earned_at: string;
}

export interface UserProgress {
    user_id: string;
    total_xp: number;
    level: number;
    xp_to_next_level: number;
    stars: number;
    current_streak: number;
    longest_streak: number;
    badges: Badge[];
    badge_count: number;
    pet?: VirtualPet;
    stickers?: Sticker[];
}

export interface XPResult {
    success: boolean;
    xp_added: number;
    total_xp: number;
    level: number;
    level_up: boolean;
    streak: number;
    badges_earned: string[];
    sticker_earned?: string;
}

type XPAction =
    | 'flashcard_viewed'
    | 'flashcard_3d_interaction'
    | 'quiz_question_correct'
    | 'quiz_completed'
    | 'game_completed'
    | 'pronunciation_correct'
    | 'combo_discovered'
    | 'daily_login';

export function useGamification(userId: string | null) {
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentXP, setRecentXP] = useState<{ amount: number; action: string } | null>(null);
    const [levelUp, setLevelUp] = useState(false);
    const [newBadges, setNewBadges] = useState<string[]>([]);
    const [newSticker, setNewSticker] = useState<Sticker | null>(null);

    // Fetch user progress
    const fetchProgress = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/v1/gamification/user/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch progress');

            const data = await response.json();
            setProgress(data);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
            console.error('[useGamification] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Add XP for an action
    const addXP = useCallback(async (action: XPAction, metadata?: Record<string, any>): Promise<XPResult | null> => {
        if (!userId) return null;

        try {
            const response = await fetch(`${API_BASE}/api/v1/gamification/add-xp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, action, metadata })
            });

            if (!response.ok) throw new Error('Failed to add XP');

            const result: XPResult = await response.json();

            // Update local state
            setRecentXP({ amount: result.xp_added, action });

            if (result.level_up) {
                setLevelUp(true);
                eventBus.emit('LEVEL_UP' as any, { level: result.level });
                setTimeout(() => setLevelUp(false), 3000);
            }

            if (result.badges_earned.length > 0) {
                setNewBadges(result.badges_earned);
                eventBus.emit('BADGES_EARNED' as any, { badges: result.badges_earned });
                setTimeout(() => setNewBadges([]), 3000);
            }

            // Refresh progress
            await fetchProgress();

            return result;
        } catch (err) {
            console.error('[useGamification] Add XP error:', err);
            return null;
        }
    }, [userId, fetchProgress]);

    // Award a badge manually
    const awardBadge = useCallback(async (badgeId: string): Promise<boolean> => {
        if (!userId) return false;

        try {
            const response = await fetch(`${API_BASE}/api/v1/gamification/award-badge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, badge_id: badgeId })
            });

            if (!response.ok) throw new Error('Failed to award badge');

            const result = await response.json();

            if (result.awarded) {
                setNewBadges([badgeId]);
                eventBus.emit('BADGES_EARNED' as any, { badges: [badgeId] });
                await fetchProgress();
            }

            return result.awarded;
        } catch (err) {
            console.error('[useGamification] Award badge error:', err);
            return false;
        }
    }, [userId, fetchProgress]);

    // Get leaderboard
    const getLeaderboard = useCallback(async (limit: number = 10) => {
        try {
            const response = await fetch(`${API_BASE}/api/v1/gamification/leaderboard?limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch leaderboard');
            return await response.json();
        } catch (err) {
            console.error('[useGamification] Leaderboard error:', err);
            return { leaderboard: [] };
        }
    }, []);

    // Feed virtual pet
    const feedPet = useCallback(async (): Promise<{ success: boolean; happiness: number }> => {
        if (!userId) return { success: false, happiness: 0 };

        try {
            const response = await fetch(`${API_BASE}/api/v1/gamification/pet/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });

            if (!response.ok) throw new Error('Failed to feed pet');

            const result = await response.json();

            // Trigger happy animation in AR
            eventBus.emit('AR_COMMAND' as any, {
                type: 'TRIGGER_ANIMATION',
                payload: { clip: 'happy', loop: false }
            });

            await fetchProgress();
            return { success: true, happiness: result.happiness };
        } catch (err) {
            console.error('[useGamification] Feed pet error:', err);
            return { success: false, happiness: 0 };
        }
    }, [userId, fetchProgress]);

    // Collect sticker (earned from games/activities)
    const collectSticker = useCallback(async (stickerId: string): Promise<boolean> => {
        if (!userId) return false;

        try {
            const response = await fetch(`${API_BASE}/api/v1/gamification/stickers/collect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, sticker_id: stickerId })
            });

            if (!response.ok) throw new Error('Failed to collect sticker');

            const result = await response.json();

            if (result.collected) {
                setNewSticker(result.sticker);
                eventBus.emit('STICKER_COLLECTED' as any, { sticker: result.sticker });
                setTimeout(() => setNewSticker(null), 3000);
                await fetchProgress();
            }

            return result.collected;
        } catch (err) {
            console.error('[useGamification] Collect sticker error:', err);
            return false;
        }
    }, [userId, fetchProgress]);

    // Calculate XP percentage to next level
    const xpPercentage = progress
        ? Math.round((progress.total_xp / progress.xp_to_next_level) * 100)
        : 0;

    // Convenience methods for common actions (memoized to prevent stale closures)
    const trackFlashcardView = useCallback(() => addXP('flashcard_viewed'), [addXP]);
    const trackQuizComplete = useCallback(() => addXP('quiz_completed'), [addXP]);
    const trackGameComplete = useCallback(() => addXP('game_completed'), [addXP]);
    const trackPronunciationCorrect = useCallback(() => addXP('pronunciation_correct'), [addXP]);
    const trackComboDiscovered = useCallback(() => addXP('combo_discovered'), [addXP]);

    // Auto-fetch on mount
    useEffect(() => {
        if (userId) {
            fetchProgress();
        }
    }, [userId, fetchProgress]);

    // Listen for EventBus events - include memoized handlers in deps to prevent stale closures
    useEffect(() => {
        const handlePronunciationResult = (data: any) => {
            if (data.isCorrect) {
                trackPronunciationCorrect();
            }
        };

        const handleComboActivated = () => {
            trackComboDiscovered();
        };

        eventBus.on('PRONUNCIATION_RESULT', handlePronunciationResult);
        eventBus.on('AR_COMBO_ACTIVATED', handleComboActivated);

        return () => {
            eventBus.off('PRONUNCIATION_RESULT', handlePronunciationResult);
            eventBus.off('AR_COMBO_ACTIVATED', handleComboActivated);
        };
    }, [trackPronunciationCorrect, trackComboDiscovered]);

    return {
        // State
        progress,
        isLoading,
        error,
        recentXP,
        levelUp,
        newBadges,
        newSticker,
        xpPercentage,

        // Pet & Stickers
        pet: progress?.pet,
        stickers: progress?.stickers || [],

        // Actions
        addXP,
        awardBadge,
        fetchProgress,
        getLeaderboard,
        feedPet,
        collectSticker,

        // Convenience
        trackFlashcardView,
        trackQuizComplete,
        trackGameComplete,
        trackPronunciationCorrect,
        trackComboDiscovered
    };
}

export default useGamification;

