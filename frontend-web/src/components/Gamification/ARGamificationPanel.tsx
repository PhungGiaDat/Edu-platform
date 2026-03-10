// src/components/Gamification/ARGamificationPanel.tsx
// Compact gamification UI for AR view - shows pet, XP, and quick leaderboard

import React, { useState, useEffect } from 'react';
import { VirtualPet } from './VirtualPet';
import { getApiBase } from '../../config';
import { usePets } from '@/hooks/usePets';

const API_BASE = getApiBase();

interface UserStats {
    total_points: number;
    level: number;
    streak_days: number;
}

interface LeaderboardEntry {
    username: string;
    points: number;
    rank: number;
}

interface ARGamificationPanelProps {
    userId?: string;
    onFeedPet?: () => void;
}

export const ARGamificationPanel: React.FC<ARGamificationPanelProps> = ({
    userId = 'demo-user',
    onFeedPet
}) => {
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [petHappiness, setPetHappiness] = useState(75);

    const { activePet } = usePets(userId);

    // Fetch stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/gamification/user/${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                    setPetHappiness(data.pet?.happiness || 75);
                }
            } catch (e) {
                console.log('[ARGamification] Stats fetch failed');
            }
        };
        fetchStats();
    }, [userId]);

    // Fetch leaderboard
    useEffect(() => {
        if (showLeaderboard) {
            const fetchLeaderboard = async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/v1/gamification/leaderboard?limit=5`);
                    if (res.ok) {
                        const data = await res.json();
                        setLeaderboard(data.entries || []);
                    }
                } catch (e) {
                    console.log('[ARGamification] Leaderboard fetch failed');
                }
            };
            fetchLeaderboard();
        }
    }, [showLeaderboard]);

    const handleFeedPet = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/gamification/pet/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId })
            });
            if (res.ok) {
                setPetHappiness(prev => Math.min(100, prev + 10));
                onFeedPet?.();
            }
        } catch (e) {
            // Optimistic update
            setPetHappiness(prev => Math.min(100, prev + 5));
        }
    };

    return (
        <div
            className="fixed bottom-4 right-4 flex flex-col items-end gap-2"
            style={{
                zIndex: 150000,
                pointerEvents: 'auto'
            }}
        >
            {/* Leaderboard popup */}
            {showLeaderboard && (
                <div
                    className="rounded-2xl shadow-xl overflow-hidden mb-2"
                    style={{
                        width: 'min(280px, 80vw)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '3px solid #a78bfa'
                    }}
                >
                    <div
                        className="px-3 py-2 text-center"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)'
                        }}
                    >
                        <span className="text-white font-bold text-sm">🏆 Top Learners</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {leaderboard.length === 0 ? (
                            <p className="text-center text-gray-500 py-4 text-sm">Loading...</p>
                        ) : (
                            leaderboard.map((entry, i) => (
                                <div
                                    key={i}
                                    className="flex items-center px-3 py-2 border-b border-gray-100"
                                >
                                    <span
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2"
                                        style={{
                                            background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#f97316' : '#e5e7eb',
                                            color: i < 3 ? '#fff' : '#374151'
                                        }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="flex-1 font-semibold text-sm text-gray-800 truncate">
                                        {entry.username}
                                    </span>
                                    <span className="font-bold text-purple-600 text-sm">
                                        {entry.points} XP
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* XP / Level badge */}
            {stats && (
                <button
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                        border: '3px solid #fff',
                        WebkitTapHighlightColor: 'transparent'
                    }}
                >
                    <span className="text-xl">🏆</span>
                    <div className="text-left">
                        <div className="text-white font-bold text-xs">Lv.{stats.level}</div>
                        <div className="text-white/80 text-xs">{stats.total_points} XP</div>
                    </div>
                    <span className="text-white/70">
                        {showLeaderboard ? '▼' : '▲'}
                    </span>
                </button>
            )}

            {/* Pet (compact) */}
            <VirtualPet
                petType={activePet?.category as any || 'bunny'}
                thumbnailUrl={activePet?.thumbnail_url || undefined}
                happiness={petHappiness}
                name={activePet?.name || 'Buddy'}
                onFeed={handleFeedPet}
                compact={true}
            />
        </div>
    );
};

export default ARGamificationPanel;
