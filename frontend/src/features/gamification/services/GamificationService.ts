import { apiClient } from '@/services/apiClient';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon_url: string;
}

export interface UserStats {
    user_id: string;
    total_points: number;
    level: number;
    badges: string[]; // Badge IDs
    streak_days: number;
}

export interface LeaderboardEntry {
    user_id: string;
    username: string;
    avatar_url?: string;
    points: number;
    rank: number;
}

export type LeaderboardPeriod = 'all' | 'weekly' | 'daily';

export interface LeaderboardRank {
    user_id: string;
    rank: number | null;
    points: number;
    period: LeaderboardPeriod;
}

function unwrapPayload(payload: unknown): unknown {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data: unknown }).data;
    }
    return payload;
}

function normalizeEntry(value: unknown, index: number): LeaderboardEntry {
    const entry = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    const username = String(entry.username || entry.full_name || `Learner ${index + 1}`);

    return {
        user_id: String(entry.user_id || entry.id || entry._id || ''),
        username,
        avatar_url: typeof entry.avatar_url === 'string' ? entry.avatar_url : undefined,
        points: Number(entry.points ?? entry.total_points ?? 0),
        rank: Number(entry.rank ?? index + 1),
    };
}

export const GamificationService = {
    async getLeaderboard(period: LeaderboardPeriod = 'all'): Promise<LeaderboardEntry[]> {
        const response = unwrapPayload(await apiClient.getLeaderboard(period));
        const entries = Array.isArray(response)
            ? response
            : response && typeof response === 'object' && 'entries' in response
                ? (response as { entries: unknown }).entries
                : [];

        return Array.isArray(entries) ? entries.map(normalizeEntry) : [];
    },

    async getUserRank(userId: string, period: LeaderboardPeriod = 'all'): Promise<LeaderboardRank> {
        const response = unwrapPayload(await apiClient.getUserRank(userId, period));
        const rank = (response && typeof response === 'object' ? response : {}) as Partial<LeaderboardRank>;

        return {
            user_id: String(rank.user_id || userId),
            rank: rank.rank == null ? null : Number(rank.rank),
            points: Number(rank.points || 0),
            period: (rank.period as LeaderboardPeriod) || period,
        };
    },

    async getUserStats(userId: string): Promise<UserStats> {
        return apiClient.getUserStats(userId) as Promise<UserStats>;
    }
};
