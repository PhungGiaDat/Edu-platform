// src/pages/Leaderboard.tsx
// Standalone Leaderboard page for learner app - route: /leaderboard
// Duolingo-inspired design with trophy header, enhanced podium, and celebration elements

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GamificationService, type LeaderboardEntry } from '../services/GamificationService';
import { useAuth } from '../contexts/AuthContext';
import '../styles/claymorphic-utilities.css';

type TimeFilter = 'all' | 'weekly' | 'daily';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

interface UserPosition {
    user_id: string;
    rank: number;
    points: number;
}

// Trophy SVG Component
const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 8H44V16C44 24.8366 36.8366 32 28 32H36C36 32 32 32 28 32H20C11.1634 32 4 24.8366 4 16V8H20Z" fill="#FFD93D" stroke="#E5B800" strokeWidth="2"/>
        <path d="M20 8H44V16C44 24.8366 36.8366 32 28 32H36C36 32 32 32 28 32H20C11.1634 32 4 24.8366 4 16V8H20Z" fill="url(#trophy-gradient)" />
        <path d="M8 8H16V12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12V8Z" fill="#FFD93D"/>
        <path d="M48 8H56V12C56 14.2091 54.2091 16 52 16C49.7909 16 48 14.2091 48 12V8Z" fill="#FFD93D"/>
        <path d="M22 32H42V36H22V32Z" fill="#E5B800"/>
        <path d="M24 36H40V44H24V36Z" fill="#FFD93D"/>
        <path d="M28 44H36V48H28V44Z" fill="#E5B800"/>
        <path d="M26 48H38V52H26V48Z" fill="#FFD93D" stroke="#E5B800" strokeWidth="2"/>
        <defs>
            <linearGradient id="trophy-gradient" x1="4" y1="8" x2="44" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFE066"/>
                <stop offset="1" stopColor="#FFD93D"/>
            </linearGradient>
        </defs>
    </svg>
);

// Star/Sparkle SVG for celebrations
const SparkleIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = '#FFD93D' }) => (
    <svg className={className} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
);

// Crown SVG for 1st place
const CrownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 28H44L40 8L32 16L24 4L16 16L8 8L4 28Z" fill="#FFD93D" stroke="#E5B800" strokeWidth="2"/>
        <circle cx="12" cy="10" r="3" fill="#FFD93D"/>
        <circle cx="24" cy="6" r="3" fill="#FFD93D"/>
        <circle cx="36" cy="10" r="3" fill="#FFD93D"/>
        <rect x="4" y="28" width="40" height="4" rx="2" fill="#E5B800"/>
    </svg>
);

// Loading skeleton
const LoadingSkeleton: React.FC = () => (
    <div className="leaderboard-skeleton">
        <div className="leaderboard-skeleton-podium">
            {[1, 2, 3].map((i) => (
                <div key={i} className="leaderboard-skeleton-podium-item">
                    <div className="leaderboard-skeleton-avatar" />
                    <div className="leaderboard-skeleton-block" />
                </div>
            ))}
        </div>
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="leaderboard-skeleton-row">
                    <div className="leaderboard-skeleton-rank" />
                    <div className="leaderboard-skeleton-avatar-small" />
                    <div className="leaderboard-skeleton-text" />
                    <div className="leaderboard-skeleton-xp" />
                </div>
            ))}
        </div>
    </div>
);

// Empty state
const EmptyState: React.FC = () => (
    <div className="leaderboard-empty">
        <div className="leaderboard-empty-icon">
            <TrophyIcon className="w-24 h-24" />
        </div>
        <h3 className="leaderboard-empty-title">No rankings yet</h3>
        <p className="leaderboard-empty-text">
            Be the first to earn XP and top the leaderboard!
        </p>
        <Link to="/courses" className="clay-cta-primary leaderboard-cta">
            Start learning
        </Link>
    </div>
);

// Error state
const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
    <div className="leaderboard-empty">
        <div className="leaderboard-empty-icon leaderboard-empty-icon-error">😢</div>
        <h3 className="leaderboard-empty-title">Could not load leaderboard</h3>
        <p className="leaderboard-empty-text">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="clay-cta-primary leaderboard-cta">
            Try again
        </button>
    </div>
);

// Enhanced Top 3 Podium with Duolingo styling
const TopThreePodium: React.FC<{ entries: LeaderboardEntry[]; currentUserId?: string }> = ({
    entries,
    currentUserId,
}) => {
    if (entries.length < 3) return null;

    // Order: 2nd (left), 1st (center), 3rd (right)
    const podiumOrder = [entries[1], entries[0], entries[2]];

    return (
        <div className="leaderboard-podium-wrapper">
            {/* Celebration sparkles */}
            <div className="leaderboard-sparkles">
                <SparkleIcon className="sparkle sparkle-1" color="#FFE066" />
                <SparkleIcon className="sparkle sparkle-2" color="#FFD93D" />
                <SparkleIcon className="sparkle sparkle-3" color="#FFCA28" />
                <SparkleIcon className="sparkle sparkle-4" color="#FFE066" />
                <SparkleIcon className="sparkle sparkle-5" color="#FFD93D" />
            </div>

            <div className="leaderboard-podium">
                {podiumOrder.map((entry, visualIndex) => {
                    const actualRank = visualIndex === 1 ? 1 : visualIndex === 0 ? 2 : 3;
                    const isCurrentUser = entry.user_id === currentUserId;
                    const isFirst = actualRank === 1;
                    const isSecond = actualRank === 2;
                    const isThird = actualRank === 3;

                    // Duolingo-style colors
                    const colors = {
                        first: { bg: 'bg-gradient-to-b from-[#FFE066] to-[#FFD93D]', border: '#E5B800', text: '#1A2744' },
                        second: { bg: 'bg-gradient-to-b from-[#E8E8E8] to-[#C0C0C0]', border: '#A0A0A0', text: '#1A2744' },
                        third: { bg: 'bg-gradient-to-b from-[#FFCC99] to-[#CD7F32]', border: '#B87333', text: '#FFFFFF' },
                    };
                    const colorSet = isFirst ? colors.first : isSecond ? colors.second : colors.third;

                    // Height based on rank
                    const heights = { first: 'h-44', second: 'h-32', third: 'h-24' };
                    const avatarSizes = { first: 'w-20 h-20', second: 'w-16 h-16', third: 'w-14 h-14' };
                    const podiumHeights = { first: 'h-36', second: 'h-28', third: 'h-20' };

                    return (
                        <div
                            key={entry.user_id}
                            className={`leaderboard-podium-item ${isCurrentUser ? 'leaderboard-podium-item-current' : ''}`}
                        >
                            {/* Crown for first place */}
                            {isFirst && (
                                <div className="leaderboard-crown-container">
                                    <CrownIcon className="leaderboard-crown" />
                                    <div className="leaderboard-medal">👑</div>
                                </div>
                            )}

                            {/* Avatar with rank-specific styling */}
                            <div className={`leaderboard-avatar-container ${isFirst ? 'leaderboard-avatar-first' : ''}`}>
                                <div
                                    className={`rounded-full overflow-hidden border-4 ${isFirst ? 'ring-4 ring-[#FFE066] ring-offset-2' : ''}`}
                                    style={{
                                        borderColor: isSecond ? '#C0C0C0' : isThird ? '#CD7F32' : '#FFD93D',
                                        boxShadow: isFirst ? '0 0 20px rgba(255, 217, 61, 0.5)' : 'none'
                                    }}
                                >
                                    <div className={`${avatarSizes[actualRank as keyof typeof avatarSizes]} bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center overflow-hidden`}>
                                        {entry.avatar_url ? (
                                            <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">{isFirst ? '🥇' : isSecond ? '🥈' : '🥉'}</span>
                                        )}
                                    </div>
                                </div>
                                {/* Medal emoji for 2nd and 3rd */}
                                {!isFirst && (
                                    <div className={`leaderboard-medal leaderboard-medal-${actualRank}`}>
                                        {isSecond ? '🥈' : '🥉'}
                                    </div>
                                )}
                            </div>

                            {/* Username */}
                            <div className={`font-black text-sm mt-2 truncate max-w-[80px] ${isCurrentUser ? 'text-yellow-600' : 'text-slate-700'}`}>
                                {entry.username}
                            </div>

                            {/* Podium block */}
                            <div
                                className={`${podiumHeights[actualRank as keyof typeof podiumHeights]} w-24 sm:w-28 rounded-t-3xl mt-3 flex flex-col items-center justify-end pb-4 ${colorSet.bg} border-t-4`}
                                style={{ borderColor: colorSet.border }}
                            >
                                <div className={`text-lg font-black ${isThird ? 'text-white' : colorSet.text}`}>
                                    {entry.points.toLocaleString()} XP
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rank labels */}
            <div className="leaderboard-podium-labels">
                <span className="leaderboard-podium-label leaderboard-podium-label-2">2nd</span>
                <span className="leaderboard-podium-label leaderboard-podium-label-1">1st</span>
                <span className="leaderboard-podium-label leaderboard-podium-label-3">3rd</span>
            </div>
        </div>
    );
};

// Enhanced Leaderboard Row
const LeaderboardRow: React.FC<{
    entry: LeaderboardEntry;
    position: number;
    isCurrentUser: boolean;
}> = ({ entry, position, isCurrentUser }) => {
    // Duolingo-style rank badges
    const getRankBadge = () => {
        if (position === 1) return 'leaderboard-rank-gold';
        if (position === 2) return 'leaderboard-rank-silver';
        if (position === 3) return 'leaderboard-rank-bronze';
        return 'leaderboard-rank-default';
    };

    return (
        <div
            className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row-current' : ''}`}
        >
            {/* Rank badge */}
            <div className={`leaderboard-rank ${getRankBadge()}`}>
                {position <= 3 ? (
                    <span className="text-lg">{position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'}</span>
                ) : (
                    <span className="font-black">{position}</span>
                )}
            </div>

            {/* Avatar */}
            <div className="relative shrink-0">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 ${
                    isCurrentUser ? 'border-green-400 ring-2 ring-green-200' : 'border-white shadow'
                }`}>
                    {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 text-xl">
                            👤
                        </div>
                    )}
                </div>
                {/* "You" indicator */}
                {isCurrentUser && (
                    <span className="absolute -bottom-1 -right-1 bg-green-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-sm">
                        YOU
                    </span>
                )}
            </div>

            {/* Name and info */}
            <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm sm:text-base truncate ${isCurrentUser ? 'text-green-700' : 'text-slate-700'}`}>
                    {entry.username}
                    {isCurrentUser && (
                        <span className="ml-1 text-xs font-medium text-green-600">(You)</span>
                    )}
                </div>
                {isCurrentUser && (
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <span>⭐</span> Your rank: #{entry.rank || position}
                    </div>
                )}
            </div>

            {/* XP display with Duolingo styling */}
            <div className="shrink-0 text-right">
                <div className="leaderboard-xp">
                    <span className="leaderboard-xp-icon">⭐</span>
                    <span className="font-black text-base sm:text-lg text-yellow-600">
                        {entry.points.toLocaleString()}
                    </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">XP</div>
            </div>
        </div>
    );
};

// Time Filter Tabs
const TimeFilterTabs: React.FC<{
    active: TimeFilter;
    onChange: (filter: TimeFilter) => void;
}> = ({ active, onChange }) => {
    const filters: { key: TimeFilter; label: string; icon: string }[] = [
        { key: 'all', label: 'All Time', icon: '🏆' },
        { key: 'weekly', label: 'Weekly', icon: '📅' },
        { key: 'daily', label: 'Daily', icon: '⚡' },
    ];

    return (
        <div className="leaderboard-filters">
            {filters.map((filter) => (
                <button
                    key={filter.key}
                    onClick={() => onChange(filter.key)}
                    className={`leaderboard-filter-btn ${active === filter.key ? 'leaderboard-filter-btn-active' : ''}`}
                >
                    <span>{filter.icon}</span>
                    <span>{filter.label}</span>
                </button>
            ))}
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
        <div className="min-h-screen pb-24 md:pb-8 md:pl-24 lg:pl-72">
            {/* Duolingo-inspired Trophy Header */}
            <div className="leaderboard-header">
                {/* Decorative elements */}
                <div className="leaderboard-header-decoration leaderboard-header-decoration-left">
                    <SparkleIcon className="w-6 h-6 animate-pulse" color="#FFE066" />
                </div>
                <div className="leaderboard-header-decoration leaderboard-header-decoration-right">
                    <SparkleIcon className="w-4 h-4 animate-pulse" color="#FFE066" />
                </div>

                <div className="leaderboard-header-content">
                    <div className="flex items-center gap-4">
                        {/* Trophy icon */}
                        <div className="leaderboard-trophy-container">
                            <TrophyIcon className="leaderboard-trophy" />
                        </div>

                        <div>
                            <h1 className="leaderboard-title">
                                Leaderboard
                            </h1>
                            <p className="leaderboard-subtitle">
                                See how you rank against other learners
                            </p>
                        </div>
                    </div>

                    {/* Refresh button */}
                    <button
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="leaderboard-refresh-btn"
                        aria-label="Refresh leaderboard"
                    >
                        <span className={`text-xl ${isLoading ? 'animate-spin' : ''}`}>🔄</span>
                    </button>
                </div>

                {/* Time filter tabs */}
                <TimeFilterTabs active={timeFilter} onChange={setTimeFilter} />
            </div>

            <div className="leaderboard-content">
                {/* User's rank card (if not in top 3) */}
                {userPosition && !topThree.find((e) => e.user_id === user?.id) && (
                    <div className="leaderboard-user-card">
                        <div className="flex items-center gap-4">
                            <div className="leaderboard-user-rank">
                                #{userPosition.rank}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-slate-700">Your Ranking</div>
                                <div className="text-sm text-slate-500 flex items-center gap-1">
                                    <span>⭐</span> Keep learning to climb!
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="leaderboard-user-xp">
                                    {userPosition.points.toLocaleString()}
                                </div>
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
                        {/* Top 3 Podium - Only show if we have 3+ entries */}
                        {topThree.length >= 3 && (
                            <section className="leaderboard-podium-section">
                                <TopThreePodium entries={topThree} currentUserId={user?.id} />
                            </section>
                        )}

                        {/* Rest of the leaderboard */}
                        <section className="leaderboard-list-section">
                            <h2 className="leaderboard-section-title">
                                {topThree.length < 3 ? 'Top Learners' : 'Other Rankings'}
                                <span className="leaderboard-section-count">{restEntries.length} learners</span>
                            </h2>
                            <div className="leaderboard-list">
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
                        <section className="leaderboard-cta-section">
                            <p className="leaderboard-cta-text">Want to climb the ranks?</p>
                            <Link to="/courses" className="clay-cta-primary leaderboard-cta-btn">
                                <span>Start a lesson</span>
                                <span className="text-lg">→</span>
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
