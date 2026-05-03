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
            {/* Desktop & Tablet Sidebar (Left) */}
            <aside className="hidden md:flex flex-col w-24 lg:w-72 h-screen bg-[#FFFBF0] border-r-4 border-white fixed left-0 top-0 z-50 transition-all duration-300 shadow-[4px_0_24px_rgba(91,141,239,0.05)]">
                {/* Logo Area */}
                <div className="p-6 lg:p-8 flex items-center justify-center lg:justify-start gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-[0_4px_0_#3A8FD1] bg-gradient-to-br from-[#6EB9FF] to-[#3A8FD1]">
                        <GraduationCapIcon className="w-7 h-7" />
                    </div>
                    <h1 className="hidden lg:block text-3xl font-black text-gray-800 tracking-tight" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
                        Edu<span className="text-[#6EB9FF]">AR</span>
                    </h1>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-4 space-y-3 overflow-y-auto overflow-x-hidden no-scrollbar">
                    {navItems.map((item) => {
                        const IconComponent = iconComponents[item.iconKey];
                        const isActive = location.pathname === item.path;
                        
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group flex items-center justify-center lg:justify-start gap-4 px-4 py-3 rounded-2xl font-bold transition-all min-h-[56px] relative ${
                                    isActive
                                        ? 'bg-white text-[#5B8DEF] border-2 border-[#6EB9FF] shadow-[0_6px_0_#6EB9FF,inset_0_1px_0_rgba(255,255,255,0.9)]'
                                        : 'text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-[0_4px_0_#E2E8F5] border-2 border-transparent'
                                }`}
                            >
                                <IconComponent className={`w-6 h-6 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="hidden lg:block text-[17px]">{item.label}</span>
                                
                                {isActive && (
                                    <div className="hidden lg:block absolute right-3 w-2 h-2 rounded-full bg-[#5B8DEF]" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section: Progress Demo & Secondary Actions */}
                <div className="p-4 space-y-4">
                    {/* User Mini Progress Card (Only visible on Desktop/lg) */}
                    {!isGuest && (
                        <div className="hidden lg:block bg-white rounded-3xl p-4 border-2 border-white shadow-[0_8px_0_rgba(0,0,0,0.04),0_4px_16px_rgba(91,141,239,0.08)] mb-2 relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-[#FFE066] to-[#FFD93D] rounded-full opacity-20 blur-xl"></div>
                            
                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="w-10 h-10 bg-[#FFD93D] rounded-xl flex items-center justify-center text-xl shadow-[0_3px_0_#E5B800]">
                                    🦊
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm leading-tight">Level 5 Explorer</p>
                                    <p className="text-xs text-gray-500 font-semibold">680 / 1000 XP</p>
                                </div>
                            </div>
                            
                            {/* XP Bar */}
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner relative z-10">
                                <div className="h-full bg-gradient-to-r from-[#6EB9FF] to-[#B4E197] rounded-full w-[68%] relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[200%] animate-[clay-shimmer_2s_infinite]"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Guest Enrollment CTA (Only visible on Desktop/lg) */}
                    {isGuest && (
                        <div className="hidden lg:block bg-gradient-to-br from-[#FFD93D] to-[#FFCA28] rounded-3xl p-5 border-2 border-white shadow-[0_8px_0_#E5B800,0_4px_16px_rgba(255,217,61,0.3)] mb-2 text-center text-[#1A2744]">
                            <div className="text-3xl mb-2 clay-float-element">🚀</div>
                            <h3 className="font-black text-lg mb-1 leading-tight" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Unlock AR Magic</h3>
                            <p className="text-xs font-bold mb-3 opacity-80">Track progress & get pets!</p>
                            <button onClick={() => navigate('/register')} className="w-full bg-white text-[#1A2744] font-black py-2 rounded-xl text-sm shadow-[0_4px_0_rgba(0,0,0,0.1)] hover:translate-y-[-2px] hover:shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.1)] transition-all">
                                Sign Up Free
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        {!isGuest && (
                            <button
                                onClick={() => navigate('/pets')}
                                className="w-full group flex items-center justify-center lg:justify-start gap-4 px-4 py-3 text-gray-500 hover:bg-white hover:text-[#FF9F9F] rounded-2xl font-bold min-h-[56px] transition-all border-2 border-transparent hover:border-white hover:shadow-[0_4px_0_rgba(255,159,159,0.2)]"
                            >
                                <PetIcon className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" />
                                <span className="hidden lg:block text-[17px]">My Pet</span>
                            </button>
                        )}
                        <button className="w-full group flex items-center justify-center lg:justify-start gap-4 px-4 py-3 text-gray-500 hover:bg-white hover:text-gray-700 rounded-2xl font-bold min-h-[56px] transition-all border-2 border-transparent hover:border-white hover:shadow-[0_4px_0_#E2E8F5]">
                            <SettingsIcon className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" />
                            <span className="hidden lg:block text-[17px]">Settings</span>
                        </button>
                    </div>
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
