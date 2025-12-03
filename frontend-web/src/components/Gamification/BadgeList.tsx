import React from 'react';
import { Badge } from '../../services/GamificationService';

interface BadgeListProps {
    badges: Badge[];
    earnedBadgeIds: string[];
}

export const BadgeList: React.FC<BadgeListProps> = ({ badges, earnedBadgeIds }) => {
    return (
        <div className="grid grid-cols-3 gap-4">
            {badges.map((badge) => {
                const isEarned = earnedBadgeIds.includes(badge.id);
                return (
                    <div key={badge.id} className="flex flex-col items-center text-center group">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-2 transition-all duration-300 ${isEarned
                            ? 'bg-accent text-white shadow-lg scale-100'
                            : 'bg-neutral-200 text-neutral-400 grayscale opacity-50'
                            }`}>
                            {badge.icon_url ? <img src={badge.icon_url} alt={badge.name} className="w-12 h-12" /> : '🏆'}
                        </div>
                        <h4 className={`font-bold text-sm ${isEarned ? 'text-neutral-800' : 'text-neutral-400'}`}>
                            {badge.name}
                        </h4>
                        <div className="opacity-0 group-hover:opacity-100 absolute bg-black/80 text-white text-xs p-2 rounded-lg -mt-12 transition-opacity pointer-events-none z-10 w-32">
                            {badge.description}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
