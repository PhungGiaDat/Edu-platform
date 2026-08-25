import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DailyGoal } from '@/components/Gamification/DailyGoal';
import { StreakBadge } from '@/components/Gamification/StreakBadge';
import { CompletedBookIcon, StickerStarIcon, XpBoltIcon } from '@/components/icons/ProgressIcons';
import { SessionTimerBadge } from './SessionTimerBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { courseService } from '@/services/CourseService';
import { apiClient } from '@/services/apiClient';
import '@/styles/sidebar.css';
import { courseCategoryLabel, courseTitle } from '@/lib/courseLocale';
import type { Course, UserProgress } from '@/types/course';

interface SidebarProps {
    isDesktopExpanded: boolean;
    onDesktopExpandedChange: (expanded: boolean) => void;
}

interface NavItem {
    path: string;
    label: string;
    shortLabel: string;
    iconKey: 'learn' | 'ar' | 'flashcards' | 'profile' | 'path3d' | 'leaderboard' | 'challenge';
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
        <path d="M5 9 L4 4 L9 7" />
        <path d="M19 9 L20 4 L15 7" />
        <circle cx="12" cy="14" r="5.5" />
        <circle cx="9.5" cy="13" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="13" r="1.1" fill="currentColor" stroke="none" />
        <path d="M11 15.6 L13 15.6 L12 16.7 Z" fill="currentColor" stroke="none" />
        <path d="M10.5 17.2 Q12 18.4 13.5 17.2" />
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

const TrophyIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

const ChallengeIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
    <svg aria-hidden="true" className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

const CloseIcon = () => (
    <svg aria-hidden="true" className="block h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6 18 18M18 6 6 18" />
    </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
    </svg>
);

function LanguageToggle({ collapsed }: { collapsed: boolean }) {
    const { locale, setLocale, t } = useLocale();

    if (collapsed) {
        return (
            <button
                type="button"
                onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
                aria-label={t('switchLocale')}
                title={t('switchLocale')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5B8DEF] text-xs font-black text-white shadow-[0_3px_0_#3F6FCB] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
            >
                {locale === 'en' ? 'VI' : 'EN'}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'vi' : 'en')}
            aria-label={`${t('language')}: ${locale === 'en' ? t('vietnamese') : t('english')}`}
            className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 shadow-[0_3px_0_#DDE8FC] transition-colors hover:bg-blue-50 hover:text-blue-600"
        >
            <GlobeIcon className="h-4 w-4" />
            {locale === 'en' ? 'VI' : 'EN'}
        </button>
    );
}

const iconComponents: Record<NavItem['iconKey'], React.FC<{ className?: string }>> = {
    learn: BookIcon,
    ar: CubeARIcon,
    flashcards: FlashcardIcon,
    profile: UserIcon,
    path3d: Path3DIcon,
    leaderboard: TrophyIcon,
    challenge: ChallengeIcon,
};

const fullNavItems: Array<{ path: string; iconKey: NavItem['iconKey']; labelKey: string; shortLabelKey: string }> = [
    { path: '/courses', iconKey: 'learn', labelKey: 'navLearn', shortLabelKey: 'navLearn' },
    { path: '/learning-path-3d', iconKey: 'path3d', labelKey: 'navLearningPath', shortLabelKey: 'navPathShort' },
    { path: '/learn-ar', iconKey: 'ar', labelKey: 'navArPractice', shortLabelKey: 'navArShort' },
    { path: '/leaderboard', iconKey: 'leaderboard', labelKey: 'navLeaderboard', shortLabelKey: 'navLeaderboardShort' },
    { path: '/flashcards', iconKey: 'flashcards', labelKey: 'navFlashcards', shortLabelKey: 'navFlashcardsShort' },
    { path: '/daily-challenge', iconKey: 'challenge', labelKey: 'navDailyChallenge', shortLabelKey: 'navChallengeShort' },
    { path: '/profile', iconKey: 'profile', labelKey: 'navProfile', shortLabelKey: 'navProfile' },
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
    const { t } = useLocale();
    const metricClass = 'learner-sidebar__metric flex min-w-0 flex-col items-center justify-center rounded-[22px] border-[4px] px-1 py-3 text-center';
    const valueClass = 'learner-sidebar__metric-value mt-1 max-w-full truncate text-[20px] font-black leading-none';
    const labelClass = 'learner-sidebar__metric-label mt-1 text-[11px] font-extrabold leading-tight';

    return (
        <section className="learner-sidebar__tracker min-w-0 overflow-hidden rounded-[28px] p-4">
            <h2 className="learner-sidebar__tracker-title mb-4 text-base font-black">{t('progressTracker')}</h2>
            <div className="mb-5 grid min-w-0 grid-cols-3 gap-2">
                <div className={`${metricClass} learner-sidebar__metric--xp`}>
                    <XpBoltIcon className="h-7 w-7 shrink-0" />
                    <div className={valueClass}>{stats.totalXp}</div>
                    <div className={labelClass}>XP</div>
                </div>
                <div className={`${metricClass} learner-sidebar__metric--done`}>
                    <CompletedBookIcon className="h-7 w-7 shrink-0" />
                    <div className={valueClass}>{stats.completedLessons}</div>
                    <div className={labelClass}>{t('done')}</div>
                </div>
                <Link to="/stickers" className={`${metricClass} learner-sidebar__metric--stickers transition-transform motion-safe:hover:-translate-y-1`}>
                    <StickerStarIcon className="h-7 w-7 shrink-0" />
                    <div className={valueClass}>{stickerCounts.collected}/{stickerCounts.total || '—'}</div>
                    <div className={labelClass}>{t('stickers')}</div>
                </Link>
            </div>
            <div className="learner-sidebar__tracker-caption mb-2 text-sm font-extrabold">
                {stats.completedLessons}/{stats.totalLessons} {t('lessons')}
            </div>
            <div className="learner-sidebar__tracker-progress h-3 overflow-hidden rounded-full" role="progressbar" aria-label={t('courseCompletion')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.percent}>
                <div className="clay-shimmer learner-sidebar__tracker-progress-fill h-full rounded-full" style={{ width: `${stats.percent}%` }} />
            </div>
        </section>
    );
}

function CourseCatalog({ courses, progressByCourse, onNavigate }: { courses: Course[]; progressByCourse: Map<string, UserProgress>; onNavigate: (path: string) => void }) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set());
    const { locale, t } = useLocale();
    const categories = useMemo(() => {
        const grouped = new Map<string, Course[]>();
        courses.forEach((course) => {
            const key = course.category_key || course.level || course.course_id;
            grouped.set(key, [...(grouped.get(key) || []), course]);
        });
        return Array.from(grouped.entries()).map(([key, categoryCourses]) => {
            const sample = categoryCourses[0];
            const label = courseCategoryLabel(sample, locale);
            return { key, label, icon: sample.category_icon || sample.theme, courses: categoryCourses };
        });
    }, [courses, locale]);

    useEffect(() => {
        if (categories.length === 0) return;
        setExpandedCategories((current) => {
            if (current.size > 0) return current;
            const first = categories[0];
            return new Set([first.key]);
        });
    }, [categories]);

    const toggleCategory = (categoryKey: string) => {
        setExpandedCategories((current) => {
            const next = new Set(current);
            if (next.has(categoryKey)) next.delete(categoryKey);
            else next.add(categoryKey);
            return next;
        });
    };

    return (
        <section className="learner-sidebar__catalog min-w-0 overflow-x-hidden rounded-[28px] bg-white p-4 shadow-[0_12px_0_rgba(15,23,42,0.08)]">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <h2 className="min-w-0 text-base font-black leading-tight text-slate-800">{t('courseCatalog')}</h2>
                <button onClick={() => onNavigate('/courses')} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl px-2 text-sm font-extrabold text-[#5B8DEF] hover:bg-blue-50">
                    {t('viewAll')}
                </button>
            </div>
            <div className="min-w-0 space-y-3 overflow-x-hidden">
                {categories.map(({ key: categoryKey, label, icon, courses: categoryCourses }) => {
                    const expanded = expandedCategories.has(categoryKey);
                    const totalLessons = categoryCourses.reduce((sum, course) => sum + course.lessons.length, 0);
                    const completedLessons = categoryCourses.reduce((sum, course) => sum + (progressByCourse.get(course.course_id)?.completed_lessons?.length || 0), 0);
                    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                    const mark = (icon || label).slice(0, 2).toUpperCase();

                    return (
                        <div key={categoryKey} className="learner-sidebar__category min-w-0 overflow-hidden rounded-2xl bg-[#FFF7EC] p-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onNavigate(`/courses/category/${categoryKey}`)}
                                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-white/80 px-2 text-left hover:bg-white"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-[#5B8DEF] shadow-[0_2px_0_rgba(91,141,239,0.18)]">{mark}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-800">{label}</span>
                                        <span className="mt-1 block text-[11px] font-bold text-slate-500">{categoryCourses.length} course{categoryCourses.length === 1 ? '' : 's'} · {percent}%</span>
                                        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white">
                                            <span className="block h-full rounded-full bg-gradient-to-r from-[#6EB9FF] to-[#9DE8BB]" style={{ width: `${percent}%` }} />
                                        </span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
                                    onClick={() => toggleCategory(categoryKey)}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-[0_4px_0_#E5E7EB]"
                                >
                                    <ChevronIcon expanded={expanded} />
                                </button>
                            </div>
                            {expanded && (
                                <div className="mt-3 space-y-2 border-t border-white/80 pt-2">
                                    {categoryCourses.map((course) => {
                                        const total = course.lessons.length;
                                        const done = progressByCourse.get(course.course_id)?.completed_lessons?.length || 0;
                                        const coursePercent = total > 0 ? Math.round((done / total) * 100) : 0;
                                        return (
                                            <button
                                                key={course.course_id}
                                                type="button"
                                                onClick={() => onNavigate(`/courses/${course.course_id}`)}
                                                className="clay-card-sunshine flex min-h-11 w-full min-w-0 items-center gap-2 p-2 text-left"
                                            >
                                                <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-700">{courseTitle(course, locale)}</span>
                                                <span className="shrink-0 text-[11px] font-black text-slate-500">{coursePercent}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {courses.length === 0 && (
                    <button onClick={() => onNavigate('/courses')} className="min-h-11 w-full rounded-2xl bg-slate-50 p-3 text-left text-sm font-bold text-slate-600">
                        {t('noPublishedCourses')}
                    </button>
                )}
            </div>
        </section>
    );
}

function MobileDailyGoalIndicator() {
    const { user } = useAuth();
    const { t } = useLocale();
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
    const { t } = useLocale();
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
                className={`learner-sidebar learner-sidebar--desktop fixed left-0 top-0 z-[var(--z-nav)] hidden h-[100dvh] flex-col overflow-x-hidden border-r-4 border-white bg-[#FFF7EC] shadow-[4px_0_24px_rgba(91,141,239,0.10)] transition-all duration-300 motion-reduce:transition-none md:flex ${isDesktopExpanded ? 'w-[272px]' : 'w-[120px]'}`}
            >
                <div className={`learner-sidebar__header flex min-w-0 shrink-0 items-center gap-1 px-2 pb-1 pt-3 ${isDesktopExpanded ? 'justify-between' : 'justify-center'}`}>
                    {isDesktopExpanded && <SessionTimerBadge />}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                        <LanguageToggle collapsed={!isDesktopExpanded} />
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
                </div>

                {isDesktopExpanded ? (
                    <div className="learner-sidebar__content no-scrollbar h-full min-w-0 space-y-5 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-1">
                        <section className="learner-sidebar__brand clay-hero min-w-0 rounded-3xl p-5 text-center">
                            <div className="learner-sidebar__brand-sparkle" aria-hidden="true">
                                <svg className="clay-shimmer-sparkle" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 0L11.8 7.2L19 10L11.8 12.8L10 20L8.2 12.8L1 10L8.2 7.2L10 0Z" fill="#FFD93D" />
                                </svg>
                            </div>
                            <div className="mb-3 flex items-center justify-center gap-3">
                                <div className="learner-sidebar__brand-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE066] via-[#FF9F9F] to-[#6EB9FF] text-white shadow-[0_4px_0_#D4A55A]">
                                    <GraduationCapIcon className="h-7 w-7 drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]" />
                                </div>
                                <h1 className="clay-text-vibrant text-2xl font-black text-slate-800" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Edu<span className="text-[#5B8DEF]">AR</span></h1>
                            </div>
                            <p className="clay-text-tagline text-sm font-semibold text-slate-600">{t('sidebarTagline')}</p>
                        </section>

                        {!isGuest && (
                            <section
                                className="learner-sidebar__daily min-w-0 overflow-hidden"
                                aria-label="Daily progress and learning streak"
                            >
                                <div className="learner-sidebar__daily-header">
                                    <span>📅 {t('todaysGoal')}</span>
                                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-[#5B8DEF] shadow-[0_2px_0_rgba(110,185,255,0.15)]">
                                        {t('dailyShort')}
                                    </span>
                                </div>
                                <div className="learner-sidebar__daily-rings">
                                    <DailyGoal variant="mini" showCelebration={false} />
                                </div>
                                <div className="learner-sidebar__daily-streak">
                                    <StreakBadge className="min-w-0 flex-1" />
                                    <div className="ml-auto text-right">
                                        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#8b6f47]">
                                            {t('keepGoing')}
                                        </div>
                                        <div className="text-xs font-bold text-[#5d3a00]">
                                            {t('learnALittleToday')}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <section className="learner-sidebar__quick-links clay-card-elevated min-w-0 overflow-hidden p-4">
                            <h2 className="learner-sidebar__quick-links-title mb-3 text-sm font-black text-slate-800">{t('quickLinks')}</h2>
                            <div className="learner-sidebar__quick-link-list grid grid-cols-1 gap-2">
                                {navItems.map((item) => {
                                    const Icon = iconComponents[item.iconKey];
                                    const active = isRouteActive(location.pathname, item.path);
                                    return (
                                        <Link key={item.path} to={item.path} className={`learner-sidebar__nav-link clay-tab flex min-h-11 items-center gap-3 ${active ? 'clay-tab-active' : ''}`}>
                                            <Icon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">{t(item.labelKey)}</span>
                                        </Link>
                                    );
                                })}
                                {!isGuest && (
                                    <>
                                        <button onClick={() => goTo('/pets')} className={`learner-sidebar__nav-link clay-tab flex min-h-11 items-center gap-3 ${isRouteActive(location.pathname, '/pets') ? 'clay-tab-active' : ''}`}>
                                            <PetIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">{t('navMyPet')}</span>
                                        </button>
                                        <button onClick={() => goTo('/stickers')} className={`learner-sidebar__nav-link clay-tab flex min-h-11 items-center gap-3 ${isRouteActive(location.pathname, '/stickers') ? 'clay-tab-active' : ''}`}>
                                            <StickerStarIcon className="h-5 w-5 shrink-0" /><span className="text-sm font-bold">{t('navStickers')}</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>

                        <CourseCatalog courses={courses} progressByCourse={progressByCourse} onNavigate={goTo} />
                        <Tracker stats={stats} />

                        <section className="pb-4 text-center">
                            <button onClick={() => goTo(isGuest ? '/register' : '/learn-ar')} className="clay-cta-primary min-h-11 w-full">{isGuest ? t('startFreeTrial') : t('jumpIntoAr')}</button>
                            <button onClick={() => goTo('/courses')} className="clay-cta-secondary mt-3 min-h-11 w-full">{t('browseCourses')}</button>
                        </section>
                    </div>
                ) : (
                    <div className="learner-sidebar__collapsed no-scrollbar flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto px-2 pb-4 pt-2">
                        <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1] text-white shadow-[0_4px_0_#3A8FD1]">
                            <GraduationCapIcon className="h-7 w-7" />
                        </div>
                        {navItems.map((item) => {
                            const Icon = iconComponents[item.iconKey];
                            const active = isRouteActive(location.pathname, item.path);
                            return (
                                <Link key={item.path} to={item.path} title={t(item.labelKey)} className={`learner-sidebar__collapsed-link relative z-[1] flex min-h-[52px] w-full flex-col items-center justify-center rounded-2xl px-1 text-center ${active ? 'learner-sidebar__collapsed-link--active bg-[#5B8DEF] text-white shadow-[0_4px_0_#3F6FCB] z-[2]' : 'text-slate-500 hover:bg-white'}`}>
                                    <Icon className="h-5 w-5" /><span className="mt-0.5 text-[10px] font-extrabold leading-none">{t(item.shortLabelKey)}</span>
                                </Link>
                            );
                        })}
                        {!isGuest && (
                            <>
                                <button onClick={() => goTo('/pets')} title={t('navMyPet')} className={`learner-sidebar__collapsed-link relative z-[1] flex min-h-[52px] w-full flex-col items-center justify-center rounded-2xl px-1 ${isRouteActive(location.pathname, '/pets') ? 'learner-sidebar__collapsed-link--active bg-[#FF9F9F] text-white shadow-[0_4px_0_#D97070] z-[2]' : 'text-slate-500 hover:bg-white'}`}>
                                    <PetIcon className="h-5 w-5" /><span className="mt-0.5 text-[10px] font-extrabold leading-none">{t('navPetShort')}</span>
                                </button>
                                <button onClick={() => goTo('/stickers')} title={t('navStickers')} className={`learner-sidebar__collapsed-link relative z-[1] flex min-h-[52px] w-full flex-col items-center justify-center rounded-2xl px-1 ${isRouteActive(location.pathname, '/stickers') ? 'learner-sidebar__collapsed-link--active bg-[#FFD84D] text-slate-800 shadow-[0_4px_0_#E8B800] z-[2]' : 'text-slate-500 hover:bg-white'}`}>
                                    <StickerStarIcon className="h-5 w-5" /><span className="mt-0.5 text-[10px] font-extrabold leading-none">{t('navStickersShort')}</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </aside>

            <nav aria-label={t('primaryNavigation')} className="pointer-events-none fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="pointer-events-auto mx-3 mb-3 flex min-h-[76px] items-stretch justify-around gap-1 rounded-[30px] border-4 border-white bg-[#5B8DEF] p-1.5 shadow-[0_8px_0_rgba(59,100,180,0.30),0_8px_32px_rgba(91,141,239,0.25)]">
                    {navItems.map((item) => {
                        const Icon = iconComponents[item.iconKey];
                        const active = isRouteActive(location.pathname, item.path);
                        return (
                            <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} className={`relative z-[1] flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-[22px] px-1 transition-all ${active ? 'bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.15)] z-[2]' : 'text-white/80 hover:text-white'}`}>
                                <Icon className="h-6 w-6" /><span className="mt-1 max-w-full truncate text-[10px] font-extrabold leading-none">{t(item.shortLabelKey)}</span>
                            </Link>
                        );
                    })}
                    <button ref={moreButtonRef} type="button" onClick={() => setIsMobileMoreOpen(true)} aria-expanded={isMobileMoreOpen} aria-controls="mobile-more-sheet" className={`relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-[22px] px-1 ${isMobileMoreOpen ? 'bg-white text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.15)]' : 'text-white/80 hover:text-white'}`}>
                        <MoreIcon className="h-6 w-6" /><span className="mt-1 max-w-full truncate text-[10px] font-extrabold leading-none">{t('navMore')}</span>
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
