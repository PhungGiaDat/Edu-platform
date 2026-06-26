// frontend-web/src/pages/admin/Dashboard.tsx
/**
 * Admin Dashboard - Teacher Admin Dashboard Overview
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard, SectionCard } from '../../components/admin/AdminCard';
import { adminDashboardApi } from '../../services/adminApi';
import type { DashboardStats } from '../../types/admin';
import { UsersIcon, BookOpenIcon, CardsIcon, LightningBoltIcon, FireIcon, ChartBarIcon } from '../../components/Icons';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminDashboardApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#6EB9FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {t('admin.dashboard.title')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('admin.dashboard.welcome')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('admin.dashboard.totalStudents')}
          value={stats?.total_students ?? 0}
          icon={<UsersIcon className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title={t('admin.dashboard.totalCourses')}
          value={stats?.total_courses ?? 0}
          icon={<BookOpenIcon className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title={t('admin.dashboard.totalFlashcards')}
          value={stats?.total_flashcards ?? 0}
          icon={<CardsIcon className="w-6 h-6" />}
          color="yellow"
        />
        <StatCard
          title={t('admin.dashboard.activeSessions')}
          value={stats?.active_sessions ?? 0}
          icon={<LightningBoltIcon className="w-6 h-6" />}
          color="pink"
        />
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Average Progress */}
        <SectionCard
          title={t('admin.dashboard.avgProgress')}
          className="col-span-1"
        >
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#6EB9FF"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(stats?.average_progress ?? 0) * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">
                  {stats?.average_progress ?? 0}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('admin.dashboard.progressDesc')}</p>
              <p className="text-xs text-gray-400 mt-1">
                {stats?.students_this_week ?? 0} {t('admin.dashboard.studentsThisWeek')}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Top Students */}
        <SectionCard
          title={t('admin.dashboard.topStudents')}
          subtitle={t('admin.dashboard.topStudentsDesc')}
          className="col-span-1 lg:col-span-2"
          action={
            <button
              onClick={() => navigate('/admin/students')}
              className="text-sm text-[#6EB9FF] hover:text-[#3A8FD1] font-medium"
            >
              {t('admin.common.viewAll')}
            </button>
          }
        >
          {stats?.top_students && stats.top_students.length > 0 ? (
            <div className="space-y-3">
              {stats.top_students.slice(0, 3).map((student, index) => (
                <div key={student.user_id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-white text-sm font-medium">
                    {(index + 1).toString()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {student.user_name || 'Student'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.total_xp ?? 0} XP
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-orange-500">
                    <FireIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{student.streak_days ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('admin.dashboard.noStudents')}
            </p>
          )}
        </SectionCard>
      </div>

      {/* Quick Actions */}
      <SectionCard title={t('admin.dashboard.quickActions')}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/courses/new')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-[#6EB9FF] flex items-center justify-center">
              <BookOpenIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {t('admin.dashboard.createCourse')}
            </span>
          </button>
          
          <button
            onClick={() => navigate('/admin/flashcards')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-[#B4E197] flex items-center justify-center">
              <CardsIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {t('admin.dashboard.manageFlashcards')}
            </span>
          </button>
          
          <button
            onClick={() => navigate('/admin/students')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FFD93D] flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {t('admin.dashboard.viewStudents')}
            </span>
          </button>
          
          <button
            onClick={() => navigate('/admin/analytics')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-pink-50 hover:bg-pink-100 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-[#FF9F9F] flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {t('admin.dashboard.viewAnalytics')}
            </span>
          </button>
        </div>
      </SectionCard>
    </AdminLayout>
  );
};

export default Dashboard;
