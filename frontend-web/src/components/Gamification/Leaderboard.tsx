import React from 'react';
import { LeaderboardEntry } from '../../services/GamificationService';

interface LeaderboardProps {
    entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
    return (
        <div className="bg-white rounded-3xl border-2 border-neutral-200 overflow-hidden">
            <div className="bg-accent p-4 text-center">
                <h3 className="text-white font-black text-xl tracking-wider uppercase">Leaderboard</h3>
            </div>
            <div className="divide-y-2 divide-neutral-100">
                {entries.map((entry, index) => (
                    <div key={entry.user_id} className="flex items-center p-4 hover:bg-neutral-50 transition-colors">
                        <div className={`w-8 h-8 flex items-center justify-center font-black text-lg mr-4 ${index === 0 ? 'text-accent' :
                            index === 1 ? 'text-neutral-400' :
                                index === 2 ? 'text-orange-400' : 'text-neutral-800'
                            }`}>
                            {index + 1}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-neutral-200 mr-3 overflow-hidden">
                            {entry.avatar_url ? (
                                <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-neutral-800">{entry.username}</h4>
                        </div>
                        <div className="font-bold text-accent-dark">
                            {entry.points} XP
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
