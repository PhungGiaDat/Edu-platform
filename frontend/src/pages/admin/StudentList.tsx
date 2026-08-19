// frontend-web/src/pages/admin/StudentList.tsx
/**
 * Student List - Paginated list of students enrolled in teacher's courses
 */
import React, { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../node_modules/react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard } from '../../components/admin/AdminCard';
import { adminStudentsApi } from '../../services/adminApi';
import type { StudentProgress, PaginatedResponse } from '../../types/admin';
import { UsersIcon, SearchIcon, FireIcon, ChevronRightIcon, ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '../../components/Icons';
import { formatDistanceToNow } from '../../utils/dateUtils';

// Memoized student row component
const StudentRow = memo<{
  student: StudentProgress;
  onClick: () => void;
  t: (key: string) => string;
  i18n: { language: string };
}>(({ student, onClick, t, i18n }) => (
  <AdminCard
    className="p-4 cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6EB9FF] to-[#B4E197] flex items-center justify-center text-white font-medium">
        {student.user_name?.charAt(0).toUpperCase() || 'S'}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate">
          {student.user_name || t('admin.students.unknownStudent')}
        </p>
        <p className="text-sm text-gray-500">
          {student.enrollments?.length || 0} {t('admin.students.enrolledCourses')}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        {/* XP */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">
            {student.total_xp?.toLocaleString() || 0} XP
          </p>
          <p className="text-xs text-gray-500">{t('admin.students.totalXp')}</p>
        </div>
        
        {/* Streak */}
        <div className="flex items-center gap-1 text-orange-500">
          <FireIcon className="w-5 h-5" />
          <span className="font-medium">{student.streak_days || 0}</span>
        </div>

        {/* Progress */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6EB9FF] rounded-full"
              style={{ width: `${Math.min((student.enrollments?.[0]?.progress_percent || 0), 100)}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">
            {Math.round(student.enrollments?.[0]?.progress_percent || 0)}%
          </span>
        </div>

        {/* Last Active */}
        <div className="text-right hidden lg:block">
          <p className="text-xs text-gray-400">
            {student.last_active 
              ? formatDistanceToNow(new Date(student.last_active), i18n.language)
              : t('admin.students.never')}
          </p>
        </div>

        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  </AdminCard>
));

const StudentList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadStudents = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 0 : page;
      const skip = currentPage * limit;
      
      const response: PaginatedResponse<StudentProgress> = await adminStudentsApi.getStudents({
        skip,
        limit,
        search: search || undefined,
      });
      
      if (resetPage) {
        setStudents(response.items);
      } else {
        setStudents(prev => [...prev, ...response.items]);
      }
      setHasMore(response.has_more);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Reset to page 0 when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  // Load students when page changes
  useEffect(() => {
    if (page > 0 || search === '') {
      loadStudents(page === 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadStudents(true);
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 0 && (!hasMore || students.length >= limit)) {
      setPage(newPage);
    }
  };

  const startItem = total > 0 ? page * limit + 1 : 0;
  const endItem = Math.min((page + 1) * limit, total);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {t('admin.students.title')}
        </h1>
        <p className="text-gray-500 mt-1">
          {t('admin.students.description', { count: total })}
        </p>
      </div>

      {/* Search */}
      <AdminCard className="mb-6 p-3">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.students.searchPlaceholder')}
              aria-label={t('admin.students.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#6EB9FF] focus:ring-2 focus:ring-[#6EB9FF]/20 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            aria-label={t('admin.common.search')}
            className="px-4 py-2.5 rounded-xl bg-[#6EB9FF] text-white font-medium hover:bg-[#3A8FD1] transition-colors"
          >
            {t('admin.common.search')}
          </button>
        </form>
      </AdminCard>

      {/* Student List */}
      {loading && students.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#6EB9FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : students.length === 0 ? (
        <AdminCard className="text-center py-12">
          <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{t('admin.students.empty')}</p>
        </AdminCard>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <StudentRow
              key={student.user_id}
              student={student}
              onClick={() => navigate(`/admin/students/${student.user_id}`)}
              t={t}
              i18n={i18n}
            />
          ))}

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
            {/* Showing X-Y of Z */}
            <p className="text-sm text-gray-500">
              {t('admin.students.showing', { start: startItem, end: endItem, total })}
            </p>
            
            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(0)}
                disabled={page === 0}
                aria-label={t('admin.students.firstPage')}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDoubleLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                aria-label={t('admin.students.previousPage')}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              
              {/* Page Indicator */}
              <span className="px-4 py-2 text-sm font-medium text-gray-700">
                {page + 1}
              </span>
              
              <button
                onClick={() => goToPage(page + 1)}
                disabled={!hasMore}
                aria-label={t('admin.students.nextPage')}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={!hasMore}
                aria-label={t('admin.students.lastPage')}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDoubleRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default StudentList;
