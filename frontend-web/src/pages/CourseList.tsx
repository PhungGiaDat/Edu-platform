import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AssetTile } from '@/components/courses/CourseLearningBlocks';
import { courseService } from '@/services/CourseService';
import type { Course } from '@/types/course';

export const CourseList: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const loadCourses = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await courseService.listCourses();
            setCourses(data);
        } catch (err) {
            console.error('[CourseList] load error:', err);
            setError('Chua tai duoc khoa hoc. Be thu lai nhe!');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadCourses();
    }, []);

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
            setError('Chua tao duoc khoa hoc tu seed. Kiem tra backend/MongoDB nhe.');
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
                        <span>Hoc ngan, nghe nhieu, choi vui!</span>
                    </div>
                    <h1 className="mb-3 text-3xl font-black leading-tight text-gray-800 sm:text-4xl md:text-5xl">
                        Course Catalog
                    </h1>
                    <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
                        Khoa hoc cho be 5-7 tuoi: video ngan, tu moi bang hinh, tro choi va phan thuong.
                    </p>
                </header>

                <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="clay-stat-card">
                        <div className="text-3xl">⏱️</div>
                        <div className="clay-stat-number">3-7</div>
                        <div className="clay-stat-label">min / lesson</div>
                    </div>
                    <div className="clay-stat-card">
                        <div className="text-3xl">🔊</div>
                        <div className="clay-stat-number">3-5</div>
                        <div className="clay-stat-label">words</div>
                    </div>
                    <div className="clay-stat-card">
                        <div className="text-3xl">🎯</div>
                        <div className="clay-stat-number">3-5</div>
                        <div className="clay-stat-label">questions</div>
                    </div>
                    <div className="clay-stat-card">
                        <div className="text-3xl">🎁</div>
                        <div className="clay-stat-number">XP</div>
                        <div className="clay-stat-label">reward</div>
                    </div>
                </section>

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
                        <div className="text-6xl">🐻</div>
                        <h2 className="mt-3 text-2xl font-black text-slate-800">Chua co khoa hoc</h2>
                        <p className="mt-2 font-bold text-slate-600">Tao khoa hoc tu seed de bat dau Phase 1.</p>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="clay-cta-primary mt-5 w-full justify-center disabled:opacity-60"
                        >
                            {isGenerating ? 'Dang tao...' : 'Tao khoa hoc tu seed'}
                        </button>
                    </div>
                ) : (
                    <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6">
                        {courses.map(course => {
                            const totalXp = course.lessons.reduce((sum, lesson) => sum + (lesson.reward?.xp || 0), 0);
                            return (
                                <article
                                    key={course.course_id}
                                    className="clay-course-card group relative min-w-0"
                                    onClick={() => navigate(`/courses/${course.course_id}`)}
                                >
                                    <div className="relative">
                                        <AssetTile
                                            asset={course.thumbnail}
                                            label={course.theme}
                                            emoji="🌿"
                                            className="rounded-b-none border-0"
                                        />
                                        <div className="clay-badge clay-badge-yellow absolute left-3 top-3 px-2.5 py-1 text-[11px] leading-none sm:px-3 sm:text-xs">
                                            ⚡ {totalXp} XP
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
                                        <button className="clay-btn clay-btn-md mt-5 w-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] text-slate-800">
                                            Bat dau hoc
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
