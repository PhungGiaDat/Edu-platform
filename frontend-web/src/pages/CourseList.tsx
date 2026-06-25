import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { CourseCard } from '@/components/CourseCard';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { colors, radius, shadows, transitions } from '@/design-tokens/claymorphic';
import {
    courseCategoryLabel,
    courseTheme,
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

const BookOpenIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 7v14" />
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5z" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const BoltIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 2 4 14h6.7L9.5 22 20 9h-7.1L13.5 2Z" />
    </svg>
);

const RocketIcon: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4c3.5 1 5 3 6 6-3 1-5 2.5-7 5l-4-4c2.5-2 4-4 5-7Z" />
        <path d="M9 15 5 19" />
        <path d="M6 13 4 15" />
        <path d="M11 18 9 20" />
        <circle cx="15" cy="9" r="1.5" />
    </svg>
);

const pathClayPalette = (index: number) => [
    {
        card: 'linear-gradient(145deg, #FFFFFF 0%, #FFF7D6 52%, #FFE8F0 100%)',
        shadow: '0 12px 0 rgba(255, 159, 159, 0.24), 0 22px 40px rgba(91, 141, 239, 0.16), inset 0 2px 0 rgba(255,255,255,1)',
        icon: 'from-[#FFE066] to-[#B4E197]',
        progress: 'linear-gradient(90deg, #FFD93D, #FF9F9F)',
        border: 'rgba(255, 217, 61, 0.35)',
    },
    {
        card: 'linear-gradient(145deg, #FFFFFF 0%, #E8FFF0 50%, #E4F4FF 100%)',
        shadow: '0 12px 0 rgba(110, 185, 255, 0.22), 0 22px 40px rgba(91, 141, 239, 0.16), inset 0 2px 0 rgba(255,255,255,1)',
        icon: 'from-[#A8E6CF] to-[#88C4FF]',
        progress: 'linear-gradient(90deg, #6EB9FF, #B4E197)',
        border: 'rgba(110, 185, 255, 0.32)',
    },
    {
        card: 'linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 48%, #FFE4F3 100%)',
        shadow: '0 12px 0 rgba(196, 138, 255, 0.20), 0 22px 40px rgba(91, 141, 239, 0.16), inset 0 2px 0 rgba(255,255,255,1)',
        icon: 'from-[#D4A5FF] to-[#FF9F9F]',
        progress: 'linear-gradient(90deg, #A78BFA, #FF9F9F)',
        border: 'rgba(196, 138, 255, 0.28)',
    },
][index % 3];

const levelLabel: Record<Locale, Record<string, string>> = {
    en: {
        beginner: 'Beginner Journey',
        intermediate: 'Young Explorer',
        advanced: 'Brave Challenger',
    },
    vi: {
        beginner: 'Lộ trình bắt đầu',
        intermediate: 'Nhà thám hiểm nhỏ',
        advanced: 'Thử thách dũng cảm',
    },
};

const categoryFallback: Record<string, { en: string; vi: string; mark: string }> = {
    nature: { en: 'Animals and Nature', vi: 'Động vật và thiên nhiên', mark: 'AN' },
    home_family: { en: 'Home and Family', vi: 'Gia đình', mark: 'HF' },
    school_food: { en: 'School and Food', vi: 'Trường học và món ăn', mark: 'SF' },
};

const makeDemoLessons = (prefix: string) => Array.from({ length: 6 }, (_, index) => ({
    lesson_id: `${prefix}-lesson-${index + 1}`,
    title: ['Meet the words', 'Watch and listen', 'Tap the picture', 'Say it aloud', 'Play the quiz', 'Earn a sticker'][index],
    title_vi: ['Gặp từ mới', 'Xem và nghe', 'Chạm vào hình', 'Nói thật rõ', 'Chơi quiz', 'Nhận sticker'][index],
    order: index + 1,
    duration_minutes: 6 + index,
    vocabulary: [],
    quiz: [],
    generatedMedia: [],
})) as Course['lessons'];

const demoCourses: Course[] = [
    {
        course_id: 'demo-home-family',
        title: 'Momo Learns English at Home',
        description: 'A cheerful first course about family, rooms, feelings, and daily routines.',
        subtitle_vi: 'Gia đình, ngôi nhà và cảm xúc',
        theme: 'Home and Family',
        category_key: 'home_family',
        category_label: 'Home and Family',
        category_icon: 'HF',
        age_range: '5-7',
        level: 'beginner',
        description_vi: 'Khóa học vui về gia đình, các phòng, cảm xúc và thói quen hằng ngày.',
        catalogPreview: [],
        studentTestimonials: [],
        lessons: makeDemoLessons('home'),
        is_published: true,
    },
    {
        course_id: 'demo-animals-nature',
        title: 'Momo Explores Animals and Nature',
        description: 'AR flashcards, nature stories, animal words, and playful mini games.',
        subtitle_vi: 'Động vật, rừng và thiên nhiên',
        theme: 'Animals and Nature',
        category_key: 'nature',
        category_label: 'Animals and Nature',
        category_icon: 'AN',
        age_range: '5-7',
        level: 'beginner',
        description_vi: 'Flashcard AR, truyện thiên nhiên, từ vựng động vật và trò chơi nhỏ.',
        catalogPreview: [],
        studentTestimonials: [],
        lessons: makeDemoLessons('nature'),
        is_published: true,
    },
    {
        course_id: 'demo-school-food',
        title: 'Momo Learns English at School',
        description: 'Classroom phrases, lunch words, colors, games, speaking practice, and rewards.',
        subtitle_vi: 'Trường học, lớp học và món ăn',
        theme: 'School and Food',
        category_key: 'school_food',
        category_label: 'School and Food',
        category_icon: 'SF',
        age_range: '5-7',
        level: 'beginner',
        description_vi: 'Câu giao tiếp ở lớp, món ăn, màu sắc, trò chơi, luyện nói và phần thưởng.',
        catalogPreview: [],
        studentTestimonials: [],
        lessons: makeDemoLessons('school'),
        is_published: true,
    },
];

const demoPathStats = {
    completedLessons: 7,
    totalLessons: 18,
    totalXp: 1240,
    inProgress: 2,
    progressPercent: 39,
};

const getLearnerId = (userId?: string | null, isGuest?: boolean) => (
    userId || (isGuest ? 'guest-learner' : null)
);

const courseListTheme = {
    '--course-ink': colors.deepSlate,
    '--course-muted': colors.mediumGray,
    '--course-page': colors.skyBlueLight,
    '--course-yellow': colors.sunshineYellow,
    '--course-yellow-dark': colors.sunshineYellowDark,
    '--course-coral': colors.coralPink,
    '--course-coral-dark': colors.coralPinkDark,
    '--course-card-radius': radius['4xl'],
    '--course-card-shadow': shadows.clayLg,
    '--course-button-shadow': shadows.clayPink,
    '--course-motion': `${transitions.normal} ${transitions.springSubtle}`,
} as React.CSSProperties;

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
        ? (locale === 'vi' ? 'Động vật và thiên nhiên' : 'Animals and Nature')
        : activeFilter && courses.some(course => course.category_key === activeFilter)
            ? courseCategoryLabel(courses.find(course => course.category_key === activeFilter)!, locale)
        : activeFilter && ['beginner', 'intermediate', 'advanced'].includes(activeFilter)
            ? levelLabel[locale][activeFilter] || activeFilter
            : t('courseCatalog');

    const hasLiveCourses = courses.length > 0;
    const displayCourses = hasLiveCourses ? filteredCourses : demoCourses;
    const displayPaths = learningPaths.length > 0
        ? learningPaths
        : demoCourses.map(course => ({
            key: course.category_key,
            title: courseCategoryLabel(course, locale),
            subtitle: `1 ${t('courses').toLowerCase()}`,
            mark: categoryFallback[course.category_key]?.mark || initials(courseTheme(course, locale)),
            courses: [course],
            completedCourses: 0,
            completedLessons: course.category_key === 'nature' ? 3 : 2,
            totalLessons: course.lessons.length,
            progressPercent: course.category_key === 'nature' ? 50 : 33,
        }));
    const totalLessons = hasLiveCourses
        ? courses.reduce((sum, course) => sum + course.lessons.length, 0)
        : demoPathStats.totalLessons;
    const completedLessons = hasLiveCourses
        ? progress.reduce((sum, item) => sum + (item.completed_lessons?.length || 0), 0)
        : demoPathStats.completedLessons;
    const totalXp = hasLiveCourses
        ? progress.reduce((sum, item) => sum + (item.total_xp || 0), 0)
        : demoPathStats.totalXp;
    const inProgress = hasLiveCourses
        ? progress.filter(item => item.status === 'started').length
        : demoPathStats.inProgress;
    const statCards = [
        { label: locale === 'vi' ? 'Tổng khóa học' : 'Total Courses', value: hasLiveCourses ? courses.length : demoCourses.length, icon: BookOpenIcon, tone: 'text-sky-500' },
        { label: t('lessonsDone'), value: `${completedLessons}/${totalLessons}`, icon: CheckIcon, tone: 'text-emerald-500' },
        { label: t('xpEarned'), value: totalXp, icon: BoltIcon, tone: 'text-amber-500' },
        { label: t('inProgress'), value: inProgress, icon: RocketIcon, tone: 'text-rose-500' },
    ];

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
        <div
            className="course-catalog min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10"
            style={courseListTheme}
        >
            <div className="pointer-events-none fixed inset-0 hidden overflow-hidden sm:block">
                <div
                    className="clay-shape-blob absolute -left-20 top-20 h-64 w-64 opacity-30"
                    style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)', animationDelay: '0s' }}
                />
                <div
                    className="clay-shape-blob absolute -right-16 top-1/3 h-48 w-48 opacity-25"
                    style={{ background: 'linear-gradient(135deg, #4ECDC4, #7EE8E0)', animationDelay: '2s' }}
                />
                <div
                    className="clay-shape-blob absolute bottom-20 left-1/4 h-56 w-56 opacity-20"
                    style={{ background: 'linear-gradient(135deg, #45B7D1, #7DD3E8)', animationDelay: '4s' }}
                />
            </div>
            <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 xl:px-10">
                <header className="mx-auto mb-8 max-w-4xl text-center sm:mb-10">
                    <div className="mb-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <div className="clay-badge clay-badge-yellow max-w-full text-center text-base sm:text-lg">
                            <span>{t('heroKicker')}</span>
                        </div>
                        <LanguageSwitch />
                    </div>
                    <h1 className="mb-5 text-5xl font-black leading-none text-slate-800 sm:text-6xl lg:text-7xl" style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}>
                        {activeFilter ? pageTitle : t('courseCatalog')}
                    </h1>
                    <p className="mx-auto max-w-3xl text-xl font-semibold leading-9 text-slate-600 sm:text-2xl">
                        {t('heroBody')}
                    </p>
                    {!hasLiveCourses && !isLoading && (
                        <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-3 rounded-[28px] border-4 border-white bg-white/75 p-4 shadow-[0_8px_0_rgba(91,141,239,0.10)] sm:flex-row sm:justify-between sm:text-left">
                            <p className="text-sm font-black text-slate-600">{t('noCoursesBody')}</p>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="clay-btn clay-btn-sm clay-btn-yellow shrink-0 disabled:opacity-60"
                            >
                                {isGenerating ? t('generating') : t('generateCourse')}
                            </button>
                        </div>
                    )}
                </header>

                <section className="mb-9 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {statCards.map(item => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="clay-stat-card min-w-0 !rounded-[26px] !border-white/90 !bg-white/95 !p-5 sm:!p-7">
                                <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center ${item.tone}`}>
                                    <Icon />
                                </div>
                                <div className="clay-stat-number break-words !text-4xl sm:!text-5xl">{item.value}</div>
                                <div className="clay-stat-label !text-base">{item.label}</div>
                            </div>
                        );
                    })}
                </section>

                {!activeFilter && (
                    <section className="mb-8">
                        <div className="mb-5 flex items-end justify-between gap-4">
                            <div>
                                <h2 className="text-4xl font-black leading-tight text-slate-800 sm:text-5xl" style={{ fontFamily: "'Baloo 2', system-ui, sans-serif" }}>
                                    {locale === 'vi' ? 'Lộ trình học của bạn' : 'Your Learning Paths'}
                                </h2>
                                <div className="mt-3 h-2 w-52 rounded-full bg-gradient-to-r from-[#FFD93D] to-[#FF9F9F]" />
                            </div>
                            {!hasLiveCourses && (
                                <span className="clay-badge clay-badge-blue hidden text-xs sm:inline-flex">
                                    Demo
                                </span>
                            )}
                        </div>

                        {displayPaths.length > 0 && (
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {displayPaths.map((path, index) => {
                                const palette = pathClayPalette(index);
                                return (
                                <button
                                    key={path.key}
                                    type="button"
                                    onClick={() => hasLiveCourses && navigate(`/courses/category/${path.key}`)}
                                    className="group min-w-0 rounded-[34px] border-4 p-5 text-left transition-transform hover:-translate-y-1 disabled:cursor-default"
                                    style={{
                                        background: palette.card,
                                        borderColor: palette.border,
                                        boxShadow: palette.shadow,
                                    }}
                                    disabled={!hasLiveCourses}
                                >
                                    <div className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] items-center gap-4">
                                        <div className={`flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-3xl bg-gradient-to-br ${palette.icon} text-lg font-black text-slate-800 shadow-[0_7px_0_rgba(0,0,0,0.12),inset_0_2px_0_rgba(255,255,255,0.65)] transition-transform group-hover:-rotate-2`}>
                                            {path.mark}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="line-clamp-1 text-xl font-black text-slate-800">{path.title}</h3>
                                            <p className="text-base font-bold text-slate-500">{path.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-sm font-black text-slate-500">
                                        <span>{path.completedCourses} / {path.courses.length} {t('done')}</span>
                                        <span className="text-sky-600">{path.progressPercent}%</span>
                                    </div>
                                    <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/70 shadow-[inset_0_2px_4px_rgba(15,23,42,0.08)]">
                                        <div
                                            className="h-full rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                                            style={{ width: `${path.progressPercent}%`, background: palette.progress }}
                                        />
                                    </div>
                                </button>
                                );
                            })}
                        </div>
                        )}
                    </section>
                )}

                {activeFilter && (
                    <div className="mb-5">
                        <button type="button" onClick={() => navigate('/courses')} className="clay-btn clay-btn-sm clay-btn-white">
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
                            <div key={item} className="h-72 animate-pulse rounded-[28px] bg-white/70" />
                        ))}
                    </div>
                ) : hasLiveCourses && filteredCourses.length === 0 ? (
                    <div className="mx-auto max-w-xl rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-100 text-2xl font-black text-amber-700">?</div>
                        <h2 className="mt-3 text-2xl font-black text-slate-800">{t('noCoursesInCategory')}</h2>
                        <p className="mt-2 font-bold text-slate-600">{t('noCoursesInCategoryBody')}</p>
                    </div>
                ) : (
                    <div className="course-list-grid grid min-w-0 gap-6 lg:grid-cols-2 xl:grid-cols-3 xl:gap-7">
                        {displayCourses.map((course, index) => {
                            const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
                            const totalCourseXp = course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0);
                            const firstLessonId = progressByCourse.get(course.course_id)?.current_lesson_id || course.lessons[0]?.lesson_id;
                            const displayProgress = hasLiveCourses ? courseProgress.progressPercent : [35, 50, 22][index] || 30;
                            const displayXp = hasLiveCourses ? totalCourseXp : [500, 350, 480][index] || 420;
                            const duration = course.lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0) || course.lessons.length * 6;
                            const displayLevel = levelLabel[locale][course.level] || course.level || (locale === 'vi' ? 'Bắt đầu' : 'Beginner');
                            const tags = [
                                'AR',
                                locale === 'vi' ? 'Từ vựng' : 'Vocabulary',
                                locale === 'vi' ? 'Vui' : 'Fun',
                            ];
                            const completed = hasLiveCourses ? courseProgress.completedLessons : [2, 3, 1][index] || 0;
                            const total = courseProgress.totalLessons || course.lessons.length || 1;

                            return (
                                <CourseCard
                                    key={course.course_id}
                                    course={course}
                                    locale={locale}
                                    completedLessons={completed}
                                    totalLessons={total}
                                    progressPercent={displayProgress}
                                    xp={displayXp}
                                    durationMinutes={duration}
                                    levelLabel={displayLevel}
                                    actionLabel={completed > 0 ? t('continueLearning') : t('startLearning')}
                                    progressLabel={t('progress')}
                                    hourLabel={locale === 'vi' ? 'giờ' : 'hours'}
                                    tags={tags}
                                    isInteractive={hasLiveCourses}
                                    onOpen={() => navigate(`/courses/${course.course_id}`)}
                                    onStart={() => {
                                        navigate(firstLessonId ? `/courses/${course.course_id}/lessons/${firstLessonId}` : `/courses/${course.course_id}`);
                                    }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseList;
