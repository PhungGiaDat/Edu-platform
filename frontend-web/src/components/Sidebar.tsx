import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/CourseService';
import type { Course, UserProgress } from '@/types/course';

const BookIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
    </svg>
);

const CubeARIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
);

const FlashcardIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
    </svg>
);

const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10l-10-5L2 10l10 5 10-5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
        <path d="M22 10v6" />
    </svg>
);

const PetIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="17" rx="4" ry="3" />
        <circle cx="7" cy="10" r="2" />
        <circle cx="17" cy="10" r="2" />
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
    </svg>
);

const iconComponents: Record<string, React.FC<{ className?: string }>> = {
    learn: BookIcon,
    ar: CubeARIcon,
    profile: UserIcon,
    flashcards: FlashcardIcon,
    pets: PetIcon,
};

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isGuest, user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progress, setProgress] = useState<UserProgress[]>([]);

    const fullNavItems = [
        { path: '/courses', label: 'Learn', iconKey: 'learn' },
        { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
        { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
        { path: '/profile', label: 'Profile', iconKey: 'profile' },
    ];

    const navItems = isGuest
        ? fullNavItems.filter((item) => item.path === '/courses' || item.path === '/learn-ar')
        : fullNavItems;

    useEffect(() => {
        let cancelled = false;
        const learnerId = user?.id || (isGuest ? 'guest-learner' : null);

        const loadSidebarData = async () => {
            try {
                const [courseData, progressData] = await Promise.all([
                    courseService.listCourses(),
                    learnerId ? courseService.getProgress(learnerId).catch(() => []) : Promise.resolve([]),
                ]);
                if (!cancelled) {
                    setCourses(courseData);
                    setProgress(progressData);
                }
            } catch (error) {
                console.error('[Sidebar] course preview load error:', error);
                if (!cancelled) {
                    setCourses([]);
                    setProgress([]);
                }
            }
        };

        void loadSidebarData();

        return () => {
            cancelled = true;
        };
    }, [isGuest, user?.id]);

    const progressByCourse = useMemo(
        () => new Map(progress.map(item => [item.course_id, item])),
        [progress],
    );

    const stats = useMemo(() => {
        const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
        const completedLessons = progress.reduce((sum, item) => sum + (item.completed_lessons?.length || 0), 0);
        const totalXp = progress.reduce((sum, item) => sum + (item.total_xp || 0), 0);
        const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        return { completedLessons, totalLessons, totalXp, percent };
    }, [courses, progress]);

    return (
        <>
            <aside className="hidden md:flex fixed left-0 top-0 z-50 h-screen w-64 flex-col border-r-4 border-white bg-[#FFF7EC] shadow-[4px_0_24px_rgba(91,141,239,0.06)]">
                <div className="no-scrollbar h-full space-y-6 overflow-y-auto px-4 py-6">
                    <section className="clay-hero rounded-3xl p-5 text-center">
                        <div className="mb-3 flex items-center justify-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1] text-white shadow-[0_4px_0_#3A8FD1]">
                                <GraduationCapIcon className="h-7 w-7" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-800" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                                Edu<span className="text-[#6EB9FF]">AR</span>
                            </h1>
                        </div>
                        <p className="text-sm font-semibold text-gray-600">Play. Explore. Learn English.</p>
                    </section>

                    <section className="clay-card-elevated p-4">
                        <h2 className="mb-3 text-sm font-black text-gray-800">Quick Links</h2>
                        <div className="flex flex-wrap gap-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                                const IconComponent = iconComponents[item.iconKey];
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`clay-tab flex items-center gap-2 ${isActive ? 'clay-tab-active' : ''}`}
                                    >
                                        <IconComponent className="h-4 w-4" />
                                        <span className="text-xs font-bold">{item.label}</span>
                                    </Link>
                                );
                            })}
                            {!isGuest && (
                                <button
                                    onClick={() => navigate('/pets')}
                                    className={`clay-tab flex items-center gap-2 ${location.pathname === '/pets' ? 'clay-tab-active' : ''}`}
                                >
                                    <PetIcon className="h-4 w-4" />
                                    <span className="text-xs font-bold">My Pet</span>
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="clay-card-elevated p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-black text-gray-800">Course Catalog</h2>
                            <button onClick={() => navigate('/courses')} className="text-xs font-bold text-[#5B8DEF]">
                                View all
                            </button>
                        </div>
                        <div className="space-y-3">
                            {courses.slice(0, 3).map((course) => {
                                const courseProgress = progressByCourse.get(course.course_id);
                                const total = course.lessons.length;
                                const done = courseProgress?.completed_lessons?.length || 0;
                                const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                                return (
                                    <button
                                        key={course.course_id}
                                        onClick={() => navigate(`/courses/${course.course_id}`)}
                                        className="clay-card-sunshine w-full p-3 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xl font-black text-[#5B8DEF]">
                                                {(course.theme || course.title).slice(0, 1).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-black text-gray-800">{course.title}</div>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #6EB9FF, #FF9F9F)' }}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-600">{percent}%</span>
                                        </div>
                                    </button>
                                );
                            })}
                            {courses.length === 0 && (
                                <button
                                    onClick={() => navigate('/courses')}
                                    className="w-full rounded-2xl bg-white/70 p-3 text-left text-xs font-bold text-gray-600"
                                >
                                    No published courses yet
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="clay-card-elevated p-4">
                        <h2 className="mb-3 text-sm font-black text-gray-800">Progress Tracker</h2>
                        <div className="mb-3 grid grid-cols-2 gap-3">
                            <div className="clay-stat-card">
                                <div className="text-xl">⚡</div>
                                <div className="clay-stat-number">{stats.totalXp}</div>
                                <div className="clay-stat-label">XP</div>
                            </div>
                            <div className="clay-stat-card">
                                <div className="text-xl">✅</div>
                                <div className="clay-stat-number">{stats.completedLessons}</div>
                                <div className="clay-stat-label">Done</div>
                            </div>
                        </div>
                        <div className="mb-2 text-xs font-bold text-gray-600">
                            {stats.completedLessons}/{stats.totalLessons} lessons
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-gray-100 shadow-inner">
                            <div
                                className="clay-shimmer h-full rounded-full"
                                style={{ width: `${stats.percent}%`, background: 'linear-gradient(90deg, #6EB9FF, #B4E197)' }}
                            />
                        </div>
                    </section>

                    <section className="text-center">
                        <button
                            onClick={() => navigate(isGuest ? '/register' : '/learn-ar')}
                            className="clay-cta-primary w-full"
                        >
                            {isGuest ? 'Start Free Trial' : 'Jump into AR'}
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="clay-cta-secondary mt-3 w-full"
                        >
                            Browse Courses
                        </button>
                    </section>
                </div>
            </aside>

            <nav className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 right-3 z-50 max-w-[calc(100vw-1.5rem)] sm:left-4 sm:right-4 sm:max-w-[calc(100vw-2rem)] md:hidden">
                <div className="pointer-events-auto relative flex h-[72px] items-center justify-around rounded-[32px] border-2 border-white bg-white/90 p-2 shadow-[0_8px_32px_rgba(91,141,239,0.15),0_4px_0_rgba(0,0,0,0.05)] backdrop-blur-md">
                    {navItems.map((item) => {
                        const IconComponent = iconComponents[item.iconKey];
                        const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`relative flex h-full w-full flex-col items-center justify-center rounded-[24px] transition-all duration-300 ${
                                    isActive ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {isActive && (
                                    <div className="pointer-events-none absolute inset-0 z-0 rounded-[24px] bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1] shadow-[0_4px_0_#3A8FD1,inset_0_1px_0_rgba(255,255,255,0.4)]" />
                                )}
                                <div className="relative z-10 flex flex-col items-center">
                                    <IconComponent className={`mb-0.5 h-[26px] w-[26px] transition-transform ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} />
                                </div>
                            </Link>
                        );
                    })}
                    {!isGuest && (
                        <button
                            onClick={() => navigate('/pets')}
                            className={`relative flex h-full w-full flex-col items-center justify-center rounded-[24px] transition-all duration-300 ${
                                location.pathname === '/pets' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {location.pathname === '/pets' && (
                                <div className="pointer-events-none absolute inset-0 z-0 rounded-[24px] bg-gradient-to-br from-[#FF9F9F] to-[#D97070] shadow-[0_4px_0_#D97070,inset_0_1px_0_rgba(255,255,255,0.4)]" />
                            )}
                            <div className="relative z-10 flex flex-col items-center">
                                <PetIcon className={`mb-0.5 h-[26px] w-[26px] transition-transform ${location.pathname === '/pets' ? 'scale-110 drop-shadow-sm' : ''}`} />
                            </div>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
};
