import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AssetTile } from '@/components/courses/CourseLearningBlocks';
import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/CourseService';
import type { Course } from '@/types/course';

const getLearnerId = (userId?: string | null) => userId || 'guest-learner';

export const CourseDetail: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        courseService.getCourse(id)
            .then(setCourse)
            .catch(err => {
                console.error('[CourseDetail] load error:', err);
                setError('Khong tim thay khoa hoc.');
            })
            .finally(() => setIsLoading(false));
    }, [id]);

    const handleStart = async () => {
        if (!course) return;
        setIsStarting(true);
        try {
            const progress = await courseService.startCourse(course.course_id, getLearnerId(user?.id));
            const lessonId = progress.current_lesson_id || course.lessons[0]?.lesson_id;
            navigate(`/courses/${course.course_id}/lessons/${lessonId}`);
        } catch (err) {
            console.error('[CourseDetail] start error:', err);
            setError('Chua bat dau duoc. Be thu lai nhe!');
        } finally {
            setIsStarting(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen clay-bg-playful p-6 text-center text-xl font-black text-slate-700">Dang tai khoa hoc...</div>;
    }

    if (!course || error) {
        return (
            <div className="min-h-screen clay-bg-playful p-6 text-center">
                <p className="text-xl font-black text-rose-600">{error || 'Khong co khoa hoc.'}</p>
                <button onClick={() => navigate('/courses')} className="clay-cta-primary mt-4">Ve Course Catalog</button>
            </div>
        );
    }

    const totalXp = course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0);

    return (
        <div className="min-h-screen w-full max-w-[100vw] min-w-0 overflow-x-hidden clay-bg-playful pb-[calc(env(safe-area-inset-bottom)+12rem)] md:pb-10">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button onClick={() => navigate('/courses')} className="clay-btn clay-btn-sm bg-white text-slate-700">
                        Back
                    </button>
                    <div className="clay-badge clay-badge-yellow self-start sm:self-auto">⚡ {totalXp} XP</div>
                </div>

                <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                    <div className="min-w-0">
                        <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600">
                            Age {course.age_range} • {course.theme}
                        </div>
                        <h1 className="text-3xl font-black leading-tight text-slate-800 sm:text-5xl">{course.title}</h1>
                        <p className="mt-3 text-lg font-bold text-slate-600">{course.subtitle_vi || course.theme}</p>
                        <p className="mt-3 max-w-2xl text-base font-semibold text-slate-500">
                            {course.description_vi || course.description}
                        </p>
                        <button
                            onClick={handleStart}
                            disabled={isStarting}
                            className="clay-cta-primary mt-6 w-full justify-center sm:w-auto"
                        >
                            {isStarting ? 'Dang mo bai hoc...' : 'Bat dau bai hoc'}
                        </button>
                    </div>
                    <AssetTile asset={course.thumbnail} label={course.theme} emoji="🐻" className="min-h-[240px]" />
                </header>

                <section className="mt-8">
                    <h2 className="mb-4 text-2xl font-black text-slate-800">Bai hoc</h2>
                    <div className="grid gap-4">
                        {course.lessons.map(lesson => (
                            <Link
                                key={lesson.lesson_id}
                                to={`/courses/${course.course_id}/lessons/${lesson.lesson_id}`}
                                className="rounded-[28px] border-4 border-white bg-white p-4 shadow-[0_8px_0_rgba(91,141,239,0.12)] transition-transform hover:-translate-y-1"
                            >
                                <div className="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-3xl font-black text-sky-600">
                                        {lesson.order}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-black text-slate-800">{lesson.title}</h3>
                                        <p className="font-bold text-slate-500">{lesson.title_vi || lesson.description}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">{lesson.duration_minutes} min</span>
                                            <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">{lesson.vocabulary.length} words</span>
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{lesson.quiz.length} quiz</span>
                                        </div>
                                    </div>
                                    <span className="clay-btn clay-btn-sm justify-center bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] text-slate-800">
                                        Hoc bai nay
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default CourseDetail;
