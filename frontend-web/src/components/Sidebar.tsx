import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

// SVG Icons as components
const BookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
    </svg>
);

const CubeARIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
);

const FlashcardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
    </svg>
);

const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10l-10-5L2 10l10 5 10-5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
        <path d="M22 10v6" />
    </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
);

const PetIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="17" rx="4" ry="3" />
        <circle cx="7" cy="10" r="2" />
        <circle cx="17" cy="10" r="2" />
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
    </svg>
);

// Icon mapping for nav items
const iconComponents: Record<string, React.FC<{ className?: string }>> = {
    'learn': BookIcon,
    'ar': CubeARIcon,
    'profile': UserIcon,
    'flashcards': FlashcardIcon,
    'settings': SettingsIcon,
    'pets': PetIcon,
};

export const Sidebar: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isGuest } = useAuth();

    const fullNavItems = [
        { path: '/courses', label: 'Learn', iconKey: 'learn' },
        { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
        { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
        { path: '/profile', label: 'Profile', iconKey: 'profile' },
    ];

    const navItems = isGuest
        ? fullNavItems.filter((item) => item.path === '/courses' || item.path === '/learn-ar')
        : fullNavItems;

    return (
        <>
            {/* Desktop Sidebar (Claymorphic Landing Panel) */}
            <aside className="hidden md:flex flex-col w-64 h-screen bg-[#FFF7EC] border-r-4 border-white fixed left-0 top-0 z-50 shadow-[4px_0_24px_rgba(91,141,239,0.06)]">
                <div className="h-full overflow-y-auto no-scrollbar px-4 py-6 space-y-6">
                    {/* Brand Hero */}
                    <section className="clay-hero rounded-3xl p-5 text-center">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-[0_4px_0_#3A8FD1] bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1]">
                                <GraduationCapIcon className="w-7 h-7" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-800" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                                Edu<span className="text-[#6EB9FF]">AR</span>
                            </h1>
                        </div>
                        <p className="text-sm text-gray-600 font-semibold">Play. Explore. Learn English.</p>
                    </section>

                    {/* Quick Links */}
                    <section className="clay-card-elevated p-4">
                        <h2 className="text-sm font-black text-gray-800 mb-3">Quick Links</h2>
                        <div className="flex flex-wrap gap-2">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                const IconComponent = iconComponents[item.iconKey];
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`clay-tab flex items-center gap-2 ${isActive ? 'clay-tab-active' : ''}`}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                        <span className="text-xs font-bold">{item.label}</span>
                                    </Link>
                                );
                            })}
                            {!isGuest && (
                                <button
                                    onClick={() => navigate('/pets')}
                                    className={`clay-tab flex items-center gap-2 ${location.pathname === '/pets' ? 'clay-tab-active' : ''}`}
                                >
                                    <PetIcon className="w-4 h-4" />
                                    <span className="text-xs font-bold">My Pet</span>
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Course Catalog Preview */}
                    <section className="clay-card-elevated p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-black text-gray-800">Course Catalog</h2>
                            <button
                                onClick={() => navigate('/courses')}
                                className="text-xs font-bold text-[#5B8DEF]"
                            >
                                View all
                            </button>
                        </div>
                        <div className="space-y-3">
                            {[
                                { emoji: '🦁', title: 'Animal World', progress: 42, color: '#FFB4A2' },
                                { emoji: '🌈', title: 'Colors & Shapes', progress: 80, color: '#A8D8FF' },
                                { emoji: '🍕', title: 'Food & Drinks', progress: 10, color: '#A8E6CF' },
                            ].map((course) => (
                                <div key={course.title} className="clay-card-sunshine p-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                            style={{ background: `${course.color}55` }}
                                        >
                                            {course.emoji}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-black text-gray-800">{course.title}</div>
                                            <div className="h-2 bg-white/70 rounded-full overflow-hidden mt-2">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{ width: `${course.progress}%`, background: course.color }}
                                                />
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-600">{course.progress}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Progress Tracking Demo */}
                    <section className="clay-card-elevated p-4">
                        <h2 className="text-sm font-black text-gray-800 mb-3">Progress Tracker</h2>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="clay-stat-card">
                                <div className="text-xl">⚡</div>
                                <div className="clay-stat-number">680</div>
                                <div className="clay-stat-label">XP</div>
                            </div>
                            <div className="clay-stat-card">
                                <div className="text-xl">🔥</div>
                                <div className="clay-stat-number">12</div>
                                <div className="clay-stat-label">Streak</div>
                            </div>
                        </div>
                        <div className="text-xs font-bold text-gray-600 mb-2">Weekly Goal</div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full rounded-full clay-shimmer"
                                style={{ width: '68%', background: 'linear-gradient(90deg, #6EB9FF, #B4E197)' }}
                            />
                        </div>
                    </section>

                    {/* Testimonials */}
                    <section className="clay-card-elevated p-4">
                        <h2 className="text-sm font-black text-gray-800 mb-3">Student Stories</h2>
                        <div className="space-y-3">
                            {[
                                { name: 'Emma', quote: 'I love learning with AR!' },
                                { name: 'Lucas', quote: 'The pets keep me motivated.' },
                            ].map((testimonial) => (
                                <div key={testimonial.name} className="clay-testimonial">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center">🎓</div>
                                        <div className="text-xs font-bold text-gray-700">{testimonial.name}</div>
                                    </div>
                                    <p className="text-xs text-gray-600 italic">"{testimonial.quote}"</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Enrollment CTA */}
                    <section className="text-center">
                        <button
                            onClick={() => navigate(isGuest ? '/register' : '/learn-ar')}
                            className="clay-cta-primary w-full"
                        >
                            {isGuest ? '🚀 Start Free Trial' : '🎯 Jump into AR'}
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="clay-cta-secondary w-full mt-3"
                        >
                            📚 Browse Courses
                        </button>
                    </section>
                </div>
            </aside>

            {/* Mobile Bottom Navigation (Floating Pill Style) */}
            <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50 pb-safe pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md border-2 border-white shadow-[0_8px_32px_rgba(91,141,239,0.15),0_4px_0_rgba(0,0,0,0.05)] rounded-[32px] p-2 flex justify-around items-center h-[72px] pointer-events-auto relative">
                    {navItems.map((item) => {
                        const IconComponent = iconComponents[item.iconKey];
                        const isActive = location.pathname === item.path;
                        
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center w-full h-full rounded-[24px] transition-all duration-300 relative ${
                                    isActive
                                        ? 'text-white'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1] rounded-[24px] shadow-[0_4px_0_#3A8FD1,inset_0_1px_0_rgba(255,255,255,0.4)] z-0 pointer-events-none"></div>
                                )}
                                <div className="relative z-10 flex flex-col items-center">
                                    <IconComponent className={`w-[26px] h-[26px] mb-0.5 transition-transform ${isActive ? 'scale-110 drop-shadow-sm' : ''}`} />
                                    {isActive && <span className="text-[10px] font-bold"></span>}
                                </div>
                            </Link>
                        );
                    })}
                    {!isGuest && (
                        <button
                            onClick={() => navigate('/pets')}
                            className={`flex flex-col items-center justify-center w-full h-full rounded-[24px] transition-all duration-300 relative ${
                                location.pathname === '/pets'
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {location.pathname === '/pets' && (
                                <div className="absolute inset-0 bg-gradient-to-br from-[#FF9F9F] to-[#D97070] rounded-[24px] shadow-[0_4px_0_#D97070,inset_0_1px_0_rgba(255,255,255,0.4)] z-0 pointer-events-none"></div>
                            )}
                            <div className="relative z-10 flex flex-col items-center">
                                <PetIcon className={`w-[26px] h-[26px] mb-0.5 transition-transform ${location.pathname === '/pets' ? 'scale-110 drop-shadow-sm' : ''}`} />
                            </div>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
};
