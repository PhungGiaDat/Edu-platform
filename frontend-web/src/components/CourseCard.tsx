import React from 'react';
import { Course } from '../services/CourseService';

interface CourseCardProps {
    course: Course;
    onClick: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 cursor-pointer border-b-4 border-neutral-200 active:border-b-0 active:translate-y-0 overflow-hidden"
        >
            <div className={`h-32 w-full ${course.thumbnail_url ? '' : 'bg-primary-light'} flex items-center justify-center`}>
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-4xl">📚</span>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-xl font-bold text-neutral-800 mb-2">{course.title}</h3>
                <p className="text-neutral-500 text-sm mb-4 line-clamp-2">{course.description}</p>

                <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-secondary-light/20 text-secondary-dark rounded-full text-xs font-bold uppercase tracking-wide">
                        {course.level}
                    </span>
                    <span className="text-neutral-400 text-xs font-bold">
                        {course.lessons.length} LESSONS
                    </span>
                </div>
            </div>
        </div>
    );
};
