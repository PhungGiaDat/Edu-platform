// components/CourseMap.tsx
/**
 * Learning Path Course Map - Duolingo-inspired
 * 
 * Features:
 * - Visual node-based learning path
 * - Node states: completed, available, locked
 * - Progress tracking with XP rewards
 * - Decorative path with dots connecting nodes
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Types
interface Lesson {
    lesson_id: string;
    title: string;
    status: 'completed' | 'available' | 'locked';
    type: 'flashcard' | 'quiz' | 'ar_session';
    xp_reward: number;
    icon: string;
}

interface Unit {
    unit_id: string;
    title: string;
    lessons: Lesson[];
}

interface CourseMapProps {
    courseName?: string;
    units?: Unit[];
}

// Mock data for demo
const mockUnits: Unit[] = [
    {
        unit_id: 'unit_1',
        title: 'Thế giới động vật',
        lessons: [
            { lesson_id: 'l1', title: 'Nông trại vui vẻ', status: 'completed', type: 'flashcard', xp_reward: 50, icon: '🐔' },
            { lesson_id: 'l2', title: 'Rừng xanh', status: 'completed', type: 'quiz', xp_reward: 100, icon: '🦁' },
            { lesson_id: 'l3', title: 'Đại dương sâu', status: 'available', type: 'flashcard', xp_reward: 75, icon: '🐳' },
            { lesson_id: 'l4', title: 'AR: Khám phá động vật', status: 'locked', type: 'ar_session', xp_reward: 150, icon: '📱' },
        ]
    },
    {
        unit_id: 'unit_2',
        title: 'Màu sắc & Hình dạng',
        lessons: [
            { lesson_id: 'l5', title: 'Cầu vồng màu sắc', status: 'locked', type: 'flashcard', xp_reward: 50, icon: '🌈' },
            { lesson_id: 'l6', title: 'Hình học vui nhộn', status: 'locked', type: 'quiz', xp_reward: 100, icon: '🔷' },
        ]
    },
    {
        unit_id: 'unit_3',
        title: 'Gia đình & Bạn bè',
        lessons: [
            { lesson_id: 'l7', title: 'Gia đình của bé', status: 'locked', type: 'flashcard', xp_reward: 50, icon: '👨‍👩‍👧' },
            { lesson_id: 'l8', title: 'Bạn bè thân thiết', status: 'locked', type: 'quiz', xp_reward: 100, icon: '🤝' },
        ]
    },
];

// Lesson Node Component
const LessonNode: React.FC<{
    lesson: Lesson;
    index: number;
    onSelect: (lesson: Lesson) => void;
}> = ({ lesson, index, onSelect }) => {
    const isEven = index % 2 === 0;

    const getNodeStyle = () => {
        switch (lesson.status) {
            case 'completed':
                return 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 ring-4 ring-amber-200';
            case 'available':
                return 'bg-gradient-to-br from-cyan-400 to-sky-500 shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-200 animate-pulse';
            case 'locked':
                return 'bg-gray-300 shadow-md';
            default:
                return 'bg-gray-300';
        }
    };

    const getStatusIcon = () => {
        switch (lesson.status) {
            case 'completed':
                return <span className="absolute -top-1 -right-1 text-2xl">⭐</span>;
            case 'available':
                return <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></span>;
            case 'locked':
                return <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-50">🔒</span>;
            default:
                return null;
        }
    };

    return (
        <div
            className={`relative flex flex-col items-center ${isEven ? 'mr-auto ml-8 md:ml-16' : 'ml-auto mr-8 md:mr-16'}`}
        >
            {/* Node Button */}
            <button
                onClick={() => lesson.status !== 'locked' && onSelect(lesson)}
                disabled={lesson.status === 'locked'}
                className={`
                    relative w-20 h-20 rounded-full
                    flex items-center justify-center
                    text-4xl
                    transform transition-all duration-300
                    ${lesson.status !== 'locked' ? 'hover:scale-110 cursor-pointer' : 'cursor-not-allowed'}
                    ${getNodeStyle()}
                `}
            >
                {lesson.status !== 'locked' && lesson.icon}
                {getStatusIcon()}
            </button>

            {/* Lesson Title */}
            <div className={`
                mt-2 px-3 py-1 rounded-full text-sm font-bold text-center max-w-[120px]
                ${lesson.status === 'locked' ? 'text-gray-400 bg-gray-100' : 'text-gray-700 bg-white/80 shadow-sm'}
            `}>
                {lesson.title}
            </div>

            {/* XP Reward */}
            {lesson.status !== 'locked' && (
                <span className="mt-1 text-xs font-bold text-amber-600">
                    +{lesson.xp_reward} XP
                </span>
            )}
        </div>
    );
};

// Lesson Detail Modal
const LessonModal: React.FC<{
    lesson: Lesson | null;
    onClose: () => void;
    onStart: () => void;
}> = ({ lesson, onClose, onStart }) => {
    if (!lesson) return null;

    const getTypeLabel = () => {
        switch (lesson.type) {
            case 'flashcard': return '📚 Flashcards';
            case 'quiz': return '❓ Quiz';
            case 'ar_session': return '📱 AR Mode';
            default: return lesson.type;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-slideUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                    ✕
                </button>

                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-5xl shadow-lg">
                    {lesson.icon}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-center text-gray-800 mb-2">
                    {lesson.title}
                </h2>

                {/* Type Badge */}
                <div className="flex justify-center mb-4">
                    <span className="bg-sky-100 text-sky-600 px-3 py-1 rounded-full text-sm font-bold">
                        {getTypeLabel()}
                    </span>
                </div>

                {/* XP Reward */}
                <div className="text-center mb-6">
                    <span className="text-amber-500 font-bold text-lg">
                        ⚡ +{lesson.xp_reward} XP
                    </span>
                </div>

                {/* Start Button */}
                <button
                    onClick={onStart}
                    className="w-full bg-gradient-to-r from-amber-400 to-orange-500 
                             text-white font-bold py-4 px-6 rounded-2xl
                             shadow-lg shadow-amber-500/30
                             border-b-4 border-orange-600
                             hover:shadow-xl hover:from-amber-500 hover:to-orange-600
                             active:border-b-0 active:translate-y-1
                             transition-all duration-200"
                >
                    BẮT ĐẦU HỌC 🚀
                </button>
            </div>
        </div>
    );
};

// Main CourseMap Component
export const CourseMap: React.FC<CourseMapProps> = ({
    courseName = "Tiếng Anh vỡ lòng",
    units = mockUnits
}) => {
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const navigate = useNavigate();

    const handleStartLesson = () => {
        if (!selectedLesson) return;

        // Navigate based on lesson type
        switch (selectedLesson.type) {
            case 'flashcard':
                navigate('/flashcards');
                break;
            case 'ar_session':
                navigate('/learn-ar');
                break;
            case 'quiz':
                navigate('/courses');
                break;
            default:
                navigate('/courses');
        }
        setSelectedLesson(null);
    };

    // Calculate progress
    const totalLessons = units.reduce((acc, unit) => acc + unit.lessons.length, 0);
    const completedLessons = units.reduce((acc, unit) =>
        acc + unit.lessons.filter(l => l.status === 'completed').length, 0
    );
    const progressPercent = Math.round((completedLessons / totalLessons) * 100);

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-amber-50 py-6 px-4">
            {/* Header */}
            <div className="max-w-lg mx-auto mb-8">
                <h1 className="text-3xl font-black text-gray-800 text-center mb-2">
                    {courseName}
                </h1>

                {/* Progress Bar */}
                <div className="bg-white rounded-full p-2 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-gray-600">
                            {completedLessons}/{totalLessons}
                        </span>
                    </div>
                </div>
            </div>

            {/* Learning Path */}
            <div className="max-w-lg mx-auto relative">
                {/* Decorative Path Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 via-sky-300 to-gray-300 -translate-x-1/2 rounded-full" />

                {/* Units */}
                {units.map((unit, unitIndex) => (
                    <div key={unit.unit_id} className="relative mb-12">
                        {/* Unit Header */}
                        <div className="relative z-10 bg-white rounded-2xl shadow-md p-4 mb-6 mx-4">
                            <h2 className="text-lg font-black text-gray-700 text-center">
                                {unit.title}
                            </h2>
                            <p className="text-sm text-gray-500 text-center">
                                {unit.lessons.filter(l => l.status === 'completed').length}/{unit.lessons.length} bài đã hoàn thành
                            </p>
                        </div>

                        {/* Lessons in this unit */}
                        <div className="space-y-8">
                            {unit.lessons.map((lesson, lessonIndex) => (
                                <LessonNode
                                    key={lesson.lesson_id}
                                    lesson={lesson}
                                    index={unitIndex * 10 + lessonIndex}
                                    onSelect={setSelectedLesson}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Lesson Detail Modal */}
            {selectedLesson && (
                <LessonModal
                    lesson={selectedLesson}
                    onClose={() => setSelectedLesson(null)}
                    onStart={handleStartLesson}
                />
            )}
        </div>
    );
};

export default CourseMap;
