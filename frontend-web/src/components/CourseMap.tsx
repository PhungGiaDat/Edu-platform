import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Lesson {
    lesson_id: string;
    title: string;
    status: 'completed' | 'available' | 'locked';
    type: 'flashcard' | 'quiz' | 'ar_session' | 'lesson';
    xp_reward: number;
    icon?: string;
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

const LessonNode: React.FC<{
    lesson: Lesson;
    index: number;
    onSelect: (lesson: Lesson) => void;
}> = ({ lesson, index, onSelect }) => {
    const isEven = index % 2 === 0;

    const nodeStyle = {
        completed: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 ring-4 ring-amber-200',
        available: 'bg-gradient-to-br from-cyan-400 to-sky-500 shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-200',
        locked: 'bg-gray-300 shadow-md',
    }[lesson.status];

    return (
        <div className={`relative z-10 flex w-[min(46%,11rem)] flex-col items-center sm:w-[min(44%,13rem)] lg:w-[min(38%,15rem)] ${isEven ? 'ml-4 mr-auto sm:ml-8 lg:ml-[12%]' : 'ml-auto mr-4 sm:mr-8 lg:mr-[12%]'}`}>
            <button
                onClick={() => lesson.status !== 'locked' && onSelect(lesson)}
                disabled={lesson.status === 'locked'}
                className={`touch-target relative flex h-16 w-16 items-center justify-center rounded-full text-3xl transition-all duration-300 sm:h-20 sm:w-20 sm:text-4xl ${lesson.status !== 'locked' ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-not-allowed'} ${nodeStyle}`}
            >
                {lesson.status === 'locked' ? '🔒' : lesson.icon || '📚'}
                {lesson.status === 'completed' && <span className="absolute -right-1 -top-1 text-2xl">⭐</span>}
            </button>

            <div className={`mt-2 w-full max-w-[120px] rounded-full px-2 py-1 text-center text-xs font-bold sm:max-w-[150px] sm:px-3 sm:text-sm lg:max-w-[170px] ${lesson.status === 'locked' ? 'bg-gray-100 text-gray-400' : 'bg-white/80 text-gray-700 shadow-sm'}`}>
                {lesson.title}
            </div>

            {lesson.status !== 'locked' && (
                <span className="mt-1 text-xs font-bold text-amber-600">+{lesson.xp_reward} XP</span>
            )}
        </div>
    );
};

const LessonModal: React.FC<{
    lesson: Lesson | null;
    onClose: () => void;
    onStart: () => void;
}> = ({ lesson, onClose, onStart }) => {
    if (!lesson) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="relative max-h-[90vh] w-full max-w-xs overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:max-w-sm sm:p-6">
                <button
                    onClick={onClose}
                    className="absolute right-3 top-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 sm:right-4 sm:top-4"
                >
                    ×
                </button>
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-4xl shadow-lg sm:mb-4 sm:h-20 sm:w-20 sm:text-5xl">
                    {lesson.icon || '📚'}
                </div>
                <h2 className="mb-2 text-center text-xl font-black text-gray-800 sm:text-2xl">{lesson.title}</h2>
                <div className="mb-4 text-center text-amber-500 font-bold sm:mb-6">⚡ +{lesson.xp_reward} XP</div>
                <button
                    onClick={onStart}
                    className="min-h-[48px] w-full rounded-2xl border-b-4 border-orange-600 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-amber-500/30 transition-all duration-200 hover:from-amber-500 hover:to-orange-600 active:translate-y-1 active:border-b-0 sm:px-6 sm:py-4"
                >
                    Start Lesson
                </button>
            </div>
        </div>
    );
};

export const CourseMap: React.FC<CourseMapProps> = ({
    courseName = 'Learning Path',
    units = [],
}) => {
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const navigate = useNavigate();

    const { totalLessons, completedLessons, progressPercent } = useMemo(() => {
        const total = units.reduce((acc, unit) => acc + unit.lessons.length, 0);
        const completed = units.reduce((acc, unit) => acc + unit.lessons.filter(lesson => lesson.status === 'completed').length, 0);
        return {
            totalLessons: total,
            completedLessons: completed,
            progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }, [units]);

    const handleStartLesson = () => {
        if (!selectedLesson) return;

        if (selectedLesson.type === 'ar_session') {
            navigate('/learn-ar');
        } else if (selectedLesson.type === 'flashcard') {
            navigate('/flashcards');
        } else {
            navigate('/courses');
        }
        setSelectedLesson(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-amber-50 px-2 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-10">
            <div className="mx-auto mb-6 max-w-sm sm:mb-8 sm:max-w-lg lg:max-w-3xl">
                <h1 className="mb-3 text-center text-2xl font-black text-gray-800 sm:mb-2 sm:text-3xl lg:text-4xl">
                    {courseName}
                </h1>
                <div className="rounded-full bg-white p-2 shadow-md lg:p-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 sm:h-3">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <span className="whitespace-nowrap text-xs font-bold text-gray-600 sm:text-sm">
                            {completedLessons}/{totalLessons}
                        </span>
                    </div>
                </div>
            </div>

            <div className="relative mx-auto max-w-sm sm:max-w-lg lg:max-w-3xl xl:max-w-4xl">
                {units.length === 0 ? (
                    <div className="relative z-10 rounded-3xl bg-white p-6 text-center shadow-md">
                        <h2 className="text-xl font-black text-gray-800">No learning path loaded</h2>
                        <p className="mt-2 text-sm font-bold text-gray-500">
                            Pass MongoDB-backed units into CourseMap before rendering lessons.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="absolute bottom-0 left-1/2 top-0 w-1 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-300 via-sky-300 to-gray-300" />
                        {units.map((unit, unitIndex) => (
                            <div key={unit.unit_id} className="relative mb-8 sm:mb-12 lg:mb-14">
                                <div className="relative z-10 mx-auto mb-4 max-w-xs rounded-2xl bg-white p-3 shadow-md sm:mb-6 sm:max-w-sm sm:p-4 lg:max-w-md">
                                    <h2 className="text-center text-base font-black text-gray-700 sm:text-lg">{unit.title}</h2>
                                    <p className="text-center text-xs text-gray-500 sm:text-sm">
                                        {unit.lessons.filter(lesson => lesson.status === 'completed').length}/{unit.lessons.length} completed
                                    </p>
                                </div>
                                <div className="space-y-6 sm:space-y-8 lg:space-y-10">
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
                    </>
                )}
            </div>

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
