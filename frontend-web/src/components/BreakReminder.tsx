// src/components/BreakReminder.tsx
// Gentle break reminder overlay for kids

import React from 'react';

interface BreakReminderProps {
    remainingMins: number;
    isWarning: boolean;
    isLimitReached: boolean;
    onContinue?: () => void;
    onExtend?: (mins: number) => void;
    onExit?: () => void;
}

export const BreakReminder: React.FC<BreakReminderProps> = ({
    remainingMins,
    isWarning,
    isLimitReached,
    onContinue,
    onExtend,
    onExit,
}) => {
    if (!isWarning && !isLimitReached) return null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
                background: isLimitReached
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(248,113,113,0.95))'
                    : 'linear-gradient(135deg, rgba(251,191,36,0.95), rgba(253,224,71,0.95))',
                zIndex: 999999,
            }}
        >
            <div
                className="rounded-3xl p-6 text-center max-w-sm w-full"
                style={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '4px solid #fff',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                }}
            >
                {/* Icon */}
                <div className="text-6xl mb-4 animate-bounce">
                    {isLimitReached ? '😴' : '⏰'}
                </div>

                {/* Title */}
                <h2
                    className="font-black text-2xl mb-2"
                    style={{ color: isLimitReached ? '#dc2626' : '#d97706' }}
                >
                    {isLimitReached ? 'Time for a Break!' : 'Almost Break Time!'}
                </h2>

                {/* Message */}
                <p className="text-gray-600 text-sm mb-4">
                    {isLimitReached
                        ? "You've been learning for a while. Let's rest your eyes! 🌟"
                        : `Only ${remainingMins} minutes left. Great job learning! 🎉`}
                </p>

                {/* Actions */}
                <div className="space-y-2">
                    {!isLimitReached && onContinue && (
                        <button
                            onClick={onContinue}
                            className="w-full py-3 rounded-2xl font-bold text-white"
                            style={{
                                background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                                border: '3px solid #16a34a',
                            }}
                        >
                            ✨ Keep Learning!
                        </button>
                    )}

                    {isLimitReached && onExtend && (
                        <button
                            onClick={() => onExtend(10)}
                            className="w-full py-3 rounded-2xl font-bold text-white"
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                                border: '3px solid #2563eb',
                            }}
                        >
                            ➕ 10 More Minutes (Parent)
                        </button>
                    )}

                    <button
                        onClick={onExit}
                        className="w-full py-3 rounded-2xl font-bold"
                        style={{
                            background: isLimitReached
                                ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                                : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                            color: isLimitReached ? '#fff' : '#475569',
                            border: '3px solid ' + (isLimitReached ? '#16a34a' : '#cbd5e1'),
                        }}
                    >
                        {isLimitReached ? '🌈 Take a Break!' : '👋 Exit for Now'}
                    </button>
                </div>

                {/* Encouraging message */}
                <p className="text-xs text-gray-400 mt-4">
                    {isLimitReached
                        ? 'Rest is important for learning! Come back soon! 💕'
                        : 'You can always come back later! 💪'}
                </p>
            </div>
        </div>
    );
};

export default BreakReminder;
