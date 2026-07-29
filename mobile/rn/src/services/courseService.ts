/**
 * courseService — slim non-AR surface for courses & lessons.
 * Uses the shared axios instance from ./api.ts (which already wires
 * the SecureStore JWT interceptor).
 */
import api from './api';
import type { Course, CourseDetail, Lesson } from '../types/course';

export const courseService = {
  listCourses: () => api.get<Course[]>('/courses/'),

  getCourse: (courseId: string) => api.get<CourseDetail>(`/courses/${courseId}`),

  listLessons: (courseId: string) =>
    api.get<Lesson[]>(`/courses/${courseId}/lessons/`),
};

export default courseService;
