import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpenIcon,
  CardsIcon,
  ChartBarIcon,
  HomeIcon,
  UsersIcon,
} from '@/shared/components/icons/Icons';
import '@/styles/admin.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin', label: 'dashboard', icon: HomeIcon },
  { path: '/admin/flashcards', label: 'flashcards', icon: CardsIcon },
  { path: '/admin/courses', label: 'courses', icon: BookOpenIcon },
  { path: '/admin/students', label: 'students', icon: UsersIcon },
  { path: '/admin/analytics', label: 'analytics', icon: ChartBarIcon },
];

const mobileNavItems = navItems.slice(0, 4);

const isPathActive = (currentPath: string, itemPath: string) => (
  currentPath === itemPath
  || (itemPath !== '/admin' && currentPath.startsWith(itemPath))
);

const getInitials = (name?: string, username?: string, email?: string) => {
  const displayName = name || username;
  if (displayName) {
    return displayName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() || 'A';
};

const AdminBrand: React.FC = () => (
  <div className="admin-brand">
    <span className="admin-brand-mark" aria-hidden="true">
      <BookOpenIcon className="h-6 w-6" />
    </span>
    <div>
      <p className="m-0 text-xl font-extrabold leading-none">EduAdmin</p>
      <p className="mt-1 mb-0 text-xs font-bold text-[var(--admin-text-muted)]">EduAR Platform</p>
    </div>
  </div>
);

const AdminNavigation: React.FC<{
  items?: typeof navItems;
  onNavigate?: () => void;
}> = ({ items = navItems, onNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="admin-nav" aria-label={t('admin.common.primaryNavigation')}>
      <ul className="admin-nav-list">
        {items.map((item) => {
          const active = isPathActive(location.pathname, item.path);
          return (
            <li key={item.path}>
              <button
                type="button"
                className="admin-nav-button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  navigate(item.path);
                  onNavigate?.();
                }}
              >
                <item.icon className="h-5 w-5" />
                <span>{t(`admin.nav.${item.label}`)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const AdminProfile: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || t('admin.common.administrator');

  return (
    <div className="admin-profile flex items-center gap-3">
      <div className="admin-avatar">
        {getInitials(user?.name, user?.username, user?.email)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="m-0 truncate text-sm font-extrabold text-[var(--admin-text)]">{displayName}</p>
        <p className="mt-0.5 mb-0 truncate text-xs text-[var(--admin-text-muted)]">{user?.email || ''}</p>
      </div>
    </div>
  );
};

const AdminSidebar: React.FC = () => (
  <aside className="admin-sidebar">
    <AdminBrand />
    <AdminNavigation />
    <AdminProfile />
  </aside>
);

const AdminMobileHeader: React.FC<{ title: string }> = ({ title }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <>
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-menu-button"
          aria-label={t('admin.common.openMenu')}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <h1 className="m-0 truncate text-lg font-extrabold text-[var(--admin-text)]">{title}</h1>
        <div className="admin-avatar h-10 w-10 text-sm">
          {getInitials(user?.name, user?.username, user?.email)}
        </div>
      </header>

      {menuOpen && (
        <div
          className="admin-mobile-backdrop"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.common.primaryNavigation')}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between pr-4">
              <AdminBrand />
              <button
                type="button"
                className="admin-menu-button"
                aria-label={t('admin.common.closeMenu')}
                onClick={() => setMenuOpen(false)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <AdminNavigation onNavigate={() => setMenuOpen(false)} />
            <AdminProfile />
          </aside>
        </div>
      )}
    </>
  );
};

const AdminBottomNav: React.FC = () => (
  <div className="admin-bottom-nav">
    <AdminNavigation items={mobileNavItems} />
  </div>
);

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();

  const currentItem = navItems.find((item) => isPathActive(location.pathname, item.path));
  const title = t(`admin.nav.${currentItem?.label || 'dashboard'}`);

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <AdminMobileHeader title={title} />
        <main className="admin-content">{children}</main>
      </div>
      <AdminBottomNav />
    </div>
  );
};

export default AdminLayout;
