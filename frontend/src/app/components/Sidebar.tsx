import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { DailyGoal } from '@/features/gamification/components/DailyGoal';
import { StreakBadge } from '@/features/gamification/components/StreakBadge';
import { CompletedBookIcon, StickerStarIcon, XpBoltIcon } from '@/shared/components/icons/ProgressIcons';
import { SessionTimerBadge } from '@/features/session/components/SessionTimerBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from '@/contexts/LocaleContext';
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
    labelKey: string;
    shortLabelKey: string;
    /** Falsy keeps a route out of the crowded mobile bar; it still lives in the More sheet. */
    showInMobileBar?: boolean;
    iconKey: 'learn' | 'ar' | 'flashcards' | 'profile' | 'path3d' | 'leaderboard' | 'challenge' | 'games' | 'dictionary' | 'notebook';
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

const GamesIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="3" />
        <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
);

const DictionaryIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6M11 8v6" />
    </svg>
);

const NotebookIcon: React.FC<{ className?: string }> = ({ className = 'h-6 w-6' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18" /><path d="M13 8h3M13 12h3" />
    </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
    <svg aria-hidden="true" className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

const CloseIcon = () => (
    <svg aria-hidden="true" className="block h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
);

const GlobeIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
    </svg>
);

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
);

const ChevronUpIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m18 15-6-6-6 6" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const GridIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
);

const SparkleIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L13.8 9.2L21 11L13.8 12.8L12 20L10.2 12.8L3 11L10.2 9.2L12 2Z" />
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
    games: GamesIcon,
    dictionary: DictionaryIcon,
    notebook: NotebookIcon,
};

const fullNavItems: Array<{
    path: string;
    iconKey: NavItem['iconKey'];
    labelKey: string;
    shortLabelKey: string;
    showInMobileBar?: boolean;
}> = [
    { path: '/courses', iconKey: 'learn', labelKey: 'navLearn', shortLabelKey: 'navLearn' },
    { path: '/learning-path-3d', iconKey: 'path3d', labelKey: 'navLearningPath', shortLabelKey: 'navPathShort' },
    { path: '/games', iconKey: 'games', labelKey: 'navGames', shortLabelKey: 'navGamesShort' },
    { path: '/learn-ar', iconKey: 'ar', labelKey: 'navArPractice', shortLabelKey: 'navArShort' },
    { path: '/leaderboard', iconKey: 'leaderboard', labelKey: 'navLeaderboard', shortLabelKey: 'navLeaderboardShort' },
    { path: '/flashcards', iconKey: 'flashcards', labelKey: 'navFlashcards', shortLabelKey: 'navFlashcardsShort' },
    { path: '/dictionary', iconKey: 'dictionary', labelKey: 'navDictionary', shortLabelKey: 'navDictionaryShort', showInMobileBar: false },
    { path: '/notebook', iconKey: 'notebook', labelKey: 'navNotebook', shortLabelKey: 'navNotebookShort', showInMobileBar: false },
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

// Vibrant color palette for young children - claymorphism with more saturation
const CATEGORY_THEMES: Record<string, { bg: string; accent: string; shadow: string; icon: string; gradient: string }> = {
    colors: {
        bg: 'bg-gradient-to-br from-[#FFE066] via-[#FFB347] to-[#FF7F7F]',
        accent: '#FF6B6B',
        shadow: '0 4px 0 rgba(180,80,80,0.35)',
        icon: 'bg-white/90',
        gradient: 'from-[#FFE066] via-[#FFB347] to-[#FF7F7F]',
    },
    animals: {
        bg: 'bg-gradient-to-br from-[#A8E6CF] via-[#88D4AB] to-[#6EB9FF]',
        accent: '#3DBE7C',
        shadow: '0 4px 0 rgba(80,160,100,0.35)',
        icon: 'bg-white/90',
        gradient: 'from-[#A8E6CF] via-[#88D4AB] to-[#6EB9FF]',
    },
    default: {
        bg: 'bg-gradient-to-br from-[#A8D8FF] via-[#C4B5FD] to-[#FFB4A2]',
        accent: '#8B5CF6',
        shadow: '0 4px 0 rgba(91,77,180,0.3)',
        icon: 'bg-white/90',
        gradient: 'from-[#A8D8FF] via-[#C4B5FD] to-[#FFB4A2]',
    },
};

function getCategoryTheme(categoryKey: string) {
    const key = categoryKey.toLowerCase();
    if (key.includes('color')) return CATEGORY_THEMES.colors;
    if (key.includes('animal')) return CATEGORY_THEMES.animals;
    return CATEGORY_THEMES.default;
}

function CategoryIcon({ categoryKey, iconKey }: { categoryKey: string; iconKey: string }) {
    const theme = getCategoryTheme(categoryKey);
    return (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon} shadow-[0_3px_0_rgba(0,0,0,0.12)] transition-transform hover:scale-110`}>
            {iconKey === 'palette' && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13.5" cy="6.5" r=".5" fill={theme.accent} /><circle cx="17.5" cy="10.5" r=".5" fill={theme.accent} />
                    <circle cx="8.5" cy="7.5" r=".5" fill={theme.accent} /><circle cx="6.5" cy="12.5" r=".5" fill={theme.accent} />
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2Z" />
                </svg>
            )}
            {iconKey === 'paw' && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill={theme.accent} stroke="none">
                    <path d="M12 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2ZM6 13c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM18 13c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM8 17c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM16 17c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2ZM12 22c-3.3 0-6-2.7-6-6h12c0 3.3-2.7 6-6 6Z" />
                </svg>
            )}
            {(iconKey === 'book' || iconKey === 'default') && (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
            )}
        </span>
    );
}

function getIconKey(categoryKey: string): string {
    const key = categoryKey.toLowerCase();
    if (key.includes('color')) return 'palette';
    if (key.includes('animal')) return 'paw';
    return 'book';
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
                <button onClick={() => onNavigate('/courses')} className="min-h-11 shrink-0 whitespace-nowrap rounded-xl px-2 text-sm font-extrabold text-[#5B8DEF] hover:bg-blue-50 flex items-center gap-1">
                    <GridIcon className="h-4 w-4" />
                    {t('viewAll')}
                </button>
            </div>
            <div className="min-w-0 space-y-3 overflow-x-hidden">
                {categories.map(({ key: categoryKey, label, courses: categoryCourses }) => {
                    const expanded = expandedCategories.has(categoryKey);
                    const totalLessons = categoryCourses.reduce((sum, course) => sum + course.lessons.length, 0);
                    const completedLessons = categoryCourses.reduce((sum, course) => sum + (progressByCourse.get(course.course_id)?.completed_lessons?.length || 0), 0);
                    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                    const theme = getCategoryTheme(categoryKey);
                    const iconKey = getIconKey(categoryKey);

                    return (
                        <div key={categoryKey} className="learner-sidebar__category min-w-0 overflow-hidden rounded-2xl bg-white p-3" style={{ boxShadow: `0 4px 0 ${theme.accent}30, inset 0 1px 0 rgba(255,255,255,0.9)` }}>
                            <div className="flex min-w-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onNavigate(`/courses/category/${categoryKey}`)}
                                    className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-white/80 px-2 text-left hover:bg-white border border-white/60 transition-all hover:scale-[1.01]"
                                >
                                    <CategoryIcon categoryKey={categoryKey} iconKey={iconKey} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-slate-800">{label}</span>
                                        <span className="mt-1 flex items-center gap-1.5">
                                            <span className="text-[11px] font-bold text-slate-500">{categoryCourses.length} course{categoryCourses.length === 1 ? '' : 's'}</span>
                                            <span className="rounded-full bg-gradient-to-r from-[#6EB9FF] to-[#9DE8BB] px-2 py-0.5 text-[11px] font-black text-white shadow-[0_2px_0_rgba(0,0,0,0.1)]">{percent}%</span>
                                        </span>
                                        <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-white/80 shadow-inner">
                                            <span className="block h-full rounded-full bg-gradient-to-r from-[#5B8DEF] via-[#6EB9FF] to-[#9DE8BB]" style={{ width: `${percent}%` }} />
                                        </span>
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    aria-expanded={expanded}
                                    aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
                                    onClick={() => toggleCategory(categoryKey)}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_4px_0_rgba(0,0,0,0.1)] transition-all hover:scale-105 active:translate-y-1"
                                >
                                    {expanded ? <ChevronUpIcon className="h-5 w-5 text-slate-600" /> : <ChevronDownIcon className="h-5 w-5 text-slate-600" />}
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
                                                className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#F0F7FF] to-[#FFF8F0] p-2 text-left shadow-[0_3px_0_rgba(91,141,239,0.12)] transition-all hover:scale-[1.01] active:translate-y-0.5"
                                            >
                                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6EB9FF] to-[#9DE8BB] shadow-[0_2px_0_rgba(0,0,0,0.08)]">
                                                    <PlayIcon className="h-3 w-3 text-white" />
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-slate-700">{courseTitle(course, locale)}</span>
                                                <span className="shrink-0 rounded-full bg-[#FFE066] px-2 py-0.5 text-[11px] font-black text-[#704600] shadow-[0_2px_0_rgba(180,130,20,0.2)]">{coursePercent}%</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {courses.length === 0 && (
                    <button onClick={() => onNavigate('/courses')} className="min-h-11 w-full rounded-2xl bg-slate-50 p-3 text-left text-sm font-bold text-slate-600 flex items-center gap-2">
                        <GridIcon className="h-4 w-4" />
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
                <div className="text-sm font-black">{t('dailyGoal')}</div>
                <div className="text-xs font-bold text-slate-500">{minutes}/{goal} {t('minutes')}</div>
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
                aria-label={t('learningSidebar')}
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
                            aria-label={isDesktopExpanded ? t('collapseNavigation') : t('expandNavigation')}
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
                                aria-label={t('dailyProgressAndLearningStreak')}
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

            <nav aria-label={t('primaryNavigation')} className="learner-mobile-nav pointer-events-none fixed bottom-0 left-0 right-0 z-[var(--z-nav)] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="learner-mobile-nav__bar pointer-events-auto mx-2 mb-2.5 flex min-h-[72px] items-stretch justify-around gap-0.5 rounded-[28px] p-1">
                    {navItems.filter((item) => item.showInMobileBar !== false).map((item) => {
                        const Icon = iconComponents[item.iconKey];
                        const active = isRouteActive(location.pathname, item.path);
                        return (
                            <Link key={item.path} to={item.path} aria-current={active ? 'page' : undefined} title={t(item.labelKey)} className={`learner-mobile-nav__item relative z-[1] flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[22px] px-0.5 transition-[transform,background,box-shadow,color] duration-200 motion-reduce:transition-none ${active ? 'learner-mobile-nav__item--active z-[2]' : 'text-[#3F6FCB]'}`}>
                                <Icon className="h-5 w-5 shrink-0" />
                                <span className="mt-0.5 w-full truncate text-center text-[9px] font-black leading-none tracking-tight sm:text-[10px]">{t(item.shortLabelKey)}</span>
                            </Link>
                        );
                    })}
                    <button ref={moreButtonRef} type="button" onClick={() => setIsMobileMoreOpen(true)} aria-expanded={isMobileMoreOpen} aria-controls="mobile-more-sheet" title={t('navMore')} className={`learner-mobile-nav__item learner-mobile-nav__more-button relative z-[1] flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[22px] px-0.5 transition-[transform,background,box-shadow,color] duration-200 motion-reduce:transition-none ${isMobileMoreOpen ? 'learner-mobile-nav__item--active z-[2]' : 'text-[#3F6FCB]'}`}>
                        <MoreIcon className="h-5 w-5 shrink-0" />
                        <span className="mt-0.5 w-full truncate text-center text-[9px] font-black leading-none tracking-tight sm:text-[10px]">{t('navMore')}</span>
                    </button>
                </div>
            </nav>

            {isMobileMoreOpen && (
                <div className="fixed inset-0 z-[var(--z-modal)] md:hidden" role="presentation">
                    <button type="button" aria-label={t('closeMoreMenu')} className="absolute inset-0 h-full w-full bg-slate-900/35 backdrop-blur-[2px]" onClick={() => setIsMobileMoreOpen(false)} />
                    <div ref={mobileSheetRef} id="mobile-more-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title" className="mobile-more-sheet absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-x-hidden overflow-y-auto rounded-t-[36px] px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 shadow-[0_-12px_40px_rgba(15,23,42,0.22)]">
                        {/* Decorative blobs */}
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[36px]" aria-hidden="true">
                            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-[#FFE066] via-[#FF9F9F] to-[#6EB9FF] opacity-20 blur-3xl" />
                            <div className="absolute -left-6 top-1/3 h-32 w-32 rounded-full bg-gradient-to-br from-[#A8E6CF] via-[#88D4AB] to-[#6EB9FF] opacity-25 blur-3xl" />
                            <div className="absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-gradient-to-br from-[#D4A5FF] via-[#FFB4A2] to-[#FFE066] opacity-15 blur-2xl" />
                        </div>
                        {/* Sheet handle */}
                        <div className="relative z-10 mx-auto mb-4 h-1.5 w-14 rounded-full bg-gradient-to-r from-[#FFE066] via-[#FF9F9F] to-[#6EB9FF]" />
                        <div className="relative z-10 mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE066] to-[#FF9F9F] shadow-[0_4px_0_rgba(180,130,20,0.3)]">
                                    <SparkleIcon className="h-5 w-5 text-[#704600]" />
                                </div>
                                <SessionTimerBadge />
                                <h2 id="mobile-more-title" className="text-xl font-black text-slate-800">{t('navMoreAdventures')}</h2>
                            </div>
                            <button type="button" onClick={() => setIsMobileMoreOpen(false)} aria-label={t('closeMoreMenu')} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-[0_4px_0_#E5E7EB] transition-all hover:scale-105 active:translate-y-0.5">
                                <CloseIcon />
                            </button>
                        </div>
                        <div className="relative z-10 space-y-5">
                            {!isGuest && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => goTo('/pets')} className="flex min-h-16 items-center gap-3 rounded-3xl bg-gradient-to-br from-[#FFE066] via-[#FFD4A8] to-[#FF9F9F] p-4 text-left shadow-[0_6px_0_rgba(180,100,80,0.3),0_12px_24px_rgba(255,159,159,0.15)] transition-all hover:scale-[1.02] active:translate-y-0.5">
                                            <PetIcon className="h-7 w-7 shrink-0 text-[#D97070]" />
                                            <span className="text-sm font-black text-[#704600]">{t('navMyPet')}</span>
                                        </button>
                                        <button onClick={() => goTo('/stickers')} className="flex min-h-16 items-center gap-3 rounded-3xl bg-gradient-to-br from-[#A8E6CF] via-[#88D4AB] to-[#6EB9FF] p-4 text-left shadow-[0_6px_0_rgba(80,150,110,0.3),0_12px_24px_rgba(110,185,255,0.15)] transition-all hover:scale-[1.02] active:translate-y-0.5">
                                            <StickerStarIcon className="h-7 w-7 shrink-0" />
                                            <span className="text-sm font-black text-[#176344]">{t('navStickers')}</span>
                                        </button>
                                        <button onClick={() => goTo('/dictionary')} className="flex min-h-16 items-center gap-3 rounded-3xl bg-gradient-to-br from-[#DBEAFE] via-[#BFDBFE] to-[#93C5FD] p-4 text-left shadow-[0_6px_0_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02] active:translate-y-0.5">
                                            <DictionaryIcon className="h-7 w-7 shrink-0 text-[#1D4ED8]" />
                                            <span className="text-sm font-black text-[#1E3A8A]">{t('navDictionary')}</span>
                                        </button>
                                        <button onClick={() => goTo('/notebook')} className="flex min-h-16 items-center gap-3 rounded-3xl bg-gradient-to-br from-[#EDE9FE] via-[#DDD6FE] to-[#C7D2FE] p-4 text-left shadow-[0_6px_0_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02] active:translate-y-0.5">
                                            <NotebookIcon className="h-7 w-7 shrink-0 text-[#6D28D9]" />
                                            <span className="text-sm font-black text-[#4C1D95]">{t('navNotebook')}</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <MobileDailyGoalIndicator />
                                        <div className="min-w-0 rounded-2xl bg-white p-3 shadow-[0_4px_0_rgba(91,141,239,0.15)]"><StreakBadge className="min-w-0" /></div>
                                    </div>
                                </>
                            )}
                            <CourseCatalog courses={courses} progressByCourse={progressByCourse} onNavigate={goTo} />
                            <Tracker stats={stats} />
                            <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2">
                                <button onClick={() => goTo(isGuest ? '/register' : '/learn-ar')} className="clay-cta-primary min-h-12 w-full flex items-center justify-center gap-2">
                                    <SparkleIcon className="h-5 w-5" />
                                    {isGuest ? t('startFreeTrial') : t('jumpIntoAr')}
                                    <ArrowRightIcon className="h-5 w-5" />
                                </button>
                                <button onClick={() => goTo('/courses')} className="clay-cta-secondary min-h-12 w-full flex items-center justify-center gap-2">
                                    <GridIcon className="h-5 w-5" />
                                    {t('browseCourses')}
                                    <ArrowRightIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
