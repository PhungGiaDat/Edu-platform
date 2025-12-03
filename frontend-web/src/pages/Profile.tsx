import React from 'react';
import { Leaderboard } from '../components/Gamification/Leaderboard';
import { BadgeList } from '../components/Gamification/BadgeList';

export const Profile: React.FC = () => {
    // Mock Data
    const userStats = {
        username: "Daniel",
        level: 5,
        total_points: 1250,
        streak_days: 12,
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel"
    };

    const badges = [
        { id: '1', name: 'Early Bird', description: 'Completed a lesson before 8am', icon_url: '' },
        { id: '2', name: 'Sharpshooter', description: '100% accuracy on a quiz', icon_url: '' },
        { id: '3', name: 'Scholar', description: 'Learned 50 new words', icon_url: '' },
    ];

    const leaderboard = [
        { user_id: '1', username: 'Daniel', points: 1250, rank: 1, avatar_url: userStats.avatar_url },
        { user_id: '2', username: 'Sarah', points: 980, rank: 2 },
        { user_id: '3', username: 'Mike', points: 850, rank: 3 },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Stats */}
            <div className="lg:col-span-2 space-y-8">
                {/* Profile Header */}
                <div className="bg-white p-8 rounded-3xl border-2 border-neutral-200 flex items-center gap-6">
                    <div className="w-32 h-32 rounded-full bg-neutral-100 border-4 border-secondary overflow-hidden">
                        <img src={userStats.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-neutral-800">{userStats.username}</h1>
                        <p className="text-neutral-400 font-bold">Level {userStats.level} Scholar</p>
                        <div className="flex gap-4 mt-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🔥</span>
                                <span className="font-bold text-neutral-600">{userStats.streak_days} Day Streak</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚡</span>
                                <span className="font-bold text-neutral-600">{userStats.total_points} XP</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="bg-white p-8 rounded-3xl border-2 border-neutral-200">
                    <h2 className="text-xl font-black text-neutral-800 mb-6">Badges</h2>
                    <BadgeList badges={badges} earnedBadgeIds={['1', '3']} />
                </div>
            </div>

            {/* Right Column - Leaderboard */}
            <div className="space-y-8">
                <Leaderboard entries={leaderboard} />
            </div>
        </div>
    );
};
