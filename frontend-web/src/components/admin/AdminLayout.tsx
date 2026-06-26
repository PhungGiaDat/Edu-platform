// frontend-web/src/components/admin/AdminLayout.tsx
/**
 * Admin Layout - Responsive layout for Teacher Admin Dashboard
 * Mobile-first design with claymorphic styling
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { HomeIcon, UsersIcon, BookOpenIcon, ChartBarIcon, CardsIcon, TargetIcon } from '../Icons';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin', label: 'dashboard', icon: HomeIcon },
  { path: '/admin/flashcards', label: 'flashcards', icon: CardsIcon },
  { path: '/admin/courses', label: 'courses', icon: BookOpenIcon },
  { path: '/admin/students', label: 'students', icon: UsersIcon },
  { path: '/admin/students/goals', label: 'goalSettings', icon: TargetIcon },
  { path: '/admin/analytics', label: 'analytics', icon: ChartBarIcon },
];

const AdminSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path || 
    (path !== '/admin' && location.pathname.startsWith(path));

  // Get user initials for avatar
  const getInitials = () => {
    const name = user?.name || user?.username;
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'T';
  };

  return (
    <aside className="hidden lg:flex flex-col w-[280px] h-screen bg-[#1A2744] fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-white text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-sm">
            🎓
          </span>
          EduAdmin
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <button
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200
                  ${isActive(item.path) 
                    ? 'bg-[#6EB9FF]/20 text-[#6EB9FF]' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon className="w-5 h-5" />
                {t(`admin.nav.${item.label}`)}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile - Now using actual auth user data */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-white font-medium">
            {getInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name || user?.username || 'Teacher'}</p>
            <p className="text-white/50 text-xs truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const AdminMobileHeader: React.FC<{ title: string }> = ({ title }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path || 
    (path !== '/admin' && location.pathname.startsWith(path));

  const getInitials = () => {
    const name = user?.name || user?.username;
    if (name) {
      return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'T';
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -ml-2 rounded-xl active:bg-gray-100"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-white text-sm font-medium">
            {getInitials()}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
            <div 
              className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#1A2744]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h1 className="text-white text-xl font-bold flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-sm">
                    🎓
                  </span>
                  EduAdmin
                </h1>
                <button onClick={() => setMenuOpen(false)} className="p-2">
                  <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <nav className="p-4">
                <ul className="space-y-1">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          navigate(item.path);
                          setMenuOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                          transition-all duration-200
                          ${isActive(item.path) 
                            ? 'bg-[#6EB9FF]/20 text-[#6EB9FF]' 
                            : 'text-white/70 hover:bg-white/5 hover:text-white'}
                        `}
                      >
                        <item.icon className="w-5 h-5" />
                        {t(`admin.nav.${item.label}`)}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

const AdminBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path || 
    (path !== '/admin' && location.pathname.startsWith(path));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`
              flex flex-col items-center justify-center gap-1 px-3 py-2
              transition-colors duration-200
              ${isActive(item.path) ? 'text-[#6EB9FF]' : 'text-gray-400'}
            `}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(`admin.nav.${item.label}`)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();

  // Get title from current path
  const getTitle = () => {
    const path = location.pathname;
    if (path === '/admin') return t('admin.nav.dashboard');
    const match = navItems.find(item => path.startsWith(item.path) && item.path !== '/admin');
    return match ? t(`admin.nav.${match.label}`) : t('admin.nav.dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Desktop Sidebar */}
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="lg:ml-[280px] min-h-screen pb-20 lg:pb-0">
        {/* Mobile Header */}
        <AdminMobileHeader title={getTitle()} />
        
        {/* Page Content */}
        <main className="p-4 lg:p-6 max-w-[1400px] mx-auto">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Nav */}
      <AdminBottomNav />
    </div>
  );
};

export default AdminLayout;
