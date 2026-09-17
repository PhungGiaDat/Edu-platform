/**
 * CourseSelector.tsx
 *
 * Compact dropdown trigger + expandable list, outside the Canvas by design —
 * course selection is an accessibility-critical action and must not depend
 * on hitting a tiny 3D mesh. A full-width row of pills carrying the entire
 * (often long, Vietnamese) course title used to clip/wrap badly on mobile;
 * the trigger now shows a short identity (emoji + category label) and the
 * full title only appears inside the expanded menu.
 */

import React, { useState } from 'react';
import type { JoinedCourseSummary } from '@/types/learning-path';

export interface CourseSelectorProps {
  courses: JoinedCourseSummary[];
  selectedCourseId: string | null;
  onSelect: (courseId: string) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  animals: '🐾',
  home_family: '🏡',
  nature: '🌿',
  school_food: '🍎',
};

export const CourseSelector: React.FC<CourseSelectorProps> = ({ courses, selectedCourseId, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = courses.find((c) => c.course_id === selectedCourseId) ?? courses[0] ?? null;

  if (!selected) return null;

  const emoji = CATEGORY_EMOJI[selected.category_key] ?? '📚';

  return (
    <div className="pointer-events-auto relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex max-w-[9.5rem] items-center gap-1 rounded-lg bg-white px-2 py-1 text-left shadow-sm"
      >
        <span className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-gray-700">
          <span aria-hidden="true">{emoji}</span>
          <span className="truncate">{selected.category_label || selected.title_vi || selected.title}</span>
        </span>
        <span className={`shrink-0 text-[9px] text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Joined courses"
          className="absolute right-0 top-full z-20 mt-1 w-48 max-h-56 overflow-y-auto rounded-xl bg-white p-1 shadow-lg"
        >
          {courses.map((course) => {
            const isSelected = course.course_id === selectedCourseId;
            return (
              <li key={course.course_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelect(course.course_id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold ${
                    isSelected ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span aria-hidden="true">{CATEGORY_EMOJI[course.category_key] ?? '📚'}</span>
                  <span className="min-w-0 flex-1 truncate">{course.title_vi || course.title}</span>
                  {isSelected && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CourseSelector;
