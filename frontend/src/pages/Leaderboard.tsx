// src/pages/Leaderboard.tsx
// Standalone Leaderboard page for learner app - route: /leaderboard
// Vibrant claymorphism design with a trophy header, podium, and celebration elements

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { GamificationService, type LeaderboardEntry, type LeaderboardPeriod } from '../services/GamificationService';
import { useAuth } from '../contexts/AuthContext';
import { CodexPetSprite } from '@/features/pets/components/CodexPetSprite';
import '../styles/claymorphic-utilities.css';

interface UserPosition {
    user_id: string;
    rank: number;
    points: number;
}

const formatPoints = (points: number) => points.toLocaleString('en-US');

// Trophy SVG Component
const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 8H44V16C44 24.8366 36.8366 32 28 32H36C36 32 32 32 28 32H20C11.1634 32 4 24.8366 4 16V8H20Z" fill="var(--leaderboard-accent-coral)" stroke="var(--leaderboard-accent-coral-dark)" strokeWidth="2"/>
        <path d="M20 8H44V16C44 24.8366 36.8366 32 28 32H36C36 32 32 32 28 32H20C11.1634 32 4 24.8366 4 16V8H20Z" fill="url(#trophy-gradient)" />
        <path d="M8 8H16V12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12V8Z" fill="var(--leaderboard-accent-coral)"/>
        <path d="M48 8H56V12C56 14.2091 54.2091 16 52 16C49.7909 16 48 14.2091 48 12V8Z" fill="var(--leaderboard-accent-coral)"/>
        <path d="M22 32H42V36H22V32Z" fill="var(--leaderboard-accent-coral-dark)"/>
        <path d="M24 36H40V44H24V36Z" fill="var(--leaderboard-accent-coral)"/>
        <path d="M28 44H36V48H28V44Z" fill="var(--leaderboard-accent-coral-dark)"/>
        <path d="M26 48H38V52H26V48Z" fill="var(--leaderboard-accent-coral)" stroke="var(--leaderboard-accent-coral-dark)" strokeWidth="2"/>
        <defs>
            <linearGradient id="trophy-gradient" x1="4" y1="8" x2="44" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--leaderboard-accent-coral-soft)"/>
                <stop offset="1" stopColor="var(--leaderboard-accent-coral)"/>
            </linearGradient>
        </defs>
    </svg>
);

// Star/Sparkle SVG for celebrations
const SparkleIcon: React.FC<{ className?: string; color?: string }> = ({
    className,
    color = 'var(--leaderboard-accent-coral)',
}) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>
);

type PodiumRank = 1 | 2 | 3;

const RankMedalIcon: React.FC<{ rank: PodiumRank; className?: string }> = ({ rank, className = '' }) => {
    const label = rank === 1 ? '1st place medal' : rank === 2 ? '2nd place medal' : '3rd place medal';
    const colors = rank === 1
        ? {
            ribbon: 'var(--leaderboard-accent-teal-dark)',
            fill: 'var(--leaderboard-accent-teal-soft)',
            stroke: 'var(--leaderboard-accent-teal-dark)',
        }
        : rank === 2
            ? {
                ribbon: 'var(--leaderboard-accent-purple-dark)',
                fill: 'var(--leaderboard-accent-purple-soft)',
                stroke: 'var(--leaderboard-accent-purple-dark)',
            }
            : {
                ribbon: 'var(--leaderboard-accent-coral-dark)',
                fill: 'var(--leaderboard-accent-coral-soft)',
                stroke: 'var(--leaderboard-accent-coral-dark)',
            };

    return (
        <span
            className={`leaderboard-rank-medal leaderboard-rank-medal-${rank} ${className}`}
            role="img"
            aria-label={label}
        >
            <svg aria-hidden="true" viewBox="0 0 48 56" fill="none">
                <path d="M15 4h7l3 13-6 4-6-4L15 4Z" fill={colors.ribbon} />
                <path d="M26 4h7l3 13-6 4-6-4L26 4Z" fill={colors.ribbon} />
                <circle cx="24" cy="36" r="15" fill={colors.fill} stroke={colors.stroke} strokeWidth="3" />
                <text x="24" y="42" textAnchor="middle" fontSize="16" fontWeight="800" fill={colors.stroke}>{rank}</text>
            </svg>
        </span>
    );
};

const UserAvatarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20c.9-3.1 3.1-4.75 6.5-4.75S17.6 16.9 18.5 20" />
    </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11" />
        <path d="M3 4v7h7" />
        <path d="M4 13a8.1 8.1 0 0 0 14.8 3L21 13" />
        <path d="M21 20v-7h-7" />
    </svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4.5" width="18" height="16" rx="3" />
        <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
    </svg>
);

const BoltIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
    </svg>
);

const AlertIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3 9 16H3L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
    </svg>
);

// Crown SVG for 1st place
const CrownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 28H44L40 8L32 16L24 4L16 16L8 8L4 28Z" fill="var(--leaderboard-accent-purple)" stroke="var(--leaderboard-accent-purple-dark)" strokeWidth="2"/>
        <circle cx="12" cy="10" r="3" fill="var(--leaderboard-accent-purple-soft)"/>
        <circle cx="24" cy="6" r="3" fill="var(--leaderboard-accent-purple-soft)"/>
        <circle cx="36" cy="10" r="3" fill="var(--leaderboard-accent-purple-soft)"/>
        <rect x="4" y="28" width="40" height="4" rx="2" fill="var(--leaderboard-accent-purple-dark)"/>
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
    <div className="leaderboard-empty" role="status" aria-live="polite">
        <div className="leaderboard-empty-icon">
            <CodexPetSprite animationState="waving" label="Lexi, your leaderboard companion" size={112} />
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
    <div className="leaderboard-empty" role="alert" aria-live="assertive">
        <div className="leaderboard-empty-icon leaderboard-empty-icon-error" aria-hidden="true">
            <AlertIcon className="h-16 w-16" />
        </div>
        <h3 className="leaderboard-empty-title">Could not load leaderboard</h3>
        <p className="leaderboard-empty-text">Something went wrong. Please try again.</p>
        <button onClick={onRetry} className="clay-cta-primary leaderboard-cta">
            Try again
        </button>
    </div>
);

// Top 3 podium with kid-friendly claymorphism styling (memoized for performance)
const TopThreePodium: React.FC<{ entries: LeaderboardEntry[]; currentUserId?: string }> = React.memo(({
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
                <SparkleIcon className="sparkle sparkle-1" color="var(--leaderboard-accent-coral-soft)" />
                <SparkleIcon className="sparkle sparkle-2" color="var(--leaderboard-accent-teal)" />
                <SparkleIcon className="sparkle sparkle-3" color="var(--leaderboard-accent-purple-soft)" />
                <SparkleIcon className="sparkle sparkle-4" color="var(--leaderboard-accent-sky-soft)" />
                <SparkleIcon className="sparkle sparkle-5" color="var(--leaderboard-accent-coral)" />
            </div>

            <div className="leaderboard-podium">
                {podiumOrder.map((entry, visualIndex) => {
                    const actualRank = visualIndex === 1 ? 1 : visualIndex === 0 ? 2 : 3;
                    const isCurrentUser = entry.user_id === currentUserId;
                    const isFirst = actualRank === 1;
                    const isSecond = actualRank === 2;

                    const rankKey = isFirst ? 'first' : isSecond ? 'second' : 'third';

                    const avatarSizes = {
                        first: 'leaderboard-podium-avatar leaderboard-podium-avatar-first',
                        second: 'leaderboard-podium-avatar leaderboard-podium-avatar-second',
                        third: 'leaderboard-podium-avatar leaderboard-podium-avatar-third',
                    };
                    const podiumClasses = {
                        first: 'leaderboard-podium-block-first',
                        second: 'leaderboard-podium-block-second',
                        third: 'leaderboard-podium-block-third',
                    };

                    return (
                        <div
                            key={entry.user_id}
                            className={`leaderboard-podium-item ${isCurrentUser ? 'leaderboard-podium-item-current' : ''}`}
                        >
                            {/* Crown for first place */}
                            {isFirst && (
                                <div className="leaderboard-crown-container">
                                    <CrownIcon className="leaderboard-crown" />
                                    <RankMedalIcon rank={1} className="leaderboard-podium-medal" />
                                </div>
                            )}

                            {/* Avatar with rank-specific styling */}
                            <div className={`leaderboard-avatar-container ${isFirst ? 'leaderboard-avatar-first' : ''}`}>
                                <div
                                    className={`leaderboard-avatar-frame leaderboard-avatar-frame-${rankKey}`}
                                >
                                    <div className={avatarSizes[rankKey]}>
                                        {entry.avatar_url ? (
                                            <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserAvatarIcon className="leaderboard-avatar-fallback-icon" />
                                        )}
                                    </div>
                                </div>
                                {/* One semantic medal per podium rank */}
                                {!isFirst && (
                                    <RankMedalIcon
                                        rank={isSecond ? 2 : 3}
                                        className="leaderboard-podium-medal"
                                    />
                                )}
                            </div>

                            {/* Username */}
                            <div className={`leaderboard-podium-name ${isCurrentUser ? 'leaderboard-podium-name-current' : ''}`}>
                                {entry.username}
                            </div>

                            {/* Podium block */}
                            <div
                                className={`leaderboard-podium-block ${podiumClasses[rankKey]}`}
                            >
                                <div className="leaderboard-podium-points">
                                    {formatPoints(entry.points)} XP
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
});

// Leaderboard row (memoized for list performance)
const LeaderboardRow: React.FC<{
    entry: LeaderboardEntry;
    position: number;
    isCurrentUser: boolean;
}> = React.memo(({ entry, position, isCurrentUser }) => {
    // Keep rank styling semantic so the palette can evolve independently.
    const getRankBadge = () => {
        if (position === 1) return 'leaderboard-rank-first';
        if (position === 2) return 'leaderboard-rank-second';
        if (position === 3) return 'leaderboard-rank-third';
        return 'leaderboard-rank-default';
    };

    return (
        <div
            className={`leaderboard-row ${isCurrentUser ? 'leaderboard-row-current' : ''}`}
        >
            {/* Rank badge */}
            <div className={`leaderboard-rank ${getRankBadge()}`}>
                {position <= 3 ? (
                    <RankMedalIcon rank={position as PodiumRank} className="leaderboard-row-medal" />
                ) : (
                    <span className="font-black">{position}</span>
                )}
            </div>

            {/* Avatar */}
            <div className="leaderboard-row-avatar-wrap">
                <div className={`leaderboard-row-avatar-frame ${isCurrentUser ? 'leaderboard-row-avatar-frame-current' : ''}`}>
                    {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="leaderboard-row-avatar-fallback">
                            <UserAvatarIcon className="leaderboard-avatar-fallback-icon leaderboard-avatar-fallback-icon-small" />
                        </div>
                    )}
                </div>
                {/* "You" indicator */}
                {isCurrentUser && (
                    <span className="leaderboard-you-badge">
                        YOU
                    </span>
                )}
            </div>

            {/* Name and info */}
            <div className="flex-1 min-w-0">
                <div className={`leaderboard-row-name ${isCurrentUser ? 'leaderboard-row-name-current' : ''}`}>
                    {entry.username}
                    {isCurrentUser && (
                        <span className="leaderboard-row-you-label">(You)</span>
                    )}
                </div>
                {isCurrentUser && (
                    <div className="leaderboard-row-detail">
                        <SparkleIcon className="leaderboard-row-detail-icon" color="var(--leaderboard-accent-teal-dark)" /> Your rank: #{entry.rank || position}
                    </div>
                )}
            </div>

            {/* XP display */}
            <div className="shrink-0 text-right">
                <div className="leaderboard-xp">
                    <SparkleIcon className="leaderboard-xp-icon" color="var(--leaderboard-accent-coral)" />
                    <span className="leaderboard-xp-value">
                        {formatPoints(entry.points)}
                    </span>
                </div>
                <div className="leaderboard-xp-label">XP</div>
            </div>
        </div>
    );
});

// Time Filter Tabs
const TimeFilterTabs: React.FC<{
    active: LeaderboardPeriod;
    onChange: (filter: LeaderboardPeriod) => void;
}> = ({ active, onChange }) => {
    const filters: { key: LeaderboardPeriod; label: string; icon: React.ReactNode }[] = [
        { key: 'all', label: 'All Time', icon: <TrophyIcon className="h-4 w-4" /> },
        { key: 'weekly', label: 'Weekly', icon: <CalendarIcon className="h-4 w-4" /> },
        { key: 'daily', label: 'Daily', icon: <BoltIcon className="h-4 w-4" /> },
    ];

    const focusTab = (key: LeaderboardPeriod) => {
        onChange(key);
        requestAnimationFrame(() => document.getElementById(`tab-${key}`)?.focus());
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % filters.length;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + filters.length) % filters.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = filters.length - 1;

        if (nextIndex !== index) {
            event.preventDefault();
            focusTab(filters[nextIndex].key);
        }
    };

    return (
        <div className="leaderboard-filters" role="tablist" aria-label="Filter leaderboard by time period">
            {filters.map((filter, index) => (
                <button
                    key={filter.key}
                    onClick={() => onChange(filter.key)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className={`leaderboard-filter-btn ${active === filter.key ? 'leaderboard-filter-btn-active' : ''}`}
                    role="tab"
                    aria-selected={active === filter.key}
                    aria-controls="leaderboard-content"
                    id={`tab-${filter.key}`}
                    tabIndex={active === filter.key ? 0 : -1}
                >
                    <span aria-hidden="true">{filter.icon}</span>
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
    const [timeFilter, setTimeFilter] = useState<LeaderboardPeriod>('all');

    const fetchLeaderboard = useCallback(async (period: LeaderboardPeriod = timeFilter) => {
        setIsLoading(true);
        setError(false);
        setUserPosition(null);
        try {
            const data = await GamificationService.getLeaderboard(period);
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
                } else {
                    try {
                        const rank = await GamificationService.getUserRank(user.id, period);
                        if (rank.rank !== null) {
                            setUserPosition({
                                user_id: rank.user_id,
                                rank: rank.rank,
                                points: rank.points,
                            });
                        }
                    } catch (rankError) {
                        console.warn('[Leaderboard] Failed to load current user rank:', rankError);
                    }
                }
            }
        } catch (err) {
            console.error('[Leaderboard] Failed to load:', err);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    }, [timeFilter, user?.id]);

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
    const listEntries = topThree.length < 3 ? entries : restEntries;
    const pointsLabel = timeFilter === 'all' ? 'Total XP' : timeFilter === 'weekly' ? 'Weekly XP' : 'Daily XP';

    return (
        <div className="leaderboard-page min-h-screen">
            {/* Duolingo-inspired Trophy Header */}
            <div className="leaderboard-header">
                {/* Decorative elements */}
                <div className="leaderboard-header-decoration leaderboard-header-decoration-left" aria-hidden="true">
                    <SparkleIcon className="w-6 h-6 animate-pulse" color="var(--leaderboard-accent-coral-soft)" />
                </div>
                <div className="leaderboard-header-decoration leaderboard-header-decoration-right" aria-hidden="true">
                    <SparkleIcon className="w-4 h-4 animate-pulse" color="var(--leaderboard-accent-teal-soft)" />
                </div>

                <div className="leaderboard-header-content">
                    <div className="leaderboard-heading">
                        {/* Lexi mascot */}
                        <div className="leaderboard-mascot-container">
                            <CodexPetSprite
                                animationState="waving"
                                label="Lexi cheering for the leaderboard"
                                size={68}
                            />
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
                        <RefreshIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Time filter tabs */}
                <TimeFilterTabs active={timeFilter} onChange={setTimeFilter} />
            </div>

            <div id="leaderboard-content" className="leaderboard-content" aria-busy={isLoading}>
                {/* User's rank card (if not in top 3) */}
                {userPosition && !topThree.find((e) => e.user_id === user?.id) && (
                    <div className="leaderboard-user-card">
                        <div className="flex items-center gap-4">
                            <div className="leaderboard-user-rank">
                                #{userPosition.rank}
                            </div>
                            <div className="flex-1">
                                <div className="leaderboard-user-title">Your Ranking</div>
                                <div className="leaderboard-user-detail">
                                    <SparkleIcon className="leaderboard-user-detail-icon" color="var(--leaderboard-accent-coral)" /> Keep learning to climb!
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="leaderboard-user-xp">
                                    {formatPoints(userPosition.points)}
                                </div>
                                <div className="leaderboard-user-xp-label">{pointsLabel}</div>
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
                                <span className="leaderboard-section-count">{listEntries.length} learners</span>
                            </h2>
                            <div className="leaderboard-list">
                                {listEntries.map((entry, index) => (
                                    <LeaderboardRow
                                        key={entry.user_id}
                                        entry={entry}
                                        position={topThree.length < 3 ? index + 1 : index + 4}
                                        isCurrentUser={entry.user_id === user?.id}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* CTA */}
                        <section className="leaderboard-cta-section" aria-label="Call to action">
                            <p className="leaderboard-cta-text">Want to climb the ranks?</p>
                            <Link to="/courses" className="clay-cta-primary leaderboard-cta-btn">
                                <span>Start a lesson</span>
                                <span aria-hidden="true" className="text-lg">→</span>
                            </Link>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
