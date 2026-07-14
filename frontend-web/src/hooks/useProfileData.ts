// src/hooks/useProfileData.ts
// Aggregates six profile endpoints behind a single parallel fetch with one
// retry (Render cold-start tolerance), session-only cache keyed by userId,
// and a typed Result return so consumers never see `unknown` or `any`.
//
// See: plan/20260709_PROFILE_REAL_DATA_PLAN.md

import { useEffect, useState } from 'react';
import {
    type ProfileService,
    type BadgeDTO,
    type EarnedBadgeEntryDTO,
    type LeaderboardEntryDTO,
    type DailyProgressDTO,
} from '../services/profile';

export type {
    UserStatsDTO,
    StreakDTO,
    BadgeDTO,
    EarnedBadgeEntryDTO,
    LeaderboardEntryDTO,
    DailyProgressDTO,
    ProgressReportDTO,
} from '../services/profile';

/** Page-facing narrow types (ISP — only what the page reads). */
export interface BadgeView {
    id: string;
    name: string;
    description: string;
    iconUrl?: string;
}

export interface LeaderboardRowView {
    userId: string;
    username: string;
    points: number;
    rank: number;
    avatarUrl: string;
}

export interface MilestoneView {
    label: string;
    current: number;
    target: number;
    icon: string;
    color: string;
}

export interface ProfileSummaryView {
    level: number;
    totalPoints: number;
    xpToNextLevel: number;
    streakDays: number;
    longestStreak: number;
    wordsLearned: number;
    lessonsCompleted: number;
    avatarUrl: string;
}

export interface ProfileDataView {
    badges: BadgeView[];
    earnedBadgeIds: string[];
    leaderboard: LeaderboardRowView[];
    milestones: MilestoneView[];
    summary: ProfileSummaryView;
}

export type ProfileDataResult =
    | { kind: 'ok'; data: ProfileDataView }
    | { kind: 'warming' }
    | { kind: 'error'; code: ProfileErrorCode; message: string };

export type ProfileErrorCode =
    | 'no-user'
    | 'unavailable';

export interface UseProfileDataResult {
    result: ProfileDataResult;
}

const MILESTONE_TARGETS = {
    lessons: 50,
    words: 200,
    quizzes: 25,
    streak: 30,
} as const;

const FALLBACK_MILESTONE_ICON = '🏆';
const QUIZZES_HAVE_NO_DATA_SOURCE = true;

const ERR_NO_USER: ProfileErrorCode = 'no-user';
const ERR_UNAVAILABLE: ProfileErrorCode = 'unavailable';

const SUCCESS_EMPTY_DEFAULT: ProfileDataView = {
    badges: [],
    earnedBadgeIds: [],
    leaderboard: [],
    milestones: milestoneViews(0, 0, 0),
    summary: emptySummary(),
};

/** Per-userId, session-only cache. Cleared on tab close (memory-only). */
const sessionCache: Map<string, ProfileDataView> = new Map();

const RETRY_BACKOFF_MS = 2000;
const AVATAR_BACKGROUND_COLOR = 'b6e3f4';
const DICEBEAR_BASE_URL = 'https://api.dicebear.com/7.x/avataaars/svg';
const XP_FALLBACK = 1500;

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (err: unknown): boolean => {
    if (!err) return false;
    const msg =
        typeof err === 'string'
            ? err
            : (err as { message?: string }).message ?? '';
    const lowered = msg.toLowerCase();
    return (
        lowered.includes('network') ||
        lowered.includes('failed to fetch') ||
        lowered.includes('networkerror') ||
        lowered.includes('econnrefused') ||
        lowered.includes('timeout')
    );
};

export const useProfileData = (
    userId: string | undefined,
    service: ProfileService,
): UseProfileDataResult => {
    const cached = userId ? sessionCache.get(userId) : undefined;
    const [state, setState] = useState<ProfileDataResult>(
        cached ? { kind: 'ok', data: cached } : { kind: 'warming' },
    );

    useEffect(() => {
        if (!userId) {
            setState({ kind: 'error', code: ERR_NO_USER, message: 'Not signed in.' });
            return;
        }

        const cachedForUser = sessionCache.get(userId);
        if (cachedForUser) {
            setState({ kind: 'ok', data: cachedForUser });
            return;
        }

        let cancelled = false;
        setState({ kind: 'warming' });

        fetchWithRetry(service, userId)
            .then((view) => {
                if (cancelled) return;
                sessionCache.set(userId, view);
                setState({ kind: 'ok', data: view });
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Profile data unavailable';
                setState({ kind: 'error', code: ERR_UNAVAILABLE, message });
            });

        return () => {
            cancelled = true;
        };
    }, [userId, service]);

    return { result: state };
};

async function fetchWithRetry(
    service: ProfileService,
    userId: string,
): Promise<ProfileDataView> {
    try {
        return await fetchOnce(service, userId);
    } catch (err) {
        if (!isNetworkError(err)) throw err;
        await sleep(RETRY_BACKOFF_MS);
        return await fetchOnce(service, userId);
    }
}

async function fetchOnce(
    service: ProfileService,
    userId: string,
): Promise<ProfileDataView> {
    const [stats, streak, leaderboardRaw, earnedRaw, allBadgesRaw, progress] =
        await Promise.all([
            service.getUserStats(userId),
            service.getStreak(userId),
            service.getLeaderboard(),
            service.getEarnedBadges(userId),
            service.getAllBadges(),
            service.getProgressReport(userId, 7),
        ]);

    const lessonsCompleted = sumLessons(progress?.daily_breakdown);
    const wordsLearned = progress?.learning?.total_words ?? 0;

    const summary: ProfileSummaryView = {
        level: stats?.level ?? 1,
        totalPoints: stats?.total_points ?? 0,
        xpToNextLevel: stats?.xp_to_next_level ?? XP_FALLBACK,
        streakDays: streak?.current_streak ?? stats?.streak_days ?? 0,
        longestStreak: stats?.longest_streak ?? streak?.longest_streak ?? 0,
        wordsLearned,
        lessonsCompleted,
        avatarUrl: avatarUrlFor(userId),
    };

    const badges = badgesFromDTOs(allBadgesRaw);
    const earnedBadgeIds = earnedBadgeIdsFromDTOs(earnedRaw);
    const leaderboard = leaderboardViewsFromDTOs(leaderboardRaw);
    const milestones = milestoneViews(
        lessonsCompleted,
        wordsLearned,
        summary.streakDays,
    );

    return {
        badges,
        earnedBadgeIds,
        leaderboard,
        milestones,
        summary,
    };
}

// ---- pure transformers (testable, no React) ----

function milestoneViews(
    lessonsCompleted: number,
    wordsLearned: number,
    streakDays: number,
): MilestoneView[] {
    return [
        {
            label: 'Lessons Done',
            target: MILESTONE_TARGETS.lessons,
            icon: '📖',
            color: '#FF6B6B',
            current: lessonsCompleted,
        },
        {
            label: 'Words Learned',
            target: MILESTONE_TARGETS.words,
            icon: '💬',
            color: '#4ECDC4',
            current: wordsLearned,
        },
        {
            label: 'Quizzes Passed',
            target: MILESTONE_TARGETS.quizzes,
            icon: '✅',
            color: '#45B7D1',
            current: QUIZZES_HAVE_NO_DATA_SOURCE ? 0 : 0,
        },
        {
            label: 'Days Streak',
            target: MILESTONE_TARGETS.streak,
            icon: '🔥',
            color: '#F7DC6F',
            current: streakDays,
        },
    ];
}

function emptySummary(): ProfileSummaryView {
    return {
        level: 1,
        totalPoints: 0,
        xpToNextLevel: XP_FALLBACK,
        streakDays: 0,
        longestStreak: 0,
        wordsLearned: 0,
        lessonsCompleted: 0,
        avatarUrl: '',
    };
}

function avatarUrlFor(seed: string): string {
    return `${DICEBEAR_BASE_URL}?seed=${encodeURIComponent(
        seed,
    )}&backgroundColor=${AVATAR_BACKGROUND_COLOR}`;
}

function fallbackAvatarUrl(seed: string): string {
    return `${DICEBEAR_BASE_URL}?seed=${encodeURIComponent(seed)}`;
}

function sumLessons(daily: DailyProgressDTO[] | undefined): number {
    if (!daily) return 0;
    return daily.reduce((acc, day) => acc + (day?.lessons_completed ?? 0), 0);
}

function pickString(...candidates: unknown[]): string {
    for (const c of candidates) {
        if (typeof c === 'string' && c.length > 0) return c;
    }
    return '';
}

function pickNumber(...candidates: unknown[]): number {
    for (const c of candidates) {
        if (typeof c === 'number' && Number.isFinite(c)) return c;
    }
    return 0;
}

function badgesFromDTOs(raw: BadgeDTO[]): BadgeView[] {
    return raw
        .map((dto) => {
            const id = pickString(dto.id, dto._id, dto.badge_id);
            if (!id) return null;
            const view: BadgeView = {
                id,
                name: pickString(dto.name, dto.title, 'Badge') || 'Badge',
                description: pickString(dto.description),
                iconUrl: pickString(dto.icon_url) || undefined,
            };
            return view;
        })
        .filter((b): b is BadgeView => b !== null);
}

function earnedBadgeIdsFromDTOs(raw: EarnedBadgeEntryDTO[]): string[] {
    return raw
        .map((dto) => pickString(dto.badge_id, dto.id, dto._id))
        .filter((id) => id.length > 0);
}

function leaderboardViewsFromDTOs(
    raw: LeaderboardEntryDTO[],
): LeaderboardRowView[] {
    return raw.map((row, idx) => {
        const userId = pickString(row.user_id, row.id, row._id, String(idx));
        const username = pickString(row.username, row.full_name, `Learner ${idx + 1}`);
        const avatar = pickString(row.avatar_url);
        return {
            userId,
            username,
            points: pickNumber(row.points, row.total_points),
            rank: pickNumber(row.rank, idx + 1) || idx + 1,
            avatarUrl: avatar.length > 0 ? avatar : fallbackAvatarUrl(userId),
        };
    });
}

// Re-export fallback icon for consumers that need it during warming state.
export const PROFILE_MILESTONE_FALLBACK_ICON = FALLBACK_MILESTONE_ICON;

// Re-export for parity with original test exports.
export const __profileDataTestCache = sessionCache;
export const __profileDataSuccessEmpty = SUCCESS_EMPTY_DEFAULT;
