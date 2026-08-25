// src/pages/DailyChallengePage.tsx
// Standalone Daily Challenge page - route: /daily-challenge
// Extracted from Profile.tsx; displays current challenge, progress, reward.

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, type ProfileResponse } from '../services/apiClient';
import '../styles/claymorphic-utilities.css';

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-3xl" />
        <div className="h-32 bg-gray-200 rounded-3xl" />
        <div className="h-24 bg-gray-200 rounded-3xl" />
    </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="flex min-h-[60dvh] items-center justify-center p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72">
        <div className="max-w-sm w-full text-center">
            <div className="text-6xl mb-4">😢</div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Could not load challenge</h2>
            <p className="text-slate-500 text-sm mb-5">Something went wrong. Please try again.</p>
            <button
                onClick={onRetry}
                className="clay-cta-primary"
            >
                Try again
            </button>
        </div>
    </div>
);

const EmptyState: React.FC = () => (
    <div className="flex min-h-[60dvh] items-center justify-center p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72">
        <div className="max-w-sm w-full text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-xl font-black text-slate-800 mb-2">No challenge today</h2>
            <p className="text-slate-500 text-sm mb-5">Check back soon for a new daily challenge!</p>
            <Link to="/courses" className="clay-cta-primary inline-flex">
                Start learning
            </Link>
        </div>
    </div>
);

export const DailyChallengePage: React.FC = () => {
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const fetchChallenge = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const data = await apiClient.getMyProfile();
            setProfile(data);
        } catch {
            setHasError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChallenge();
    }, [fetchChallenge]);

    if (isLoading) {
        return (
            <div className="min-h-screen clay-bg-playful p-4 pb-24 md:pb-8 md:pl-24 lg:pl-72">
                <div className="max-w-lg mx-auto pt-4">
                    <LoadingSkeleton />
                </div>
            </div>
        );
    }

    if (hasError) {
        return <ErrorState onRetry={fetchChallenge} />;
    }

    const challenge = profile?.daily_challenge;
    const hasChallenge = challenge && (challenge.title || challenge.target > 0);

    if (!hasChallenge) {
        return <EmptyState />;
    }

    const progress = challenge.progress || 0;
    const target = challenge.target || 1;
    const percent = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));
    const isComplete = progress >= target;

    return (
        <div className="min-h-screen clay-bg-playful pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
            {/* Header */}
            <div
                className="px-4 pt-6 pb-8"
                style={{
                    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
                }}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-black text-white">Daily Challenge</h1>
                        <p className="text-white/80 text-sm mt-1">Complete the challenge to earn your reward!</p>
                    </div>
                    <button
                        onClick={fetchChallenge}
                        className="self-start sm:self-auto p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                        style={{ minWidth: 44, minHeight: 44 }}
                        aria-label="Refresh challenge"
                    >
                        <span className="text-xl">🔄</span>
                    </button>
                </div>

                {/* Challenge title card */}
                <div
                    className="rounded-3xl p-5 text-center"
                    style={{
                        background: 'rgba(255,255,255,0.95)',
                        boxShadow: '0 8px 32px rgba(255,107,107,0.3)',
                    }}
                >
                    <div
                        className="inline-flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mb-3"
                        style={{ background: 'rgba(255,107,107,0.15)' }}
                    >
                        🎯
                    </div>
                    <h2 className="font-black text-slate-800 text-lg leading-snug">
                        {challenge.title || 'Today\'s Challenge'}
                    </h2>
                    {isComplete && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                            ✅ Challenge Complete!
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 sm:px-6 pt-5 space-y-4 max-w-lg mx-auto">
                {/* Progress section */}
                <section
                    className="rounded-3xl p-5"
                    style={{
                        background: 'rgba(255,255,255,0.95)',
                        border: '3px solid #FF6B6B',
                        boxShadow: '0 4px 24px rgba(255,107,107,0.15)',
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-slate-800 text-base">Your Progress</h3>
                        <span className="text-sm font-bold" style={{ color: '#FF6B6B' }}>
                            {progress}/{target}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div
                        className="h-5 overflow-hidden rounded-full"
                        style={{ background: 'rgba(255,107,107,0.15)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${percent}%`,
                                background: isComplete
                                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                                    : 'linear-gradient(90deg, #FF6B6B, #FF8E8E)',
                            }}
                        />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>{percent}% complete</span>
                        <span>
                            {isComplete
                                ? 'Ready to claim!'
                                : `${target - progress} more to go`}
                        </span>
                    </div>
                </section>

                {/* Reward section */}
                <section
                    className="rounded-3xl p-5"
                    style={{
                        background: 'linear-gradient(135deg, #FFF7EC 0%, #FFF0DB 100%)',
                        border: '3px solid #F59E0B',
                        boxShadow: '0 4px 24px rgba(245,158,11,0.15)',
                    }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🎁</span>
                        <div>
                            <div className="text-xs font-extrabold uppercase tracking-wide text-amber-600">
                                Reward
                            </div>
                            <div className="font-black text-slate-800 text-base">
                                {challenge.reward || 'Mystery reward'}
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {isComplete
                            ? 'Complete a lesson to claim your reward!'
                            : 'Finish today\'s challenge to earn this reward.'}
                    </p>
                </section>

                {/* Actions */}
                <div className="pt-2 space-y-3">
                    <Link to="/courses" className="clay-cta-primary block text-center">
                        Go to Courses
                    </Link>
                    <Link to="/progress" className="clay-cta-secondary block text-center">
                        View Progress
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DailyChallengePage;
