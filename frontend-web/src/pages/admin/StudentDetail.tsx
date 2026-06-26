// frontend-web/src/pages/admin/StudentDetail.tsx
/**
 * Student Detail - Detailed progress view for a specific student
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard, SectionCard } from '../../components/admin/AdminCard';
import { adminStudentsApi, adminLearningGoalsApi } from '../../services/adminApi';
import type { StudentProgress, LearningGoal } from '../../types/admin';
import { UsersIcon, FireIcon, ClockIcon, BookOpenIcon, CardsIcon, ChevronLeftIcon, CheckCircleIcon } from '../../components/Icons';

const StudentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProgress | null>(null);
  const [learningGoal, setLearningGoal] = useState<LearningGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadStudentData();
    }
  }, [userId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const [studentData, goalData] = await Promise.all([
        adminStudentsApi.getStudent(userId!),
        adminLearningGoalsApi.getLearningGoal(userId!).catch(() => null),
      ]);
      setStudent(studentData);
      setLearningGoal(goalData);
    } catch (error) {
      console.error('Failed to load student:', error);
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

  if (!student) {
    return (
      <AdminLayout>
        <AdminCard className="text-center py-12">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('admin.students.notFound')}</p>
          <button
            onClick={() => navigate('/admin/students')}
            className="mt-4 px-4 py-2 rounded-xl bg-[#6EB9FF] text-white font-medium"
          >
            {t('admin.common.back')}
          </button>
        </AdminCard>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/students')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeftIcon className="w-5 h-5" />
        {t('admin.common.backToStudents')}
      </button>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-white text-2xl font-bold">
          {student.user_name?.charAt(0).toUpperCase() || 'S'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {student.user_name || t('admin.students.unknownStudent')}
          </h1>
          <p className="text-gray-500">
            {t('admin.students.enrolledIn', { count: student.enrollments?.length || 0 })}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminCard className="text-center">
          <p className="text-3xl font-bold text-gray-800">{student.total_xp?.toLocaleString() || 0}</p>
          <p className="text-sm text-gray-500 mt-1">{t('admin.students.totalXp')}</p>
        </AdminCard>
        <AdminCard className="text-center">
          <div className="flex items-center justify-center gap-2 text-orange-500">
            <FireIcon className="w-6 h-6" />
            <p className="text-3xl font-bold">{student.streak_days || 0}</p>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('admin.students.dayStreak')}</p>
        </AdminCard>
        <AdminCard className="text-center">
          <div className="flex items-center justify-center gap-2 text-blue-500">
            <ClockIcon className="w-6 h-6" />
            <p className="text-3xl font-bold">{student.total_time_minutes || 0}</p>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('admin.students.minutesLearned')}</p>
        </AdminCard>
        <AdminCard className="text-center">
          <div className="flex items-center justify-center gap-2 text-green-500">
            <CardsIcon className="w-6 h-6" />
            <p className="text-3xl font-bold">{student.flashcards_mastered || 0}</p>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('admin.students.masteredCards')}</p>
        </AdminCard>
      </div>

      {/* Course Enrollments */}
      <SectionCard
        title={t('admin.studentDetail.courses')}
        subtitle={t('admin.studentDetail.courseProgress')}
      >
        {student.enrollments && student.enrollments.length > 0 ? (
          <div className="space-y-4">
            {student.enrollments.map((enrollment) => (
              <div key={enrollment.course_id} className="p-4 rounded-2xl bg-gray-50">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6EB9FF]/20 to-[#B4E197]/20 flex items-center justify-center">
                    <BookOpenIcon className="w-6 h-6 text-[#6EB9FF]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{enrollment.course_title || 'Course'}</p>
                    <p className="text-sm text-gray-500">
                      {enrollment.lessons?.filter(l => l.status === 'completed').length || 0} / {enrollment.lessons?.length || 0} lessons
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${enrollment.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}
                    `}>
                      {enrollment.status === 'completed' ? t('admin.studentDetail.completed') : t('admin.studentDetail.inProgress')}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6EB9FF] to-[#B4E197] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(enrollment.progress_percent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {Math.round(enrollment.progress_percent)}%
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            {t('admin.studentDetail.noEnrollments')}
          </p>
        )}
      </SectionCard>

      {/* Learning Goal Settings */}
      <SectionCard
        title={t('admin.studentDetail.learningGoals')}
        subtitle={t('admin.studentDetail.goalSettings')}
        className="mt-6"
      >
        {learningGoal ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-2xl bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{learningGoal.settings.daily_xp_goal}</p>
              <p className="text-xs text-gray-500 mt-1">{t('admin.studentDetail.dailyXpGoal')}</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-green-50">
              <p className="text-2xl font-bold text-green-600">{learningGoal.settings.daily_minutes_goal}</p>
              <p className="text-xs text-gray-500 mt-1">{t('admin.studentDetail.dailyMinGoal')}</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-orange-50">
              <p className="text-2xl font-bold text-orange-600">{learningGoal.longest_streak}</p>
              <p className="text-xs text-gray-500 mt-1">{t('admin.studentDetail.longestStreak')}</p>
            </div>
            <div className="text-center p-4 rounded-2xl bg-purple-50">
              <div className="flex items-center justify-center gap-2">
                <CheckCircleIcon className={`w-5 h-5 ${learningGoal.settings.streak_protection_enabled ? 'text-green-500' : 'text-gray-300'}`} />
                <p className="text-2xl font-bold text-purple-600">{learningGoal.settings.streak_protection_enabled ? 'ON' : 'OFF'}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('admin.studentDetail.streakProtection')}</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            {t('admin.studentDetail.noGoalSet')}
          </p>
        )}
      </SectionCard>
    </AdminLayout>
  );
};

export default StudentDetail;
