/**
 * CourseSelector.tsx
 *
 * Plain DOM pill row for switching between the user's joined courses.
 * Outside the Canvas by design — course selection is an accessibility-critical
 * action and must not depend on hitting a 3D mesh.
 */

import React from 'react';
import type { JoinedCourseSummary } from '@/types/learning-path';

export interface CourseSelectorProps {
  courses: JoinedCourseSummary[];
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({ courses, selectedCourseId, onSelect }) => {
  return (
    <div
      role="tablist"
      aria-label="Joined courses"
      className="pointer-events-auto flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {courses.map((course) => {
        const isSelected = course.course_id === selectedCourseId;
        return (
          <button
            key={course.course_id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(course.course_id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              isSelected
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
          >
            {course.title_vi || course.title}
          </button>
        );
      })}
    </div>
  );
};

export default CourseSelector;
