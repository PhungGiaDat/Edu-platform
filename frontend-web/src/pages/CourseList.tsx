import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { AssetTile } from '@/components/courses/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/CourseService';
import type { Course, UserProgress } from '@/types/course';

type PathFilter = {
    key: string;
    title: string;
    subtitle: string;
    icon: string;
    courses: Course[];
    completedCourses: number;
    completedLessons: number;
    totalLessons: number;
    progressPercent: number;
};

const levelLabel: Record<string, string> = {
    beginner: 'Beginner Journey',
    intermediate: 'Young Explorer',
    advanced: 'Brave Challenger',
};

const levelIcon: Record<string, string> = {
    beginner: '🚀',
    intermediate: '⭐',
    advanced: '🏆',
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

const buildLevelPath = (
    level: string,
    courses: Course[],
    progressByCourse: Map<string, UserProgress>,
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

    return {
        key: level,
        title: levelLabel[level] || `${level} Path`,
        subtitle: `${pathCourses.length} course${pathCourses.length === 1 ? '' : 's'}`,
        icon: levelIcon[level] || '📚',
        courses: pathCourses,
        completedCourses: totals.completedCourses,
        completedLessons: totals.completedLessons,
        totalLessons: totals.totalLessons,
        progressPercent,
    };
};

export const CourseList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { level, pathId } = useParams();
    const { user, isGuest } = useAuth();
    const learnerId = getLearnerId(user?.id, isGuest);
    const [courses, setCourses] = useState<Course[]>([]);
    const [progress, setProgress] = useState<UserProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const activeFilter = level || pathId || (location.pathname.endsWith('/animals') ? 'animals' : null);

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
            setError('Chưa tải được khóa học. Bé thử lại nhé!');
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
        const levels = Array.from(new Set(courses.map(course => course.level))).sort();
        return levels
            .map(pathLevel => buildLevelPath(pathLevel, courses, progressByCourse))
            .filter((path): path is PathFilter => Boolean(path));
    }, [courses, progressByCourse]);

    const filteredCourses = useMemo(() => {
        if (!activeFilter) return courses;
        if (activeFilter === 'animals') return courses.filter(isAnimalNatureCourse);
        if (['beginner', 'intermediate', 'advanced'].includes(activeFilter)) {
            return courses.filter(course => course.level === activeFilter);
        }
        return courses.filter(course => course.course_id === activeFilter);
    }, [activeFilter, courses]);

    const pageTitle = activeFilter === 'animals'
        ? 'Animals and Nature'
        : activeFilter && ['beginner', 'intermediate', 'advanced'].includes(activeFilter)
            ? levelLabel[activeFilter] || activeFilter
            : 'Course Catalog';

    const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
    const completedLessons = progress.reduce((sum, item) => sum + (item.completed_lessons?.length || 0), 0);
    const totalXp = progress.reduce((sum, item) => sum + (item.total_xp || 0), 0);
    const inProgress = progress.filter(item => item.status === 'started').length;

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
            setError('Chưa tạo được khóa học từ seed. Kiểm tra backend/MongoDB nhé.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10">
            <div className="relative z-10 mx-auto w-full max-w-7xl min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 xl:px-10">
                <header className="mx-auto mb-6 max-w-4xl text-center sm:mb-8">
                    <div className="clay-badge clay-badge-yellow mb-4 max-w-full text-center">
                        <span>🎓</span>
                        <span>Học ngắn, nghe nhiều, chơi vui!</span>
                    </div>
                    <h1 className="mb-3 text-3xl font-black leading-tight text-gray-800 sm:text-4xl md:text-5xl">
                        {pageTitle}
                    </h1>
                    <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                        Khóa học được tải từ MongoDB. Tiến độ lấy theo tài khoản hiện tại.
                    </p>
                </header>

                <section className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="clay-stat-card">
                        <div className="text-3xl">📚</div>
                        <div className="clay-stat-number">{courses.length}</div>
                        <div className="clay-stat-label">Courses</div>
                    </div>
                    <div className="clay-stat-card">
                        <div className="text-3xl">✅</div>
                        <div className="clay-stat-number">{completedLessons}/{totalLessons}</div>
                        <div className="clay-stat-label">Lessons Done</div>
                    </div>
                    <div className="clay-stat-card">
                        <div className="text-3xl">⚡</div>
                        <div className="clay-stat-number">{totalXp}</div>
                        <div className="clay-stat-label">XP Earned</div>
                    </div>
                    <div className="clay-stat-card">
                        <div className="text-3xl">🚀</div>
                        <div className="clay-stat-number">{inProgress}</div>
                        <div className="clay-stat-label">In Progress</div>
                    </div>
                </section>

                {learningPaths.length > 0 && !activeFilter && (
                    <section className="mb-8">
                        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 sm:text-3xl">Your Learning Paths</h2>
                                <div className="mt-2 h-2 w-44 rounded-full bg-gradient-to-r from-yellow-300 to-rose-300" />
                            </div>
                        </div>
                        <div className="grid gap-5 xl:grid-cols-2">
                            {learningPaths.map(path => (
                                <button
                                    key={path.key}
                                    onClick={() => navigate(`/courses/level/${path.key}`)}
                                    className="group min-w-0 rounded-[32px] border-4 border-white bg-white p-5 text-left shadow-[0_10px_0_rgba(91,141,239,0.12)] transition-transform hover:-translate-y-1"
                                >
                                    <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] gap-4">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-yellow-100 text-4xl shadow-[0_5px_0_rgba(0,0,0,0.12)]">
                                            {path.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate text-xl font-black text-slate-800 sm:text-2xl">{path.title}</h3>
                                            <p className="mt-1 font-bold text-slate-500">{path.subtitle}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-[#5B8DEF]">{path.progressPercent}%</div>
                                            <div className="text-xs font-bold text-slate-500">completed</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-[#5B8DEF] to-[#FF9F9F]"
                                            style={{ width: `${path.progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 gap-2">
                                            {path.courses.slice(0, 3).map(course => (
                                                <div key={course.course_id} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl font-black shadow-sm">
                                                    {(course.theme || course.title).slice(0, 1).toUpperCase()}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="shrink-0 text-sm font-bold text-slate-500">
                                            {path.completedCourses} of {path.courses.length} done
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {activeFilter && (
                    <div className="mb-5">
                        <button onClick={() => navigate('/courses')} className="clay-btn clay-btn-sm bg-white text-slate-700">
                            Back to all paths
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
                ) : courses.length === 0 ? (
                    <div className="mx-auto max-w-xl rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                        <div className="text-6xl">📚</div>
                        <h2 className="mt-3 text-2xl font-black text-slate-800">Chưa có khóa học</h2>
                        <p className="mt-2 font-bold text-slate-600">Tạo khóa học từ seed để bắt đầu Phase 1.</p>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="clay-cta-primary mt-5 w-full justify-center disabled:opacity-60"
                        >
                            {isGenerating ? 'Đang tạo...' : 'Tạo khóa học từ seed'}
                        </button>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="rounded-[32px] border-4 border-white bg-white p-6 text-center shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                        <div className="text-5xl">🔎</div>
                        <h2 className="mt-3 text-2xl font-black text-slate-800">Chưa có khóa học trong mục này</h2>
                        <p className="mt-2 font-bold text-slate-600">Seed hoặc publish thêm course trong MongoDB nhé.</p>
                    </div>
                ) : (
                    <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                        {filteredCourses.map(course => {
                            const courseProgress = getCourseProgress(course, progressByCourse.get(course.course_id));
                            const totalCourseXp = course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0);
                            const firstLessonId = progressByCourse.get(course.course_id)?.current_lesson_id || course.lessons[0]?.lesson_id;
                            return (
                                <article
                                    key={course.course_id}
                                    className="clay-course-card group relative min-w-0"
                                    onClick={() => navigate(`/courses/${course.course_id}`)}
                                >
                                    <div className="relative">
                                        <AssetTile
                                            asset={course.thumbnail}
                                            label={course.theme || course.level}
                                            emoji="🌿"
                                            className="rounded-b-none border-0"
                                        />
                                        <div className="clay-badge clay-badge-yellow absolute left-3 top-3 px-2.5 py-1 text-[11px] leading-none sm:px-3 sm:text-xs">
                                            ⚡ {totalCourseXp} XP
                                        </div>
                                    </div>

                                    <div className="min-w-0 p-4 sm:p-5">
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">
                                                Age {course.age_range}
                                            </span>
                                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-600">
                                                {course.lessons.length} lessons
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black leading-tight text-slate-800 sm:text-2xl">{course.title}</h2>
                                        <p className="mt-1 text-sm font-bold text-slate-500">{course.subtitle_vi || course.theme}</p>
                                        <p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-600">
                                            {course.description_vi || course.description}
                                        </p>
                                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#5B8DEF] to-[#FF9F9F]"
                                                style={{ width: `${courseProgress.progressPercent}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 text-xs font-bold text-slate-500">
                                            {courseProgress.completedLessons} of {courseProgress.totalLessons} lessons done
                                        </div>
                                        <button
                                            className="clay-btn clay-btn-md mt-5 w-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] text-slate-800"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                navigate(firstLessonId ? `/courses/${course.course_id}/lessons/${firstLessonId}` : `/courses/${course.course_id}`);
                                            }}
                                        >
                                            {courseProgress.completedLessons > 0 ? 'Continue learning' : 'Start learning'}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseList;
