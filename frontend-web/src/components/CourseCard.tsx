import React from 'react';
import type { Course } from '../services/CourseService';

interface CourseCardProps {
    course: Course;
    onClick: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="cursor-pointer overflow-hidden rounded-2xl border-b-4 border-neutral-200 bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:border-b-0"
        >
            <div className="flex h-32 w-full items-center justify-center bg-primary-light">
                <span className="text-4xl">📚</span>
            </div>
            <div className="p-4">
                <h3 className="mb-2 text-xl font-bold text-neutral-800">{course.title}</h3>
                <p className="mb-4 line-clamp-2 text-sm text-neutral-500">
                    {course.description_vi || course.description}
                </p>

                <div className="flex items-center justify-between">
                    <span className="rounded-full bg-secondary-light/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary-dark">
                        {course.level}
                    </span>
                    <span className="text-xs font-bold text-neutral-400">
                        {course.lessons.length} LESSONS
                    </span>
                </div>
            </div>
        </div>
    );
};
