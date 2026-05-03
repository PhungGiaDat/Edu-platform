import React, { useState } from 'react';
import { VideoPlayer } from '../components/VideoPlayer';
import { PronunciationPractice } from '../components/PronunciationPractice';
import { useNavigate } from 'react-router-dom';

const course = {
    title: 'English Basics 1',
    lessons: [
        { id: '1', title: 'The Alphabet', type: 'video', videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { id: '2', title: 'Pronunciation: Apple', type: 'practice', targetText: 'Apple' },
        { id: '3', title: 'Greetings', type: 'video', videoUrl: 'https://www.w3schools.com/html/movie.mp4' },
    ],
} as const;

export const CourseDetail: React.FC = () => {
    const [activeLesson, setActiveLesson] = useState(0);
    const navigate = useNavigate();
    const currentLesson = course.lessons[activeLesson];

    return (
        <div className="min-h-screen clay-bg-playful pb-24 md:pb-8 md:pl-24 lg:pl-72 transition-all duration-300">
            {/* Top Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b-2 border-white shadow-sm px-4 sm:px-6 py-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/courses')}
                    className="clay-btn clay-btn-sm bg-white text-gray-600 hover:text-gray-800"
                >
                    ⬅️ Back to Courses
                </button>
                <div className="clay-badge clay-badge-yellow">
                    ⭐ 150 XP
                </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 px-4 sm:px-6 py-8">
                {/* Left Sidebar: Lesson List */}
                <aside className="w-full lg:w-80 shrink-0">
                    <div className="clay-card-elevated p-5 sm:p-6 sticky top-24">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="clay-icon-bubble clay-icon-bubble-mint shrink-0 w-12 h-12 text-2xl">
                                📚
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 leading-tight" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                                    {course.title}
                                </h2>
                                <p className="text-sm font-bold text-slate-500">
                                    Lesson {activeLesson + 1} of {course.lessons.length}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-6 shadow-inner">
                            <div
                                className="h-full rounded-full transition-all duration-500 clay-shimmer bg-gradient-to-r from-[#6EB9FF] to-[#B4E197]"
                                style={{ width: `${((activeLesson) / course.lessons.length) * 100}%` }}
                            />
                        </div>

                        <div className="space-y-3">
                            {course.lessons.map((lesson, index) => {
                                const isActive = index === activeLesson;
                                const isCompleted = index < activeLesson;
                                
                                return (
                                    <button
                                        key={lesson.id}
                                        onClick={() => setActiveLesson(index)}
                                        className={`w-full rounded-2xl px-4 py-3 text-left transition-all duration-300 flex items-center gap-3 group min-h-[60px] ${
                                            isActive
                                                ? 'bg-white border-2 border-[#6EB9FF] shadow-[0_6px_0_#6EB9FF,inset_0_1px_0_rgba(255,255,255,0.9)] scale-[1.02]'
                                                : isCompleted
                                                ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700 hover:border-emerald-300'
                                                : 'bg-gray-50 border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white hover:shadow-[0_4px_0_#E2E8F5]'
                                        }`}
                                    >
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors ${
                                                isActive ? 'bg-[#6EB9FF] text-white' : 
                                                isCompleted ? 'bg-emerald-200 text-emerald-800' : 
                                                'bg-gray-200 text-gray-500'
                                            }`}
                                        >
                                            {isCompleted ? '✓' : index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <span className={`line-clamp-2 text-sm sm:text-base font-bold ${isActive ? 'text-[#3A8FD1]' : ''}`}>
                                                {lesson.title}
                                            </span>
                                            <span className="text-xs font-semibold opacity-70">
                                                {lesson.type === 'video' ? '📺 Video' : '🎤 Practice'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1">
                    <div className="clay-card-elevated p-5 sm:p-8">
                        {/* Header for current lesson */}
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-gray-100">
                            <div className={`clay-icon-bubble ${currentLesson.type === 'video' ? 'clay-icon-bubble-sky' : 'clay-icon-bubble-coral'}`}>
                                {currentLesson.type === 'video' ? '📺' : '🎤'}
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-800" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                                    {currentLesson.title}
                                </h1>
                                <p className="text-slate-500 font-semibold mt-1">
                                    {currentLesson.type === 'video' 
                                        ? 'Watch carefully, then repeat each word out loud!' 
                                        : 'Listen and repeat the word clearly.'}
                                </p>
                            </div>
                        </div>

                        {currentLesson.type === 'video' ? (
                            <div className="space-y-6">
                                <div className="rounded-3xl overflow-hidden border-4 border-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] bg-black aspect-video relative">
                                    <VideoPlayer url={currentLesson.videoUrl} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 py-4">
                                <PronunciationPractice targetText={currentLesson.targetText} onComplete={() => { }} />
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t-2 border-gray-100 flex justify-end">
                            <button
                                onClick={() => setActiveLesson((prev) => Math.min(prev + 1, course.lessons.length - 1))}
                                className="clay-cta-primary w-full sm:w-auto"
                            >
                                {activeLesson === course.lessons.length - 1 ? '🎉 Finish Course' : 'Continue ➡️'}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CourseDetail;
