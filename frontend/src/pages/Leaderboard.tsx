// src/pages/Leaderboard.tsx
// Standalone Leaderboard page for learner app - route: /leaderboard

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GamificationService, type LeaderboardEntry } from '../services/GamificationService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/claymorphic-utilities.css';

type TimeFilter = 'all' | 'weekly' | 'daily';

interface UserPosition {
    user_id: string;
    rank: number;
    points: number;
}

const LoadingSkeleton: React.FC = () => (
    <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
        ))}
    </div>
);

const EmptyState: React.FC = () => (
    <div className="text-center py-16">
        <div className="text-7xl mb-6">🏆</div>
        <h3 className="text-2xl font-black text-slate-700 mb-2">No rankings yet</h3>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Be the first to earn XP and top the leaderboard!
        </p>
        <Link
            to="/courses"
            className="clay-cta-primary inline-flex"
        >
            Start learning
        </Link>
    </div>
);

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="text-center py-16">
        <div className="text-6xl mb-6">😢</div>
        <h3 className="text-2xl font-black text-slate-700 mb-2">Could not load leaderboard</h3>
        <p className="text-slate-500 mb-6">Something went wrong. Please try again.</p>
        <button
            onClick={onRetry}
            className="clay-cta-primary inline-flex"
        >
            Try again
        </button>
    </div>
);

const TopThreePodium: React.FC<{ entries: LeaderboardEntry[]; currentUserId?: string }> = ({
    entries,
    currentUserId,
}) => {
    if (entries.length < 3) return null;

    const podiumOrder = [entries[1], entries[0], entries[2]];

    return (
        <div className="flex items-end justify-center gap-3 sm:gap-6 py-8">
            {podiumOrder.map((entry, visualIndex) => {
                const actualIndex = visualIndex === 1 ? 0 : visualIndex === 0 ? 1 : 2;
                const isCurrentUser = entry.user_id === currentUserId;
                const medalColor = actualIndex === 0 ? '#FFD700' : actualIndex === 1 ? '#C0C0C0' : '#CD7F32';
                const heightClass = actualIndex === 0 ? 'h-36 sm:h-44' : actualIndex === 1 ? 'h-28 sm:h-32' : 'h-20 sm:h-24';

                return (
                    <div
                        key={entry.user_id}
                        className={`flex flex-col items-center ${isCurrentUser ? 'ring-4 ring-yellow-400 ring-offset-2 rounded-2xl' : ''}`}
                    >
                        {/* Avatar */}
                        <div className="relative mb-2">
                            <div
                                className="w-14 h-14 sm:w-18 sm:h-18 rounded-full overflow-hidden border-4 border-white shadow-lg"
                                style={{ borderColor: medalColor }}
                            >
                                {entry.avatar_url ? (
                                    <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-2xl">👤</div>
                                )}
                            </div>
                            {/* Crown for first place */}
                            {actualIndex === 0 && (
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl">👑</span>
                            )}
                        </div>

                        {/* Podium block */}
                        <div
                            className={`${heightClass} w-20 sm:w-28 rounded-t-2xl flex flex-col items-center justify-end pb-3`}
                            style={{ background: `linear-gradient(145deg, ${medalColor}20, ${medalColor}40)` }}
                        >
                            <span className="text-3xl sm:text-4xl">{actualIndex === 0 ? '🥇' : actualIndex === 1 ? '🥈' : '🥉'}</span>
                            <div className="text-center px-1">
                                <div className="font-black text-sm sm:text-base text-slate-700 truncate max-w-full">{entry.username}</div>
                                <div className="text-xs font-bold text-slate-500">{entry.points} XP</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; position: number; isCurrentUser: boolean }> = ({
    entry,
    position,
    isCurrentUser,
}) => {
    const rankColor = position === 1 ? 'bg-yellow-400 text-white' : position === 2 ? 'bg-gray-300 text-gray-700' : position === 3 ? 'bg-orange-300 text-orange-800' : 'bg-gray-100 text-slate-600';

    return (
        <div
            className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl transition-all ${
                isCurrentUser ? 'bg-yellow-50 ring-2 ring-yellow-300' : 'bg-white hover:bg-gray-50'
            }`}
        >
            {/* Rank badge */}
            <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full font-black text-sm sm:text-base ${rankColor}`}>
                {position > 3 ? position : position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}
            </div>

            {/* Avatar */}
            <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-white shadow">
                    {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-lg sm:text-xl">👤</div>
                    )}
                </div>
                {isCurrentUser && (
                    <span className="absolute -bottom-1 -right-1 bg-green-400 text-white text-[10px] font-bold px-1 rounded-full border border-white">You</span>
                )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm sm:text-base truncate ${isCurrentUser ? 'text-yellow-700' : 'text-slate-700'}`}>
                    {entry.username}
                    {isCurrentUser && <span className="ml-1 text-xs font-medium text-yellow-600">(You)</span>}
                </div>
                {isCurrentUser && (
                    <div className="text-xs text-yellow-600 font-medium">Your rank: #{entry.rank || position}</div>
                )}
            </div>

            {/* Points */}
            <div className="shrink-0 text-right">
                <div className="text-base sm:text-lg font-black text-yellow-600">{entry.points.toLocaleString()}</div>
                <div className="text-xs text-slate-400">XP</div>
            </div>
        </div>
    );
};

export const Leaderboard: React.FC = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

    const fetchLeaderboard = useCallback(async () => {
        setIsLoading(true);
        setError(false);
        try {
            const data = await GamificationService.getLeaderboard();
            setEntries(data);

            // Find current user's position if logged in
            if (user?.id) {
                const myEntry = data.find((e) => e.user_id === user.id);
                if (myEntry) {
                    setUserPosition({
                        user_id: myEntry.user_id,
                        rank: myEntry.rank || data.indexOf(myEntry) + 1,
                        points: myEntry.points,
                    });
                }
            }
        } catch (err) {
            console.error('[Leaderboard] Failed to load:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    const handleRetry = () => {
        fetchLeaderboard();
    };

    // Top 3 for podium
    const topThree = entries.slice(0, 3);
    // Rest of the list
    const restEntries = entries.slice(3);

    return (
        <div className="min-h-screen clay-bg-playful pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
            {/* Header */}
            <div
                className="px-4 pt-6 pb-5"
                style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FF9F9F 100%)' }}
            >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                            <span>🏆</span> Leaderboard
                        </h1>
                        <p className="text-white/80 text-sm mt-1">See how you rank against other learners</p>
                    </div>
                    <button
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="self-start sm:self-auto p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors disabled:opacity-50"
                        style={{ minWidth: 44, minHeight: 44 }}
                        aria-label="Refresh leaderboard"
                    >
                        <span className={`text-xl ${isLoading ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                </div>

                {/* Time filter tabs */}
                <div className="flex gap-2 mt-4">
                    {(['all', 'weekly', 'daily'] as TimeFilter[]).map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setTimeFilter(filter)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                                timeFilter === filter
                                    ? 'bg-white text-yellow-700 shadow'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                        >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 sm:px-6 pt-4 space-y-6 max-w-2xl mx-auto">
                {/* User's rank card (if not in top 3) */}
                {userPosition && !topThree.find((e) => e.user_id === user?.id) && (
                    <div
                        className="p-4 rounded-2xl border-4 border-white shadow-lg"
                        style={{ background: 'linear-gradient(145deg, #FFF9E6, #FFF3CC)' }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400 font-black text-lg text-white">
                                    #{userPosition.rank}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700">Your Ranking</div>
                                    <div className="text-sm text-slate-500">Keep learning to climb!</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-yellow-600">{userPosition.points.toLocaleString()}</div>
                                <div className="text-xs text-slate-400">Total XP</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {isLoading && <LoadingSkeleton />}

                {/* Error state */}
                {!isLoading && error && <ErrorState onRetry={handleRetry} />}

                {/* Empty state */}
                {!isLoading && !error && entries.length === 0 && <EmptyState />}

                {/* Content */}
                {!isLoading && !error && entries.length > 0 && (
                    <>
                        {/* Top 3 Podium */}
                        {topThree.length >= 3 && (
                            <section className="bg-white rounded-3xl p-4 shadow-lg border-4 border-white">
                                <TopThreePodium entries={topThree} currentUserId={user?.id} />
                            </section>
                        )}

                        {/* Rest of the leaderboard */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-black text-slate-700 px-1">
                                {topThree.length < 3 ? 'Top Learners' : 'Other Rankings'}
                            </h2>
                            <div className="space-y-2">
                                {restEntries.map((entry, index) => (
                                    <LeaderboardRow
                                        key={entry.user_id}
                                        entry={entry}
                                        position={index + 4}
                                        isCurrentUser={entry.user_id === user?.id}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* CTA */}
                        <section className="text-center pt-4 pb-2">
                            <p className="text-slate-500 mb-4">Want to climb the ranks?</p>
                            <Link to="/courses" className="clay-cta-primary">
                                Start a lesson →
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
