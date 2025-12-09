import { Link, useLocation } from 'react-router-dom';

export const Sidebar: React.FC = () => {
    const location = useLocation();
    // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Unused for now as we use bottom nav for mobile

    const navItems = [
        { path: '/courses', label: 'Learn', icon: '📚' },
        { path: '/learn-ar', label: 'AR Practice', icon: '🦁' },
        { path: '/profile', label: 'Profile', icon: '👤' },
        { path: '/flashcards', label: 'Flashcards', icon: '🎴' },
    ];

    return (
        <>
            {/* Desktop Sidebar (Left) */}
            <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r-2 border-neutral-200 fixed left-0 top-0 z-50 shadow-sm">
                <div className="p-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
                        🎓
                    </div>
                    <h1 className="text-2xl font-black text-neutral-800 tracking-tight">Edu<span className="text-primary">AR</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all ${location.pathname === item.path
                                ? 'bg-primary-light/20 text-primary border-2 border-primary-light'
                                : 'text-neutral-500 hover:bg-neutral-100'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t-2 border-neutral-200">
                    <button className="w-full flex items-center gap-4 px-4 py-3 text-neutral-500 hover:bg-neutral-100 rounded-xl font-bold">
                        <span>⚙️</span>
                        <span>Settings</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-neutral-200 z-50 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === item.path
                                ? 'text-primary'
                                : 'text-neutral-400'
                                }`}
                        >
                            <span className="text-2xl mb-1">{item.icon}</span>
                            {/* <span className="text-[10px] font-bold uppercase">{item.label}</span> */}
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
};
