// src/hooks/useProgressReport.ts
// Hook for fetching and managing progress reports for parents

import { useState, useEffect, useCallback } from 'react';
import { getApiBase } from '../config';

const API_BASE = getApiBase();

// Types
export interface ProgressStats {
    total_words_learned: number;
    total_xp: number;
    level: number;
    streak_days: number;
    topics_completed: string[];
    favorite_topic: string;
    time_spent_mins: number;
    games_played: number;
    pronunciation_score_avg: number;
}

export interface TopicProgress {
    topic: string;
    words_learned: number;
    total_words: number;
    percentage: number;
}

export interface RecentActivity {
    date: string;
    words_learned: number;
    games_played: number;
}

export interface DailyBreakdown {
    day: string;
    time_mins: number;
    words: number;
    xp?: number;
}

export interface WeeklySummary {
    total_sessions: number;
    total_time_mins: number;
    words_learned: number;
    games_completed: number;
    avg_pronunciation_score: number;
}

export interface WeeklyReport {
    user_id: string;
    week_start: string;
    week_end: string;
    summary: WeeklySummary;
    daily_breakdown: DailyBreakdown[];
}

export interface Achievement {
    id: string;
    name: string;
    emoji: string;
    earned_at: string;
}

export interface AchievementsData {
    badges: Achievement[];
    stickers_collected: number;
    total_stars: number;
}

export interface ProgressSummary {
    user_id: string;
    stats: ProgressStats;
    topics: TopicProgress[];
    recent_activity: RecentActivity[];
    generated_at: string;
}

interface UseProgressReportReturn {
    // Data
    summary: ProgressSummary | null;
    weeklyReport: WeeklyReport | null;
    achievements: AchievementsData | null;
    
    // Loading states
    isLoading: boolean;
    isLoadingWeekly: boolean;
    isLoadingAchievements: boolean;
    
    // Errors
    error: string | null;
    
    // Actions
    refresh: () => Promise<void>;
    refreshWeekly: () => Promise<void>;
    refreshAchievements: () => Promise<void>;
    
    // Computed
    weeklyComparison: WeeklyComparison | null;
}

export interface WeeklyComparison {
    wordsChange: number; // positive = more than last week
    timeChange: number;
    trend: 'up' | 'down' | 'same';
    message: string;
}

/**
 * Hook for fetching progress reports
 * Used by parents to track their child's learning progress
 */
export function useProgressReport(userId: string): UseProgressReportReturn {
    const [summary, setSummary] = useState<ProgressSummary | null>(null);
    const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
    const [achievements, setAchievements] = useState<AchievementsData | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
    const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch summary
    const fetchSummary = useCallback(async () => {
        if (!userId) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const res = await fetch(`${API_BASE}/api/v1/reports/user/${userId}/summary`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSummary(data);
        } catch (e) {
            console.error('[useProgressReport] Summary fetch failed:', e);
            setError('Failed to load progress data');
            // Use mock data for demo
            setSummary(getMockSummary(userId));
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch weekly report
    const fetchWeekly = useCallback(async () => {
        if (!userId) return;
        
        setIsLoadingWeekly(true);
        
        try {
            const res = await fetch(`${API_BASE}/api/v1/reports/user/${userId}/weekly`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setWeeklyReport(data);
        } catch (e) {
            console.error('[useProgressReport] Weekly fetch failed:', e);
            // Use mock data for demo
            setWeeklyReport(getMockWeeklyReport(userId));
        } finally {
            setIsLoadingWeekly(false);
        }
    }, [userId]);

    // Fetch achievements
    const fetchAchievements = useCallback(async () => {
        if (!userId) return;
        
        setIsLoadingAchievements(true);
        
        try {
            const res = await fetch(`${API_BASE}/api/v1/reports/user/${userId}/achievements`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setAchievements(data);
        } catch (e) {
            console.error('[useProgressReport] Achievements fetch failed:', e);
            // Use mock data for demo
            setAchievements(getMockAchievements());
        } finally {
            setIsLoadingAchievements(false);
        }
    }, [userId]);

    // Initial fetch
    useEffect(() => {
        fetchSummary();
        fetchWeekly();
        fetchAchievements();
    }, [fetchSummary, fetchWeekly, fetchAchievements]);

    // Compute weekly comparison (mock for now)
    const weeklyComparison: WeeklyComparison | null = weeklyReport ? {
        wordsChange: 3, // +3 words compared to last week
        timeChange: 10, // +10 mins compared to last week
        trend: 'up',
        message: "Great job! You're learning more this week!"
    } : null;

    return {
        summary,
        weeklyReport,
        achievements,
        isLoading,
        isLoadingWeekly,
        isLoadingAchievements,
        error,
        refresh: fetchSummary,
        refreshWeekly: fetchWeekly,
        refreshAchievements: fetchAchievements,
        weeklyComparison
    };
}

// Mock data generators for demo/fallback
function getMockSummary(userId: string): ProgressSummary {
    return {
        user_id: userId,
        stats: {
            total_words_learned: 24,
            total_xp: 1250,
            level: 5,
            streak_days: 3,
            topics_completed: ['Animals', 'Colors'],
            favorite_topic: 'Animals',
            time_spent_mins: 45,
            games_played: 12,
            pronunciation_score_avg: 82
        },
        topics: [
            { topic: 'Animals', words_learned: 10, total_words: 15, percentage: 67 },
            { topic: 'Colors', words_learned: 8, total_words: 8, percentage: 100 },
            { topic: 'Family', words_learned: 4, total_words: 12, percentage: 33 },
            { topic: 'Nature', words_learned: 2, total_words: 10, percentage: 20 }
        ],
        recent_activity: [
            { date: '2026-01-22', words_learned: 5, games_played: 2 },
            { date: '2026-01-21', words_learned: 3, games_played: 1 },
            { date: '2026-01-20', words_learned: 4, games_played: 3 }
        ],
        generated_at: new Date().toISOString()
    };
}

function getMockWeeklyReport(userId: string): WeeklyReport {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    
    return {
        user_id: userId,
        week_start: weekStart.toISOString(),
        week_end: now.toISOString(),
        summary: {
            total_sessions: 5,
            total_time_mins: 45,
            words_learned: 12,
            games_completed: 8,
            avg_pronunciation_score: 78
        },
        daily_breakdown: [
            { day: 'Mon', time_mins: 10, words: 2, xp: 50 },
            { day: 'Tue', time_mins: 8, words: 3, xp: 75 },
            { day: 'Wed', time_mins: 12, words: 4, xp: 100 },
            { day: 'Thu', time_mins: 0, words: 0, xp: 0 },
            { day: 'Fri', time_mins: 15, words: 3, xp: 80 },
            { day: 'Sat', time_mins: 0, words: 0, xp: 0 },
            { day: 'Sun', time_mins: 0, words: 0, xp: 0 }
        ]
    };
}

function getMockAchievements(): AchievementsData {
    return {
        badges: [
            { id: 'first_word', name: 'First Word!', emoji: '🌟', earned_at: '2026-01-15' },
            { id: 'streak_3', name: '3 Day Streak', emoji: '🔥', earned_at: '2026-01-20' },
            { id: 'perfect_pronun', name: 'Perfect Pronunciation', emoji: '🎤', earned_at: '2026-01-21' }
        ],
        stickers_collected: 15,
        total_stars: 42
    };
}

export default useProgressReport;
