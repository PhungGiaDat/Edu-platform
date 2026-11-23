// frontend/src/features/pronunciation-course/components/CourseList.tsx
import type { PronunciationCourse } from '../types';

const TOPIC_COLORS: Record<string, { bg: string; shadow: string; text: string; ring: string }> = {
  'sky-blue': { bg: 'bg-sky-100', shadow: 'shadow-clay-blue', text: 'text-sky-700', ring: 'ring-sky-300' },
  'coral-pink': { bg: 'bg-pink-100', shadow: 'shadow-clay-pink', text: 'text-pink-700', ring: 'ring-pink-300' },
  'lavender': { bg: 'bg-purple-100', shadow: 'shadow-clay-purple', text: 'text-purple-700', ring: 'ring-purple-300' },
  'mint-green': { bg: 'bg-green-100', shadow: 'shadow-clay-green', text: 'text-green-700', ring: 'ring-green-300' },
};

interface CourseListProps {
  courses: PronunciationCourse[];
  onSelect: (topicId: string) => void;
}

export function CourseList({ courses, onSelect }: CourseListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4">
      {courses.map((course) => {
        const colors = TOPIC_COLORS[course.color] || TOPIC_COLORS['sky-blue'];
        return (
          <button
            key={course.topic_id}
            onClick={() => onSelect(course.topic_id)}
            className={`
              ${colors.bg} ${colors.shadow} rounded-3xl p-6 text-left cursor-pointer
              transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1
              active:scale-[0.98] focus:outline-none focus:ring-4 ${colors.ring}
            `}
          >
            <div className="flex items-center gap-4 mb-3">
              <span className="text-5xl">{course.icon}</span>
              <div>
                <h3 className={`font-bold text-xl ${colors.text}`}>{course.name_vi}</h3>
                <p className="text-sm text-gray-500">{course.name}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {course.word_count} từ
              </span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      course.completion_percent > i * 33
                        ? colors.text.replace('text-', 'bg-')
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
