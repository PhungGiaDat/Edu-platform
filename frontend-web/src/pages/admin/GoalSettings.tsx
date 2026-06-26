// frontend-web/src/pages/admin/GoalSettings.tsx
/**
 * Goal Settings - Set daily learning goals for students
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard } from '../../components/admin/AdminCard';
import { adminLearningGoalsApi, adminStudentsApi } from '../../services/adminApi';
import type { LearningGoal, LearningGoalCreate, PaginatedResponse, StudentProgress } from '../../types/admin';
import { SettingsIcon, FireIcon, ChevronLeftIcon, SaveIcon } from '../../components/Icons';

const GoalSettings: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const [student, setStudent] = useState<StudentProgress | null>(null);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState<LearningGoalCreate>({
    daily_xp_goal: 100,
    daily_minutes_goal: 15,
    streak_protection_enabled: true,
    reminder_enabled: true,
    reminder_interval_minutes: 20,
  });

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentData, goalData] = await Promise.all([
        adminStudentsApi.getStudent(userId!).catch(() => null),
        adminLearningGoalsApi.getLearningGoal(userId!).catch(() => null),
      ]);
      
      setStudent(studentData);
      setGoal(goalData);
      
      if (goalData?.settings) {
        setFormData({
          daily_xp_goal: goalData.settings.daily_xp_goal,
          daily_minutes_goal: goalData.settings.daily_minutes_goal,
          streak_protection_enabled: goalData.settings.streak_protection_enabled,
          reminder_enabled: goalData.settings.reminder_enabled,
          reminder_interval_minutes: goalData.settings.reminder_interval_minutes,
        });
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    try {
      setSaving(true);
      const updatedGoal = await adminLearningGoalsApi.setLearningGoal(userId, formData);
      setGoal(updatedGoal);
      setToast({ message: t('admin.goalSettings.saved'), type: 'success' });
    } catch (error) {
      console.error('Failed to save goal:', error);
      setToast({ message: t('admin.goalSettings.saveFailed'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      {/* Toast Notification */}
      {toast && (
        <div className={`
          fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}
          text-white font-medium animate-fade-in
        `}>
          {toast.message}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate(`/admin/students/${userId}`)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        {t('admin.common.backToStudent')}
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {t('admin.goalSettings.title')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('admin.goalSettings.subtitle', { student: student?.user_name || 'Student' })}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <AdminCard className="max-w-2xl">
          {/* Student Info */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-white text-lg font-bold">
              {student?.user_name?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div>
              <p className="font-medium text-gray-800">{student?.user_name || 'Student'}</p>
              <p className="text-sm text-gray-500">{student?.enrollments?.length || 0} courses enrolled</p>
            </div>
          </div>

          {/* Current Stats */}
          {goal && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-2xl bg-orange-50">
                <FireIcon className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <p className="text-xl font-bold text-orange-600">{goal.current_streak}</p>
                <p className="text-xs text-gray-500">{t('admin.goalSettings.currentStreak')}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-blue-50">
                <p className="text-xl font-bold text-blue-600">{goal.total_xp_earned}</p>
                <p className="text-xs text-gray-500">{t('admin.goalSettings.totalXp')}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-green-50">
                <p className="text-xl font-bold text-green-600">{goal.total_minutes_learned}</p>
                <p className="text-xs text-gray-500">{t('admin.goalSettings.totalMinutes')}</p>
              </div>
            </div>
          )}

          {/* Goal Settings */}
          <div className="space-y-6">
            {/* Daily XP Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.goalSettings.dailyXpGoal')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={formData.daily_xp_goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_xp_goal: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6EB9FF]"
                />
                <span className="w-16 text-center font-medium text-gray-800">
                  {formData.daily_xp_goal} XP
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.goalSettings.dailyXpGoalHint')}
              </p>
            </div>

            {/* Daily Minutes Goal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.goalSettings.dailyMinutesGoal')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={formData.daily_minutes_goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, daily_minutes_goal: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6EB9FF]"
                />
                <span className="w-16 text-center font-medium text-gray-800">
                  {formData.daily_minutes_goal} {t('admin.goalSettings.minutes')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.goalSettings.dailyMinutesGoalHint')}
              </p>
            </div>

            {/* Reminder Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.goalSettings.reminderInterval')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={formData.reminder_interval_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminder_interval_minutes: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6EB9FF]"
                  disabled={!formData.reminder_enabled}
                />
                <span className="w-16 text-center font-medium text-gray-800">
                  {formData.reminder_interval_minutes} {t('admin.goalSettings.minutes')}
                </span>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              {/* Streak Protection */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-800">{t('admin.goalSettings.streakProtection')}</p>
                  <p className="text-sm text-gray-500">{t('admin.goalSettings.streakProtectionDesc')}</p>
                </div>
                <div 
                  className={`
                    w-12 h-6 rounded-full p-1 transition-colors cursor-pointer
                    ${formData.streak_protection_enabled ? 'bg-[#6EB9FF]' : 'bg-gray-300'}
                  `}
                  onClick={() => setFormData(prev => ({ ...prev, streak_protection_enabled: !prev.streak_protection_enabled }))}
                >
                  <div 
                    className={`
                      w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                      ${formData.streak_protection_enabled ? 'translate-x-6' : ''}
                    `}
                  />
                </div>
              </label>

              {/* Reminders */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-800">{t('admin.goalSettings.enableReminders')}</p>
                  <p className="text-sm text-gray-500">{t('admin.goalSettings.enableRemindersDesc')}</p>
                </div>
                <div 
                  className={`
                    w-12 h-6 rounded-full p-1 transition-colors cursor-pointer
                    ${formData.reminder_enabled ? 'bg-[#6EB9FF]' : 'bg-gray-300'}
                  `}
                  onClick={() => setFormData(prev => ({ ...prev, reminder_enabled: !prev.reminder_enabled }))}
                >
                  <div 
                    className={`
                      w-4 h-4 rounded-full bg-white shadow-sm transition-transform
                      ${formData.reminder_enabled ? 'translate-x-6' : ''}
                    `}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate(`/admin/students/${userId}`)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
            >
              {t('admin.common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6EB9FF] text-white font-medium hover:bg-[#3A8FD1] disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SaveIcon className="w-5 h-5" />
              )}
              {t('admin.common.save')}
            </button>
          </div>
        </AdminCard>
      </form>
    </AdminLayout>
  );
};

export default GoalSettings;
