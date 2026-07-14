// Data wired via apiClient — see plan/20260709_PROFILE_REAL_DATA_PLAN.md
import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import {
    createProfileService,
    type ApiClientPort,
} from '../services/profile';
import {
    useProfileData,
    type BadgeView,
    type LeaderboardRowView,
    type MilestoneView,
} from '../hooks/useProfileData';
import '../styles/claymorphic-utilities.css';

const badgeIcons: Record<string, string> = {
    'Early Bird': '🌅',
    'Sharpshooter': '🎯',
    'Scholar': '📚',
    'Speed Demon': '⚡',
    'Perfectionist': '💎',
    'Team Player': '🤝',
    'Explorer': '🧭',
    'Champion': '🏆',
};

const testimonials = [
    {
        id: 1,
        name: 'Emma',
        age: 10,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=b6e3f4',
        quote: "Learning here is so fun! I love collecting badges and earning rewards. My English got so much better!",
        rating: 5,
        color: 'coral',
    },
    {
        id: 2,
        name: 'Lucas',
        age: 12,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas&backgroundColor=c0aede',
        quote: "The games make studying feel like playing! I actually look forward to my lessons now.",
        rating: 5,
        color: 'mint',
    },
    {
        id: 3,
        name: 'Sofia',
        age: 9,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia&backgroundColor=ffd5dc',
        quote: "I've learned so many new words! My pet dragon is the coolest and I'm on a 30-day streak!",
        rating: 5,
        color: 'sky',
    },
];

const MILESTONE_TARGETS = {
    lessons: 50,
    words: 200,
    quizzes: 25,
    streak: 30,
} as const;

const FALLBACK_BADGES: BadgeView[] = [
    { id: 'first_scan', name: 'First Scan', description: 'Scanned your first flashcard!', iconUrl: '' },
    { id: 'quiz_starter', name: 'Quiz Starter', description: 'Completed your first quiz!', iconUrl: '' },
    { id: 'quiz_master', name: 'Quiz Master', description: 'Got 100% on a quiz!', iconUrl: '' },
    { id: 'streak_3', name: '3 Day Streak', description: 'Learned for 3 days in a row!', iconUrl: '' },
    { id: 'streak_7', name: 'Week Warrior', description: '7 day learning streak!', iconUrl: '' },
    { id: 'pronunciation_pro', name: 'Pronunciation Pro', description: 'Perfect pronunciation!', iconUrl: '' },
];

interface ProfileSummaryLike {
    level: number;
    totalPoints: number;
    xpToNextLevel: number;
    streakDays: number;
    longestStreak: number;
    wordsLearned: number;
    lessonsCompleted: number;
    avatarUrl: string;
}

function emptySummary(): ProfileSummaryLike {
    return {
        level: 1,
        totalPoints: 0,
        xpToNextLevel: 1500,
        streakDays: 0,
        longestStreak: 0,
        wordsLearned: 0,
        lessonsCompleted: 0,
        avatarUrl: '',
    };
}

const EMPTY_PROFILE_DATA = {
    badges: FALLBACK_BADGES,
    earnedBadgeIds: [] as string[],
    leaderboard: [] as LeaderboardRowView[],
    milestones: [] as MilestoneView[],
    summary: emptySummary(),
};

const DICEBEAR_AVATAR_URL = (seed: string): string =>
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;

const apiClientPort: ApiClientPort = apiClient;
const profileService = createProfileService(apiClientPort);

export const Profile: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'badges' | 'stats'>('badges');

    const userId = user?.id;
    const { result } = useProfileData(userId, profileService);

    const username = user?.username || 'Learner';

    const view =
        result.kind === 'ok'
            ? result.data
            : EMPTY_PROFILE_DATA;

    const { summary, badges, earnedBadgeIds, leaderboard } = view;

    const earnedBadgeSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

    const renderedMilestones = useMemo<MilestoneView[]>(() => {
        if (view.milestones.length > 0) return view.milestones;
        return [
            { label: 'Lessons Done', target: MILESTONE_TARGETS.lessons, icon: '📖', color: '#FF6B6B', current: 0 },
            { label: 'Words Learned', target: MILESTONE_TARGETS.words, icon: '💬', color: '#4ECDC4', current: 0 },
            { label: 'Quizzes Passed', target: MILESTONE_TARGETS.quizzes, icon: '✅', color: '#45B7D1', current: 0 },
            { label: 'Days Streak', target: MILESTONE_TARGETS.streak, icon: '🔥', color: '#F7DC6F', current: 0 },
        ];
    }, [view.milestones]);

    const xpForNextLevel = summary.xpToNextLevel;
    const levelProgress = useMemo(() => {
        if (!xpForNextLevel || xpForNextLevel <= 0) return 0;
        return Math.min(100, Math.max(0, (summary.totalPoints / xpForNextLevel) * 100));
    }, [summary.totalPoints, xpForNextLevel]);

    const avatarUrl = summary.avatarUrl || DICEBEAR_AVATAR_URL(username);

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-24 transition-all duration-300 md:pb-8">
            {/* Decorative background shapes */}
            <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
                <div
                    className="clay-shape-blob absolute -left-20 top-20 h-64 w-64 opacity-30"
                    style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)', animationDelay: '0s' }}
                />
                <div
                    className="clay-shape-blob absolute -right-16 top-1/3 h-48 w-48 opacity-25"
                    style={{ background: 'linear-gradient(135deg, #4ECDC4, #7EE8E0)', animationDelay: '2s' }}
                />
                <div
                    className="clay-shape-blob absolute bottom-20 left-1/4 h-56 w-56 opacity-20"
                    style={{ background: 'linear-gradient(135deg, #45B7D1, #7DD3E8)', animationDelay: '4s' }}
                />
            </div>

            <div className="relative mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
                {/* Hero Profile Section */}
                <section className="clay-hero mb-6 overflow-hidden sm:mb-8">
                    <div className="relative">
                        {/* Background pattern */}
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FF6B6B' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                            }}
                        />

                        <div className="relative grid min-w-0 gap-6 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_minmax(14rem,18rem)] lg:gap-8 xl:gap-10">
                            {/* Avatar with level ring */}
                            <div className="relative justify-self-center sm:justify-self-start">
                                <div className="clay-progress-ring" style={{ '--progress': `${levelProgress}%` } as React.CSSProperties}>
                                    <div
                                        className="h-28 w-28 overflow-hidden rounded-full sm:h-32 sm:w-32"
                                        style={{
                                            border: '4px solid white',
                                            boxShadow: '0 8px 24px rgba(255, 107, 107, 0.3)',
                                        }}
                                    >
                                        <img
                                            src={avatarUrl}
                                            alt="Profile"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                                {/* Level badge */}
                                <div
                                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 transform rounded-full px-4 py-1 text-sm font-black text-white"
                                    style={{
                                        background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
                                        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.4)',
                                        border: '3px solid white',
                                    }}
                                >
                                    LVL {summary.level}
                                </div>
                            </div>

                            {/* User info */}
                            <div className="min-w-0 text-center sm:text-left">
                                <h1
                                    className="break-words text-3xl font-black leading-tight text-slate-800 sm:text-4xl"
                                    style={{ textShadow: '2px 2px 0px rgba(255, 107, 107, 0.2)' }}
                                >
                                    {username}
                                </h1>
                                <p className="mt-1 text-lg font-bold text-slate-500">
                                    {result.kind === 'warming'
                                        ? 'Warming up your profile…'
                                        : 'Super Star Learner ⭐'}
                                </p>
                                {result.kind === 'error' && (
                                    <div
                                        className="mt-2 text-sm text-slate-500"
                                        role="status"
                                        aria-live="polite"
                                    >
                                        Profile data unavailable — please refresh.
                                    </div>
                                )}

                                {/* XP Progress bar */}
                                <div className="mx-auto mt-4 max-w-xs sm:mx-0 sm:max-w-sm lg:max-w-lg">
                                    <div className="mb-1 flex justify-between text-sm font-bold">
                                        <span className="text-slate-600">{summary.totalPoints} XP</span>
                                        <span className="text-slate-400">{xpForNextLevel} XP</span>
                                    </div>
                                    <div
                                        className="h-4 overflow-hidden rounded-full"
                                        style={{
                                            background: '#E8E8E8',
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                                        }}
                                    >
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${levelProgress}%`,
                                                background: 'linear-gradient(90deg, #FF6B6B, #FFB347)',
                                                boxShadow: '0 2px 8px rgba(255, 107, 107, 0.4)',
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs font-medium text-slate-400">
                                        {Math.max(0, xpForNextLevel - summary.totalPoints)} XP to Level {summary.level + 1}
                                    </p>
                                </div>
                            </div>

                            {/* Quick stats */}
                            <div className="grid w-full grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
                                <div className="clay-stat-card text-center !p-4 lg:!p-5">
                                    <span className="text-2xl">🔥</span>
                                    <div className="mt-1 text-2xl font-black text-orange-500">{summary.streakDays}</div>
                                    <div className="text-xs font-bold text-slate-500">Day Streak</div>
                                </div>
                                <div className="clay-stat-card text-center !p-4 lg:!p-5">
                                    <span className="text-2xl">⚡</span>
                                    <div className="mt-1 text-2xl font-black text-sky-500">{summary.totalPoints}</div>
                                    <div className="text-xs font-bold text-slate-500">Total XP</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main content grid */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:items-start">
                    {/* Left column - Badges & Stats */}
                    <div className="min-w-0 space-y-6 xl:col-span-3">
                        {/* Tab navigation */}
                        <div className="flex min-w-0 flex-wrap gap-2">
                            <button
                                onClick={() => setActiveTab('badges')}
                                className={`clay-tab ${activeTab === 'badges' ? 'clay-tab-active' : ''}`}
                            >
                                🏆 Badges
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`clay-tab ${activeTab === 'stats' ? 'clay-tab-active' : ''}`}
                            >
                                📊 Progress
                            </button>
                        </div>

                        {/* Badges section */}
                        {activeTab === 'badges' && (
                            <section className="clay-card-sky p-4 sm:p-6">
                                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="text-xl font-black text-slate-800">
                                        Badge Collection
                                    </h2>
                                    <span
                                        className="rounded-full px-3 py-1 text-sm font-bold"
                                        style={{
                                            background: 'rgba(69, 183, 209, 0.2)',
                                            color: '#2D8BA8'
                                        }}
                                    >
                                        {earnedBadgeIds.length}/{badges.length} Earned
                                    </span>
                                </div>

                                {/* Enhanced badge grid */}
                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4 xl:gap-5">
                                    {badges.map((badge) => {
                                        const isEarned = earnedBadgeSet.has(badge.id);
                                        return (
                                            <div
                                                key={badge.id}
                                                className="group relative flex flex-col items-center text-center"
                                                title={badge.description}
                                            >
                                                <div
                                                    className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl transition-all duration-300 sm:h-20 sm:w-20 sm:text-3xl ${isEarned
                                                            ? 'clay-float-element'
                                                            : 'grayscale opacity-40'
                                                        }`}
                                                    style={isEarned ? {
                                                        background: 'linear-gradient(145deg, #FFE66D, #FFD93D)',
                                                        boxShadow: '0 8px 20px rgba(255, 217, 61, 0.4), inset 0 -3px 0 rgba(0,0,0,0.1)',
                                                        border: '3px solid #FFEC8B',
                                                    } : {
                                                        background: '#E5E7EB',
                                                        border: '3px solid #D1D5DB',
                                                    }}
                                                >
                                                    {badgeIcons[badge.name] || '🏆'}
                                                </div>
                                                <span className={`mt-2 text-xs font-bold ${isEarned ? 'text-slate-700' : 'text-slate-400'}`}>
                                                    {badge.name}
                                                </span>

                                                {/* Tooltip */}
                                                <div className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 transform whitespace-nowrap rounded-lg bg-slate-800 px-3 py-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                                                    {badge.description}
                                                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 transform bg-slate-800" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Stats/Progress section */}
                        {activeTab === 'stats' && (
                            <section className="clay-card-mint p-4 sm:p-6">
                                <h2 className="mb-4 text-xl font-black text-slate-800">
                                    Learning Milestones
                                </h2>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {renderedMilestones.map((milestone, index) => {
                                        const progress = (milestone.current / milestone.target) * 100;
                                        return (
                                            <div
                                                key={index}
                                                className="rounded-2xl bg-white/60 p-4"
                                                style={{
                                                    border: '3px solid rgba(255,255,255,0.8)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                }}
                                            >
                                                <div className="mb-2 flex items-center gap-3">
                                                    <span
                                                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                                                        style={{
                                                            background: `${milestone.color}20`,
                                                        }}
                                                    >
                                                        {milestone.icon}
                                                    </span>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-slate-600">
                                                            {milestone.label}
                                                        </div>
                                                        <div className="text-lg font-black" style={{ color: milestone.color }}>
                                                            {milestone.current} / {milestone.target}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="h-3 overflow-hidden rounded-full"
                                                    style={{ background: `${milestone.color}20` }}
                                                >
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${progress}%`,
                                                            background: milestone.color,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Testimonials Section */}
                        <section className="clay-card-lavender p-4 sm:p-6">
                            <h2 className="mb-4 text-center text-xl font-black text-slate-800">
                                What Other Learners Say ✨
                            </h2>

                            <div className="grid gap-4 lg:grid-cols-3">
                                {testimonials.map((testimonial) => (
                                    <div
                                        key={testimonial.id}
                                        className="clay-testimonial"
                                    >
                                        <div className="mb-3 flex min-w-0 items-center gap-3">
                                            <img
                                                src={testimonial.avatar}
                                                alt={testimonial.name}
                                                className="h-12 w-12 rounded-full border-3 border-white shadow-md"
                                            />
                                            <div className="min-w-0">
                                                <div className="truncate font-bold text-slate-800">{testimonial.name}</div>
                                                <div className="text-xs text-slate-500">Age {testimonial.age}</div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 italic">
                                            "{testimonial.quote}"
                                        </p>
                                        <div className="mt-2 text-yellow-400">
                                            {'⭐'.repeat(testimonial.rating)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right column - Leaderboard & CTA */}
                    <div className="min-w-0 space-y-6 xl:col-span-2">
                        {/* Styled Leaderboard */}
                        <section className="clay-card-sunshine overflow-hidden p-0">
                            <div
                                className="p-4 text-center"
                                style={{
                                    background: 'linear-gradient(135deg, #FFD93D, #FFE66D)',
                                }}
                            >
                                <h3 className="text-xl font-black text-slate-800">
                                    🏆 Leaderboard
                                </h3>
                            </div>
                            <div className="divide-y divide-yellow-100">
                                {leaderboard.map((entry, index) => (
                                    <div
                                        key={entry.userId}
                                        className={`flex min-w-0 items-center gap-3 p-3 transition-colors hover:bg-yellow-50 ${entry.username === username ? 'bg-yellow-50' : ''
                                            }`}
                                    >
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${index === 0 ? 'bg-yellow-400 text-white' :
                                                    index === 1 ? 'bg-gray-300 text-gray-600' :
                                                        index === 2 ? 'bg-orange-300 text-orange-700' :
                                                            'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <img
                                            src={entry.avatarUrl}
                                            alt={entry.username}
                                            className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className={`truncate font-bold ${entry.username === username ? 'text-yellow-700' : 'text-slate-700'}`}>
                                                {entry.username}
                                                {entry.username === username && <span className="ml-1 text-xs">(You)</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 whitespace-nowrap text-sm font-bold text-yellow-600 sm:text-base">
                                            {entry.points} XP
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* CTA Section */}
                        <section
                            className="relative overflow-hidden rounded-3xl p-6 text-center"
                            style={{
                                background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
                                boxShadow: '0 12px 32px rgba(255, 107, 107, 0.3), inset 0 -4px 0 rgba(0,0,0,0.1)',
                                border: '4px solid rgba(255,255,255,0.3)',
                            }}
                        >
                            {/* Decorative elements */}
                            <div className="pointer-events-none absolute -right-8 -top-8 text-8xl opacity-20">
                                🚀
                            </div>
                            <div className="pointer-events-none absolute -bottom-4 -left-4 text-6xl opacity-20">
                                ⭐
                            </div>

                            <div className="relative">
                                <h3 className="mb-2 text-xl font-black text-white">
                                    Ready for More?
                                </h3>
                                <p className="mb-4 text-sm text-white/90">
                                    Keep learning and unlock amazing rewards!
                                </p>
                                <Link
                                    to="/courses"
                                    className="clay-cta-secondary inline-block"
                                >
                                    Continue Learning →
                                </Link>
                            </div>
                        </section>

                        {/* Daily Challenge */}
                        <section className="clay-card-coral p-5">
                            <div className="flex items-center gap-3">
                                <span
                                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                                    style={{
                                        background: 'rgba(255, 107, 107, 0.2)',
                                    }}
                                >
                                    🎯
                                </span>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-500">Daily Challenge</div>
                                    <div className="font-black text-slate-800">Complete 3 Lessons</div>
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                                    <span>Progress</span>
                                    <span>1/3</span>
                                </div>
                                <div
                                    className="h-3 overflow-hidden rounded-full"
                                    style={{ background: 'rgba(255, 107, 107, 0.2)' }}
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: '33%',
                                            background: 'linear-gradient(90deg, #FF6B6B, #FF8E8E)',
                                        }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    🎁 Reward: 50 XP + Mystery Badge
                                </p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
};
