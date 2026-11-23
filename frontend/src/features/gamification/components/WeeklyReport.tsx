// src/components/Gamification/WeeklyReport.tsx
// Weekly summary card for parents with comparison to previous week
// Clean, professional design suitable for parent dashboard

import React from 'react';
import type { WeeklySummary, WeeklyComparison, Achievement } from '@/hooks/useProgressReport';

interface WeeklyReportProps {
    summary: WeeklySummary;
    comparison?: WeeklyComparison | null;
    recentAchievements?: Achievement[];
    weekRange?: string; // e.g., "Jan 15 - Jan 22"
    childName?: string;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({
    summary,
    comparison,
    recentAchievements = [],
    weekRange,
    childName = 'Your child'
}) => {
    // Format week range if not provided
    const displayRange = weekRange || getDefaultWeekRange();

    // Determine trend icon and color
    const getTrendDisplay = () => {
        if (!comparison) return null;

        switch (comparison.trend) {
            case 'up':
                return { icon: '📈', color: '#22c55e', bgColor: '#dcfce7' };
            case 'down':
                return { icon: '📉', color: '#ef4444', bgColor: '#fee2e2' };
            default:
                return { icon: '➡️', color: '#6b7280', bgColor: '#f3f4f6' };
        }
    };

    const trend = getTrendDisplay();

    return (
        <div
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '2px solid #e2e8f0'
            }}
        >
            {/* Header */}
            <div
                className="px-4 py-3"
                style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
                }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-lg">Weekly Report</h3>
                        <p className="text-white/80 text-sm">{displayRange}</p>
                    </div>
                    {trend && (
                        <div
                            className="px-3 py-1 rounded-full text-sm font-bold"
                            style={{ background: trend.bgColor, color: trend.color }}
                        >
                            {trend.icon} {comparison?.trend === 'up' ? 'Improving!' : comparison?.trend === 'down' ? 'Needs attention' : 'Steady'}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Words Learned */}
                    <StatCard
                        icon="📚"
                        label="Words Learned"
                        value={summary.words_learned}
                        change={comparison?.wordsChange}
                    />

                    {/* Time Spent */}
                    <StatCard
                        icon="⏱️"
                        label="Time Spent"
                        value={summary.total_time_mins}
                        unit="mins"
                        change={comparison?.timeChange}
                    />

                    {/* Games Completed */}
                    <StatCard
                        icon="🎮"
                        label="Games Played"
                        value={summary.games_completed}
                    />

                    {/* Pronunciation */}
                    <StatCard
                        icon="🎤"
                        label="Pronunciation"
                        value={summary.avg_pronunciation_score}
                        unit="%"
                        isPercentage
                    />
                </div>

                {/* Comparison Message */}
                {comparison && (
                    <div
                        className="p-3 rounded-xl mb-4 text-center"
                        style={{ background: trend?.bgColor || '#f3f4f6' }}
                    >
                        <p className="text-sm" style={{ color: trend?.color || '#6b7280' }}>
                            {comparison.message}
                        </p>
                    </div>
                )}

                {/* Recent Achievements */}
                {recentAchievements.length > 0 && (
                    <div>
                        <h4 className="text-gray-700 font-bold text-sm mb-2 flex items-center gap-1">
                            <span>🏆</span> Recent Achievements
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {recentAchievements.slice(0, 3).map((achievement) => (
                                <div
                                    key={achievement.id}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                        border: '2px solid #f59e0b'
                                    }}
                                >
                                    <span>{achievement.emoji}</span>
                                    <span className="font-bold text-amber-800">{achievement.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - Encouragement */}
            <div
                className="px-4 py-3 text-center border-t"
                style={{ borderColor: '#e2e8f0', background: '#f8fafc' }}
            >
                <p className="text-gray-600 text-sm">
                    {summary.words_learned >= 10
                        ? `Amazing week! ${childName} is making great progress!`
                        : summary.words_learned >= 5
                        ? `Good effort! Keep encouraging ${childName} to practice!`
                        : `Let's set aside more time for learning together!`
                    }
                </p>
            </div>
        </div>
    );
};

// Individual stat card component
interface StatCardProps {
    icon: string;
    label: string;
    value: number;
    unit?: string;
    change?: number;
    isPercentage?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
    icon,
    label,
    value,
    unit = '',
    change,
    isPercentage = false
}) => {
    const displayValue = isPercentage ? value : value;
    const changeDisplay = change !== undefined && change !== 0;
    const isPositive = (change || 0) > 0;

    return (
        <div
            className="p-3 rounded-xl"
            style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
            }}
        >
            <div className="flex items-start justify-between">
                <span className="text-2xl">{icon}</span>
                {changeDisplay && (
                    <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{
                            background: isPositive ? '#dcfce7' : '#fee2e2',
                            color: isPositive ? '#16a34a' : '#dc2626'
                        }}
                    >
                        {isPositive ? '+' : ''}{change}
                    </span>
                )}
            </div>
            <div className="mt-2">
                <div className="text-2xl font-black text-gray-800">
                    {displayValue}{unit}
                </div>
                <div className="text-xs text-gray-500">{label}</div>
            </div>
        </div>
    );
};

// Helper function to get default week range
function getDefaultWeekRange(): string {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return `${formatDate(weekStart)} - ${formatDate(now)}`;
}

export default WeeklyReport;
