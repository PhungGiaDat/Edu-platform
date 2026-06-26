// frontend-web/src/pages/admin/CourseManager.tsx
/**
 * Course Manager - CRUD operations for teacher's courses
 */
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminCard } from '../../components/admin/AdminCard';
import { adminCoursesApi } from '../../services/adminApi';
import type { Course, PaginatedResponse } from '../../types/admin';
import { BookOpenIcon, PlusIcon, SearchIcon, ChevronRightIcon, TrashIcon, EditIcon } from '../../components/Icons';

const CourseManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadCourses = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      const currentPage = resetPage ? 0 : page;
      const skip = currentPage * limit;
      
      const response: PaginatedResponse<Course> = await adminCoursesApi.getCourses({ skip, limit });
      
      if (resetPage) {
        setCourses(response.items);
      } else {
        setCourses(prev => [...prev, ...response.items]);
      }
      setHasMore(response.has_more);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadCourses(true);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (page > 0) {
      loadCourses();
    }
  }, [page]);

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('admin.courses.confirmDelete'))) return;
    
    try {
      await adminCoursesApi.deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.course_id !== courseId));
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('admin.courses.title')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('admin.courses.description', { count: total })}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/courses/new')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6EB9FF] text-white font-medium hover:bg-[#3A8FD1] transition-colors shadow-lg shadow-blue-500/20"
        >
          <PlusIcon className="w-5 h-5" />
          {t('admin.courses.createNew')}
        </button>
      </div>

      {/* Course List */}
      {loading && courses.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#6EB9FF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <AdminCard className="text-center py-12">
          <BookOpenIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{t('admin.courses.empty')}</p>
          <button
            onClick={() => navigate('/admin/courses/new')}
            className="px-4 py-2 rounded-xl bg-[#6EB9FF] text-white font-medium"
          >
            {t('admin.courses.createFirst')}
          </button>
        </AdminCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <AdminCard
              key={course.course_id}
              className="p-0 overflow-hidden cursor-pointer"
              onClick={() => navigate(`/admin/courses/${course.course_id}`)}
            >
              {/* Thumbnail */}
              <div className="h-32 bg-gradient-to-br from-[#6EB9FF]/20 to-[#B4E197]/20 relative">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpenIcon className="w-12 h-12 text-[#6EB9FF]/50" />
                  </div>
                )}
                {/* Status Badge */}
                <span className={`
                  absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium
                  ${course.is_published 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'}
                `}>
                  {course.is_published ? t('admin.courses.published') : t('admin.courses.draft')}
                </span>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {course.description || course.description_vi || t('admin.courses.noDescription')}
                </p>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <BookOpenIcon className="w-4 h-4" />
                      {course.lesson_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      👥 {course.enrollment_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/courses/${course.course_id}/edit`);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCourse(course.course_id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                {t('admin.common.loading')}
              </span>
            ) : (
              t('admin.common.loadMore')
            )}
          </button>
        </div>
      )}
    </AdminLayout>
  );
};

export default CourseManager;
