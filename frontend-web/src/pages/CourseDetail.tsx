import React, { useState } from 'react';
import { VideoPlayer } from '../components/VideoPlayer';
import { PronunciationPractice } from '../components/PronunciationPractice';

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
    const currentLesson = course.lessons[activeLesson];

    return (
        <div
            className="min-h-screen"
            style={{
                background:
                    'radial-gradient(circle at 12% 14%, rgba(14,165,233,0.18), transparent 42%), radial-gradient(circle at 84% 86%, rgba(34,197,94,0.16), transparent 40%), linear-gradient(135deg, #f0f9ff 0%, #fff8e8 54%, #ecfeff 100%)',
            }}
        >
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6 lg:flex-row lg:gap-6">
                <aside className="w-full lg:w-80">
                    <div
                        className="rounded-3xl p-4 sm:p-5"
                        style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid #bae6fd', boxShadow: '0 10px 26px rgba(14,165,233,0.14)' }}
                    >
                        <h2 className="text-xl font-black text-slate-800">{course.title}</h2>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Lesson {activeLesson + 1} of {course.lessons.length}
                        </p>

                        <div className="mt-4 space-y-2">
                            {course.lessons.map((lesson, index) => {
                                const isActive = index === activeLesson;
                                return (
                                    <button
                                        key={lesson.id}
                                        onClick={() => setActiveLesson(index)}
                                        className="w-full rounded-2xl px-3 py-3 text-left transition-all"
                                        style={{
                                            minHeight: 48,
                                            background: isActive
                                                ? 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)'
                                                : '#f8fafc',
                                            color: isActive ? '#fff' : '#334155',
                                            border: isActive ? '2px solid #0284c7' : '2px solid #e2e8f0',
                                            boxShadow: isActive ? '0 8px 20px rgba(14,165,233,0.24)' : 'none',
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black"
                                                style={{ background: isActive ? 'rgba(255,255,255,0.24)' : '#e2e8f0' }}
                                            >
                                                {index + 1}
                                            </div>
                                            <span className="line-clamp-2 text-sm font-bold sm:text-base">{lesson.title}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <main className="flex-1">
                    <div
                        className="rounded-3xl p-4 sm:p-6"
                        style={{ background: 'rgba(255,255,255,0.9)', border: '2px solid #dbeafe', boxShadow: '0 10px 26px rgba(2,132,199,0.12)' }}
                    >
                        {currentLesson.type === 'video' ? (
                            <div className="space-y-4 sm:space-y-6">
                                <VideoPlayer url={currentLesson.videoUrl} />
                                <div className="rounded-2xl border-2 border-sky-100 bg-white px-4 py-4 sm:px-5">
                                    <h1 className="text-xl font-black text-slate-900 sm:text-2xl">{currentLesson.title}</h1>
                                    <p className="mt-2 text-sm text-slate-600 sm:text-base">
                                        Watch carefully, then repeat each word out loud before moving on.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 sm:space-y-6">
                                <PronunciationPractice targetText={currentLesson.targetText} onComplete={() => {}} />
                            </div>
                        )}

                        <button
                            onClick={() => setActiveLesson((prev) => Math.min(prev + 1, course.lessons.length - 1))}
                            className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black text-white sm:py-4 sm:text-base"
                            style={{
                                minHeight: 52,
                                background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                                border: '3px solid #0284c7',
                                boxShadow: '0 8px 20px rgba(14,165,233,0.25)',
                            }}
                        >
                            CONTINUE
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
};
