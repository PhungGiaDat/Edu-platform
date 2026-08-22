import axios from 'axios';
import { getApiBase } from '@/config';

const API_URL = getApiBase();

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

export const GamificationService = {
    async getLeaderboard(): Promise<LeaderboardEntry[]> {
        const response = await axios.get(`${API_URL}/gamification/leaderboard`);
        return response.data;
    },

    async getUserStats(userId: string): Promise<UserStats> {
        const response = await axios.get(`${API_URL}/gamification/user/${userId}`);
        return response.data;
    }
};
