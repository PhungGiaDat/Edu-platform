// frontend/src/features/pronunciation-course/pages/PronunciationCoursesPage.tsx
import { useNavigate } from 'react-router-dom';
import { CourseList } from '../components/CourseList';
import { usePronunciationCourses } from '../hooks/usePronunciationCourse';

export function PronunciationCoursesPage() {
  const navigate = useNavigate();
  const { courses, loading, error } = usePronunciationCourses();

  return (
    <div className="min-h-screen bg-[#FFF8EE] p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2 text-center">
          Luyện phát âm
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Học phát âm từ vựng theo chủ đề
        </p>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        {!loading && !error && (
          <CourseList
            courses={courses}
            onSelect={(topicId) => navigate(`/pronunciation-course/${topicId}`)}
          />
        )}
      </div>
    </div>
  );
}
