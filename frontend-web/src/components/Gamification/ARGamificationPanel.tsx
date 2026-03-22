// src/components/Gamification/ARGamificationPanel.tsx
// Compact gamification UI for AR view - shows pet, XP, and quick leaderboard

import React, { useState, useEffect } from 'react';
import { VirtualPet } from './VirtualPet';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '@/hooks/usePets';
import { eventBus } from '@/runtime/EventBus';
import { apiClient } from '@/services/apiClient';

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
    onPetClick?: () => void;
}

export const ARGamificationPanel: React.FC<ARGamificationPanelProps> = ({
    onFeedPet,
    onPetClick
}) => {
    const { user } = useAuth();
    const userId = user?.id || null;
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [petHappiness, setPetHappiness] = useState(75);

    const { activePet } = usePets(userId);

    // Fetch stats
    useEffect(() => {
        const fetchStats = async () => {
            if (!userId) return;
            try {
                const data = await apiClient.get(`/api/v1/gamification/user/${userId}`);
                setStats(data);
                setPetHappiness(data.pet?.happiness || 75);
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
                    const data = await apiClient.get('/api/v1/gamification/leaderboard', {
                        params: { limit: 5 }
                    });
                    setLeaderboard(data.entries || []);
                } catch (e) {
                    console.log('[ARGamification] Leaderboard fetch failed');
                }
            };
            fetchLeaderboard();
        }
    }, [showLeaderboard]);

    const handleFeedPet = async () => {
        try {
            await apiClient.post('/api/v1/gamification/pet/feed', { user_id: userId });
            {
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
                zIndex: 400,
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
                        border: '3px solid #38bdf8'
                    }}
                >
                    <div
                        className="px-3 py-2 text-center"
                        style={{
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
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
                                    <span className="font-bold text-sky-700 text-sm">
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
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
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

            {/* Pet (compact) — tap to open chat */}
            <div
                onClick={() => {
                    const petName = activePet?.name || 'Buddy';
                    eventBus.emit('PET_CHAT_OPEN' as any, { petName, word: '' });
                    onPetClick?.();
                }}
                style={{ cursor: 'pointer' }}
                title={`Chat with ${activePet?.name || 'Buddy'}`}
            >
                <VirtualPet
                    petType={activePet?.category as any || 'bunny'}
                    thumbnailUrl={activePet?.thumbnail_url || undefined}
                    happiness={petHappiness}
                    name={activePet?.name || 'Buddy'}
                    onFeed={handleFeedPet}
                    compact={true}
                />
            </div>
        </div>
    );
};

export default ARGamificationPanel;
