// src/pages/ProgressDashboard.tsx
// Enhanced progress dashboard for parents with weekly charts and detailed analytics
// Parent-friendly design with clear data visualization

import React, { useState } from 'react';
import { useProgressReport } from '../hooks/useProgressReport';
import { ProgressChart } from '@/features/gamification/components/ProgressChart';
import { WeeklyReport } from '@/features/gamification/components/WeeklyReport';
import { StreakBadge } from '@/features/gamification/components/StreakBadge';
import { DailyGoal } from '@/features/gamification/components/DailyGoal';
import { useAuth } from '../contexts/AuthContext';

type ViewMode = 'overview' | 'detailed';

export const ProgressDashboard: React.FC = () => {
    const { user } = useAuth();
    const userId = user?.id ?? '';
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    
    const {
        summary,
        weeklyReport,
        achievements,
        isLoading,
        weeklyComparison,
        refresh
    } = useProgressReport(userId);

    // Transform weekly data for chart
    const chartData = weeklyReport?.daily_breakdown.map(day => ({
        label: day.day,
        value: day.words,
        secondary: day.time_mins
    })) || [];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center clay-bg-playful p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
                <div className="text-center">
                    <div className="text-5xl animate-bounce mb-4">📊</div>
                    <p className="text-sky-700 font-bold">Loading progress...</p>
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="min-h-screen flex items-center justify-center clay-bg-playful p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
                <div className="max-w-md w-full rounded-3xl border-2 border-sky-200 bg-white/90 p-6 text-center shadow-lg">
                    <div className="text-4xl mb-3">📭</div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Progress unavailable</h2>
                    <p className="text-slate-600 text-sm mb-4">We could not load this report right now. Try refreshing.</p>
                    <button
                        onClick={() => refresh()}
                        className="px-5 py-2.5 rounded-xl font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)' }}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen clay-bg-playful pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
            {/* Header */}
            <div 
                className="px-4 pt-6 pb-4"
                style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                }}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">Progress Report</h1>
                        <p className="text-white/80 text-sm">Track learning journey</p>
                    </div>
                    <button
                        onClick={() => refresh()}
                        className="self-start sm:self-auto p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        style={{ minWidth: 44, minHeight: 44 }}
                    >
                        <span className="text-xl">🔄</span>
                    </button>
                </div>
                
                {/* View Toggle */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => setViewMode('overview')}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                            viewMode === 'overview'
                                ? 'bg-white text-sky-700'
                                : 'bg-white/20 text-white'
                        }`}
                        style={{ minHeight: 44 }}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setViewMode('detailed')}
                        className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                            viewMode === 'detailed'
                                ? 'bg-white text-sky-700'
                                : 'bg-white/20 text-white'
                        }`}
                        style={{ minHeight: 44 }}
                    >
                        Detailed
                    </button>
                </div>
            </div>

            <div className="px-4 sm:px-6 pt-4 space-y-4">
                {/* Quick Stats - Always visible */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <QuickStat
                        icon="🏆"
                        value={`Lv.${summary?.stats.level || 1}`}
                        label="Level"
                        color="#0ea5e9"
                    />
                    <QuickStat
                        icon="⭐"
                        value={`${summary?.stats.total_xp || 0}`}
                        label="XP"
                        color="#f59e0b"
                    />
                    <QuickStat
                        icon="📚"
                        value={`${summary?.stats.total_words_learned || 0}`}
                        label="Words"
                        color="#22c55e"
                    />
                    <StreakBadge className="clay-stat-card" />
                </div>

                {viewMode === 'overview' ? (
                    <>
                        {/* Daily Goal + Streak Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DailyGoal variant="full" showCelebration={true} />
                    <StreakBadge className="clay-stat-card" />
                </div>

                {/* Weekly Report Card */}
                        {weeklyReport && (
                            <WeeklyReport
                                summary={weeklyReport.summary}
                                comparison={weeklyComparison}
                                recentAchievements={achievements?.badges}
                            />
                        )}

                        {/* Weekly Chart */}
                        {chartData.length > 0 && (
                            <ProgressChart
                                data={chartData}
                                title="Words Learned This Week"
                                primaryLabel="Words"
                                secondaryLabel="Time (mins)"
                                showSecondary={true}
                                colorScheme="blue"
                            />
                        )}
                    </>
                ) : (
                    <>
                        {/* Detailed View */}
                        
                        {/* Pronunciation Score */}
                        <div
                            className="p-4 rounded-2xl shadow-lg"
                            style={{
                                background: 'rgba(255,255,255,0.95)',
                                border: '3px solid #3b82f6'
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="text-4xl">🎤</div>
                                <div className="flex-1">
                                    <div className="text-blue-800 font-bold text-sm">Pronunciation Score</div>
                                    <div className="h-4 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${summary?.stats.pronunciation_score_avg || 0}%`,
                                                background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="text-blue-600 font-black text-2xl">
                                    {summary?.stats.pronunciation_score_avg || 0}%
                                </div>
                            </div>
                        </div>

                        {/* Topics Progress */}
                        <div
                            className="rounded-2xl p-4 shadow-lg"
                            style={{
                                background: 'rgba(255,255,255,0.95)',
                                border: '3px solid #0ea5e9'
                            }}
                        >
                            <h2 className="text-sky-800 font-bold text-lg mb-4 flex items-center gap-2">
                                <span>📂</span> Topics Progress
                            </h2>
                            <div className="space-y-4">
                                {summary?.topics.map((topic) => (
                                    <div key={topic.topic}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-gray-700">{topic.topic}</span>
                                            <span className="text-sky-700 font-bold">
                                                {topic.words_learned}/{topic.total_words} words
                                            </span>
                                        </div>
                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${topic.percentage}%`,
                                                    background: topic.percentage === 100
                                                        ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                                        : 'linear-gradient(90deg, #0ea5e9, #38bdf8)'
                                                }}
                                            />
                                        </div>
                                        <div className="text-right text-xs text-gray-500 mt-1">
                                            {topic.percentage}% complete
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Session Stats */}
                        <div
                            className="rounded-2xl p-4 shadow-lg"
                            style={{
                                background: 'rgba(255,255,255,0.95)',
                                border: '3px solid #22c55e'
                            }}
                        >
                            <h2 className="text-green-800 font-bold text-lg mb-4 flex items-center gap-2">
                                <span>📈</span> Learning Stats
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailStat
                                    label="Total Time"
                                    value={`${summary?.stats.time_spent_mins || 0} mins`}
                                    icon="⏱️"
                                />
                                <DetailStat
                                    label="Games Played"
                                    value={`${summary?.stats.games_played || 0}`}
                                    icon="🎮"
                                />
                                <DetailStat
                                    label="Topics Done"
                                    value={`${summary?.stats.topics_completed?.length || 0}`}
                                    icon="✅"
                                />
                                <DetailStat
                                    label="Favorite"
                                    value={summary?.stats.favorite_topic || '-'}
                                    icon="⭐"
                                />
                            </div>
                        </div>

                        {/* Achievements */}
                        {achievements && achievements.badges.length > 0 && (
                            <div
                                className="rounded-2xl p-4 shadow-lg"
                                style={{
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    border: '3px solid #f59e0b'
                                }}
                            >
                                <h2 className="text-amber-800 font-bold text-lg mb-4 flex items-center gap-2">
                                    <span>🏆</span> Achievements
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {achievements.badges.map((badge) => (
                                        <div
                                            key={badge.id}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80"
                                        >
                                            <span className="text-2xl">{badge.emoji}</span>
                                            <div>
                                                <div className="font-bold text-amber-800 text-sm">{badge.name}</div>
                                                <div className="text-xs text-amber-600">
                                                    {new Date(badge.earned_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-3 border-t border-amber-400/30 flex justify-between text-sm">
                                    <span className="text-amber-700">
                                        🌟 {achievements.stickers_collected} Stickers
                                    </span>
                                    <span className="text-amber-700">
                                        ⭐ {achievements.total_stars} Stars
                                    </span>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Parent Tips */}
                <div
                    className="rounded-2xl p-4 shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        border: '2px solid #10b981'
                    }}
                >
                    <h3 className="text-emerald-800 font-bold text-sm mb-2 flex items-center gap-1">
                        <span>💡</span> Tip for Parents
                    </h3>
                    <p className="text-emerald-700 text-sm">
                        {getParentTip(summary?.stats.streak_days || 0, summary?.stats.total_words_learned || 0)}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Quick stat component for header row
interface QuickStatProps {
    icon: string;
    value: string;
    label: string;
    color: string;
}

const QuickStat: React.FC<QuickStatProps> = ({ icon, value, label, color }) => (
    <div
        className="p-2 rounded-xl text-center"
        style={{
            background: 'rgba(255,255,255,0.9)',
            border: `2px solid ${color}`
        }}
    >
        <div className="text-lg">{icon}</div>
        <div className="font-black text-sm" style={{ color }}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
    </div>
);

// Detail stat component for detailed view
interface DetailStatProps {
    label: string;
    value: string;
    icon: string;
}

const DetailStat: React.FC<DetailStatProps> = ({ label, value, icon }) => (
    <div className="text-center p-3 bg-green-50 rounded-xl">
        <div className="text-2xl mb-1">{icon}</div>
        <div className="font-bold text-green-800">{value}</div>
        <div className="text-xs text-green-600">{label}</div>
    </div>
);

// Get contextual tip for parents
function getParentTip(streakDays: number, wordsLearned: number): string {
    if (streakDays === 0) {
        return "Try setting a daily reminder! Just 10 minutes of practice each day builds strong learning habits.";
    } else if (streakDays >= 7) {
        return "Fantastic streak! Consider celebrating this milestone with a small reward to reinforce the positive habit.";
    } else if (streakDays >= 3) {
        return "Great consistency! Keep the momentum going - learning a little each day is better than long occasional sessions.";
    } else if (wordsLearned < 10) {
        return "Start with topics your child is excited about! Interest-driven learning leads to better retention.";
    } else {
        return "Practice makes perfect! Try reviewing previously learned words together during car rides or meals.";
    }
}

export default ProgressDashboard;
