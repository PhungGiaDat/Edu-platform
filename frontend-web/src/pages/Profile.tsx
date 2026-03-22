import React from 'react';
import { Leaderboard } from '../components/Gamification/Leaderboard';
import { BadgeList } from '../components/Gamification/BadgeList';
import { useAuth } from '../contexts/AuthContext';

export const Profile: React.FC = () => {
    const { user } = useAuth();

    const username = user?.username || 'Learner';
    const userStats = {
        username,
        level: 5,
        total_points: 1250,
        streak_days: 12,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    };

    const badges = [
        { id: '1', name: 'Early Bird', description: 'Completed a lesson before 8am', icon_url: '' },
        { id: '2', name: 'Sharpshooter', description: '100% accuracy on a quiz', icon_url: '' },
        { id: '3', name: 'Scholar', description: 'Learned 50 new words', icon_url: '' },
    ];

    const leaderboard = [
        { user_id: '1', username, points: 1250, rank: 1, avatar_url: userStats.avatar_url },
        { user_id: '2', username: 'Sarah', points: 980, rank: 2 },
        { user_id: '3', username: 'Mike', points: 850, rank: 3 },
    ];

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                    'radial-gradient(circle at 14% 12%, rgba(14,165,233,0.17), transparent 42%), radial-gradient(circle at 88% 84%, rgba(245,158,11,0.16), transparent 40%), linear-gradient(135deg, #f8fbff 0%, #fff8e8 55%, #ecfeff 100%)',
            }}
        >
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 px-4 py-6 sm:px-6 lg:grid-cols-3 lg:gap-6">
                <div className="space-y-5 lg:col-span-2">
                    <section
                        className="rounded-3xl p-5 sm:p-6"
                        style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid #dbeafe', boxShadow: '0 10px 26px rgba(14,165,233,0.13)' }}
                    >
                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-sky-300 bg-white sm:h-28 sm:w-28">
                                <img src={userStats.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                            </div>
                            <div className="text-center sm:text-left">
                                <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{userStats.username}</h1>
                                <p className="mt-1 text-sm font-bold text-slate-500">Level {userStats.level} Scholar</p>
                                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">🔥 {userStats.streak_days} Day Streak</span>
                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-bold text-sky-700">⚡ {userStats.total_points} XP</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        className="rounded-3xl p-5 sm:p-6"
                        style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid #e2e8f0', boxShadow: '0 8px 22px rgba(2,132,199,0.08)' }}
                    >
                        <h2 className="mb-4 text-xl font-black text-slate-900">Badges</h2>
                        <BadgeList badges={badges} earnedBadgeIds={['1', '3']} />
                    </section>
                </div>

                <section
                    className="rounded-3xl p-4 sm:p-5"
                    style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid #e2e8f0', boxShadow: '0 8px 22px rgba(2,132,199,0.08)' }}
                >
                    <Leaderboard entries={leaderboard} />
                </section>
            </div>
        </div>
    );
};
