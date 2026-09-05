// components/Navbar.tsx
/**
 * Kid-Friendly E-Learning Navbar
 *
 * Responsive layout:
 * - Desktop (md+): horizontal nav with icons, AR Mode pill, XP bar
 * - Mobile (<md): hamburger button that opens a slide-in overlay drawer
 *   from the right with a dimmed backdrop, full-height menu items, and
 *   Escape key / click-outside dismissal. Matches the "Picture 2" mobile
 *   drawer pattern.
 *
 * Accessibility:
 * - Hamburger exposes aria-expanded / aria-controls
 * - Drawer is a region with role="dialog" + aria-modal
 * - Escape closes the drawer
 * - Body scroll is locked while the drawer is open
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Icon components for cleaner code
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

const BookIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

const MicIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
  </svg>
);

const UserIcon = ({ active }: { active: boolean }) => (
  <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center px-3 py-3 rounded-xl
      transition-all duration-200 min-w-[56px]
      ${isActive
        ? 'bg-amber-50 text-amber-600'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }
    `}
    title={label}
  >
    {icon}
    <span className={`text-xs mt-1 font-semibold ${isActive ? 'text-amber-600' : ''}`}>
      {label}
    </span>
  </Link>
);

const NAV_LINKS: Array<{
  to: string;
  label: string;
  icon: 'home' | 'book' | 'user' | 'mic';
  mobileIcon: string;
}> = [
  { to: '/courses', label: 'Học tập', icon: 'home', mobileIcon: '🏠' },
  { to: '/pronunciation-course', label: 'Phát âm', icon: 'mic', mobileIcon: '🎤' },
  { to: '/flashcards', label: 'Flashcards', icon: 'book', mobileIcon: '📚' },
  { to: '/profile', label: 'Hồ sơ', icon: 'user', mobileIcon: '👤' },
];

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Mock user data - will be replaced with real data from API
  const userXP = 450;
  const maxXP = 500;
  const xpProgress = (userXP / maxXP) * 100;

  const isActive = (path: string) => location.pathname === path;

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  // Close drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape; lock body scroll while open
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Main Navbar - Kid Friendly Style */}
      <nav
        aria-label="Primary"
        className="h-16 bg-white text-gray-800 flex items-center px-3 sm:px-4 shadow-md flex-shrink-0 relative z-50 border-b border-gray-100"
      >
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16 gap-2 sm:gap-4">

            {/* Logo/Brand */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0" title="Home">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white text-xl">🐰</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent hidden sm:block">
                EduPlatform
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <NavItem
                  key={link.to}
                  to={link.to}
                  icon={
                    link.icon === 'home' ? (
                      <HomeIcon active={isActive(link.to)} />
                    ) : link.icon === 'book' ? (
                      <BookIcon active={isActive(link.to)} />
                    ) : link.icon === 'mic' ? (
                      <MicIcon active={isActive(link.to)} />
                    ) : (
                      <UserIcon active={isActive(link.to)} />
                    )
                  }
                  label={link.label}
                  isActive={isActive(link.to)}
                />
              ))}

              {/* AR Mode - Prominent Button */}
              <Link
                to="/learn-ar"
                className={`
                  flex items-center gap-2 px-5 py-2.5 mx-2 rounded-full
                  bg-gradient-to-r from-cyan-400 to-sky-500
                  text-white font-bold shadow-lg shadow-cyan-500/30
                  hover:shadow-xl hover:scale-105 transition-all duration-200 min-h-[44px]
                  ${isActive('/learn-ar') ? 'ring-2 ring-cyan-300 ring-offset-2' : ''}
                `}
                title="AR Mode"
              >
                <CameraIcon />
                <span>AR Mode</span>
              </Link>
            </div>

            {/* XP Progress (Desktop) */}
            <div className="hidden lg:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full flex-shrink-0">
              <div className="text-amber-500 font-bold text-sm whitespace-nowrap">⚡ {userXP} XP</div>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Mobile menu button - hamburger that toggles the drawer */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="navbar-mobile-drawer"
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer (overlay) */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop (click closes the drawer) */}
          <div
            role="presentation"
            aria-hidden="true"
            onClick={closeMobileMenu}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden animate-fadeIn"
          />

          {/* Drawer */}
          <aside
            id="navbar-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="fixed inset-y-0 right-0 z-50 w-[min(85vw,320px)] bg-white shadow-2xl md:hidden flex flex-col animate-slideInRight"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">🐰</span>
                </div>
                <span className="text-base font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  EduPlatform
                </span>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* XP Progress (in drawer) */}
            <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-amber-600 font-bold text-sm flex-shrink-0">⚡ {userXP} XP</span>
                <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden min-w-0">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Mobile navigation links">
              <MobileNavItem
                to="/courses"
                icon="🏠"
                label="Học tập"
                isActive={isActive('/courses')}
                onClick={closeMobileMenu}
              />
              <MobileNavItem
                to="/pronunciation-course"
                icon="🎤"
                label="Phát âm"
                isActive={isActive('/pronunciation-course')}
                onClick={closeMobileMenu}
              />
              <MobileNavItem
                to="/flashcards"
                icon="📚"
                label="Flashcards"
                isActive={isActive('/flashcards')}
                onClick={closeMobileMenu}
              />
              <MobileNavItem
                to="/learn-ar"
                icon="📷"
                label="AR Mode"
                isActive={isActive('/learn-ar')}
                onClick={closeMobileMenu}
                highlight
              />
              <MobileNavItem
                to="/profile"
                icon="👤"
                label="Hồ sơ"
                isActive={isActive('/profile')}
                onClick={closeMobileMenu}
              />
            </nav>
          </aside>
        </>
      )}
    </>
  );
};

// Mobile nav item component
const MobileNavItem: React.FC<{
  to: string;
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  highlight?: boolean;
}> = ({ to, icon, label, isActive, onClick, highlight }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`
      flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-colors min-h-[56px]
      ${highlight
        ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white shadow-md'
        : isActive
          ? 'bg-amber-50 text-amber-600'
          : 'text-gray-600 hover:bg-gray-50'
      }
    `}
  >
    <span className="text-2xl" role="img" aria-label={label}>{icon}</span>
    <span className="flex-1">{label}</span>
  </Link>
);

export default Navbar;