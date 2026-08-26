// src/components/Gamification/DailyGoal.tsx
// Compact daily goal progress tracker for AR view and other screens
// Kid-friendly with visual progress indicators

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import type { DailyGoalData } from '@/features/gamification/types';

interface DailyGoalProps {
    userId?: string;
    variant?: 'compact' | 'full' | 'mini';
    showCelebration?: boolean;
    onGoalComplete?: () => void;
}

export const DailyGoal: React.FC<DailyGoalProps> = ({
    variant = 'compact',
    showCelebration = true,
    onGoalComplete
}) => {
    const { user } = useAuth();
    const userId = user?.id || null;
    const [data, setData] = useState<DailyGoalData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showComplete, setShowComplete] = useState(false);

    const fetchProgress = useCallback(async () => {
        if (!userId) return;
        try {
            const result = await apiClient.getLearningProgress(userId);
            setData(result as DailyGoalData);

            // Check if just completed
            if (result.is_complete && showCelebration && !showComplete) {
                setShowComplete(true);
                onGoalComplete?.();
                // Auto-hide celebration after 3 seconds
                setTimeout(() => setShowComplete(false), 3000);
            }
        } catch (e) {
            console.error('[DailyGoal] Failed to fetch:', e);
            // Use mock data
            setData(getMockData());
        } finally {
            setIsLoading(false);
        }
    }, [userId, showCelebration, onGoalComplete]);

    useEffect(() => {
        fetchProgress();
        // Refresh every 30 seconds
        const interval = setInterval(fetchProgress, 30000);
        return () => clearInterval(interval);
    }, [fetchProgress]);

    if (isLoading) {
        return <LoadingSkeleton variant={variant} />;
    }

    if (!data) return null;

    // Render based on variant
    switch (variant) {
        case 'mini':
            return <MiniGoal data={data} />;
        case 'full':
            return <FullGoal data={data} showComplete={showComplete} />;
        default:
            return <CompactGoal data={data} showComplete={showComplete} />;
    }
};

// ========== Variant Components ==========

interface GoalVariantProps {
    data: DailyGoalData;
    showComplete?: boolean;
}

// Mini - Just progress rings (for AR overlay)
const MiniGoal: React.FC<{ data: DailyGoalData }> = ({ data }) => {
    const timePercent = data.goals.time.percentage;
    const wordsPercent = data.goals.words.percentage;

    return (
        <div className="flex gap-2">
            {/* Time Ring */}
            <div className="clay-ring-container clay-ring-container--time">
                <svg className="w-10 h-10 transform -rotate-90" aria-hidden="true">
                    <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="#E8F4FF"
                        strokeWidth="4"
                    />
                    <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke={timePercent >= 100 ? '#22c55e' : '#38BDF8'}
                        strokeWidth="4"
                        strokeDasharray={`${(timePercent / 100) * 100.5} 100.5`}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="clay-ring-icon clay-ring-icon--time" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </span>
            </div>

            {/* Words Ring */}
            <div className="clay-ring-container clay-ring-container--words">
                <svg className="w-10 h-10 transform -rotate-90" aria-hidden="true">
                    <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="#FFF8E0"
                        strokeWidth="4"
                    />
                    <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke={wordsPercent >= 100 ? '#22c55e' : '#FBBF24'}
                        strokeWidth="4"
                        strokeDasharray={`${(wordsPercent / 100) * 100.5} 100.5`}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="clay-ring-icon clay-ring-icon--words" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        <path d="M8 7h8M8 11h6" />
                    </svg>
                </span>
            </div>
        </div>
    );
};

// Compact - Progress bars with labels (for sidebars)
const CompactGoal: React.FC<GoalVariantProps> = ({ data, showComplete }) => {
    if (showComplete) {
        return (
            <div
                className="p-3 rounded-xl text-center animate-pulse"
                style={{
                    background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                    border: '3px solid #16a34a'
                }}
            >
                <span className="text-2xl">🎉</span>
                <p className="text-white font-bold text-sm">Daily Goal Complete!</p>
            </div>
        );
    }

    return (
        <div
            className="p-3 rounded-xl"
            style={{
                background: 'rgba(255,255,255,0.95)',
                border: '2px solid #e5e7eb'
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">Today's Goal</span>
                {data.is_complete && <span className="text-lg">✅</span>}
            </div>

            {/* Time Progress */}
            <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-sky-700 font-bold">⏱️ Time</span>
                    <span className="text-gray-600">
                        {data.goals.time.current}/{data.goals.time.target} mins
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.min(data.goals.time.percentage, 100)}%`,
                            background: data.goals.time.percentage >= 100
                                ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                : 'linear-gradient(90deg, #0ea5e9, #38bdf8)'
                        }}
                    />
                </div>
            </div>

            {/* Words Progress */}
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-700 font-bold">📚 Words</span>
                    <span className="text-gray-600">
                        {data.goals.words.current}/{data.goals.words.target}
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${Math.min(data.goals.words.percentage, 100)}%`,
                            background: data.goals.words.percentage >= 100
                                ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                : 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

// Full - Detailed view with all stats (for dashboard)
const FullGoal: React.FC<GoalVariantProps> = ({ data, showComplete }) => {
    if (showComplete) {
        return (
            <div
                className="p-6 rounded-2xl text-center"
                style={{
                    background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                    border: '4px solid #16a34a',
                    boxShadow: '0 8px 30px rgba(34,197,94,0.3)'
                }}
            >
                <div className="text-5xl mb-2 animate-bounce">🎉</div>
                <h3 className="text-white font-black text-xl">Amazing!</h3>
                <p className="text-white/90 text-sm">You've completed today's goal!</p>
            </div>
        );
    }

    return (
        <div
            className="p-4 rounded-2xl"
            style={{
                background: 'rgba(255,255,255,0.95)',
                border: '3px solid #0ea5e9'
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sky-800 flex items-center gap-2">
                    <span>🎯</span> Today's Goal
                </h3>
                <span className="text-xs text-gray-500">{data.date}</span>
            </div>

            {/* Progress Circles */}
            <div className="flex justify-center gap-8 mb-4">
                {/* Time Circle */}
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-20 h-20 transform -rotate-90">
                            <circle
                                cx="40"
                                cy="40"
                                r="32"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                            />
                            <circle
                                cx="40"
                                cy="40"
                                r="32"
                                fill="none"
                                stroke={data.goals.time.percentage >= 100 ? '#22c55e' : '#0ea5e9'}
                                strokeWidth="8"
                                strokeDasharray={`${(data.goals.time.percentage / 100) * 201} 201`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-sky-700">
                                {data.goals.time.percentage}%
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-sky-700 mt-1">⏱️ Time</p>
                    <p className="text-xs text-gray-500">
                        {data.goals.time.current}/{data.goals.time.target} mins
                    </p>
                </div>

                {/* Words Circle */}
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-20 h-20 transform -rotate-90">
                            <circle
                                cx="40"
                                cy="40"
                                r="32"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="8"
                            />
                            <circle
                                cx="40"
                                cy="40"
                                r="32"
                                fill="none"
                                stroke={data.goals.words.percentage >= 100 ? '#22c55e' : '#f59e0b'}
                                strokeWidth="8"
                                strokeDasharray={`${(data.goals.words.percentage / 100) * 201} 201`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-amber-700">
                                {data.goals.words.percentage}%
                            </span>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-amber-700 mt-1">📚 Words</p>
                    <p className="text-xs text-gray-500">
                        {data.goals.words.current}/{data.goals.words.target}
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200">
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <span className="text-lg">🎮</span>
                    <p className="font-bold text-blue-800">{data.progress.games_played}</p>
                    <p className="text-xs text-blue-600">Games</p>
                </div>
                <div className="text-center p-2 bg-pink-50 rounded-lg">
                    <span className="text-lg">🎤</span>
                    <p className="font-bold text-pink-800">{data.progress.pronunciation_attempts}</p>
                    <p className="text-xs text-pink-600">Pronunciations</p>
                </div>
            </div>

            {/* Encouragement */}
            {!data.is_complete && (
                <div className="mt-3 p-2 rounded-lg bg-sky-50 text-center">
                    <p className="text-sm text-sky-700">
                        {data.goals.time.remaining > 0
                            ? `Just ${data.goals.time.remaining} more minutes to go!`
                            : data.goals.words.remaining > 0
                            ? `Learn ${data.goals.words.remaining} more words!`
                            : 'Almost there!'}
                    </p>
                </div>
            )}
        </div>
    );
};

// Loading skeleton
const LoadingSkeleton: React.FC<{ variant: string }> = ({ variant }) => {
    const size = variant === 'mini' ? 'w-20 h-10' : variant === 'full' ? 'w-full h-48' : 'w-full h-24';
    return (
        <div className={`${size} bg-gray-200 rounded-xl animate-pulse`} />
    );
};

// Mock data for demo/fallback
function getMockData(): DailyGoalData {
    return {
        date: new Date().toISOString().split('T')[0],
        progress: {
            time_spent_mins: 8,
            words_learned: 3,
            games_played: 2,
            pronunciation_attempts: 5
        },
        goals: {
            time: { target: 15, current: 8, percentage: 53, remaining: 7 },
            words: { target: 5, current: 3, percentage: 60, remaining: 2 }
        },
        is_complete: false
    };
}

export default DailyGoal;
