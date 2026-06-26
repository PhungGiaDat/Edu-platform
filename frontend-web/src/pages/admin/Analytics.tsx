// frontend-web/src/pages/admin/Analytics.tsx
/**
 * Analytics - Progress and engagement analytics for teacher
 */
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard, SectionCard, StatCard } from '../../components/admin/AdminCard';
import { adminAnalyticsApi } from '../../services/adminApi';
import type { ProgressAnalytics, EngagementAnalytics } from '../../types/admin';
import { ChartBarIcon, UsersIcon, ClockIcon, FireIcon } from '../../components/Icons';

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const [progressData, setProgressData] = useState<ProgressAnalytics | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [selectedDays]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [progress, engagement] = await Promise.all([
        adminAnalyticsApi.getProgressAnalytics(selectedDays),
        adminAnalyticsApi.getEngagementAnalytics(),
      ]);
      setProgressData(progress);
      setEngagementData(engagement);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#6EB9FF] border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxActivity = Math.max(...(engagementData?.activity_by_day?.map(d => d.count) || [1]));

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('admin.analytics.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('admin.analytics.description')}
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${selectedDays === days
                  ? 'bg-[#6EB9FF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('admin.analytics.avgSession')}
          value={`${Math.round((engagementData?.session_stats?.avg_session_time || 0) / 60)}m`}
          icon={<ClockIcon className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title={t('admin.analytics.totalSessions')}
          value={engagementData?.session_stats?.total_sessions || 0}
          icon={<UsersIcon className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title={t('admin.analytics.avgXp')}
          value={Math.round(engagementData?.session_stats?.avg_xp || 0)}
          icon={<FireIcon className="w-6 h-6" />}
          color="yellow"
        />
        <StatCard
          title={t('admin.analytics.avgProgress')}
          value={`${Math.round(
            progressData?.progress_trends?.reduce((sum, p) => sum + p.avg_progress, 0) / 
            Math.max(progressData?.progress_trends?.length || 1, 1) || 0
          )}%`}
          icon={<ChartBarIcon className="w-6 h-6" />}
          color="pink"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity by Day */}
        <SectionCard title={t('admin.analytics.activityByDay')}>
          <div className="h-48 sm:h-48 overflow-x-auto">
            <div className="min-w-[300px] h-full flex items-end justify-around gap-2">
              {(engagementData?.activity_by_day || []).map((day, index) => (
                <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                  <div 
                    className="w-full bg-gradient-to-t from-[#6EB9FF] to-[#B4E197] rounded-t-lg transition-all"
                    style={{ height: `${maxActivity > 0 ? (day.count / maxActivity) * 100 : 0}%`, minHeight: '8px' }}
                  />
                  <span className="text-xs text-gray-500">{dayLabels[index]}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* XP Distribution */}
        <SectionCard title={t('admin.analytics.xpDistribution')}>
          <div className="space-y-3">
            {(progressData?.xp_distribution || []).map((bucket, index) => (
              <div key={bucket.range} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-24">{bucket.range}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6EB9FF] to-[#B4E197] rounded-full"
                    style={{
                      width: `${
                        Math.max(...(progressData?.xp_distribution?.map(b => b.count) || [1])) > 0
                          ? (bucket.count / Math.max(...(progressData?.xp_distribution?.map(b => b.count) || [1]))) * 100
                          : 0
                      }%`
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-12 text-right">{bucket.count}</span>
              </div>
            ))}
            {(!progressData?.xp_distribution || progressData.xp_distribution.length === 0) && (
              <p className="text-center text-gray-500 py-8">{t('admin.analytics.noData')}</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Progress Trends */}
      <SectionCard
        title={t('admin.analytics.progressTrends')}
        subtitle={t('admin.analytics.progressTrendsDesc', { days: selectedDays })}
        className="mt-6"
      >
        <div className="h-32 sm:h-48 overflow-x-auto">
          <div className="min-w-[400px] h-full flex items-end justify-between gap-1">
            {(progressData?.progress_trends || []).slice(-14).map((trend, index) => (
              <div key={trend.date} className="flex flex-col items-center gap-2 flex-1">
                <div 
                  className="w-full bg-gradient-to-t from-[#6EB9FF] to-[#B4E197]/50 rounded-t transition-all"
                  style={{ 
                    height: `${trend.avg_progress}%`,
                    minHeight: '4px'
                  }}
                />
                <span className="text-[10px] text-gray-400 transform -rotate-45 origin-center">
                  {trend.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {(!progressData?.progress_trends || progressData.progress_trends.length === 0) && (
          <p className="text-center text-gray-500 py-8">{t('admin.analytics.noData')}</p>
        )}
      </SectionCard>
    </AdminLayout>
  );
};

export default Analytics;
