import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ChevronLeftIcon } from '../../components/Icons';
import { adminCoursesApi } from '../../services/adminApi';
import type { CourseCreate, CourseUpdate } from '../../types/admin';

interface CourseEditorProps {
  isEdit?: boolean;
}

const CourseEditor: React.FC<CourseEditorProps> = ({ isEdit = false }) => {
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data: CourseCreate | CourseUpdate = {
        title,
        description,
        thumbnail_url: thumbnailUrl,
        is_published: false,
      };

      if (isEdit && courseId) {
        await adminCoursesApi.updateCourse(courseId, data);
        navigate('/admin/courses');
      } else {
        await adminCoursesApi.createCourse(data);
        navigate('/admin/courses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/admin/courses')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeftIcon className="w-5 h-5" />
          Back to Courses
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {isEdit ? 'Edit Course' : 'Create New Course'}
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Course Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                placeholder="Enter course title"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                placeholder="Enter course description"
              />
            </div>

            <div>
              <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 mb-1">
                Thumbnail URL (optional)
              </label>
              <input
                type="url"
                id="thumbnail"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#6EB9FF] focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/admin/courses')}
                className="px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#6EB9FF] text-white rounded-xl hover:bg-[#5BA8EF] disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : isEdit ? 'Update Course' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export const CourseCreatePage = () => <CourseEditor isEdit={false} />;
export const CourseEditPage = () => <CourseEditor isEdit={true} />;

export default CourseEditor;
