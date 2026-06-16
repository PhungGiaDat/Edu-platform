import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { AssetTile } from '@/components/courses/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import {
    courseCategoryLabel,
    courseDescription,
    courseSubtitle,
    courseTheme,
    courseTitle,
    testimonials,
} from '@/lib/courseLocale';
import { courseService } from '@/services/CourseService';
import type { Course, UserProgress } from '@/types/course';

type PathFilter = {
    key: string;
    title: string;
    subtitle: string;
    mark: string;
    courses: Course[];
    completedCourses: number;
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
};

const levelLabel: Record<Locale, Record<string, string>> = {
    en: {
        beginner: 'Beginner Journey',
        intermediate: 'Young Explorer',
        advanced: 'Brave Challenger',
    },
    vi: {
        beginner: 'Lo trinh bat dau',
        intermediate: 'Nha tham hiem nho',
        advanced: 'Thu thach dung cam',
    },
};

const categoryFallback: Record<string, { en: string; vi: string; mark: string }> = {
    nature: { en: 'Animals and Nature', vi: 'Dong vat va thien nhien', mark: 'AN' },
    home_family: { en: 'Home and Family', vi: 'Gia dinh', mark: 'HF' },
    school_food: { en: 'School and Food', vi: 'Truong hoc va mon an', mark: 'SF' },
};

const getLearnerId = (userId?: string | null, isGuest?: boolean) => (
    userId || (isGuest ? 'guest-learner' : null)
);

const getCourseProgress = (course: Course, progress?: UserProgress) => {
    const totalLessons = course.lessons.length;
    const completedLessons = progress?.completed_lessons?.length || 0;
    const progressPercent = totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;
    return { totalLessons, completedLessons, progressPercent };
};

const initials = (value: string) => value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const isAnimalNatureCourse = (course: Course) => {
    const haystack = [
        course.course_id,
        course.title,
        course.theme,
        course.description,
        course.description_vi,
        course.subtitle_vi,
    ].join(' ').toLowerCase();

    return ['animal', 'animals', 'nature', 'jungle', 'elephant'].some(term => haystack.includes(term));
};

const buildCategoryPath = (
    categoryKey: string,
    courses: Course[],
    progressByCourse: Map<string, UserProgress>,
    locale: Locale,
): PathFilter | null => {
    const pathCourses = courses.filter(course => (course.category_key || course.level) === categoryKey);
    if (pathCourses.length === 0) return null;

    const totals = pathCourses.reduce(
        (acc, course) => {
            const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
            return {
                completedCourses: acc.completedCourses + (courseProgress.progressPercent >= 100 ? 1 : 0),
                completedLessons: acc.completedLessons + courseProgress.completedLessons,
                totalLessons: acc.totalLessons + courseProgress.totalLessons,
            };
        },
        { completedCourses: 0, completedLessons: 0, totalLessons: 0 },
    );

    const first = pathCourses[0];
    const fallback = categoryFallback[categoryKey];
    const title = fallback ? fallback[locale] : courseCategoryLabel(first, locale);
    const progressPercent = totals.totalLessons > 0
        ? Math.round((totals.completedLessons / totals.totalLessons) * 100)
        : 0;

    return {
        key: categoryKey,
        title,
        subtitle: `${pathCourses.length} ${pathCourses.length === 1 ? 'course' : 'courses'}`,
        mark: fallback?.mark || initials(title),
        courses: pathCourses,
        completedCourses: totals.completedCourses,
        completedLessons: totals.completedLessons,
        totalLessons: totals.totalLessons,
        progressPercent,
    };
};

const buildLevelPath = (
    level: string,
    courses: Course[],
    progressByCourse: Map<string, UserProgress>,
    locale: Locale,
): PathFilter | null => {
    const pathCourses = courses.filter(course => course.level === level);
    if (pathCourses.length === 0) return null;
    const totals = pathCourses.reduce(
        (acc, course) => {
            const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
            return {
                completedCourses: acc.completedCourses + (courseProgress.progressPercent >= 100 ? 1 : 0),
                completedLessons: acc.completedLessons + courseProgress.completedLessons,
                totalLessons: acc.totalLessons + courseProgress.totalLessons,
            };
        },
        { completedCourses: 0, completedLessons: 0, totalLessons: 0 },
    );
    const progressPercent = totals.totalLessons > 0
        ? Math.round((totals.completedLessons / totals.totalLessons) * 100)
        : 0;
    const title = levelLabel[locale][level] || `${level} Path`;
    return {
        key: level,
        title,
        subtitle: `${pathCourses.length} ${pathCourses.length === 1 ? 'course' : 'courses'}`,
        mark: initials(title),
        courses: pathCourses,
        completedCourses: totals.completedCourses,
        completedLessons: totals.completedLessons,
        totalLessons: totals.totalLessons,
        progressPercent,
    };
};

const LanguageSwitch: React.FC = () => {
    const { locale, setLocale, t } = useLocale();
    return (
        <div className="inline-flex items-center gap-2 rounded-full border-4 border-white bg-white/80 p-1 shadow-[0_6px_0_rgba(91,141,239,0.12)]">
            <span className="hidden px-2 text-xs font-black uppercase tracking-wide text-slate-500 sm:inline">{t('language')}</span>
            {(['en', 'vi'] as Locale[]).map(option => (
                <button
                    key={option}
                    type="button"
                    onClick={() => setLocale(option)}
                    className={`min-h-11 rounded-full px-4 text-sm font-black transition-colors ${
                        locale === option
                            ? 'bg-sky-500 text-white shadow-[0_3px_0_rgba(14,116,144,0.35)]'
                            : 'text-slate-600 hover:bg-sky-50'
                    }`}
                >
                    {option === 'en' ? 'EN' : 'VI'}
                </button>
            ))}
        </div>
    );
};

export const CourseList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { level, pathId, category } = useParams();
    const { user, isGuest } = useAuth();
    const { locale, t } = useLocale();
    const learnerId = getLearnerId(user?.id, isGuest);
    const [courses, setCourses] = useState<Course[]>([]);
    const [progress, setProgress] = useState<UserProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const activeFilter = category || level || pathId || (location.pathname.endsWith('/animals') ? 'animals' : null);

    const loadCourses = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [courseData, progressData] = await Promise.all([
                courseService.listCourses(),
                learnerId ? courseService.getProgress(learnerId).catch(() => []) : Promise.resolve([]),
            ]);
            setCourses(courseData);
            setProgress(progressData);
        } catch (err) {
            console.error('[CourseList] load error:', err);
            setError(t('loadCourseError'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadCourses();
        // learnerId changes after auth restore; that should refresh progress.
    }, [learnerId]);

    const progressByCourse = useMemo(
        () => new Map(progress.map(item => [item.course_id, item])),
        [progress],
    );

    const learningPaths = useMemo(() => {
        const categoryKeys = Array.from(new Set(courses.map(course => course.category_key || course.level))).sort();
        const categoryPaths = categoryKeys
            .map(categoryKey => buildCategoryPath(categoryKey, courses, progressByCourse, locale))
            .filter((path): path is PathFilter => Boolean(path));
        if (categoryPaths.length > 0) return categoryPaths;

        const levels = Array.from(new Set(courses.map(course => course.level))).sort();
        return levels
            .map(pathLevel => buildLevelPath(pathLevel, courses, progressByCourse, locale))
            .filter((path): path is PathFilter => Boolean(path));
    }, [courses, locale, progressByCourse]);

    const filteredCourses = useMemo(() => {
        if (!activeFilter) return courses;
        if (activeFilter === 'animals') return courses.filter(isAnimalNatureCourse);
        if (courses.some(course => course.category_key === activeFilter)) {
            return courses.filter(course => course.category_key === activeFilter);
        }
        if (['beginner', 'intermediate', 'advanced'].includes(activeFilter)) {
            return courses.filter(course => course.level === activeFilter);
        }
        return courses.filter(course => course.course_id === activeFilter);
    }, [activeFilter, courses]);

    const pageTitle = activeFilter === 'animals'
        ? (locale === 'vi' ? 'Dong vat va thien nhien' : 'Animals and Nature')
        : activeFilter && courses.some(course => course.category_key === activeFilter)
            ? courseCategoryLabel(courses.find(course => course.category_key === activeFilter)!, locale)
        : activeFilter && ['beginner', 'intermediate', 'advanced'].includes(activeFilter)
            ? levelLabel[locale][activeFilter] || activeFilter
            : t('courseCatalog');

    const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
    const completedLessons = progress.reduce((sum, item) => sum + (item.completed_lessons?.length || 0), 0);
    const totalXp = progress.reduce((sum, item) => sum + (item.total_xp || 0), 0);
    const inProgress = progress.filter(item => item.status === 'started').length;
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const featuredCourse = filteredCourses[0] || courses[0];
    const featuredTestimonials = featuredCourse ? testimonials(featuredCourse, locale) : [];

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const course = await courseService.generateSampleCourse();
            setCourses(prev => {
                const withoutDuplicate = prev.filter(item => item.course_id !== course.course_id);
                return [course, ...withoutDuplicate];
            });
        } catch (err) {
            console.error('[CourseList] generate error:', err);
            setError(t('generateCourseError'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden bg-[#F7F3FF] pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10">
            <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_15%_20%,#FFE680_0,transparent_26%),radial-gradient(circle_at_80%_8%,#8EE8FF_0,transparent_24%),linear-gradient(135deg,#FDF2F8_0%,#EFF6FF_48%,#ECFDF5_100%)]" />
            <div className="relative z-10 mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
                <header className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:items-stretch">
                    <section className="rounded-[34px] border-4 border-white bg-white/85 p-5 shadow-[0_14px_0_rgba(91,141,239,0.14)] backdrop-blur sm:p-7">
                        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="inline-flex w-fit rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-amber-700">
                                {t('heroKicker')}
                            </div>
                            <LanguageSwitch />
                        </div>
                        <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            {activeFilter ? pageTitle : t('heroTitle')}
                        </h1>
                        <p className="mt-4 max-w-3xl text-base font-bold leading-7 text-slate-600 sm:text-lg">
                            {t('heroBody')}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/courses')}
                                className="min-h-12 rounded-full bg-slate-900 px-6 text-sm font-black text-white shadow-[0_6px_0_rgba(15,23,42,0.22)] transition-transform hover:-translate-y-0.5"
                            >
                                {t('browseCourses')}
                            </button>
                            {featuredCourse && (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/courses/${featuredCourse.course_id}`)}
                                    className="min-h-12 rounded-full border-4 border-white bg-gradient-to-br from-[#7DD3FC] to-[#BBF7D0] px-6 text-sm font-black text-slate-800 shadow-[0_6px_0_rgba(14,165,233,0.18)] transition-transform hover:-translate-y-0.5"
                                >
                                    {t('enrollNow')}
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[34px] border-4 border-white bg-gradient-to-br from-[#FFF7AD] via-white to-[#BFF7EA] p-5 shadow-[0_14px_0_rgba(251,191,36,0.18)]">
                        <p className="text-sm font-black uppercase tracking-wide text-slate-500">{t('progressDemo')}</p>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-3xl bg-white/80 p-4 shadow-[inset_0_-5px_0_rgba(15,23,42,0.06)]">
                                <p className="text-3xl font-black text-sky-600">{overallProgress}%</p>
                                <p className="text-sm font-black text-slate-500">{t('completed')}</p>
                            </div>
                            <div className="rounded-3xl bg-white/80 p-4 shadow-[inset_0_-5px_0_rgba(15,23,42,0.06)]">
                                <p className="text-3xl font-black text-amber-600">{totalXp}</p>
                                <p className="text-sm font-black text-slate-500">{t('xpEarned')}</p>
                            </div>
                        </div>
                        <div className="mt-5 h-4 overflow-hidden rounded-full bg-white">
                            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-fuchsia-300 to-amber-300" style={{ width: `${overallProgress}%` }} />
                        </div>
                        <p className="mt-3 text-sm font-bold text-slate-600">
                            {completedLessons} / {totalLessons} {t('lessonsDone').toLowerCase()}
                        </p>
                    </section>
                </header>

                <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: t('courses'), value: courses.length, tone: 'bg-sky-100 text-sky-700', mark: 'C' },
                        { label: t('lessonsDone'), value: `${completedLessons}/${totalLessons}`, tone: 'bg-emerald-100 text-emerald-700', mark: 'L' },
                        { label: t('xpEarned'), value: totalXp, tone: 'bg-yellow-100 text-amber-700', mark: 'XP' },
                        { label: t('inProgress'), value: inProgress, tone: 'bg-rose-100 text-rose-700', mark: 'GO' },
                    ].map(item => (
                        <div key={item.label} className="rounded-[28px] border-4 border-white bg-white/85 p-4 shadow-[0_9px_0_rgba(91,141,239,0.12)]">
                            <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black ${item.tone}`}>{item.mark}</div>
                            <div className="text-3xl font-black text-slate-900">{item.value}</div>
                            <div className="text-sm font-black text-slate-500">{item.label}</div>
                        </div>
                    ))}
                </section>

                {learningPaths.length > 0 && !activeFilter && (
                    <section className="mb-8">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-sm font-black uppercase tracking-wide text-sky-600">{t('coursePreview')}</p>
                                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">{t('learningPaths')}</h2>
                            </div>
                        </div>
                        <div className="grid gap-5 xl:grid-cols-3">
                            {learningPaths.map(path => (
                                <button
                                    key={path.key}
                                    type="button"
                                    onClick={() => navigate(`/courses/category/${path.key}`)}
                                    className="group min-w-0 rounded-[32px] border-4 border-white bg-white/90 p-5 text-left shadow-[0_10px_0_rgba(91,141,239,0.12)] transition-transform hover:-translate-y-1"
                                >
                                    <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] gap-4">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-200 to-sky-200 text-lg font-black text-slate-800 shadow-[0_5px_0_rgba(0,0,0,0.10)]">
                                            {path.mark}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="line-clamp-2 text-xl font-black text-slate-900">{path.title}</h3>
                                            <p className="mt-1 font-bold text-slate-500">{path.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="mt-5 flex items-center justify-between text-sm font-black text-slate-500">
                                        <span>{path.completedCourses} / {path.courses.length} {t('done')}</span>
                                        <span className="text-sky-600">{path.progressPercent}%</span>
                                    </div>
                                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-rose-300" style={{ width: `${path.progressPercent}%` }} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {activeFilter && (
                    <div className="mb-5">
                        <button type="button" onClick={() => navigate('/courses')} className="min-h-11 rounded-full border-4 border-white bg-white px-5 text-sm font-black text-slate-700 shadow-[0_5px_0_rgba(15,23,42,0.08)]">
                            {t('backToAllPaths')}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-5 rounded-3xl border-4 border-white bg-rose-50 p-4 text-center font-black text-rose-600 shadow-sm">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {[1, 2, 3].map(item => (
                            <div key={item} className="h-80 animate-pulse rounded-[28px] bg-white/70" />
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="mx-auto max-w-xl rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-100 text-2xl font-black text-sky-700">C</div>
                        <h2 className="mt-3 text-2xl font-black text-slate-800">{t('noCourses')}</h2>
                        <p className="mt-2 font-bold text-slate-600">{t('noCoursesBody')}</p>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="mt-5 min-h-12 w-full rounded-full bg-slate-900 px-6 font-black text-white shadow-[0_6px_0_rgba(15,23,42,0.22)] disabled:opacity-60"
                        >
                            {isGenerating ? t('generating') : t('generateCourse')}
                        </button>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-100 text-2xl font-black text-amber-700">?</div>
                        <h2 className="mt-3 text-2xl font-black text-slate-800">{t('noCoursesInCategory')}</h2>
                        <p className="mt-2 font-bold text-slate-600">{t('noCoursesInCategoryBody')}</p>
                    </div>
                ) : (
                    <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                        {filteredCourses.map(course => {
                            const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
                            const totalCourseXp = course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0);
                            const firstLessonId = progressByCourse.get(course.course_id)?.current_lesson_id || course.lessons[0]?.lesson_id;
                            const title = courseTitle(course, locale);
                            const theme = courseTheme(course, locale);
                            return (
                                <article
                                    key={course.course_id}
                                    className="group relative min-w-0 cursor-pointer overflow-hidden rounded-[30px] border-4 border-white bg-white shadow-[0_12px_0_rgba(91,141,239,0.13)] transition-transform hover:-translate-y-1"
                                    onClick={() => navigate(`/courses/${course.course_id}`)}
                                >
                                    <div className="relative">
                                        <AssetTile
                                            asset={course.thumbnail}
                                            label={theme}
                                            emoji={initials(theme)}
                                            className="min-h-[150px] rounded-b-none border-0 bg-gradient-to-br from-sky-100 via-emerald-50 to-yellow-50"
                                        />
                                        <div className="absolute left-3 top-3 rounded-full bg-yellow-300 px-4 py-2 text-xs font-black text-slate-900 shadow-[0_4px_0_rgba(180,83,9,0.25)]">
                                            {totalCourseXp} XP
                                        </div>
                                    </div>

                                    <div className="min-w-0 p-4 sm:p-5">
                                        <div className="mb-3 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                                                {t('age')} {course.age_range}
                                            </span>
                                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
                                                {course.lessons.length} {t('lessons')}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black leading-tight text-slate-900 sm:text-2xl">{title}</h2>
                                        <p className="mt-1 text-sm font-black text-sky-600">{courseSubtitle(course, locale)}</p>
                                        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm font-semibold leading-6 text-slate-600">
                                            {courseDescription(course, locale)}
                                        </p>
                                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-rose-300" style={{ width: `${courseProgress.progressPercent}%` }} />
                                        </div>
                                        <div className="mt-2 text-xs font-bold text-slate-500">
                                            {courseProgress.completedLessons} / {courseProgress.totalLessons} {t('lessonsDone').toLowerCase()}
                                        </div>
                                        <button
                                            type="button"
                                            className="mt-5 min-h-12 w-full rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] px-5 font-black text-slate-900 shadow-[0_6px_0_rgba(14,165,233,0.20)] transition-transform hover:-translate-y-0.5"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(firstLessonId ? `/courses/${course.course_id}/lessons/${firstLessonId}` : `/courses/${course.course_id}`);
                                            }}
                                        >
                                            {courseProgress.completedLessons > 0 ? t('continueLearning') : t('startLearning')}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {featuredTestimonials.length > 0 && (
                    <section className="mt-9 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                        <div className="rounded-[32px] border-4 border-white bg-slate-900 p-6 text-white shadow-[0_12px_0_rgba(15,23,42,0.16)]">
                            <p className="text-sm font-black uppercase tracking-wide text-sky-200">{t('enrollNow')}</p>
                            <h2 className="mt-2 text-3xl font-black leading-tight">{featuredCourse ? courseTitle(featuredCourse, locale) : t('courseCatalog')}</h2>
                            <p className="mt-3 font-bold text-slate-200">{featuredCourse ? courseDescription(featuredCourse, locale) : t('heroBody')}</p>
                            {featuredCourse && (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/courses/${featuredCourse.course_id}`)}
                                    className="mt-5 min-h-12 rounded-full bg-white px-6 font-black text-slate-900 shadow-[0_6px_0_rgba(255,255,255,0.18)]"
                                >
                                    {t('enrollNow')}
                                </button>
                            )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {featuredTestimonials.map(item => (
                                <article key={`${item.name}-${item.role}`} className="rounded-[28px] border-4 border-white bg-white/90 p-5 shadow-[0_9px_0_rgba(91,141,239,0.11)]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-200 to-sky-200 text-lg font-black text-slate-800">
                                            {item.avatar || item.name.slice(0, 1)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{item.name}</p>
                                            <p className="text-sm font-bold text-slate-500">{item.role}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 font-bold leading-6 text-slate-600">"{item.quote}"</p>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default CourseList;
