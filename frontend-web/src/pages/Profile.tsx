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
        <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column - Stats */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                {/* Profile Header */}
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border-2 border-neutral-200 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-neutral-100 border-4 border-secondary overflow-hidden flex-shrink-0">
                        <img src={userStats.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-center sm:text-left flex-1">
                        <h1 className="text-2xl sm:text-3xl font-black text-neutral-800">{userStats.username}</h1>
                        <p className="text-neutral-400 font-bold text-sm mt-1">Level {userStats.level} Scholar</p>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-3 sm:mt-4">
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <span className="text-lg sm:text-2xl">🔥</span>
                                <span className="font-bold text-neutral-600 text-sm sm:text-base">{userStats.streak_days} Day Streak</span>
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                <span className="text-lg sm:text-2xl">⚡</span>
                                <span className="font-bold text-neutral-600 text-sm sm:text-base">{userStats.total_points} XP</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges */}
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border-2 border-neutral-200">
                    <h2 className="text-lg sm:text-xl font-black text-neutral-800 mb-4 sm:mb-6">Badges</h2>
                    <BadgeList badges={badges} earnedBadgeIds={['1', '3']} />
                </div>
            </div>

            {/* Right Column - Leaderboard */}
            <div className="space-y-6 sm:space-y-8">
                <Leaderboard entries={leaderboard} />
            </div>
        </div>
    );
};
