import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DailyGoal } from '@/components/Gamification/DailyGoal';
import { StreakBadge } from '@/components/Gamification/StreakBadge';
import { CompletedBookIcon, StickerStarIcon, XpBoltIcon } from '@/components/icons/ProgressIcons';
import { SessionTimerBadge } from './SessionTimerBadge';
import { useAuth } from '@/contexts/AuthContext';
import { courseService } from '@/services/CourseService';
import { apiClient } from '@/services/apiClient';
import '@/styles/sidebar.css';
import type { Course, UserProgress } from '@/types/course';

interface SidebarProps {
    isDesktopExpanded: boolean;
    onDesktopExpandedChange: (expanded: boolean) => void;
}

interface NavItem {
    path: string;
    label: string;
    shortLabel: string;
    iconKey: 'learn' | 'ar' | 'flashcards' | 'profile' | 'path3d';
}

interface TrackerStats {
    completedLessons: number;
    totalLessons: number;
    totalXp: number;
    percent: number;
}

const BookIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8M8 11h6" />
    </svg>
);

const CubeARIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2 2 7l10 5 10-5-10-5Z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
);

const FlashcardIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h4" />
    </svg>
);

const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 10-10-5-10 5 10 5 10-5Z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" />
    </svg>
);

const PetIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="17" rx="4" ry="3" />
        <circle cx="7" cy="10" r="2" /><circle cx="17" cy="10" r="2" />
        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
    </svg>
);

const MoreIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
);

const TargetIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
);

const Path3DIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17c3-3 6-6 9-3s6 0 9-3" />
        <circle cx="6" cy="14" r="2" />
        <circle cx="12" cy="11" r="2" />
        <circle cx="18" cy="8" r="2" />
    </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
    <svg aria-hidden="true" className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

const CloseIcon = () => (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="m6 6 12 12M18 6 6 18" />
    </svg>
);

const iconComponents: Record<NavItem['iconKey'], React.FC<{ className?: string }>> = {
    learn: BookIcon,
    ar: CubeARIcon,
    flashcards: FlashcardIcon,
    profile: UserIcon,
    path3d: Path3DIcon,
};

const fullNavItems: NavItem[] = [
    { path: '/courses', label: 'Learn', shortLabel: 'Learn', iconKey: 'learn' },
    { path: '/learning-path-3d', label: 'Learning Path', shortLabel: 'Path', iconKey: 'path3d' },
    { path: '/learn-ar', label: 'AR Practice', shortLabel: 'AR', iconKey: 'ar' },
    { path: '/flashcards', label: 'Flashcards', shortLabel: 'Cards', iconKey: 'flashcards' },
    { path: '/profile', label: 'Profile', shortLabel: 'Profile', iconKey: 'profile' },
];

function isRouteActive(pathname: string, path: string) {
    return pathname === path || pathname.startsWith(`${path}/`);
}

function extractArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
        const candidate = value as Record<string, unknown>;
        for (const key of ['stickers', 'items', 'data']) {
            if (Array.isArray(candidate[key])) return candidate[key] as unknown[];
        }
    }
    return [];
}

function useStickerCounts() {
    const { user } = useAuth();
    const [counts, setCounts] = useState({ collected: 0, total: 0 });

    useEffect(() => {
        let cancelled = false;
        const collectedRequest = user?.id ? apiClient.getStickers(user.id).catch(() => []) : Promise.resolve([]);

        Promise.all([
            collectedRequest,
            apiClient.getStickerCatalog().catch(() => []),
        ]).then(([collected, catalog]) => {
            if (!cancelled) {
                setCounts({ collected: extractArray(collected).length, total: extractArray(catalog).length });
            }
        });

        return () => { cancelled = true; };
    }, [user?.id]);

    return counts;
}

function Tracker({ stats }: { stats: TrackerStats }) {
    const stickerCounts = useStickerCounts();
    const metricClass = 'flex min-w-0 flex-col items-center justify-center rounded-[24px] border-[5px] border-[#E7EEFC] bg-white px-1 py-3 text-center shadow-[0_10px_0_#E7EEFC]';
    const valueClass = 'mt-1 max-w-full truncate text-[20px] font-black leading-none text-slate-600';
    const labelClass = 'mt-1 text-[11px] font-extrabold leading-tight text-slate-500';

    return (
        <section className="learner-sidebar__tracker min-w-0 overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_12px_0_rgba(15,23,42,0.08)]">
            <h2 className="mb-4 text-base font-black text-slate-800">Progress Tracker</h2>
            <div className="mb-5 grid min-w-0 grid-cols-3 gap-2">
                <div className={metricClass}>
                    <XpBoltIcon className="h-7 w-7 shrink-0" />
                    <div className={valueClass}>{stats.totalXp}</div>
                    <div className={labelClass}>XP</div>
                </div>
                <div className={metricClass}>
                    <CompletedBookIcon className="h-7 w-7 shrink-0" />
                    <div className={valueClass}>{stats.completedLessons}</div>
                    <div className={labelClass}>Done</div>
                </div>
                <Link to="/stickers" className={`${metricClass} transition-transform motion-safe:hover:-translate-y-1`}>
                    <StickerStarIcon className="h-7 w-7 shrink-0" />
                    <div className={valueClass}>{stickerCounts.collected}/{stickerCounts.total || '—'}</div>
                    <div className={labelClass}>Stickers</div>
                </Link>
            </div>
            <div className="mb-2 text-sm font-extrabold text-slate-600">
                {stats.completedLessons}/{stats.totalLessons} lessons
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner" role="progressbar" aria-label="Course completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.percent}>
                <div className="clay-shimmer h-full rounded-full" style={{ width: `${stats.percent}%`, background: 'linear-gradient(90deg, #6EB9FF, #B4E197)' }} />
            </div>
        </section>
    );
}

function CourseCatalog({ courses, progressByCourse, onNavigate }: { courses: Course[]; progressByCourse: Map<string, UserProgress>; onNavigate: (path: string) => void }) {
    return (
        <section className="learner-sidebar__catalog min-w-0 overflow-x-hidden rounded-[28px] bg-white p-4 shadow-[0_12px_0_rgba(15,23,42,0.08)]">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <h2 className="min-w-0 text-base font-black leading-tight text-slate-800">Course Catalog</h2>
                <button onClick={() => onNavigate('/courses')} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl px-2 text-sm font-extrabold text-[#5B8DEF] hover:bg-blue-50">
                    View all
                </button>
            </div>
            <div className="min-w-0 space-y-3 overflow-x-hidden">
                {courses.slice(0, 3).map((course) => {
                    const courseProgress = progressByCourse.get(course.course_id);
                    const total = course.lessons.length;
                    const done = courseProgress?.completed_lessons?.length || 0;
                    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                    return (
                        <button key={course.course_id} onClick={() => onNavigate(`/courses/${course.course_id}`)} className="clay-card-sunshine min-w-0 w-full overflow-hidden p-3 text-left">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-xl font-black text-[#5B8DEF]">
                                    {(course.theme || course.title).slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div
                                        className="min-w-0 overflow-hidden text-sm font-black leading-snug text-slate-800"
                                        style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}
                                    >
                                        {course.title}
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                                        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #6EB9FF, #FF9F9F)' }} />
                                    </div>
                                </div>
                                <span className="shrink-0 text-xs font-extrabold text-slate-600">{percent}%</span>
                            </div>
                        </button>
                    );
                })}
                {courses.length === 0 && (
                    <button onClick={() => onNavigate('/courses')} className="min-h-11 w-full rounded-2xl bg-slate-50 p-3 text-left text-sm font-bold text-slate-600">
                        No published courses yet
                    </button>
                )}
            </div>
        </section>
    );
}

function MobileDailyGoalIndicator() {
    const { user } = useAuth();
    const [minutes, setMinutes] = useState(0);
    const goal = 15;

    useEffect(() => {
        if (!user?.id) return;
        const minutesFrom = (value: unknown) => {
            if (!value || typeof value !== 'object') return 0;
            const minutesToday = (value as Record<string, unknown>).minutes_today;
            return typeof minutesToday === 'number' ? minutesToday : 0;
        };
        apiClient.getStreak(user.id).then((data: unknown) => {
            setMinutes(minutesFrom(data));
        }).catch(() => {
            apiClient.getUserStats(user.id).then((data: unknown) => setMinutes(minutesFrom(data))).catch(() => undefined);
        });
    }, [user?.id]);

    const percent = Math.min(Math.round((minutes / goal) * 100), 100);
    const color = percent >= 100 ? '#22c55e' : percent >= 60 ? '#0ea5e9' : '#f59e0b';

    return (
        <div className="flex min-h-11 items-center gap-3 rounded-2xl bg-amber-50 px-3 py-2 text-slate-700">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <svg aria-hidden="true" width="36" height="36" viewBox="0 0 36 36" className="absolute -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${(percent / 100) * 87.96} 87.96`} strokeLinecap="round" className="transition-all duration-500 motion-reduce:transition-none" />
                </svg>
                <TargetIcon className="relative h-4 w-4" />
            </div>
            <div>
                <div className="text-sm font-black">Daily goal</div>
                <div className="text-xs font-bold text-slate-500">{minutes}/{goal} minutes</div>
            </div>
        </div>
    );
}

export const Sidebar: React.FC<SidebarProps> = ({ isDesktopExpanded, onDesktopExpandedChange }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isGuest, user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [progress, setProgress] = useState<UserProgress[]>([]);
    const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
    const moreButtonRef = useRef<HTMLButtonElement>(null);
    const mobileSheetRef = useRef<HTMLDivElement>(null);
    const previousPathRef = useRef(location.pathname);

    const navItems = isGuest
        ? fullNavItems.filter((item) => item.path === '/courses' || item.path === '/learn-ar')
        : fullNavItems;

    useEffect(() => {
        let cancelled = false;
        const learnerId = user?.id || (isGuest ? 'guest-learner' : null);

        Promise.all([
            courseService.listCourses(),
            learnerId ? courseService.getProgress(learnerId).catch(() => []) : Promise.resolve([]),
        ]).then(([courseData, progressData]) => {
            if (!cancelled) {
                setCourses(courseData);
                setProgress(progressData);
            }
        }).catch((error) => {
            console.error('[Sidebar] course preview load error:', error);
            if (!cancelled) {
                setCourses([]);
                setProgress([]);
            }
        });

        return () => { cancelled = true; };
    }, [isGuest, user?.id]);

    useEffect(() => {
        if (previousPathRef.current === location.pathname) return;
        previousPathRef.current = location.pathname;
        setIsMobileMoreOpen(false);
        if (window.matchMedia('(min-width: 768px) and (max-width: 1199px)').matches) {
            onDesktopExpandedChange(false);
        }
    }, [location.pathname, onDesktopExpandedChange]);

    useEffect(() => {
        if (!isMobileMoreOpen) return;

        const sheet = mobileSheetRef.current;
        const trigger = moreButtonRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const focusable = sheet?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
        focusable?.[0]?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsMobileMoreOpen(false);
                return;
            }
            if (event.key !== 'Tab' || !focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
            trigger?.focus();
        };
    }, [isMobileMoreOpen]);

    const progressByCourse = useMemo(() => new Map(progress.map((item) => [item.course_id, item])), [progress]);
    const stats = useMemo<TrackerStats>(() => {
        const totalLessons = courses.reduce((sum, course) => sum + course.lessons.length, 0);
        const completedLessons = progress.reduce((sum, item) => sum + (item.completed_lessons?.length || 0), 0);
        const totalXp = progress.reduce((sum, item) => sum + (item.total_xp || 0), 0);
        return {
            completedLessons,
            totalLessons,
            totalXp,
            percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        };
    }, [courses, progress]);

    const goTo = (path: string) => {
        setIsMobileMoreOpen(false);
        navigate(path);
    };

    return (
        <>
            <aside
                aria-label="Learning sidebar"
                className="learner-sidebar learner-sidebar--desktop fixed left-0 top-0 z-[var(--z-nav)] hidden h-[100dvh] flex-col overflow-x-hidden border-r-4 border-white bg-[#FFF7EC] shadow-[4px_0_24px_rgba(91,141,239,0.10)] transition-[width] duration-300 md:flex motion-reduce:transition-none"
            >
                <div className={`learner-sidebar__header flex min-w-0 shrink-0 items-center gap-2 px-3 pb-1 pt-3 ${isDesktopExpanded ? 'justify-end' : 'justify-center'}`}>
                    <SessionTimerBadge />
                    <button
                        type="button"
                        onClick={() => onDesktopExpandedChange(!isDesktopExpanded)}
                        aria-expanded={isDesktopExpanded}
                        aria-label={isDesktopExpanded ? 'Collapse navigation' : 'Expand navigation'}
                        className="learner-sidebar-toggle learner-sidebar__toggle flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_4px_0_#DDE8FC]"
                    >
                        <ChevronIcon expanded={isDesktopExpanded} />
                    </button>
                </div>

                {isDesktopExpanded ? (
                    <div className="learner-sidebar__content no-scrollbar h-full min-w-0 space-y-5 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-1">
                        <section className="learner-sidebar__brand clay-hero min-w-0 rounded-3xl p-5 text-center">
                            <div className="mb-3 flex items-center justify-center gap-3">
                                <div className="learner-sidebar__brand-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1] text-white shadow-[0_4px_0_#3A8FD1]">
                                    <GraduationCapIcon className="h-7 w-7" />
                                </div>
                                <h1 className="text-2xl font-black text-slate-800" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Edu<span className="text-[#6EB9FF]">AR</span></h1>
                            </div>
                            <p className="text-sm font-semibold text-slate-600">Play. Explore. Learn English.</p>
                        </section>

                        {!isGuest && (
                            <section className="learner-sidebar__daily clay-card-elevated min-w-0 overflow-hidden p-4">
                                <div className="flex min-w-0 items-start gap-3">
                                    <DailyGoal variant="mini" showCelebration={false} />
                                    <StreakBadge className="min-w-0 flex-1" />
                                </div>
                            </section>
                        )}

                        <section className="learner-sidebar__quick-links clay-card-elevated min-w-0 overflow-hidden p-4">
                            <h2 className="learner-sidebar__quick-links-title mb-3 text-sm font-black text-slate-800">Quick Links</h2>
                            <div className="learner-sidebar__quick-link-list grid grid-cols-1 gap-2">
                                {navItems.map((item) => {
                                    const Icon = iconComponents[item.iconKey];
                                    const active = isRouteActive(location.pathname, item.path);
                                    return (
                                        <Link key={item.path} to={item.path} className={`learner-sidebar__nav-link clay-tab flex min-h-11 items-center gap-3 ${active ? 'clay-tab-active' : ''}`}>
                                            <Icon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">{item.label}</span>
                                        </Link>
                                    );
                                })}
                                {!isGuest && (
                                    <>
                                        <button onClick={() => goTo('/pets')} className={`learner-sidebar__nav-link clay-tab flex min-h-11 items-center gap-3 ${isRouteActive(location.pathname, '/pets') ? 'clay-tab-active' : ''}`}>
                                            <PetIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">My Pet</span>
                                        </button>
                                        <button onClick={() => goTo('/stickers')} className={`learner-sidebar__nav-link clay-tab flex min-h-11 items-center gap-3 ${isRouteActive(location.pathname, '/stickers') ? 'clay-tab-active' : ''}`}>
                                            <StickerStarIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">Stickers</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>

                        <CourseCatalog courses={courses} progressByCourse={progressByCourse} onNavigate={goTo} />
                        <Tracker stats={stats} />

                        <section className="pb-4 text-center">
                            <button onClick={() => goTo(isGuest ? '/register' : '/learn-ar')} className="clay-cta-primary min-h-11 w-full">{isGuest ? 'Start Free Trial' : 'Jump into AR'}</button>
                            <button onClick={() => goTo('/courses')} className="clay-cta-secondary mt-3 min-h-11 w-full">Browse Courses</button>
                        </section>
                    </div>
                ) : (
                    <div className="learner-sidebar__collapsed no-scrollbar flex h-full flex-col items-center gap-2 overflow-y-auto px-2 pb-4 pt-2">
                        <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1] text-white shadow-[0_4px_0_#3A8FD1]">
                            <GraduationCapIcon className="h-7 w-7" />
                        </div>
                        {navItems.map((item) => {
                            const Icon = iconComponents[item.iconKey];
                            const active = isRouteActive(location.pathname, item.path);
                            return (
                                <Link key={item.path} to={item.path} title={item.label} className={`flex min-h-[58px] w-full flex-col items-center justify-center rounded-2xl px-1 text-center ${active ? 'bg-[#5B8DEF] text-white shadow-[0_4px_0_#3F6FCB]' : 'text-slate-500 hover:bg-white'}`}>
                                    <Icon className="h-6 w-6" /><span className="mt-1 text-[10px] font-extrabold leading-none">{item.shortLabel}</span>
                                </Link>
                            );
                        })}
                        {!isGuest && (
                            <>
                                <button onClick={() => goTo('/pets')} title="My Pet" className={`flex min-h-[58px] w-full flex-col items-center justify-center rounded-2xl px-1 ${isRouteActive(location.pathname, '/pets') ? 'bg-[#FF9F9F] text-white shadow-[0_4px_0_#D97070]' : 'text-slate-500 hover:bg-white'}`}>
                                    <PetIcon className="h-6 w-6" /><span className="mt-1 text-[10px] font-extrabold leading-none">Pet</span>
                                </button>
                                <button onClick={() => goTo('/stickers')} title="Stickers" className={`flex min-h-[58px] w-full flex-col items-center justify-center rounded-2xl px-1 ${isRouteActive(location.pathname, '/stickers') ? 'bg-[#FFD84D] text-slate-800 shadow-[0_4px_0_#E8B800]' : 'text-slate-500 hover:bg-white'}`}>
                                    <StickerStarIcon className="h-6 w-6" /><span className="mt-1 text-[10px] font-extrabold leading-none">Stickers</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </aside>

            <nav aria-label="Primary navigation" className="pointer-events-none fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="pointer-events-auto mx-3 mb-3 flex min-h-[76px] items-stretch justify-around gap-1 rounded-[30px] border-4 border-white bg-[#5B8DEF] p-1.5 shadow-[0_8px_0_rgba(59,100,180,0.30),0_8px_32px_rgba(91,141,239,0.25)]">
                    {navItems.map((item) => {
                        const Icon = iconComponents[item.iconKey];
                        const active = isRouteActive(location.pathname, item.path);
                        return (
                            <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-[22px] px-1 transition-all ${active ? 'bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.15)]' : 'text-white/80 hover:text-white'}`}>
                                <Icon className="h-6 w-6" /><span className="mt-1 max-w-full truncate text-[10px] font-extrabold leading-none">{item.shortLabel}</span>
                            </Link>
                        );
                    })}
                    <button ref={moreButtonRef} type="button" onClick={() => setIsMobileMoreOpen(true)} aria-expanded={isMobileMoreOpen} aria-controls="mobile-more-sheet" className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-[22px] px-1 ${isMobileMoreOpen ? 'bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.15)]' : 'text-white/80 hover:text-white'}`}>
                        <MoreIcon className="h-6 w-6" /><span className="mt-1 max-w-full truncate text-[10px] font-extrabold leading-none">More</span>
                    </button>
                </div>
            </nav>

            {isMobileMoreOpen && (
                <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="presentation">
                    <button type="button" aria-label="Close more menu" className="absolute inset-0 h-full w-full bg-slate-900/35 backdrop-blur-[2px]" onClick={() => setIsMobileMoreOpen(false)} />
                    <div ref={mobileSheetRef} id="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-x-hidden overflow-y-auto rounded-t-[36px] bg-[#FFF7EC] px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 shadow-[0_-12px_40px_rgba(15,23,42,0.22)]">
                        <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-300" />
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SessionTimerBadge />
                                <h2 id="mobile-more-title" className="text-xl font-black text-slate-800">More adventures</h2>
                            </div>
                            <button type="button" onClick={() => setIsMobileMoreOpen(false)} aria-label="Close more menu" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-[0_4px_0_#E5E7EB]"><CloseIcon /></button>
                        </div>
                        <div className="space-y-5">
                            {!isGuest && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => goTo('/pets')} className="flex min-h-16 items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-[0_6px_0_#E8EDF7]">
                                            <PetIcon className="h-7 w-7 shrink-0 text-[#E47777]" /><span className="text-sm font-black text-slate-700">My Pet</span>
                                        </button>
                                        <button onClick={() => goTo('/stickers')} className="flex min-h-16 items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-[0_6px_0_#E8EDF7]">
                                            <StickerStarIcon className="h-7 w-7 shrink-0" /><span className="text-sm font-black text-slate-700">Stickers</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <MobileDailyGoalIndicator />
                                        <div className="min-w-0 rounded-2xl bg-white p-3"><StreakBadge className="min-w-0" /></div>
                                    </div>
                                </>
                            )}
                            <CourseCatalog courses={courses} progressByCourse={progressByCourse} onNavigate={goTo} />
                            <Tracker stats={stats} />
                            <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2">
                                <button onClick={() => goTo(isGuest ? '/register' : '/learn-ar')} className="clay-cta-primary min-h-12 w-full">{isGuest ? 'Start Free Trial' : 'Jump into AR'}</button>
                                <button onClick={() => goTo('/courses')} className="clay-cta-secondary min-h-12 w-full">Browse Courses</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
