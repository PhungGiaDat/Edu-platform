import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PetSelector } from '@/components/pets';

// SVG Icons as components
const BookIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
    </svg>
);

const CubeARIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
);

const FlashcardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
    </svg>
);

const GraduationCapIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10l-10-5L2 10l10 5 10-5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
        <path d="M22 10v6" />
    </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
);

const PetIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {/* Paw print icon */}
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
    const [showPetSelector, setShowPetSelector] = useState(false);

    const navItems = [
        { path: '/courses', label: 'Learn', iconKey: 'learn' },
        { path: '/learn-ar', label: 'AR Practice', iconKey: 'ar' },
        { path: '/profile', label: 'Profile', iconKey: 'profile' },
        { path: '/flashcards', label: 'Flashcards', iconKey: 'flashcards' },
    ];

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
                        <GraduationCapIcon className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => {
                        const IconComponent = iconComponents[item.iconKey];
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === item.path
                                    ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
                                    : 'text-neutral-500 hover:bg-neutral-100'
                                    }`}
                            >
                                <IconComponent className="w-6 h-6" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t-2 border-neutral-200 space-y-2">
                    <button 
                        onClick={() => setShowPetSelector(true)}
                        className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-primary-light/10 hover:text-primary rounded-xl font-bold min-h-[48px] transition-all"
                    >
                        <PetIcon className="w-6 h-6" />
                        <span>My Pet</span>
                    </button>
                    <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold min-h-[48px]">
                        <SettingsIcon className="w-6 h-6" />
                        <span>Settings</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const IconComponent = iconComponents[item.iconKey];
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] ${location.pathname === item.path
                                    ? 'text-primary'
                                    : 'text-neutral-400'
                                    }`}
                            >
                                <IconComponent className="w-6 h-6 mb-1" />
                            </Link>
                        );
                    })}
                    {/* Pet Button */}
                    <button
                        onClick={() => setShowPetSelector(true)}
                        className="flex flex-col items-center justify-center w-full h-full min-h-[48px] text-neutral-400 hover:text-primary transition-colors"
                    >
                        <PetIcon className="w-6 h-6 mb-1" />
                    </button>
                </div>
            </nav>

            {/* Pet Selector Modal */}
            <PetSelector 
                isOpen={showPetSelector} 
                onClose={() => setShowPetSelector(false)} 
            />
        </>
    );
};
