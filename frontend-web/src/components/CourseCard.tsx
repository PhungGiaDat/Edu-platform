import React from 'react';

import type { Locale } from '@/contexts/LocaleContext';
import { courseDescription, courseSubtitle, courseTitle } from '@/lib/courseLocale';
import type { Course } from '@/services/CourseService';

type CourseCardProps = {
    course: Course;
    locale: Locale;
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
    xp: number;
    durationMinutes: number;
    levelLabel: string;
    actionLabel: string;
    progressLabel: string;
    hourLabel: string;
    tags: string[];
    isInteractive?: boolean;
    onOpen?: () => void;
    onStart?: () => void;
};

const BoltIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 2 4 14h6.7L9.5 22 20 9h-7.1L13.5 2Z" />
    </svg>
);

export const CourseCard: React.FC<CourseCardProps> = ({
    course,
    locale,
    completedLessons,
    totalLessons,
    progressPercent,
    xp,
    durationMinutes,
    levelLabel,
    actionLabel,
    progressLabel,
    hourLabel,
    tags,
    isInteractive = true,
    onOpen,
    onStart,
}) => {
    const englishTitle = courseTitle(course, 'en');
    const vietnameseSubtitle = courseSubtitle(course, 'vi');
    const localizedDescription = courseDescription(course, locale);
    const hours = Math.max(1, Math.round(durationMinutes / 60));

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (!isInteractive || !onOpen) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen();
        }
    };

    return (
        <article
            className={`clay-course-card course-list-card group relative min-w-0 ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={isInteractive ? onOpen : undefined}
            onKeyDown={handleKeyDown}
            role={isInteractive ? 'link' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-label={`${englishTitle}. ${vietnameseSubtitle}`}
        >
            <div className="course-list-card__xp-shell">
                <div className="course-list-card__xp-panel">
                    <div className="flex min-w-0 items-center justify-center gap-4 text-slate-800">
                        <BoltIcon className="course-list-card__bolt" />
                        <span className="course-list-card__xp" style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}>
                            {xp} XP
                        </span>
                    </div>
                </div>
            </div>

            <div className="course-list-card__body min-w-0">
                <div className="mb-4 flex flex-wrap items-center gap-2 text-base font-semibold text-slate-500">
                    <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600">
                        {levelLabel}
                    </span>
                    <span aria-hidden="true">&bull;</span>
                    <span>{hours} {hourLabel}</span>
                </div>

                <h2 className="text-3xl font-black leading-tight text-slate-800">{englishTitle}</h2>
                <p className="mt-2 text-xl font-medium leading-7 text-slate-500">{vietnameseSubtitle}</p>
                <p className="mt-4 line-clamp-3 min-h-[5.25rem] text-xl font-medium leading-7 text-slate-600">
                    {localizedDescription}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                    {tags.map(tag => (
                        <span key={tag} className="rounded-2xl bg-slate-100 px-4 py-2 text-base font-semibold text-slate-600">
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-between text-lg font-black text-slate-700">
                    <span>{progressLabel}</span>
                    <span className="text-rose-500">{completedLessons}/{totalLessons}</span>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FFB4A2] to-[#FF7A90]"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <button
                    type="button"
                    className="course-list-card__cta mt-7 flex min-h-16 w-full items-center justify-center px-5 text-xl font-black"
                    onClick={(event) => {
                        event.stopPropagation();
                        onStart?.();
                    }}
                    disabled={!isInteractive}
                >
                    {actionLabel}
                </button>
            </div>
        </article>
    );
};
