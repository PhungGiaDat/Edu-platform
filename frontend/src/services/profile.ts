// src/services/profile.ts
// DIP boundary for profile data fetching.
// The hook depends on ProfileService (an interface), not on apiClient.
// Adding a new profile endpoint does not require hook changes — add a method
// to ProfileService and a new DTO here.

/** Wire-format DTO returned by the backend `getUserStats` endpoint. */
export interface UserStatsDTO {
    level?: number;
    total_points?: number;
    xp_to_next_level?: number;
    streak_days?: number;
    longest_streak?: number;
}

/** Wire-format DTO returned by the backend `getStreak` endpoint. */
export interface StreakDTO {
    current_streak?: number;
    longest_streak?: number;
    streak_active_today?: boolean;
    daily_goal_minutes?: number;
    minutes_today?: number;
}

/** Wire-format DTO returned by the backend `getEarnedBadges` endpoint. */
export interface EarnedBadgeEntryDTO {
    badge_id?: string;
    id?: string;
    _id?: string;
}

/** Wire-format DTO returned by the backend `getAllBadges` endpoint. */
export interface BadgeDTO {
    id?: string;
    _id?: string;
    badge_id?: string;
    name?: string;
    title?: string;
    description?: string;
    icon_url?: string;
}

/** Wire-format DTO returned by the backend `getLeaderboard` endpoint. */
export interface LeaderboardEntryDTO {
    user_id?: string;
    id?: string;
    _id?: string;
    username?: string;
    full_name?: string;
    points?: number;
    total_points?: number;
    rank?: number;
    avatar_url?: string;
}

/** Wire-format DTO returned by the backend `getProgressReport` endpoint. */
export interface DailyProgressDTO {
    date?: string;
    minutes?: number;
    words_learned?: number;
    lessons_completed?: number;
}

export interface ProgressReportDTO {
    summary?: Record<string, unknown>;
    learning?: {
        total_words?: number;
        total_time_mins?: number;
        avg_words_per_day?: number;
    };
    daily_breakdown?: DailyProgressDTO[];
    pet?: unknown;
}

/** Dependency-inversion boundary: the hook depends on this, never on apiClient. */
export interface ProfileService {
    getUserStats(userId: string): Promise<UserStatsDTO | null>;
    getStreak(userId: string): Promise<StreakDTO | null>;
    getLeaderboard(): Promise<LeaderboardEntryDTO[]>;
    getEarnedBadges(userId: string): Promise<EarnedBadgeEntryDTO[]>;
    getAllBadges(): Promise<BadgeDTO[]>;
    getProgressReport(userId: string, days: number): Promise<ProgressReportDTO | null>;
}

/**
 * Subset of apiClient the profile service needs. Keeps DIP narrow and testable.
 */
export interface ApiClientPort {
    getUserStats(userId: string): Promise<unknown>;
    getStreak(userId: string): Promise<unknown>;
    getLeaderboard(): Promise<unknown>;
    getEarnedBadges(userId: string): Promise<unknown>;
    getAllBadges(): Promise<unknown>;
    getProgressReport(userId: string, days: number): Promise<unknown>;
}

/** Adapter from the concrete `apiClient` to `ProfileService`. */
export const createProfileService = (apiClient: ApiClientPort): ProfileService => ({
    getUserStats: (userId) => fetchObject(() => apiClient.getUserStats(userId)),
    getStreak: (userId) => fetchObject(() => apiClient.getStreak(userId)),
    getLeaderboard: () => fetchArray(() => apiClient.getLeaderboard()),
    getEarnedBadges: (userId) => fetchArray(() => apiClient.getEarnedBadges(userId)),
    getAllBadges: () => fetchArray(() => apiClient.getAllBadges()),
    getProgressReport: (userId, days) => fetchObject(() => apiClient.getProgressReport(userId, days)),
});

const unwrap = (raw: unknown): unknown => {
    if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
        return (raw as { data: unknown }).data;
    }
    return raw;
};

async function fetchObject<T>(
    call: () => Promise<unknown>,
): Promise<T | null> {
    const raw = unwrap(await call());
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'object') return null;
    return raw as T;
}

async function fetchArray<T>(
    call: () => Promise<unknown>,
): Promise<T[]> {
    const raw = unwrap(await call());
    if (!Array.isArray(raw)) return [];
    return raw as T[];
}
