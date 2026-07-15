import React, { useMemo, useState } from 'react';

import type { Locale } from '@/contexts/LocaleContext';
import { getAssetCandidateUrls, resolveStoredMediaUrl } from '@/lib/courseAssets';
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

const categoryFallbackVisuals: Record<string, string> = {
    home_family: '/learnar-assets/courses/momo-home-family-english-5-7/images/course-cover.png',
    nature: '/assets/flashcards/jungle_card.png',
    school_food: '/assets/flashcards/apple01_card.png',
};

const uniqueSources = (sources: Array<string | null | undefined>) =>
    Array.from(new Set(sources.filter((source): source is string => Boolean(source))));

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
    const visualSources = useMemo(() => uniqueSources([
        resolveStoredMediaUrl(course.thumbnail_url),
        ...getAssetCandidateUrls(course.thumbnail),
        categoryFallbackVisuals[course.category_key],
        categoryFallbackVisuals.home_family,
    ]), [course.category_key, course.thumbnail, course.thumbnail_url]);
    const [visualIndex, setVisualIndex] = useState(0);
    const visualSource = visualSources[visualIndex];

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
            <div className="course-list-card__visual">
                {visualSource && (
                    <img
                        src={visualSource}
                        alt={`Preview of ${englishTitle}`}
                        onError={() => setVisualIndex((current) => Math.min(current + 1, visualSources.length - 1))}
                    />
                )}
                <span className="course-list-card__visual-wash" aria-hidden="true" />
                <span className="course-list-card__level">{levelLabel}</span>
                <span className="course-list-card__xp-badge">
                    <BoltIcon className="course-list-card__bolt" />
                    {xp} XP
                </span>
            </div>

            <div className="course-list-card__body min-w-0">
                <div className="course-list-card__metadata">
                    <span>{hours} {hourLabel}</span>
                    <span aria-hidden="true">•</span>
                    <span>{totalLessons} lessons</span>
                </div>
                <h2>{englishTitle}</h2>
                <p className="course-list-card__subtitle">{vietnameseSubtitle}</p>
                <p className="course-list-card__description">{localizedDescription}</p>

                <div className="course-list-card__tags">
                    {tags.map(tag => (
                        <span key={tag}>
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="course-list-card__progress-row">
                    <span>{progressLabel}</span>
                    <strong>{completedLessons}/{totalLessons}</strong>
                </div>
                <div className="course-list-card__progress-track" aria-label={`${progressPercent}% ${progressLabel}`}>
                    <div
                        className="course-list-card__progress-fill"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                <button
                    type="button"
                    className="course-list-card__cta"
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
