import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard, SectionCard, StatCard } from '../../components/admin/AdminCard';
import { adminDashboardApi } from '../../services/adminApi';
import type { DashboardStats } from '../../types/admin';
import {
  BookOpenIcon,
  CardsIcon,
  ChartBarIcon,
  FireIcon,
  LightningBoltIcon,
  UsersIcon,
} from '../../components/Icons';

const DashboardSkeleton: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AdminLayout>
      <div aria-busy="true" aria-label={t('admin.common.loading')}>
        <div className="admin-page-header">
          <div className="admin-skeleton h-11 w-56 rounded-2xl" />
          <div className="admin-skeleton mt-3 h-5 w-80 max-w-full rounded-xl" />
        </div>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <AdminCard key={item} className="admin-stat-card">
              <div className="admin-skeleton h-5 w-28 rounded-xl" />
              <div className="admin-skeleton mt-5 h-10 w-16 rounded-xl" />
            </AdminCard>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <AdminCard className="h-64">{null}</AdminCard>
          <AdminCard className="h-64 lg:col-span-2">{null}</AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await adminDashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  if (loading) return <DashboardSkeleton />;

  if (loadError) {
    return (
      <AdminLayout>
        <AdminCard className="admin-error-state">
          <div className="max-w-md">
            <h1 className="admin-section-title text-2xl">{t('admin.errorBoundary.title')}</h1>
            <p className="admin-page-copy mx-auto mt-2">{t('admin.errorBoundary.message')}</p>
            <button type="button" className="admin-text-button mt-6" onClick={() => void loadStats()}>
              {t('admin.errorBoundary.tryAgain')}
            </button>
          </div>
        </AdminCard>
      </AdminLayout>
    );
  }

  const progress = Math.min(100, Math.max(0, Number(stats?.average_progress ?? 0)));
  const quickActions = [
    {
      label: t('admin.dashboard.createCourse'),
      path: '/admin/courses/new',
      icon: BookOpenIcon,
    },
    {
      label: t('admin.dashboard.manageFlashcards'),
      path: '/admin/flashcards',
      icon: CardsIcon,
    },
    {
      label: t('admin.dashboard.viewStudents'),
      path: '/admin/students',
      icon: UsersIcon,
    },
    {
      label: t('admin.dashboard.viewAnalytics'),
      path: '/admin/analytics',
      icon: ChartBarIcon,
    },
  ];

  return (
    <AdminLayout>
      <header className="admin-page-header">
        <h1 className="admin-page-title">{t('admin.dashboard.title')}</h1>
        <p className="admin-page-copy">{t('admin.dashboard.welcome')}</p>
      </header>

      <section
        className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label={t('admin.dashboard.summary')}
      >
        <StatCard
          title={t('admin.dashboard.totalStudents')}
          value={stats?.total_students ?? 0}
          icon={<UsersIcon className="h-6 w-6" />}
        />
        <StatCard
          title={t('admin.dashboard.totalCourses')}
          value={stats?.total_courses ?? 0}
          icon={<BookOpenIcon className="h-6 w-6" />}
        />
        <StatCard
          title={t('admin.dashboard.totalFlashcards')}
          value={stats?.total_flashcards ?? 0}
          icon={<CardsIcon className="h-6 w-6" />}
        />
        <StatCard
          title={t('admin.dashboard.activeSessions')}
          value={stats?.active_sessions ?? 0}
          icon={<LightningBoltIcon className="h-6 w-6" />}
        />
      </section>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title={t('admin.dashboard.avgProgress')}>
          <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative h-28 w-28 flex-none" role="img" aria-label={`${progress}%`}>
              <svg className="admin-progress-ring h-28 w-28 -rotate-90" viewBox="0 0 112 112" aria-hidden="true">
                <circle cx="56" cy="56" r="44" stroke="#d8e1eb" strokeWidth="10" fill="none" />
                <circle
                  cx="56"
                  cy="56"
                  r="44"
                  stroke="var(--admin-accent)"
                  strokeWidth="10"
                  fill="none"
                  pathLength="100"
                  strokeDasharray={`${progress} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-extrabold text-[var(--admin-text)]">
                {progress}%
              </span>
            </div>
            <div className="text-center sm:text-left lg:text-center xl:text-left">
              <p className="m-0 font-bold text-[var(--admin-text)]">{t('admin.dashboard.progressDesc')}</p>
              <p className="mt-1 mb-0 text-sm text-[var(--admin-text-muted)]">
                {stats?.students_this_week ?? 0} {t('admin.dashboard.studentsThisWeek')}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t('admin.dashboard.topStudents')}
          subtitle={t('admin.dashboard.topStudentsDesc')}
          className="lg:col-span-2"
          action={(
            <button type="button" className="admin-text-button" onClick={() => navigate('/admin/students')}>
              {t('admin.common.viewAll')}
            </button>
          )}
        >
          {stats?.top_students?.length ? (
            <div>
              {stats.top_students.slice(0, 4).map((student, index) => (
                <div key={student.user_id} className="admin-student-row">
                  <div className="admin-rank">{index + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-extrabold text-[var(--admin-text)]">
                      {student.user_name || t('admin.students.unknownStudent')}
                    </p>
                    <p className="mt-0.5 mb-0 text-xs text-[var(--admin-text-muted)]">
                      {student.total_xp ?? 0} XP
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-[var(--admin-text-muted)]">
                    <FireIcon className="h-4 w-4" />
                    <span>{student.streak_days ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <p className="m-0 font-bold">{t('admin.dashboard.noStudents')}</p>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t('admin.dashboard.quickActions')}>
        <div className="admin-quick-grid">
          {quickActions.map((action) => (
            <button
              key={action.path}
              type="button"
              className="admin-quick-action"
              onClick={() => navigate(action.path)}
            >
              <span className="admin-quick-icon" aria-hidden="true">
                <action.icon className="h-5 w-5" />
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </SectionCard>
    </AdminLayout>
  );
};

export default Dashboard;
