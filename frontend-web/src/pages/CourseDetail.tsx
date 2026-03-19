import React, { useState } from 'react';
// import { useParams } from 'react-router-dom';
import { VideoPlayer } from '../components/VideoPlayer';
import { PronunciationPractice } from '../components/PronunciationPractice';

export const CourseDetail: React.FC = () => {
    // const { id } = useParams(); // Unused for now with mock data
    const [activeLesson, setActiveLesson] = useState(0);

    // Mock Data
    const course = {
        title: "English Basics 1",
        lessons: [
            { id: '1', title: "The Alphabet", type: 'video', videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
            { id: '2', title: "Pronunciation: Apple", type: 'practice', targetText: "Apple" },
            { id: '3', title: "Greetings", type: 'video', videoUrl: "https://www.w3schools.com/html/movie.mp4" },
        ]
    };

    const currentLesson = course.lessons[activeLesson];

    return (
        <div className="flex flex-col md:flex-row h-screen md:h-[calc(100vh-80px)] bg-neutral-100">
            {/* Sidebar - Lesson List */}
            <div className="w-full md:w-80 max-h-48 md:max-h-none bg-white border-b-2 md:border-b-0 md:border-r-2 border-neutral-200 overflow-y-auto">
                <div className="p-3 sm:p-4 md:p-6 border-b-2 border-neutral-200">
                    <h2 className="font-black text-lg sm:text-xl text-neutral-800">{course.title}</h2>
                    <p className="text-neutral-400 font-bold text-xs sm:text-sm mt-1">{activeLesson + 1} / {course.lessons.length} COMPLETED</p>
                </div>
                <div className="p-2 sm:p-3 md:p-4 space-y-2">
                    {course.lessons.map((lesson, index) => (
                        <button
                            key={lesson.id}
                            onClick={() => setActiveLesson(index)}
                            className={`w-full p-2 sm:p-3 md:p-4 rounded-xl flex items-center text-left text-sm sm:text-base transition-all ${index === activeLesson
                                ? 'bg-secondary text-white shadow-lg scale-105 font-bold'
                                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                }`}
                        >
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 text-xs sm:text-sm ${index === activeLesson ? 'bg-white/20' : 'bg-neutral-300'
                                }`}>
                                {index + 1}
                            </div>
                            <span className="line-clamp-2">{lesson.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-10 overflow-y-auto flex items-center justify-center">
                <div className="w-full max-w-3xl">
                    {currentLesson.type === 'video' ? (
                        <div className="space-y-4 sm:space-y-6">
                            <VideoPlayer url={currentLesson.videoUrl!} />
                            <div className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-neutral-200">
                                <h1 className="text-lg sm:text-2xl font-bold text-neutral-800 mb-2">{currentLesson.title}</h1>
                                <p className="text-neutral-500 text-sm sm:text-base">Watch the video carefully and repeat after the speaker.</p>
                                <button
                                    onClick={() => setActiveLesson(prev => Math.min(prev + 1, course.lessons.length - 1))}
                                    className="mt-4 sm:mt-6 w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 sm:py-4 px-4 rounded-lg sm:rounded-xl border-b-4 border-primary-dark active:border-b-0 active:translate-y-1 transition-all text-sm sm:text-base"
                                >
                                    CONTINUE
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            <PronunciationPractice
                                targetText={currentLesson.targetText!}
                                onComplete={() => { }}
                            />
                            <button
                                onClick={() => setActiveLesson(prev => Math.min(prev + 1, course.lessons.length - 1))}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 sm:py-4 px-4 rounded-lg sm:rounded-xl border-b-4 border-primary-dark active:border-b-0 active:translate-y-1 transition-all text-sm sm:text-base"
                            >
                                CONTINUE
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
