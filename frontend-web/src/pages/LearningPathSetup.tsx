// src/pages/LearningPathSetup.tsx
// Enhanced learning path setup with daily goals and time settings
// Parent and kid-friendly interface

import React, { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

interface Topic {
    id: string;
    name: string;
    nameVi: string;
    emoji: string;
    wordCount: number;
    isPriority: boolean;
}

interface DailyGoals {
    timeGoalMins: number;
    wordsGoal: number;
}

const AVAILABLE_TOPICS: Topic[] = [
    { id: 'animals', name: 'Animals', nameVi: 'Animals', emoji: '🦁', wordCount: 15, isPriority: false },
    { id: 'colors', name: 'Colors', nameVi: 'Colors', emoji: '🌈', wordCount: 8, isPriority: false },
    { id: 'family', name: 'Family', nameVi: 'Family', emoji: '👨‍👩‍👧', wordCount: 12, isPriority: false },
    { id: 'nature', name: 'Nature', nameVi: 'Nature', emoji: '🌳', wordCount: 10, isPriority: false },
    { id: 'food', name: 'Food', nameVi: 'Food', emoji: '🍎', wordCount: 14, isPriority: false },
    { id: 'school', name: 'School', nameVi: 'School', emoji: '📚', wordCount: 11, isPriority: false },
    { id: 'body', name: 'Body Parts', nameVi: 'Body Parts', emoji: '🖐️', wordCount: 10, isPriority: false },
    { id: 'transport', name: 'Transport', nameVi: 'Transport', emoji: '🚗', wordCount: 9, isPriority: false },
];

const TIME_OPTIONS = [
    { value: 10, label: '10 mins', emoji: '⏱️', description: 'Quick session' },
    { value: 15, label: '15 mins', emoji: '⏰', description: 'Recommended' },
    { value: 20, label: '20 mins', emoji: '🕐', description: 'Standard' },
    { value: 30, label: '30 mins', emoji: '🕑', description: 'Deep learning' },
];

const WORDS_OPTIONS = [
    { value: 3, label: '3 words', emoji: '📖', description: 'Easy start' },
    { value: 5, label: '5 words', emoji: '📚', description: 'Recommended' },
    { value: 7, label: '7 words', emoji: '📕', description: 'Challenge' },
    { value: 10, label: '10 words', emoji: '📗', description: 'Pro learner' },
];

type SetupStep = 'topics' | 'goals' | 'complete';

export const LearningPathSetup: React.FC = () => {
    const [topics, setTopics] = useState<Topic[]>(AVAILABLE_TOPICS);
    const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
        timeGoalMins: 15,
        wordsGoal: 5,
    });
    const [step, setStep] = useState<SetupStep>('topics');
    const [savedMessage, setSavedMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { user } = useAuth();
    const userId = user?.id ?? '';

    // Load existing preferences on mount
    useEffect(() => {
        if (!userId) {
            return;
        }

        const loadPreferences = async () => {
            try {
                const data = await apiClient.get(`/api/v1/learning-path/${userId}`);
                if (data.preferences) {
                    // Update topics with saved priorities
                    if (data.preferences.priority_topics?.length > 0) {
                        setTopics(prev =>
                            prev.map(t => ({
                                ...t,
                                isPriority: data.preferences.priority_topics.includes(t.id)
                            }))
                        );
                    }
                    // Update goals
                    setDailyGoals({
                        timeGoalMins: data.preferences.daily_time_goal_mins || 15,
                        wordsGoal: data.preferences.daily_words_goal || 5,
                    });
                }
            } catch {
                console.log('[LearningPathSetup] Could not load preferences, using defaults');
            }
        };
        loadPreferences();
    }, [userId]);

    const togglePriority = useCallback((topicId: string) => {
        setTopics((prev) =>
            prev.map((t) =>
                t.id === topicId ? { ...t, isPriority: !t.isPriority } : t
            )
        );
        setSavedMessage(null);
    }, []);

    const handleSave = useCallback(async () => {
        if (!userId) {
            setSavedMessage('Sign in required to save learning path');
            return;
        }

        setIsLoading(true);
        const priorityTopics = topics.filter((t) => t.isPriority).map((t) => t.id);

        try {
            await apiClient.post('/api/v1/learning-path/preferences', {
                user_id: userId,
                priority_topics: priorityTopics,
                daily_time_goal_mins: dailyGoals.timeGoalMins,
                daily_words_goal: dailyGoals.wordsGoal,
                notifications_enabled: true,
            });

            setSavedMessage('Learning path saved!');
            setStep('complete');
        } catch {
            setSavedMessage('Saved locally');
        } finally {
            setIsLoading(false);
        }
    }, [topics, dailyGoals, userId]);

    const priorityCount = topics.filter((t) => t.isPriority).length;

    // Render based on current step
    return (
        <div
            className="min-h-screen pb-24"
            style={{
                background: step === 'complete'
                    ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)'
                    : 'linear-gradient(135deg, #fefce8 0%, #fff7ed 52%, #ecfeff 100%)',
            }}
        >
            {/* Progress Indicator */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex gap-2 mb-2">
                    {['topics', 'goals', 'complete'].map((s, i) => (
                        <div
                            key={s}
                            className="flex-1 h-2 rounded-full transition-all duration-300"
                            style={{
                                background: ['topics', 'goals', 'complete'].indexOf(step) >= i
                                    ? 'linear-gradient(90deg, #0ea5e9, #22c55e)'
                                    : '#e5e7eb'
                            }}
                        />
                    ))}
                </div>
                <p className="text-center text-slate-700 text-xs sm:text-sm font-bold">
                    Step {step === 'topics' ? 1 : step === 'goals' ? 2 : 3} of 3
                </p>
            </div>

            {step === 'topics' && (
                <TopicSelectionStep
                    topics={topics}
                    priorityCount={priorityCount}
                    togglePriority={togglePriority}
                    onNext={() => setStep('goals')}
                />
            )}

            {step === 'goals' && (
                <GoalSettingStep
                    dailyGoals={dailyGoals}
                    setDailyGoals={setDailyGoals}
                    onBack={() => setStep('topics')}
                    onSave={handleSave}
                    isLoading={isLoading}
                />
            )}

            {step === 'complete' && (
                <CompletionStep
                    topics={topics}
                    dailyGoals={dailyGoals}
                    savedMessage={savedMessage}
                    onRestart={() => setStep('topics')}
                />
            )}
        </div>
    );
};

// ========== Step Components ==========

interface TopicStepProps {
    topics: Topic[];
    priorityCount: number;
    togglePriority: (id: string) => void;
    onNext: () => void;
}

const TopicSelectionStep: React.FC<TopicStepProps> = ({
    topics,
    priorityCount,
    togglePriority,
    onNext,
}) => (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-amber-800">📚 Choose Topics</h1>
            <p className="text-amber-700 text-xs sm:text-sm">What do you want to learn?</p>
        </div>

        {/* Priority count */}
        <div
            className="mb-4 p-3 sm:p-4 rounded-2xl text-center"
            style={{
                background: 'rgba(255,255,255,0.9)',
                border: '3px solid #f59e0b',
            }}
        >
            <p className="text-amber-800 font-bold text-sm sm:text-base">
                {priorityCount === 0
                    ? '👆 Tap topics to prioritize'
                    : `${priorityCount} topic${priorityCount > 1 ? 's' : ''} selected`}
            </p>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-6">
            {topics.map((topic) => (
                <button
                    key={topic.id}
                    onClick={() => togglePriority(topic.id)}
                    className="p-3 sm:p-4 rounded-2xl text-left transition-all"
                    style={{
                        background: topic.isPriority
                            ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                            : 'rgba(255,255,255,0.9)',
                        border: topic.isPriority ? '4px solid #16a34a' : '3px solid #e5e7eb',
                        transform: topic.isPriority ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: topic.isPriority
                            ? '0 8px 20px rgba(34,197,94,0.3)'
                            : '0 2px 8px rgba(0,0,0,0.1)',
                        minHeight: 80,
                    }}
                >
                    <div className="flex items-start gap-2">
                        <span className="text-2xl sm:text-3xl flex-shrink-0">{topic.emoji}</span>
                        <div className="flex-1 min-w-0">
                            <div
                                className="font-bold text-xs sm:text-sm truncate"
                                style={{ color: topic.isPriority ? '#fff' : '#1f2937' }}
                            >
                                {topic.name}
                            </div>
                            <div
                                className="text-xs truncate"
                                style={{ color: topic.isPriority ? 'rgba(255,255,255,0.8)' : '#6b7280' }}
                            >
                                {topic.nameVi}
                            </div>
                            <div
                                className="text-xs mt-1"
                                style={{ color: topic.isPriority ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}
                            >
                                {topic.wordCount} words
                            </div>
                        </div>
                        {topic.isPriority && (
                            <span className="text-white text-lg sm:text-xl flex-shrink-0">✓</span>
                        )}
                    </div>
                </button>
            ))}
        </div>

        {/* Next Button */}
        <button
            onClick={onNext}
            disabled={priorityCount === 0}
            className="w-full py-3 sm:py-4 rounded-2xl font-bold text-base sm:text-lg"
            style={{
                background: priorityCount > 0
                    ? 'linear-gradient(135deg, #0ea5e9, #22c55e)'
                    : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                color: priorityCount > 0 ? '#fff' : '#9ca3af',
                border: priorityCount > 0 ? '4px solid #0284c7' : '3px solid #d1d5db',
                minHeight: 56,
            }}
        >
            Next: Set Daily Goals ➡️
        </button>
    </div>
);

interface GoalStepProps {
    dailyGoals: DailyGoals;
    setDailyGoals: React.Dispatch<React.SetStateAction<DailyGoals>>;
    onBack: () => void;
    onSave: () => void;
    isLoading: boolean;
}

const GoalSettingStep: React.FC<GoalStepProps> = ({
    dailyGoals,
    setDailyGoals,
    onBack,
    onSave,
    isLoading,
}) => (
    <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-amber-800">🎯 Daily Goals</h1>
            <p className="text-amber-700 text-xs sm:text-sm">How much time each day?</p>
        </div>

        {/* Time Goal */}
        <div
            className="mb-4 p-4 sm:p-5 rounded-2xl"
            style={{
                background: 'rgba(255,255,255,0.95)',
                border: '3px solid #0ea5e9',
            }}
        >
            <h3 className="text-sky-800 font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span>⏱️</span> Daily Time Goal
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {TIME_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setDailyGoals(prev => ({ ...prev, timeGoalMins: option.value }))}
                        className="p-2 sm:p-3 rounded-xl text-center transition-all"
                        style={{
                            background: dailyGoals.timeGoalMins === option.value
                                ? 'linear-gradient(135deg, #0ea5e9, #38bdf8)'
                                : '#f3f4f6',
                            border: dailyGoals.timeGoalMins === option.value
                                ? '3px solid #0284c7'
                                : '2px solid #e5e7eb',
                            minHeight: 64,
                        }}
                    >
                        <div className={`text-lg sm:text-xl mb-1`}>{option.emoji}</div>
                        <div
                            className="font-bold text-xs sm:text-sm"
                            style={{ color: dailyGoals.timeGoalMins === option.value ? '#fff' : '#374151' }}
                        >
                            {option.label}
                        </div>
                        <div
                            className="text-xs"
                            style={{ color: dailyGoals.timeGoalMins === option.value ? 'rgba(255,255,255,0.8)' : '#6b7280' }}
                        >
                            {option.description}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Words Goal */}
        <div
            className="mb-6 p-4 sm:p-5 rounded-2xl"
            style={{
                background: 'rgba(255,255,255,0.95)',
                border: '3px solid #22c55e',
            }}
        >
            <h3 className="text-green-800 font-bold mb-3 flex items-center gap-2 text-sm sm:text-base">
                <span>📚</span> Daily Words Goal
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {WORDS_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setDailyGoals(prev => ({ ...prev, wordsGoal: option.value }))}
                        className="p-2 sm:p-3 rounded-xl text-center transition-all"
                        style={{
                            background: dailyGoals.wordsGoal === option.value
                                ? 'linear-gradient(135deg, #22c55e, #4ade80)'
                                : '#f3f4f6',
                            border: dailyGoals.wordsGoal === option.value
                                ? '3px solid #16a34a'
                                : '2px solid #e5e7eb',
                            minHeight: 64,
                        }}
                    >
                        <div className={`text-lg sm:text-xl mb-1`}>{option.emoji}</div>
                        <div
                            className="font-bold text-xs sm:text-sm"
                            style={{ color: dailyGoals.wordsGoal === option.value ? '#fff' : '#374151' }}
                        >
                            {option.label}
                        </div>
                        <div
                            className="text-xs"
                            style={{ color: dailyGoals.wordsGoal === option.value ? 'rgba(255,255,255,0.8)' : '#6b7280' }}
                        >
                            {option.description}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Summary */}
        <div
            className="mb-6 p-4 sm:p-5 rounded-2xl text-center"
            style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: '3px solid #f59e0b',
            }}
        >
            <p className="text-amber-800 font-bold text-sm sm:text-base">Your Daily Goal:</p>
            <p className="text-amber-900 text-base sm:text-lg font-black mt-1">
                {dailyGoals.timeGoalMins} mins & {dailyGoals.wordsGoal} words/day
            </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
            <button
                onClick={onBack}
                className="flex-1 py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg"
                style={{
                    background: 'rgba(255,255,255,0.9)',
                    color: '#6b7280',
                    border: '3px solid #e5e7eb',
                    minHeight: 56,
                }}
            >
                ⬅️ Back
            </button>
            <button
                onClick={onSave}
                disabled={isLoading}
                className="flex-[2] py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg"
                style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #22c55e)',
                    color: '#fff',
                    border: '4px solid #0284c7',
                    boxShadow: '0 8px 20px rgba(14,165,233,0.35)',
                    minHeight: 56,
                    opacity: isLoading ? 0.7 : 1,
                }}
            >
                {isLoading ? '💾 Saving...' : '💾 Save & Start!'}
            </button>
        </div>
    </div>
);

interface CompletionStepProps {
    topics: Topic[];
    dailyGoals: DailyGoals;
    savedMessage: string | null;
    onRestart: () => void;
}

const CompletionStep: React.FC<CompletionStepProps> = ({
    topics,
    dailyGoals,
    savedMessage,
    onRestart,
}) => {
    const priorityTopics = topics.filter(t => t.isPriority);

    return (
        <div className="px-4 sm:px-6 pt-8 sm:pt-12">
            {/* Success Animation */}
            <div className="text-center mb-6 sm:mb-8">
                <div className="text-5xl sm:text-6xl mb-4 animate-bounce">🎉</div>
                <h1 className="text-xl sm:text-2xl font-black text-green-800">All Set!</h1>
                <p className="text-green-700 text-xs sm:text-sm">{savedMessage || 'Learning path saved!'}</p>
            </div>

            {/* Summary Card */}
            <div
                className="p-4 sm:p-5 rounded-2xl mb-6"
                style={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '3px solid #22c55e',
                }}
            >
                <h3 className="text-green-800 font-bold mb-3 text-sm sm:text-base">Your Learning Plan:</h3>
                
                <div className="space-y-3">
                    {/* Topics */}
                    <div className="flex flex-wrap gap-2">
                        {priorityTopics.map(topic => (
                            <span
                                key={topic.id}
                                className="px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-bold"
                                style={{
                                    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                    color: '#16a34a',
                                }}
                            >
                                {topic.emoji} {topic.name}
                            </span>
                        ))}
                    </div>
                    
                    {/* Goals */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-green-200">
                        <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl">⏱️</span>
                            <span className="font-bold text-green-800 text-sm sm:text-base">{dailyGoals.timeGoalMins} mins/day</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg sm:text-xl">📚</span>
                            <span className="font-bold text-green-800 text-sm sm:text-base">{dailyGoals.wordsGoal} words/day</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
                <button
                    onClick={() => window.location.href = '/learn'}
                    className="w-full py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-lg"
                    style={{
                        background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                        color: '#fff',
                        border: '4px solid #16a34a',
                        boxShadow: '0 8px 20px rgba(34,197,94,0.4)',
                        minHeight: 56,
                    }}
                >
                    🚀 Start Learning Now!
                </button>
                
                <button
                    onClick={onRestart}
                    className="w-full py-3 sm:py-4 rounded-2xl font-bold text-sm sm:text-base"
                    style={{
                        background: 'rgba(255,255,255,0.9)',
                        color: '#6b7280',
                        border: '2px solid #e5e7eb',
                        minHeight: 48,
                    }}
                >
                    ✏️ Edit Settings
                </button>
            </div>
        </div>
    );
};

export default LearningPathSetup;
