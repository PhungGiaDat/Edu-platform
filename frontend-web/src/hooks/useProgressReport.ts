// src/hooks/useProgressReport.ts
// Hook for fetching and managing progress reports for parents

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';

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
        if (!userId) {
            setSummary(null);
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const data = await apiClient.get(`/api/v1/reports/user/${userId}/summary`);
            setSummary(data);
        } catch (e) {
            console.error('[useProgressReport] Summary fetch failed:', e);
            setError('Failed to load progress data');
            setSummary(null);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Fetch weekly report
    const fetchWeekly = useCallback(async () => {
        if (!userId) {
            setWeeklyReport(null);
            setIsLoadingWeekly(false);
            return;
        }
        
        setIsLoadingWeekly(true);
        
        try {
            const data = await apiClient.get(`/api/v1/reports/user/${userId}/weekly`);
            setWeeklyReport(data);
        } catch (e) {
            console.error('[useProgressReport] Weekly fetch failed:', e);
            setWeeklyReport(null);
        } finally {
            setIsLoadingWeekly(false);
        }
    }, [userId]);

    // Fetch achievements
    const fetchAchievements = useCallback(async () => {
        if (!userId) {
            setAchievements(null);
            setIsLoadingAchievements(false);
            return;
        }
        
        setIsLoadingAchievements(true);
        
        try {
            const data = await apiClient.get(`/api/v1/reports/user/${userId}/achievements`);
            setAchievements(data);
        } catch (e) {
            console.error('[useProgressReport] Achievements fetch failed:', e);
            setAchievements(null);
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

export default useProgressReport;
