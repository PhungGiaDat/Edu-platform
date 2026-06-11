import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AssetTile } from '@/components/courses/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/CourseService';
import type { Course, UserProgress } from '@/types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

const colorMap: Record<string, string> = {
    sky: 'from-sky-100 to-blue-50 text-sky-700',
    amber: 'from-yellow-100 to-orange-50 text-amber-700',
    violet: 'from-violet-100 to-fuchsia-50 text-violet-700',
    rose: 'from-rose-100 to-pink-50 text-rose-700',
    emerald: 'from-emerald-100 to-teal-50 text-emerald-700',
};

export const CourseDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        if (!id) return;
        const learnerId = getLearnerId(user?.id);
        setIsLoading(true);
        setError(null);
        Promise.all([
            courseService.getCourse(id),
            courseService.getProgress(learnerId).catch(() => [] as UserProgress[]),
        ])
            .then(([nextCourse, progressList]) => {
                setCourse(nextCourse);
                setProgress(progressList.find(item => item.course_id === nextCourse.course_id) || null);
            })
            .catch(err => {
                console.error('[CourseDetail] load error:', err);
                setError('Khong tim thay khoa hoc.');
            })
            .finally(() => setIsLoading(false));
    }, [id, user?.id]);

    const handleStart = async () => {
        if (!course) return;
        setIsStarting(true);
        try {
            const nextProgress = await courseService.startCourse(course.course_id, getLearnerId(user?.id));
            setProgress(nextProgress);
            const lessonId = nextProgress.current_lesson_id || course.lessons[0]?.lesson_id;
            navigate(`/courses/${course.course_id}/lessons/${lessonId}`);
        } catch (err) {
            console.error('[CourseDetail] start error:', err);
            setError('Chua bat dau duoc. Be thu lai nhe!');
        } finally {
            setIsStarting(false);
        }
    };

    const stats = useMemo(() => {
        if (!course) return { totalXp: 0, completed: 0, percent: 0 };
        const completed = progress?.completed_lessons.length || 0;
        const percent = Math.round((completed / Math.max(course.lessons.length, 1)) * 100);
        return {
            totalXp: course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0),
            completed,
            percent,
        };
    }, [course, progress]);

    if (isLoading) {
        return <div className="min-h-screen clay-bg-playful p-6 text-center text-xl font-black text-slate-700">Dang tai khoa hoc...</div>;
    }

    if (!course || error) {
        return (
            <div className="min-h-screen clay-bg-playful p-6 text-center">
                <p className="text-xl font-black text-rose-600">{error || 'Khong co khoa hoc.'}</p>
                <button type="button" onClick={() => navigate('/courses')} className="clay-cta-primary mt-4">Ve Course Catalog</button>
            </div>
        );
    }

    const preview = course.catalogPreview.length > 0
        ? course.catalogPreview
        : [
            { label: 'Sections', value: String(course.lessons.length), color: 'sky' },
            { label: 'Reward XP', value: String(stats.totalXp), color: 'amber' },
            { label: 'Progress', value: `${stats.percent}%`, color: 'violet' },
        ];
    const cta = course.enrollmentCta || {
        headline: course.title,
        body: course.description_vi || course.description || 'Start this playful English course.',
        buttonLabel: 'Bat dau hoc',
    };

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={() => navigate('/courses')} className="clay-btn clay-btn-sm bg-white text-slate-700">
                        Back
                    </button>
                    <div className="clay-badge clay-badge-yellow self-start sm:self-auto">{stats.totalXp} XP</div>
                </div>

                <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
                    <div className="rounded-[36px] border-4 border-white bg-gradient-to-br from-white via-sky-50 to-rose-50 p-5 shadow-[0_12px_0_rgba(91,141,239,0.14)] sm:p-7">
                        <div className="mb-4 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600">
                            Age {course.age_range} - {course.theme}
                        </div>
                        <h1 className="text-4xl font-black leading-tight text-slate-800 sm:text-5xl lg:text-6xl">{course.title}</h1>
                        <p className="mt-4 max-w-3xl text-xl font-bold text-slate-600">{course.subtitle_vi || course.theme}</p>
                        <p className="mt-3 max-w-3xl text-base font-semibold text-slate-500">
                            {course.description_vi || course.description}
                        </p>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {preview.map(item => (
                                <div key={`${item.label}-${item.value}`} className={`rounded-3xl border-4 border-white bg-gradient-to-br p-4 shadow-[0_6px_0_rgba(15,23,42,0.08)] ${colorMap[item.color] || colorMap.sky}`}>
                                    <p className="text-3xl font-black">{item.value}</p>
                                    <p className="text-sm font-black opacity-80">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="rounded-[36px] border-4 border-white bg-white/85 p-5 shadow-[0_12px_0_rgba(255,142,142,0.14)]">
                        <AssetTile asset={course.thumbnail} label={course.theme} emoji="course" className="min-h-[250px]" />
                        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
                            <div className="flex items-center justify-between text-sm font-black text-slate-600">
                                <span>Progress</span>
                                <span>{stats.completed}/{course.lessons.length}</span>
                            </div>
                            <div className="mt-3 h-4 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#5B8DEF] via-[#B19CD9] to-[#FF8E8E]" style={{ width: `${stats.percent}%` }} />
                            </div>
                            <p className="mt-2 text-center text-3xl font-black text-slate-800">{stats.percent}%</p>
                        </div>
                    </div>
                </header>

                <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                    <div>
                        <h2 className="mb-4 text-3xl font-black text-slate-800">Course sections</h2>
                        <div className="grid gap-4">
                            {course.lessons.map(lesson => {
                                const isComplete = progress?.completed_lessons.includes(lesson.lesson_id) || false;
                                return (
                                    <Link
                                        key={lesson.lesson_id}
                                        to={`/courses/${course.course_id}/lessons/${lesson.lesson_id}`}
                                        className="rounded-[30px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.12)] transition-transform hover:-translate-y-1"
                                    >
                                        <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                                            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl font-black ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100 text-sky-600'}`}>
                                                {lesson.order}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-xl font-black text-slate-800">{lesson.title}</h3>
                                                <p className="font-bold text-slate-500">{lesson.title_vi || lesson.description}</p>
                                                <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                                                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">{lesson.duration_minutes} min</span>
                                                    <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{lesson.vocabulary.length} words</span>
                                                    {lesson.pronunciation && <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">say</span>}
                                                    {lesson.game && <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">game</span>}
                                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{lesson.quiz.length} quiz</span>
                                                </div>
                                            </div>
                                            <span className="clay-btn clay-btn-sm justify-center bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] text-slate-800">
                                                {isComplete ? 'Review' : 'Hoc bai nay'}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    <aside className="space-y-5">
                        <section className="rounded-[34px] border-4 border-white bg-gradient-to-br from-[#FFD93D] via-[#FFB36B] to-[#FF8E8E] p-5 shadow-[0_10px_0_rgba(248,113,113,0.18)]">
                            <h2 className="text-3xl font-black text-slate-900">{cta.headline}</h2>
                            <p className="mt-3 font-bold text-slate-700">{cta.body}</p>
                            <button
                                type="button"
                                onClick={handleStart}
                                disabled={isStarting}
                                className="clay-cta-primary mt-5 w-full justify-center bg-white text-slate-800 disabled:opacity-60"
                            >
                                {isStarting ? 'Dang mo bai hoc...' : cta.buttonLabel}
                            </button>
                        </section>

                        <section className="rounded-[34px] border-4 border-white bg-white/85 p-5 shadow-[0_10px_0_rgba(91,141,239,0.12)]">
                            <h2 className="text-2xl font-black text-slate-800">Student voices</h2>
                            <div className="mt-4 space-y-3">
                                {course.studentTestimonials.map(testimonial => (
                                    <div key={`${testimonial.name}-${testimonial.role}`} className="rounded-3xl bg-gradient-to-br from-sky-50 to-violet-50 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-sky-600 shadow-sm">
                                                {testimonial.avatar || testimonial.name.slice(0, 1)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800">{testimonial.name}</p>
                                                <p className="text-sm font-bold text-slate-500">{testimonial.role}</p>
                                            </div>
                                        </div>
                                        <p className="mt-3 font-bold text-slate-600">"{testimonial.quote}"</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>
                </section>
            </div>
        </div>
    );
};

export default CourseDetail;
