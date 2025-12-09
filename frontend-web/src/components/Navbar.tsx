// components/Navbar.tsx
/**
 * Kid-Friendly E-Learning Navbar
 * - White background with soft shadow
 * - Colorful icons with active states
 * - XP progress indicator
 * - Prominent AR Mode button
 */
import React, { useState } from 'react';
import { Link, useLocation } from "react-router-dom";

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
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
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
      flex flex-col items-center justify-center px-4 py-2 rounded-xl
      transition-all duration-200 min-w-[80px]
      ${isActive
        ? 'bg-amber-50 text-amber-600'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }
    `}
  >
    {icon}
    <span className={`text-xs mt-1 font-semibold ${isActive ? 'text-amber-600' : ''}`}>
      {label}
    </span>
  </Link>
);

const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Mock user data - will be replaced with real data from API
  const userXP = 450;
  const maxXP = 500;
  const xpProgress = (userXP / maxXP) * 100;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Main Navbar - Kid Friendly Style */}
      <nav className="h-16 bg-white text-gray-800 flex items-center px-4 shadow-md flex-shrink-0 relative z-50 border-b border-gray-100">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16">

            {/* Logo/Brand */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-xl">🐰</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent hidden sm:block">
                EduPlatform
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              <NavItem
                to="/courses"
                icon={<HomeIcon active={isActive('/courses')} />}
                label="Học tập"
                isActive={isActive('/courses')}
              />
              <NavItem
                to="/flashcards"
                icon={<BookIcon active={isActive('/flashcards')} />}
                label="Flashcards"
                isActive={isActive('/flashcards')}
              />

              {/* AR Mode - Prominent Button */}
              <Link
                to="/learn-ar"
                className={`
                  flex items-center gap-2 px-5 py-2.5 mx-2 rounded-full
                  bg-gradient-to-r from-cyan-400 to-sky-500
                  text-white font-bold shadow-lg shadow-cyan-500/30
                  hover:shadow-xl hover:scale-105 transition-all duration-200
                  ${isActive('/learn-ar') ? 'ring-2 ring-cyan-300 ring-offset-2' : ''}
                `}
              >
                <CameraIcon />
                <span>AR Mode</span>
              </Link>

              <NavItem
                to="/profile"
                icon={<UserIcon active={isActive('/profile')} />}
                label="Hồ sơ"
                isActive={isActive('/profile')}
              />
            </div>

            {/* XP Progress (Desktop) */}
            <div className="hidden lg:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full">
              <div className="text-amber-500 font-bold text-sm">⚡ {userXP} XP</div>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg z-40 animate-slideDown">
          {/* XP Progress (Mobile) */}
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <span className="text-amber-600 font-bold">⚡ {userXP} XP</span>
              <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <MobileNavItem
              to="/courses"
              icon="🏠"
              label="Học tập"
              isActive={isActive('/courses')}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <MobileNavItem
              to="/flashcards"
              icon="📚"
              label="Flashcards"
              isActive={isActive('/flashcards')}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <MobileNavItem
              to="/learn-ar"
              icon="📷"
              label="AR Mode"
              isActive={isActive('/learn-ar')}
              onClick={() => setIsMobileMenuOpen(false)}
              highlight
            />
            <MobileNavItem
              to="/profile"
              icon="👤"
              label="Hồ sơ"
              isActive={isActive('/profile')}
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
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
      flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
      ${highlight
        ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-white'
        : isActive
          ? 'bg-amber-50 text-amber-600'
          : 'text-gray-600 hover:bg-gray-50'
      }
    `}
  >
    <span className="text-xl">{icon}</span>
    <span>{label}</span>
  </Link>
);

export default Navbar;

